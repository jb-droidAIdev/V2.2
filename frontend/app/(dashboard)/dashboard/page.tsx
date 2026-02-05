'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Target,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Clock,
    ArrowUpRight,
    ArrowLeft,
    Loader2,
    Users,
    Maximize2,
    X,
    Sparkles,
    Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
    PieChart, // Add this
    Pie,      // Add this
    RadialBarChart, // Add this
    RadialBar,      // Add this
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import DashboardFilterBar from './components/DashboardFilterBar';

const CustomTooltip = ({ active, payload, label, unit = "" }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="bg-[#0f172a]/95 border border-white/10 p-4 rounded-[1.2rem] shadow-2xl backdrop-blur-md min-w-[140px]">
                {label && (
                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.1em] mb-2.5 border-b border-white/5 pb-2">
                        {label}
                    </p>
                )}
                <div className="flex items-center gap-3">
                    <div
                        className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                        style={{ backgroundColor: item.color || item.payload?.fill || item.fill || '#3b82f6' }}
                    />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                            {item.name}
                        </span>
                        <span className="text-lg font-black text-white leading-none">
                            {item.value}<span className="text-blue-400 ml-0.5">{unit}</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [drilldownCategory, setDrilldownCategory] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false);
    const [userName, setUserName] = useState<string>('');
    const [greeting, setGreeting] = useState<string>('Good Morning');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false); // Flip card state
    const [expandedChart, setExpandedChart] = useState<string | null>(null); // State for maximized view
    const [filterOptions, setFilterOptions] = useState({
        campaigns: [],
        supervisors: [],
        sdms: [],
        qas: [],
        agents: []
    });

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        ticketId: '',
        agentId: [],
        campaignId: [],
        supervisor: [],
        sdm: [],
        auditorId: []
    });
    const [trendView, setTrendView] = useState<'day' | 'week' | 'month'>('day');

    const fetchData = useCallback(async (isInitial = false, customFilters?: any) => {
        if (!isInitial) setIsFiltering(true);
        try {
            const activeFilters = customFilters || filters;
            const queryParams = new URLSearchParams();
            queryParams.append('granularity', trendView);
            Object.entries(activeFilters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(val => {
                        if (val) queryParams.append(key, val);
                    });
                } else if (value) {
                    queryParams.append(key, String(value));
                }
            });

            const response = await api.get(`/dashboard/stats?${queryParams.toString()}`);
            setStats(response.data);

            if (isInitial) {
                const filtersRes = await api.get('/dashboard/filters');
                setFilterOptions(filtersRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setIsLoading(false);
            setIsFiltering(false);
        }
    }, [filters, trendView]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserName(user.name?.split(' ')[0] || 'User');
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }

        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting('Good Morning');
        else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');

        fetchData(true);
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-slate-400 font-medium animate-pulse">Syncing Engine Intelligence...</p>
            </div>
        );
    }

    const statCards = [
        { name: 'Total Audits', value: stats?.summary?.totalAudits || 0, change: 'Volume', icon: Target, color: 'text-blue-500', trend: 'neutral' },
        { name: 'Average Score', value: `${stats?.summary?.avgScore || 0}%`, change: 'Quality', icon: TrendingUp, color: 'text-indigo-500', trend: 'up' },
        { name: 'Compliance Rate', value: `${stats?.summary?.complianceRate || 0}%`, change: 'Target 90%', icon: CheckCircle2, color: 'text-green-500', trend: 'up' },
        { name: 'Dispute Rate', value: `${stats?.summary?.disputeRate || 0}%`, change: 'Accuracy', icon: AlertCircle, color: 'text-rose-500', trend: 'down' },
    ];

    return (
        <div className="space-y-8 relative pb-20">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10 pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white">{greeting}, {userName}</h1>
                    <p className="text-slate-400 mt-2 font-medium">Real-time intelligence across all active monitoring programs.</p>
                </div>
            </div>

            <DashboardFilterBar
                filters={filters}
                setFilters={setFilters}
                filterOptions={filterOptions}
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                onApply={(f) => fetchData(false, f)}
            />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "space-y-8 transition-all duration-300",
                    isFiltering ? "opacity-50 scale-[0.99] pointer-events-none" : "opacity-100 scale-100"
                )}
            >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, idx) => (
                        <div
                            key={stat.name}
                            className="glass p-6 rounded-3xl relative overflow-hidden group hover:bg-white/[0.04] transition-all cursor-default border border-white/5 shadow-2xl"
                        >
                            <div className="flex justify-between items-start">
                                <div className={cn("p-3 rounded-2xl bg-white/5 shadow-inner", stat.color)}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                                    {stat.change}
                                </span>
                            </div>
                            <div className="mt-8">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.name}</p>
                                <p className="text-4xl font-black mt-1 text-white tabular-nums tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Area Chart - FLIP CARD */}
                    <div
                        className="lg:col-span-2 relative"
                        style={{ perspective: '1000px', height: '470px' }}
                    >
                        <motion.div
                            className="relative w-full h-full"
                            style={{ transformStyle: 'preserve-3d' }}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                        >
                            {/* FRONT - Chart */}
                            <div
                                className="absolute inset-0 glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden'
                                }}
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Quality Trend</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                                            {(['day', 'week', 'month'] as const).map((view) => (
                                                <button
                                                    key={view}
                                                    onClick={() => setTrendView(view)}
                                                    className={cn(
                                                        "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                                                        trendView === view ? "bg-blue-500 text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    {view === 'day' ? 'Daily' : view === 'week' ? 'Weekly' : 'Monthly'}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setIsFlipped(!isFlipped)}
                                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all group"
                                            title="View Agent Scores"
                                        >
                                            <Users className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                                        </button>
                                        <button
                                            onClick={() => setExpandedChart('trend')}
                                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all group"
                                            title="Maximize Chart"
                                        >
                                            <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-white" />
                                        </button>
                                    </div>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={stats?.trend || []}
                                            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                                dx={-10}
                                                tickFormatter={(value) => `${value}%`}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip unit="%" />}
                                                cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 6' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="avgScore"
                                                name="Average Score"
                                                stroke="#2563eb"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                                animationDuration={2000}
                                                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#0f172a' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                label={(props: any) => (
                                                    <text x={props.x} y={props.y - 12} fill="#cbd5e1" fontSize={10} fontWeight={700} textAnchor="middle">
                                                        {props.value}%
                                                    </text>
                                                )}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* BACK - Agent Scores Table */}
                            <div
                                className="absolute inset-0 glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl overflow-hidden"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)'
                                }}
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Agent Scores</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                            Performance Overview
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsFlipped(!isFlipped)}
                                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-all group"
                                        title="View Chart"
                                    >
                                        <TrendingUp className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                                    </button>
                                </div>

                                <div className="h-[350px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-[#0a0a0b] z-10">
                                            <tr className="border-b border-white/10">
                                                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                    Agent Name
                                                </th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">
                                                    # of Audits
                                                </th>
                                                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">
                                                    Average Score
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {stats?.agentScores && stats.agentScores.length > 0 ? (
                                                stats.agentScores.map((agent: any, idx: number) => (
                                                    <motion.tr
                                                        key={agent.agentId || idx}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className="group hover:bg-white/[0.02] transition-colors"
                                                    >
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                                                                    agent.avgScore >= 95 ? "bg-green-500/10 text-green-400" :
                                                                        agent.avgScore >= 88 ? "bg-blue-500/10 text-blue-400" :
                                                                            "bg-amber-500/10 text-amber-400"
                                                                )}>
                                                                    {agent.agentName?.substring(0, 2).toUpperCase() || 'AG'}
                                                                </div>
                                                                <span className="font-bold text-slate-200 text-sm">
                                                                    {agent.agentName || 'Unknown Agent'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-white/5 border border-white/5">
                                                                <span className="text-sm font-black text-white tabular-nums">
                                                                    {agent.auditCount || 0}
                                                                </span>
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="flex-1 max-w-[100px] h-2 bg-white/5 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        className={cn(
                                                                            "h-full rounded-full",
                                                                            agent.avgScore >= 95 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                                                                                agent.avgScore >= 88 ? "bg-gradient-to-r from-blue-500 to-cyan-400" :
                                                                                    "bg-gradient-to-r from-amber-500 to-orange-400"
                                                                        )}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${agent.avgScore || 0}%` }}
                                                                        transition={{ duration: 1, delay: idx * 0.05 }}
                                                                    />
                                                                </div>
                                                                <span className={cn(
                                                                    "text-lg font-black tabular-nums min-w-[60px] text-right",
                                                                    agent.avgScore >= 95 ? "text-green-400" :
                                                                        agent.avgScore >= 88 ? "text-blue-400" :
                                                                            "text-amber-400"
                                                                )}>
                                                                    {agent.avgScore?.toFixed(1) || '0.0'}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="py-12 text-center">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Users className="w-8 h-8 text-slate-600" />
                                                            <p className="text-sm text-slate-500 font-medium">No agent data available</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Opportunity Heatmap - Linear Distribution View */}
                    <div className="glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl flex flex-col relative overflow-hidden min-h-[440px]">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">
                                    {drilldownCategory ? drilldownCategory.name : 'Opportunity Areas'}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                    {drilldownCategory ? 'Ranked Error Distribution' : 'Category Error Distribution'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {drilldownCategory && (
                                    <button
                                        onClick={() => setDrilldownCategory(null)}
                                        className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                                <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Total</span>
                                    <span className="text-sm font-black text-white">
                                        {(drilldownCategory ? drilldownCategory.parameters : (stats?.failureHeatmap || []))?.reduce((acc: number, curr: any) => acc + curr.value, 0)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setExpandedChart('heatmap')}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all group"
                                    title="Maximize Chart"
                                >
                                    <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-white" />
                                </button>
                            </div>
                        </div>

                        {(!stats?.failureHeatmap || stats.failureHeatmap.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Error Data</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* TOP: Segmented Distribution Bar */}
                                <div className="mb-8 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="h-6 w-full flex rounded-xl overflow-hidden shadow-inner">
                                        {(() => {
                                            const rawData = drilldownCategory ? (drilldownCategory.parameters || []) : (stats?.failureHeatmap || []);
                                            const total = rawData.reduce((acc: number, curr: any) => acc + curr.value, 0);
                                            return rawData.map((entry: any, index: number) => {
                                                const percentage = total > 0 ? (entry.value / total) * 100 : 0;
                                                if (percentage < 1) return null;
                                                return (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        className="h-full relative group cursor-pointer"
                                                        style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }}
                                                        onClick={() => !drilldownCategory && setDrilldownCategory(entry)}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </motion.div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    <div className="flex justify-between items-center mt-3 px-1">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-blue-900" />
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">High Impact</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-blue-300" />
                                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Low Impact</span>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Proportional Distribution View</span>
                                    </div>
                                </div>

                                {/* BOTTOM: Lean Detailed List */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                    {(() => {
                                        const rawData = drilldownCategory ? (drilldownCategory.parameters || []) : (stats?.failureHeatmap || []);
                                        const sortedData = [...rawData].sort((a: any, b: any) => b.value - a.value);
                                        const total = sortedData.reduce((acc: number, curr: any) => acc + curr.value, 0);

                                        return sortedData.map((entry: any, index: number) => {
                                            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    onClick={() => !drilldownCategory && setDrilldownCategory(entry)}
                                                    className={cn(
                                                        "group flex flex-col transition-all",
                                                        !drilldownCategory ? "cursor-pointer" : "cursor-default"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="w-2 h-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }}
                                                            />
                                                            <span className="text-xs font-bold text-slate-300 truncate group-hover:text-white transition-colors tracking-tight">
                                                                {entry.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                                            <span className="text-xs font-black text-white">{entry.value}</span>
                                                            <span className="text-[10px] font-bold text-slate-600">({percentage}%)</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Critical Errors</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Recent Errors</p>
                        </div>
                        <Link href={{
                            pathname: '/fails',
                            query: Object.fromEntries(
                                Object.entries(filters).filter(([_, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                            )
                        }}>
                            <button className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-[0.2em] bg-rose-400/5 px-4 py-2 rounded-xl transition-all border border-rose-500/10">
                                View All Errors <ArrowUpRight className="w-3 h-3 ml-1 inline" />
                            </button>
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <th className="py-4 pl-4">Agent Name</th>
                                    <th className="py-4">Ticket ID</th>
                                    <th className="py-4">Campaign</th>
                                    <th className="py-4">Form Category</th>
                                    <th className="py-4">Parameter</th>
                                    <th className="py-4">Auditor Remarks</th>
                                    <th className="py-4 pr-4 text-center">Impact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats?.failedAudits?.flatMap((audit: any) =>
                                    audit.scores.map((score: any, idx: number) => {
                                        return (
                                            <tr key={`${audit.id}-${idx}`} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 pl-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold text-xs">
                                                            {audit.agent?.name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-slate-200 text-xs">{audit.agent?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className="font-mono text-xs text-blue-400 font-bold">
                                                        {audit.sampledTicket?.ticket?.externalTicketId || audit.ticketReference || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-xs font-bold text-slate-300">{audit.campaign?.name}</span>
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white/5 px-2 py-1 rounded">
                                                        {score.categoryLabel || score.criterion?.categoryName || 'General'}
                                                    </span>
                                                </td>
                                                <td className="py-4 max-w-[200px]">
                                                    <span className="text-xs font-bold text-rose-300 block truncate" title={score.criterionTitle || score.criterion?.title}>
                                                        {score.criterionTitle || score.criterion?.title || 'Unknown Parameter'}
                                                    </span>
                                                </td>
                                                <td className="py-4 max-w-[300px]">
                                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                                                        <p className="text-[10px] text-rose-200/80 font-medium italic line-clamp-2 leading-relaxed" title={score.comment}>
                                                            "{score.comment || 'No remarks provided'}"
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 text-center">
                                                    {(() => {
                                                        const cat = score.categoryLabel || score.criterion?.categoryName;
                                                        const impactMap: Record<string, { label: string, style: string }> = {
                                                            'Customer Critical': { label: 'Customer Impacting', style: 'bg-rose-500/20 text-rose-400 border-rose-500/20' },
                                                            'Process Critical': { label: 'Process Defect', style: 'bg-amber-500/20 text-amber-400 border-amber-500/20' },
                                                            'Business Critical': { label: 'Business Impacting', style: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
                                                            'Compliance Critical': { label: '', style: '' },
                                                            'Non Critical': { label: 'Standard Defect', style: 'bg-slate-500/20 text-slate-400 border-slate-500/20' }
                                                        };
                                                        const config = impactMap[cat] || { label: 'Critical Error', style: 'bg-slate-500/20 text-slate-400 border-slate-500/20' };

                                                        if (!config.label) return null;

                                                        return (
                                                            <span className={cn(
                                                                "px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider whitespace-nowrap",
                                                                config.style
                                                            )}>
                                                                {config.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {(!stats?.failedAudits || stats.failedAudits.length === 0) && (
                        <div className="py-20 text-center glass rounded-[2rem] border-dashed border-white/10 mt-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Critical Errors Found</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Maximized Chart Modal */}
            <AnimatePresence>
                {expandedChart && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setExpandedChart(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-7xl h-[85vh] glass rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.2)] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/10 flex justify-between items-center shrink-0 bg-white/[0.02]">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">
                                        {expandedChart === 'trend' && (isFlipped ? 'Agent Performance Data' : 'Quality Trend Analysis')}
                                        {expandedChart === 'heatmap' && (drilldownCategory ? `Opportunity: ${drilldownCategory.name}` : 'Opportunity Areas Analysis')}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">
                                        {expandedChart === 'trend' && (isFlipped ? 'Detailed Agent Performance Metrics' : 'Historical Quality Trends')}
                                        {expandedChart === 'heatmap' && (drilldownCategory ? 'Parameter Level Drilldown' : 'Category Performance Breakdown')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {expandedChart === 'trend' && (
                                        <button
                                            onClick={() => setIsFlipped(!isFlipped)}
                                            className="p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-2xl border border-blue-500/20 transition-all group"
                                            title={isFlipped ? "View Trend Chart" : "View Agent Scores"}
                                        >
                                            {isFlipped ? (
                                                <TrendingUp className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                                            ) : (
                                                <Users className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedChart(null)}
                                        className="p-4 bg-white/5 hover:bg-rose-500/20 rounded-2xl border border-white/10 transition-all group hover:border-rose-500/30"
                                    >
                                        <X className="w-6 h-6 text-slate-400 group-hover:text-rose-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                                {expandedChart === 'trend' && !isFlipped && (
                                    <div className="h-full min-h-[500px] w-full">
                                        <div className="flex justify-end mb-8">
                                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                                {(['day', 'week', 'month'] as const).map((view) => (
                                                    <button
                                                        key={view}
                                                        onClick={() => setTrendView(view)}
                                                        className={cn(
                                                            "px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                                                            trendView === view ? "bg-blue-500 text-white shadow-xl" : "text-slate-500 hover:text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        {view === 'day' ? 'Daily' : view === 'week' ? 'Weekly' : 'Monthly'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-[90%] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={stats?.trend || []}
                                                    margin={{ top: 40, right: 60, left: 20, bottom: 20 }}
                                                >
                                                    <defs>
                                                        <linearGradient id="colorScoreModal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                                                        dx={-10}
                                                        tickFormatter={(v) => `${v}%`}
                                                    />
                                                    <Tooltip content={<CustomTooltip unit="%" />} />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="avgScore"
                                                        stroke="#2563eb"
                                                        strokeWidth={6}
                                                        fill="url(#colorScoreModal)"
                                                        animationDuration={1500}
                                                        dot={{ r: 6, fill: '#2563eb', strokeWidth: 3, stroke: '#0f172a' }}
                                                        label={(props: any) => (
                                                            <text
                                                                x={props.x}
                                                                y={props.y - 20}
                                                                fill="#fff"
                                                                fontSize={14}
                                                                fontWeight={900}
                                                                textAnchor="middle"
                                                            >
                                                                {props.value}%
                                                            </text>
                                                        )}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {expandedChart === 'trend' && isFlipped && (
                                    <div className="w-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <Users className="w-5 h-5 text-blue-400" />
                                                <h3 className="text-sm font-black uppercase text-slate-500 tracking-[0.2em]">Agent Performance Ledger</h3>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Roster:</span>
                                                <span className="text-xs font-black text-blue-400">{stats?.agentScores?.length || 0}</span>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-white/5">
                                                        <th className="py-2 px-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Agent Name</th>
                                                        <th className="py-2 px-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Audits Conducted</th>
                                                        <th className="py-2 px-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-right">Quality Score</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.02]">
                                                    {stats?.agentScores?.map((agent: any, idx: number) => (
                                                        <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                                            <td className="py-2 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black shrink-0",
                                                                        agent.avgScore >= 95 ? "bg-green-500/10 text-green-400" :
                                                                            agent.avgScore >= 88 ? "bg-blue-500/10 text-blue-400" :
                                                                                "bg-amber-500/10 text-amber-400"
                                                                    )}>
                                                                        {agent.agentName?.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="font-bold text-slate-200 text-[11px] truncate">{agent.agentName}</span>
                                                                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-tighter truncate">{agent.agentTeam || 'Direct Report'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2 px-4 text-center">
                                                                <span className="text-[10px] font-black text-slate-400 bg-white/5 px-3 py-0.5 rounded-md border border-white/5">
                                                                    {agent.auditCount}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-4">
                                                                    <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden shrink-0 hidden md:block">
                                                                        <div
                                                                            className={cn(
                                                                                "h-full rounded-full transition-all duration-1000",
                                                                                agent.avgScore >= 95 ? "bg-green-500" :
                                                                                    agent.avgScore >= 88 ? "bg-blue-500" :
                                                                                        "bg-amber-500"
                                                                            )}
                                                                            style={{ width: `${agent.avgScore}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-xs font-black min-w-[40px]",
                                                                        agent.avgScore >= 95 ? "text-green-400" :
                                                                            agent.avgScore >= 88 ? "text-blue-400" :
                                                                                "text-amber-400"
                                                                    )}>{agent.avgScore?.toFixed(1)}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {expandedChart === 'heatmap' && (
                                    <div className="flex flex-col h-full gap-6">
                                        {/* Top Summary Bar - Ultra-Compact */}
                                        <div className="shrink-0">
                                            <div className="glass bg-blue-500/5 px-6 py-3 rounded-2xl border border-blue-500/10 flex items-center gap-4 w-full">
                                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <Target className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase text-blue-400/70 tracking-[0.2em]">Current Analysis Scope</p>
                                                        <p className="text-sm font-black text-white leading-tight">
                                                            {drilldownCategory ? `Opportunity: ${drilldownCategory.name}` : 'Global Quality Opportunity Heatmap'}
                                                        </p>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Interactive Analysis Mode</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
                                            {/* LEFT: Pie Chart (Compact) */}
                                            <div className="lg:col-span-4 glass rounded-[2.5rem] border border-white/5 bg-white/[0.01] relative flex items-center justify-center p-8">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={drilldownCategory ? (drilldownCategory.parameters || []) : (stats?.failureHeatmap || [])}
                                                            cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} dataKey="value" stroke="none"
                                                            onClick={(d) => !drilldownCategory && setDrilldownCategory(d)}
                                                        >
                                                            {(drilldownCategory ? drilldownCategory.parameters : (stats?.failureHeatmap || []))?.map((entry: any, index: number) => (
                                                                <Cell key={index} fill={['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomTooltip />} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Errors</span>
                                                    <span className="text-3xl font-black text-white">
                                                        {(drilldownCategory ? drilldownCategory.parameters : (stats?.failureHeatmap || []))?.reduce((acc: number, curr: any) => acc + curr.value, 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* RIGHT: High-Density Grid Breakdown (No Scroll Focus) */}
                                            <div className="lg:col-span-8 glass rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 flex flex-col min-h-0 overflow-hidden">
                                                <div className="flex justify-between items-center mb-6 shrink-0">
                                                    <div className="flex items-center gap-3">
                                                        <TrendingUp className="w-4 h-4 text-slate-500" />
                                                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">Ranked Breakdown Analysis</h3>
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                                                        {(() => {
                                                            const data = [...(drilldownCategory ? drilldownCategory.parameters : (stats?.failureHeatmap || []))].sort((a, b) => b.value - a.value);
                                                            const total = data.reduce((acc, curr) => acc + curr.value, 0);

                                                            return data.map((entry, index) => {
                                                                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
                                                                return (
                                                                    <motion.div
                                                                        key={index}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: index * 0.03 }}
                                                                        className="group flex flex-col p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.05] transition-all"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2 gap-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                                    style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }}
                                                                                />
                                                                                <span className="text-[11px] font-bold text-slate-300 leading-tight truncate">
                                                                                    {entry.name}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <span className="text-sm font-black text-white">{entry.value}</span>
                                                                                <span className="text-[9px] font-bold text-slate-500">({percentage}%)</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${percentage}%` }}
                                                                                className="h-full rounded-full"
                                                                                style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }}
                                                                            />
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
