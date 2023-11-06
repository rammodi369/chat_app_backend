const User=require("../models/user")
const filterObj = require("../utils/filterObj")
// this aboe is model .... model is like a blueprint for any collectio 
exports.updateMe=async (req, res, next)=>{
    const {user}=req;
    // in this only this four object get updated another one's not so we can filter only this 4 properties
    const filteredBody=filterObj(req.body, "firstname", "lastName", "password", "email");
   const updated_user= await User.findByIdUpdate(user._id,filteredBody,{new:true,validateModifiedOnly:true})
   res.status(200).json({
    status:"success",
    data:"update_user",
    messge:"Profile Updated successfully",
   })
}