'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Save,
    CheckCircle2,
    Settings2,
    Columns,
    Layers,
    Info,
    AlertOctagon,
    Wand2,
    FileText,
    Loader2,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

type Methodology = 'selection' | 'copc' | 'custom';

interface Criterion {
    id: string;
    categoryId: string;
    categoryName: string;
    title: string;
    description: string;
    weight: number;
    isCritical: boolean;
}

const COPC_CATEGORIES = [
    'Customer Critical',
    'Business Critical',
    'Compliance Critical',
    'Process Critical',
    'Non-Critical'
];

export default function FormBuilderPage() {
    const { id } = useParams();
    const router = useRouter();
    const [methodology, setMethodology] = useState<Methodology>('selection');
    const [form, setForm] = useState<any>(null);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning' | 'info' | 'success';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    });

    useEffect(() => {
        fetchForm();
    }, [id]);

    const fetchForm = async () => {
        try {
            const res = await api.get(`/forms`);
            // Finding the specific form from the list (since we don't have a single GET /forms/:id yet that simplifies things)
            const specificForm = res.data.find((f: any) => f.id === id) ||
                (await api.get('/forms/drafts')).data.find((f: any) => f.id === id);

            if (!specificForm) {
                router.push('/forms');
                return;
            }
            setForm(specificForm);
        } catch (err) {
            console.error(err);
            router.push('/forms');
        } finally {
            setIsLoading(false);
        }
    };

    const addCriterion = (categoryName: string = '') => {
        const newCriterion: Criterion = {
            id: Math.random().toString(36).substr(2, 9),
            categoryId: categoryName || 'custom',
            categoryName: categoryName || '',
            title: '',
            description: '',
            weight: 0,
            isCritical: false
        };
        setCriteria([...criteria, newCriterion]);
    };

    const updateCriterion = (index: number, updates: Partial<Criterion>) => {
        const updated = [...criteria];
        updated[index] = { ...updated[index], ...updates };
        setCriteria(updated);
    };

    const removeCriterion = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Parameter?',
            message: 'Are you sure you want to remove this parameter? This action cannot be undone.',
            variant: 'danger',
            onConfirm: () => {
                setCriteria(criteria.filter(c => c.id !== id));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const renameCategory = (oldName: string, newName: string) => {
        setCriteria(criteria.map(c =>
            c.categoryName === oldName
                ? { ...c, categoryName: newName, categoryId: newName }
                : c
        ));
    };

    const groupedCategories = Array.from(new Set(criteria.map(c => c.categoryName)));

    const handleSave = () => {
        if (criteria.length === 0) {
            toast.error('You must add at least one parameter before publishing.');
            return;
        }

        const totalWeight = criteria.reduce((acc, c) => acc + (parseFloat(c.weight.toString()) || 0), 0);

        if (totalWeight !== 100) {
            setConfirmModal({
                isOpen: true,
                title: 'Strict Weight Validation',
                message: `Total scorecard weight must be exactly 100%. Current weight is ${totalWeight}%. Please adjust your parameters before publishing.`,
                variant: 'danger',
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) // Just closes, no save
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Publish Scorecard?',
            message: 'This will create a new active version of the scorecard. Are you ready to publish?',
            variant: 'success',
            onConfirm: executeSave
        });
    };

    const executeSave = async () => {
        setIsSaving(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
            // 1. Create a version with these criteria
            await api.post(`/forms/${id}/versions`, {
                categories: Array.from(new Set(criteria.map(c => c.categoryName))),
                criteria: criteria.map((c, idx) => ({
                    categoryId: c.categoryId,
                    categoryName: c.categoryName,
                    title: c.title,
                    description: c.description,
                    weight: c.weight,
                    isCritical: c.isCritical,
                    orderIndex: idx
                }))
            });

            // 2. Publish this version to mark the form as configured
            const versionsRes = await api.get(`/forms/${id}/versions`);
            const latestVersion = versionsRes.data[0];
            await api.patch(`/forms/versions/${latestVersion.id}/publish`);

            router.push('/forms');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/5 rounded-xl border border-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">{form.name}</h1>
                        <p className="text-slate-400 text-sm font-medium">Building Scorecard for <span className="text-blue-400">{form.teamName} Team</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={criteria.length === 0 || isSaving}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save & Publish
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {methodology === 'selection' ? (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 py-12"
                    >
                        <MethodologyCard
                            title="COPC Methodology"
                            description="Standard framework using Critical and Non-Critical categories. Best for standardized quality monitoring."
                            icon={Wand2}
                            color="blue"
                            onClick={() => {
                                setMethodology('copc');
                                // Pre-add one criterion for the first category
                                addCriterion(COPC_CATEGORIES[0]);
                            }}
                        />
                        <MethodologyCard
                            title="Custom Layout"
                            description="Manually define your own categories and parameters. Fully flexible architecture for unique workflows."
                            icon={Settings2}
                            color="blue"
                            onClick={() => setMethodology('custom')}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="editor"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 pb-20"
                    >
                        <div className="flex items-center justify-between glass p-4 rounded-2xl border-white/10">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    methodology === 'copc' ? "bg-blue-500/10 text-blue-400" : "bg-blue-600/10 text-blue-300"
                                )}>
                                    {methodology === 'copc' ? <Wand2 className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                                </div>
                                <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                                    {methodology === 'copc' ? 'COPC Methodology' : 'Custom Scoring'}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Reset Configuration?',
                                        message: 'Changing the methodology will reset all currently added criteria. Do you want to proceed?',
                                        variant: 'danger',
                                        onConfirm: () => {
                                            setMethodology('selection');
                                            setCriteria([]);
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                    });
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                Change Methodology
                            </button>
                        </div>

                        {/* Configuration Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="glass p-4 rounded-2xl border-white/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Parameters</p>
                                    <p className="text-xl font-black text-white">{criteria.length}</p>
                                </div>
                            </div>
                            <div className="glass p-4 rounded-2xl border-white/5 flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    criteria.reduce((acc, c) => acc + c.weight, 0) === 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                )}>
                                    <Columns className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Weight</p>
                                    <p className={cn(
                                        "text-xl font-black",
                                        criteria.reduce((acc, c) => acc + c.weight, 0) === 100 ? "text-emerald-400" : "text-amber-400"
                                    )}>
                                        {criteria.reduce((acc, c) => acc + c.weight, 0)}%
                                    </p>
                                </div>
                            </div>
                            <div className="glass p-4 rounded-2xl border-white/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                    <AlertOctagon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Autofail Parameters</p>
                                    <p className="text-xl font-black text-white">{criteria.filter(c => c.isCritical).length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Criteria Editor - Grouped by Scoping/Category */}
                        <div className="space-y-12">
                            {groupedCategories.map((catName) => (
                                <div key={catName} className="space-y-4">
                                    {/* Section Header (Category) */}
                                    <div className="flex items-center justify-between bg-[#1e1e20]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-sm">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="bg-blue-600/20 p-2 rounded-lg">
                                                <Layers className="w-5 h-5 text-blue-400" />
                                            </div>
                                            {methodology === 'copc' ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none">Scoping Category</p>
                                                    <h4 className="text-lg font-black text-white">{catName}</h4>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 fle-1 max-w-md">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none ml-1">Section Header (Category Name)</p>
                                                    <input
                                                        value={catName}
                                                        onChange={(e) => renameCategory(catName, e.target.value)}
                                                        className="w-full bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0 outline-none placeholder:text-slate-700"
                                                        placeholder="Untitled Section"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addCriterion(catName)}
                                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-all border border-white/10 font-bold text-xs uppercase tracking-widest"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Parameter
                                        </button>
                                    </div>

                                    {/* Parameters Table Header */}
                                    <div className="grid grid-cols-12 gap-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                        <div className="col-span-2">Parameter Name</div>
                                        <div className="col-span-8">Evaluation Description</div>
                                        <div className="col-span-1 text-center">Weight (%)</div>
                                        <div className="col-span-1 text-center">Autofail</div>
                                    </div>

                                    {/* Parameters List */}
                                    <div className="space-y-2">
                                        {criteria.filter(c => c.categoryName === catName).map((criterion) => {
                                            const realIndex = criteria.findIndex(c => c.id === criterion.id);
                                            return (
                                                <motion.div
                                                    key={criterion.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="glass grid grid-cols-12 gap-4 items-center p-4 rounded-xl border-white/5 hover:border-blue-500/30 transition-all hover:bg-blue-500/[0.02] relative group"
                                                >
                                                    <div className="col-span-2">
                                                        <input
                                                            value={criterion.title}
                                                            onChange={(e) => updateCriterion(realIndex, { title: e.target.value })}
                                                            placeholder="Active Listening"
                                                            className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 px-3 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="col-span-8">
                                                        <textarea
                                                            value={criterion.description}
                                                            onChange={(e) => updateCriterion(realIndex, { description: e.target.value })}
                                                            placeholder="Describe points for evaluation..."
                                                            rows={1}
                                                            className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 px-3 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                                                        />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <input
                                                            type="text"
                                                            value={criterion.weight}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                                updateCriterion(realIndex, { weight: parseFloat(val) || 0 });
                                                            }}
                                                            className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 px-3 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none text-center font-bold"
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <button
                                                            onClick={() => updateCriterion(realIndex, { isCritical: !criterion.isCritical })}
                                                            className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                                criterion.isCritical ? "bg-rose-500/20 text-rose-500 border border-rose-500/50" : "bg-white/5 text-slate-600 border border-white/10"
                                                            )}
                                                            title={criterion.isCritical ? "Autofail Enabled" : "Enable Autofail"}
                                                        >
                                                            <AlertOctagon className={cn("w-5 h-5", criterion.isCritical && "animate-pulse")} />
                                                        </button>
                                                    </div>

                                                    {/* Floating Trash Action */}
                                                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => removeCriterion(criterion.id)}
                                                            className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {methodology === 'custom' && (
                                <button
                                    onClick={() => addCriterion(`Section ${groupedCategories.length + 1}`)}
                                    className="w-full py-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-white hover:border-white/20 transition-all hover:bg-white/[0.02]"
                                >
                                    <div className="bg-white/5 p-3 rounded-full">
                                        <Plus className="w-8 h-8" />
                                    </div>
                                    <span className="font-black uppercase tracking-[0.2em] text-[10px]">Add New Section</span>
                                </button>
                            )}

                            {methodology === 'copc' && groupedCategories.length < COPC_CATEGORIES.length && (
                                <div className="flex flex-wrap gap-2 pt-4">
                                    {COPC_CATEGORIES.filter(c => !groupedCategories.includes(c)).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => addCriterion(cat)}
                                            className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-all"
                                        >
                                            + Add {cat} Section
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#161618] border border-white/10 rounded-2xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 text-center space-y-4">
                                <div className={cn(
                                    "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                                    confirmModal.variant === 'danger' ? "bg-rose-500/10 text-rose-500" :
                                        confirmModal.variant === 'warning' ? "bg-amber-500/10 text-amber-500" :
                                            confirmModal.variant === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                                                "bg-blue-500/10 text-blue-500"
                                )}>
                                    <AlertTriangle className="w-10 h-10" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white">{confirmModal.title}</h3>
                                    <p className="text-slate-400 text-sm mt-2 leading-relaxed font-medium">
                                        {confirmModal.message}
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 bg-[#1c1c1e] border-t border-white/5 flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-3.5 border border-white/10 hover:bg-white/5 rounded-xl text-slate-400 font-bold transition-all text-xs uppercase tracking-[0.2em]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={cn(
                                        "flex-1 py-3.5 rounded-xl text-white font-bold transition-all text-xs uppercase tracking-[0.2em] shadow-lg",
                                        confirmModal.variant === 'danger' ? "bg-rose-600 hover:bg-rose-500" :
                                            confirmModal.variant === 'warning' ? "bg-amber-600 hover:bg-amber-500" :
                                                confirmModal.variant === 'success' ? "bg-emerald-600 hover:bg-emerald-500" :
                                                    "bg-blue-600 hover:bg-blue-500"
                                    )}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MethodologyCard({ title, description, icon: Icon, color, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="text-left glass-dark p-8 rounded-3xl border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all group relative overflow-hidden active:scale-[0.98]"
        >
            <div className={cn(
                "absolute -right-8 -bottom-8 w-40 h-40 opacity-10 blur-2xl rounded-full transition-all group-hover:scale-150 group-hover:opacity-20",
                color === 'blue' ? "bg-blue-600" : "bg-blue-700"
            )} />

            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl",
                color === 'blue' ? "bg-blue-600/10 text-blue-400" : "bg-blue-700/10 text-blue-300"
            )}>
                <Icon className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-white mb-3 tracking-tight group-hover:text-white transition-colors">{title}</h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                {description}
            </p>

            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </button>
    );
}
