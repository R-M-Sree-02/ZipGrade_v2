const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  validateSignupInitiate,
  validateLogin,
  validateOTP,
  validateForgotInitiate,
  validateResetPassword,
} = require('../middleware/validate.middleware');

// Signup flow
router.post('/signup/initiate', validateSignupInitiate, authController.signupInitiate);
router.post('/signup/verify', validateOTP, authController.signupVerify);
router.post('/signup/resend-otp', validateForgotInitiate, authController.signupResendOtp);

// Login
router.post('/login', validateLogin, authController.login);

// Forgot password flow
router.post('/forgot-password/initiate', validateForgotInitiate, authController.forgotPasswordInitiate);
router.post('/forgot-password/verify-otp', validateOTP, authController.forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', validateResetPassword, authController.forgotPasswordReset);

// Google OAuth
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

// Zoho OAuth
router.get('/zoho', authController.zohoRedirect);
router.get('/zoho/callback', authController.zohoCallback);

// Protected routes
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh', authController.refreshAccessToken);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
