'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Target,
    Users,
    Search,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Play,
    User,
    Briefcase,
    UserCheck,
    Shield,
    ChevronDown,
    FileText,
    Zap
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EvaluatePage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<string>('');
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<any>(null);
    const [agentSearch, setAgentSearch] = useState('');
    const [ticketReference, setTicketReference] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        fetchAssignedCampaigns();
        // Get user role from localStorage
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
        }
    }, []);

    const fetchAssignedCampaigns = async () => {
        try {
            const res = await api.get('/campaigns/mine/assigned');
            setCampaigns(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load assigned campaigns');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCampaignSelect = async (campaignId: string) => {
        setSelectedCampaign(campaignId);
        setSelectedAgent(null);
        setAgents([]);
        setAgentSearch('');

        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        setIsLoadingAgents(true);
        try {
            const res = await api.get(`/users/team/${campaign.name}`);
            setAgents(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load agents for this team');
        } finally {
            setIsLoadingAgents(false);
        }
    };


    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
        agent.eid?.toLowerCase().includes(agentSearch.toLowerCase())
    );

    const isAdmin = ['ADMIN', 'QA_TL', 'OPS_TL'].includes(userRole);

    if (isLoading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (userRole === 'AGENT') {
        router.push('/dashboard');
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-blue-400" />
                    <h1 className="text-3xl font-black text-white tracking-tight">Evaluate</h1>
                    {isAdmin && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                            Universal Access
                        </span>
                    )}
                </div>
                <p className="text-slate-400 mt-1 font-medium">
                    {isAdmin
                        ? 'Admin view: Access all campaigns and agents across the organization.'
                        : 'Perform manual quality evaluations on assigned campaigns.'}
                </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-400"
                    >
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {campaigns.length === 0 ? (
                <div className="glass rounded-3xl border border-white/5 p-12 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Campaigns Assigned</h3>
                    <p className="text-slate-500 font-medium">You are not currently assigned to any campaigns. Contact your administrator.</p>
                </div>
            ) : (
                <div className="glass rounded-3xl border border-white/5 p-8 space-y-8">
                    {/* Step 1: Select Campaign */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                                1
                            </div>
                            <h3 className="text-lg font-black text-white">Select Campaign</h3>
                        </div>
                        <div className="relative">
                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                            <select
                                value={selectedCampaign}
                                onChange={(e) => setSelectedCampaign(e.target.value)}
                                className="w-full bg-[#0a0a0b] border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-white focus:ring-2 focus:ring-blue-500/50 transition-all outline-none appearance-none font-medium text-sm"
                            >
                                <option value="">Choose a campaign to evaluate...</option>
                                {campaigns.map(campaign => (
                                    <option key={campaign.id} value={campaign.id}>
                                        {campaign.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                        </div>
                    </div>

                    {/* Check for active form and Redirect Button */}
                    {selectedCampaign && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pt-4"
                        >
                            <button
                                onClick={() => router.push(`/evaluate/${selectedCampaign}`)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                            >
                                <Play className="w-5 h-5" />
                                Proceed to Evaluation Form
                            </button>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}
