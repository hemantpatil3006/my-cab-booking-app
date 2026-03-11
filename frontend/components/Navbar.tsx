'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

interface NavbarProps {
    role?: string;
}

export default function Navbar({ role }: NavbarProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const linkClass = (href: string) =>
        `text-sm font-medium transition-colors ${pathname === href
            ? 'text-white font-bold'
            : 'text-gray-400 hover:text-white'
        }`;

    const mobileLinkClass = (href: string) =>
        `block px-4 py-3 text-base font-medium transition-colors rounded-xl ${pathname === href
            ? 'bg-white/10 text-white font-bold'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`;

    return (
        <nav className="sticky top-0 z-50 glass border-b border-white/10 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform">
                            R
                        </div>
                        <span className="text-lg font-bold gradient-text">RideLane</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6 ml-10">
                        {role === 'rider' && (
                            <>
                                <Link href="/dashboard/rider" className={linkClass('/dashboard/rider')}>Dashboard</Link>
                                <Link href="/dashboard/rider/history" className={linkClass('/dashboard/rider/history')}>History</Link>
                            </>
                        )}
                        {role === 'driver' && (
                            <>
                                <Link href="/dashboard/driver" className={linkClass('/dashboard/driver')}>Console</Link>
                                <Link href="/dashboard/driver/history" className={linkClass('/dashboard/driver/history')}>Earnings</Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 md:gap-4 ml-auto">
                        {role && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${role === 'rider'
                                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}>
                                {role}
                            </span>
                        )}
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: 'w-8 h-8 ring-2 ring-violet-500/50 hover:ring-violet-500 transition-all',
                                },
                            }}
                        />

                        {/* Mobile Menu Toggle Button */}
                        {role && (
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                <div className="space-y-1.5 w-5">
                                    <span className={`block w-full h-0.5 bg-white transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                                    <span className={`block w-full h-0.5 bg-white transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                                    <span className={`block w-full h-0.5 bg-white transition-transform duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            <div className={`md:hidden absolute top-16 left-0 w-full bg-gray-950 border-b border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out origin-top ${isMobileMenuOpen ? 'scale-y-100 opacity-100 pointer-events-auto' : 'scale-y-0 opacity-0 pointer-events-none'}`}>
                <div className="px-4 py-4 space-y-2">
                    {role === 'rider' && (
                        <>
                            <Link
                                href="/dashboard/rider"
                                className={mobileLinkClass('/dashboard/rider')}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="mr-3">🏠</span>Dashboard
                            </Link>
                            <Link
                                href="/dashboard/rider/history"
                                className={mobileLinkClass('/dashboard/rider/history')}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="mr-3">🕒</span>Ride History
                            </Link>
                        </>
                    )}
                    {role === 'driver' && (
                        <>
                            <Link
                                href="/dashboard/driver"
                                className={mobileLinkClass('/dashboard/driver')}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="mr-3">🚕</span>Console
                            </Link>
                            <Link
                                href="/dashboard/driver/history"
                                className={mobileLinkClass('/dashboard/driver/history')}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <span className="mr-3">💰</span>Earnings
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
