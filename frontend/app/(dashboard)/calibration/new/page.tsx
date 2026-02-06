'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    Check,
    ChevronRight,
    Users,
    Target,
    Settings,
    Activity,
    Layers,
    Save,
    Loader2
} from 'lucide-react';
import api from '@/lib/api';
import { CalibrationService, CreateCalibrationSessionDto } from '@/lib/calibration-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function NewCalibrationSessionPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    const [formData, setFormData] = useState<CreateCalibrationSessionDto>({
        campaignId: '',
        title: '',
        description: '',
        scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        reproducibilityTicketCount: 4,
        repeatabilityTicketCount: 2,
        accuracyTicketCount: 6,
        highScoreMin: 95,
        highScoreMax: 100,
        midScoreMin: 85,
        midScoreMax: 94,
        lowScoreMin: 0,
        lowScoreMax: 84,
        targetRnR: 15.0,
        targetAccuracy: 5.0,
        raterUserIds: [],
        qaTlUserId: '',
        amSdmUserId: ''
    });

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const [campRes, usersRes] = await Promise.all([
                api.get('/campaigns'),
                api.get('/users')
            ]);
            setCampaigns(campRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load resources');
        } finally {
            setIsFetching(false);
        }
    };

    const qaTLs = users.filter(u => ['QA', 'QA_TL', 'QA_MANAGER'].includes(u.role));
    const amSdms = users.filter(u => ['OPS_MANAGER', 'SDM'].includes(u.role));
    const raters = users.filter(u => ['QA', 'QA_TL'].includes(u.role));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.campaignId || !formData.title || !formData.qaTlUserId || !formData.amSdmUserId || formData.raterUserIds.length === 0) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        try {
            // Ensure date is ISO-8601
            const payload = {
                ...formData,
                scheduledAt: new Date(formData.scheduledAt).toISOString(),
                // Ensure numbers are numbers
                reproducibilityTicketCount: Number(formData.reproducibilityTicketCount),
                repeatabilityTicketCount: Number(formData.repeatabilityTicketCount),
                accuracyTicketCount: Number(formData.accuracyTicketCount),
                highScoreMin: Number(formData.highScoreMin),
                highScoreMax: Number(formData.highScoreMax),
                midScoreMin: Number(formData.midScoreMin),
                midScoreMax: Number(formData.midScoreMax),
                lowScoreMin: Number(formData.lowScoreMin),
                lowScoreMax: Number(formData.lowScoreMax),
                targetRnR: Number(formData.targetRnR),
                targetAccuracy: Number(formData.targetAccuracy),
            };

            await CalibrationService.createSession(payload);
            toast.success('Calibration session created successfully');
            router.push('/calibration');
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to create session');
        } finally {
            setIsLoading(false);
        }
    };

    const Section = ({ title, icon: Icon, children }: any) => (
        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            </div>
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );

    if (isFetching) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Resources...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6">
                <button
                    onClick={() => router.back()}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter">New Calibration Session</h1>
                    <p className="text-slate-400 font-medium">Configure a new quality alignment session.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Basic Info */}
                <Section title="Session Details" icon={Calendar}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Campaign</label>
                            <select
                                value={formData.campaignId}
                                onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white appearance-none"
                            >
                                <option value="">Select Campaign...</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Scheduled Date</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white [color-scheme:dark]"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Session Title</label>
                            <input
                                type="text"
                                placeholder="e.g., Monthly Quality Calibration - Jan 2026"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                            <textarea
                                placeholder="Add any specific instructions or focus areas..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder:text-slate-600 h-24 resize-none"
                            />
                        </div>
                    </div>
                </Section>

                {/* 2. Participants */}
                <Section title="Participants" icon={Users}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">QA Team Lead</label>
                            <select
                                value={formData.qaTlUserId}
                                onChange={(e) => setFormData({ ...formData, qaTlUserId: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white appearance-none"
                            >
                                <option value="">Select QA TL...</option>
                                {qaTLs.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500">Responsible for anchor validation & managing session.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">AM / SDM</label>
                            <select
                                value={formData.amSdmUserId}
                                onChange={(e) => setFormData({ ...formData, amSdmUserId: e.target.value })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white appearance-none"
                            >
                                <option value="">Select Operations Leader...</option>
                                {amSdms.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500">Responsible for final anchor validation.</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Raters (Participants)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-[#0f172a]/40 border border-white/10 rounded-xl max-h-60 overflow-y-auto no-scrollbar">
                                {raters.map(user => {
                                    const isSelected = formData.raterUserIds.includes(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => {
                                                const ids = isSelected
                                                    ? formData.raterUserIds.filter(id => id !== user.id)
                                                    : [...formData.raterUserIds, user.id];
                                                setFormData({ ...formData, raterUserIds: ids });
                                            }}
                                            className={cn(
                                                "cursor-pointer p-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-3",
                                                isSelected
                                                    ? "bg-blue-600/20 border-blue-500/50 text-white"
                                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? "border-blue-400 bg-blue-400" : "border-slate-600")}>
                                                {isSelected && <Check className="w-3 h-3 text-black" />}
                                            </div>
                                            <span className="truncate">{user.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-500 text-right">{formData.raterUserIds.length} raters selected</p>
                        </div>
                    </div>
                </Section>

                {/* 3. Configuration */}
                <Section title="Ticket Configuration" icon={Settings}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Reproducibility</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.reproducibilityTicketCount}
                                onChange={(e) => setFormData({ ...formData, reproducibilityTicketCount: Number(e.target.value) })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white"
                            />
                            <p className="text-[10px] text-slate-500">Tickets scored by all raters once.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Repeatability</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={formData.repeatabilityTicketCount}
                                onChange={(e) => setFormData({ ...formData, repeatabilityTicketCount: Number(e.target.value) })}
                                className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white"
                            />
                            <p className="text-[10px] text-slate-500">Tickets scored twice per rater.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Accuracy (Anchors)</label>
                            <input
                                type="number"
                                value="6"
                                disabled
                                className="w-full bg-[#0f172a]/20 border border-white/5 rounded-xl p-3 text-sm text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-[10px] text-slate-500">Fixed at 6 anchors (2 High, 2 Mid, 2 Low).</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <label className="text-xs font-bold text-white uppercase tracking-widest mb-4 block">Anchor Score Ranges</label>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <span className="text-sm font-bold text-emerald-400">High Range</span>
                                <div className="col-span-2 flex items-center gap-3">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.highScoreMin}
                                        onChange={(e) => setFormData({ ...formData, highScoreMin: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                    <span className="text-slate-500">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.highScoreMax}
                                        onChange={(e) => setFormData({ ...formData, highScoreMax: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <span className="text-sm font-bold text-amber-400">Mid Range</span>
                                <div className="col-span-2 flex items-center gap-3">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.midScoreMin}
                                        onChange={(e) => setFormData({ ...formData, midScoreMin: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                    <span className="text-slate-500">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.midScoreMax}
                                        onChange={(e) => setFormData({ ...formData, midScoreMax: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <span className="text-sm font-bold text-rose-400">Low Range</span>
                                <div className="col-span-2 flex items-center gap-3">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={formData.lowScoreMin}
                                        onChange={(e) => setFormData({ ...formData, lowScoreMin: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                    <span className="text-slate-500">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={formData.lowScoreMax}
                                        onChange={(e) => setFormData({ ...formData, lowScoreMax: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* 4. Targets */}
                <Section title="Success Thresholds" icon={Target}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target R&R Gap (%)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.targetRnR}
                                    onChange={(e) => setFormData({ ...formData, targetRnR: Number(e.target.value) })}
                                    className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Maximum allowed deviation (default ≤ 15%).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Target Accuracy Gap</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.targetAccuracy}
                                    onChange={(e) => setFormData({ ...formData, targetAccuracy: Number(e.target.value) })}
                                    className="w-full bg-[#0f172a]/40 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase">Points</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Maximum allowed gap from anchor (default ≤ 5).</p>
                        </div>
                    </div>
                </Section>

                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-600/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Create Session
                    </button>
                </div>

            </form>
        </div>
    );
}
