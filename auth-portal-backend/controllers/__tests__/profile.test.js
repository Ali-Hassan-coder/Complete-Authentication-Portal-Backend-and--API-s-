const { getProfile, updateProfile } = require('../authController');
const authService = require('../../services/authService');

// Mock the authService
jest.mock('../../services/authService');

describe('Profile Controller Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 10 }, // Simulated logged-in user
            body: {},
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:3000') // Mocks req.get('host')
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // --- 1. GET PROFILE ---
    describe('getProfile', () => {
        it('should return 200 and the user profile when successful', async () => {
            const mockProfileData = { id: 10, name: 'John Profile', email: 'john@example.com' };
            authService.getProfile.mockResolvedValue({ success: true, data: mockProfileData });

            await getProfile(mockReq, mockRes);

            // Verifies it fetches the profile for the LOGGED IN user (ID: 10)
            expect(authService.getProfile).toHaveBeenCalledWith(10, 'http://localhost:3000');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockProfileData });
        });

        it('should return 404 when the profile cannot be found', async () => {
            authService.getProfile.mockRejectedValue(new Error('User not found'));

            await getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'User not found' });
        });
    });

    // --- 2. UPDATE PROFILE ---
    describe('updateProfile', () => {
        it('should return 200 when the profile is successfully updated', async () => {
            mockReq.body = { name: 'John Updated' };
            authService.updateProfile.mockResolvedValue({ success: true, message: 'Profile updated' });

            await updateProfile(mockReq, mockRes);

            // Verifies it passes the logged-in user's ID and the updated data
            expect(authService.updateProfile).toHaveBeenCalledWith(10, mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Profile updated' });
        });

        it('should return 400 when the profile update fails', async () => {
            mockReq.body = { email: 'bad-email' };
            authService.updateProfile.mockRejectedValue(new Error('Invalid email format'));

            await updateProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid email format' });
        });
    });
});
