'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Save,
    Send,
    AlertCircle,
    CheckCircle2,
    Info,
    Clock,
    User,
    Ticket,
    ChevronDown,
    ChevronUp,
    Loader2,
    Undo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';
import { toast } from 'sonner';
import ConfirmModal from '@/components/modals/ConfirmModal';

export default function AuditExecutionPage() {
    const { id } = useParams();
    const router = useRouter();
    const [audit, setAudit] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Scoring state
    const [scores, setScores] = useState<Record<string, { score: number; comment: string }>>({});
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchAudit();
    }, [id]);

    const fetchAudit = async () => {
        try {
            // In the backend, AuditService.findOne(id) returns the audit with formVersion and criteria
            const res = await api.get(`/audits/${id}`);
            setAudit(res.data);

            // Initialize scores and fields from existing data if any
            const initialScores: any = {};
            res.data.scores?.forEach((s: any) => {
                initialScores[s.criterionId] = {
                    score: Number(s.score),
                    comment: s.comment || ''
                };
            });
            setScores(initialScores);

            const initialFields: any = {};
            res.data.fieldValues?.forEach((f: any) => {
                initialFields[f.fieldName] = f.value;
            });
            setFieldValues(initialFields);

            // Expand first category by default
            if (res.data.formVersion?.criteria?.[0]) {
                setExpandedCategories([res.data.formVersion.criteria[0].categoryId]);
            }
        } catch (err) {
            console.error(err);
            router.push('/qa/queue');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScoreChange = (criterionId: string, score: number) => {
        const newScores = { ...scores, [criterionId]: { ...scores[criterionId], score } };
        setScores(newScores);
        debouncedAutosave(fieldValues, newScores);
    };

    const handleCommentChange = (criterionId: string, comment: string) => {
        const newScores = { ...scores, [criterionId]: { ...scores[criterionId], comment } };
        setScores(newScores);
        debouncedAutosave(fieldValues, newScores);
    };

    const handleFieldChange = (name: string, value: string) => {
        const newFields = { ...fieldValues, [name]: value };
        setFieldValues(newFields);
        debouncedAutosave(newFields, scores);
    };

    const debouncedAutosave = useCallback(
        debounce(async (fields: any, scoresObj: any) => {
            setIsSaving(true);
            try {
                const scoresArray = Object.entries(scoresObj).map(([cid, val]: any) => ({
                    criterionId: cid,
                    score: Number(val.score),
                    comment: val.comment || ''
                }));
                await api.patch(`/audits/${id}/autosave`, {
                    fieldValues: fields,
                    scores: scoresArray
                });
            } catch (err) {
                console.error('Autosave failed', err);
            } finally {
                setIsSaving(false);
            }
        }, 2000),
        [id]
    );

    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [highlightedFields, setHighlightedFields] = useState<string[]>([]);

    const handleSubmit = async () => {
        // Prevent multiple rapid submissions
        if (isSaving) return;

        const errors: string[] = [];
        const missingCommentIds: string[] = [];
        const categoriesToExpand: string[] = [];

        // 1. Check all criteria
        if (audit?.formVersion?.criteria) {
            audit.formVersion.criteria.forEach((item: any) => {
                const scoreData = scores[item.id];

                // First: ensure it's actually scored
                if (scoreData?.score === undefined || scoreData?.score === null) {
                    errors.push(`Scoring required for: ${item.title}`);
                    missingCommentIds.push(item.id);
                    if (!categoriesToExpand.includes(item.categoryId)) {
                        categoriesToExpand.push(item.categoryId);
                    }
                    return; // Skip further checks for this item
                }

                // Second: if scored as No (0), require detailed remarks (min 10 chars)
                // STRICT CHECK: Handle potential string '0' or float 0.0
                const numericScore = Number(scoreData.score);
                if (!isNaN(numericScore) && numericScore < 0.01) {
                    const comment = scoreData.comment?.trim() || '';
                    if (comment.length < 10) {
                        errors.push(`Detailed remark (min 10 chars) required for: ${item.title}`);
                        missingCommentIds.push(item.id);
                        if (!categoriesToExpand.includes(item.categoryId)) {
                            categoriesToExpand.push(item.categoryId);
                        }
                    }
                }
            });
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            setHighlightedFields(missingCommentIds);

            // Show only the FIRST error to avoid multiple toasts
            toast.error(errors[0]);

            // Ensure categories are open so we can scroll to them
            if (categoriesToExpand.length > 0) {
                setExpandedCategories(prev => [...new Set([...prev, ...categoriesToExpand])]);
            }

            // Requirement: Route to the fields that were blank
            // Wait longer to ensure category expansion animation completes
            setTimeout(() => {
                const firstErrorId = missingCommentIds[0];
                console.log('Attempting to scroll to:', `criterion-${firstErrorId}`);
                const element = document.getElementById(`criterion-${firstErrorId}`);
                console.log('Element found:', element);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    console.log('Scrolled to element');

                    // Also try to focus the textarea if it exists
                    const textarea = element.querySelector('textarea');
                    if (textarea) {
                        textarea.focus();
                        console.log('Focused textarea');
                    }
                } else {
                    console.error('Element not found in DOM');
                }
            }, 800);

            // Clear highlighting after 5 seconds (increased from 3)
            setTimeout(() => {
                setHighlightedFields(prev => prev.filter(id => !missingCommentIds.includes(id)));
            }, 5000);

            return;
        }

        setConfirmConfig({
            isOpen: true,
            title: 'Submit Audit',
            message: 'Are you sure you want to finalize this audit? This action cannot be undone and the results will be released to the agent.',
            variant: 'info',
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    // Force Save current state to ensure DB is consistent before submission
                    // This prevents race condition where latest scores aren't in DB yet
                    const scoresArray = Object.entries(scores).map(([cid, val]: any) => ({
                        criterionId: cid,
                        score: Number(val.score),
                        comment: val.comment || ''
                    }));

                    await api.patch(`/audits/${id}/autosave`, {
                        fieldValues,
                        scores: scoresArray
                    });

                    // Proceed to Submit
                    await api.post(`/audits/${id}/submit`);
                    toast.success('Audit submitted successfully');
                    router.push('/qa/queue');
                } catch (err: any) {
                    console.error(err);
                    // Don't show toast for validation errors - frontend already handled them
                    const errorMsg = err.response?.data?.message || 'Failed to submit audit';
                    const isValidationError = errorMsg.includes('required') ||
                        errorMsg.includes('incomplete') ||
                        errorMsg.includes('Detailed remarks');

                    if (!isValidationError) {
                        toast.error(errorMsg);
                    }
                    // If validation error, the confirmation dialog will close and user sees frontend validation
                    setConfirmConfig({ ...confirmConfig, isOpen: false });
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    const criteriaByCategory = useMemo(() => {
        if (!audit?.formVersion?.criteria) return {};
        return audit.formVersion.criteria.reduce((acc: any, curr: any) => {
            if (!acc[curr.categoryId]) acc[curr.categoryId] = { name: curr.categoryName, items: [] };
            acc[curr.categoryId].items.push(curr);
            return acc;
        }, {});
    }, [audit]);

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev =>
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        );
    };

    const calculateTotal = () => {
        const values = Object.values(scores);
        if (values.length === 0) return 0;
        const earned = values.reduce((acc, curr) => acc + curr.score, 0);
        return earned;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 sticky top-0 z-40 bg-[#0a0a0b]/80 backdrop-blur-md py-4 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full transition-all">
                        <Undo2 className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Ticket className="w-6 h-6 text-blue-500" />
                            Audit: {audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'N/A'}
                        </h1>
                        <div className="flex gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> Agent: {audit.agent?.name || audit.sampledTicket?.ticket?.agentId}</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Date: {audit.sampledTicket?.ticket?.interactionDate
                                    ? new Date(audit.sampledTicket.ticket.interactionDate).toLocaleDateString()
                                    : audit.fieldValues?.find((f: any) => f.fieldName === 'interactionDate')?.value || new Date(audit.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg border border-white/5">
                        {isSaving ? (
                            <span className="text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                            </span>
                        ) : (
                            <span className="text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                                <Save className="w-3 h-3" /> All saved
                            </span>
                        )}
                    </div>
                    <div className="text-right mr-4">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Running Score</p>
                        <p className="text-2xl font-black text-blue-500 leading-none">{calculateTotal()}</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        Submit Audit
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Metadata & Form Fields */}
                <div className="space-y-6">
                    <section className="glass p-6 rounded-2xl border border-white/5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Metadata
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-500 font-medium">Interaction Channel</label>
                                <input
                                    value={fieldValues['channel'] || ''}
                                    onChange={e => handleFieldChange('channel', e.target.value)}
                                    className="w-full bg-[#0a0a0b] border border-white/5 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Inbound Voice"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-500 font-medium">Customer Sentiment</label>
                                <select
                                    value={fieldValues['sentiment'] || ''}
                                    onChange={e => handleFieldChange('sentiment', e.target.value)}
                                    className="w-full bg-[#0a0a0b] border border-white/5 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select Sentiment</option>
                                    <option value="Positive">Positive</option>
                                    <option value="Neutral">Neutral</option>
                                    <option value="Negative">Negative</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="glass p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Campaign Notes</h3>
                        </div>
                        <p className="text-xs text-gray-500 italic">
                            Check for Pareto-ready categories. Ensure soft skills are evaluated with empathy in mind.
                        </p>
                    </section>
                </div>

                {/* Right: Scoring Form */}
                <div className="md:col-span-2 space-y-6">
                    {Object.entries(criteriaByCategory).map(([catId, cat]: any) => {
                        const isExpanded = expandedCategories.includes(catId);
                        return (
                            <div key={catId} className="glass rounded-2xl border border-white/5 overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(catId)}
                                    className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs">
                                            {cat.items.length}
                                        </div>
                                        <h3 className="font-bold text-lg">{cat.name}</h3>
                                    </div>
                                    {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: 'auto' }}
                                            exit={{ height: 0 }}
                                            className="overflow-hidden border-t border-white/5"
                                        >
                                            <div className="divide-y divide-white/5">
                                                {cat.items.map((item: any) => (
                                                    <div key={item.id} id={`criterion-${item.id}`} className={cn(
                                                        "p-6 space-y-4 hover:bg-white/[0.01] transition-all relative",
                                                        highlightedFields.includes(item.id) && "bg-rose-500/5 ring-1 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                                                    )}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1 max-w-[70%]">
                                                                <h4 className="font-bold text-gray-200">{item.title}</h4>
                                                                <p className="text-xs text-gray-500">{item.description}</p>
                                                            </div>
                                                            <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                                                                {[0, 1, 3, 5].map(pts => (
                                                                    <button
                                                                        key={pts}
                                                                        onClick={() => handleScoreChange(item.id, pts)}
                                                                        className={cn(
                                                                            "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                                                                            scores[item.id]?.score === pts
                                                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                                                                : "text-gray-500 hover:text-white hover:bg-white/5"
                                                                        )}
                                                                    >
                                                                        {pts}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="relative group">
                                                            <textarea
                                                                value={scores[item.id]?.comment || ''}
                                                                onChange={e => {
                                                                    handleCommentChange(item.id, e.target.value);
                                                                    if (highlightedFields.includes(item.id)) {
                                                                        setHighlightedFields(prev => prev.filter(id => id !== item.id));
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full bg-black/20 border rounded-xl p-3 text-xs text-gray-300 placeholder:text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none transition-all",
                                                                    highlightedFields.includes(item.id) ? "border-rose-500/50" : "border-white/5"
                                                                )}
                                                                placeholder={scores[item.id]?.score === 0 ? "Detailed Remarks (min 10 chars)..." : "Add observations or coaching tips..."}
                                                                rows={2}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
            />
        </div>
    );
}
