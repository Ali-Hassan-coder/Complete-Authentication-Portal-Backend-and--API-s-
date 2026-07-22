import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { io } from 'socket.io-client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(sessionStorage.getItem('token') || null);
    const [refreshToken, setRefreshTokenState] = useState(sessionStorage.getItem('refreshToken') || null);
    const [resetToken, setResetToken] = useState(null); // temporary, in-memory only
    const [user, setUser] = useState(null);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (token && user?.id) {
            const socketInstance = io(axiosInstance.defaults.baseURL || 'http://localhost:3000', {
                transports: ['websocket']
            });
            setSocket(socketInstance);

            socketInstance.on('connect', () => {
                socketInstance.emit('join', user.id);
            });

            socketInstance.on('system_notification', (data) => {
                const logs = JSON.parse(localStorage.getItem('system_notifications') || '[]');
                const isDuplicate = logs.some(l => l.id === data.id || (l.message === data.message && l.timestamp === data.timestamp));
                if (!isDuplicate) {
                    const newLogs = [data, ...logs];
                    localStorage.setItem('system_notifications', JSON.stringify(newLogs));
                    window.dispatchEvent(new CustomEvent('new_system_notification', { detail: data }));
                }
            });

            return () => {
                socketInstance.disconnect();
            };
        } else {
            setSocket(null);
        }
    }, [token, user?.id]);

    useEffect(() => {
        if (token) {
            sessionStorage.setItem('token', token);
        } else {
            sessionStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (refreshToken) {
            sessionStorage.setItem('refreshToken', refreshToken);
        } else {
            sessionStorage.removeItem('refreshToken');
        }
    }, [refreshToken]);

    const login = (newToken, newRefreshToken) => {
        setToken(newToken);
        if (newRefreshToken) {
            setRefreshTokenState(newRefreshToken);
        }
    };

    const logout = useCallback(async () => {
        try {
            if (token) {
                await axiosInstance.put('/auth/status', { status: 'offline' });
            }
        } catch (err) {
            console.error('Failed to set offline status on logout');
        }
        setToken(null);
        setRefreshTokenState(null);
        setUser(null);
    }, [token]);

    const refreshAccessToken = useCallback(async () => {
        const storedRefreshToken = sessionStorage.getItem('refreshToken') || refreshToken;
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
        if (sessionStorage.getItem('refreshToken')) {
            refreshAccessToken();
        }
    }, [refreshAccessToken]);

    return (
        <AuthContext.Provider value={{ token, login, logout, resetToken, setResetToken, refreshAccessToken, user, fetchUser, socket }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}