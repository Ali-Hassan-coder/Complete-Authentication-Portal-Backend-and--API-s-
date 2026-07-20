import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/ui/modern-side-bar';
import { FileText, Image, Video, Upload, ArrowDownToLine, AlertCircle, CheckCircle } from 'lucide-react';

function Documents() {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // File upload states
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const fetchFiles = useCallback(async () => {
        try {
            setError('');
            const res = await axiosInstance.get('/auth/files');
            setFiles(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load documents list.');
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
        fetchFiles();
    }, [token, fetchFiles, navigate]);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setError('');
        setMessage('');
        setUploading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            await axiosInstance.post('/auth/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage('File uploaded successfully!');
            setSelectedFile(null);
            // Reset file input value
            document.getElementById('file-input').value = '';
            
            // Add notification trace
            logActivity('Uploaded a new file: ' + selectedFile.name);
            await fetchFiles();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload file.');
        } finally {
            setUploading(false);
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

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const getFileIcon = (category) => {
        switch (category) {
            case 'images':
                return <Image className="w-8 h-8 text-accent-500" />;
            case 'videos':
                return <Video className="w-8 h-8 text-purple-500" />;
            default:
                return <FileText className="w-8 h-8 text-amber-500" />;
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
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 text-slate-800 dark:text-slate-200">
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen overflow-y-auto pl-16 md:pl-0">
                <main className="max-w-6xl w-full mx-auto px-6 py-10">
                    <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Documents Vault</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">Upload and manage your secure documents, photos, and video attachments.</p>
                        </div>

                        {/* Quick upload inline form */}
                        <form onSubmit={handleUploadSubmit} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none flex items-center gap-3">
                            <input 
                                type="file" 
                                id="file-input" 
                                onChange={handleFileChange}
                                required
                                className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 cursor-pointer"
                            />
                            <button
                                type="submit"
                                disabled={uploading || !selectedFile}
                                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold rounded-xl shadow-sm dark:shadow-none transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </form>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-50 text-green-600 text-sm p-4 rounded-2xl border border-green-100 mb-6 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {message}
                        </div>
                    )}

                    {/* Grids categorized */}
                    <div className="flex flex-col gap-10">
                        {/* Images Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-2">Photos & Images</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                {files.filter(f => f.category === 'images').length > 0 ? (
                                    files.filter(f => f.category === 'images').map(file => (
                                        <div key={file.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none overflow-hidden flex flex-col group">
                                            <div className="h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-700/60 relative">
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            </div>
                                            <div className="p-4 flex flex-col flex-1">
                                                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name.substring(13)}</h4>
                                                <span className="text-[10px] text-slate-400 mt-1">{formatBytes(file.size)}</span>
                                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50 mt-auto">
                                                    <a 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="flex-1 py-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <ArrowDownToLine className="w-3.5 h-3.5" />
                                                        View File
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60">
                                        No photos uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Videos Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-2">Videos</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                {files.filter(f => f.category === 'videos').length > 0 ? (
                                    files.filter(f => f.category === 'videos').map(file => (
                                        <div key={file.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none overflow-hidden flex flex-col">
                                            <div className="h-40 bg-slate-950 flex items-center justify-center relative">
                                                <video src={file.url} controls className="w-full h-full object-contain" />
                                            </div>
                                            <div className="p-4 flex flex-col flex-1">
                                                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name.substring(13)}</h4>
                                                <span className="text-[10px] text-slate-400 mt-1">{formatBytes(file.size)}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60">
                                        No videos uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Documents Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700/60 pb-2">Other Files & Documents</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {files.filter(f => f.category === 'documents').length > 0 ? (
                                    files.filter(f => f.category === 'documents').map(file => (
                                        <div key={file.name} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm dark:shadow-none flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-3 bg-amber-50 rounded-2xl flex-shrink-0">
                                                    {getFileIcon(file.category)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name.substring(13)}</h4>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">{formatBytes(file.size)}</span>
                                                </div>
                                            </div>
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
                                                title="Download Document"
                                            >
                                                <ArrowDownToLine className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60">
                                        No documents uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Documents;
