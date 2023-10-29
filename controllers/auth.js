const jwt = require("jsonwebtoken");
const otpGenerator=require("otp-generator")

const User = require("../models/user");
const filterObj = require("../utils/filterObj");

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
//Register a New user
exports.Register = async (req, res, next) => {
    const { firstName, lastName, email, password, verified } = req.body;
    //check if a verified user given emial exists

    const filteredBody = filterObj(req.body, "firstname", "lastName", "password", "email");
    const existing_user = await User.findOne({ email: email })
    if (existing_user && existing_user.verified) {
        res.status(400).json({
            status: "error",
            message: "Email is already in use, Please login"
        })
    }
    else if (existing_user) {
        await User.findOneAndUpdate({ email: email }, filteredBody, { new: true, validateModifiedOnly: true })
        req.userId = existing_user._id;
        next();
    }
    else {
        //if user record is not avialalbe in database
        const new_user = await User.create(filteredBody);
        req.userId = new_user._id;
        next();
    }

}
exports.setOtp=async(req, res, next)=>{
    const userId=req;
    const new_otp=otpGenerator.generate(6,{lowerCaseAlphabets:false,upperCaseAlphabets:false, specialChars:false});
    const otp_expiry_time=Date.now()+10*60*1000; //10 mins after otp is sent
    
    //have description in mongodb notes
    await User.findByIdAndUpdate(userId,{
        otp:new_otp,
        otp_expiry_time,
    })
    //send Mail 
     res.status(200).json({
        status:"success",
        message:"Otp sent succesfully"
     })

}
exports.verifyOtp=async(req, res, next)=>{
    // verify the otp and updat user record accodingly
    const {email, password}=req.body;

    // IT finds the first one which encounter this condition
    const user=await User.findOne({
        email, 
        //2nd arguement
        //projection An object that specifies which fields (or properties) of the document should be returned.
        // It allows you to control which fields are included or excluded from the result.
        otp_expiry_time:{
            $gt:Date.now(),
        }
    })
    if(!user){
        res.status(400).json({
            status:"error",
            message:"Email is Invalid or Otp expired"
        })


    }
    if(!await user.correctOTP(otp, user.otp)){
        res.status(400).json({
            status:"error",
            message:"OTP is incorrect",
        })
    }
  //OTp is correct
  user.verified=true;
  user.otp=undefined

  await user.save({new:true, validateModifiedOnly:true})
  const token = signToken(user._id);
  res.status(200).json({
    status:"success",
    message:"OTP verfied successfully", 
    token,
  })

}
exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({
            status: "error",
            message: "Both email and password is required"
        })
    }
    // User is a model 
    // and user is fetched from database ,, ok
    const user = await User.findOne({ email: email }).select("+password");
    // here user is an document !! ok.. this fucntion's are called on document
    if (!user || (await user.correctPassword(password, user.password))) {
        res.status(400).json({
            status: "error",
            message: "Email or password is incorrect",
        })
    }
    const token = signToken(user._id);
    res.status(200).json({
        status: 'success',
        message: "logged in successfull",
        token
    })

}

exports.protect=async(req, res, next)=>{

}
exports.forgotPassword=async(req, res, next)=>{
    //1> get user email 
    const user=await User.findOne({email :req.body.email})
    if(!user){
        res.status(400).json({
            status:"error",
            message:"There is no user with given email address"
        })
    }
    //2>Generate the random reset token 
    const resetToken =user.createPasswordResetToken();
    //https:
}
exports.resetPassword=async( req, res, next)=>{

}