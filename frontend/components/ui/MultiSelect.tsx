'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiSelectProps {
    label?: string;
    options: { id: string, name: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
    className?: string;
}

export function MultiSelect({ label, options, selected, onChange, placeholder, className }: MultiSelectProps) {
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
        <div className={cn("space-y-2 relative", className)}>
            {label && <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0a0a0b]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none flex items-center justify-between text-left group transition-all hover:bg-[#0a0a0b]/70"
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={cn("truncate", selected.length === 0 && "text-slate-600")}>
                        {displayValue}
                    </span>
                    {selected.length > 0 && (
                        <span className="flex-shrink-0 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-black">
                            {selected.length}
                        </span>
                    )}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ml-2", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[320px]"
                        >
                            <div className="p-3 border-b border-white/5 bg-[#0a0a0b]/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                    <input
                                        autoFocus
                                        className="w-full bg-[#0a0a0b] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 font-medium"
                                        placeholder={`Search options...`}
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
                                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
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
                            {selected.length > 0 && (
                                <div className="p-2 border-t border-white/5 bg-[#0a0a0b]/50 flex justify-end">
                                    <button
                                        onClick={() => onChange([])}
                                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 px-2 py-1 transition-colors"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
