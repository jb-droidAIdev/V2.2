'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Shield,
    AlertCircle,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { CalibrationService, CalibrationAnchor } from '../../services/calibration-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AnchorValidationPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;

    const [anchors, setAnchors] = useState<CalibrationAnchor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnchor, setSelectedAnchor] = useState<CalibrationAnchor | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAnchors();
    }, [sessionId]);

    const fetchAnchors = async () => {
        try {
            const data = await CalibrationService.getSessionAnchors(sessionId);
            setAnchors(data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load anchors');
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidation = async (approved: boolean) => {
        if (!selectedAnchor) return;
        if (!approved && !rejectionReason) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsSubmitting(true);
        try {
            await CalibrationService.validateAnchor(selectedAnchor.id, approved, approved ? undefined : rejectionReason);
            toast.success(approved ? 'Anchor approved' : 'Anchor rejected');
            setSelectedAnchor(null);
            setRejectionReason('');
            fetchAnchors(); // Refresh list
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Validation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

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
                    <h1 className="text-3xl font-black text-white tracking-tighter">Anchor Validation</h1>
                    <p className="text-slate-400 font-medium">Review and approve accuracy anchor tickets.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {anchors.map((anchor, i) => (
                    <motion.div
                        key={anchor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "glass p-6 rounded-[2rem] border relative overflow-hidden group hover:border-blue-500/30 transition-all cursor-pointer",
                            anchor.status === 'VALIDATED' ? "border-emerald-500/20" :
                                anchor.status === 'REJECTED' ? "border-red-500/20" :
                                    "border-white/5"
                        )}
                        onClick={() => setSelectedAnchor(anchor)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                anchor.scoreRange === 'HIGH' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    anchor.scoreRange === 'MID' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                                {anchor.scoreRange} Range
                            </div>
                            {anchor.status === 'VALIDATED' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                            {anchor.status === 'REJECTED' && <XCircle className="w-5 h-5 text-red-400" />}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Audit Score</p>
                                <p className="text-4xl font-black text-white">{anchor.score}%</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className={cn("p-2 rounded-xl text-center border",
                                    anchor.qaTlApproved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-slate-500"
                                )}>
                                    <p className="text-[10px] font-bold uppercase">QA TL</p>
                                    <div className="flex justify-center mt-1">
                                        {anchor.qaTlApproved ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current opacity-20" />}
                                    </div>
                                </div>
                                <div className={cn("p-2 rounded-xl text-center border",
                                    anchor.amSdmApproved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/5 text-slate-500"
                                )}>
                                    <p className="text-[10px] font-bold uppercase">AM / SDM</p>
                                    <div className="flex justify-center mt-1">
                                        {anchor.amSdmApproved ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-current opacity-20" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Validation Modal */}
            <AnimatePresence>
                {selectedAnchor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Review Anchor</h2>
                                    <p className="text-slate-400 font-medium text-sm">Audit ID: {selectedAnchor.auditId}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedAnchor(null)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-400">Target Range</span>
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase text-white",
                                        selectedAnchor.scoreRange === 'HIGH' ? "bg-emerald-500" :
                                            selectedAnchor.scoreRange === 'MID' ? "bg-amber-500" : "bg-rose-500"
                                    )}>{selectedAnchor.scoreRange}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-400">Actual Score</span>
                                    <span className="text-2xl font-black text-white">{selectedAnchor.score}%</span>
                                </div>
                                {selectedAnchor.status === 'REJECTED' && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                        <p className="font-bold mb-1">Rejection Reason:</p>
                                        <p>{selectedAnchor.rejectionReason}</p>
                                    </div>
                                )}
                            </div>

                            {selectedAnchor.status !== 'VALIDATED' && selectedAnchor.status !== 'REJECTED' && (
                                <div className="space-y-4">
                                    <textarea
                                        placeholder="If rejecting, please provide a reason..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 resize-none placeholder:text-slate-600"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleValidation(false)}
                                            disabled={isSubmitting}
                                            className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl font-bold transition-all disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleValidation(true)}
                                            disabled={isSubmitting}
                                            className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 flex justify-center gap-2"
                                        >
                                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(selectedAnchor.status === 'VALIDATED' || selectedAnchor.status === 'REJECTED') && (
                                <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl text-center font-bold text-sm">
                                    This anchor has already been {selectedAnchor.status.toLowerCase()}.
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
