'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Save,
    Send,
    AlertCircle,
    CheckCircle2,
    Info,
    User,
    Ticket,
    ChevronDown,
    ChevronUp,
    Loader2,
    Undo2,
    Search,
    Play,
    Shield,
    FileText,
    Users,
    Briefcase,
    UserCheck,
    TrendingUp,
    Check,
    X,
    Minus,
    AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';
import ConfirmModal from '@/components/modals/ConfirmModal';

export default function EvaluateCampaignPage() {
    const { campaignId } = useParams();
    const router = useRouter();

    // Data State
    const [form, setForm] = useState<any>(null);
    const [activeVersion, setActiveVersion] = useState<any>(null);
    const [agents, setAgents] = useState<any[]>([]);

    // Selection State
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [agentSearch, setAgentSearch] = useState('');
    const [ticketReference, setTicketReference] = useState('');
    const [interactionDate, setInteractionDate] = useState(new Date().toISOString().split('T')[0]);
    const [disposition, setDisposition] = useState('');
    const [aht, setAht] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Evaluation State
    const [auditId, setAuditId] = useState<string | null>(null);
    const [scores, setScores] = useState<Record<string, {
        score: number;
        comment: string;
        label?: string;
        isFailed?: boolean
    }>>({});
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');

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
        // Get user role
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
        } else {
            router.push('/login');
            return;
        }

        const initialize = async () => {
            await fetchData();
            await checkPendingAudit();
        };

        initialize();
    }, [campaignId]);

    const checkPendingAudit = async () => {
        try {
            const res = await api.get('/audits/active');
            if (res.data) {
                const auditData = res.data;

                // Only resume if it belongs to this campaign
                if (auditData.campaignId !== campaignId) return;

                setAuditId(auditData.id);
                setSelectedAgent(auditData.agent);
                setTicketReference(auditData.ticketReference || '');

                if (auditData.scores) {
                    const resumedScores: any = {};
                    auditData.scores.forEach((s: any) => {
                        let label = 'No';
                        if (s.score === -1) label = 'N/A';
                        else if (s.score > 0) label = 'Yes';
                        // Note: If score is 0 and weight is 0, we default to 'No' for resumption 
                        // unless we start storing the specific choice in DB.
                        resumedScores[s.criterionId] = { score: s.score, comment: s.comment, label };
                    });
                    setScores(resumedScores);
                }

                if (auditData.fieldValues) {
                    auditData.fieldValues.forEach((f: any) => {
                        if (f.fieldName === 'interactionDate') setInteractionDate(f.value);
                        if (f.fieldName === 'disposition') setDisposition(f.value);
                        if (f.fieldName === 'aht') setAht(f.value);
                    });
                }

                toast.info('Resuming your pending evaluation...');
            }
        } catch (err) {
            console.error('Failed to check pending audit:', err);
        }
    };

    const fetchData = async () => {
        try {
            // Fetch Active Form
            const formRes = await api.get(`/forms/campaign/${campaignId}/active`);
            if (!formRes.data) {
                toast.error('No active form found for this campaign.');
                setIsLoading(false);
                return;
            }
            setForm(formRes.data);

            const version = formRes.data.versions?.[0];
            if (version) {
                setActiveVersion(version);
                // Expand all categories by default in single container view
                const categories = version.criteria?.map((c: any) => c.categoryName || 'General');
                setExpandedCategories(Array.from(new Set(categories)) as string[]);
            }

            const campaignRes = await api.get(`/campaigns/${campaignId}`);
            // Use the campaign name or the form's defined team name as the lookup key
            const targetTeam = formRes.data.teamName || campaignRes.data.name;
            const agentsRes = await api.get(`/users/team/${targetTeam}`);

            // For Admins/QA_TLs, the backend returns all agents. 
            // We should only filter if we are looking for a specific team, 
            // but we should be flexible: if the agent is already in the fetched list, show them.
            setAgents(agentsRes.data);

        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || 'Failed to load evaluation data.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-initialize audit when metadata is ready
    useEffect(() => {
        if (selectedAgent && ticketReference && !auditId && !isStarting) {
            const timer = setTimeout(() => {
                initializeAudit();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [selectedAgent, ticketReference, auditId, isStarting]);

    const initializeAudit = async (): Promise<string | null> => {
        const sanitizedRef = ticketReference.trim();
        if (auditId || isStarting || !selectedAgent || !sanitizedRef) return auditId;

        setIsStarting(true);
        try {
            const res = await api.post('/audits/manual', {
                campaignId: campaignId,
                agentId: selectedAgent.id,
                ticketReference: sanitizedRef
            });

            const auditData = res.data;
            setAuditId(auditData.id);

            // Resync scores and field values from the response (in case of resumption)
            if (auditData.scores) {
                const resumedScores: any = {};
                auditData.scores.forEach((s: any) => {
                    let label = 'No';
                    if (s.score === -1) label = 'N/A';
                    else if (s.score > 0) label = 'Yes';
                    resumedScores[s.criterionId] = { score: s.score, comment: s.comment, label };
                });
                setScores(resumedScores);
            }

            if (auditData.fieldValues) {
                auditData.fieldValues.forEach((f: any) => {
                    if (f.fieldName === 'interactionDate') setInteractionDate(f.value);
                    if (f.fieldName === 'disposition') setDisposition(f.value);
                    if (f.fieldName === 'aht') setAht(f.value);
                });
            }

            toast.success('Evaluation session ready.');
            return auditData.id;
        } catch (err: any) {
            console.error('Failed to initialize audit:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to initialize audit.';
            toast.error(msg);
            return null;
        } finally {
            setIsStarting(false);
        }
    };

    const handleScoreChange = async (criterion: any, score: number, label: string) => {
        let currentAuditId = auditId;
        const criterionId = criterion.id;

        if (!currentAuditId) {
            if (isStarting) {
                toast.loading('Starting evaluation session...', { id: 'init-audit' });
                return;
            }

            currentAuditId = await initializeAudit();
            if (!currentAuditId) return;
            toast.dismiss('init-audit');
        }

        const newScores = {
            ...scores,
            [criterionId]: {
                ...(scores[criterionId] || { comment: '' }),
                score,
                label,
                isFailed: label === 'No'
            }
        };
        setScores(newScores);
        saveAuditProgress(newScores, currentAuditId);
    };

    const handleCommentChange = async (criterionId: string, comment: string) => {
        let currentAuditId = auditId;

        if (!currentAuditId) {
            if (isStarting) return;
            currentAuditId = await initializeAudit();
            if (!currentAuditId) return;
        }

        const newScores = {
            ...scores,
            [criterionId]: {
                ...(scores[criterionId] || { score: 0 }),
                comment
            }
        };
        setScores(newScores);
        saveAuditProgress(newScores, currentAuditId);
    };

    const performSave = async (currentScores: any, customAuditId?: string) => {
        const idToUse = customAuditId || auditId;
        if (!idToUse) return;

        setIsSaving(true);
        try {
            const scoresArray = Object.entries(currentScores).map(([cid, val]: any) => ({
                criterionId: cid,
                score: val.score,
                comment: val.comment,
                isFailed: val.isFailed
            }));

            await api.patch(`/audits/${idToUse}/autosave`, {
                fieldValues: {
                    interactionDate,
                    disposition,
                    aht
                },
                scores: scoresArray
            });
        } catch (err) {
            console.error('Autosave failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const debouncedSave = useMemo(
        () => debounce((curr: any, aid?: string) => performSave(curr, aid), 2000),
        [auditId, interactionDate, disposition, aht]
    );

    const saveAuditProgress = useCallback(
        (currentScores: any, customAuditId?: string) => {
            debouncedSave(currentScores, customAuditId);
        },
        [debouncedSave]
    );

    const handleSubmitEvaluation = async () => {
        if (!auditId) {
            toast.error('Evaluation not initialized. Please fill metadata first.');
            return;
        }

        // Validation: Check for zero scores without detailed remarks
        const errors: string[] = [];
        const missingCommentIds: string[] = [];
        const categoriesToExpand: string[] = [];

        if (activeVersion?.criteria) {
            activeVersion.criteria.forEach((item: any) => {
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

                // Second: if marked as "No", require detailed remarks (min 10 chars)
                // IMPORTANT: Check the LABEL, not the score, because autofail parameters
                // have weight=0 even when marked as "Yes"
                if (scoreData.label === 'No') {
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
            // Show only the FIRST error to avoid multiple toasts
            toast.error(errors[0]);

            // Ensure categories are open so we can scroll to them
            if (categoriesToExpand.length > 0) {
                setExpandedCategories(prev => [...new Set([...prev, ...categoriesToExpand])]);
            }

            // Scroll to the first error field
            setTimeout(() => {
                const firstErrorId = missingCommentIds[0];
                const element = document.getElementById(`criterion-${firstErrorId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Also try to focus the textarea if it exists
                    const textarea = element.querySelector('textarea');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }, 800);

            return;
        }

        // Original logic: check for incomplete scoring
        const totalCriteria = activeVersion?.criteria?.length || 0;
        const scoredCount = Object.keys(scores).length;

        if (scoredCount < totalCriteria) {
            setConfirmConfig({
                isOpen: true,
                title: 'Incomplete Evaluation',
                message: `You have only scored ${scoredCount} out of ${totalCriteria} parameters. Submit this evaluation anyway?`,
                variant: 'warning',
                onConfirm: () => submitFinal()
            });
            return;
        }

        submitFinal();
    };

    const submitFinal = async () => {
        try {
            setIsStarting(true);
            debouncedSave.cancel();
            await performSave(scores);

            await api.post(`/audits/${auditId}/submit`);
            toast.success('Evaluation submitted successfully!');
            router.push('/evaluate');
        } catch (err: any) {
            console.error(err);
            // Don't show toast for validation errors - frontend already handled them
            const errorMsg = err.response?.data?.message || 'Failed to submit evaluation.';
            const isValidationError = errorMsg.includes('required') ||
                errorMsg.includes('incomplete') ||
                errorMsg.includes('Detailed remarks');

            if (!isValidationError) {
                toast.error(errorMsg);
            }
        } finally {
            setIsStarting(false);
        }
    };

    // Real-time Score Calculation
    const currentScoreData = useMemo(() => {
        if (!activeVersion?.criteria) return { pct: 0, earned: 0, total: 0, isAutoFailed: false };

        let totalPossible = 0;
        let totalEarned = 0;
        let isAutoFailed = false;

        activeVersion.criteria.forEach((criterion: any) => {
            const scoreObj = scores[criterion.id];

            // Check for Auto-Fail (Critical parameter with a NO score)
            if (criterion.isCritical && scoreObj && scoreObj.isFailed) {
                isAutoFailed = true;
            }

            if (scoreObj) {
                if (scoreObj.score !== -1) { // -1 is N/A
                    totalPossible += criterion.weight;
                    totalEarned += scoreObj.score;
                }
            } else {
                totalPossible += criterion.weight;
            }
        });

        const pct = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
        return {
            pct: isAutoFailed ? 0 : Math.round(pct * 100) / 100,
            earned: totalEarned,
            total: totalPossible,
            isAutoFailed
        };
    }, [scores, activeVersion]);

    // Group criteria by category
    const groupedCriteria = activeVersion?.criteria?.reduce((acc: any, curr: any) => {
        const cat = curr.categoryName || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {}) || {};

    const isAdmin = ['ADMIN', 'QA_TL', 'OPS_TL'].includes(userRole);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 pb-40 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/evaluate')}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        <Undo2 className="w-4 h-4" />
                        Back to Selection
                    </button>
                    <div>
                        {isLoading ? (
                            <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mb-2" />
                        ) : (
                            <h1 className="text-4xl font-black text-white tracking-tighter">{form?.name}</h1>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 font-medium text-sm">Campaign:</span>
                            {isLoading ? (
                                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                            ) : (
                                <div className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                                    <span className="text-blue-400 font-black uppercase tracking-widest text-[10px]">
                                        {form?.campaign?.name || 'Unassigned'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {auditId && (
                        <div className="flex items-center gap-3 px-5 py-2.5 glass-dark rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-inner shadow-blue-500/10">
                            {isSaving ? (
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                        <div className="absolute inset-0 bg-blue-400/20 blur-sm rounded-full animate-pulse" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 animate-pulse">Synchronizing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Cloud In-Sync</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Unified Evaluation Form Container */}
            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden">
                {/* Section 1: Metadata Header */}
                <div className="p-8 md:p-12 bg-white/[0.02] border-b border-white/5 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Metadata Engine</h3>
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Required Fields
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-blue-400" /> Agent
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-4 pr-10 text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none appearance-none font-bold cursor-pointer"
                                    value={selectedAgent?.id || ''}
                                    onChange={(e) => {
                                        const agent = agents.find(a => a.id === e.target.value);
                                        setSelectedAgent(agent);
                                        setAuditId(null); // Reset audit when agent changes
                                    }}
                                >
                                    <option value="" disabled>Select Agent...</option>
                                    {agents.length === 0 ? (
                                        <option disabled>No agents found for this team</option>
                                    ) : (
                                        agents.map(agent => (
                                            <option key={agent.id} value={agent.id} className="bg-[#111113]">
                                                {agent.name} ({agent.eid})
                                            </option>
                                        ))
                                    )}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Ticket className="w-3.5 h-3.5 text-blue-400" /> Ticket Reference
                            </label>
                            <input
                                value={ticketReference}
                                onChange={(e) => setTicketReference(e.target.value)}
                                onBlur={(e) => setTicketReference(e.target.value.trim())}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none font-bold placeholder:text-slate-700"
                                placeholder="Ref #"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-blue-400" /> Date
                            </label>
                            <input
                                type="date"
                                value={interactionDate}
                                onChange={(e) => setInteractionDate(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none font-bold [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Disposition
                            </label>
                            <input
                                value={disposition}
                                onChange={(e) => setDisposition(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none font-bold placeholder:text-slate-700"
                                placeholder="e.g. Issue Resolved"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-blue-400" /> AHT
                            </label>
                            <input
                                value={aht}
                                onChange={(e) => setAht(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm focus:ring-2 focus:ring-blue-500/50 transition-all outline-none font-bold placeholder:text-slate-700"
                                placeholder="00:00:00"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Scoring Area */}
                <div className="p-8 md:p-12 space-y-16">
                    {isStarting && !auditId && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-400 font-bold">Syncing Progress...</p>
                        </div>
                    )}

                    {!auditId && !selectedAgent && !isStarting && (
                        <div className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-8 animate-pulse">
                            <Info className="w-5 h-5 text-blue-400" />
                            <p className="text-sm font-bold text-blue-100">
                                Please select an Agent and enter a Ticket Reference above to begin scoring.
                            </p>
                        </div>
                    )}
                    {Object.entries(groupedCriteria).map(([category, items]: [string, any], catIdx) => (
                        <div key={category} className="space-y-8 animate-in fade-in slide-in-from-left duration-500" style={{ animationDelay: `${catIdx * 100}ms` }}>
                            {/* Category Header */}
                            <div className="flex items-center gap-6">
                                <h2 className="text-2xl font-black text-white tracking-tight whitespace-nowrap">{category}</h2>
                                <div className="h-[1px] w-full bg-gradient-to-r from-white/10 to-transparent" />
                            </div>

                            {/* Parameters Loop */}
                            <div className="space-y-6">
                                {items.map((criterion: any) => (
                                    <div
                                        key={criterion.id}
                                        id={`criterion-${criterion.id}`}
                                        className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 md:p-8 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 focus-within:ring-2 focus-within:ring-blue-500/20"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-bold text-slate-100 leading-tight">{criterion.title}</h4>
                                                <div className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{criterion.weight}pts</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium max-w-xl leading-relaxed">
                                                {criterion.description}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-4 min-w-[320px]">
                                            <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl">
                                                {[
                                                    { label: 'Yes', value: criterion.weight, icon: Check, color: 'text-emerald-400', active: 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' },
                                                    { label: 'No', value: 0, icon: X, color: 'text-rose-400', active: 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' },
                                                    { label: 'N/A', value: -1, icon: Minus, color: 'text-slate-400', active: 'bg-slate-500 text-white shadow-[0_0_20px_rgba(100,116,139,0.4)]' }
                                                ].map((btn) => {
                                                    const Icon = btn.icon;

                                                    return (
                                                        <button
                                                            key={btn.label}
                                                            onClick={() => handleScoreChange(criterion, btn.value, btn.label)}
                                                            className={cn(
                                                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                                                scores[criterion.id]?.label === btn.label
                                                                    ? btn.active + " scale-[1.05]"
                                                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                                                            )}
                                                        >
                                                            <Icon className={cn("w-4 h-4", scores[criterion.id]?.label === btn.label ? "text-white" : btn.color)} strokeWidth={4} />
                                                            {btn.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <textarea
                                                value={scores[criterion.id]?.comment || ''}
                                                onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                                                placeholder="Observations or notes..."
                                                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all resize-none h-11 placeholder:text-slate-800"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Submit */}
                <div className="p-12 border-t border-white/5 bg-white/[0.01] flex flex-col items-center text-center gap-6">
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-white uppercase tracking-[0.2em]">Finalize Audit</h4>
                        <p className="text-slate-500 text-sm font-medium">Please review all scores before submitting the finalized evaluation.</p>
                    </div>
                    <button
                        onClick={handleSubmitEvaluation}
                        disabled={isStarting}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 disabled:opacity-50 disabled:grayscale"
                    >
                        {isStarting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        Submit Evaluation
                    </button>
                </div>
            </div>

            {/* Real-time Floating Score Container */}
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-8 right-8 z-[100]"
                >
                    <div className="relative group">
                        {/* Glow Effect */}
                        <div className={cn(
                            "absolute -inset-1 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500",
                            currentScoreData.pct >= 90 ? "bg-emerald-500" : currentScoreData.pct >= 75 ? "bg-blue-500" : "bg-rose-500"
                        )} />

                        <div className="relative glass-dark border border-white/10 rounded-[2.5rem] p-7 shadow-2xl flex items-center gap-10 backdrop-blur-3xl min-w-[320px] ring-1 ring-white/5">
                            <div className="space-y-1 relative">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Aggregate Score</p>
                                <div className="flex flex-col">
                                    {currentScoreData.isAutoFailed && (
                                        <div className="flex items-center gap-1.5 mb-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 w-fit">
                                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Auto-Fail Locked</span>
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-1">
                                        <span className={cn(
                                            "text-6xl font-black tracking-tighter transition-all duration-700 tabular-nums",
                                            currentScoreData.isAutoFailed ? "text-rose-500" : (currentScoreData.pct >= 90 ? "text-emerald-400" : currentScoreData.pct >= 75 ? "text-blue-400" : "text-rose-400")
                                        )}>
                                            {currentScoreData.pct}
                                        </span>
                                        <span className="text-2xl font-black text-slate-600">%</span>
                                    </div>
                                </div>
                                {/* Score Glow */}
                                <div className={cn(
                                    "absolute -bottom-2 left-0 right-0 h-1 blur-xl opacity-50",
                                    currentScoreData.isAutoFailed ? "bg-rose-500" : (currentScoreData.pct >= 90 ? "bg-emerald-500" : currentScoreData.pct >= 75 ? "bg-blue-500" : "bg-rose-500")
                                )} />
                            </div>

                            <div className="h-14 w-[1px] bg-white/10" />

                            <div className="space-y-3 flex-1">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Progress</span>
                                    <span>{Object.keys(scores).length} / {activeVersion?.criteria?.length || 0}</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        className={cn(
                                            "h-full rounded-full",
                                            currentScoreData.pct >= 90 ? "bg-emerald-500" : currentScoreData.pct >= 75 ? "bg-blue-500" : "bg-rose-500"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(Object.keys(scores).length / (activeVersion?.criteria?.length || 1)) * 100}%` }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>{currentScoreData.earned} / {currentScoreData.total} Pts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Bottom Guard Padding */}
            <div className="h-20" />

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
