'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Calendar,
    Users,
    ChevronRight,
    Loader2,
    Search,
    Filter,
    Activity,
    Target
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CalibrationPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/calibration');
            setSessions(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load calibration sessions');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Calibration Engine</h1>
                    <p className="text-slate-400 font-medium italic">Standardize quality performance across your workforce.</p>
                </div>

                <button
                    disabled
                    className="flex items-center gap-2 bg-blue-600/50 cursor-not-allowed border border-blue-500/20 text-white/50 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                    <Plus className="w-5 h-5" />
                    New Session (Coming Soon)
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Sessions', value: sessions.filter(s => s.status === 'OPEN').length, icon: Activity, color: 'text-emerald-400' },
                    { label: 'Scheduled', value: sessions.filter(s => s.status === 'SCHEDULED').length, icon: Calendar, color: 'text-blue-400' },
                    { label: 'Avg. Accuracy', value: '88%', icon: Target, color: 'text-amber-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-white">{stat.value}</p>
                        </div>
                        <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0f172a]/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-400 px-6 py-3 rounded-2xl font-bold text-sm hover:text-white transition-all">
                        <Filter className="w-4 h-4" />
                        Status
                    </button>
                </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Neural Link...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="h-64 glass rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                            <Target className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tighter">No Sessions Found</h3>
                        <p className="text-slate-500 max-w-xs mt-2 font-medium">Create your first calibration session to start standardizing quality.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredSessions.map((session, i) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative glass p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <Activity className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white tracking-tight mb-1">{session.title}</h3>
                                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5 text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {format(new Date(session.scheduledAt), 'MMM dd, yyyy · HH:mm')}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-blue-400/80">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {session._count?.participants || 0} Participants
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                                            session.status === 'OPEN' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                session.status === 'CLOSED' ? "bg-slate-500/10 text-slate-400 border-white/10" :
                                                    "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        )}>
                                            {session.status}
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
