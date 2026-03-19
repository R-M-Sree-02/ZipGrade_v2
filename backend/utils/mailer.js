const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send signup OTP email
 */
const sendSignupOTP = async (email, userName, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your ZipGrade account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">ZipGrade</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your OTP to verify your ZipGrade account is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f1f5f9; padding: 15px 30px; border-radius: 8px; color: #1e293b;">
            ${otp}
          </span>
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #64748b;">If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">— ZipGrade Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Send forgot password OTP email
 */
const sendForgotPasswordOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'ZipGrade Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">ZipGrade</h2>
        <p>Hello,</p>
        <p>We received a request to reset your ZipGrade password. Your OTP is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f1f5f9; padding: 15px 30px; border-radius: 8px; color: #1e293b;">
            ${otp}
          </span>
        </div>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p style="color: #64748b;">If you did not request a password reset, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">— ZipGrade Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendSignupOTP, sendForgotPasswordOTP };
