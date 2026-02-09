'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users as UsersIcon,
    Search,
    Upload,
    UserPlus,
    Loader2,
    ShieldCheck,
    UserCog
} from 'lucide-react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import GroupedDossierList from './components/GroupedDossierList';
import CreateGroupModal from './components/CreateGroupModal';
import UserFormModal from './components/UserFormModal';
import RoleManagerModal from './components/RoleManagerModal';
import AssignMemberModal from './components/AssignMemberModal';
import UserCampaignsModal from './components/UserCampaignsModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

export default function DossierPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [renamingGroup, setRenamingGroup] = useState<{ id: string | null, name: string } | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'admin' | 'users'>('users');
    const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
    const [targetGroup, setTargetGroup] = useState<string>('');
    const [campaignModalUser, setCampaignModalUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                setUserRole(u.role);
                setPermissions(u.permissions || []);
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, campaignsRes] = await Promise.all([
                api.get('/users'),
                api.get('/campaigns')
            ]);
            setUsers(usersRes.data);
            setCampaigns(campaignsRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleCreateGroup = async (name: string) => {
        try {
            await api.post('/campaigns', {
                name,
                type: viewMode === 'admin' ? 'ADMIN' : 'USER'
            });
            toast.success(`Group "${name}" created successfully`);
            setIsCreatingGroup(false);
            fetchData(); // Refresh to show new folder
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create group');
        }
    };

    const handleAddMemberToGroup = (teamName: string) => {
        setTargetGroup(teamName);
        setIsAssignMemberModalOpen(true);
    };

    const handleAssignMember = async (userIds: string[]) => {
        try {
            await Promise.all(userIds.map(id => api.patch(`/users/${id}`, { employeeTeam: targetGroup })));
            toast.success(`${userIds.length} user${userIds.length > 1 ? 's' : ''} assigned to folder`);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to assign users');
            throw err;
        }
    };

    const handleRenameGroupClick = (name: string) => {
        const campaign = campaigns.find(c => c.name === name);
        setRenamingGroup({ id: campaign?.id || null, name });
    };

    const handleRenameSubmit = async (newName: string) => {
        if (!renamingGroup) return;

        try {
            // 1. Rename Campaign Entity (if it exists)
            if (renamingGroup.id) {
                await api.patch(`/campaigns/${renamingGroup.id}`, { name: newName });
            }

            // 2. Bulk update all users in that team
            await api.patch('/users/teams/rename', { oldName: renamingGroup.name, newName });

            toast.success('Folder renamed successfully');
            setRenamingGroup(null);
            fetchData();
        } catch (err: any) {
            console.error('Rename failed:', err);
            toast.error('Failed to rename folder');
        }
    };

    const handleDeleteGroup = async (name: string) => {
        const teamUsersCount = users.filter(u => u.employeeTeam === name).length;

        setConfirmConfig({
            isOpen: true,
            title: 'Delete Folder',
            message: `Are you sure you want to delete "${name}"? This will delete the campaign config and move ${teamUsersCount} members to Unassigned.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.patch('/users/teams/rename', { oldName: name, newName: '' });
                    const campaign = campaigns.find(c => c.name === name);
                    if (campaign) {
                        await api.delete(`/campaigns/${campaign.id}`);
                    }
                    toast.success('Folder deleted and users unassigned');
                    fetchData();
                } catch (err: any) {
                    console.error('Delete failed:', err);
                    toast.error('Failed to delete folder');
                }
            }
        });
    };

    const handleCreateUser = () => {
        setEditingUser(null);
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user: any) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (data: any) => {
        try {
            if (editingUser) {
                await api.patch(`/users/${editingUser.id}`, data);
                toast.success('User updated successfully');
            } else {
                const res = await api.post('/users', { ...data, password: 'Standard123!' });
                const userEmail = res.data.email;
                toast.success(`User created safely. Username: ${userEmail} | Password: Standard123!`);
            }
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Operation failed');
            throw err;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map Excel headers to database fields with flexible matching
                const mappedData = data.map((row: any) => {
                    const getVal = (possibleKeys: string[]) => {
                        const key = possibleKeys.find(k => row[k] !== undefined);
                        return key ? row[key] : undefined;
                    };

                    return {
                        eid: String(getVal(['EID', 'Employee ID', 'eid']) || ''),
                        name: getVal(['Agent Name', 'Name', 'name', 'Full Name']) || '',
                        systemId: String(getVal(['SystemID', 'System ID', 'systemId', 'id']) || ''),
                        role: (String(getVal(['Role', 'role', 'Position']) || 'AGENT')).toUpperCase(),
                        billable: getVal(['Billable', 'billable']) === 'Yes' || getVal(['Billable', 'billable']) === true,
                        employeeTeam: getVal(['Employee Team', 'Team', 'team', 'Campaign', 'campaign', 'employeeTeam']) || '',
                        projectCode: getVal(['Project Code', 'Project', 'projectCode', 'Code']) || '',
                        supervisor: getVal(['Supervisor', 'supervisor', 'TL']) || '',
                        manager: getVal(['Manager', 'manager', 'OM']) || '',
                        sdm: getVal(['SDM', 'sdm']) || '',
                        email: getVal(['Email', 'email', 'User Email']) ||
                            (getVal(['EID', 'Employee ID', 'eid']) ? `${getVal(['EID', 'Employee ID', 'eid'])}@flatworld.ph` : `${Math.random().toString(36).substring(7)}@placeholder.com`),
                    };
                });

                await api.post('/users/bulk', mappedData);
                toast.success('Users imported successfully!');
                fetchData();
            } catch (err) {
                console.error('Import failed:', err);
                toast.error('Failed to import users. Please check the file format.');
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleDelete = async (id: string, name: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Remove Employee',
            message: `Are you sure you want to remove ${name}? This action cannot be undone and will erase all profile links.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/users/${id}`);
                    setUsers(prev => prev.filter(u => u.id !== id));
                    toast.success(`${name} removed successfully`);
                } catch (err: any) {
                    console.error('Delete failed:', err);
                    toast.error(err.response?.data?.message || 'Failed to delete user.');
                }
            }
        });
    };

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            user.name.toLowerCase().includes(searchLower) ||
            user.eid?.toLowerCase().includes(searchLower) ||
            user.systemId?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        // Role-based filtering for tabs
        if (viewMode === 'admin') {
            return ['ADMIN', 'QA', 'QA_TL', 'OPS_TL'].includes(user.role);
        } else {
            return user.role === 'AGENT'; // Or everyone? Usually 'Users' implies the general workforce
        }
    });

    return (
        <>
            {/* Engine Sync Overlay (Loading & Importing) */}
            <AnimatePresence mode="wait">
                {(isImporting || isLoading) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black backdrop-blur-3xl flex items-center justify-center p-6 text-center"
                    >
                        <div className="bg-[#0f172a] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full space-y-6">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner shadow-blue-500/20">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white px-4">
                                    {isImporting ? 'Engine Syncing...' : 'Readying Dossier...'}
                                </h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    {isImporting
                                        ? 'Processing large dataset. Mapping profiles and securing records in the database.'
                                        : 'Connecting to database and validating local employee directory records.'}
                                </p>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                                    animate={{
                                        width: ["0%", "30%", "60%", "90%"],
                                    }}
                                    transition={{
                                        duration: 6,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                            </div>
                            {isImporting && (
                                <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em]">
                                    Do not close during sync
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-8 animate-in fade-in duration-700 no-scrollbar relative z-10">
                {/* Header section with branding and actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-blue-400">
                            <UsersIcon className="w-6 h-6" />
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em]">Employee Directory</h2>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter">Dossier</h1>
                        <p className="text-slate-400 font-medium">Manage and view detailed employee profiles and project assignments.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {(permissions.includes('CAMPAIGN_MANAGE') || userRole === 'ADMIN') && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsCreatingGroup(true)}
                                    className="flex items-center gap-2 bg-[#0f172a] hover:bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95"
                                >
                                    <Layers className="w-5 h-5 text-blue-400" />
                                    <span>Create Folder</span>
                                </button>
                            </div>
                        )}

                        {(permissions.includes('USER_MANAGE') || userRole === 'ADMIN') && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleImportClick}
                                    disabled={isImporting}
                                    className="flex items-center gap-2 bg-[#0f172a] hover:bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-emerald-400" />}
                                    <span>Import Users</span>
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileUpload}
                                />

                                <button
                                    onClick={() => {
                                        setEditingUser(null);
                                        setIsUserModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    <span>Add Employee</span>
                                </button>

                                <button
                                    onClick={() => setIsRoleManagerOpen(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border border-indigo-400/20"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                    <span>Manage Roles</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Mode Toggle */}
                {['ADMIN', 'QA_TL', 'QA_MANAGER'].includes(userRole) && (
                    <div className="flex justify-center">
                        <div className="bg-[#0f172a]/40 p-1.5 rounded-2xl border border-white/10 flex gap-1 shadow-inner">
                            <button
                                onClick={() => setViewMode('users')}
                                className={cn(
                                    "px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    viewMode === 'users'
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                        : "hover:bg-white/5 text-slate-400"
                                )}
                            >
                                <UsersIcon className="w-4 h-4" /> Users
                            </button>
                            <button
                                onClick={() => setViewMode('admin')}
                                className={cn(
                                    "px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    viewMode === 'admin'
                                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                        : "hover:bg-white/5 text-slate-400"
                                )}
                            >
                                <ShieldCheck className="w-4 h-4" /> Administrators
                            </button>
                        </div>
                    </div>
                )}

                {/* Search and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by EID, Name, or SystemID..."
                            className="w-full bg-[#0f172a]/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 md:col-span-2">
                        <div className="w-full bg-[#0f172a]/50 border border-white/10 py-3.5 rounded-2xl px-4 text-slate-400 text-sm font-medium">
                            {viewMode === 'admin' ? 'Admin Staff' : 'Active Agents'}: <span className="text-white font-bold">{filteredUsers.length}</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <GroupedDossierList
                    users={filteredUsers}
                    campaigns={campaigns.filter(c => {
                        const targetType = viewMode === 'admin' ? 'ADMIN' : 'USER';
                        return c.type === targetType || (!c.type && targetType === 'USER');
                    })}
                    userRole={userRole}
                    permissions={permissions}
                    onDelete={handleDelete}
                    onEdit={handleEditUser}
                    onRenameGroup={handleRenameGroupClick}
                    onDeleteGroup={handleDeleteGroup}
                    onAddMemberToGroup={handleAddMemberToGroup}
                    onRemoveFromGroup={async (userId, userName) => {
                        setConfirmConfig({
                            isOpen: true,
                            title: 'Remove from Group',
                            message: `Remove ${userName} from this group? They will be moved to the Unassigned folder.`,
                            variant: 'warning',
                            onConfirm: async () => {
                                try {
                                    await api.patch(`/users/${userId}`, { employeeTeam: 'Unassigned' });
                                    toast.success(`${userName} removed from group`);
                                    fetchData();
                                } catch (err) {
                                    toast.error('Failed to remove user from group');
                                }
                            }
                        });
                    }}
                    onManageCampaigns={(user) => setCampaignModalUser(user)}
                />

                <CreateGroupModal
                    isOpen={isCreatingGroup || !!renamingGroup}
                    onClose={() => {
                        setIsCreatingGroup(false);
                        setRenamingGroup(null);
                    }}
                    onCreate={renamingGroup ? handleRenameSubmit : handleCreateGroup}
                    initialValue={renamingGroup ? renamingGroup.name : ''}
                    mode={renamingGroup ? 'rename' : 'create'}
                    suggestedNames={Array.from(new Set(
                        users
                            .filter(u => {
                                if (viewMode === 'admin') return ['ADMIN', 'QA', 'QA_TL', 'QA_MANAGER', 'OPS_TL', 'OPS_MANAGER', 'SDM'].includes(u.role);
                                return u.role === 'AGENT';
                            })
                            .map(u => (u.employeeTeam || '').trim())
                    ))
                        .filter(team => {
                            if (!team || team === 'Unassigned') return false;
                            return !campaigns.some(c => c.name.toLowerCase().trim() === team.toLowerCase());
                        })
                        .sort()}
                />


                {isUserModalOpen && (
                    <UserFormModal
                        isOpen={isUserModalOpen}
                        onClose={() => {
                            setIsUserModalOpen(false);
                            setEditingUser(null);
                        }}
                        onSubmit={handleSaveUser}
                        initialData={editingUser}
                        viewMode={viewMode}
                        campaigns={campaigns
                            .filter(c => {
                                const targetType = viewMode === 'admin' ? 'ADMIN' : 'USER';
                                return c.type === targetType || (!c.type && targetType === 'USER');
                            })
                            .map(c => c.name)}
                    />
                )}

                <AssignMemberModal
                    isOpen={isAssignMemberModalOpen}
                    onClose={() => setIsAssignMemberModalOpen(false)}
                    onAssign={handleAssignMember}
                    targetTeam={targetGroup}
                    unassignedUsers={users.filter(u => !u.employeeTeam || u.employeeTeam === 'Unassigned' || u.employeeTeam === '')}
                />

                <UserCampaignsModal
                    isOpen={!!campaignModalUser}
                    onClose={() => setCampaignModalUser(null)}
                    user={campaignModalUser}
                    allCampaigns={[
                        ...campaigns,
                        // Add implicit teams (teams that exist in users but have no campaign entity yet)
                        ...Array.from(new Set(users.map(u => (u.employeeTeam || '').trim())))
                            .filter(team => {
                                if (!team || team === 'Unassigned') return false;
                                // Check if campaign exists (case-insensitive)
                                const exists = campaigns.some(c => c.name.toLowerCase().trim() === team.toLowerCase());
                                return !exists;
                            })
                            .map(team => ({
                                id: `NEW-${team}`,
                                name: team,
                                isImplicit: true
                            }))
                    ].sort((a, b) => a.name.localeCompare(b.name))}
                />

                <RoleManagerModal
                    isOpen={isRoleManagerOpen}
                    onClose={() => setIsRoleManagerOpen(false)}
                />

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmConfig.onConfirm}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    variant={confirmConfig.variant}
                />
            </div>
        </>
    );
}
