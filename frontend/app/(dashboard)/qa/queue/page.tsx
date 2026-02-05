'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Search,
    Clock,
    User,
    Hash,
    Filter,
    ArrowRight,
    Loader2,
    X,
    FileText,
    ChevronRight,
    CheckCircle2,
    Check,
    AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function QAQueuePage() {
    const router = useRouter();
    const [queue, setQueue] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form Selection State
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [availableForms, setAvailableForms] = useState<any[]>([]);
    const [isLoadingForms, setIsLoadingForms] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await api.get('/qa/queue');
            setQueue(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuditClick = async (item: any) => {
        setSelectedTicket(item);
        setIsFormModalOpen(true);
        setIsLoadingForms(true);
        try {
            // Fetch forms filtered by campaign or team
            const res = await api.get(`/forms/available`, {
                params: {
                    campaignId: item.campaignId,
                    teamName: item.ticket.agentId // Assuming agentId might be tied to a team or we check by ticket info
                    // The user said: "only the forms associated with that SAME campaign or team"
                }
            });
            setAvailableForms(res.data);
            if (res.data.length === 1) {
                setSelectedFormId(res.data[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingForms(false);
        }
    };

    const handleStartAudit = async () => {
        if (!selectedFormId || !selectedTicket) return;

        const form = availableForms.find(f => f.id === selectedFormId);
        const activeVersion = form?.versions?.find((v: any) => v.isActive);

        if (!activeVersion) {
            toast.error('This form has no active version to audit with.');
            return;
        }

        try {
            const res = await api.post(`/audits/start/${selectedTicket.id}`, {
                formVersionId: activeVersion.id,
                campaignId: selectedTicket.campaignId
            });
            router.push(`/qa/audit/${res.data.id}`);
            toast.success('Audit session initialized');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start audit');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Audit Queue</h1>
                    <p className="text-slate-400 mt-1 font-medium">Select a ticket from your assigned samples to begin evaluation.</p>
                </div>
                <div className="flex items-center gap-3 backdrop-blur-md bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Collection</span>
                </div>
            </div>

            <div className="flex gap-4 items-center bg-[#111113] p-2 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        className="w-full bg-[#0a0a0b] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 font-medium"
                        placeholder="Search tickets, agents..."
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5">
                    <Filter className="w-4 h-4" />
                    Filters
                </button>
            </div>

            <div className="bg-[#111113] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Ticket Identity</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Agent Reference</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Capture Date</th>
                            <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Operations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Engine...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : queue.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="max-w-xs mx-auto">
                                        <ClipboardList className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                                        <h3 className="text-lg font-bold text-white mb-2">Queue is Clear</h3>
                                        <p className="text-sm text-slate-500 font-medium">All assigned samples have been processed or none are available.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            queue.map((item, idx) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-white/[0.02] transition-all group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                                <Hash className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <span className="font-black text-white group-hover:text-blue-400 transition-colors block leading-tight">
                                                    {item.ticket.externalTicketId}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Reference #{item.id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                {item.ticket.agentId[0]}
                                            </div>
                                            <span className="text-sm font-bold text-slate-300">{item.ticket.agentId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-medium">{new Date(item.ticket.interactionDate).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => handleAuditClick(item)}
                                            className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-blue-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all group/btn"
                                        >
                                            Evaluate
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form Selection Modal */}
            <AnimatePresence>
                {isFormModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFormModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#161618] border border-white/10 rounded-[2.5rem] w-full max-w-lg relative z-10 overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">Select Scorecard</h3>
                                    <p className="text-slate-500 text-xs mt-1 font-medium">Choose from strategy-approved forms.</p>
                                </div>
                                <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 bg-[#161618]">
                                {isLoadingForms ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mapping Available Forms...</p>
                                    </div>
                                ) : availableForms.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                                        <p className="text-white font-bold mb-2">No Matching Forms Found</p>
                                        <p className="text-sm text-slate-500">There are no forms registered for this configuration's campaign or team.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {availableForms.map(form => (
                                            <button
                                                key={form.id}
                                                onClick={() => setSelectedFormId(form.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-5 rounded-[1.5rem] border transition-all text-left",
                                                    selectedFormId === form.id
                                                        ? "bg-blue-600/10 border-blue-500/50 shadow-lg"
                                                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                                        selectedFormId === form.id ? "bg-blue-500 text-white shadow-lg shadow-blue-500/50" : "bg-white/5 text-slate-500"
                                                    )}>
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white tracking-tight leading-none mb-1">{form.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                            {form.versions?.[0]?._count?.criteria || 0} Criteria • Ready
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedFormId === form.id && <Check className="w-5 h-5 text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-[#1c1c1e] border-t border-white/5">
                                <button
                                    disabled={!selectedFormId || isLoadingForms}
                                    onClick={handleStartAudit}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:grayscale rounded-2xl text-white font-black transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Initialize Evaluation
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
