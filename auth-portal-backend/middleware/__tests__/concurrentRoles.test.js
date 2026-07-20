const request = require('supertest');
// Ensure dummy secrets exist for the test environment before requiring app
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret123';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'dummy_groq_key_123';

const app = require('../../app'); // Import the Express app
const jwt = require('jsonwebtoken');

// 1. Mock the permission service so we don't need a real database for this test
jest.mock('../../services/permissionService', () => ({
    hasPermission: jest.fn((userId, permissionName) => {
        // Admin ID: 1 (Has all permissions)
        // Manager ID: 2 (Missing 'manage_roles')
        // User ID: 3 (Missing 'manage_roles')
        if (userId === 1 && permissionName === 'manage_roles') return Promise.resolve(true);
        if (userId === 2 && permissionName === 'manage_roles') return Promise.resolve(false);
        if (userId === 3 && permissionName === 'manage_roles') return Promise.resolve(false);
        return Promise.resolve(false);
    })
}));

// 2. Mock the entire controller using a Proxy so Express routes don't crash
jest.mock('../../controllers/roleController', () => {
    return new Proxy({}, {
        get: (target, prop) => (req, res) => res.status(200).json({ success: true, message: 'Mock Admin Data' })
    });
});

// Ensure a dummy secret exists for the test environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret123';

const generateToken = (id, email, role) => {
    return jwt.sign({ id, email, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Concurrent Role Integration Tests', () => {
    let adminToken;
    let managerToken;
    let userToken;

    beforeAll(() => {
        // Generate mock tokens for 3 concurrent sessions
        adminToken = generateToken(1, 'admin@example.com', 'Admin');
        managerToken = generateToken(2, 'manager@example.com', 'Manager');
        userToken = generateToken(3, 'user@example.com', 'User');
    });

    it('should correctly authorize Admin and block Manager/User concurrently', async () => {
        
        // Fire 3 requests to the exact same protected route at the EXACT same time!
        const [adminRes, managerRes, userRes] = await Promise.all([
            request(app).get('/admin/roles').set('Authorization', `Bearer ${adminToken}`),
            request(app).get('/admin/roles').set('Authorization', `Bearer ${managerToken}`),
            request(app).get('/admin/roles').set('Authorization', `Bearer ${userToken}`)
        ]);

        // 1. Admin should succeed (200 OK)
        expect(adminRes.status).toBe(200);
        expect(adminRes.body.message).toBe('Mock Admin Data');

        // 2. Manager should be blocked (403 Forbidden)
        expect(managerRes.status).toBe(403);
        expect(managerRes.body.message).toContain('Missing required permission');

        // 3. User should be blocked (403 Forbidden)
        expect(userRes.status).toBe(403);
        expect(userRes.body.message).toContain('Missing required permission');
    });
});
