import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRoleColor(role: string) {
    const r = role?.toUpperCase();
    switch (r) {
        case 'ADMIN':
            return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'QA':
        case 'QA_TL':
        case 'QA_MANAGER':
            return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'OPS_TL':
        case 'OPS_MANAGER':
        case 'SDM':
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        case 'AGENT':
            return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        default:
            return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
}
