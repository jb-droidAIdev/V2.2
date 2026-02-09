'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import InitialsContainer from '@/components/InitialsContainer';

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
                    <h1 className="text-4xl font-black text-rose-500 tracking-tighter">Critical Errors</h1>
                    <p className="text-slate-400 font-medium">Detailed log of evaluation errors for selected campaigns.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
                    <p className="text-slate-400 font-medium animate-pulse">Retrieving Errors...</p>
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
                                    <th className="py-4 pr-4 text-center">Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {failures.flatMap((audit: any) =>
                                    audit.scores.map((score: any, idx: number) => (
                                        <tr key={`${audit.id}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 pl-4">
                                                <div className="flex items-center gap-3">
                                                    <InitialsContainer
                                                        name={audit.agent?.name}
                                                        role="AGENT"
                                                        size="sm"
                                                    />
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
                                                    {score.categoryLabel || score.criterion?.categoryName || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[200px]">
                                                <span className="text-xs font-bold text-rose-300 block break-words" title={score.criterionTitle || score.criterion?.title}>
                                                    {score.criterionTitle || score.criterion?.title || 'Unknown Parameter'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[300px]">
                                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                                                    <p className="text-[10px] text-rose-200/80 font-medium italic leading-relaxed whitespace-pre-wrap">
                                                        "{score.comment || 'No remarks provided'}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-center">
                                                {(() => {
                                                    const cat = score.categoryLabel || score.criterion?.categoryName;
                                                    const impactMap: Record<string, { label: string, style: string }> = {
                                                        'Customer Critical': { label: 'Customer Impacting', style: 'bg-rose-500/20 text-rose-400 border-rose-500/20' },
                                                        'Process Critical': { label: 'Process Defect', style: 'bg-amber-500/20 text-amber-400 border-amber-500/20' },
                                                        'Business Critical': { label: 'Business Impacting', style: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
                                                        'Compliance Critical': { label: '', style: '' },
                                                        'Non Critical': { label: 'Standard Defect', style: 'bg-slate-500/20 text-slate-400 border-slate-500/20' }
                                                    };
                                                    const config = impactMap[cat] || { label: 'Critical Error', style: 'bg-slate-500/20 text-slate-400 border-slate-500/20' };

                                                    if (!config.label) return null;

                                                    return (
                                                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider whitespace-nowrap ${config.style}`}>
                                                            {config.label}
                                                        </span>
                                                    );
                                                })()}
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
                            <h3 className="text-white font-bold text-lg mb-2">No Critical Errors</h3>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Great job! All parameters are clean.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
