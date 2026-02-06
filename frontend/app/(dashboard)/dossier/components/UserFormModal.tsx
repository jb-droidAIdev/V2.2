import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Briefcase, Mail, Hash, Loader2 } from 'lucide-react';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    campaigns?: string[];
    viewMode?: 'admin' | 'users';
}

export default function UserFormModal({ isOpen, onClose, onSubmit, initialData, campaigns = [], viewMode = 'users' }: UserFormModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: viewMode === 'admin' ? 'ADMIN' : 'AGENT',
        eid: '',
        systemId: '',
        employeeTeam: '',
        projectCode: '',
        supervisor: '',
        manager: '',
        sdm: '',
        billable: true
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                role: initialData.role || 'AGENT',
                eid: initialData.eid || '',
                systemId: initialData.systemId || '',
                employeeTeam: initialData.employeeTeam || '',
                projectCode: initialData.projectCode || '',
                supervisor: initialData.supervisor || '',
                manager: initialData.manager || '',
                sdm: initialData.sdm || '',
                billable: initialData.billable ?? true
            });
        } else {
            setFormData({
                name: '',
                email: '',
                role: viewMode === 'admin' ? 'ADMIN' : 'AGENT',
                eid: '',
                systemId: '',
                employeeTeam: '',
                projectCode: '',
                supervisor: '',
                manager: '',
                sdm: '',
                billable: true
            });
        }
    }, [initialData, isOpen, viewMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
                >
                    <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            {initialData ? <User className="w-6 h-6 text-blue-500" /> : <Shield className="w-6 h-6 text-blue-500" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{initialData ? 'Edit Employee' : 'Add New Employee'}</h3>
                            <p className="text-slate-400 text-sm">Fill in the details below to {initialData ? 'update the' : 'create a new'} profile.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <div className="space-y-4 md:col-span-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Personal Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="john.doe@flatworld.ph"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="space-y-4 md:col-span-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">System Identification</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        >
                                            <option value="AGENT">Agent</option>
                                            <option value="QA">QA Specialist</option>
                                            <option value="QA_TL">QA Team Lead</option>
                                            <option value="QA_MANAGER">QA Manager</option>
                                            <option value="OPS_TL">Ops Team Lead</option>
                                            <option value="OPS_MANAGER">Ops Manager</option>
                                            <option value="SDM">SDM</option>
                                            <option value="ADMIN">Administrator</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Employee ID (EID)</label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                value={formData.eid}
                                                onChange={e => setFormData({ ...formData, eid: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="E12345"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">System ID</label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                value={formData.systemId}
                                                onChange={e => setFormData({ ...formData, systemId: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="SYS-001"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Organizational Info */}
                            <div className="space-y-4 md:col-span-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Organization & Team</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Campaign / Team</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                list="campaigns-list"
                                                type="text"
                                                value={formData.employeeTeam}
                                                onChange={e => setFormData({ ...formData, employeeTeam: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                placeholder="Select or type team..."
                                            />
                                            <datalist id="campaigns-list">
                                                {campaigns.map(c => (
                                                    <option key={c} value={c} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Project Code</label>
                                        <input
                                            type="text"
                                            value={formData.projectCode}
                                            onChange={e => setFormData({ ...formData, projectCode: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="PRJ-2024"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Supervisor (TL)</label>
                                        <input
                                            type="text"
                                            value={formData.supervisor}
                                            onChange={e => setFormData({ ...formData, supervisor: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">Manager (OM)</label>
                                        <input
                                            type="text"
                                            value={formData.manager}
                                            onChange={e => setFormData({ ...formData, manager: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-300">SDM</label>
                                        <input
                                            type="text"
                                            value={formData.sdm}
                                            onChange={e => setFormData({ ...formData, sdm: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={formData.billable}
                                            onChange={e => setFormData({ ...formData, billable: e.target.checked })}
                                            className="w-5 h-5 rounded-lg border-white/10 bg-black/20 text-blue-500 focus:ring-blue-500/50 transition-all"
                                        />
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Mark as Billable Resource</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Update Profile' : 'Create Profile')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
