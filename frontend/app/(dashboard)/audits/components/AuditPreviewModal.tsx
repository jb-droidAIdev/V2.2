import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, History, Reply, MessageSquareQuote, CheckCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInBusinessDays } from 'date-fns';
import { getStatusColor } from './utils';

interface AuditPreviewModalProps {
    previewTarget: any;
    onClose: () => void;
    userRole: string;
    disputeInfo: any;
    isFilingDispute: boolean;
    setIsFilingDispute: (val: boolean) => void;
    disputeForm: any;
    setDisputeForm: (val: any) => void;
    onRaiseDispute: () => void;
    onVerdict: (itemId: string, verdict: string, stage: 'qa' | 'final') => void;
    onReappeal: () => void;
}

export default function AuditPreviewModal({
    previewTarget,
    onClose,
    userRole,
    disputeInfo,
    isFilingDispute,
    setIsFilingDispute,
    disputeForm,
    setDisputeForm,
    onRaiseDispute,
    onVerdict,
    onReappeal
}: AuditPreviewModalProps) {
    if (!previewTarget) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 30 }}
                    className="relative w-full max-w-[1400px] max-h-[90vh] bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-black text-white tracking-tight">Audit Details</h2>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        getStatusColor(previewTarget.status)
                                    )}>
                                        {previewTarget.status}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs font-medium">Session ID: {previewTarget.id}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Reference</p>
                                <p className="text-base font-bold text-white">{previewTarget.sampledTicket?.ticket?.externalTicketId || previewTarget.ticketReference || 'N/A'}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Agent</p>
                                <p className="text-base font-bold text-white">{previewTarget.agent?.name}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Auditor</p>
                                <p className="text-base font-bold text-white">{previewTarget.auditor?.name}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Score</p>
                                <p className={cn("text-base font-black", previewTarget.score >= 90 ? "text-emerald-400" : previewTarget.score >= 70 ? "text-amber-400" : "text-rose-400")}>{previewTarget.score}%</p>
                            </div>
                        </div>

                        {/* Evaluation Form - Section Based */}
                        <div className="space-y-12">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-8 border-b border-white/5 pb-4">
                                Evaluation Breakdown
                            </h3>

                            {(() => {
                                // Group criteria by category
                                const groupedCriteria: Record<string, any[]> = {};
                                previewTarget.formVersion?.criteria?.forEach((c: any) => {
                                    const catName = c.categoryName || 'General';
                                    if (!groupedCriteria[catName]) groupedCriteria[catName] = [];
                                    groupedCriteria[catName].push(c);
                                });

                                return Object.entries(groupedCriteria).map(([categoryName, criteria]) => {
                                    // Collect all milestones hit in THIS audit for this category
                                    const reachedMilestones: number[] = [];
                                    criteria.forEach(c => {
                                        const scoreObj = previewTarget.scores?.find((s: any) => s.criterionId === c.id);
                                        if (scoreObj?.reachedMilestone) {
                                            reachedMilestones.push(scoreObj.reachedMilestone);
                                        }
                                    });

                                    const sortedMilestones = [...new Set(reachedMilestones)].sort((a, b) => a - b);

                                    const getSanctionLabel = (count: number) => {
                                        if (userRole === 'AGENT') return 'ZTP ACTIVE';

                                        let label = '';
                                        if (count === 15) label = 'TERMINATION';
                                        else if (count === 12) label = '5D SUSPENSION';
                                        else if (count === 9) label = '3D SUSPENSION';
                                        else if (count === 6) label = 'FINAL WRITTEN WARNING';
                                        else if (count === 3) label = 'WRITTEN WARNING';

                                        return label ? label : null;
                                    };

                                    return (
                                        <div key={categoryName} className="space-y-6">
                                            {/* Category Header with ZTP Badges */}
                                            <div className="flex items-center gap-4 px-2 py-4">
                                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                                <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                                                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                                                        {categoryName}
                                                    </h4>
                                                    {sortedMilestones.map((m) => {
                                                        const label = getSanctionLabel(m);
                                                        return (
                                                            <div
                                                                key={m}
                                                                className={cn(
                                                                    "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] border shadow-lg flex items-center gap-2",
                                                                    m >= 15 ? "bg-red-600/30 text-red-400 border-red-500/50 shadow-red-500/20" :
                                                                        m >= 12 ? "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10" :
                                                                            m >= 9 ? "bg-orange-600/20 text-orange-400 border-orange-500/30 shadow-orange-500/10" :
                                                                                m >= 6 ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10" :
                                                                                    "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-1.5 h-1.5 rounded-full",
                                                                    m >= 15 ? "bg-red-400" :
                                                                        m >= 12 ? "bg-rose-400" :
                                                                            m >= 9 ? "bg-orange-400" :
                                                                                m >= 6 ? "bg-amber-400" :
                                                                                    "bg-blue-400"
                                                                )} />
                                                                <span>{label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent" />
                                            </div>

                                            {/* Parameters in this Category */}
                                            <div className="grid grid-cols-1 gap-4">
                                                {criteria.map((criterion: any) => {
                                                    const scoreObj = previewTarget.scores?.find((s: any) => s.criterionId === criterion.id);
                                                    const isFailed = scoreObj?.isFailed;
                                                    const isNA = scoreObj?.score === -1;
                                                    const isYes = !isFailed && !isNA;

                                                    return (
                                                        <div key={criterion.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.03] transition-all">
                                                            <div className="flex flex-col md:flex-row gap-6">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5">
                                                                            {criterion.orderIndex + 1}
                                                                        </span>
                                                                        <h4 className="text-sm font-bold text-slate-200">{criterion.title}</h4>

                                                                        {/* Challenge Toggle */}
                                                                        {!isYes && !isNA && !disputeInfo && (userRole === 'ADMIN' || userRole === 'OPS_TL' || userRole === 'OPS_MANAGER' || userRole === 'SDM' || userRole === 'QA_MANAGER') && (
                                                                            <button
                                                                                onClick={() => setIsFilingDispute(true)}
                                                                                className="ml-2 p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all group/challenge"
                                                                                title="Challenge this parameter"
                                                                            >
                                                                                <Reply className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-slate-500 leading-relaxed max-w-4xl">{criterion.description}</p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                                    <div className={cn(
                                                                        "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm",
                                                                        isYes ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                                            isNA ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                                                                                "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5"
                                                                    )}>
                                                                        {isYes ? 'YES' : isNA ? 'N/A' : 'NO'}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-600">{scoreObj?.score ?? 0} / {criterion.weight} pts</span>
                                                                </div>
                                                            </div>

                                                            {/* Dispute Filing Textarea */}
                                                            {isFilingDispute && !isYes && !isNA && (
                                                                <div className="mt-4 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                                    <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                                        <MessageSquareQuote className="w-3 h-3" /> Dispute Reason (Min 30 chars)
                                                                    </label>
                                                                    <textarea
                                                                        value={disputeForm[criterion.id] || ''}
                                                                        onChange={(e) => setDisputeForm({ ...disputeForm, [criterion.id]: e.target.value })}
                                                                        placeholder="Detail why you disagree with this finding..."
                                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500/50 min-h-[80px]"
                                                                    />
                                                                    <div className="flex justify-end">
                                                                        <span className={cn("text-[9px] font-bold", (disputeForm[criterion.id]?.length || 0) < 30 ? "text-rose-400" : "text-emerald-400")}>
                                                                            {(disputeForm[criterion.id]?.length || 0)} / 30
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {scoreObj?.comment && (
                                                                <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 italic text-sm text-slate-400 flex gap-3">
                                                                    <div className="w-1 h-full bg-blue-500/40 rounded-full shrink-0" />
                                                                    "{scoreObj.comment}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Dispute Status & History Panel */}
                        {disputeInfo && (
                            <div className="space-y-6 border-t border-white/5 pt-8 mt-8">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Dispute History</h3>

                                <div className="space-y-4">
                                    {disputeInfo.items.map((item: any) => (
                                        <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-bold text-white">{item.criterion.title}</h4>
                                                <div className="flex items-center gap-3">
                                                    {item.finalVerdict ? (
                                                        <>
                                                            <span className={cn("text-xs font-bold uppercase px-3 py-1.5 rounded-lg border tracking-wide", item.finalVerdict === 'ACCEPTED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30")}>
                                                                {item.finalVerdict}
                                                            </span>
                                                            {item.finalizedAt && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDistanceToNow(new Date(item.finalizedAt), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : item.qaVerdict && (
                                                        <>
                                                            <span className={cn("text-xs font-bold uppercase px-3 py-1.5 rounded-lg border tracking-wide", item.qaVerdict === 'ACCEPTED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30")}>
                                                                {item.qaVerdict}
                                                            </span>
                                                            {item.qaReviewedAt && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDistanceToNow(new Date(item.qaReviewedAt), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Stage 1: Initial Challenge */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase">Initial Challenge</p>
                                                        {disputeInfo.createdAt && (
                                                            <span className="text-[10px] text-slate-500 font-medium">
                                                                {formatDistanceToNow(new Date(disputeInfo.createdAt), { addSuffix: true })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="bg-black/20 p-4 rounded-2xl text-sm text-slate-300 border border-white/5 leading-relaxed min-h-[120px]">
                                                        {item.reason}
                                                    </div>
                                                    {disputeInfo.raisedBy && (
                                                        <p className="text-xs text-slate-500 font-medium">
                                                            Filed by: <span className="text-slate-400 font-semibold">{disputeInfo.raisedBy.name}</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Stage 2: QA Feedback */}
                                                {item.qaComment && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black text-blue-400 uppercase">QA Response</p>
                                                                {item.qaVerdict && (
                                                                    <span className={cn(
                                                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded border",
                                                                        item.qaVerdict === 'ACCEPTED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                                    )}>
                                                                        {item.qaVerdict}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.qaReviewedAt && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDistanceToNow(new Date(item.qaReviewedAt), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="bg-blue-500/5 p-4 rounded-2xl text-sm text-slate-300 border border-blue-500/10 leading-relaxed min-h-[120px]">
                                                            {item.qaComment}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stage 3: Re-appeal Reason */}
                                                {item.reappealReason && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black text-amber-500 uppercase">Re-appeal Reason</p>
                                                            {item.reappealedAt && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDistanceToNow(new Date(item.reappealedAt), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="bg-amber-500/5 p-4 rounded-2xl text-sm text-slate-300 border border-amber-500/10 leading-relaxed min-h-[120px]">
                                                            {item.reappealReason}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stage 4: Final Feedback */}
                                                {item.finalComment && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-black text-emerald-400 uppercase">Final Verdict Feedback</p>
                                                                {item.finalVerdict && (
                                                                    <span className={cn(
                                                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded border",
                                                                        item.finalVerdict === 'ACCEPTED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                                                    )}>
                                                                        {item.finalVerdict}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.finalizedAt && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    {formatDistanceToNow(new Date(item.finalizedAt), { addSuffix: true })}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="bg-emerald-500/5 p-4 rounded-2xl text-sm text-slate-300 border border-emerald-500/10 leading-relaxed min-h-[120px]">
                                                            {item.finalComment}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Interactive Action Buttons for Stages */}
                                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                                {/* QA Review Stage Actions */}
                                                {!item.qaVerdict && (userRole === 'QA' || userRole === 'QA_TL' || userRole === 'QA_MANAGER') && (
                                                    <>
                                                        <button onClick={() => onVerdict(item.id, 'ACCEPTED', 'qa')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Accept Dispute
                                                        </button>
                                                        <button onClick={() => onVerdict(item.id, 'REJECTED', 'qa')} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2">
                                                            <Ban className="w-3.5 h-3.5" /> Reject Dispute
                                                        </button>
                                                    </>
                                                )}

                                                {/* Admin/QA_TL Final Verdict Stage Actions */}
                                                {!item.finalVerdict && item.reappealReason && (userRole === 'ADMIN' || userRole === 'QA_TL') && (
                                                    <>
                                                        <button onClick={() => onVerdict(item.id, 'ACCEPTED', 'final')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Final Accept
                                                        </button>
                                                        <button onClick={() => onVerdict(item.id, 'REJECTED', 'final')} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2">
                                                            <Ban className="w-3.5 h-3.5" /> Final Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Re-appeal Control at Dispute Level */}
                                    {disputeInfo.status === 'QA_REJECTED' && (userRole === 'ADMIN' || userRole === 'OPS_TL' || userRole === 'OPS_MANAGER' || userRole === 'SDM' || userRole === 'QA_MANAGER') && (
                                        <button
                                            onClick={onReappeal}
                                            className="w-full py-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest rounded-3xl border border-amber-500/20 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Reply className="w-4 h-4" /> Re-appeal to QA Management
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-black/60 flex items-center justify-between shrink-0">
                        {isFilingDispute ? (
                            <>
                                <button
                                    onClick={() => setIsFilingDispute(false)}
                                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10"
                                >
                                    Cancel filing
                                </button>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Ack Deadline</p>
                                        <p className="text-xs font-bold text-white">
                                            {previewTarget.agentAckDeadline ? (
                                                formatDistanceToNow(new Date(previewTarget.agentAckDeadline), { addSuffix: true })
                                            ) : (
                                                "N/A"
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={onRaiseDispute}
                                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-rose-600/20"
                                    >
                                        Raise Dispute
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    {previewTarget.isAutoFailed && (
                                        <div className="flex items-center gap-2 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20">
                                            <Ban className="w-4 h-4 text-rose-500" />
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Auto-Fail Instance</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-600/20"
                                >
                                    Close Review
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
