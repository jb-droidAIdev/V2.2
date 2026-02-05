'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (!isAuthorized) return null;

    return (
        <div className="flex bg-[#020617] min-h-screen text-slate-100 overflow-x-hidden">
            <Sidebar />
            <main className="flex-1 ml-[90px] p-8 transition-all duration-500">
                <div className="max-w-full mx-auto px-4 md:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
