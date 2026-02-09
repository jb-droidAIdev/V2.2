'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    FileText,
    History,
    CheckCircle,
    MoreVertical,
    ChevronRight,
    Settings2,
    ListTodo,
    Loader2,
    X,
    Users as UsersIcon,
    AlertCircle,
    CheckCircle2,
    Trash2,
    Archive,
    ShieldAlert,
    AlertTriangle,
    Copy,
    Layout
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function FormsPage() {
    const router = useRouter();
    const [forms, setForms] = useState<any[]>([]);
    const [teams, setTeams] = useState<string[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const [newForm, setNewForm] = useState({
        name: '',
        teamName: '',
        description: ''
    });

    const [duplicateData, setDuplicateData] = useState({
        sourceFormId: '',
        sourceName: '',
        newName: '',
        teamName: '' // For campaign selection
    });

    const [versionsModal, setVersionsModal] = useState<{
        isOpen: boolean;
        form: any;
        versions: any[];
    }>({
        isOpen: false,
        form: null,
        versions: []
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    });

    const [userRole, setUserRole] = useState<string>('');
    const [permissions, setPermissions] = useState<string[]>([]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
            setPermissions(userData.permissions || []);
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (!isLoading && !permissions.includes('PAGE_FORMS') && userRole !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [isLoading, permissions, userRole, router]);

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [formsRes, campaignsRes, teamsRes] = await Promise.all([
                api.get('/forms'),
                api.get('/campaigns'),
                api.get('/users/teams/dossier')
            ]);
            setForms(formsRes.data);
            setCampaigns(campaignsRes.data);

            // Extract names from campaigns
            const campaignNames = campaignsRes.data.map((c: any) => c.name);

            // Combine with teams from dossier
            const dossierTeams = teamsRes.data || [];

            // Create a unique set of all possible "Target Teams"
            const allTargetTeams = Array.from(new Set([...campaignNames, ...dossierTeams])) as string[];

            setTeams(allTargetTeams.filter(Boolean).sort());

            setIsLoading(false);
            setIsInitialLoad(false);
        } catch (err) {
            console.error('Fetch forms error:', err);
            toast.error('Failed to sync scorecard data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        const newErrors: Record<string, string> = {};
        if (!newForm.name.trim()) newErrors.name = 'Form name is required';
        if (!newForm.teamName) newErrors.teamName = 'Team assignment is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const campaign = campaigns.find(c => c.name === newForm.teamName);
            const response = await api.post('/forms', {
                ...newForm,
                campaignId: campaign?.id
            });
            setIsCreateModalOpen(false);
            setNewForm({ name: '', teamName: '', description: '' });
            setErrors({});
            router.push(`/forms/${response.data.id}/builder`);
            toast.success('Form created successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create form');
        }
    };

    const handleDuplicate = async () => {
        const newErrors: Record<string, string> = {};
        if (!duplicateData.newName.trim()) newErrors.name = 'New form identity is required';
        if (!duplicateData.teamName) newErrors.teamName = 'Campaign selection is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const campaign = campaigns.find(c => c.name === duplicateData.teamName);
            await api.post(`/forms/${duplicateData.sourceFormId}/duplicate`, {
                name: duplicateData.newName,
                campaignId: campaign?.id,
                teamName: duplicateData.teamName
            });
            setIsDuplicateModalOpen(false);
            setDuplicateData({ sourceFormId: '', sourceName: '', newName: '', teamName: '' });
            setErrors({});
            toast.success('Form duplicated successfully!');
            fetchData(true); // Silent refresh
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to duplicate form');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Scorecard?',
            message: `Are you sure you want to delete "${name}"? This action is permanent and cannot be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/forms/${id}`);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    toast.success(`Form "${name}" deleted`);
                    fetchData(true); // Silent refresh
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to delete form');
                }
            }
        });
    };

    const handleArchive = (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Archive Scorecard?',
            message: `Are you sure you want to archive "${name}"? It will be removed from active monitoring but historical audits will be preserved.`,
            variant: 'warning',
            onConfirm: async () => {
                try {
                    await api.patch(`/forms/${id}/archive`);
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    toast.success(`Form "${name}" archived`);
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'Failed to archive form');
                }
            }
        });
    };

    const handleViewVersions = async (form: any) => {
        try {
            const res = await api.get(`/forms/${form.id}/versions`);
            setVersionsModal({
                isOpen: true,
                form,
                versions: res.data
            });
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading && forms.length === 0) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }



    if (!isLoading && !permissions.includes('PAGE_FORMS') && userRole !== 'ADMIN') {
        return null;
    }

    return (
        <div className="space-y-8">
            <AnimatePresence>
                {isLoading && isInitialLoad && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 text-center"
                    >
                        <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full space-y-6">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-blue-500/20">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white px-4 tracking-tight">Syncing Engine...</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    Harmonizing scorecards and retrieving the latest campaign assignments.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSubmitting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 text-center"
                    >
                        <div className="bg-[#161618] border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-white font-bold text-xs uppercase tracking-widest">Executing Request...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Form Engine</h1>
                    <p className="text-slate-400 mt-1 font-medium">Architect high-conversion monitoring scorecards.</p>
                </div>
                <button
                    onClick={() => {
                        setErrors({});
                        setIsCreateModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl shadow-blue-600/20 transition-all font-black text-xs uppercase tracking-widest active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Form
                </button>
            </div>

            {/* Content List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.length === 0 ? (
                    <div className="col-span-full py-32 text-center glass rounded-[3rem] border-dashed border-white/10">
                        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <FileText className="w-12 h-12 text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">No Active Forms</h3>
                        <p className="text-slate-500 font-medium">Start design process by clicking 'New Form' above.</p>
                    </div>
                ) : (
                    forms.map((form, idx) => (
                        <motion.div
                            key={form.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass p-8 rounded-[2.5rem] hover:bg-white/[0.04] border border-white/5 transition-all group relative overflow-hidden flex flex-col"
                        >
                            {!form.isConfigured && (
                                <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
                            )}
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-inner",
                                        form.isConfigured ? "bg-blue-600/10 text-blue-500 group-hover:scale-105" : "bg-amber-500/10 text-amber-400"
                                    )}>
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl leading-tight text-white mb-1.5 tracking-tight">{form.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                                {form.teamName || 'Unassigned'}
                                            </span>
                                            {!form.isConfigured && (
                                                <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === form.id ? null : form.id);
                                        }}
                                        className={cn(
                                            "p-3 rounded-2xl transition-all",
                                            activeMenu === form.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    <AnimatePresence>
                                        {activeMenu === form.id && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    className="absolute right-0 mt-3 w-56 bg-[#1c1c1e] border border-white/10 rounded-3xl shadow-2xl z-20 overflow-hidden"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setDuplicateData({
                                                                sourceFormId: form.id,
                                                                sourceName: form.name,
                                                                newName: `${form.name} (Copy)`,
                                                                teamName: ''
                                                            });
                                                            setIsDuplicateModalOpen(true);
                                                            setActiveMenu(null);
                                                            setErrors({});
                                                        }}
                                                        className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-blue-600/10 text-blue-400 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate Form
                                                    </button>
                                                    <div className="h-[1px] bg-white/5 mx-3" />
                                                    {form.hasAudits ? (
                                                        <button
                                                            onClick={() => handleArchive(form.id, form.name)}
                                                            className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-amber-500/10 text-amber-500 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                            Archive Form
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDelete(form.id, form.name)}
                                                            className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-rose-500/10 text-rose-500 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Remove Forever
                                                        </button>
                                                    )}
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <History className="w-4 h-4" />
                                        <span className="text-xs font-bold">Lifecycle</span>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-black px-3 py-1.5 rounded-full border uppercase tracking-[0.2em]",
                                        form.isConfigured
                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    )}>
                                        {form.isConfigured ? `v${form.versions?.[0]?.versionNumber || 1} Live` : 'Draft'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-3 text-slate-500">
                                        <Layout className="w-4 h-4" />
                                        <span className="text-xs font-bold">Strategy</span>
                                    </div>
                                    <span className="text-xs font-black text-white uppercase tracking-wider">
                                        {form.campaign?.name || 'Custom Team'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <button
                                    onClick={() => router.push(`/forms/${form.id}/builder`)}
                                    className={cn(
                                        "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                                        form.isConfigured
                                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                                            : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                                    )}
                                >
                                    {form.isConfigured ? 'Configure' : 'Design Now'}
                                </button>
                                <button
                                    onClick={() => handleViewVersions(form)}
                                    className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 text-slate-400 active:scale-95"
                                >
                                    Audit History
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#161618] border border-white/10 rounded-[2.5rem] w-full max-w-lg relative z-10 overflow-hidden shadow-2xl">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]">
                                <div>
                                    <h3 className="text-3xl font-black text-white tracking-tight">Generate Form</h3>
                                    <p className="text-slate-500 text-xs mt-1.5 font-bold uppercase tracking-widest">Scorecard Architecture</p>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-10 space-y-10 bg-[#161618]">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Scorecard Identity</label>
                                    <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} className={cn("w-full bg-[#0a0a0b] border rounded-2xl py-5 px-6 text-white focus:ring-2 transition-all outline-none font-bold text-sm", errors.name ? "border-rose-500/50" : "border-white/10")} placeholder="e.g. CX Quality Standard v1" />
                                    {errors.name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest ml-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Campaign Alignment</label>
                                    <select value={newForm.teamName} onChange={e => setNewForm({ ...newForm, teamName: e.target.value })} className={cn("w-full bg-[#0a0a0b] border rounded-2xl py-5 px-6 text-white focus:ring-2 transition-all outline-none appearance-none font-bold text-sm", errors.teamName ? "border-rose-500/50" : "border-white/10")}>
                                        <option value="">Select Target...</option>
                                        {teams.map(team => <option key={team} value={team}>{team}</option>)}
                                    </select>
                                    {errors.teamName && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest ml-1">{errors.teamName}</p>}
                                </div>
                            </div>
                            <div className="p-10 bg-[#1c1c1e] border-t border-white/5 flex gap-4">
                                <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-5 border border-white/10 hover:bg-white/5 rounded-[2rem] text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-[2rem] text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20">Generate Form</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Duplicate Modal */}
            <AnimatePresence>
                {isDuplicateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDuplicateModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#161618] border border-white/10 rounded-[2.5rem] w-full max-w-lg relative z-10 overflow-hidden shadow-2xl">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                                        <Copy className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">Duplicate Scorecard</h3>
                                        <p className="text-slate-500 text-[10px] mt-1 font-black uppercase tracking-widest">Clone Logic & Structure</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDuplicateModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-10 space-y-10 bg-[#161618]">
                                <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-600/10 mb-2">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Source Template</p>
                                    <p className="text-white font-bold">{duplicateData.sourceName}</p>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">New Identity</label>
                                    <input value={duplicateData.newName} onChange={e => setDuplicateData({ ...duplicateData, newName: e.target.value })} className={cn("w-full bg-[#0a0a0b] border rounded-2xl py-5 px-6 text-white focus:ring-2 transition-all outline-none font-bold text-sm", errors.name ? "border-rose-500/50" : "border-white/10")} placeholder="e.g. Sales Refresh v2" />
                                    {errors.name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest ml-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 italic">Assign New Campaign</label>
                                    <select value={duplicateData.teamName} onChange={e => setDuplicateData({ ...duplicateData, teamName: e.target.value })} className={cn("w-full bg-[#0a0a0b] border rounded-2xl py-5 px-6 text-white focus:ring-2 transition-all outline-none appearance-none font-bold text-sm", errors.teamName ? "border-rose-500/50" : "border-white/10")}>
                                        <option value="">Select Destination...</option>
                                        {teams.map(team => <option key={team} value={team}>{team}</option>)}
                                    </select>
                                    {errors.teamName && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest ml-1">{errors.teamName}</p>}
                                </div>
                            </div>
                            <div className="p-10 bg-[#1c1c1e] border-t border-white/5 flex gap-4">
                                <button onClick={() => setIsDuplicateModalOpen(false)} className="flex-1 py-5 border border-white/10 hover:bg-white/5 rounded-[2rem] text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all">Cancel</button>
                                <button onClick={handleDuplicate} className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 rounded-[2rem] text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20">Execute Clone</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Versions Modal */}
            <AnimatePresence>
                {versionsModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setVersionsModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#161618] border border-white/10 rounded-[3rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]">
                                <div className="flex items-center gap-6">
                                    <div className="p-5 bg-blue-600/10 rounded-3xl text-blue-500 shadow-inner"><History className="w-8 h-8" /></div>
                                    <div>
                                        <h3 className="text-3xl font-black text-white tracking-tight">{versionsModal.form?.name}</h3>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1.5">Version Control & Audit Logs</p>
                                    </div>
                                </div>
                                <button onClick={() => setVersionsModal(prev => ({ ...prev, isOpen: false }))} className="p-3 hover:bg-white/5 rounded-2xl transition-colors"><X className="w-7 h-7 text-slate-500 hover:text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#111113]">
                                {versionsModal.versions.length === 0 ? (
                                    <div className="py-24 text-center"><p className="text-slate-700 font-black uppercase text-xs tracking-widest">No versions tracked</p></div>
                                ) : versionsModal.versions.map((ver) => (
                                    <div key={ver.id} className="glass p-6 rounded-[2.5rem] border-white/5 flex items-center justify-between group hover:bg-white/[0.03] transition-all border shadow-2xl">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 flex flex-col items-center justify-center text-slate-500 font-black border border-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                                <span className="text-[11px] mb-0.5">V</span>
                                                <span className="text-2xl leading-none">{ver.versionNumber}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-black text-white text-xl tracking-tight">Version {ver.versionNumber}</span>
                                                    {ver.isActive && <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">Production</span>}
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-slate-500">
                                                    <span className="text-xs font-bold">{ver.publishedAt ? new Date(ver.publishedAt).toLocaleDateString() : 'Draft'}</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/70">{ver.creator?.name || 'Automated'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right"><span className="text-lg font-black text-white block">{ver._count?.criteria || 0} Param</span><span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1 inline-block">{ver._count?.audits || 0} Entries</span></div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-10 bg-[#1c1c1e] border-t border-white/5">
                                <button onClick={() => setVersionsModal(prev => ({ ...prev, isOpen: false }))} className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/5 text-slate-500">Close Manager</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-[#161618] border border-white/10 rounded-[3rem] w-full max-w-md relative z-10 overflow-hidden shadow-2xl">
                            <div className="p-12 text-center space-y-8">
                                <div className={cn("w-28 h-28 rounded-full mx-auto flex items-center justify-center ring-[12px] transition-all shadow-2xl", confirmModal.variant === 'danger' ? "bg-rose-500/10 text-rose-500 ring-rose-500/5" : confirmModal.variant === 'warning' ? "bg-amber-500/10 text-amber-500 ring-amber-500/5" : "bg-blue-500/10 text-blue-500 ring-blue-500/5")}>
                                    <AlertTriangle className="w-14 h-14" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-white tracking-tight">{confirmModal.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium px-6">{confirmModal.message}</p>
                                </div>
                            </div>
                            <div className="p-10 bg-[#1c1c1e] border-t border-white/5 flex gap-4">
                                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-5 border border-white/10 hover:bg-white/5 rounded-[2rem] text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] transition-all">Cancel</button>
                                <button onClick={confirmModal.onConfirm} className={cn("flex-1 py-5 rounded-[2rem] text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl", confirmModal.variant === 'danger' ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30" : confirmModal.variant === 'warning' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30")}>Proceed</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
