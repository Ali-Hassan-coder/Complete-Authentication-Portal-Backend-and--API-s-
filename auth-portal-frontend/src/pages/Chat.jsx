import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { MessageSquare, Send, Bot, Mic, MicOff, Search } from 'lucide-react';

function Chat() {
    const { token, user: currentUser, socket } = useAuth();
    const navigate = useNavigate();

    // Navigation lists
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChat, setSelectedChat] = useState({ type: 'ai', id: 'ai', name: 'Acme AI Assistant' });

    // Messaging states
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [recording, setRecording] = useState(false);
    const [toastNotification, setToastNotification] = useState(null);
    const [unreadUsers, setUnreadUsers] = useState(() => JSON.parse(localStorage.getItem('unread_users') || '[]'));
    const [escalationAlerts, setEscalationAlerts] = useState([]);

    // Refs
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // 1. Fetch other system users on mount
    const fetchUsers = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/auth/chat-users');
            const otherUsers = res.data.data.filter(u => u.id !== currentUser?.id);
            setUsers(otherUsers);
        } catch (err) {
            console.error("Failed to load chat users:", err);
        }
    }, [currentUser]);

    const handleSelectChat = (chatObj) => {
        setSelectedChat(chatObj);
        if (chatObj.type === 'user') {
            setUnreadUsers(prev => {
                const next = prev.filter(id => id !== chatObj.id);
                localStorage.setItem('unread_users', JSON.stringify(next));
                return next;
            });
        }
    };

    const handleJoinLiveSupport = (alert) => {
        setEscalationAlerts(prev => prev.filter(a => a.userId !== alert.userId));
        handleSelectChat({ type: 'user', id: alert.userId, name: alert.userName, role: 'user' });
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUsers();
    }, [token, navigate, fetchUsers]);

    // Listen to real-time message events via Socket.io
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg) => {
            // If the message is from the active DM conversation partner, append it immediately
            if (selectedChat.type === 'user' && msg.sender_id === selectedChat.id) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: msg.content,
                    timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            } else {
                // Mark as unread conversation
                setUnreadUsers(prev => {
                    if (prev.includes(msg.sender_id)) return prev;
                    const next = [...prev, msg.sender_id];
                    localStorage.setItem('unread_users', JSON.stringify(next));
                    return next;
                });

                // Trigger a temporary toast banner
                const senderUser = users.find(u => u.id === msg.sender_id);
                const senderName = senderUser ? senderUser.name : 'A colleague';
                setToastNotification(`New message from ${senderName}: "${msg.content.slice(0, 40)}..."`);
                setTimeout(() => setToastNotification(null), 6000);
            }

            // Instantly re-sort users list in the sidebar (bubbles the sender to the top)
            fetchUsers();
        };

        socket.on('new_message', handleNewMessage);
        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, selectedChat, users, fetchUsers]);

    // Listen to real-time escalation alerts (Admin & Moderator only)
    useEffect(() => {
        if (!socket) return;
        if (currentUser?.role !== 'admin' && currentUser?.role !== 'moderator') return;

        const handleEscalation = (alertData) => {
            setEscalationAlerts(prev => {
                const isDuplicate = prev.some(a => a.userId === alertData.userId);
                if (isDuplicate) return prev;
                return [alertData, ...prev];
            });
        };

        socket.on('escalation_alert', handleEscalation);
        return () => {
            socket.off('escalation_alert', handleEscalation);
        };
    }, [socket, currentUser]);

    // 2. Load conversation history
    useEffect(() => {
        if (selectedChat.type === 'ai') {
            setMessages([
                {
                    role: 'assistant',
                    content: `Hello ${currentUser?.name || 'there'}! I am your Acme Corp RBAC Portal AI Assistant. Ask me anything about your role (${currentUser?.role}), permissions, or how to navigate the portal.`
                }
            ]);
            return;
        }

        const fetchUserMessages = async () => {
            try {
                const res = await axiosInstance.get(`/auth/messages/${selectedChat.id}`);
                const formatted = res.data.data.map(m => ({
                    role: m.sender_id === currentUser.id ? 'user' : 'assistant',
                    content: m.content,
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages(formatted);
            } catch (err) {
                console.error("Failed to load direct messages:", err);
            }
        };

        fetchUserMessages();

        // Start message polling every 3 seconds for direct messages (fallback for offline socket states)
        const interval = setInterval(fetchUserMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedChat, currentUser]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 3. Send Message Handler
    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || loading) return;

        const typedContent = inputValue.trim();
        setInputValue('');

        if (selectedChat.type === 'ai') {
            const userMessage = { role: 'user', content: typedContent };
            setMessages(prev => [...prev, userMessage]);
            setLoading(true);

            try {
                const chatHistory = [...messages, userMessage].map(m => ({
                    role: m.role,
                    content: m.content
                }));
                const res = await axiosInstance.post('/auth/chat', { messages: chatHistory });
                if (res.data?.success) {
                    setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);

                    if (res.data.escalated) {
                        setLoading(true);
                        setTimeout(() => {
                            const agent = users.find(u => u.role === 'admin' || u.role === 'moderator');
                            if (agent) {
                                handleSelectChat({ type: 'user', id: agent.id, name: agent.name, role: agent.role });
                            } else {
                                setMessages(prev => [...prev, { role: 'assistant', content: "No live agent is currently online. Please check back later." }]);
                            }
                            setLoading(false);
                        }, 3500);
                    }
                }
            } catch (err) {
                setMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to assistant service." }]);
            } finally {
                setLoading(false);
            }
        } else {
            // Direct Message User
            try {
                const res = await axiosInstance.post('/auth/messages', {
                    receiverId: selectedChat.id,
                    content: typedContent
                });
                if (res.data?.success) {
                    const m = res.data.data;
                    setMessages(prev => [...prev, {
                        role: 'user',
                        content: m.content,
                        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                }
            } catch (err) {
                console.error("Failed to send direct message:", err);
            }
        }
    };

    // 4. ElevenLabs Voice Transcription
    const startRecording = async () => {
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                setTranscribing(true);
                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice_input.webm');

                    const response = await axiosInstance.post('/auth/transcribe', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data?.success && response.data.text) {
                        setInputValue(prev => {
                            const trimmed = prev.trim();
                            return trimmed ? `${trimmed} ${response.data.text}` : response.data.text;
                        });
                    }
                } catch (err) {
                    console.error("Transcription failed:", err);
                } finally {
                    setTranscribing(false);
                }
            };

            recorder.start();
            setRecording(true);
        } catch (err) {
            alert('Failed to access microphone. Please grant permission.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden pl-16 md:pl-0">
                <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col h-screen max-h-screen overflow-hidden">
                    <div className="mb-6 flex-shrink-0">
                        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900">
                            <MessageSquare className="w-8 h-8 text-blue-600" />
                            Acme Chatflow
                        </h2>
                        <p className="text-slate-500 mt-1 text-sm">Select between AI Assistant or Direct Messages to chat with colleagues.</p>
                    </div>

                    {toastNotification && (
                        <div className="mb-4 p-4 bg-violet-600 text-white rounded-2xl flex items-center justify-between text-xs shadow-lg animate-bounce duration-500">
                            <span className="font-semibold">{toastNotification}</span>
                            <button onClick={() => setToastNotification(null)} className="font-bold hover:text-violet-200 ml-4 transition-colors">Dismiss</button>
                        </div>
                    )}

                    {escalationAlerts.map(alert => (
                        <div key={alert.userId} className="mb-4 p-4 bg-red-500 text-white rounded-2xl flex items-center justify-between text-xs shadow-lg animate-pulse">
                            <span className="font-semibold">Live Alert: User {alert.userName} needs human support!</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleJoinLiveSupport(alert)} 
                                    className="px-3 py-1.5 bg-white text-red-600 font-bold rounded-lg hover:bg-slate-100 transition-all"
                                >
                                    Join Chat
                                </button>
                                <button 
                                    onClick={() => setEscalationAlerts(prev => prev.filter(a => a.userId !== alert.userId))}
                                    className="px-2 py-1.5 hover:bg-white/10 rounded-lg transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="flex-1 bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden flex min-h-0 mb-6">
                        {/* Conversation Side panel */}
                        <div className="w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50 flex-shrink-0">
                            {/* Search bar */}
                            <div className="p-4 border-b border-slate-200 bg-white">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                                    />
                                </div>
                            </div>

                            {/* Options Scroll */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">AI Assistants</span>
                                
                                <button
                                    onClick={() => setSelectedChat({ type: 'ai', id: 'ai', name: 'Acme AI Assistant' })}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all ${
                                        selectedChat.type === 'ai' 
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                            : 'hover:bg-slate-100/80 text-slate-700'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedChat.type === 'ai' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs">Acme AI Assistant</h4>
                                        <p className={`text-[10px] ${selectedChat.type === 'ai' ? 'text-blue-100' : 'text-slate-400'}`}>Online</p>
                                    </div>
                                </button>

                                <div className="pt-4 pb-2">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Direct Messages</span>
                                </div>

                                {filteredUsers.map(u => {
                                    const isSelected = selectedChat.id === u.id;
                                    const isUnread = unreadUsers.includes(u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => handleSelectChat({ type: 'user', id: u.id, name: u.name, role: u.role })}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all relative ${
                                                isSelected 
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                                                    : 'hover:bg-slate-100/80 text-slate-700'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${isSelected ? 'bg-white/20' : (isUnread ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}`}>
                                                {u.name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs truncate ${isSelected ? 'text-white font-bold' : (isUnread ? 'text-slate-900 font-extrabold' : 'text-slate-700 font-semibold')}`}>
                                                    {u.name}
                                                </h4>
                                                <p className={`text-[10px] capitalize ${isSelected ? 'text-blue-100' : (isUnread ? 'text-green-600 font-bold' : 'text-slate-400')}`}>{u.role}</p>
                                            </div>
                                            {isUnread && !isSelected && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active Chat dialog */}
                        <div className="flex-1 flex flex-col bg-white">
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold uppercase">
                                        {selectedChat.type === 'ai' ? <Bot className="w-5 h-5" /> : selectedChat.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-800">{selectedChat.name}</h3>
                                        <p className="text-[10px] text-slate-400 capitalize">
                                            {selectedChat.type === 'ai' ? 'Acme Corp AI System Help desk' : selectedChat.role}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Message Feed */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/20">
                                {messages.map((m, index) => {
                                    const isSelf = m.role === 'user';
                                    return (
                                        <div key={index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[70%] flex flex-col gap-1">
                                                <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                                                    isSelf
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                                }`}>
                                                    {m.content}
                                                </div>
                                                {m.timestamp && (
                                                    <span className={`text-[9px] text-slate-400 px-2 ${isSelf ? 'text-right' : 'text-left'}`}>
                                                        {m.timestamp}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-4 border border-slate-100 rounded-3xl rounded-tl-none flex gap-1 items-center shadow-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <form onSubmit={handleSend} className="p-4 border-t border-slate-200/80 bg-white flex gap-3">
                                <button
                                    type="button"
                                    onClick={recording ? stopRecording : startRecording}
                                    disabled={loading || transcribing}
                                    className={`p-3 rounded-2xl transition-all ${
                                        recording 
                                            ? 'bg-red-500 text-white animate-pulse' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                    }`}
                                    title={recording ? "Stop Recording" : "Record Voice"}
                                >
                                    {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={transcribing ? "Transcribing voice..." : "Type your message..."}
                                    disabled={loading || transcribing}
                                    className="flex-1 px-5 py-3 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || transcribing || !inputValue.trim()}
                                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Chat;
