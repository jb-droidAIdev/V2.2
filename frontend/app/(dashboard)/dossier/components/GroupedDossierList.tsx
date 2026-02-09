import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Users, Layers, MoreVertical, Pencil, Trash2, UserPlus } from 'lucide-react';
import DossierTable from './DossierTable';
import { cn } from '@/lib/utils';

// Cleaned up interface
interface GroupedDossierListProps {
    users: any[];
    campaigns: any[];
    onDelete: (id: string, name: string) => void;
    onEdit: (user: any) => void;
    onRenameGroup: (oldName: string) => void;
    onDeleteGroup: (name: string) => void;
    onAddMemberToGroup: (teamName: string) => void;
    onRemoveFromGroup: (id: string, name: string) => void;
    onManageCampaigns: (user: any) => void;
    userRole?: string;
    permissions?: string[];
}

export default function GroupedDossierList({
    users,
    campaigns,
    onDelete,
    onEdit,
    onRenameGroup,
    onDeleteGroup,
    onAddMemberToGroup,
    onRemoveFromGroup,
    onManageCampaigns,
    userRole,
    permissions = []
}: GroupedDossierListProps) {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Group users by employeeTeam
    const groupByTeam = users.reduce((acc, user) => {
        const team = user.employeeTeam || 'Unassigned';
        if (!acc[team]) acc[team] = [];
        acc[team].push(user);
        return acc;
    }, {} as Record<string, any[]>);

    // Merge with empty campaigns
    const allTeams = new Set([
        ...Object.keys(groupByTeam),
        ...campaigns.map(c => c.name)
    ]);

    const sortedTeams = Array.from(allTeams).sort();

    return (
        <div className="space-y-6">
            {sortedTeams.map((team, idx) => (
                <CollapsibleGroup
                    key={team}
                    title={team}
                    count={groupByTeam[team]?.length || 0}
                    users={groupByTeam[team] || []}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onRenameGroup={onRenameGroup}
                    onDeleteGroup={onDeleteGroup}
                    onAddMemberToGroup={onAddMemberToGroup}
                    onRemoveFromGroup={onRemoveFromGroup}
                    onManageCampaigns={onManageCampaigns}
                    userRole={userRole}
                    permissions={permissions}
                    defaultOpen={false}
                    isMenuOpen={activeMenu === team}
                    onToggleMenu={() => setActiveMenu(activeMenu === team ? null : team)}
                    onCloseMenu={() => setActiveMenu(null)}
                />
            ))}
        </div>
    );
}

function CollapsibleGroup({
    title,
    count,
    users,
    onDelete,
    onEdit,
    onRenameGroup,
    onDeleteGroup,
    onAddMemberToGroup,
    onRemoveFromGroup,
    onManageCampaigns,
    userRole,
    permissions = [],
    defaultOpen,
    isMenuOpen,
    onToggleMenu,
    onCloseMenu
}: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                if (isMenuOpen) onCloseMenu();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen, onCloseMenu]);

    const handleAction = (action: () => void) => {
        action();
        onCloseMenu();
    };

    return (
        <div className={cn(
            "bg-[#0f172a]/40 border border-white/10 rounded-3xl backdrop-blur-xl relative transition-all shadow-lg hover:shadow-blue-500/5",
            isMenuOpen ? "overflow-visible z-50 shadow-2xl scale-[1.01]" : "overflow-hidden z-0"
        )}>
            <div
                className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 transition-colors"
            >
                <div
                    className="flex items-center gap-4 cursor-pointer flex-1"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border border-white/10",
                        title === 'Unassigned' ? "bg-slate-500/10 text-slate-400" : "bg-blue-500/10 text-blue-400"
                    )}>
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
                        <p className="text-[11px] text-slate-400 font-medium">{count} Members</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Folder Options Menu - ADMIN ONLY */}
                    {title !== 'Unassigned' && (permissions.includes('CAMPAIGN_MANAGE') || userRole === 'ADMIN') && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
                                className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isMenuOpen ? "bg-white/10 text-white" : "hover:bg-white/10 text-slate-400"
                                )}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            <AnimatePresence>
                                {isMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(() => onAddMemberToGroup(title)); }}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 service-hover transition-colors"
                                        >
                                            <UserPlus className="w-4 h-4 text-blue-400" />
                                            Add Member
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(() => onRenameGroup(title)); }}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors"
                                        >
                                            <Pencil className="w-4 h-4 text-amber-400" />
                                            Rename Folder
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(() => onDeleteGroup(title)); }}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Folder
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <button onClick={() => setIsOpen(!isOpen)}>
                        <ChevronDown className={cn("w-5 h-5 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden rounded-b-3xl"
                    >
                        <DossierTable
                            users={users}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onRemoveFromGroup={onRemoveFromGroup}
                            onManageCampaigns={onManageCampaigns}
                            userRole={userRole}
                            permissions={permissions}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
