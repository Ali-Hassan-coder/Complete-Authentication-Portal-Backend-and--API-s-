import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Download } from 'lucide-react';

function Dashboard() {
    const { token, user: authUser } = useAuth();
    const navigate = useNavigate();

    const logActivity = (actionMsg) => {
        const logs = JSON.parse(localStorage.getItem('system_notifications') || '[]');
        logs.unshift({
            id: Date.now(),
            message: actionMsg,
            timestamp: new Date().toLocaleString()
        });
        localStorage.setItem('system_notifications', JSON.stringify(logs));
        window.dispatchEvent(new Event('new_system_notification'));
    };

    const [usersList, setUsersList] = useState([]);
    const [usersListLoading, setUsersListLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    const executeDeleteUser = async (userId, userName) => {
        setActionLoading(true);
        try {
            await axiosInstance.delete(`/auth/users/${userId}`);
            setUsersList(prev => prev.filter(u => u.id !== userId));
            logActivity(`Deleted user account: ${userName}`);
            setMessage('User deleted successfully.');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
            setTimeout(() => setError(''), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = (userId, userName) => {
        setModalConfig({
            title: 'Delete User',
            message: `Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`,
            onConfirm: () => executeDeleteUser(userId, userName)
        });
        setModalOpen(true);
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUsers = async () => {
            if (!authUser) return;
            const canListUsers = authUser?.permissions?.includes('list_users') || authUser?.role === 'admin';
            
            if (canListUsers) {
                if (usersList.length === 0) {
                    setUsersListLoading(true);
                }
                try {
                    const usersRes = await axiosInstance.get('/auth/users');
                    setUsersList(usersRes.data.data);
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to load user list.');
                } finally {
                    setUsersListLoading(false);
                }
            }
        };

        fetchUsers();
    }, [token, authUser, navigate, usersList.length]);

    const handleExport = async () => {
        try {
            setError('');
            const response = await axiosInstance.get('/auth/export-users', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'users_report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to export reports: Access Denied');
        }
    };

    if (!authUser) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
            </div>
        );
    }

    const showUsersList = authUser?.permissions?.includes('list_users') || authUser?.role === 'admin';
    const canExport = authUser?.permissions?.includes('export_reports') || authUser?.role === 'admin';

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800 dark:text-slate-200">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-6xl w-full mx-auto px-6 py-10">
                    {/* Welcome banner */}
                    <div className="mb-10 p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Welcome back, {authUser?.name}!
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                                You are logged in with the role of <span className="font-bold text-accent-600 capitalize">{authUser?.role}</span>.
                            </p>
                        </div>
                        {canExport && (
                            <button
                                onClick={handleExport}
                                className="px-5 py-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export Users
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                            {error}
                        </div>
                    )}

                    {/* Conditional Users List Section */}
                    {showUsersList && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700/60">
                                <h3 className="text-lg font-bold text-slate-950">System Users</h3>
                                <p className="text-xs text-slate-400 mt-1">List of users currently working under your role</p>
                            </div>
                            {usersListLoading ? (
                                <div className="p-10 flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/ border-b border-slate-200 dark:border-slate-700/">
                                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {usersList.length > 0 ? (
                                                usersList.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50 dark:bg-slate-900/ transition-colors">
                                                        <td className="p-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700/">
                                                                    {u.name?.charAt(0)}
                                                                </div>
                                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</h4>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-sm text-slate-500 dark:text-slate-400">{u.email}</td>
                                                        <td className="p-5">
                                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                                u.role === 'admin' 
                                                                    ? 'bg-red-50 text-red-600' 
                                                                    : u.role === 'moderator' 
                                                                    ? 'bg-amber-50 text-amber-600' 
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => navigate(`/profile/${u.id}`)}
                                                                    className="px-3.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-semibold shadow-sm dark:shadow-none transition-all"
                                                                >
                                                                    Manage Profile
                                                                </button>
                                                                {authUser?.permissions?.includes('delete_user') && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                                                        disabled={actionLoading || u.id === authUser?.id}
                                                                        className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-semibold shadow-sm dark:shadow-none transition-all disabled:opacity-50"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                                                        No users found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {message && (
                                <div className="mt-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
            
            <ConfirmModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
            />
        </div>
    );
}

export default Dashboard;
