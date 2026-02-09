'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application Error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass max-w-md w-full p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 text-center"
            >
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                    <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>

                <h1 className="text-2xl font-black text-white mb-2 tracking-tight">System Interruption</h1>
                <p className="text-slate-400 mb-8 font-medium leading-relaxed">
                    The neural engine encountered an unexpected state. We've captured the logs and are ready to recover.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => reset()}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Try Recovery
                    </button>

                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all border border-white/10 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <Home className="w-5 h-5" />
                        Return to Dashboard
                    </button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-40 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Debug Trace</p>
                        <code className="text-xs text-rose-400 font-mono break-all leading-tight">
                            {error.message}
                        </code>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
