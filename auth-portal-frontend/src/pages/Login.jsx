import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axiosInstance.post('/auth/login', formData);
            const { token, refreshToken } = response.data;
            login(token, refreshToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-accent-50 px-4 relative overflow-hidden">
            {/* Background decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-200/40 rounded-full filter blur-3xl pointer-events-none"></div>

            <form className="flex flex-col w-full max-w-md p-8 sm:p-10 bg-white dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.07)] border border-white/60 relative z-10" onSubmit={handleSubmit}>
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                        Welcome Back
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Login to manage your account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/ hover:bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/ rounded-2xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-200"
                            type="email"
                            name="email"
                            placeholder="name@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                            <Link className="text-xs font-semibold text-violet-600 hover:text-violet-500 transition-colors" to="/forgot-password">Forgot?</Link>
                        </div>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/ hover:bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/ rounded-2xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-200"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <button
                    className="w-full py-3.5 mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.15)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.25)] transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : 'Sign In'}
                </button>

                <p className="text-sm text-center mt-8 text-slate-500 dark:text-slate-400">
                    Don't have an account? <Link className="text-violet-600 hover:text-violet-500 font-semibold transition-colors" to="/signup">Sign Up</Link>
                </p>
            </form>
        </div>
    );
}

export default Login;