import { useState, useRef, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { MessageSquare, X, Send, Bot, Mic, MicOff } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export function ChatbotWidget() {
    const { user, socket } = useAuth();
    const orgName = user?.organizationName || 'System';
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hello! I am your ${orgName} AI Assistant. Ask me anything about your current account privileges, system roles, how to navigate the documents vault, settings, or audit logs!`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [priority, setPriority] = useState('Normal');

    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (!socket) return;
        
        const handleRejection = (data) => {
            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        };

        socket.on('escalation_rejected', handleRejection);
        return () => {
            socket.off('escalation_rejected', handleRejection);
        };
    }, [socket]);

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
                    setMessages(prev => [...prev, { role: 'assistant', content: "Failed to transcribe audio. Please try again." }]);
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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || loading) return;

        const userMessageContent = inputValue.trim();
        const displayMessage = { role: 'user', content: userMessageContent };
        const systemMessage = { 
            role: 'user', 
            content: priority === 'Normal' ? userMessageContent : `[Priority: ${priority}] ${userMessageContent}` 
        };

        setMessages(prev => [...prev, displayMessage]);
        setInputValue('');
        setLoading(true);

        try {
            // Package the full dialog history (excluding system messages which are added on the backend)
            // But substitute the latest message with the priority-tagged message
            const chatHistory = [...messages, systemMessage].map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await axiosInstance.post('/auth/chat', { messages: chatHistory });
            if (response.data?.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing that request." }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to assistant service. Please check your credentials." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl dark:shadow-none transition-all duration-300 transform hover:scale-105 active:scale-95"
                title={`Chat with ${orgName} Assistant`}
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="w-[360px] h-[480px] bg-white dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 dark:border-slate-700 rounded-3xl shadow-2xl mt-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800/20 flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">{orgName} AI Assistant</h4>
                                <p className="text-[10px] text-violet-100">Active (Powered by Groq & ElevenLabs)</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 dark:bg-slate-900/ dark:bg-slate-900/30">
                        {messages.map((m, idx) => {
                            const isUser = m.role === 'user';
                            return (
                                <div
                                    key={idx}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm dark:shadow-none ${
                                            isUser
                                                ? 'bg-violet-600 text-white rounded-tr-none'
                                                : 'bg-white dark:bg-slate-800 dark:bg-slate-700 text-slate-800 dark:text-slate-200 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700/60 dark:border-slate-600'
                                        }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Loader Pulsing dots */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 dark:bg-slate-700 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700/60 dark:border-slate-600 flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Footer */}
                    <div className="flex flex-col bg-white dark:bg-slate-800 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/60 dark:border-slate-700 p-2 gap-2">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-slate-500">Priority:</span>
                            <select 
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold py-1 px-2 rounded-md outline-none cursor-pointer transition-colors border border-slate-200 dark:border-slate-600"
                            >
                                <option value="Normal" className="text-slate-800 dark:text-slate-200">🟢 Normal</option>
                                <option value="Urgent" className="text-orange-600">🟠 Urgent (Mod)</option>
                                <option value="Critical" className="text-red-600">🔴 Critical (Admin)</option>
                            </select>
                        </div>
                        <form 
                            onSubmit={handleSend}
                            className="flex gap-2"
                        >
                        <button
                            type="button"
                            onClick={recording ? stopRecording : startRecording}
                            disabled={loading || transcribing}
                            className={`p-2.5 rounded-2xl transition-all ${
                                recording 
                                    ? 'bg-red-500 text-white animate-pulse' 
                                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            }`}
                            title={recording ? "Stop Recording" : "Record Voice"}
                        >
                            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={transcribing ? "Transcribing voice..." : "Ask me anything..."}
                            disabled={loading || transcribing}
                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700/60 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:bg-slate-900 dark:text-slate-100 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading || transcribing || !inputValue.trim()}
                            className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl transition-all disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
