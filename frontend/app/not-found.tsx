'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Ghost, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass max-w-md w-full p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 text-center"
            >
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                    <Ghost className="w-10 h-10 text-blue-400" />
                </div>

                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">404</h1>
                <h2 className="text-xl font-bold text-slate-200 mb-2">Signal Lost in Void</h2>
                <p className="text-slate-400 mb-8 font-medium leading-relaxed">
                    The coordinates you provided do not correspond to any active sector in our database.
                </p>

                <div className="space-y-3">
                    <Link href="/dashboard">
                        <button
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                        >
                            <Home className="w-5 h-5" />
                            Return to Base
                        </button>
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all border border-white/10 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Previous Sector
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
