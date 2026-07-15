import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [refreshToken, setRefreshTokenState] = useState(localStorage.getItem('refreshToken') || null);
    const [resetToken, setResetToken] = useState(null); // temporary, in-memory only
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        } else {
            localStorage.removeItem('refreshToken');
        }
    }, [refreshToken]);

    const login = (newToken, newRefreshToken) => {
        setToken(newToken);
        if (newRefreshToken) {
            setRefreshTokenState(newRefreshToken);
        }
    };

    const logout = useCallback(() => {
        setToken(null);
        setRefreshTokenState(null);
        setUser(null);
    }, []);

    const refreshAccessToken = useCallback(async () => {
        const storedRefreshToken = localStorage.getItem('refreshToken') || refreshToken;
        if (!storedRefreshToken) return null;
        try {
            const response = await axiosInstance.post('/auth/refresh', { refreshToken: storedRefreshToken });
            const { token: newAccessToken } = response.data;
            setToken(newAccessToken);
            return newAccessToken;
        } catch (err) {
            console.error('Session expired. Logging out.');
            logout();
            return null;
        }
    }, [refreshToken, logout]);

    // Fetch user details
    const fetchUser = useCallback(async () => {
        if (!token) {
            setUser(null);
            return;
        }
        try {
            const response = await axiosInstance.get('/auth/me');
            setUser(response.data.data);
        } catch (err) {
            console.error('Failed to fetch user in context', err);
            logout();
        }
    }, [token, logout]);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setUser(null);
        }
    }, [token, fetchUser]);

    // Set up automatic refresh loop
    useEffect(() => {
        if (refreshToken) {
            // Refresh every 10 minutes (access token expires in 15 minutes)
            const interval = setInterval(() => {
                refreshAccessToken();
            }, 10 * 60 * 1050);

            return () => clearInterval(interval);
        }
    }, [refreshToken, refreshAccessToken]);

    // Perform a refresh on initial load if we have a refresh token
    useEffect(() => {
        if (localStorage.getItem('refreshToken')) {
            refreshAccessToken();
        }
    }, [refreshAccessToken]);

    return (
        <AuthContext.Provider value={{ token, login, logout, resetToken, setResetToken, refreshAccessToken, user, fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}