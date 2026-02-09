import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, ShieldCheck, Search, User, CheckCircle2, AlertCircle, Settings, Users, PlusCircle, Lock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface RoleManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Permission {
    id: string;
    code: string;
    description: string;
    module: string;
}

interface RoleConfig {
    id: string;
    name: string;
    description?: string;
    permissions: { permission: Permission }[];
}

interface UserData {
    id: string;
    name: string;
    email: string;
    role: string;
    employeeTeam?: string;
}

// Hardcoded Master List of Permissions
const MASTER_PERMISSIONS: Permission[] = [
    // Dashboard & Pages
    { id: 'p1', code: 'PAGE_DASHBOARD', module: 'Page Access', description: 'Access Dashboard' },
    { id: 'p2', code: 'PAGE_DOSSIER', module: 'Page Access', description: 'Access Dossier (Users)' },
    { id: 'p3', code: 'PAGE_AUDITS', module: 'Page Access', description: 'Access Audits' },
    { id: 'p4', code: 'PAGE_EVALUATE', module: 'Page Access', description: 'Access Evaluation' },
    { id: 'p5', code: 'PAGE_CALIBRATION', module: 'Page Access', description: 'Access Calibration' },
    { id: 'p6', code: 'PAGE_FORMS', module: 'Page Access', description: 'Access Forms' },
    { id: 'p7', code: 'PAGE_ADMIN', module: 'Page Access', description: 'Access Admin Console' },
    { id: 'p8', code: 'DASHBOARD_VIEW', module: 'System', description: 'View Advanced Stats' },

    // Audits
    { id: 'a1', code: 'AUDIT_CREATE', module: 'Audit', description: 'Create Audits' },
    { id: 'a2', code: 'AUDIT_VIEW_SELF', module: 'Audit', description: 'View Own Audits' },
    { id: 'a3', code: 'AUDIT_VIEW_TEAM', module: 'Audit', description: 'View Team Audits' },
    { id: 'a4', code: 'AUDIT_VIEW_ALL', module: 'Audit', description: 'View All Audits' },
    { id: 'a5', code: 'AUDIT_DELETE', module: 'Audit', description: 'Delete Audits' },

    // Disputes
    { id: 'd1', code: 'DISPUTE_CREATE', module: 'Dispute', description: 'File Disputes' },
    { id: 'd2', code: 'DISPUTE_RESOLVE', module: 'Dispute', description: 'Resolve Disputes' },

    // Management
    { id: 'm1', code: 'USER_MANAGE', module: 'System', description: 'Manage Users & Roles' },
    { id: 'm2', code: 'CAMPAIGN_MANAGE', module: 'System', description: 'Manage Campaigns' },
];

export default function RoleManagerModal({ isOpen, onClose }: RoleManagerModalProps) {
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<'assignment' | 'definitions'>('assignment');

    // Data State
    const [users, setUsers] = useState<UserData[]>([]);
    const [roles, setRoles] = useState<RoleConfig[]>([]);

    // Selection State
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [selectedRoleDef, setSelectedRoleDef] = useState<RoleConfig | null>(null);
    const [selectedRoleName, setSelectedRoleName] = useState<string>(''); // For User Assignment
    const [userOverrides, setUserOverrides] = useState<Set<string>>(new Set());

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedUser) {
            setSelectedRoleName(selectedUser.role);
            setUserOverrides(new Set()); // Reset overrides - we can't fetch them, so we start clean
        }
    }, [selectedUser]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Real Roles from Backend
            const rolesRes = await api.get('/users/config/roles');
            setRoles(rolesRes.data);

            // 2. Fetch Users
            const usersRes = await api.get('/users');
            setUsers(usersRes.data);

            // 3. Default Selections
            if (rolesRes.data.length > 0 && !selectedRoleDef) {
                setSelectedRoleDef(rolesRes.data[0]);
            }

            if (usersRes.data.length > 0 && !selectedUser) {
                const firstAdmin = usersRes.data.find((u: UserData) => u.role !== 'AGENT');
                setSelectedUser(firstAdmin || usersRes.data[0]);
            }

        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to fetch roles and users from server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveUserAssignment = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            // Construct advanced payload for Prisma
            const payload: any = {
                role: selectedRoleName
            };

            // If overrides exist, inject the Prisma syntax to update customPermissions
            // WARNING: This depends on backend passing `data` to prisma.update (which we verified)
            if (userOverrides.size > 0) {
                payload.customPermissions = {
                    deleteMany: {}, // Clear previous
                    create: Array.from(userOverrides).map(code => ({
                        permission: { connect: { code: code } }
                    }))
                };
            }

            await api.patch(`/users/${selectedUser.id}`, payload);

            toast.success(`Updated ${selectedUser.name} with role ${selectedRoleName} + ${userOverrides.size} custom permissions`);
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: selectedRoleName } : u));
            setUserOverrides(new Set()); // Reset after save

        } catch (error) {
            console.error(error);
            toast.error('Failed to update user. Backend may have rejected payload.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleUserOverride = (code: string) => {
        if (!selectedUser) return;
        const roleConfig = roles.find(r => r.name === selectedRoleName);
        const roleHasIt = roleConfig?.permissions.some(p => p.permission.code === code);

        if (roleHasIt) {
            toast.info("This permission is inherited from the Role and cannot be removed.", { duration: 2000 });
            return;
        }

        const newOverrides = new Set(userOverrides);
        if (newOverrides.has(code)) {
            newOverrides.delete(code);
        } else {
            newOverrides.add(code);
        }
        setUserOverrides(newOverrides);
    };

    const handleTogglePermissionDef = (permissionCode: string) => {
        if (!selectedRoleDef) return;

        const currentPerms = selectedRoleDef.permissions.map(p => p.permission.code);
        const hasPerm = currentPerms.includes(permissionCode);

        let newPerms: string[];
        if (hasPerm) {
            newPerms = currentPerms.filter(c => c !== permissionCode);
        } else {
            newPerms = [...currentPerms, permissionCode];
        }

        const updatedRole: RoleConfig = {
            ...selectedRoleDef,
            permissions: newPerms.map(c => {
                const p = MASTER_PERMISSIONS.find(mp => mp.code === c);
                return p ? { permission: p } : null;
            }).filter(Boolean) as { permission: Permission }[]
        };

        setRoles(prev => prev.map(r => r.id === selectedRoleDef.id ? updatedRole : r));
        setSelectedRoleDef(updatedRole);
    };

    const handleSaveRoleDefinition = async () => {
        if (!selectedRoleDef) return;
        setIsSaving(true);
        try {
            const permissionCodes = selectedRoleDef.permissions.map(p => p.permission.code);
            await api.patch(`/users/config/roles/${selectedRoleDef.id}`, {
                permissions: permissionCodes
            });
            toast.success(`Role policies successfully updated for ${selectedRoleDef.name}`);
        } catch (error) {
            console.error('Failed to update role policies:', error);
            toast.error('Failed to save role policies to server');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users
        .filter(user => user.role !== 'AGENT')
        .filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const groupedMasterPermissions = MASTER_PERMISSIONS.reduce((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {} as Record<string, Permission[]>);

    // activeRolePermissions logic only for Display? 
    // Actually we need to calculate display state in render.

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
            <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md" />

            <div className="relative w-full max-w-6xl h-[85vh] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-600/30">
                            <ShieldCheck className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Access Control Manager</h2>
                            <p className="text-sm text-slate-400">Manage user roles and system policies</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('assignment')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'assignment' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Users className="w-4 h-4 inline-block mr-2" />
                            User Assignment
                        </button>
                        <button
                            onClick={() => setViewMode('definitions')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'definitions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Settings className="w-4 h-4 inline-block mr-2" />
                            Role Policies
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-80 border-r border-white/10 bg-slate-900/50 flex flex-col">
                        {viewMode === 'assignment' ? (
                            <>
                                <div className="p-4 border-b border-white/5">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {filteredUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUser(user)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedUser?.id === user.id ? 'bg-blue-600/20 border-blue-500/50' : 'hover:bg-white/5'
                                                } border border-transparent`}
                                        >
                                            <div className="text-sm font-bold text-white mb-1">{user.name}</div>
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>{user.email}</span>
                                                <span className="text-blue-400 font-mono">{user.role}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 p-2 space-y-1 mt-4">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRoleDef(role)}
                                        className={`w-full text-left px-4 py-4 rounded-xl transition-all ${selectedRoleDef?.id === role.id ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-white/5'
                                            } border border-transparent`}
                                    >
                                        <div className="text-sm font-bold text-white mb-1">{role.name}</div>
                                        <div className="text-xs text-slate-400">{role.description}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-[#0b1120] overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-8">
                            {viewMode === 'assignment' && selectedUser ? (
                                <div className="max-w-4xl mx-auto space-y-8">
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                        <h3 className="text-xl font-bold text-white mb-2">{selectedUser.name}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                            {roles.map(role => (
                                                <button
                                                    key={role.name}
                                                    onClick={() => setSelectedRoleName(role.name)}
                                                    className={`p-4 rounded-xl border text-left transition-all ${selectedRoleName === role.name
                                                        ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-900/20'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="font-bold text-white mb-1 flex justify-between">
                                                        {role.name}
                                                        {selectedRoleName === role.name && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Effective Permissions</h4>
                                        <p className="text-xs text-slate-500 mb-4">Permissions inherited from the role are <span className="text-emerald-400">Green</span>. Click others to add <span className="text-blue-400">Custom Overrides</span>.</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(groupedMasterPermissions).map(([module, perms]) => (
                                                <div key={module} className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
                                                    <div className="px-4 py-2 bg-white/5 border-b border-white/5 font-bold text-xs text-slate-300">{module}</div>
                                                    <div className="p-2 space-y-1">
                                                        {perms.map(p => {
                                                            const roleConfig = roles.find(r => r.name === selectedRoleName);
                                                            const isInherited = roleConfig?.permissions.some(rp => rp.permission.code === p.code);
                                                            const isOverridden = userOverrides.has(p.code);
                                                            const isActive = isInherited || isOverridden;

                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => handleToggleUserOverride(p.code)}
                                                                    className={`w-full flex items-start gap-3 p-2 rounded-lg transition-colors text-left ${isActive ? 'bg-white/[0.02]' : 'hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isInherited
                                                                        ? 'bg-emerald-600 border-emerald-500'
                                                                        : isOverridden
                                                                            ? 'bg-blue-600 border-blue-500'
                                                                            : 'border-slate-600 bg-transparent'
                                                                        }`}>
                                                                        {isInherited && <Lock className="w-2.5 h-2.5 text-white" />}
                                                                        {isOverridden && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                                                            {p.description}
                                                                        </div>
                                                                        {isInherited && <span className="text-[10px] text-emerald-500/80 uppercase">Inherited</span>}
                                                                        {isOverridden && <span className="text-[10px] text-blue-500/80 uppercase">Custom Add</span>}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : viewMode === 'definitions' && selectedRoleDef ? (
                                <div className="max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{selectedRoleDef.name} Policies</h3>
                                            <p className="text-slate-400">Configure what this role can do (Changes require Server Sync).</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {Object.entries(groupedMasterPermissions).map(([module, perms]) => (
                                            <div key={module} className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
                                                <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                                    <span className="font-bold text-sm text-white">{module}</span>
                                                </div>
                                                <div className="p-2">
                                                    {perms.map(p => {
                                                        const isChecked = selectedRoleDef.permissions.some(rp => rp.permission.code === p.code);
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => handleTogglePermissionDef(p.code)}
                                                                className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${isChecked ? 'bg-blue-600/10 hover:bg-blue-600/20' : 'hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 border-blue-500' : 'border-slate-600 bg-transparent'
                                                                    }`}>
                                                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                                <div>
                                                                    <div className={`text-sm font-medium ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                                                                        {p.description}
                                                                    </div>
                                                                    <div className="text-xs text-slate-600 font-mono mt-0.5">{p.code}</div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500">
                                    <p>Select an item from the sidebar</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-slate-900/50 flex justify-end gap-3 backdrop-blur-md">
                            <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-bold">
                                Close
                            </button>
                            {viewMode === 'assignment' ? (
                                <button
                                    onClick={handleSaveUserAssignment}
                                    disabled={!selectedUser || isSaving}
                                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save User & Permissions</>}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveRoleDefinition}
                                    disabled={!selectedRoleDef || isSaving}
                                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                >
                                    {isSaving ? 'Saving Policy...' : <><Save className="w-4 h-4" /> Save Policy Changes</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
