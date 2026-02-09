'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const AnalyticsElements = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Enlarged Pie Chart ensemble - Top Right */}
            <motion.svg
                viewBox="0 0 200 200"
                className="absolute top-[15%] -right-20 w-[600px] h-[400px] text-blue-400/20 fill-none stroke-current stroke-[1.5]"
                initial={{ opacity: 0 }}
                animate={{
                    opacity: 1,
                    rotate: 360,
                    x: [0, -15, 0],
                    y: [0, 15, 0]
                }}
                transition={{
                    opacity: { duration: 1.5 },
                    rotate: { duration: 80, repeat: Infinity, ease: "linear" },
                    x: { duration: 20, repeat: Infinity, ease: "easeInOut" },
                    y: { duration: 15, repeat: Infinity, ease: "easeInOut" }
                }}
            >
                {/* Large Pie Chart (Exploded Segment look) */}
                <g transform="translate(100, 100)">
                    <motion.path
                        d="M 0 0 L 0 -80 A 80 80 0 0 1 69.2 -40 Z"
                        className="fill-blue-500/10 stroke-blue-400/40"
                        animate={{ transform: ["translate(0,0)", "translate(8,-8)", "translate(0,0)"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx="0" cy="0" r="80" className="opacity-10" />
                    <path d="M 0 0 L 69.2 -40 A 80 80 0 1 1 0 -80 Z" className="opacity-10" />
                </g>
            </motion.svg>

            {/* Live Fluctuating Bar Chart - Bottom Left */}
            <motion.div
                className="absolute -bottom-20 -left-20 flex items-end gap-5 p-16 h-96 opacity-60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {[45, 75, 60, 95, 70, 85].map((baseHeight, i) => (
                    <motion.div
                        key={i}
                        className="w-10 bg-blue-500/10 border border-blue-400/20 rounded-t-xl"
                        animate={{
                            height: [`${baseHeight}%`, `${baseHeight + (i % 2 === 0 ? 8 : -8)}%`, `${baseHeight}%`]
                        }}
                        transition={{
                            duration: 3 + i,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </motion.div>

            {/* Call Center Headset Icon - Bottom Right */}
            <motion.svg
                viewBox="0 0 120 120"
                className="absolute bottom-[10%] right-10 w-80 h-80 text-blue-400/20 fill-none stroke-current stroke-[1.5]"
                animate={{
                    y: [0, -15, 0],
                    rotate: [0, -3, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Slim Profile Headband */}
                <path
                    d="M 35 70 A 25 32 0 0 1 85 70"
                    className="stroke-blue-400/40 stroke-[2.5]"
                />
                {/* Professional Ear Cups */}
                <rect x="25" y="65" width="12" height="24" rx="4" className="fill-blue-500/10 stroke-blue-400/30" />
                <rect x="83" y="65" width="12" height="24" rx="4" className="fill-blue-500/10 stroke-blue-400/30" />

                {/* Boom Microphone (Call Center Style) */}
                <motion.g
                    animate={{ rotate: [0, 2, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: "31px 82px" }}
                >
                    <path
                        d="M 31 82 Q 31 105 55 110"
                        className="stroke-blue-400/50 stroke-[2] fill-none"
                    />
                    <motion.circle
                        cx="55" cy="110" r="3.5"
                        className="fill-blue-500/20 stroke-blue-400/40"
                        animate={{
                            opacity: [0.3, 1, 0.3]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </motion.g>

                {/* Transmission Detail */}
                {[0, 1, 2].map((i) => (
                    <motion.path
                        key={i}
                        d={`M ${65 + i * 8} 105 A 15 15 0 0 1 ${65 + i * 8} 115`}
                        className="stroke-blue-400/20"
                        animate={{ opacity: [0, 0.5, 0], x: [0, 10, 20] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    />
                ))}
            </motion.svg>


            {/* Detailed Scatter Plot - Middle Left */}
            <motion.svg
                viewBox="0 0 200 200"
                className="absolute top-1/4 left-10 w-96 h-96 text-blue-400/20 fill-none stroke-current stroke-[0.5]"
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 2, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Axes */}
                <line x1="20" y1="20" x2="20" y2="180" className="stroke-blue-500/20 stroke-[1]" />
                <line x1="20" y1="180" x2="180" y2="180" className="stroke-blue-500/20 stroke-[1]" />

                {/* Grid Ticks */}
                {[40, 60, 80, 100, 120, 140, 160].map(pos => (
                    <g key={pos}>
                        <line x1="18" y1={pos} x2="22" y2={pos} className="stroke-blue-500/20" />
                        <line x1={pos} y1="178" x2={pos} y2="182" className="stroke-blue-500/20" />
                    </g>
                ))}

                {/* Dense Data Points */}
                {[...Array(20)].map((_, i) => {
                    const cx = 30 + (i * 7) + (Math.random() * 15);
                    const cy = 170 - (i * 6) - (Math.random() * 25);
                    return (
                        <motion.circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r="2.5"
                            className="fill-blue-400/30"
                            animate={{
                                opacity: [0.2, 0.6, 0.2],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: 2 + Math.random() * 3,
                                repeat: Infinity,
                                delay: i * 0.1
                            }}
                        />
                    );
                })}

                {/* Subtle Trend Line */}
                <motion.path
                    d="M 30 170 L 170 40"
                    className="stroke-blue-500/10 stroke-[1] stroke-dash-2"
                    animate={{ pathLength: [0, 1, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.svg>
        </div>
    );
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [tempUserData, setTempUserData] = useState<any>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const sanitizedEmail = email.trim();

        try {
            const response = await api.post('/auth/login', { email: sanitizedEmail, password });

            if (response.data.user.mustChangePassword) {
                setTempUserData(response.data);
                setIsUpdateModalOpen(true);
            } else {
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsUpdating(true);
        setError('');

        try {
            // Set token temporarily for this request
            localStorage.setItem('token', tempUserData.access_token);
            await api.post('/auth/update-password', { newPassword });

            // Finalize login
            localStorage.setItem('user', JSON.stringify({ ...tempUserData.user, mustChangePassword: false }));
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background Decorative Analytics Elements */}
            <AnalyticsElements />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-md w-full relative z-10"
            >
                <div className="bg-[#020617]/40 border-[1.5px] border-blue-500/40 rounded-[2.5rem] p-10 shadow-[0_0_60px_rgba(59,130,246,0.25)] backdrop-blur-3xl">
                    <div className="flex flex-col items-center mb-10 w-full">
                        <div className="relative w-72 h-24 mb-2">
                            <Image
                                src="/logo.png"
                                alt="QMS Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="w-full border-t border-white/10 pt-8 mt-4 text-center">
                            <h2 className="text-white text-base font-light tracking-[0.15em] uppercase">
                                <span className="font-black text-blue-400">Q</span>uality <span className="font-black text-blue-400">M</span>onitoring <span className="font-black text-blue-400">S</span>ystem
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Corporate Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#020617]/50 border border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#020617]/50 border border-slate-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <p className="text-slate-500 text-xs">
                            Forgot password? <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Contact IT Support</a>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Force Update Password Modal */}
            {isUpdateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md w-full bg-[#020617] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative"
                    >
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Update Password</h2>
                            <p className="text-slate-400 text-sm mt-2 font-medium">Compliance requirement: You must change your temporary password before proceeding.</p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#020617]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Minimum 8 characters"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#020617]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Match the password above"
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="w-full bg-white text-black hover:bg-slate-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                            >
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Account"}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
