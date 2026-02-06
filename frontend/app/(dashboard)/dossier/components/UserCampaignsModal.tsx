import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, CheckSquare, Loader2, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UserCampaignsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    allCampaigns: any[];
}

export default function UserCampaignsModal({
    isOpen,
    onClose,
    user,
    allCampaigns
}: UserCampaignsModalProps) {
    const [assignedIds, setAssignedIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            fetchAssignments();
        }
    }, [isOpen, user]);

    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/users/${user.id}/campaigns`);
            setAssignedIds(res.data.map((c: any) => c.id));
        } catch (err) {
            console.error(err);
            toast.error('Failed to load current assignments');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCampaign = (id: string) => {
        setAssignedIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Identify implicit campaigns that need to be created first
            const implicitIds = assignedIds.filter(id => id.startsWith('NEW-'));
            const existingIds = assignedIds.filter(id => !id.startsWith('NEW-'));

            const newCampaignIds: string[] = [];

            // 2. Create them on the fly
            if (implicitIds.length > 0) {
                await Promise.all(implicitIds.map(async (tempId) => {
                    const campaignName = tempId.replace('NEW-', '').trim();
                    if (!campaignName) return;

                    try {
                        // Check if it was created in the meantime or just create it
                        // Since we don't have a specific check, we just try to create. 
                        // If backend deduplicates by name, we might need to fetch the ID.
                        // Assuming simplest path: Create new.
                        const res = await api.post('/campaigns', { name: campaignName });
                        newCampaignIds.push(res.data.id);
                    } catch (err) {
                        console.error(`Failed to auto-create campaign ${campaignName}`, err);
                        toast.error(`Could not initialize folder "${campaignName}"`);
                    }
                }));
            }

            // 3. Save all assignments (existing + newly created)
            const finalIds = [...existingIds, ...newCampaignIds];
            await api.post(`/users/${user.id}/campaigns`, { campaignIds: finalIds });

            toast.success('Campaign assignments updated');
            onClose();
            // Force a reload of the parent data because we might have created new campaigns
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save assignments');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCampaigns = allCampaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-[#161618] border border-white/10 rounded-3xl w-full max-w-lg relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1c1c1e]">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Campaign Access</h3>
                                <p className="text-slate-500 text-xs mt-1 font-medium">
                                    Manage which campaigns <span className="text-blue-400 font-bold">{user.name}</span> can access.
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-6 pt-6 pb-2">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    placeholder="Search campaigns..."
                                    className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl py-3 pl-12 pr-5 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none font-medium text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4 bg-[#161618] overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="py-10 flex justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredCampaigns.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            {searchTerm ? 'No campaigns match your search.' : 'No campaigns configured in the system.'}
                                        </div>
                                    ) : (
                                        filteredCampaigns
                                            .map(campaign => {
                                                const isSelected = assignedIds.includes(campaign.id);
                                                const isHomeTeam = campaign.name === user.employeeTeam;
                                                return (
                                                    <div
                                                        key={campaign.id}
                                                        onClick={() => toggleCampaign(campaign.id)}
                                                        className={cn(
                                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group select-none",
                                                            isSelected
                                                                ? "bg-blue-600/10 border-blue-600/30"
                                                                : "bg-[#0a0a0b] border-white/5 hover:border-white/10 hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-md flex items-center justify-center border transition-all",
                                                            isSelected
                                                                ? "bg-blue-600 border-blue-600 text-white"
                                                                : "border-slate-600 group-hover:border-slate-500"
                                                        )}>
                                                            {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                                                        </div>

                                                        <div className="flex-1 flex items-center gap-2">
                                                            <p className={cn("text-sm font-bold transition-colors", isSelected ? "text-white" : "text-slate-300")}>
                                                                {campaign.name}
                                                            </p>
                                                            {isHomeTeam && (
                                                                <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                                                                    Home Team
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-[#1c1c1e] border-t border-white/5 flex gap-4 mt-auto">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="flex-1 py-4 border border-white/10 hover:bg-white/5 rounded-2xl text-slate-400 font-bold transition-all text-xs uppercase tracking-[0.2em]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Layers className="w-5 h-5" />
                                )}
                                Save Access
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
