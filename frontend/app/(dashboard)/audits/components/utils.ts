export const getStatusColor = (status: string) => {
    switch (status) {
        case 'SUBMITTED': return 'bg-blue-500/10 text-blue-400';
        case 'RELEASED': return 'bg-emerald-500/10 text-emerald-400';
        case 'DRAFT': return 'bg-slate-500/10 text-slate-400';
        case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-500';
        case 'DISPUTED': return 'bg-rose-500/10 text-rose-500';
        case 'REAPPEALED': return 'bg-purple-500/10 text-purple-500';
        default: return 'bg-slate-500/10 text-slate-400';
    }
};
