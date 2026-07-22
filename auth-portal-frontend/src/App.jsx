import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VeirfyOtp';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import PermissionsCrud from './pages/PermissionsCrud';
import Documents from './pages/Documents';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AuthRoute({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/dashboard" replace />;
}

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/signup" element={<AuthRoute><Signup /></AuthRoute>} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
        <Route path="/verify-otp" element={<AuthRoute><VerifyOtp /></AuthRoute>} />
        <Route path="/reset-password" element={<AuthRoute><ResetPassword /></AuthRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><PermissionsCrud /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

function App() {
  useEffect(() => {
    // Apply theme on load
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply accent color on load
    const accent = localStorage.getItem('accent_color');
    if (accent) {
      document.documentElement.setAttribute('data-accent', accent);
    }
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;