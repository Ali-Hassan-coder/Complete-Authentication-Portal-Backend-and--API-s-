const nodemailer = require('nodemailer');
const { getOtpTemplate } = require('../utils/emailTemplates');

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
        html: getOtpTemplate(otp),
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };