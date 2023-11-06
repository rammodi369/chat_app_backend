const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last Name is required"],
  },
  about: {
    type: String,
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: function (email) {
        return String(email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
      },
      message: (props) => `Email (${props.value}) is invalid!`,
    },
  },
  password: {
    // unselect
    type: String,
  },
  passwordChangedAt: {
    // unselect
    type: Date,
  },
  passwordResetToken: {
    // unselect
    type: String,
  },
  passwordResetExpires: {
    // unselect
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    // unselect
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otp_expiry_time: {
    type: Date,
  },
  friends: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  socket_id: {
    type: String
  },
  status: {
    type: String,
    enum: ["Online", "Offline"]
  }
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("otp") || !this.otp) return next();

  // Hash the otp with cost of 12
  this.otp = await bcrypt.hash(this.otp.toString(), 12);

  console.log(this.otp.toString(), "FROM PRE SAVE HOOK");

  next();
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password") || !this.password) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Shift it to next hook // this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew || !this.password)
    return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  return await bcrypt.compare(candidateOTP, userOTP);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }

  // FALSE MEANS NOT CHANGED
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = new mongoose.model("User", userSchema);
module.exports = User;



// const mongoose = require("mongoose");
// const bcryptjs = require("bcryptjs")
// // crypto module, which is used for cryptographic and hash-related operations. This module
// //  provides a wide range of cryptographic functions for working with encryption, decryption, hashing, and more.
// const crypto =require("crypto");

// const UserSchema = new mongoose.Schema({
//     firstName: {
//         type: String,
//         required: [true, "First Name is required"],
//     },
//     lastName: {
//         type: String,
//         required: [true, "Last is required"],
//     },
//     avatar: {
//         type: String,
//     },
//     email: {
//         type: String,
//         required: [true, "Emial is required"],
//         validate: {
//             validator: function (email) {
//                 return String(email).toLowerCase().match(
//                     "^[A-Za-z0-9](([a-zA-Z0-9,=\.!\-#|\$%\^&\*\+/\?_`\{\}~]+)*)@(?:[0-9a-zA-Z-]+\.)+[a-zA-Z]{2,9}$"

//                 )
//             },
//             message: (props) => `Email ${props.value} is invalid`
//         }
//     },
//     password: {
//         type: String,
//     },
//     paswordconfirm:{
//    type:String,
//     },
//     passwordChangedAt: {
//         type: Date,
//     },
//     passwordResetToken: {
//         type: String,

//     },
//     passwordResetExpires: {
//         type: Date,
//     },
//     createdAt: {
//         type: Date,
//     },
//     updatedAt: {
//         type: Date,
//     },
//     verified: {
//         type: Boolean,
//         default: false
//     },
//     otp: {
//         type: Number,
//     },
//     otp_expiry_time: {
//         type: Date,
//     },
// })

// // Mongoose middleware function defined for a save operation on a Mongoose schema named 
// // UserSchema. This middleware function is executed before saving a document to the database, and it performs the following tasks:
// UserSchema.pre("save", async function (next) {
//     //only run this fucntion if otp is actually modified
//     if (!this.isModified("otp"))
//         // if the otp not get modified that we don't have to change it to hashe otherwise we have to do it
//         return next();

//     // Hash the otp with the cost of 12
//     this.otp = await bcrypt.hash(this.otp, 12);

//     next();
// })
// UserSchema.pre("save", async function (next) {
//     //only run this fucntion if otp is actually modified
//     if (!this.isModified("password"))
//         // if the otp not get modified that we don't have to change it to hashe otherwise we have to do it
//         return next();

//     // Hash the otp with the cost of 12
//     this.otp = await bcryptjs.hash(this.password, 12);

//     next();
// })
// UserSchema.methods.correctPassword = async function (
//     candidatePassword,
//     userPassword
// ) {
//     return await bcryptjs.compare(candidatePassword, userPassword);
// }
// UserSchema.methods.correctOTP = async function (
//     candidateOTP,
//     userOTP
// ) {
//     return await bcryptjs.compare(candidateOTP, userOTP);
// }
// // here we are not using arrow function because arrow function does not have this keyword that's why we are using this funciton keyword
// UserSchema.methods.createPasswordResetToken=function(){
//  const resetToken=crypto.randomBytes(32).toString("hex");
//  this.passwordResetToken=crypto.createHash("sha256").update(resetToken).digest("hex");
//  this.passwordResetExpires=Date.now()+10*60*1000;
//  return resetToken;
// }
// UserSchema.methods.changedPasswordAfter=function(timestamp){
// // if anyone has our password and we changed the password we have to login again it is for login purpose
//     return timestamp < this.passwordChangedAt
// }

// const User = new mongoose.model("User", UserSchema)
// module.exports = User;