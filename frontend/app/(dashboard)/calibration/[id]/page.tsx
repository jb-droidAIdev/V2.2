'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Play,
    Shield,
    BarChart3,
    MoreVertical,
    Trash2,
    Shuffle,
    Activity,
    Loader2
} from 'lucide-react';
import { CalibrationService, CalibrationSession } from '@/lib/calibration-service';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CalibrationSessionDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [session, setSession] = useState<CalibrationSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        fetchSession();
    }, [sessionId]);

    const fetchSession = async () => {
        try {
            const data = await CalibrationService.getSessionById(sessionId);
            setSession(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load session details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRandomize = async () => {
        if (!confirm('Are you sure you want to randomize tickets? This will lock the configuration.')) return;

        setIsActionLoading(true);
        try {
            await CalibrationService.randomizeTickets(sessionId);
            toast.success('Tickets randomized successfully');
            fetchSession(); // Refresh to see status change
        } catch (err) {
            toast.error('Failed to randomize tickets');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCalculate = async () => {
        setIsActionLoading(true);
        try {
            await CalibrationService.calculateResults(sessionId);
            toast.success('Results calculated successfully');
            fetchSession();
        } catch (err) {
            toast.error('Failed to calculate results');
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Session...</p>
            </div>
        );
    }

    if (!session || !user) return null;

    const userRole = user.role;
    const isParticipant = session.participants?.some(p => p.userId === user.id);
    const participantRecord = session.participants?.find(p => p.userId === user.id);
    const isGlobalAdmin = ['ADMIN', 'QA_MANAGER', 'QA_TL'].includes(userRole);

    // Determine user's primary action
    let PrimaryAction = null;

    if (session.status === 'SCHEDULED' && isGlobalAdmin) {
        PrimaryAction = (
            <button
                onClick={handleRandomize}
                disabled={isActionLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
                {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shuffle className="w-5 h-5" />}
                Randomize & Start
            </button>
        );
    } else if (session.status === 'ANCHOR_PENDING') {
        const canValidate = ['QA_TL', 'OPS_MANAGER', 'SDM', 'ADMIN', 'QA_MANAGER'].includes(userRole);
        if (canValidate) {
            PrimaryAction = (
                <button
                    onClick={() => router.push(`/calibration/${sessionId}/validation`)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
                >
                    <Shield className="w-5 h-5" />
                    Validate Anchors
                </button>
            );
        } else {
            PrimaryAction = (
                <div className="px-6 py-3 bg-white/5 rounded-2xl text-slate-400 font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Waiting for Anchor Approval
                </div>
            );
        }
    } else if (session.status === 'SCORING_OPEN') {
        if (isParticipant && !participantRecord?.hasCompletedScoring) {
            PrimaryAction = (
                <button
                    onClick={() => router.push(`/calibration/${sessionId}/scoring`)}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
                >
                    <Play className="w-5 h-5" />
                    Start Scoring
                </button>
            );
        } else if (isParticipant && participantRecord?.hasCompletedScoring) {
            PrimaryAction = (
                <div className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Scoring Completed
                </div>
            );
        } else {
            PrimaryAction = (
                <div className="px-6 py-3 bg-white/5 rounded-2xl text-slate-400 font-medium flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Scoring in Progress
                </div>
            );
        }
    } else if (session.status === 'SCORING_CLOSED' && isGlobalAdmin) {
        PrimaryAction = (
            <button
                onClick={handleCalculate}
                disabled={isActionLoading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
                {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
                Calculate Results
            </button>
        );
    } else if (session.status === 'COMPLETED') {
        PrimaryAction = (
            <button
                onClick={() => router.push(`/calibration/${sessionId}/results`)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
            >
                <BarChart3 className="w-5 h-5" />
                View Results
            </button>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => router.push('/calibration')}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white mt-1"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white tracking-tighter">{session.title}</h1>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                                session.status === 'SCORING_OPEN' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    session.status === 'ANCHOR_PENDING' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                                {session.status.replace('_', ' ')}
                            </div>
                        </div>
                        <p className="text-slate-400 font-medium max-w-2xl">{session.description || 'No description provided.'}</p>

                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(session.scheduledAt), 'MMM dd, yyyy · HH:mm')}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
                                <Users className="w-4 h-4" />
                                {session.participants?.length || 0} Participants
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                    {PrimaryAction}
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Progress Card */}
                <div className="md:col-span-2 glass p-8 rounded-[2rem] border border-white/5 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            Session Progress
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Anchors</p>
                            <div className="flex items-end gap-2">
                                <span className={cn("text-2xl font-black",
                                    (session.anchors?.filter(a => a.status === 'VALIDATED').length || 0) === 6 ? "text-emerald-400" : "text-white"
                                )}>
                                    {session.anchors?.filter(a => a.status === 'VALIDATED').length || 0}
                                </span>
                                <span className="text-slate-500 font-medium mb-1">/ 6 Validated</span>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Raters</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">
                                    {session.participants?.filter(p => p.hasCompletedScoring).length || 0}
                                </span>
                                <span className="text-slate-500 font-medium mb-1">/ {session.participants?.filter(p => p.role === 'RATER').length || 0} Completed</span>
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tickets</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white">
                                    {session.tickets?.length || 0}
                                </span>
                                <span className="text-slate-500 font-medium mb-1">Total Assigned</span>
                            </div>
                        </div>
                    </div>

                    {/* Participant List */}
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Participants Status</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                            {session.participants?.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                            {p.user?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{p.user?.name}</p>
                                            <p className="text-[10px] font-medium text-slate-500">{p.role}</p>
                                        </div>
                                    </div>
                                    {p.hasCompletedScoring ? (
                                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-emerald-500/20">
                                            <CheckCircle2 className="w-3 h-3" /> Done
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-white/10">
                                            <Clock className="w-3 h-3" /> Pending
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Configuration Sidebar */}
                <div className="glass p-6 rounded-[2rem] border border-white/5 space-y-6 h-fit">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-400" />
                            Configuration
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Success Criteria</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Target R&R Gap</span>
                                    <span className="text-white font-bold">{session.targetRnR}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Target Accuracy Gap</span>
                                    <span className="text-white font-bold">{session.targetAccuracy} pts</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ticket Pool</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Reproducibility</span>
                                    <span className="text-white font-bold">4 Tickets</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Repeatability</span>
                                    <span className="text-white font-bold">2 Tickets (x2)</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Accuracy (Anchors)</span>
                                    <span className="text-white font-bold">6 Tickets</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
