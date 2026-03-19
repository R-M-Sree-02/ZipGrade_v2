const express = require('express');
const router = express.Router();

const {
  googleRedirect,
  googleCallback,
  zohoRedirect,
  zohoCallback
} = require('../controllers/oauth.controller');

// Google
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

// Zoho
router.get('/zoho', zohoRedirect);
router.get('/zoho/callback', zohoCallback);

module.exports = router;