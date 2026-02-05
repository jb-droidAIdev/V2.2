'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    submitText?: string;
    cancelText?: string;
    minLength?: number;
    required?: boolean;
}

export default function PromptModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    message,
    placeholder = 'Type here...',
    initialValue = '',
    submitText = 'Submit',
    cancelText = 'Cancel',
    minLength = 0,
    required = true
}: PromptModalProps) {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setError('');
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (required && !value.trim()) {
            setError('This field is required');
            return;
        }
        if (value.length < minLength) {
            setError(`Minimum ${minLength} characters required`);
            return;
        }
        onSubmit(value);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 blur-[80px] -z-10" />

                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                                        {title}
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-70">
                                        User Input Required
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                {message}
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <textarea
                                        autoFocus
                                        value={value}
                                        onChange={(e) => {
                                            setValue(e.target.value);
                                            setError('');
                                        }}
                                        placeholder={placeholder}
                                        className="w-full bg-[#020617]/50 border border-white/10 rounded-2xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 font-medium resize-none min-h-[120px]"
                                    />
                                    {error && (
                                        <p className="text-red-400 text-[10px] font-black uppercase tracking-widest ml-1 animate-pulse">
                                            {error}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3 w-full pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-6 py-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 font-bold transition-all"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span>{submitText}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 p-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
