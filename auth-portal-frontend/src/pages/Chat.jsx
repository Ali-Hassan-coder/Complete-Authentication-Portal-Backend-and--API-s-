import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { MessageSquare, Send, Bot, Mic, MicOff, Search, Paperclip, X, FileText, Download, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

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
    const [escalationAlerts, setEscalationAlerts] = useState([]);
    const [myStatus, setMyStatus] = useState(currentUser?.status || 'online');
    const [attachmentFile, setAttachmentFile] = useState(null);
    
    const isTargetBusy = selectedChat.type === 'user' && users.find(u => u.id === selectedChat.id)?.status === 'busy';
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const fileInputRef = useRef(null);

    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [offlineQueue, setOfflineQueue] = useState(() => {
        const saved = localStorage.getItem('chat_offline_queue');
        return saved ? JSON.parse(saved) : [];
    });

    // Sync offlineQueue to localStorage
    useEffect(() => {
        // Strip rawFile out because File objects can't be JSON serialized. 
        // We accept that an offline page refresh will lose the unsent attachment, but keep the text.
        const serializableQueue = offlineQueue.map(item => ({ ...item, rawFile: null }));
        localStorage.setItem('chat_offline_queue', JSON.stringify(serializableQueue));
    }, [offlineQueue]);

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

    // Sync myStatus with currentUser when it loads
    useEffect(() => {
        if (currentUser && currentUser.status) {
            setMyStatus(currentUser.status);
        }
    }, [currentUser]);

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setToastNotification('Internet connected! Sending queued messages...');
            setTimeout(() => setToastNotification(null), 3000);
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Process offline queue when internet is restored
    useEffect(() => {
        if (!isOffline && offlineQueue.length > 0) {
            const processQueue = async () => {
                const queueToProcess = [...offlineQueue];
                setOfflineQueue([]);
                
                for (const item of queueToProcess) {
                    try {
                        let finalUrl = item.attachmentUrl;
                        let finalType = item.attachmentType;
                        
                        if (item.rawFile) {
                            const formData = new FormData();
                            formData.append('file', item.rawFile);
                            const uploadRes = await axiosInstance.post('/auth/upload?purpose=attachment', formData);
                            if (uploadRes.data?.success) {
                                finalUrl = uploadRes.data.file.url;
                                finalType = uploadRes.data.file.mimetype;
                            }
                        }
                        
                        const res = await axiosInstance.post('/auth/messages', {
                            receiverId: item.receiverId,
                            content: item.content,
                            attachmentUrl: finalUrl,
                            attachmentType: finalType
                        });
                        
                        if (res.data?.success) {
                            const m = res.data.data;
                            setMessages(prev => prev.map(msg => 
                                msg.tempId === item.tempId 
                                    ? { 
                                        ...msg, 
                                        id: m.id, 
                                        isPending: false, 
                                        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                      } 
                                    : msg
                            ));
                        }
                    } catch (err) {
                        console.error("Failed to process offline message:", err);
                        if (!navigator.onLine || err.message === 'Network Error') {
                            setOfflineQueue(prev => [...prev, item]); // Re-queue
                        } else {
                            // Backend rejected it!
                            const errorMsg = err.response?.data?.message || err.message || "Failed to send message.";
                            setMessages(prev => prev.map(msg => 
                                msg.tempId === item.tempId 
                                    ? { 
                                        ...msg, 
                                        isPending: false, 
                                        isError: true,
                                        errorMessage: errorMsg
                                      } 
                                    : msg
                            ));
                        }
                    }
                }
                fetchUsers();
            };
            processQueue();
        }
    }, [isOffline, offlineQueue, fetchUsers]);

    // Refs
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleSelectChat = async (chatObj) => {
        setSelectedChat(chatObj);
        if (chatObj.type === 'user') {
            try {
                // Optimistically clear unread count in UI
                setUsers(prev => prev.map(u => u.id === chatObj.id ? { ...u, unreadCount: 0 } : u));
                await axiosInstance.put(`/auth/messages/${chatObj.id}/read`);
                window.dispatchEvent(new Event('chat_read'));
            } catch (err) {
                console.error("Failed to mark messages as read:", err);
            }
        }
    };

    const handleJoinLiveSupport = (alert) => {
        setEscalationAlerts(prev => prev.filter(a => a.userId !== alert.userId));
        handleSelectChat({ type: 'user', id: alert.userId, name: alert.userName, role: 'user' });
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        setMyStatus(newStatus);
        try {
            await axiosInstance.put('/auth/status', { status: newStatus });
        } catch (err) {
            console.error("Failed to update status", err);
        }
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
            if (selectedChat.type === 'user' && Number(msg.sender_id) === Number(selectedChat.id)) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: msg.content,
                    attachmentUrl: msg.attachment_url,
                    attachmentType: msg.attachment_type,
                    timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                
                // Immediately mark as read in backend since we are actively viewing this chat
                axiosInstance.put(`/auth/messages/${msg.sender_id}/read`).then(() => {
                    window.dispatchEvent(new Event('chat_read'));
                }).catch(err => console.error("Failed to auto-mark as read:", err));
            } else {
                // Trigger a temporary toast banner
                const senderUser = users.find(u => u.id === msg.sender_id);
                const senderName = senderUser ? senderUser.name : 'A colleague';
                setToastNotification(`New message from ${senderName}: "${msg.content.slice(0, 40)}..."`);
                setTimeout(() => setToastNotification(null), 6000);
            }

            // Instantly re-sort users list in the sidebar (bubbles the sender to the top)
            fetchUsers();
        };

        const handleStatusChanged = ({ userId, status }) => {
            setUsers(prev => {
                const userExists = prev.some(u => u.id === userId);
                if (!userExists) {
                    // If a new user comes online and isn't in the list, refresh the list
                    fetchUsers();
                    return prev;
                }
                return prev.map(u => u.id === userId ? { ...u, status } : u);
            });
        };

        const handleMessagesRead = ({ readerId }) => {
            if (selectedChat.type === 'user' && selectedChat.id === readerId) {
                setMessages(prev => prev.map(m => (m.role === 'user' ? { ...m, isRead: true } : m)));
            }
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_status_changed', handleStatusChanged);
        socket.on('messages_read', handleMessagesRead);
        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_status_changed', handleStatusChanged);
            socket.off('messages_read', handleMessagesRead);
        };
    }, [socket, selectedChat, users, fetchUsers]);

    // Listen to real-time escalation alerts (Admin & Moderator only)
    useEffect(() => {
        if (!socket) return;
        if (currentUser?.role !== 'admin' && currentUser?.role !== 'moderator') return;

        const handleEscalation = (alertData) => {
            if (alertData.userId === currentUser.id) return; // Prevent self-assignment loop
            
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
            setMessages([]); // Immediately clear old messages to prevent offline ghosting
            
            const savedQueueStr = localStorage.getItem('chat_offline_queue');
            const savedQueue = savedQueueStr ? JSON.parse(savedQueueStr) : [];
            const pendingForUser = savedQueue.filter(item => item.receiverId === selectedChat.id).map(item => ({
                tempId: item.tempId,
                role: 'user',
                content: item.content,
                isPending: true,
                timestamp: item.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                attachmentUrl: item.attachmentUrl,
                attachmentType: item.attachmentType
            }));

            try {
                const res = await axiosInstance.get(`/auth/messages/${selectedChat.id}`);
                const formatted = res.data.data.map(m => ({
                    role: m.sender_id === currentUser.id ? 'user' : 'assistant',
                    content: m.content,
                    attachmentUrl: m.attachment_url,
                    attachmentType: m.attachment_type,
                    isRead: m.is_read,
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setMessages([...formatted, ...pendingForUser]);
            } catch (err) {
                console.error("Failed to load direct messages:", err);
                setMessages(pendingForUser);
            }
        };

        fetchUserMessages();
    }, [selectedChat, currentUser]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (myStatus === 'offline') {
            alert('You are offline. Please become online to use these features.');
            return;
        }
        if ((!inputValue.trim() && !attachmentFile) || loading) return;

        const typedContent = inputValue.trim();

        if (isOffline) {
            if (selectedChat.type === 'ai') {
                alert("AI Chat requires an active internet connection.");
                return;
            }
            
            const tempId = Date.now();
            const pendingMsg = {
                tempId,
                role: 'user',
                content: typedContent,
                isPending: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            if (attachmentFile) {
                pendingMsg.attachmentUrl = URL.createObjectURL(attachmentFile);
                pendingMsg.attachmentType = attachmentFile.type;
            }
            
            setMessages(prev => [...prev, pendingMsg]);
            setOfflineQueue(prev => [...prev, {
                tempId,
                receiverId: selectedChat.id,
                content: typedContent,
                rawFile: attachmentFile,
                timestamp: pendingMsg.timestamp,
                attachmentUrl: pendingMsg.attachmentUrl,
                attachmentType: pendingMsg.attachmentType
            }]);
            
            setInputValue('');
            setAttachmentFile(null);
            setAttachmentPreview(null);
            return;
        }

        setInputValue('');
        setLoading(true);

        let finalAttachmentUrl = null;
        let finalAttachmentType = null;

        if (attachmentFile) {
            const formData = new FormData();
            formData.append('file', attachmentFile);
            try {
                const uploadRes = await axiosInstance.post('/auth/upload?purpose=attachment', formData);
                if (uploadRes.data?.success) {
                    finalAttachmentUrl = uploadRes.data.file.url;
                    finalAttachmentType = uploadRes.data.file.mimetype;
                }
            } catch (err) {
                console.error("Failed to upload attachment:", err);
                alert(err.response?.data?.message || "Failed to upload attachment. It might be too large (max 100MB) or an unsupported format.");
                setLoading(false);
                return;
            }
        }

        // Clear preview immediately after upload finishes
        setAttachmentFile(null);
        setAttachmentPreview(null);

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
                            const agent = users.find(u => (u.role === 'admin' || u.role === 'moderator') && u.status === 'online');
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
                if (!navigator.onLine || err.message === 'Network Error') {
                    alert("Network Error: Your internet connection dropped. Please try again.");
                    setInputValue(typedContent); // Restore their typed text
                } else {
                    setMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to assistant service." }]);
                }
            } finally {
                setLoading(false);
            }
        } else {
            // Direct Message User
            try {
                const res = await axiosInstance.post('/auth/messages', {
                    receiverId: selectedChat.id,
                    content: typedContent,
                    attachmentUrl: finalAttachmentUrl,
                    attachmentType: finalAttachmentType
                });
                if (res.data?.success) {
                    const m = res.data.data;
                    setMessages(prev => [...prev, {
                        role: 'user',
                        content: m.content,
                        attachmentUrl: m.attachment_url,
                        attachmentType: m.attachment_type,
                        isRead: false,
                        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                    // Auto-refresh the sender's user list to update "lastMessageAt" ordering
                    fetchUsers();
                }
            } catch (err) {
                console.error("Failed to send direct message:", err);
                if (!navigator.onLine || err.message === 'Network Error') {
                    alert("Network Error: Your internet connection dropped. Please try again.");
                    setInputValue(typedContent); // Restore their typed text
                } else {
                    alert("Failed to send message: " + (err.response?.data?.message || err.message));
                }
            } finally {
                setLoading(false);
            }
        }
    };

    const handleAttachmentChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAttachmentFile(file);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachmentPreview({
                url: file.type.startsWith('image/') || file.type.startsWith('video/') ? reader.result : null,
                type: file.type,
                name: file.name
            });
        };
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            reader.readAsDataURL(file);
        } else {
            // For non-media files, we just need the metadata
            setAttachmentPreview({
                url: null,
                type: file.type || 'application/octet-stream',
                name: file.name
            });
        }
    };

    const clearAttachment = () => {
        setAttachmentFile(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 4. ElevenLabs Voice Transcription
    const startRecording = async () => {
        if (myStatus === 'offline' || !navigator.onLine) {
            alert('You must be online to use voice transcription.');
            return;
        }
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
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800 dark:text-slate-200">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden pl-16 md:pl-0">
                <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 flex flex-col h-screen max-h-screen overflow-hidden">
                    <div className="mb-6 flex-shrink-0 flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white">
                                <MessageSquare className="w-8 h-8 text-accent-600" />
                                Acme Chatflow
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Select between AI Assistant or Direct Messages to chat with colleagues.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-700/60">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">My Status:</span>
                            <select 
                                value={myStatus} 
                                onChange={handleStatusChange}
                                className="text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-500"
                            >
                                <option value="online">🟢 Online</option>
                                <option value="busy">🟡 Busy</option>
                                <option value="offline">⚪ Offline</option>
                            </select>
                        </div>
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
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 text-red-600 font-bold rounded-lg hover:bg-slate-100 dark:bg-slate-800 transition-all"
                                >
                                    Join Chat
                                </button>
                                <button 
                                    onClick={() => setEscalationAlerts(prev => prev.filter(a => a.userId !== alert.userId))}
                                    className="px-2 py-1.5 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-all"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-xl dark:shadow-none rounded-3xl overflow-hidden flex min-h-0 mb-6">
                        {/* Conversation Side panel */}
                        <div className="w-80 border-r border-slate-200 dark:border-slate-700/60 flex flex-col bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                            {/* Search bar */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all bg-slate-50 dark:bg-slate-900/50"
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
                                            ? 'bg-accent-600 text-white shadow-md dark:shadow-none shadow-accent-500/20' 
                                            : 'hover:bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedChat.type === 'ai' ? 'bg-white/20 text-white' : 'bg-accent-50 text-accent-600'}`}>
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs">Acme AI Assistant</h4>
                                        <p className={`text-[10px] ${selectedChat.type === 'ai' ? 'text-accent-100' : 'text-slate-400'}`}>Online</p>
                                    </div>
                                </button>

                                <div className="pt-4 pb-2">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Direct Messages</span>
                                </div>

                                {filteredUsers.map(u => {
                                    const isSelected = selectedChat.id === u.id;
                                    const isUnread = parseInt(u.unreadCount || 0) > 0;
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => handleSelectChat({ type: 'user', id: u.id, name: u.name, role: u.role })}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all relative ${
                                                isSelected 
                                                    ? 'bg-accent-600 text-white shadow-md dark:shadow-none shadow-accent-500/20' 
                                                    : 'hover:bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                                            }`}
                                        >
                                            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${isSelected ? 'bg-white/20 text-white' : (isUnread ? 'bg-green-100 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}`}>
                                                {u.name?.charAt(0)}
                                                <span className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${
                                                    u.status === 'online' ? 'bg-green-500' : u.status === 'busy' ? 'bg-yellow-500' : 'bg-slate-300'
                                                }`}></span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-xs truncate ${isSelected ? 'text-white font-bold' : (isUnread ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-700 dark:text-slate-200 font-semibold')}`}>
                                                    {u.name}
                                                </h4>
                                                <p className={`text-[10px] capitalize ${isSelected ? 'text-accent-100' : (isUnread ? 'text-green-600 font-bold' : 'text-slate-400')}`}>{u.role}</p>
                                            </div>
                                            {isUnread && !isSelected && (
                                                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold animate-bounce shadow-md dark:shadow-none">
                                                    {u.unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active Chat dialog */}
                        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
                            {/* Offline Banner */}
                            {isOffline && (
                                <div className="bg-red-500 text-white text-xs font-bold py-2 px-4 text-center w-full flex items-center justify-center gap-2 z-10 shadow-md">
                                    <AlertCircle className="w-4 h-4" />
                                    Your internet connection is disconnected. Messages will be queued and sent automatically when you reconnect.
                                </div>
                            )}
                            {/* Chat Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center font-bold uppercase">
                                        {selectedChat.type === 'ai' ? <Bot className="w-5 h-5" /> : selectedChat.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedChat.name}</h3>
                                        <p className="text-[10px] text-slate-400 capitalize">
                                            {selectedChat.type === 'ai' ? 'Acme Corp AI System Help desk' : selectedChat.role}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Message Feed */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-900/50">
                                {messages.map((m, index) => {
                                    const isSelf = m.role === 'user';
                                    return (
                                        <div key={index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[70%] flex flex-col gap-1">
                                                <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm dark:shadow-none ${
                                                    isSelf
                                                        ? 'bg-accent-600 text-white rounded-tr-none'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                                }`}>
                                                    {m.attachmentUrl && (
                                                        <div className="mb-2 max-w-sm rounded-xl overflow-hidden">
                                                            {m.attachmentType?.startsWith('image/') ? (
                                                                <img src={m.attachmentUrl} alt="attachment" className="w-full h-auto object-cover rounded-xl" />
                                                            ) : m.attachmentType?.startsWith('video/') ? (
                                                                <video src={m.attachmentUrl} controls className="w-full h-auto rounded-xl" />
                                                            ) : (
                                                                <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isSelf ? 'bg-accent-700/50 border-accent-500 hover:bg-accent-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
                                                                        <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                                                    </div>
                                                                    <div className="flex-1 truncate">
                                                                        <p className="text-sm font-semibold truncate break-all">
                                                                            {m.attachmentUrl.split('/').pop()}
                                                                        </p>
                                                                        <p className="text-[10px] opacity-70 uppercase tracking-wider mt-0.5">Document</p>
                                                                    </div>
                                                                    <Download className="w-4 h-4 opacity-70" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                    {m.content && <p>{m.content}</p>}
                                                </div>
                                                {m.timestamp && (
                                                    <div className={`flex flex-col gap-1 mt-1 px-2 ${isSelf ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                                            <span>{m.timestamp}</span>
                                                            {isSelf && selectedChat.type !== 'ai' && (
                                                                m.isError ? <AlertCircle className="w-3 h-3 text-red-500" title={m.errorMessage} /> :
                                                                m.isPending ? <Clock className="w-3 h-3 text-slate-400" /> : m.isRead ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-slate-400" />
                                                            )}
                                                        </div>
                                                        {m.isError && (
                                                            <span className="text-[9px] text-red-500 italic max-w-[200px] text-right">{m.errorMessage}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700/60 rounded-3xl rounded-tl-none flex gap-1 items-center shadow-sm dark:shadow-none">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <div className="border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                                {attachmentPreview && (
                                    <div className="px-6 pt-4 pb-2 flex items-center gap-4">
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-accent-200 shadow-sm flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                                            {attachmentPreview.type.startsWith('image/') && attachmentPreview.url ? (
                                                <img src={attachmentPreview.url} alt="preview" className="w-full h-full object-cover" />
                                            ) : attachmentPreview.type.startsWith('video/') && attachmentPreview.url ? (
                                                <video src={attachmentPreview.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-2 text-center">
                                                    <FileText className="w-8 h-8 text-accent-500 mb-1" />
                                                    <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate w-full px-1">{attachmentPreview.name}</span>
                                                </div>
                                            )}
                                            <button 
                                                type="button"
                                                onClick={clearAttachment}
                                                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <form onSubmit={handleSend} className="p-4 flex gap-3">
                                    {selectedChat.type !== 'ai' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={loading || transcribing || myStatus === 'offline' || isTargetBusy}
                                                className="p-3 rounded-2xl transition-all bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 disabled:opacity-50"
                                                title="Attach File"
                                            >
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                onChange={handleAttachmentChange} 
                                            />
                                        </>
                                    )}
                                <button
                                    type="button"
                                    onClick={recording ? stopRecording : startRecording}
                                    disabled={loading || transcribing || isTargetBusy}
                                    className={`p-3 rounded-2xl transition-all ${
                                        recording 
                                            ? 'bg-red-500 text-white animate-pulse' 
                                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 disabled:opacity-50'
                                    }`}
                                    title={recording ? "Stop Recording" : "Record Voice"}
                                >
                                    {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onClick={() => {
                                        if (myStatus === 'offline') {
                                            alert('You are offline. Please become online to use these features.');
                                        } else if (isTargetBusy) {
                                            alert('This user is currently busy and cannot receive messages.');
                                        }
                                    }}
                                    onChange={(e) => {
                                        if (myStatus === 'offline' || isTargetBusy) {
                                            return;
                                        }
                                        setInputValue(e.target.value);
                                    }}
                                    placeholder={myStatus === 'offline' ? "You are offline..." : isTargetBusy ? "User is busy. You cannot send messages right now." : transcribing ? "Transcribing voice..." : "Type your message..."}
                                    disabled={loading || transcribing || myStatus === 'offline' || isTargetBusy}
                                    className="flex-1 px-5 py-3 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all bg-slate-50 dark:bg-slate-900/50 disabled:bg-slate-100 dark:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    onClick={(e) => {
                                        if (myStatus === 'offline' || isTargetBusy) {
                                            e.preventDefault();
                                        }
                                    }}
                                    disabled={loading || transcribing || (!inputValue.trim() && !attachmentFile) || myStatus === 'offline' || isTargetBusy}
                                    className="p-3 bg-accent-600 hover:bg-accent-700 text-white rounded-2xl transition-all disabled:opacity-50 disabled:bg-accent-400"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Chat;
