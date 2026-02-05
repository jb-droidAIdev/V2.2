'use client';

import { motion } from 'framer-motion';
import {
    Wrench,
    Construction,
    Clock,
    Layers,
    Cpu,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function CalibrationPage() {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] -z-10 animate-pulse" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center space-y-8 max-w-2xl px-6"
            >
                {/* Icon Composition */}
                <div className="relative inline-block">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-600/20 rotate-12 mx-auto">
                        <Construction className="w-12 h-12 text-blue-500 -rotate-12" />
                    </div>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-4 -right-4 w-12 h-12 bg-[#0f172a] border border-white/10 rounded-2xl flex items-center justify-center"
                    >
                        <Wrench className="w-6 h-6 text-amber-500" />
                    </motion.div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 text-blue-400">
                        <Cpu className="w-5 h-5" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em]">Module Status: Development</h2>
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tighter">
                        Calibration <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">Engine</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                        We are currently engineering the calibration interface to ensure maximum reproducibility and statistical alignment across your QA workforce.
                    </p>
                </div>

                {/* Progress Indicators */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 space-y-6 bg-white/[0.02]">
                    <div className="flex justify-between items-end px-2">
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Sprint</p>
                            <p className="text-sm font-bold text-white">Logic Architecture & UI Prototyping</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-blue-500 italic">65%</p>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '65%' }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Q1 2026</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <Layers className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alpha Testing</span>
                        </div>
                    </div>
                </div>

                {/* Action */}
                <Link href="/dashboard">
                    <button className="flex items-center gap-2 bg-[#0f172a] hover:bg-white/5 border border-white/10 text-white px-8 py-4 rounded-[1.5rem] font-bold transition-all shadow-xl active:scale-95 group mx-auto">
                        <ArrowLeft className="w-5 h-5 text-blue-400 group-hover:-translate-x-1 transition-transform" />
                        <span>Return to Ops Center</span>
                    </button>
                </Link>
            </motion.div>
        </div>
    );
}
