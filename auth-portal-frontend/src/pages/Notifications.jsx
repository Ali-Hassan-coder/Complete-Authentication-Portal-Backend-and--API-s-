import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { Bell, Info, ShieldAlert, FileCode } from 'lucide-react';

function Notifications() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const logs = JSON.parse(localStorage.getItem('system_notifications') || '[]');
        
        // Seed default notification if empty to show functionality
        if (logs.length === 0) {
            const initialLogs = [
                {
                    id: 1,
                    message: "System initialized successfully with RBAC security policies.",
                    timestamp: new Date(Date.now() - 3600000).toLocaleString()
                },
                {
                    id: 2,
                    message: "Core role assignments (Admin, Moderator, User) seeded in database.",
                    timestamp: new Date(Date.now() - 7200000).toLocaleString()
                }
            ];
            localStorage.setItem('system_notifications', JSON.stringify(initialLogs));
            setNotifications(initialLogs);
        } else {
            setNotifications(logs);
        }
    }, [token, navigate]);

    useEffect(() => {
        const handleNewSystemNotification = (e) => {
            setNotifications(prev => {
                const isDuplicate = prev.some(n => n.id === e.detail.id || (n.message === e.detail.message && n.timestamp === e.detail.timestamp));
                if (isDuplicate) return prev;
                return [e.detail, ...prev];
            });
        };

        window.addEventListener('new_system_notification', handleNewSystemNotification);
        return () => {
            window.removeEventListener('new_system_notification', handleNewSystemNotification);
        };
    }, []);

    const getLogIcon = (message) => {
        if (message.includes('role') || message.includes('Role')) {
            return <ShieldAlert className="w-5 h-5 text-amber-500" />;
        }
        if (message.includes('permission') || message.includes('Permission')) {
            return <FileCode className="w-5 h-5 text-blue-500" />;
        }
        return <Info className="w-5 h-5 text-slate-500" />;
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-4xl w-full mx-auto px-6 py-10">
                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Bell className="w-8 h-8 text-blue-600 animate-pulse" />
                            Activity Notifications
                        </h2>
                        <p className="text-slate-500 mt-1">Audit trail logging system modifications, permission grants, and role updates.</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 flex flex-col gap-4">
                        {notifications.length > 0 ? (
                            notifications.map(log => (
                                <div 
                                    key={log.id} 
                                    className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50/40 transition-colors"
                                >
                                    <div className="p-3 bg-slate-50 border border-slate-200/30 rounded-xl">
                                        {getLogIcon(log.message)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800 leading-relaxed">{log.message}</p>
                                        <span className="text-[10px] text-slate-400 block mt-2">{log.timestamp}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-slate-400 text-sm italic">
                                No activity logs recorded yet.
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Notifications;
