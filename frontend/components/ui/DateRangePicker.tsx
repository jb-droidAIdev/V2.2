'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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
    parseISO
} from 'date-fns';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (s: string, e: string) => void;
    label?: string;
}

export function DateRangePicker({ startDate, endDate, onChange, label = "Date Range" }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;

    const days = useMemo(() => {
        const startOfW = startOfWeek(startOfMonth(currentMonth));
        const endOfW = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start: startOfW, end: endOfW });
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
        const endDay = new Date();
        const startDay = subDays(endDay, days - 1);
        onChange(format(startDay, 'yyyy-MM-dd'), format(endDay, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0a0a0b] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none flex items-center justify-between text-left group transition-all hover:bg-[#0a0a0b]/70 h-[46px]"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className={cn("truncate", !startDate && "text-slate-600")}>
                        {startDate ? (endDate ? `${format(parseISO(startDate), 'MMM dd')} - ${format(parseISO(endDate), 'MMM dd')}` : format(parseISO(startDate), 'MMM dd, yyyy')) : 'Select Period'}
                    </span>
                </div>
                <ChevronLeft className={cn("w-3.5 h-3.5 text-slate-500 transition-transform rotate-[270deg]", isOpen && "rotate-90")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 5 }}
                            className="absolute top-full left-0 md:left-auto md:right-0 mt-2 bg-[#161618] border border-white/10 rounded-2xl shadow-2xl z-[70] p-6 min-w-[380px] md:min-w-[520px]"
                        >
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-6">
                                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{format(currentMonth, 'MMMM yyyy')}</span>
                                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => <div key={d} className="h-8 flex items-center justify-center text-[9px] font-black text-slate-600 tracking-widest">{d}</div>)}
                                        {days.map(day => {
                                            const isSelected = (start && isSameDay(day, start)) || (end && isSameDay(day, end));
                                            const inRange = start && end && isWithinInterval(day, { start, end });
                                            const isCurrentMonth = isSameMonth(day, currentMonth);

                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => handleDateClick(day)}
                                                    className={cn(
                                                        "h-10 w-10 md:h-12 md:w-12 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center",
                                                        !isCurrentMonth ? "text-slate-800 opacity-20 pointer-events-none" : "text-slate-300 hover:bg-white/5",
                                                        isSelected && "bg-blue-600 text-white z-10 shadow-lg shadow-blue-600/20",
                                                        inRange && !isSelected && "bg-blue-600/10 text-blue-400"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                    {isToday(day) && !isSelected && <div className="absolute top-2 right-2 w-1 h-1 bg-blue-500 rounded-full" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="md:w-36 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6 flex flex-row md:flex-col gap-2 justify-center">
                                    <button onClick={() => setPreset(1)} className="whitespace-nowrap flex-1 text-left py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all">Today</button>
                                    <button onClick={() => setPreset(7)} className="whitespace-nowrap flex-1 text-left py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all">7 Days</button>
                                    <button onClick={() => setPreset(30)} className="whitespace-nowrap flex-1 text-left py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all">30 Days</button>
                                    <button onClick={() => onChange('', '')} className="whitespace-nowrap flex-1 text-left py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-all">Reset</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
