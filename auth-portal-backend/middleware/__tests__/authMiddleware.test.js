const authenticate = require('../authMiddleware');
const jwt = require('jsonwebtoken');

describe('Auth Middleware Tests', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        // Reset our mock request and response objects before every test
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
    });

    it('should return 401 if no authorization header is provided', () => {
        authenticate(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'No token provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
        mockReq.headers.authorization = 'Basic some-token';
        
        authenticate(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'No token provided' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if the token is invalid or expired', () => {
        mockReq.headers.authorization = 'Bearer invalid-token';
        
        // Temporarily set a secret
        process.env.JWT_SECRET = 'testsecret123';

        authenticate(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired token' });
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() and attach user to req if token is valid', () => {
        process.env.JWT_SECRET = 'testsecret123';
        
        // Create a real, valid token for the test
        const validToken = jwt.sign({ id: 10, email: 'test@example.com' }, process.env.JWT_SECRET);
        mockReq.headers.authorization = `Bearer ${validToken}`;

        authenticate(mockReq, mockRes, nextFunction);

        // It should successfully decode and attach to req.user
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.id).toBe(10);
        expect(mockReq.user.email).toBe('test@example.com');
        
        // It should call the next() function to allow the user through
        expect(nextFunction).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });
});
