'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}: ConfirmModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const variantStyles = {
        danger: {
            icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
            button: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20",
            bg: "bg-red-500/10"
        },
        warning: {
            icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
            button: "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20",
            bg: "bg-amber-500/10"
        },
        info: {
            icon: <AlertTriangle className="w-8 h-8 text-blue-500" />,
            button: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
            bg: "bg-blue-500/10"
        }
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
                        className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Decorative background glow */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 ${variantStyles[variant].bg} blur-[80px] -z-10`} />

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-16 h-16 ${variantStyles[variant].bg} rounded-2xl flex items-center justify-center mb-2`}>
                                {variantStyles[variant].icon}
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white tracking-tight leading-tight">
                                    {title}
                                </h3>
                                <p className="text-slate-400 text-sm font-bold leading-relaxed px-4">
                                    {message}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full pt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 font-bold transition-all"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 px-6 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${variantStyles[variant].button}`}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
