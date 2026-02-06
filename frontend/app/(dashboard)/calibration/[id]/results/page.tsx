'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    BarChart3,
    Target,
    Users,
    Download,
    Loader2
} from 'lucide-react';
import { CalibrationService } from '@/lib/calibration-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ResultsPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, [sessionId]);

    const fetchResults = async () => {
        try {
            const res = await CalibrationService.getSessionResults(sessionId);
            setData(res);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load results');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    const { session, results } = data;
    const passedRnR = (session.calculatedRnR || 0) <= (session.targetRnR || 15);
    const passedAccuracy = (session.avgAccuracyGap || 0) <= (session.targetAccuracy || 5);

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
                    <h1 className="text-3xl font-black text-white tracking-tighter">Calibration Results</h1>
                    <p className="text-slate-400 font-medium">Performance analysis and rater alignment metrics.</p>
                </div>
                <div className="ml-auto">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-slate-300 transition-all">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Overall Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn(
                        "glass p-8 rounded-[2.5rem] border relative overflow-hidden",
                        passedRnR ? "border-emerald-500/20" : "border-rose-500/20"
                    )}
                >
                    <div className={cn("absolute top-0 right-0 p-4", passedRnR ? "text-emerald-500/20" : "text-rose-500/20")}>
                        <BarChart3 className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg", passedRnR ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                                {passedRnR ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Gage R&R</span>
                        </div>
                        <h2 className="text-5xl font-black text-white mb-1">
                            {session.calculatedRnR?.toFixed(2)}<span className="text-2xl text-slate-500">%</span>
                        </h2>
                        <p className={cn("font-medium", passedRnR ? "text-emerald-400" : "text-rose-400")}>
                            {passedRnR ? 'Within Acceptable Range' : 'Exceeds Variability Threshold'}
                            <span className="text-slate-500 ml-2">(Target: ≤ {session.targetRnR}%)</span>
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "glass p-8 rounded-[2.5rem] border relative overflow-hidden",
                        passedAccuracy ? "border-emerald-500/20" : "border-rose-500/20"
                    )}
                >
                    <div className={cn("absolute top-0 right-0 p-4", passedAccuracy ? "text-emerald-500/20" : "text-rose-500/20")}>
                        <Target className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg", passedAccuracy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                                {passedAccuracy ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Accuracy Gap</span>
                        </div>
                        <h2 className="text-5xl font-black text-white mb-1">
                            {session.avgAccuracyGap?.toFixed(1)}<span className="text-2xl text-slate-500">pts</span>
                        </h2>
                        <p className={cn("font-medium", passedAccuracy ? "text-emerald-400" : "text-rose-400")}>
                            {passedAccuracy ? 'Strong Alignment' : 'Alignment Required'}
                            <span className="text-slate-500 ml-2">(Target: ≤ {session.targetAccuracy} pts)</span>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Rater Details Table */}
            <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        Rater Breakdown
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-xs font-bold uppercase tracking-widest text-slate-500">
                                <th className="p-6">Rater</th>
                                <th className="p-6 text-center">R&R Score</th>
                                <th className="p-6 text-center">Accuracy Gap</th>
                                <th className="p-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {results?.map((res: any, i: number) => {
                                // We assume 'res' has user details or we need to join it.
                                // The backend returns CalibrationResult which likely has userId, but maybe not joined User object depending on query.
                                // The Controller's getSessionResults endpoint:
                                // return { session: ..., results: session.results }
                                // It does NOT explicitly include User relation in `session.results`.
                                // However, in `CalibrationService` `calculateResults`, we created `CalibrationResult` entries.
                                // We might need to look up the name from `session.participants`.

                                const participant = session.participants?.find((p: any) => p.userId === res.userId);
                                const name = participant?.user?.name || 'Unknown Rater';
                                const passed = res.passedRnR && res.passedAccuracy;

                                return (
                                    <tr key={res.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-bold text-white">{name}</td>
                                        <td className="p-6 text-center">
                                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold",
                                                res.passedRnR ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                            )}>
                                                {res.calculatedRnR?.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold",
                                                res.passedAccuracy ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                            )}>
                                                {res.avgAccuracyGap?.toFixed(1)} pts
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            {passed ? (
                                                <span className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> Certified
                                                </span>
                                            ) : (
                                                <span className="text-rose-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1">
                                                    <XCircle className="w-4 h-4" /> Coaching Needed
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
