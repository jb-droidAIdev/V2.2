import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Pencil } from 'lucide-react';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    initialValue?: string;
    mode?: 'create' | 'rename';
    suggestedNames?: string[];
}

export default function CreateGroupModal({
    isOpen,
    onClose,
    onCreate,
    initialValue = '',
    mode = 'create',
    suggestedNames = []
}: CreateGroupModalProps) {
    const [name, setName] = useState(initialValue);

    useEffect(() => {
        setName(initialValue);
    }, [initialValue, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name);
        setName('');
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
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            {mode === 'rename' ? <Pencil className="w-6 h-6 text-blue-500" /> : <FolderPlus className="w-6 h-6 text-blue-500" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">{mode === 'rename' ? 'Rename Folder' : 'New Folder'}</h3>
                            <p className="text-slate-400 text-sm">{mode === 'rename' ? 'Enter the new name for this folder.' : 'Create a new campaign folder.'}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1">Folder Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder:text-slate-600"
                                placeholder={mode === 'rename' ? "e.g. Production Team A" : "e.g. Q4 Campaigns"}
                            />
                        </div>

                        {mode === 'create' && suggestedNames.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Suggestions from Dossier</label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedNames.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setName(s)}
                                            className="px-3 py-1.5 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-[10px] font-bold text-blue-400 transition-all"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {mode === 'rename' ? 'Rename Folder' : 'Create Folder'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
