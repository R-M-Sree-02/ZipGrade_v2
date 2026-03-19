const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { generateOTP } = require('../utils/otp');
const { signAccessToken, signRefreshToken, verifyRefreshToken, signResetToken, verifyResetToken } = require('../utils/token');
const { sendSignupOTP, sendForgotPasswordOTP } = require('../utils/mailer');

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper: create session and issue tokens
const issueTokensAndSession = async (db, user, req) => {
  const sessionId = uuidv4();
  const expiresAt = Date.now() + REFRESH_COOKIE_MAX_AGE;

  const accessToken = signAccessToken({ user_id: user.user_id, email_id: user.email_id });
  const refreshToken = signRefreshToken({ user_id: user.user_id, email_id: user.email_id, session_id: sessionId });

  await db.createSession({
    session_id: sessionId,
    user_id: user.user_id,
    expires_at: expiresAt,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'] || '',
  });

  return { accessToken, refreshToken, sessionId };
};

// ==================== SIGNUP ====================

const signupInitiate = async (req, res) => {
  try {
    const { user_name, email_id, password } = req.body;
    const db = req.app.locals.db;

    // Check if email already exists
    const existingUser = await db.getUserByEmail(email_id);
    if (existingUser && existingUser.is_verified) {
      return res.status(409).json({ success: false, error: 'Email is already registered.' });
    }

    // Rate limit: max 3 OTPs per email per 15 minutes
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    const recentCount = await db.countRecentOTPs(email_id, fifteenMinAgo);
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again later.' });
    }

    // Generate and save OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    await db.saveOTP({ email_id, otp_code: otp, otp_type: 'signup', expires_at: expiresAt });

    // Store temp password + user_name in OTP record context (we'll hash on verify)
    // We store the password hash temporarily — if user already exists but unverified, update
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    if (existingUser && !existingUser.is_verified) {
      // Update existing unverified user
      await db.updatePassword(email_id, hashedPassword);
    } else if (!existingUser) {
      // Create user as unverified
      await db.createUser({
        user_name,
        email_id,
        hashedPassword,
        auth_provider: 'local',
        provider_id: null,
      });
    }

    // Send OTP email
    await sendSignupOTP(email_id, user_name, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete signup.',
    });
  } catch (err) {
    console.error('Signup initiate error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const signupVerify = async (req, res) => {
  try {
    const { email_id, otp_code } = req.body;
    const db = req.app.locals.db;

    // Fetch latest unused OTP
    const otpRecord = await db.getLatestOTP(email_id, 'signup');
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'No pending OTP found for this email.' });
    }

    // Check OTP match
    if (otpRecord.otp_code !== otp_code) {
      return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }

    // Check expiry
    if (Date.now() > otpRecord.expires_at) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    // Mark OTP as used and verify user
    await db.markOTPUsed(otpRecord.otp_id);
    await db.verifyUser(email_id);

    // Get user
    const user = await db.getUserByEmail(email_id);

    // Issue tokens
    const { accessToken, refreshToken } = await issueTokensAndSession(db, user, req);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        accessToken,
        user: { user_id: user.user_id, user_name: user.user_name, email_id: user.email_id },
      },
    });
  } catch (err) {
    console.error('Signup verify error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const signupResendOtp = async (req, res) => {
  try {
    const { email_id } = req.body;
    const db = req.app.locals.db;

    const user = await db.getUserByEmail(email_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email not found. Please sign up first.' });
    }
    if (user.is_verified) {
      return res.status(400).json({ success: false, error: 'Email is already verified.' });
    }

    // Rate limit
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    const recentCount = await db.countRecentOTPs(email_id, fifteenMinAgo);
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again later.' });
    }

    // Invalidate old OTPs and generate new one
    await db.invalidateOTPs(email_id, 'signup');
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    await db.saveOTP({ email_id, otp_code: otp, otp_type: 'signup', expires_at: expiresAt });

    await sendSignupOTP(email_id, user.user_name, otp);

    return res.status(200).json({ success: true, message: 'OTP resent.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// ==================== LOGIN ====================

const login = async (req, res) => {
  try {
    const { email_id, password } = req.body;
    const db = req.app.locals.db;

    const user = await db.getUserByEmail(email_id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.auth_provider !== 'local') {
      return res.status(400).json({
        success: false,
        error: `This account uses ${user.auth_provider} login. Please use the "${user.auth_provider}" button to sign in.`,
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({ success: false, error: 'Email not verified. Please verify your account first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password.toString());
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = await issueTokensAndSession(db, user, req);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user: { user_id: user.user_id, user_name: user.user_name, email_id: user.email_id },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// ==================== FORGOT PASSWORD ====================

const forgotPasswordInitiate = async (req, res) => {
  try {
    const { email_id } = req.body;
    const db = req.app.locals.db;

    // Always return same message to not expose email existence
    const genericMessage = 'If this email is registered, you will receive an OTP.';

    const user = await db.getUserByEmail(email_id);
    if (!user) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    // Rate limit
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    const recentCount = await db.countRecentOTPs(email_id, fifteenMinAgo);
    if (recentCount >= 3) {
      return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again later.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    await db.saveOTP({ email_id, otp_code: otp, otp_type: 'forgot_password', expires_at: expiresAt });

    await sendForgotPasswordOTP(email_id, otp);

    return res.status(200).json({ success: true, message: genericMessage });
  } catch (err) {
    console.error('Forgot password initiate error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { email_id, otp_code } = req.body;
    const db = req.app.locals.db;

    const otpRecord = await db.getLatestOTP(email_id, 'forgot_password');
    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'No pending OTP found.' });
    }

    if (otpRecord.otp_code !== otp_code) {
      return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }

    if (Date.now() > otpRecord.expires_at) {
      return res.status(400).json({ success: false, error: 'OTP has expired.' });
    }

    await db.markOTPUsed(otpRecord.otp_id);

    const resetToken = signResetToken({ email_id });

    return res.status(200).json({
      success: true,
      message: 'OTP verified.',
      data: { resetToken },
    });
  } catch (err) {
    console.error('Forgot password verify OTP error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const forgotPasswordReset = async (req, res) => {
  try {
    const { resetToken, new_password } = req.body;
    const db = req.app.locals.db;

    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, SALT_ROUNDS);
    await db.updatePassword(decoded.email_id, hashedPassword);

    // Invalidate all sessions for this user
    const user = await db.getUserByEmail(decoded.email_id);
    if (user) {
      await db.deleteAllUserSessions(user.user_id);
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. Please log in.',
    });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

// ==================== OAUTH: GOOGLE ====================

const googleCallback = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { code } = req.query;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenResponse.data;

    // Fetch user info
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { id: providerId, email, name } = userInfoResponse.data;

    let user = await db.getUserByEmail(email);

    if (user) {
      // Update provider_id if needed
      if (!user.provider_id) {
        await db.updateProviderIdByEmail(email, providerId);
      }
    } else {
      // Create new user
      const userId = await db.createUser({
        user_name: name || email.split('@')[0],
        email_id: email,
        hashedPassword: null,
        auth_provider: 'google',
        provider_id: providerId,
      });
      user = await db.getUserById(userId);
    }

    const { accessToken } = await issueTokensAndSession(db, user, req);

    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${accessToken}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

const googleRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// ==================== OAUTH: ZOHO ====================

const zohoRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    redirect_uri: process.env.ZOHO_CALLBACK_URL,
    scope: 'AaaServer.profile.Read',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`);
};

const zohoCallback = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { code } = req.query;

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        code,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        redirect_uri: process.env.ZOHO_REDIRECT_URI,
        grant_type: 'authorization_code',
      },
    });

    const { access_token } = tokenResponse.data;

    // Fetch user info
    const userInfoResponse = await axios.get('https://accounts.zoho.com/oauth/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { sub: providerId, email, name } = userInfoResponse.data;

    let user = await db.getUserByEmail(email);

    if (user) {
      if (!user.provider_id) {
        await db.updateProviderIdByEmail(email, providerId);
      }
    } else {
      const userId = await db.createUser({
        user_name: name || email.split('@')[0],
        email_id: email,
        hashedPassword: null,
        auth_provider: 'zoho',
        provider_id: providerId,
      });
      user = await db.getUserById(userId);
    }

    const { accessToken } = await issueTokensAndSession(db, user, req);

    return res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${accessToken}`);
  } catch (err) {
    console.error('Zoho OAuth callback error:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ==================== LOGOUT / REFRESH / ME ====================

const logout = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.session_id) {
          await db.deleteSession(decoded.session_id);
        }
      } catch (e) {
        // Token invalid, just clear cookie
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'No refresh token provided.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token.' });
    }

    // Check session in DB
    const session = await db.getSession(decoded.session_id);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }

    const accessToken = signAccessToken({ user_id: decoded.user_id, email_id: decoded.email_id });

    return res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = await db.getUserById(req.user.user_id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      data: {
        user_id: user.user_id,
        user_name: user.user_name,
        email_id: user.email_id,
        auth_provider: user.auth_provider,
        created_time: user.created_time,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  signupInitiate,
  signupVerify,
  signupResendOtp,
  login,
  forgotPasswordInitiate,
  forgotPasswordVerifyOtp,
  forgotPasswordReset,
  googleRedirect,
  googleCallback,
  zohoRedirect,
  zohoCallback,
  logout,
  refreshAccessToken,
  getMe,
};
