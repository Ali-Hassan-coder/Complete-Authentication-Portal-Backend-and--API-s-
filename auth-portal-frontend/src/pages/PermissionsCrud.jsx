import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Plus, Trash2, Key, UserPlus, AlertCircle, Check } from 'lucide-react';

function PermissionsCrud() {
    const { token, logout, user, fetchUser } = useAuth();
    const navigate = useNavigate();

    const [permissions, setPermissions] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    
    // Create permission states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Create role states
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');

    // Assignment states
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedPermId, setSelectedPermId] = useState('');

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({});

    const fetchData = useCallback(async () => {
        try {
            setError('');
            // Fetch permissions list
            const permsRes = await axiosInstance.get('/admin/permissions');
            setPermissions(permsRes.data.data);

            // Fetch users to support direct assignment
            const usersRes = await axiosInstance.get('/auth/users');
            setUsers(usersRes.data.data);

            // Fetch roles to resolve user roles to role IDs
            const rolesRes = await axiosInstance.get('/admin/roles');
            setRoles(rolesRes.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Access Denied: Unable to load permissions CRUD.');
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
        if (user && user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchData();
    }, [token, user, navigate, fetchData]);

    const logActivity = (actionMsg) => {
        const logs = JSON.parse(localStorage.getItem('system_notifications') || '[]');
        logs.unshift({
            id: Date.now(),
            message: actionMsg,
            timestamp: new Date().toLocaleString()
        });
        localStorage.setItem('system_notifications', JSON.stringify(logs));
    };

    const handleCreatePermission = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setError('');
        setMessage('');
        setUpdating(true);

        try {
            await axiosInstance.post('/admin/permissions', {
                name: name.trim(),
                description: description.trim() || 'Custom created permission'
            });
            setMessage(`Permission "${name}" created successfully.`);
            logActivity(`Created new permission object "${name}"`);
            setName('');
            setDescription('');
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create permission.');
        } finally {
            setUpdating(false);
        }
    };

    const executeDeletePermission = async (permId, permName) => {
        setError('');
        setMessage('');
        setUpdating(true);

        try {
            await axiosInstance.delete(`/admin/permissions/${permId}`);
            setMessage(`Permission "${permName}" deleted successfully.`);
            logActivity(`Deleted permission object "${permName}"`);
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete permission.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeletePermission = (permId, permName) => {
        setModalConfig({
            title: 'Delete Permission',
            message: `Are you sure you want to delete permission "${permName}"?`,
            onConfirm: () => executeDeletePermission(permId, permName)
        });
        setModalOpen(true);
    };

    const executeDeleteRole = async (roleId, roleName) => {
        setError('');
        setMessage('');
        setUpdating(true);

        try {
            await axiosInstance.delete(`/admin/roles/${roleId}`);
            setMessage(`Role "${roleName}" deleted successfully.`);
            logActivity(`Deleted role object "${roleName}"`);
            await fetchData();
            await fetchUser();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete role.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteRole = (roleId, roleName) => {
        if (['admin', 'moderator', 'user'].includes(roleName.toLowerCase())) {
            setError('Core system roles cannot be deleted.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        setModalConfig({
            title: 'Delete Role',
            message: `Are you sure you want to delete role "${roleName}"?`,
            onConfirm: () => executeDeleteRole(roleId, roleName)
        });
        setModalOpen(true);
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!roleName.trim()) return;

        setError('');
        setMessage('');
        setUpdating(true);

        try {
            await axiosInstance.post('/admin/roles', {
                name: roleName.trim(),
                description: roleDescription.trim() || 'Custom created role'
            });
            setMessage(`Role "${roleName}" created successfully.`);
            logActivity(`Created new role object "${roleName}"`);
            setRoleName('');
            setRoleDescription('');
            await fetchData();
            await fetchUser();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create role.');
        } finally {
            setUpdating(false);
        }
    };

    const handleAssignPermission = async (e) => {
        e.preventDefault();
        if (!selectedUserId || !selectedPermId) return;

        setError('');
        setMessage('');
        setUpdating(true);

        const targetUser = users.find(u => u.id === Number(selectedUserId));
        const targetPerm = permissions.find(p => p.id === Number(selectedPermId));
        const resolvedRole = roles.find(r => r.name === targetUser?.role);
        const roleId = resolvedRole ? resolvedRole.id : null;

        if (!roleId) {
            setError('Failed to resolve target user role ID.');
            setUpdating(false);
            return;
        }

        try {
            await axiosInstance.put('/admin/users/roles/permissions', {
                userId: Number(selectedUserId),
                roleId,
                permissionIds: [Number(selectedPermId)]
            });
            setMessage(`Permission successfully assigned to ${targetUser.name}.`);
            logActivity(`Granted override permission "${targetPerm?.name}" to user "${targetUser?.name}"`);
            setSelectedUserId('');
            setSelectedPermId('');
            await fetchData();
            await fetchUser();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign permission override.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900/50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen transition-colors duration-300">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-6xl w-full mx-auto px-6 py-10">
                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage System Permissions</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Admin CRUD portal for managing permissions and assigning overrides to users.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-50 text-green-600 text-sm p-4 rounded-2xl border border-green-100 mb-6 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Side: Create & Assign forms */}
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            {/* Create Permission Form */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-accent-600" />
                                    New Permission
                                </h3>
                                <form onSubmit={handleCreatePermission} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Name</label>
                                        <input 
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. view_finance"
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
                                        <input 
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Allows viewing reports"
                                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={updating}
                                        className="w-full py-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Permission
                                    </button>
                                </form>
                            </div>

                            {/* Create Role Form */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-violet-600" />
                                    New Role
                                </h3>
                                <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Role Name</label>
                                        <input 
                                            type="text"
                                            value={roleName}
                                            onChange={(e) => setRoleName(e.target.value)}
                                            placeholder="e.g. auditor"
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description</label>
                                        <input 
                                            type="text"
                                            value={roleDescription}
                                            onChange={(e) => setRoleDescription(e.target.value)}
                                            placeholder="Auditor role with view access"
                                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={updating}
                                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Role
                                    </button>
                                </form>
                            </div>

                            {/* Assign to User Form */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-accent-600" />
                                    Link to User
                                </h3>
                                <form onSubmit={handleAssignPermission} className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select User</label>
                                        <select
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                        >
                                            <option value="">-- Choose User --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Select Permission</label>
                                        <select
                                            value={selectedPermId}
                                            onChange={(e) => setSelectedPermId(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all"
                                        >
                                            <option value="">-- Choose Permission --</option>
                                            {permissions.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={updating}
                                        className="w-full py-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-2xl shadow-md dark:shadow-none hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Assign Override
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right Side: Permissions list table */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none overflow-hidden h-fit">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700/60">
                                <h3 className="text-lg font-bold text-slate-950">Active Permissions</h3>
                                <p className="text-xs text-slate-400 mt-1">Full index of permission objects in the system</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {permissions.length > 0 ? (
                                            permissions.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                                    <td className="p-5 font-semibold text-slate-800 dark:text-slate-200 text-sm">{p.name}</td>
                                                    <td className="p-5 text-xs text-slate-500 dark:text-slate-400">{p.description}</td>
                                                    <td className="p-5 text-right">
                                                        {/* Prevent deleting core permissions seeded in database */}
                                                        {!['view_any_profile', 'edit_any_profile', 'list_users', 'delete_user', 'manage_roles'].includes(p.name) ? (
                                                            <button
                                                                onClick={() => handleDeletePermission(p.id, p.name)}
                                                                disabled={updating}
                                                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-all"
                                                                title="Delete Permission"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium italic pr-2">System Core</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="p-8 text-center text-slate-400 text-sm">
                                                    No permissions found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Active Roles Table */}
                        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none overflow-hidden h-fit mt-8">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700/60">
                                <h3 className="text-lg font-bold text-slate-950">Active Roles</h3>
                                <p className="text-xs text-slate-400 mt-1">Full index of role objects in the system</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60">
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                            <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {roles.length > 0 ? (
                                            roles.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                                    <td className="p-5 font-semibold text-slate-800 dark:text-slate-200 text-sm uppercase">{r.name}</td>
                                                    <td className="p-5 text-xs text-slate-500 dark:text-slate-400">{r.description || 'No description'}</td>
                                                    <td className="p-5 text-right">
                                                        {/* Prevent deleting core roles */}
                                                        {!['admin', 'moderator', 'user'].includes(r.name.toLowerCase()) ? (
                                                            <button
                                                                onClick={() => handleDeleteRole(r.id, r.name)}
                                                                disabled={updating}
                                                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl transition-all"
                                                                title="Delete Role"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 font-medium italic pr-2">System Core</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="p-8 text-center text-slate-400 text-sm">
                                                    No roles found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
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

export default PermissionsCrud;
