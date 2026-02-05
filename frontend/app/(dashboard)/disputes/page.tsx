'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ExternalLink,
    Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DisputesPage() {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            const res = await api.get('/disputes');
            setDisputes(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load disputes');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'PENDING_QA_TL_REVIEW': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'CLOSED_VALID': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'CLOSED_INVALID':
            case 'CLOSED_REJECTED': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dispute Management</h1>
                <p className="text-gray-400 mt-1">Review and resolve agent-raised audit disputes.</p>
            </div>

            <div className="flex gap-4 items-center bg-[#111113] p-2 rounded-xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        className="w-full bg-[#0a0a0b] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                        placeholder="Search disputes, audit IDs..."
                    />
                </div>
            </div>

            <div className="bg-[#111113] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/[0.02]">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Audit Info</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Raiser</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Reason</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : disputes.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                                    No active disputes found.
                                </td>
                            </tr>
                        ) : (
                            disputes.map((dispute, idx) => (
                                <tr key={dispute.id} className="hover:bg-white/[0.01] transition-all group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">#{dispute.audit.sampledTicket?.ticket?.externalTicketId || 'AUDIT'}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Score: {dispute.audit.score || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {dispute.raiser?.name || 'Agent'}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-xs text-gray-400 line-clamp-1 italic">"{dispute.reason}"</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                            getStatusColor(dispute.status)
                                        )}>
                                            {dispute.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
