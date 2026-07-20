const { forgotPassword, verifyOtp, resetPassword } = require('../authController');
const authService = require('../../services/authService');

// Mock the entire authService to isolate our controller logic
jest.mock('../../services/authService');

describe('Forgot Password Module Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        // Reset our mock request and response objects before every test
        mockReq = {
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        // Clear previous mock data to prevent test pollution
        jest.clearAllMocks();
    });

    // --- 1. FORGOT PASSWORD ---
    describe('Step 1: forgotPassword()', () => {
        it('should return 200 and success message when email is found and OTP is sent', async () => {
            mockReq.body.email = 'test@example.com';
            authService.forgotPassword.mockResolvedValue({ success: true, message: 'OTP sent successfully' });

            await forgotPassword(mockReq, mockRes);

            expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'OTP sent successfully' });
        });

        it('should return 400 when user is not found', async () => {
            mockReq.body.email = 'notfound@example.com';
            authService.forgotPassword.mockRejectedValue(new Error('User not found'));

            await forgotPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
        });
    });

    // --- 2. VERIFY OTP ---
    describe('Step 2: verifyOtp()', () => {
        it('should return 200 and a resetToken when OTP is valid', async () => {
            mockReq.body = { email: 'test@example.com', otp: '123456' };
            authService.verifyOtp.mockResolvedValue({ success: true, message: 'OTP verified', resetToken: 'some-secure-token' });

            await verifyOtp(mockReq, mockRes);

            expect(authService.verifyOtp).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'OTP verified', resetToken: 'some-secure-token' });
        });

        it('should return 400 when OTP is invalid or expired', async () => {
            mockReq.body = { email: 'test@example.com', otp: '000000' };
            authService.verifyOtp.mockRejectedValue(new Error('Invalid or expired OTP'));

            await verifyOtp(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired OTP' });
        });
    });

    // --- 3. RESET PASSWORD ---
    describe('Step 3: resetPassword()', () => {
        it('should return 200 when password reset is completely successful', async () => {
            mockReq.body = { email: 'test@example.com', resetToken: 'some-secure-token', newPassword: 'newPassword123' };
            authService.resetPassword.mockResolvedValue({ success: true, message: 'Password has been reset successfully' });

            await resetPassword(mockReq, mockRes);

            expect(authService.resetPassword).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Password has been reset successfully' });
        });

        it('should return 400 when the reset token is invalid or tampered with', async () => {
            mockReq.body = { email: 'test@example.com', resetToken: 'hacked-token', newPassword: 'newPassword123' };
            authService.resetPassword.mockRejectedValue(new Error('Invalid or expired reset token'));

            await resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired reset token' });
        });
    });
});
