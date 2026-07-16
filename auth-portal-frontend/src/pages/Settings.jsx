import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { Settings as SettingsIcon, Moon, Sun, BellRing, Trash2, CheckCircle2 } from 'lucide-react';

function Settings() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(
        localStorage.getItem('theme') === 'dark'
    );
    const [emailAlerts, setEmailAlerts] = useState(
        localStorage.getItem('email_alerts') !== 'false'
    );
    const [accentColor, setAccentColor] = useState(
        localStorage.getItem('accent_color') || 'blue'
    );
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
    }, [token, navigate]);

    const handleThemeToggle = () => {
        const nextDark = !darkMode;
        setDarkMode(nextDark);
        localStorage.setItem('theme', nextDark ? 'dark' : 'light');
        if (nextDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        showSuccessMessage('Theme setting updated.');
    };

    const handleAlertsToggle = () => {
        const nextAlerts = !emailAlerts;
        setEmailAlerts(nextAlerts);
        localStorage.setItem('email_alerts', nextAlerts ? 'true' : 'false');
        showSuccessMessage('Email alerts preference updated.');
    };

    const handleAccentChange = (color) => {
        setAccentColor(color);
        localStorage.setItem('accent_color', color);
        showSuccessMessage(`Accent theme changed to ${color}.`);
    };

    const handleClearLogs = () => {
        if (!window.confirm('Are you sure you want to clear the audit activity log?')) return;
        localStorage.removeItem('system_notifications');
        showSuccessMessage('Audit trail log cleared.');
    };

    const showSuccessMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-3xl w-full mx-auto px-6 py-10">
                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white">
                            <SettingsIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            System Settings
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure layout, interface preferences, and system storage parameters.</p>
                    </div>

                    {message && (
                        <div className="bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 text-sm p-4 rounded-2xl border border-green-100 dark:border-green-900/30 mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {message}
                        </div>
                    )}

                    <div className="flex flex-col gap-6">
                        {/* Appearance Preferences */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700/60">Appearance</h3>
                            
                            {/* Dark Mode toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Interface Mode</h4>
                                    <p className="text-xs text-slate-400 mt-1">Toggle between light and dark visual themes.</p>
                                </div>
                                <button 
                                    onClick={handleThemeToggle}
                                    className="p-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
                                >
                                    {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </button>
                            </div>

                            {/* Color Accent Picker */}
                            <div className="flex flex-col gap-3">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Accent Highlights</h4>
                                    <p className="text-xs text-slate-400 mt-1">Choose the primary indicator color theme.</p>
                                </div>
                                <div className="flex gap-3 mt-1">
                                    {['blue', 'violet', 'emerald', 'amber'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => handleAccentChange(color)}
                                            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                                                accentColor === color 
                                                    ? 'bg-blue-600 text-white border-blue-600' 
                                                    : 'bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                            }`}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Notifications config */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700/60">Preferences</h3>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Alert Email Dispatches</h4>
                                    <p className="text-xs text-slate-400 mt-1">Receive system email dispatches for profile adjustments.</p>
                                </div>
                                <button 
                                    onClick={handleAlertsToggle}
                                    className={`p-3 border rounded-2xl transition-all ${
                                        emailAlerts 
                                            ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30' 
                                            : 'bg-slate-50 dark:bg-slate-700/40 text-slate-400 border-slate-200 dark:border-slate-600'
                                    }`}
                                >
                                    <BellRing className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Storage / Actions */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700/60">System Maintenance</h3>
                            
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Clear Logs Trail</h4>
                                    <p className="text-xs text-slate-400 mt-1">Empty all activity and audit trails stored locally.</p>
                                </div>
                                <button 
                                    onClick={handleClearLogs}
                                    className="px-4 py-2.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900/30"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Purge Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Settings;
