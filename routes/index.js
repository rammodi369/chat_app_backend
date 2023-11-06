const express=require("express");
const router=express.Router()
const authRoute=require("./auth");
const userRoute=require("./user");
router.use("/auth",authRoute)
// syntax path and middleware 
router.use("/user",userRoute)

module.exports=router;
