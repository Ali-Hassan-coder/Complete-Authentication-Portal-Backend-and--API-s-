import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDestructive = true }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl dark:shadow-none w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-6 pb-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-3 ${isDestructive ? 'text-red-600' : 'text-accent-600'}`}>
                    <div className={`p-2 rounded-xl ${isDestructive ? 'bg-red-100' : 'bg-accent-100'}`}>
                        {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex-1">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 p-2 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-200 hover:bg-slate-200/50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm dark:shadow-none transition-all duration-200 ${
                            isDestructive 
                            ? 'bg-red-600 hover:bg-red-700 hover:shadow-md dark:shadow-none hover:shadow-red-500/20' 
                            : 'bg-accent-600 hover:bg-accent-700 hover:shadow-md dark:shadow-none hover:shadow-accent-500/20'
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
