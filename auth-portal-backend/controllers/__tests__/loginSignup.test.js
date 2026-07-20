const { signup, login } = require('../authController');
const authService = require('../../services/authService');

// Mock the authService
jest.mock('../../services/authService');

describe('Signup & Login Controller Tests', () => {
    let mockReq;
    let mockRes;
    let mockIo;

    beforeEach(() => {
        // Mock the socket.io instance
        mockIo = {
            emit: jest.fn()
        };

        // Reset request and response objects
        mockReq = {
            body: {},
            app: {
                get: jest.fn().mockImplementation((key) => {
                    if (key === 'io') return mockIo;
                    return null;
                })
            }
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // --- 1. SIGNUP TESTS ---
    describe('Signup Controller', () => {
        it('should return 201 when signup is successful', async () => {
            const mockUser = { id: 1, name: 'John Doe', email: 'john@example.com' };
            mockReq.body = { name: 'John Doe', email: 'john@example.com', password: 'password123', phone: '03001234567' };
            
            // Simulate the service succeeding
            authService.signup.mockResolvedValue({ success: true, message: 'User registered successfully', user: mockUser });

            await signup(mockReq, mockRes);

            expect(authService.signup).toHaveBeenCalledWith(mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'User registered successfully', user: mockUser });
        });

        it('should return 400 when signup fails (e.g. email already exists)', async () => {
            mockReq.body = { name: 'John Doe', email: 'existing@example.com', password: 'password123', phone: '03001234567' };
            
            // Simulate the service throwing an error
            authService.signup.mockRejectedValue(new Error('Email already registered'));

            await signup(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Email already registered' });
        });
    });

    // --- 2. LOGIN TESTS ---
    describe('Login Controller', () => {
        it('should return 200, update status to online, and emit socket event on successful login', async () => {
            const mockUser = { id: 5, email: 'john@example.com', role: 'User' };
            mockReq.body = { email: 'john@example.com', password: 'password123' };
            
            // Simulate service returning a token and user
            authService.login.mockResolvedValue({ success: true, token: 'mock-jwt-token', user: mockUser });
            authService.updateStatus.mockResolvedValue(true);

            await login(mockReq, mockRes);

            expect(authService.login).toHaveBeenCalledWith(mockReq.body);
            
            // Verify status update logic triggered
            expect(authService.updateStatus).toHaveBeenCalledWith(5, 'online');
            expect(mockIo.emit).toHaveBeenCalledWith('user_status_changed', { userId: 5, status: 'online' });

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ success: true, token: 'mock-jwt-token', user: mockUser });
        });

        it('should return 401 Unauthorized when password is incorrect', async () => {
            mockReq.body = { email: 'john@example.com', password: 'wrongpassword' };
            
            authService.login.mockRejectedValue(new Error('Invalid credentials'));

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid credentials' });
            
            // Ensure status update logic is bypassed on failure
            expect(authService.updateStatus).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });
    });
});
