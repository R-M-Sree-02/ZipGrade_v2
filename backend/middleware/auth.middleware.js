const { verifyAccessToken } = require('../utils/token');

/**
 * JWT authentication middleware
 * Extracts and verifies the access token from Authorization header
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { user_id, email_id, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

module.exports = { verifyToken };
