'use client';

import { Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

interface AuditFilterBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isFilterOpen: boolean;
    setIsFilterOpen: (isOpen: boolean) => void;
    filters: {
        status: string;
        campaign: string;
        dateFrom: string;
        dateTo: string;
        agentIds: string[];
    };
    setFilters: (filters: any) => void;
    campaigns: string[];
    agents: { id: string, name: string }[];
    totalCount: number;
    onRefresh: () => void;
}

export default function AuditFilterBar({
    searchTerm,
    setSearchTerm,
    isFilterOpen,
    setIsFilterOpen,
    filters,
    setFilters,
    campaigns,
    agents,
    totalCount,
    onRefresh
}: AuditFilterBarProps) {
    const activeFilterCount = Object.values(filters).filter((v: any) =>
        Array.isArray(v) ? v.length > 0 : Boolean(v)
    ).length + (searchTerm ? 1 : 0);

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center bg-[#111113] p-2.5 rounded-2xl border border-white/5 shadow-2xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        className="w-full bg-[#0a0a0b] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 font-medium"
                        placeholder="Search by Ticket ID / Auditor / Agent..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                            isFilterOpen || activeFilterCount > 0
                                ? "bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10"
                                : "bg-[#0a0a0b] border-white/5 text-slate-400 hover:text-white"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="ml-1 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onRefresh}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        Refresh Audits
                    </button>
                </div>
            </div>

            {isFilterOpen && (
                <div
                    className="bg-[#111113] p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-200 mt-4"
                >
                    <MultiSelect
                        label="Target Agent"
                        placeholder="Select Agent(s)..."
                        options={agents}
                        selected={filters.agentIds}
                        onChange={(vals) => setFilters({ ...filters, agentIds: vals })}
                    />

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none font-medium h-[46px]"
                        >
                            <option value="">All Statuses</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="RELEASED">Released</option>
                            <option value="DRAFT">Draft</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DISPUTED">Disputed</option>
                            <option value="REAPPEALED">Re-appealed</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Campaign</label>
                        <select
                            value={filters.campaign}
                            onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                            className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none font-medium h-[46px]"
                        >
                            <option value="">All Campaigns</option>
                            {campaigns.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <DateRangePicker
                        startDate={filters.dateFrom}
                        endDate={filters.dateTo}
                        onChange={(s, e) => setFilters({ ...filters, dateFrom: s, dateTo: e })}
                    />

                    <div className="flex items-end gap-3 md:col-span-2">
                        <button
                            onClick={onRefresh}
                            className="flex-1 bg-white text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors h-[46px]"
                        >
                            Apply Filters
                        </button>
                        <button
                            onClick={() => {
                                setFilters({ status: '', campaign: '', dateFrom: '', dateTo: '', agentIds: [] });
                                setSearchTerm('');
                                onRefresh();
                            }}
                            className="p-2.5 text-slate-500 hover:text-rose-500 transition-colors h-[46px] border border-white/5 rounded-xl bg-white/5"
                            title="Clear all filters"
                        >
                            <X className="w-5 h-5 mx-auto" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
