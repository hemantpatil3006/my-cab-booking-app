'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { getDriverHistory } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function DriverHistoryPage() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [earnings, setEarnings] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedRide, setSelectedRide] = useState<any | null>(null);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const token = await getToken();
                const data = await getDriverHistory(token!);
                setRides(data.rides);
                setEarnings(data.totalEarnings);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (userLoaded && user) fetchHistory();
    }, [userLoaded, user, getToken]);

    if (!userLoaded || !user) return null;

    const avgPerTrip = rides.length > 0 ? Math.round(earnings / rides.length) : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <Navbar role="driver" />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="mb-6 md:mb-10 text-center sm:text-left">
                    <Link
                        href="/dashboard/driver"
                        className="text-[10px] md:text-sm font-bold text-violet-400 hover:text-white transition-colors mb-2 md:mb-4 inline-flex items-center gap-2 justify-center sm:justify-start"
                    >
                        <span>←</span> Back to Console
                    </Link>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight">Earnings &amp; History</h1>
                    <p className="text-gray-400 mt-1 text-xs md:text-sm">Track your performance and completed trips</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
                    <div className="col-span-2 bg-gradient-to-br from-emerald-600/30 to-cyan-600/20 border border-emerald-500/40 rounded-2xl p-4 md:p-6 flex flex-col justify-between">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2 md:mb-3">Total Lifetime Earnings</p>
                        <p className="text-3xl md:text-5xl font-black text-white">₹{earnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-center flex flex-col justify-center">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 md:mb-3">Total Trips</p>
                        <p className="text-2xl md:text-4xl font-black">{rides.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 text-center flex flex-col justify-center">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 md:mb-3">Avg. Per Trip</p>
                        <p className="text-2xl md:text-4xl font-black">₹{avgPerTrip}</p>
                    </div>
                </div>

                {/* Recent Trips */}
                <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Recent Trips</p>

                {loading ? (
                    <div className="grid gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : rides.length === 0 ? (
                    <div className="text-center py-20 border border-white/10 rounded-3xl bg-white/5">
                        <p className="text-4xl mb-4">🚕</p>
                        <p className="text-gray-400 font-medium">No completed trips yet.</p>
                        <p className="text-gray-600 text-sm mt-1">Accept rides to start earning!</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {rides.map((ride) => (
                            <div
                                key={ride.id}
                                onClick={() => setSelectedRide(ride)}
                                className="bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all cursor-pointer rounded-2xl p-4 md:p-5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg md:text-xl shrink-0">
                                        🚕
                                    </div>
                                    <div>
                                        <p className="text-sm md:text-base font-bold">Trip with {ride.rider?.name || 'Rider'}</p>
                                        <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                                            {new Date(ride.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg md:text-xl font-black text-emerald-400">₹{ride.fare}</p>
                                    <p className="text-[8px] md:text-[10px] text-emerald-600 font-bold uppercase">Completed</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trip Detail Modal */}
                {selectedRide && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRide(null)} />
                        <div className="relative z-10 bg-gray-900 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl">
                            <div className="text-center mb-4 md:mb-6">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-xl md:text-2xl border border-emerald-500/20">
                                    🚕
                                </div>
                                <h2 className="text-lg md:text-xl font-black">Trip Details</h2>
                                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Completed Journey</p>
                            </div>

                            <div className="space-y-3 border-y border-white/10 py-4 md:py-5 mb-4 md:mb-5">
                                <div className="flex justify-between text-xs md:text-sm">
                                    <span className="text-gray-400">Date</span>
                                    <span className="font-bold">{new Date(selectedRide.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-xs md:text-sm">
                                    <span className="text-gray-400">Rider</span>
                                    <span className="font-bold">{selectedRide.rider?.name || 'Customer'}</span>
                                </div>
                                <div className="flex justify-between text-xs md:text-sm">
                                    <span className="text-gray-400">Ride ID</span>
                                    <span className="font-mono text-gray-400 text-[10px]">{selectedRide.id.slice(0, 12)}…</span>
                                </div>
                                <div className="flex justify-between text-base md:text-lg pt-3 border-t border-white/10">
                                    <span className="font-black">Earnings</span>
                                    <span className="font-black text-emerald-400">₹{selectedRide.fare}</span>
                                </div>
                            </div>

                            {selectedRide.ratings && selectedRide.ratings.length > 0 && (
                                <div className="mb-4 md:mb-5 text-center">
                                    <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">Rider Rating</p>
                                    <div className="flex justify-center gap-1 text-yellow-400 text-lg md:text-xl">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i} className={i < selectedRide.ratings[0].rating ? 'opacity-100' : 'opacity-20'}>★</span>
                                        ))}
                                    </div>
                                    {selectedRide.ratings[0].comment && (
                                        <p className="text-[10px] text-gray-500 mt-2 italic">"{selectedRide.ratings[0].comment}"</p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedRide(null)}
                                className="w-full py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
