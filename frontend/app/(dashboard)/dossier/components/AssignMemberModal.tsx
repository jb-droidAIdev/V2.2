import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, Loader2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils'; // Adjust path if necessary

interface AssignMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (userIds: string[]) => Promise<void>;
    targetTeam: string;
    unassignedUsers: any[];
}

export default function AssignMemberModal({
    isOpen,
    onClose,
    onAssign,
    targetTeam,
    unassignedUsers
}: AssignMemberModalProps) {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const toggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
        setError('');
    };

    const handleSelectAll = () => {
        if (selectedUserIds.length === unassignedUsers.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(unassignedUsers.map(u => u.id));
        }
    };

    const handleSubmit = async () => {
        if (selectedUserIds.length === 0) {
            setError('Please select at least one user');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await onAssign(selectedUserIds);
            setSelectedUserIds([]);
            onClose();
        } catch (err) {
            setError('Failed to assign users');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
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
                                <h3 className="text-xl font-black text-white tracking-tight">Add Team Members</h3>
                                <p className="text-slate-500 text-xs mt-1 font-medium">
                                    Assigning to <span className="text-blue-400 font-bold">{targetTeam}</span>
                                </p>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 space-y-4 bg-[#161618] overflow-y-auto flex-1">
                            <div className="flex justify-between items-center px-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                                    Select Employees ({selectedUserIds.length})
                                </label>
                                {unassignedUsers.length > 0 && (
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                                    >
                                        {selectedUserIds.length === unassignedUsers.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {unassignedUsers.map(user => {
                                    const isSelected = selectedUserIds.includes(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
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

                                            <div className="flex-1">
                                                <p className={cn("text-sm font-bold transition-colors", isSelected ? "text-white" : "text-slate-300")}>
                                                    {user.name}
                                                </p>
                                                <p className="text-[11px] text-slate-500 uppercase font-medium tracking-wide">
                                                    {user.role} • {user.eid || 'No ID'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {unassignedUsers.length === 0 && (
                                    <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-xs text-slate-500 font-medium">
                                            No unassigned users available.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-[#1c1c1e] border-t border-white/5 flex gap-4 mt-auto">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 py-4 border border-white/10 hover:bg-white/5 rounded-2xl text-slate-400 font-bold transition-all text-xs uppercase tracking-[0.2em]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || selectedUserIds.length === 0}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <UserPlus className="w-5 h-5" />
                                )}
                                Assign {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
