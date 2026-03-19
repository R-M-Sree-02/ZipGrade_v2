const jwt = require('jsonwebtoken');

/**
 * Sign an access token (short-lived)
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

/**
 * Sign a refresh token (long-lived)
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
};

/**
 * Verify an access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Sign a password reset token (short-lived, 10 minutes)
 */
const signResetToken = (payload) => {
  return jwt.sign({ ...payload, purpose: 'reset' }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '10m',
  });
};

/**
 * Verify a password reset token
 */
const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (decoded.purpose !== 'reset') {
    throw new Error('Invalid reset token purpose');
  }
  return decoded;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signResetToken,
  verifyResetToken,
};
