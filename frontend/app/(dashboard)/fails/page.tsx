'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FailedAuditsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [failures, setFailures] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFailures = async () => {
            try {
                const query = searchParams.toString();
                const response = await api.get(`/audits/failures${query ? `?${query}` : ''}`);
                setFailures(response.data);
            } catch (err) {
                console.error('Failed to fetch failures:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFailures();
    }, [searchParams]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-2">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-black text-rose-500 tracking-tighter">Critical Fails</h1>
                    <p className="text-slate-400 font-medium">Detailed log of failed evaluation parameters for selected campaigns.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
                    <p className="text-slate-400 font-medium animate-pulse">Retrieving Opportunities...</p>
                </div>
            ) : (
                <div className="glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <th className="py-4 pl-4">Agent Name</th>
                                    <th className="py-4">Ticket ID</th>
                                    <th className="py-4">Campaign</th>
                                    <th className="py-4">Form Category</th>
                                    <th className="py-4">Parameter</th>
                                    <th className="py-4">Auditor Remarks</th>
                                    <th className="py-4 pr-4 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {failures.flatMap((audit: any) =>
                                    audit.scores.map((score: any, idx: number) => (
                                        <tr key={`${audit.id}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 pl-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold text-xs">
                                                        {audit.agent?.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-200 text-xs">{audit.agent?.name}</span>
                                                        <span className="text-[10px] text-slate-500 font-medium">{audit.agent?.employeeTeam || 'Unassigned'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className="font-mono text-xs text-blue-400 font-bold">
                                                    {audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-xs font-bold text-slate-300">{audit.campaign?.name}</span>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
                                                    {score.criterion?.categoryName || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[200px]">
                                                <span className="text-xs font-bold text-rose-300 block break-words" title={score.criterion?.title}>
                                                    {score.criterion?.title || 'Unknown Parameter'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[300px]">
                                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                                                    <p className="text-[10px] text-rose-200/80 font-medium italic leading-relaxed whitespace-pre-wrap">
                                                        "{score.comment || 'No remarks provided'}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <span className="text-rose-500 font-black text-sm">{audit.score}%</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {failures.length === 0 && (
                        <div className="py-40 text-center glass rounded-[2rem] border-dashed border-white/10 mt-8">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">No Critical Failures</h3>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Great job! All parameters are clean.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
