const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors from express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ==================== SIGNUP VALIDATION ====================

const validateSignupInitiate = [
  body('user_name')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 2, max: 50 }).withMessage('Username must be 2–50 characters.')
    .matches(/^[a-zA-Z0-9 ]+$/).withMessage('Username must contain only alphanumeric characters and spaces.'),
  body('email_id')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.')
    .isLength({ max: 150 }).withMessage('Email must not exceed 150 characters.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least 1 number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least 1 special character.'),
  body('confirm_password')
    .notEmpty().withMessage('Confirm password is required.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
  handleValidationErrors,
];

// ==================== LOGIN VALIDATION ====================

const validateLogin = [
  body('email_id')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.'),
  body('password')
    .notEmpty().withMessage('Password is required.'),
  handleValidationErrors,
];

// ==================== OTP VALIDATION ====================

const validateOTP = [
  body('email_id')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.'),
  body('otp_code')
    .trim()
    .notEmpty().withMessage('OTP is required.')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
    .isNumeric().withMessage('OTP must contain only digits.'),
  handleValidationErrors,
];

// ==================== FORGOT PASSWORD VALIDATION ====================

const validateForgotInitiate = [
  body('email_id')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.'),
  handleValidationErrors,
];

const validateResetPassword = [
  body('resetToken')
    .notEmpty().withMessage('Reset token is required.'),
  body('new_password')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least 1 number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least 1 special character.'),
  body('confirm_password')
    .notEmpty().withMessage('Confirm password is required.')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
  handleValidationErrors,
];

// ==================== EXAM VALIDATION ====================

const validateCreateExam = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 50 }).withMessage('Title must not exceed 50 characters.'),
  body('total_questions')
    .optional()
    .isInt({ min: 0 }).withMessage('Total questions must be a non-negative integer.'),
  body('total_mark')
    .optional()
    .isInt({ min: 0 }).withMessage('Total mark must be a non-negative integer.'),
  handleValidationErrors,
];

module.exports = {
  validateSignupInitiate,
  validateLogin,
  validateOTP,
  validateForgotInitiate,
  validateResetPassword,
  validateCreateExam,
  handleValidationErrors,
};
