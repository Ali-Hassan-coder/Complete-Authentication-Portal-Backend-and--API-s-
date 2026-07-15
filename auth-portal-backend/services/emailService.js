const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for port 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"Authentication Portal" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Your Password Reset OTP',
        text: `Your OTP for password reset is ${otp}. It is valid for 15 minutes. If you did not request this, please ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
                <h2>Password Reset Request</h2>
                <p>Use the OTP below to reset your password. This code is valid for <strong>15 minutes</strong>.</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 24px 0;">${otp}</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };