const getOtpTemplate = (otp) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Password Reset Request</h2>
        <p>Use the OTP below to reset your password. This code is valid for <strong>15 minutes</strong>.</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 24px 0;">${otp}</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
`;

module.exports = { getOtpTemplate };
