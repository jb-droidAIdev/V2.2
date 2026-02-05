import { Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
    };
    setFilters: (filters: any) => void;
    campaigns: string[];
    totalCount: number;
}

export default function AuditFilterBar({
    searchTerm,
    setSearchTerm,
    isFilterOpen,
    setIsFilterOpen,
    filters,
    setFilters,
    campaigns,
    totalCount
}: AuditFilterBarProps) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Agent, Auditor, or Ticket ID..."
                        className="w-full bg-[#0f172a]/50 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4 md:col-span-2">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all border font-bold",
                            isFilterOpen
                                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                                : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                        )}
                    >
                        <Filter className="w-5 h-5" />
                        <span>Filters</span>
                    </button>
                    <div className="flex-1 bg-[#0f172a]/50 border border-white/10 py-3.5 rounded-2xl px-4 text-slate-400 text-sm font-medium">
                        Total Audits: <span className="text-white font-bold">{totalCount}</span>
                    </div>
                </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#0f172a]/50 border border-white/10 rounded-3xl overflow-hidden"
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="SUBMITTED">Submitted</option>
                                    <option value="RELEASED">Released</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Campaign</label>
                                <select
                                    value={filters.campaign}
                                    onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">All Campaigns</option>
                                    {campaigns.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date Range</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-600"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-600"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({ status: '', campaign: '', dateFrom: '', dateTo: '' })}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
