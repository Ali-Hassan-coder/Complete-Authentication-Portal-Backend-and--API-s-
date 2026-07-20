const errorHandler = require('../errorHandler');

describe('Error Handler Middleware Tests', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    
    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        
        // Mute console.error during tests to keep the test runner output clean
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
        // Restore console.error and other mocks
        jest.restoreAllMocks();
    });

    it('should use the provided custom err.statusCode and err.message', () => {
        const customError = new Error('Custom Bad Request');
        customError.statusCode = 400;

        errorHandler(customError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Custom Bad Request'
        }));
    });

    it('should default to 500 and "Internal Server Error" if properties are missing', () => {
        // Create an error with no message and no status code
        const plainError = new Error();

        errorHandler(plainError, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: 'Internal Server Error'
        }));
    });

    it('should expose err.stack in the development environment', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const error = new Error('Dev Error');
        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            stack: error.stack
        }));

        // Restore environment
        process.env.NODE_ENV = originalEnv;
    });

    it('should completely hide err.stack in the production environment for security', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        
        const error = new Error('Prod Error');
        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            stack: undefined
        }));

        // Restore environment
        process.env.NODE_ENV = originalEnv;
    });
});
