import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';

function GeneralDashboard() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchUsersAndProfile = useCallback(async () => {
        try {
            // Fetch current user details to check permissions
            const profileRes = await axiosInstance.get('/auth/me');
            const self = profileRes.data.data;
            setCurrentUser(self);

            // Fetch all users
            const usersRes = await axiosInstance.get('/auth/users');
            setUsers(usersRes.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Access denied or failed to load dashboard.');
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [logout, navigate]);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUsersAndProfile();
    }, [token, navigate, fetchUsersAndProfile]);

    const handleRoleChange = async (userId, newRole) => {
        setError('');
        setMessage('');
        try {
            const response = await axiosInstance.put(`/auth/users/${userId}/role`, { role: newRole });
            setMessage(response.data.message || 'User role updated successfully.');
            // Refresh users to get updated permissions
            await fetchUsersAndProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user role.');
        }
    };

    const hasManageRoles = currentUser?.permissions?.includes('manage_roles') || currentUser?.role === 'admin';

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-6xl w-full mx-auto px-6 py-10">
                <div className="mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Access & Permissions</h2>
                    <p className="text-slate-500 mt-1">General dashboard showing system-wide user roles and permissions mapping.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-green-50 text-green-600 text-sm p-4 rounded-2xl border border-green-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        {message}
                    </div>
                )}

                {/* Users List Container */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200/60">
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">System Role</th>
                                    <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Active Permissions</th>
                                    {hasManageRoles && (
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500 uppercase border border-slate-200/50">
                                                    {u.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{u.name}</h4>
                                                    <p className="text-xs text-slate-400">{u.email}</p>
                                                    <p className="text-[10px] text-slate-400/80">{u.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                u.role === 'admin' 
                                                    ? 'bg-red-50 text-red-600' 
                                                    : u.role === 'moderator' 
                                                    ? 'bg-amber-50 text-amber-600' 
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-wrap gap-1 max-w-sm">
                                                {u.permissions && u.permissions.length > 0 ? (
                                                    u.permissions.map(perm => (
                                                        <span key={perm} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-[9px] font-semibold">
                                                            {perm}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400">No permissions</span>
                                                )}
                                            </div>
                                        </td>
                                        {hasManageRoles && (
                                            <td className="p-5 text-right">
                                                {currentUser?.id !== u.id ? (
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                        className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-semibold"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="moderator">Moderator</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic font-medium pr-3">Self</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            </div>
        </div>
    );
}

export default GeneralDashboard;
