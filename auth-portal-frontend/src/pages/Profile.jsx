import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Camera } from 'lucide-react';

function Profile() {
    const { token, logout, user, fetchUser } = useAuth();
    const navigate = useNavigate();
    const { userId } = useParams();

    const [userSelf, setUserSelf] = useState(null); // The logged-in user
    const [targetUser, setTargetUser] = useState(null); // The user being viewed
    const [imgError, setImgError] = useState(false);
    const [rolesList, setRolesList] = useState([]);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('user');
    
    // Roles and Permissions lists
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);

    // Change password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    const [pwdError, setPwdError] = useState('');
    const [changingPwd, setChangingPwd] = useState(false);
    


    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    const fetchProfileData = useCallback(async () => {
        try {
            setError('');
            // 1. Fetch own profile to know active role/permissions
            const selfRes = await axiosInstance.get('/auth/me');
            const selfData = selfRes.data.data;
            setUserSelf(selfData);

            // Fetch system roles for the dropdown
            try {
                const rolesRes = await axiosInstance.get('/admin/roles');
                setRolesList(rolesRes.data.data);
            } catch (err) {
                console.error('Failed to load system roles for dropdown', err);
            }

            // 2. Determine target user to load
            if (userId) {
                // Check if self is authorized to view others
                const canViewAny = selfData.permissions?.includes('view_any_profile') || selfData.role === 'admin';
                if (canViewAny) {
                    const targetRes = await axiosInstance.get(`/auth/users/${userId}`);
                    const targetData = targetRes.data.data;
                    setTargetUser(targetData);
                    setName(targetData.name || '');
                    setPhone(targetData.phone || '');
                    setRole(targetData.role || 'user');

                    // If Admin/Mod, fetch system roles and permissions
                    try {
                        const rolesRes = await axiosInstance.get('/admin/roles');
                        setRoles(rolesRes.data.data);
                    } catch (err) {
                        console.error('Failed to load system roles', err);
                    }

                    try {
                        const permsRes = await axiosInstance.get('/admin/permissions');
                        setAllPermissions(permsRes.data.data);
                    } catch (err) {
                        console.error('Failed to load system permissions', err);
                    }
                } else {
                    setError('Access Denied: You do not have permission to view other user profiles.');
                    setTargetUser(selfData);
                    setName(selfData.name || '');
                    setPhone(selfData.phone || '');
                    setRole(selfData.role || 'user');
                }
            } else {
                // Load self
                setTargetUser(selfData);
                setName(selfData.name || '');
                setPhone(selfData.phone || '');
                setRole(selfData.role || 'user');
            }
        } catch (err) {
            setError('Failed to fetch profile details.');
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [userId, navigate, logout]);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchProfileData();
    }, [token, fetchProfileData, navigate]);

    useEffect(() => {
        setImgError(false);
    }, [targetUser?.profileFile]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setUpdating(true);

        const isViewingSelf = !userId || parseInt(userId) === userSelf?.id;
        const endpoint = isViewingSelf ? '/auth/me' : `/auth/users/${userId}`;

        try {
            const response = await axiosInstance.put(endpoint, { name, phone });
            setMessage(response.data.message || 'Profile updated successfully.');
            logActivity(`Updated profile details for user "${name}"`);
            if (isViewingSelf) {
                setUserSelf(response.data.user || { ...userSelf, name, phone });
            }
            setTargetUser(prev => ({ ...prev, name, phone }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setUpdating(false);
        }
    };

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setError('');
        setMessage('');
        setUpdating(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axiosInstance.post('/auth/upload?purpose=profile', formData);
            setMessage('Profile picture updated successfully!');
            logActivity(`Updated profile picture`);
            
            // The backend returns the new file url in res.data.file.url
            // Update local state
            const newUrl = res.data.file.url;
            setUserSelf(prev => ({ ...prev, profileFile: newUrl }));
            setTargetUser(prev => ({ ...prev, profileFile: newUrl }));
            
            // Also update the global auth context user so sidebar updates
            fetchUser();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload profile picture.');
        } finally {
            setUpdating(false);
            // Reset input
            e.target.value = '';
        }
    };

    const logActivity = (actionMsg) => {
        const logs = JSON.parse(localStorage.getItem('system_notifications') || '[]');
        logs.unshift({
            id: Date.now(),
            message: actionMsg,
            timestamp: new Date().toLocaleString()
        });
        localStorage.setItem('system_notifications', JSON.stringify(logs));
    };

    const handleRoleChange = async (newRole) => {
        setError('');
        setMessage('');
        setUpdating(true);
        try {
            const res = await axiosInstance.put(`/auth/users/${userId}/role`, { role: newRole });
            setMessage(res.data.message || 'Role updated successfully.');
            setRole(newRole);
            logActivity(`Changed role of user "${targetUser?.name}" to "${newRole}"`);
            // Refresh permissions mapping
            await fetchProfileData();
            if (Number(userId) === user?.id || !userId) {
                await fetchUser();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user role.');
        } finally {
            setUpdating(false);
        }
    };

    const handlePermissionToggle = async (permission, isCurrentlyAssigned) => {
        setError('');
        setMessage('');

        const resolvedRole = roles.find(r => r.name === targetUser?.role);
        const roleId = resolvedRole ? resolvedRole.id : null;

        if (!roleId) {
            setError('Failed to resolve target user role ID.');
            return;
        }

        // Optimistic UI Update
        const originalPermissions = targetUser?.permissions || [];
        const nextPermissions = isCurrentlyAssigned
            ? originalPermissions.filter(pName => pName !== permission.name)
            : [...originalPermissions, permission.name];

        setTargetUser(prev => ({
            ...prev,
            permissions: nextPermissions
        }));

        try {
            if (isCurrentlyAssigned) {
                // Revoke
                await axiosInstance.delete('/admin/users/roles/permissions', {
                    data: {
                        userId: Number(userId),
                        roleId,
                        permissionIds: [permission.id]
                    }
                });
                setMessage(`Permission "${permission.name}" revoked successfully.`);
                logActivity(`Revoked permission override "${permission.name}" from user "${targetUser?.name}"`);
                if (Number(userId) === user?.id || !userId) await fetchUser();
            } else {
                // Grant
                await axiosInstance.put('/admin/users/roles/permissions', {
                    userId: Number(userId),
                    roleId,
                    permissionIds: [permission.id]
                });
                setMessage(`Permission "${permission.name}" granted successfully.`);
                logActivity(`Granted permission override "${permission.name}" to user "${targetUser?.name}"`);
                if (Number(userId) === user?.id || !userId) await fetchUser();
            }
        } catch (err) {
            // Revert optimistic update
            setTargetUser(prev => ({
                ...prev,
                permissions: originalPermissions
            }));
            setError(err.response?.data?.message || 'Failed to update permission override.');
        }
    };



    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwdError('');
        setPwdSuccess('');

        if (newPassword !== confirmPassword) {
            setPwdError('New passwords do not match.');
            return;
        }

        setChangingPwd(true);
        try {
            await axiosInstance.put('/auth/change-password', { oldPassword, newPassword });
            setPwdSuccess('Password changed successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            logActivity(`Changed login password`);
        } catch (err) {
            setPwdError(err.response?.data?.message || 'Failed to change password.');
        } finally {
            setChangingPwd(false);
        }
    };

    const executeDelete = async () => {
        setError('');
        setMessage('');
        setUpdating(true);

        try {
            await axiosInstance.delete(`/auth/users/${userId}`);
            setMessage('User deleted successfully.');
            setTimeout(() => {
                setMessage('');
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = () => {
        setModalConfig({
            title: 'Delete User',
            message: `Are you sure you want to permanently delete user "${targetUser?.name}"?`,
            onConfirm: () => executeDelete()
        });
        setModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
            </div>
        );
    }

    const isViewingSelf = !userId || parseInt(userId) === userSelf?.id;
    const showDeleteButton = userSelf?.permissions?.includes('delete_user') && !isViewingSelf;
    const canManageRolesAndPerms = userSelf?.permissions?.includes('manage_roles') || userSelf?.role === 'admin';
    const isEditable = isViewingSelf || userSelf?.permissions?.includes('edit_any_profile') || userSelf?.role === 'admin';
    const displayPermissions = allPermissions.length > 0 
        ? allPermissions 
        : (targetUser?.permissions || []).map((name, index) => ({ id: index, name, description: 'Role-scoped assigned' }));
    const canEditRoles = canManageRolesAndPerms;
    const isEditablePermissions = userSelf?.permissions?.includes('manage_roles') || userSelf?.role === 'admin';

    return (
        <div className="min-h-screen transition-colors duration-300">
            {/* Navbar */}
            <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Profile Management
                    </h1>
                    <div className="flex gap-3">
                        <Link 
                            to="/dashboard"
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-10">
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

                <div className={isViewingSelf ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : "grid grid-cols-1 lg:grid-cols-3 gap-8"}>
                    {/* Left Column: Profile edit & details */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none flex flex-col items-center">
                            <div className="relative w-24 h-24 rounded-full bg-accent-100 border-4 border-white shadow-md dark:shadow-none mb-4 group">
                                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                    {targetUser?.profileFile && !imgError ? (
                                        <img 
                                            src={targetUser.profileFile} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover" 
                                            onError={() => setImgError(true)}
                                        />
                                    ) : (
                                        <span className="text-3xl text-accent-700 font-bold uppercase">{targetUser?.name?.charAt(0)}</span>
                                    )}
                                </div>
                                {isViewingSelf && (
                                    <>
                                        <label 
                                            htmlFor="profile-upload" 
                                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-200"
                                            title="Change Profile Picture"
                                        >
                                            <Camera className="w-6 h-6 text-white" />
                                        </label>
                                        <input 
                                            id="profile-upload" 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleProfilePicChange}
                                            disabled={updating}
                                        />
                                    </>
                                )}
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{targetUser?.name}</h3>
                            <p className="text-slate-400 text-sm">{targetUser?.email}</p>
                            <span className="mt-2 px-3 py-1 bg-accent-50 text-accent-600 font-bold text-xs rounded-full uppercase tracking-wider">
                                {targetUser?.role || 'User'}
                            </span>

                            <form onSubmit={handleUpdate} className="w-full flex flex-col gap-5 mt-8 border-t border-slate-100 dark:border-slate-700/60 pt-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address (Read Only)</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm text-slate-400 cursor-not-allowed focus:outline-none" 
                                        type="email" 
                                        value={targetUser?.email || ''} 
                                        disabled 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                                    <input 
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50" 
                                        type="text" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        required 
                                        disabled={!isEditable}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                                    <input 
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800/50" 
                                        type="text" 
                                        value={phone} 
                                        onChange={(e) => setPhone(e.target.value)} 
                                        required 
                                        disabled={!isEditable}
                                    />
                                </div>

                                {/* Role Changing Selector (Only for Admin, or Moderator promoting Users) */}
                                {!isViewingSelf && canManageRolesAndPerms && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">System Role</label>
                                        <select
                                            value={role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            disabled={updating || (userSelf?.role === 'moderator' && targetUser?.role !== 'user')}
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {rolesList.length > 0 ? (
                                                rolesList.map(r => (
                                                    <option key={r.id} value={r.name}>{r.name}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="user">user</option>
                                                    <option value="moderator">moderator</option>
                                                    {canManageRolesAndPerms && <option value="admin">admin</option>}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                )}

                                {isEditable && (
                                    <button 
                                        type="submit" 
                                        disabled={updating}
                                        className="w-full py-3.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                                    >
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </form>

                            {showDeleteButton && (
                                <div className="w-full mt-4 border-t border-slate-100 dark:border-slate-700/60 pt-4">
                                    <button 
                                        onClick={handleDelete}
                                        disabled={updating}
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                                    >
                                        Delete User
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Change Password Card - Moved next to Profile space */}
                    {isViewingSelf && (
                        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none flex flex-col justify-start">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-700/60">Change Password</h3>
                            {pwdError && (
                                <div className="bg-red-50 text-red-600 text-[11px] p-3.5 rounded-2xl border border-red-100 mb-4">
                                    {pwdError}
                                </div>
                            )}
                            {pwdSuccess && (
                                <div className="bg-green-50 text-green-600 text-[11px] p-3.5 rounded-2xl border border-green-100 mb-4">
                                    {pwdSuccess}
                                </div>
                            )}
                            <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                                    <input 
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                                    <input 
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                                    <input 
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={changingPwd}
                                    className="w-full py-3.5 mt-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-sm"
                                >
                                    {changingPwd ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Right Columns: Permissions assignment & Custom Permission creator */}
                    {!isViewingSelf && (
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* Checkbox Checklist */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Manage User Permissions</h3>
                                <p className="text-xs text-slate-400 mb-6">
                                    {isEditablePermissions 
                                        ? 'Assign or revoke permissions specifically for this user role' 
                                        : 'View the permissions currently active for this user'}
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {displayPermissions.map(perm => {
                                        const isAssigned = (targetUser?.permissions || []).includes(perm.name);
                                        return (
                                            <div 
                                                key={perm.id} 
                                                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                                                    isAssigned 
                                                        ? 'bg-accent-50/40 border-accent-100' 
                                                        : 'border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/50'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    id={`perm-${perm.id}`}
                                                    checked={isAssigned}
                                                    onChange={() => handlePermissionToggle(perm, isAssigned)}
                                                    disabled={updating || !isEditablePermissions}
                                                    className="mt-1 h-4 w-4 text-accent-600 focus:ring-accent-500 border-slate-300 rounded cursor-pointer disabled:cursor-not-allowed"
                                                />
                                                <label htmlFor={`perm-${perm.id}`} className="flex flex-col cursor-pointer disabled:cursor-not-allowed">
                                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{perm.name}</span>
                                                    {perm.description && (
                                                        <span className="text-[11px] text-slate-400 mt-0.5">{perm.description}</span>
                                                    )}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>


                        </div>
                    )}
                </div>
            </main>
            
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

export default Profile;
