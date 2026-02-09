import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import InitialsContainer from '@/components/InitialsContainer';
import { getStatusColor } from './utils';

interface AuditTableProps {
    audits: any[];
    isLoading: boolean;
    userRole: string;
    onPreview: (id: string) => void;
    onDelete: (audit: any) => void;
    isLoadingPreview: boolean;
    permissions: string[];
}

export default function AuditTable({
    audits,
    isLoading,
    userRole,
    onPreview,
    onDelete,
    isLoadingPreview,
    permissions = []
}: AuditTableProps) {
    return (
        <div className="bg-[#0f172a]/40 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl min-h-[400px]">
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Reference</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Agent</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-left">Auditor</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Score</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Configuration</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {audits.map((audit, idx) => (
                                <motion.tr
                                    key={audit.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "hover:bg-white/[0.02] transition-colors group relative",
                                        audit.isUnread && "animate-pulse-unread"
                                    )}
                                >
                                    <td className="px-6 py-3.5 relative min-w-[140px]">
                                        {audit.isUnread && (
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="font-mono text-blue-400 font-bold text-xs uppercase tracking-wider">
                                                {audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'N/A'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">#{audit.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-left">
                                        <div className="flex items-center justify-start gap-3">
                                            <InitialsContainer
                                                name={audit.agent.name}
                                                role="AGENT"
                                                size="sm"
                                            />
                                            <div className="flex flex-col items-start min-w-[120px]">
                                                <span className="font-bold text-slate-200 text-xs">{audit.agent.name}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{audit.agent.eid}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-400 font-medium text-xs text-left">
                                        <div className="flex items-center justify-start gap-2">
                                            <InitialsContainer
                                                name={audit.auditor.name}
                                                role={audit.auditor.role || 'QA'}
                                                size="xs"
                                            />
                                            {audit.auditor.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        {audit.score !== null ? (
                                            <div className="flex flex-col items-center justify-center">
                                                <span className={cn(
                                                    "font-black text-sm",
                                                    audit.score >= 90 ? "text-emerald-400" : audit.score >= 70 ? "text-amber-400" : "text-rose-400"
                                                )}>
                                                    {audit.score}%
                                                </span>
                                                {audit.isAutoFailed && (
                                                    <span className="text-[8px] font-black uppercase text-rose-500 tracking-tighter bg-rose-500/10 px-1 rounded flex items-center w-fit">
                                                        Auto Fail
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 italic text-xs">Pending</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center justify-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                getStatusColor(audit.status)
                                            )}>
                                                {audit.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center justify-center">
                                            <span className="text-slate-300 font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-[10px] uppercase">
                                                {audit.campaign.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-400 font-medium text-[10px]">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="text-slate-300">{format(new Date(audit.lastActionAt), 'MMM dd, yyyy')}</span>
                                            <span className="text-slate-500">{format(new Date(audit.lastActionAt), 'HH:mm')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onPreview(audit.id)}
                                                className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                                                title="View Details"
                                                disabled={isLoadingPreview}
                                            >
                                                {isLoadingPreview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                            {(userRole === 'ADMIN' || permissions.includes('AUDIT_DELETE')) && (
                                                <button
                                                    onClick={() => onDelete(audit)}
                                                    className="p-1.5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-colors"
                                                    title="Delete Audit"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
