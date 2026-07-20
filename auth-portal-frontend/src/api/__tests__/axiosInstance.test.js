import axiosInstance from '../axiosInstance';

describe('Axios Instance Interceptor Tests', () => {
    beforeEach(() => {
        // Clear session storage before each test to ensure a clean state
        sessionStorage.clear();
    });

    it('should be configured with the correct baseURL pointing to the backend', () => {
        expect(axiosInstance.defaults.baseURL).toBe('http://localhost:3000');
    });

    it('should automatically attach the Authorization Bearer token if it exists in sessionStorage', async () => {
        // 1. Arrange: Simulate a user who has just logged in by setting a token
        const mockToken = 'fake-secure-jwt-token';
        sessionStorage.setItem('token', mockToken);

        // We create a blank request config object that Axios would normally build
        const mockConfig = { headers: {} };
        
        // We isolate the exact interceptor function you wrote in axiosInstance.js
        const requestInterceptorHandler = axiosInstance.interceptors.request.handlers[0].fulfilled;
        
        // 2. Act: Run the interceptor
        const updatedConfig = await requestInterceptorHandler(mockConfig);

        // 3. Assert: Verify the interceptor successfully attached the token to the header
        expect(updatedConfig.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('should NOT attach an Authorization header if the user is not logged in (no token)', async () => {
        // 1. Arrange: Ensure sessionStorage is empty (no token)
        expect(sessionStorage.getItem('token')).toBeNull();

        const mockConfig = { headers: {} };
        const requestInterceptorHandler = axiosInstance.interceptors.request.handlers[0].fulfilled;
        
        // 2. Act: Run the interceptor
        const updatedConfig = await requestInterceptorHandler(mockConfig);

        // 3. Assert: Verify the Authorization header remains untouched/undefined
        expect(updatedConfig.headers.Authorization).toBeUndefined();
    });
});
