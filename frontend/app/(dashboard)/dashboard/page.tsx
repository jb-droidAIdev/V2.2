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
    Loader2
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
    const [filterOptions, setFilterOptions] = useState({
        campaigns: [],
        supervisors: [],
        sdms: [],
        qas: []
    });

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        agentName: '',
        campaignId: [],
        supervisor: [],
        sdm: [],
        auditorId: []
    });
    const [trendView, setTrendView] = useState<'day' | 'week' | 'month'>('day');

    const fetchData = useCallback(async (isInitial = false) => {
        if (!isInitial) setIsFiltering(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('granularity', trendView);
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(val => {
                        if (val) queryParams.append(key, val);
                    });
                } else if (value) {
                    queryParams.append(key, value);
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
                onApply={() => fetchData()}
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
                    {/* Trend Area Chart */}
                    <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Quality Trend</h2>
                            </div>
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

                    {/* Opportunity Heatmap */}
                    <div className="glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">
                                    {drilldownCategory ? drilldownCategory.name : 'Opportunity Areas'}
                                </h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                                    {drilldownCategory ? 'Issues by Parameter' : 'Failures by Category'}
                                </p>
                            </div>
                            {drilldownCategory && (
                                <button
                                    onClick={() => setDrilldownCategory(null)}
                                    className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to Overview
                                </button>
                            )}
                        </div>

                        {(!stats?.failureHeatmap || stats.failureHeatmap.length === 0) ? (
                            <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Failure Data</p>
                            </div>
                        ) : drilldownCategory ? (
                            /* Drilldown View */
                            <>
                                <div className="flex-1 min-h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={drilldownCategory.parameters || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                labelLine={false}
                                                label={(props: any) => {
                                                    const { cx, cy, midAngle, outerRadius, fill, value } = props;
                                                    const RADIAN = Math.PI / 180;
                                                    const sin = Math.sin(-midAngle * RADIAN);
                                                    const cos = Math.cos(-midAngle * RADIAN);
                                                    const sx = cx + (outerRadius + 5) * cos;
                                                    const sy = cy + (outerRadius + 5) * sin;
                                                    const mx = cx + (outerRadius + 15) * cos;
                                                    const my = cy + (outerRadius + 15) * sin;
                                                    const ex = mx + (cos >= 0 ? 1 : -1) * 10;
                                                    const ey = my;

                                                    return (
                                                        <g>
                                                            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} opacity={0.4} />
                                                            <text x={ex} y={ey} fill="#fff" textAnchor={cos >= 0 ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="black" dx={cos >= 0 ? 5 : -5}>
                                                                {value}
                                                            </text>
                                                        </g>
                                                    );
                                                }}
                                            >
                                                {(drilldownCategory.parameters || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    {(drilldownCategory.parameters || []).slice(0, 6).map((entry: any, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5"
                                        >
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }} />
                                            <span className="text-[10px] font-bold text-slate-400" title={entry.name}>{entry.name}</span>
                                            <span className="text-[10px] font-black text-white ml-auto">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Overview View */
                            <>
                                <div className="flex-1 min-h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats?.failureHeatmap || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                labelLine={false}
                                                onClick={(data) => setDrilldownCategory(data)}
                                                className="cursor-pointer"
                                                label={(props: any) => {
                                                    const { cx, cy, midAngle, outerRadius, fill, value } = props;
                                                    const RADIAN = Math.PI / 180;
                                                    const sin = Math.sin(-midAngle * RADIAN);
                                                    const cos = Math.cos(-midAngle * RADIAN);
                                                    const sx = cx + (outerRadius + 5) * cos;
                                                    const sy = cy + (outerRadius + 5) * sin;
                                                    const mx = cx + (outerRadius + 15) * cos;
                                                    const my = cy + (outerRadius + 15) * sin;
                                                    const ex = mx + (cos >= 0 ? 1 : -1) * 10;
                                                    const ey = my;

                                                    return (
                                                        <g>
                                                            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} opacity={0.4} />
                                                            <text x={ex} y={ey} fill="#fff" textAnchor={cos >= 0 ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="black" dx={cos >= 0 ? 5 : -5}>
                                                                {value}
                                                            </text>
                                                        </g>
                                                    );
                                                }}
                                            >
                                                {(stats?.failureHeatmap || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    {(stats?.failureHeatmap || []).slice(0, 6).map((entry: any, index: number) => (
                                        <div
                                            key={index}
                                            onClick={() => setDrilldownCategory(entry)}
                                            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                        >
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index % 6] }} />
                                            <span className="text-[10px] font-bold text-slate-400" title={entry.name}>{entry.name}</span>
                                            <span className="text-[10px] font-black text-white ml-auto">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="glass rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <div className="flex justify-between items-center mb-8 px-2">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Critical Fails</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Recently Failed Evaluations</p>
                        </div>
                        <Link href={{
                            pathname: '/fails',
                            query: Object.fromEntries(
                                Object.entries(filters).filter(([_, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
                            )
                        }}>
                            <button className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-[0.2em] bg-rose-400/5 px-4 py-2 rounded-xl transition-all border border-rose-500/10">
                                View All Fails <ArrowUpRight className="w-3 h-3 ml-1 inline" />
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
                                    <th className="py-4 pr-4 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stats?.failedAudits?.flatMap((audit: any) =>
                                    audit.scores.map((score: any, idx: number) => (
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
                                                    {score.criterion?.categoryName || 'General'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[200px]">
                                                <span className="text-xs font-bold text-rose-300 block truncate" title={score.criterion?.title}>
                                                    {score.criterion?.title || 'Unknown Parameter'}
                                                </span>
                                            </td>
                                            <td className="py-4 max-w-[300px]">
                                                <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                                                    <p className="text-[10px] text-rose-200/80 font-medium italic line-clamp-2 leading-relaxed" title={score.comment}>
                                                        "{score.comment || 'No remarks provided'}"
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <span className="text-rose-500 font-black text-sm">{audit.score}%</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {(!stats?.failedAudits || stats.failedAudits.length === 0) && (
                        <div className="py-20 text-center glass rounded-[2rem] border-dashed border-white/10 mt-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Critical Fails Found</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div >
    );
}
