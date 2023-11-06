const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailService=require("../services/mailer")
const crypto = require("crypto");

const filterObj = require("../utils/filterObj");

// Model
const User = require("../models/user");
const otp = require("../Templates/Mail/otps");
const resetPassword = require("../Templates/Mail/resetPassword");
const { promisify } = require("util");
// const catchAsync = require("../utils/catchAsync");

// this function will return you jwt token
const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Register New User



exports.register =async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  // check if a verified user with given email exists

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    // user with this email already exists, Please login
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // if not verified than update prev one

await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });
   

    // generate an otp and send to email
    req.userId = existing_user._id;
    next();
  } else {
    // if user is not created before than create a new one
    const new_user = await User.create(filteredBody);

    // generate an otp and send to email
    req.userId = new_user._id;

    next();
  }
};

exports.sendOTP =async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  // TODO send mail
console.log(user.email);
  mailService.sendEmail({

    to: user.email,
    subject: "Verification OTP",
    html: otp(user.firstName, new_otp),
    text:"hello"

  });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
};

exports.verifyOTP =async (req, res, next) => {
  // verify otp and update user accordingly
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
};

// User Login
exports.login =async (req, res, next) => {
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
};

// Protect
exports.protect =async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log(decoded);

  // 3) Check if user still exists

  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      message: "The user belonging to this token does no longer exists.",
    });
  }
  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
};

exports.forgotPassword =async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with email address.",
    });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
    // TODO => Send Email with this Reset URL to user's email address

    console.log(resetURL);

    mailService.sendEmail({
      from: "shreyanshshah242@gmail.com",
      to: user.email,
      subject: "Reset Password",
      html: resetPassword(user.firstName, resetURL),
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
};

exports.resetPassword =async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reseted Successfully",
    token,
  });
};


// const jwt = require("jsonwebtoken");
// const otpGenerator = require("otp-generator")
// const crypto = require("crypto")
// const User = require("../models/user");
// const filterObj = require("../utils/filterObj");
// const { promisify } = require("util");
// const mailService=require("../services/mailer");
// // signup => register -sentdOTP and verify otp 

// // 

// const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
// //Register a New user
// exports.Register = async (req, res, next) => {
//     const { firstName, lastName, email, password, verified } = req.body;
//     //check if a verified user given emial exists

//     const filteredBody = filterObj(req.body, "firstname", "lastName", "password", "email");
//     const existing_user = await User.findOne({ email: email })
//     if (existing_user && existing_user.verified) {
//         res.status(400).json({
//             status: "error",
//             message: "Email is already in use, Please login"
//         })
//     }
//     else if (existing_user) {
//         // first arguement is condition and second is object which we have to udpate
//         await User.findOneAndUpdate({ email: email }, filteredBody, { new: true, validateModifiedOnly: true })
//         req.userId = existing_user._id;
//         next();
//     }
//     else {
//         //if user record is not avialalbe in database
//         const new_user = await User.create(filteredBody);
//         req.userId = new_user._id;
//         next();
//     }

// }
// exports.setOtp = async (req, res, next) => {
//     const userId = req;
//     const new_otp = otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
//     const otp_expiry_time = Date.now() + 10 * 60 * 1000; //10 mins after otp is sent

//     //have description in mongodb notes
//     await User.findByIdAndUpdate(userId, {
//         otp: new_otp,
//         otp_expiry_time,
//     })
//     //send Mail 

//     mailService.sendEmail({
//         from:"rammodi0509@gmail.com",
//         to:"rammmodi0905@gmail.com",
//         subject:"OTP for verification",
//         text:`Your OTP is ${new_otp} .This is valid for 10 Mins.`

//     }).then(()=>{

//     }).catch((err)=>{
//         console.log(err)
//     });
    
  

//     res.status(200).json({
//         status: "success",
//         message: "Otp sent succesfully"
//     })

// }
// exports.verifyOtp = async (req, res, next) => {
//     // verify the otp and updat user record accodingly
//     const { email, password } = req.body;

//     // IT finds the first one which encounter this condition
//     const user = await User.findOne({
//         email,
//         //2nd arguement
//         //projection An object that specifies which fields (or properties) of the document should be returned.
//         // It allows you to control which fields are included or excluded from the result.
//         otp_expiry_time: {
//             $gt: Date.now(),
//         }
//     })
//     if (!user) {
//         res.status(400).json({
//             status: "error",
//             message: "Email is Invalid or Otp expired"
//         })


//     }
//     if (!await user.correctOTP(otp, user.otp)) {
//         res.status(400).json({
//             status: "error",
//             message: "OTP is incorrect",
//         })
//     }
//     //OTp is correct
//     user.verified = true;
//     user.otp = undefined

//     await user.save({ new: true, validateModifiedOnly: true })
//     const token = signToken(user._id);
//     res.status(200).json({
//         status: "success",
//         message: "OTP verfied successfully",
//         token,
//     })

// }
// exports.login = async (req, res, next) => {
//     const { email, password } = req.body;
//     if (!email || !password) {
//         res.status(400).json({
//             status: "error",
//             message: "Both email and password is required"
//         })
//     }
//     // User is a model 
//     // and user is fetched from database ,, ok
//     const user = await User.findOne({ email: email }).select("+password");
//     // here user is an document !! ok.. this fucntion's are called on document
//     if (!user || (await user.correctPassword(password, user.password))) {
//         res.status(400).json({
//             status: "error",
//             message: "Email or password is incorrect",
//         })
//     }
//     const token = signToken(user._id);
//     res.status(200).json({
//         status: 'success',
//         message: "logged in successfull",
//         token
//     })

// }

// exports.protect = async (req, res, next) => {
//     //types of routes -> protected (onlyl logged inusers can access these)& 
//     // we getting the token 
//     let token;
//     if (req.headers.authorization && req.headers.authorization.startWith("Bearer")) {
//         // here we are extracting the token form the bearer token which start with bearer
//         token = req.headers.authorization.split(" ")[1];

//     }
//     else if (req.cookies.jwt) {
//         token = req.cookies.jwt
//     }
//     else {
//         req.status(400).json({
//             status: "error",
//             message: "you are not logged in !please login to get access"
//         })
//     }
//     // verification of token this extracting the payload (userId)
//     const decoded = await promisify(jwt.verify)(token, proccess.env.JWT_SECRET)
//     // check if user is still authenticatd
//     // if there is not user it returning a error
//     const this_user = await User.findByID(decoded.userId)
//     if (!this_user) {
//         res.status(400).json({
//             status: "error",
//             message: "The user doesn't exist"
//         })
//     }
//     // check if user changed their password after token was issued
//     // here iat stands for Issued at(current timestamp)
//     if (this_user.changedPasswordAfter(decoded.iat)) {
//         res.status(400).json({
//             status: "error",
//             message: "User recently updated password? Please log in again ",
//         })
//     }
//     req.user = this_user;
//     next();


// }
// exports.forgotPassword = async (req, res, next) => {
//     //1> get user email 
//     const user = await User.findOne({ email: req.body.email })
//     if (!user) {
//         res.status(400).json({
//             status: "error",
//             message: "There is no user with given email address"
//         })
//         // This ensures that the function terminates at this point, and no additional processing occurs.
//         return;
//     }
//     //2>Generate the random reset token 
//     const resetToken = user.createPasswordResetToken();
//     const resetURL = `https://farmex.com/auth/reset-password/?code=${resetToken}`
//     try {
//         res.status(200).json({
//             status: "success",
//             message: "Reset Password link sent to Email",
//         })
//     } catch (error) {
//         user.passwordResetToken = undefined;
//         user.passwordResetExpires = undefined;
//         await user.save({ validateBeforeSave: false });
//         res.status(500).json({
//             status: "error",
//             message: "There was an error sending the email , please try again later."
//         })
//     }

//     //https:
// }
// exports.resetPassword = async (req, res, next) => {
//     // get the user based on token 
//     const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
//     const user = await User.findOne({
//         passwordResetToken: hashedToken,
//         passwordResetExpires: { gt: Date.now() },
//     })
//     //if token is expired or user is out of time window
//     if (!user) {
//         res.status(400).json({
//             status: "error",
//             message: "Token is Invalid or Expired"
//         })
//         return;
//     }
//     // updat user passowrd and set reset toekn to undefined
//     user.password = req.body.password;
//     user.passwordConfirm = req.body.passwordConfirm

//     // after changing the password we have to clear the resettoken or  expiry time for future use
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save();
//     // send and email to user informing about password 

//     // Login the user and send new jwt 
//     const token = signToken(user._id);
//     res.status(200).json({
//         status: 'success',
//         message: "Password Reseted Successfully",
//         token,
//     })

// }