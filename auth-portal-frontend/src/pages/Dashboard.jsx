import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch logged-in user profile
                const profileRes = await axiosInstance.get('/auth/me');
                const userData = profileRes.data.data;
                setUser(userData);

                // 2. Fetch users list only if role is admin or moderator
                if (userData.role === 'admin' || userData.role === 'moderator') {
                    const usersRes = await axiosInstance.get('/auth/users');
                    setUsersList(usersRes.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load dashboard data.');
                if (err.response?.status === 401) {
                    logout();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, navigate, logout]);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const showUsersList = user?.role === 'admin' || user?.role === 'moderator';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-sm transition-colors"
                        >
                            Sign Out
                        </button>
                        <div 
                            onClick={() => navigate('/profile')}
                            className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:ring-2 hover:ring-blue-500/20 transition-all"
                        >
                            {user?.profileFile ? (
                                <img src={user.profileFile} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-700 font-bold text-sm">{getInitials(user?.name)}</span>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {/* Welcome banner */}
                <div className="mb-10 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Welcome back, {user?.name}!
                    </h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        You are logged in with the role of <span className="font-bold text-blue-600 capitalize">{user?.role}</span>.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                        {error}
                    </div>
                )}

                {/* Conditional Users List Section */}
                {showUsersList && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-950">System Users</h3>
                            <p className="text-xs text-slate-400 mt-1">List of users currently working under your role</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/70 border-b border-slate-200/60">
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                                        <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {usersList.length > 0 ? (
                                        usersList.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500 uppercase border border-slate-200/50">
                                                            {u.name?.charAt(0)}
                                                        </div>
                                                        <h4 className="font-semibold text-slate-800">{u.name}</h4>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-sm text-slate-500">{u.email}</td>
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
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => navigate(`/profile/${u.id}`)}
                                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                                                    >
                                                        Manage Profile
                                                    </button>
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
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;
