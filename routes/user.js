const express=require("express");
const router=express.Router()
const authController=require("../controllers/authController");
const userController=require("../controllers/user");

// here we are updating sonthing so we are using the patch method
router.patch("/update-me",authController.protect,userController.updateMe);
 
module.exports=router;