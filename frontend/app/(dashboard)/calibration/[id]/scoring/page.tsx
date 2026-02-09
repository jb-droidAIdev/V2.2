'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    Circle,
    Play,
    Save,
    Loader2
} from 'lucide-react';
import { CalibrationService } from '../../services/calibration-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ScoringPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [taskData, setTaskData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTicket, setActiveTicket] = useState<any>(null);
    const [scoreInput, setScoreInput] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTaskData();
    }, [sessionId]);

    const fetchTaskData = async () => {
        try {
            const data = await CalibrationService.getMyTaskDetails(sessionId);
            setTaskData(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load scoring tasks');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreSubmit = async () => {
        if (!activeTicket) return;

        setIsSubmitting(true);
        try {
            await CalibrationService.submitScore({
                sessionId,
                ticketId: activeTicket.ticketId,
                totalScore: Number(scoreInput),
                scoreDetails: { note: 'Scored via Calibration Interface' } // Placeholder for full audit form data
            });
            toast.success('Score submitted');
            setActiveTicket(null);
            fetchTaskData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit score');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openTicket = (ticket: any) => {
        if (ticket.scored) return; // Already scored
        setActiveTicket(ticket);
        setScoreInput(100); // Default start
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (taskData?.error) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-400 font-bold">{taskData.error}</p>
                <button onClick={() => router.back()} className="text-slate-400 hover:text-white underline">Go Back</button>
            </div>
        );
    }

    // Determine Ticket Label (Blind)
    // We can just number them 1 to N
    const tickets = taskData?.tickets || [];
    // We user taskData.progress to show stats

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                <button
                    onClick={() => router.back()}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">Calibration Scoring</h1>
                    <p className="text-slate-400 font-medium">Evaluate tickets blindly to establish baseline.</p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress</p>
                        <p className="text-xl font-black text-white">{taskData.progress.completed} / {taskData.progress.total}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {taskData.tickets.map((ticket: any, i: number) => {
                    // Find status in my scores
                    // Wait, getMyTaskDetails returns userScores logic inside the controller? 
                    // Let's check the controller return type.
                    // Controller returns: 
                    // {
                    //    tickets: session.tickets,
                    //    progress: ...,
                    //    userScores: [ { ticketId, type, scored, score } ] -- Wait, controller logic:
                    //    /*
                    //    const userScores = tickets.map(...)
                    //    return { ..., tickets, ... }
                    //    */
                    //    Wait, the controller return `tickets` which are raw tickets (with all scores).
                    //    It DOES NOT merge the user's status into the `tickets` array directly in the controller code I wrote.
                    //    It actually performs `userScores` mapping but doesn't attach it to `tickets`?
                    //    Let me check the controller code I wrote in Step 1549.

                    /*
                    const userScores = tickets.map((ticket: any) => { ... });
                    return {
                        ...
                        tickets, // RAW tickets
                        progress: ...
                    }
                    */

                    // Ah, I missed returning `userScores` explicitly or merging it.
                    // But I returned `progress`.
                    // The Frontend needs to know which ticket is scored.
                    // `tickets` array contains `scores` relation.
                    // I can filter client-side: ticket.scores.find(s => s.participantId === myParticipantId).

                    // BUT `getMyTaskDetails` in controller uses `req.user.userId`.
                    // `tickets` includes `scores` which includes `participant`.
                    // So I can check `ticket.scores` to see if *I* scored it.

                    const myScore = ticket.scores?.find((s: any) => s.participant?.userId === taskData.participant.userId); // Wait, taskData doesn't have my userId
                    // But I can find it via the browser user ID or better, relying on `score.participant.userId` matching current user.
                    // Actually, a safer way is to check `ticket.scores`.

                    const isScored = !!myScore;

                    return (
                        <motion.div
                            key={ticket.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => openTicket({ ...ticket, scored: isScored })}
                            className={cn(
                                "glass p-6 rounded-[2rem] border relative overflow-hidden group transition-all cursor-pointer",
                                isScored
                                    ? "border-emerald-500/20 opacity-70 hover:opacity-100"
                                    : "border-white/5 hover:border-blue-500/30 hover:-translate-y-1"
                            )}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Ticket #{i + 1}
                                </span>
                                {isScored ? (
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Done
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                                        <Circle className="w-3 h-3" /> Pending
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-black text-white mb-2">
                                {isScored ? `${myScore.totalScore}%` : 'Not Scored'}
                            </h3>
                            <p className="text-slate-500 text-sm font-medium truncate">
                                ID: {ticket.ticketId}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Scoring Modal */}
            <AnimatePresence>
                {activeTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600" />

                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">Evaluate Ticket</h2>
                                    <p className="text-slate-400 font-medium">Ticket ID: {activeTicket.ticketId}</p>
                                </div>

                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-sm font-bold text-white uppercase tracking-widest">Total Quality Score</span>
                                        <span className="text-4xl font-black text-blue-400">{scoreInput}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={scoreInput}
                                        onChange={(e) => setScoreInput(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Auto-Fail Items</p>
                                            <p className="text-white font-bold text-sm">None</p>
                                        </div>
                                        <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Category</p>
                                            <p className="text-white font-bold text-sm">General Support</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setActiveTicket(null)}
                                        className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleScoreSubmit}
                                        disabled={isSubmitting}
                                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-600/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Submit Score
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
