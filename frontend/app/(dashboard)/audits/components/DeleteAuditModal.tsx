import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface DeleteAuditModalProps {
    target: any;
    onClose: () => void;
    onConfirm: () => void;
}

export default function DeleteAuditModal({ target, onClose, onConfirm }: DeleteAuditModalProps) {
    if (!target) return null;

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
                    className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
                >
                    {/* Decorative Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 blur-[80px] rounded-full" />

                    <div className="relative space-y-6 text-center">
                        <div className="mx-auto w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center border border-rose-500/20">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">Delete Audit?</h3>
                            <p className="text-slate-400 font-medium">
                                You are about to delete the audit for ticket <span className="text-rose-400 font-bold">{target.ticketReference || target.sampledTicket?.ticket?.externalTicketId}</span>. This cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20"
                            >
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
