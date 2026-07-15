import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

function VerifyOtp() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setResetToken } = useAuth();
    const initialEmail = location.state?.email || '';

    const [email, setEmail] = useState(initialEmail);
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await axiosInstance.post('/auth/verify-otp', { email, otp });
            setMessage(response.data.message || 'OTP verified successfully.');
            setResetToken(response.data.resetToken);
            setTimeout(() => navigate('/reset-password'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please check your OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-violet-50 via-slate-50 to-blue-50 px-4 relative overflow-hidden">
            {/* Background decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-200/40 rounded-full filter blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full filter blur-3xl pointer-events-none"></div>

            <form className="flex flex-col w-full max-w-md p-8 sm:p-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.07)] border border-white/60 relative z-10" onSubmit={handleSubmit}>
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                        Verify OTP
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">Enter the verification code sent to your email</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-green-50 text-green-600 text-sm p-3.5 rounded-2xl border border-green-100 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        {message}
                    </div>
                )}

                <div className="flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-200"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">One-Time Password (OTP)</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.08)] transition-all duration-200 text-center tracking-widest font-bold"
                            type="text"
                            placeholder="••••••"
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button 
                    className="w-full py-3.5 mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.15)] hover:shadow-[0_12px_24px_rgba(99,102,241,0.25)] transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    type="submit" 
                    disabled={loading}
                >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <p className="text-sm text-center mt-8 text-slate-500">
                    <Link className="text-violet-600 hover:text-violet-500 font-semibold transition-colors" to="/forgot-password">Resend Code</Link>
                </p>
            </form>
        </div>
    );
}

export default VerifyOtp;
