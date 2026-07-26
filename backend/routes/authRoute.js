const express =require('express');
const authMiddleware = require('../middleware/authMiddleware.js');
const authController = require('../controller/authController.js');
const { profileUploadMiddleware } = require('../config/cloudinary.js');
const response = require('../utils/responseHandler.js');



const router = express.Router();

router.post('/send-otp',authController.sendOtp);
router.post('/verify-otp',authController.verifyOtp);
router.get('/logout',authController.logout);


// protected route 

router.put('/update-profile',authMiddleware,profileUploadMiddleware,authController.updateProfile);
router.get('/check-auth',authMiddleware,authController.checkAuth);
router.get('/users',authMiddleware,authController.getAllUsers);





module.exports = router;
