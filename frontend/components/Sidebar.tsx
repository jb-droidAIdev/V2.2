'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    MessageSquare,
    BarChart3,
    ShieldCheck,
    LogOut,
    ChevronRight,
    FileText,
    Target,
    ClipboardCheck,
    Zap,
    FilePlus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['ADMIN', 'QA_TL', 'OPS_TL', 'QA', 'AGENT'] },
    { name: 'Dossier', icon: Users, href: '/dossier', roles: ['ADMIN', 'QA_TL', 'OPS_TL', 'QA'] },
    { name: 'Forms', icon: FileText, href: '/forms', roles: ['ADMIN', 'QA_TL'] },
    { name: 'Audits', icon: ClipboardCheck, href: '/audits', roles: ['ADMIN', 'QA_TL', 'OPS_TL', 'QA', 'AGENT'] },
    { name: 'Evaluate', icon: Zap, href: '/evaluate', roles: ['ADMIN', 'QA_TL', 'QA'] },
    { name: 'Calibration', icon: Target, href: '/calibration', roles: ['ADMIN', 'QA_TL', 'QA'] },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserRole(user.role);
                setUserName(user.name);
            } catch (e) {
                console.error('Failed to parse user data');
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            initial={false}
            animate={{ width: isHovered ? 260 : 90 }}
            className="h-screen bg-[#050a1b] border-r border-blue-500/10 flex flex-col fixed left-0 top-0 shadow-2xl z-50 overflow-hidden"
        >
            <div className="p-4 flex items-center justify-center border-b border-blue-500/10 mb-2 h-24 whitespace-nowrap overflow-hidden">
                <div className="relative flex items-center justify-center w-full h-full">
                    <AnimatePresence mode="wait">
                        {isHovered ? (
                            <motion.div
                                key="full-logo"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative w-48 h-16"
                            >
                                <Image
                                    src="/logo.png"
                                    alt="QMS Full Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="icon-logo"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                                    opacity: { duration: 0.2 },
                                    scale: { duration: 0.2 }
                                }}
                                className="relative w-[85px] h-[85px] shrink-0"
                            >
                                <Image
                                    src="/logo-icon.png"
                                    alt="QMS Icon"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-x-hidden">
                {menuItems
                    .filter(item => !item.roles || item.roles.includes(userRole))
                    .map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden h-12",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]"
                                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <div className="flex items-center min-w-[24px] z-10">
                                    <item.icon className={cn("w-6 h-6 transition-colors shrink-0", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white")} />
                                </div>

                                <AnimatePresence>
                                    {isHovered && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="font-bold text-sm tracking-wide ml-4 whitespace-nowrap"
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}
                                </AnimatePresence>

                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
            </nav>

            <div className="p-4 mt-auto border-t border-white/5 bg-[#0a0a0b]/50 overflow-hidden space-y-4">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg border border-white/10 shrink-0 capitalize">
                        {userName ? userName[0] : '?'}
                    </div>
                    <AnimatePresence>
                        {isHovered && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col min-w-0"
                            >
                                <span className="font-bold text-sm text-white truncate">{userName || 'Guest User'}</span>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit mt-1 border",
                                    userRole === 'ADMIN' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                )}>
                                    {userRole || 'Loading...'}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all group h-12"
                >
                    <div className="min-w-[24px]">
                        <LogOut className="w-6 h-6 shrink-0" />
                    </div>
                    <AnimatePresence>
                        {isHovered && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="font-bold text-sm ml-4 whitespace-nowrap"
                            >
                                Sign Out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.div>
    );
}
