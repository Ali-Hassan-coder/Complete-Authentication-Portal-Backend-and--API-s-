import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Plus, Edit2, Trash2, Users, Check, AlertCircle } from 'lucide-react';

function Welcome() {
    const { token, user, logout, fetchUser } = useAuth();
    const navigate = useNavigate();

    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states for Add User
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Form states for Edit User
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            setError('');
            const response = await axiosInstance.get('/auth/users');
            setUsersList(response.data.data);
        } catch (err) {
            // If the user doesn't have permission to list users, don't show user list
            if (err.response?.status === 403) {
                setUsersList([]);
            } else if (err.response?.status === 401) {
                logout();
                navigate('/login');
            } else {
                setError('Failed to retrieve users list.');
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
        fetchUsers();
    }, [token, fetchUsers, navigate]);



    const isAdmin = user?.role === 'admin';
    const isModerator = user?.role === 'moderator';

    // Filter users list based on role
    const getVisibleUsers = () => {
        if (isAdmin) return usersList;
        if (isModerator) return usersList.filter(u => u.role === 'user');
        return usersList.filter(u => u.role === 'user');
    };

    // Actions: Add User
    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setActionLoading(true);

        try {
            const signupPayload = {
                name: newName,
                email: newEmail,
                password: newPassword,
                phone: newPhone
            };
            await axiosInstance.post('/auth/signup', signupPayload);
            setSuccessMessage(`User "${newName}" added successfully.`);
            setShowAddModal(false);
            // Reset fields
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            setNewPhone('');
            // Refresh
            await fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add new user.');
        } finally {
            setActionLoading(false);
        }
    };

    // Actions: Edit User
    const openEditModal = (targetUser) => {
        setSelectedUser(targetUser);
        setEditName(targetUser.name || '');
        setEditPhone(targetUser.phone || '');
        setShowEditModal(true);
    };

    const handleEditUserSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setActionLoading(true);

        try {
            await axiosInstance.put(`/auth/users/${selectedUser.id}`, {
                name: editName,
                phone: editPhone
            });
            setSuccessMessage('User details updated successfully.');
            setShowEditModal(false);
            await fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setActionLoading(false);
        }
    };

    // Actions: Delete User
    const executeDeleteUser = async (targetUserId, targetUserName) => {
        setError('');
        setSuccessMessage('');
        setActionLoading(true);

        try {
            await axiosInstance.delete(`/auth/users/${targetUserId}`);
            setSuccessMessage('User deleted successfully.');
            await fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = (targetUserId, targetUserName) => {
        setModalConfig({
            title: 'Delete User',
            message: `Are you sure you want to permanently delete user "${targetUserName}"?`,
            onConfirm: () => executeDeleteUser(targetUserId, targetUserName)
        });
        setModalOpen(true);
    };

    // Actions: Change Role
    const handleRoleChange = async (userId, newRole) => {
        setError('');
        setSuccessMessage('');
        try {
            const response = await axiosInstance.put(`/auth/users/${userId}/role`, { role: newRole });
            setSuccessMessage(response.data.message || 'User role updated successfully.');
            await fetchUsers();
            if (userId === user?.id) await fetchUser();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user role.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    const visibleUsers = getVisibleUsers();

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800 dark:text-slate-200">
            <Sidebar />
            
            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-6xl w-full mx-auto px-6 py-10">
                    {/* Welcome Header Section */}
                    <div className="mb-10 p-8 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl dark:shadow-none relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-white dark:bg-slate-800/10 rounded-full filter blur-2xl transform rotate-45 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
                                <p className="text-white/80 mt-1.5 text-sm font-medium">Manage systems, verify credentials, and edit role privileges.</p>
                            </div>
                            <span className="px-4 py-1.5 bg-white dark:bg-slate-800/20 backdrop-blur-md text-white font-bold text-xs rounded-full uppercase tracking-wider border border-white/10">
                                Role: {user?.role}
                            </span>
                        </div>
                    </div>

                    {/* Notification Alerts */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-50 text-green-600 text-sm p-4 rounded-2xl border border-green-100 mb-6 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {successMessage}
                        </div>
                    )}

                    {/* Controls & Metrics */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-600" />
                                Users List
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">Showing users currently working under your role</p>
                        </div>
                        {isModerator && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md dark:shadow-none hover:shadow-lg"
                            >
                                <Plus className="w-4 h-4" />
                                Add User
                            </button>
                        )}
                    </div>

                    {/* Users list table */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/ shadow-sm dark:shadow-none overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/ border-b border-slate-200 dark:border-slate-700/">
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">User details</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">System role</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Permissions</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleUsers.length > 0 ? (
                                        visibleUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 dark:bg-slate-900/ transition-colors">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700/">
                                                            {u.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</h4>
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
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-wrap gap-1 max-w-sm">
                                                        {u.permissions && u.permissions.length > 0 ? (
                                                            u.permissions.map(perm => (
                                                                <span key={perm} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 rounded-md text-[9px] font-semibold">
                                                                    {perm}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No permissions</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        {/* Role assignment dropdown */}
                                                        {((isAdmin && u.role !== 'admin') || (isModerator && u.role === 'user')) && u.id !== user?.id && (
                                                            <select
                                                                value={u.role}
                                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-semibold"
                                                            >
                                                                <option value="user">User</option>
                                                                <option value="moderator">Moderator</option>
                                                                {isAdmin && <option value="admin">Admin</option>}
                                                            </select>
                                                        )}

                                                        {/* Edit Action (Admin or Moderator) */}
                                                        {(isAdmin || isModerator) && (
                                                            <button
                                                                onClick={() => openEditModal(u)}
                                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                                                                title="Edit Profile"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* Delete Action (Admin only) */}
                                                        {isAdmin && u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id, u.name)}
                                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Delete User"
                                                                disabled={actionLoading}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {u.id === user?.id && (
                                                            <span className="text-xs text-slate-400 italic font-medium pr-3">Self</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                                                No users list available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-100 dark:border-slate-700/60 shadow-2xl relative">
                        <h3 className="text-xl font-bold mb-5">Add New User</h3>
                        <form onSubmit={handleAddUserSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={newPhone}
                                    onChange={(e) => setNewPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md dark:shadow-none disabled:opacity-50"
                                >
                                    {actionLoading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-100 dark:border-slate-700/60 shadow-2xl relative">
                        <h3 className="text-xl font-bold mb-5">Edit User Details</h3>
                        <form onSubmit={handleEditUserSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md dark:shadow-none disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
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

export default Welcome;
