'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isWithinInterval,
    isToday,
    subDays,
    startOfDay,
    endOfDay,
    parseISO
} from 'date-fns';

interface FilterOptions {
    campaigns: { id: string, name: string }[];
    supervisors: string[];
    sdms: string[];
    qas: { id: string, name: string }[];
}

interface DashboardFilterBarProps {
    filters: any;
    setFilters: (f: any) => void;
    filterOptions: FilterOptions;
    isFilterOpen: boolean;
    setIsFilterOpen: (o: boolean) => void;
    onApply: () => void;
}

interface MultiSelectProps {
    label: string;
    options: { id: string, name: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}

function MultiSelect({ label, options, selected, onChange, placeholder }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleOption = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(i => i !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            opt.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
    }, [options, searchQuery]);

    const displayValue = useMemo(() => {
        if (selected.length === 0) return placeholder;
        if (selected.length === 1) {
            const opt = options.find(o => o.id === selected[0]);
            return opt ? opt.name : placeholder;
        }
        return `${selected.length} Selected`;
    }, [selected, options, placeholder]);

    return (
        <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none flex items-center justify-between text-left group"
            >
                <span className={cn("truncate mr-2", selected.length === 0 && "text-slate-600")}>
                    {displayValue}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[320px]"
                        >
                            <div className="p-3 border-b border-white/5 bg-[#0a0a0b]/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        autoFocus
                                        className="w-full bg-[#0a0a0b] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 font-medium"
                                        placeholder={`Search ${label}...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                            <div className="overflow-y-auto p-2 no-scrollbar flex-1">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => toggleOption(option.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors mb-1 last:mb-0",
                                                selected.includes(option.id)
                                                    ? "bg-blue-600 text-white"
                                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate">{option.name}</span>
                                            {selected.includes(option.id) && <Check className="w-3 h-3 flex-shrink-0 ml-2" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                        No results
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

function DateRangePicker({ startDate, endDate, onChange }: { startDate: string, endDate: string, onChange: (s: string, e: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const handleDateClick = (date: Date) => {
        if (!start || (start && end)) {
            onChange(format(date, 'yyyy-MM-dd'), '');
        } else {
            if (date < start) {
                onChange(format(date, 'yyyy-MM-dd'), '');
            } else {
                onChange(format(start, 'yyyy-MM-dd'), format(date, 'yyyy-MM-dd'));
                setIsOpen(false);
            }
        }
    };

    const setPreset = (days: number) => {
        const end = new Date();
        const start = subDays(end, days - 1);
        onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Date Range</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none flex items-center justify-between text-left"
            >
                <span className={cn("truncate mr-2", !startDate && "text-slate-600")}>
                    {startDate ? (endDate ? `${format(parseISO(startDate), 'MMM dd')} - ${format(parseISO(endDate), 'MMM dd')}` : format(parseISO(startDate), 'MMM dd, yyyy')) : 'Select Period'}
                </span>
                <CalendarIcon className="w-4 h-4 text-slate-500" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl z-50 p-4"
                        >
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded-lg text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-black text-white uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</span>
                                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded-lg text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`} className="h-8 flex items-center justify-center text-[10px] font-black text-slate-600">{d}</div>)}
                                        {days.map(day => {
                                            const isSelected = (start && isSameDay(day, start)) || (end && isSameDay(day, end));
                                            const inRange = start && end && isWithinInterval(day, { start, end });
                                            const isCurrentMonth = isSameMonth(day, currentMonth);

                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => handleDateClick(day)}
                                                    className={cn(
                                                        "h-8 rounded-lg text-[10px] font-bold transition-all relative flex items-center justify-center",
                                                        !isCurrentMonth ? "text-slate-800" : "text-slate-300 hover:bg-white/10",
                                                        isSelected && "bg-blue-600 text-white z-10",
                                                        inRange && !isSelected && "bg-blue-600/20 text-blue-400"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                    {isToday(day) && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="w-32 border-l border-white/5 pl-4 flex flex-col gap-1 justify-center">
                                    <button onClick={() => setPreset(1)} className="text-left py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all">Today</button>
                                    <button onClick={() => setPreset(7)} className="text-left py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all">Last 7 Days</button>
                                    <button onClick={() => setPreset(30)} className="text-left py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all">Last 30 Days</button>
                                    <button onClick={() => onChange('', '')} className="text-left py-2 px-3 rounded-lg text-[10px] font-black uppercase text-rose-500 hover:bg-rose-500/10 transition-all">Reset</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
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
        setFilters({
            startDate: '',
            endDate: '',
            agentName: '',
            campaignId: [],
            supervisor: [],
            sdm: [],
            auditorId: []
        });
        onApply();
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
                        placeholder="Search by Agent Name..."
                        value={filters.agentName}
                        onChange={(e) => setFilters({ ...filters, agentName: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onApply()}
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
                        onClick={onApply}
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
                        onChange={(s, e) => setFilters({ ...filters, startDate: s, endDate: e })}
                    />

                    <MultiSelect
                        label="Campaign"
                        placeholder="All Campaigns"
                        options={filterOptions.campaigns}
                        selected={filters.campaignId}
                        onChange={(vals) => setFilters({ ...filters, campaignId: vals })}
                    />

                    <MultiSelect
                        label="Supervisor"
                        placeholder="All Supervisors"
                        options={filterOptions.supervisors.map((s: string) => ({ id: s, name: s }))}
                        selected={filters.supervisor}
                        onChange={(vals) => setFilters({ ...filters, supervisor: vals })}
                    />

                    <MultiSelect
                        label="SDM"
                        placeholder="All SDMs"
                        options={filterOptions.sdms.map((s: string) => ({ id: s, name: s }))}
                        selected={filters.sdm}
                        onChange={(vals) => setFilters({ ...filters, sdm: vals })}
                    />

                    <MultiSelect
                        label="QA Auditor"
                        placeholder="All QAs"
                        options={filterOptions.qas}
                        selected={filters.auditorId}
                        onChange={(vals) => setFilters({ ...filters, auditorId: vals })}
                    />

                    <div className="flex items-end gap-3">
                        <button
                            onClick={onApply}
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
