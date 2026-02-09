import { motion } from 'framer-motion';
import { Pencil, Trash2, ShieldCheck, User, UserMinus, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import InitialsContainer from '@/components/InitialsContainer';

interface DossierTableProps {
    users: any[];
    onDelete: (id: string, name: string) => void;
    onEdit: (user: any) => void;
    onRemoveFromGroup: (id: string, name: string) => void;
    onManageCampaigns: (user: any) => void;
    userRole?: string;
    permissions?: string[];
}

export default function DossierTable({ users, onDelete, onEdit, onRemoveFromGroup, onManageCampaigns, userRole, permissions = [] }: DossierTableProps) {
    if (users.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 italic">
                No records found in this group.
            </div>
        );
    }

    const canManageUsers = permissions.includes('USER_MANAGE') || userRole === 'ADMIN';

    return (
        <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">EID</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Team</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Project</th>
                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Reports To</th>
                        {canManageUsers && <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {users.map((item, idx) => (
                        <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="hover:bg-white/[0.02] transition-colors group"
                        >
                            <td className="px-6 py-3.5">
                                <span className="font-mono text-blue-400 font-bold text-xs">{item.eid || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                    <InitialsContainer
                                        name={item.name}
                                        role={item.role}
                                        size="sm"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-200 text-xs">{item.name}</span>
                                        <span className="text-[10px] text-slate-500 font-medium">{item.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-3.5">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit",
                                    item.role === 'ADMIN' ? "bg-amber-500/10 text-amber-500" :
                                        item.role === 'QA' ? "bg-emerald-500/10 text-emerald-400" :
                                            "bg-blue-500/10 text-blue-400"
                                )}>
                                    {item.role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    {item.role}
                                </span>
                            </td>
                            <td className="px-6 py-3.5 text-slate-400 font-medium text-xs">{item.employeeTeam || 'N/A'}</td>
                            <td className="px-6 py-3.5">
                                <span className="text-slate-300 font-bold bg-white/5 px-2 py-1 rounded-lg border border-white/5 text-[10px]">
                                    {item.projectCode || 'N/A'}
                                </span>
                            </td>
                            <td className="px-6 py-3.5 text-slate-400 font-medium text-xs">
                                {item.supervisor ? (
                                    <div className="flex flex-col">
                                        <span className="text-slate-300">TL: {item.supervisor}</span>
                                        <span className="text-slate-500 text-[10px]">OM: {item.manager}</span>
                                    </div>
                                ) : 'N/A'}
                            </td>
                            {canManageUsers && (
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                                            title="Edit User"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>

                                        {['QA', 'QA_TL', 'QA_MANAGER', 'OPS_TL', 'OPS_MANAGER', 'SDM'].includes(item.role) && (
                                            <button
                                                onClick={() => onManageCampaigns(item)}
                                                className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-colors"
                                                title="Assign Campaigns"
                                            >
                                                <Layers className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {item.employeeTeam && item.employeeTeam !== 'Unassigned' && (
                                            <button
                                                onClick={() => onRemoveFromGroup(item.id, item.name)}
                                                className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-colors"
                                                title="Remove from Folder (Unassign)"
                                            >
                                                <UserMinus className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => onDelete(item.id, item.name)}
                                            className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                                            title="Delete User Permanently"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
