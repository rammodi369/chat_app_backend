const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs")
const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "First Name is required"],
    },
    lastName: {
        type: String,
        required: [true, "Last is required"],
    },
    avatar: {
        type: String,
    },
    email: {
        type: String,
        required: [true, "Emial is required"],
        validate: {
            validator: function (email) {
                return String(email).toLowerCase().match(
                    "^[A-Za-z0-9](([a-zA-Z0-9,=\.!\-#|\$%\^&\*\+/\?_`\{\}~]+)*)@(?:[0-9a-zA-Z-]+\.)+[a-zA-Z]{2,9}$"

                )
            },
            message: (props) => `Email ${props.value} is invalid`
        }
    },
    password: {
        type: String,
    },
    passwordChangedAt: {
        type: Date,
    },
    passwordResetToken: {
        type: String,

    },
    passwordResetExpires: {
        type: Date,
    },
    createdAt: {
        type: Date,
    },
    updatedAt: {
        type: Date,
    },
    verified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: Number,
    },
    otp_expiry_time: {
        type: Date,
    },
})

// Mongoose middleware function defined for a save operation on a Mongoose schema named 
// UserSchema. This middleware function is executed before saving a document to the database, and it performs the following tasks:
UserSchema.pre("save", async function (next) {
    //only run this fucntion if otp is actually modified
    if (!this.isModified("otp"))
        // if the otp not get modified that we don't have to change it to hashe otherwise we have to do it
        return next();

    // Hash the otp with the cost of 12
    this.otp = await bcryptjs.hash(this.otp, 12);

    next();
})
UserSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcryptjs.compare(candidatePassword, userPassword);
}
UserSchema.methods.correctOTP = async function (
    candidateOTP,
    userOTP
) {
    return await bcryptjs.compare(candidateOTP, userOTP);
}
// here we are not using arrow function because arrow function does not have this keyword that's why we are using this funciton keyword
UserSchema.methods.createPasswordResetToken=function(){

}

const User = new mongoose.model("User", UserSchema)
module.exports = User;