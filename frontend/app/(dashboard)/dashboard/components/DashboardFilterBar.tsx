'use client';

import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

interface FilterOptions {
    campaigns: { id: string, name: string }[];
    supervisors: string[];
    sdms: string[];
    qas: { id: string, name: string }[];
    agents: { id: string, name: string }[];
}

interface DashboardFilterBarProps {
    filters: any;
    setFilters: (f: any) => void;
    filterOptions: FilterOptions;
    isFilterOpen: boolean;
    setIsFilterOpen: (o: boolean) => void;
    onApply: (f?: any) => void;
}

export default function DashboardFilterBar({
    filters,
    setFilters,
    filterOptions,
    isFilterOpen,
    setIsFilterOpen,
    onApply
}: DashboardFilterBarProps) {
    const clearFilters = () => {
        const resetFilters = {
            startDate: '',
            endDate: '',
            ticketId: '',
            agentId: [],
            campaignId: [],
            supervisor: [],
            sdm: [],
            auditorId: []
        };
        setFilters(resetFilters);
        onApply(resetFilters);
    };

    const activeFilterCount = Object.values(filters).filter((v: any) =>
        Array.isArray(v) ? v.length > 0 : Boolean(v)
    ).length;

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center bg-[#111113] p-2.5 rounded-2xl border border-white/5 shadow-2xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        className="w-full bg-[#0a0a0b] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 font-medium"
                        placeholder="Search by Ticket ID / Reference..."
                        value={filters.ticketId}
                        onChange={(e) => setFilters({ ...filters, ticketId: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onApply(filters)}
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
                        onClick={() => onApply(filters)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        Refresh Report
                    </button>
                </div>
            </div>

            {isFilterOpen && (
                <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    <DateRangePicker
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onChange={(s: string, e: string) => setFilters({ ...filters, startDate: s, endDate: e })}
                    />

                    <MultiSelect
                        label="Campaign"
                        placeholder="All Campaigns"
                        options={filterOptions.campaigns}
                        selected={filters.campaignId}
                        onChange={(vals: string[]) => setFilters({ ...filters, campaignId: vals })}
                    />

                    <MultiSelect
                        label="Target Agent"
                        placeholder="All Audited Agents"
                        options={filterOptions.agents}
                        selected={filters.agentId}
                        onChange={(vals: string[]) => setFilters({ ...filters, agentId: vals })}
                    />

                    <MultiSelect
                        label="Supervisor"
                        placeholder="All Supervisors"
                        options={filterOptions.supervisors.map((s: string) => ({ id: s, name: s }))}
                        selected={filters.supervisor}
                        onChange={(vals: string[]) => setFilters({ ...filters, supervisor: vals })}
                    />

                    <MultiSelect
                        label="SDM"
                        placeholder="All SDMs"
                        options={filterOptions.sdms.map((s: string) => ({ id: s, name: s }))}
                        selected={filters.sdm}
                        onChange={(vals: string[]) => setFilters({ ...filters, sdm: vals })}
                    />

                    <MultiSelect
                        label="QA Auditor"
                        placeholder="All QAs"
                        options={filterOptions.qas}
                        selected={filters.auditorId}
                        onChange={(vals: string[]) => setFilters({ ...filters, auditorId: vals })}
                    />

                    <div className="flex items-end gap-3">
                        <button
                            onClick={() => onApply(filters)}
                            className="flex-1 bg-white text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors h-[42px]"
                        >
                            Apply Filters
                        </button>
                        <button
                            onClick={clearFilters}
                            className="p-2.5 text-slate-500 hover:text-rose-500 transition-colors h-[42px]"
                            title="Clear all filters"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
