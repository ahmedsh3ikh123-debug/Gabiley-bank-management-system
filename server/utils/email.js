const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendResetCode(email, code, fullName) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Gabiley Bank - Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1F8A4D, #176B3D); padding: 30px; border-radius: 15px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Gabiley Bank</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 15px 15px;">
          <h2 style="color: #333; text-align: center;">Password Reset Code</h2>
          <p style="color: #666; text-align: center;">Hello ${fullName || 'User'},</p>
          <p style="color: #666; text-align: center;">You requested a password reset. Use the code below:</p>
          <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; border: 2px dashed #1F8A4D;">
            <span style="font-size: 32px; font-weight: bold; color: #1F8A4D; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #999; text-align: center; font-size: 12px;">This code expires in 15 minutes.</p>
          <p style="color: #999; text-align: center; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="text-align: center; padding: 15px; color: #999; font-size: 11px;">
          &copy; 2026 Gabiley Bank. All rights reserved.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendResetCode };
