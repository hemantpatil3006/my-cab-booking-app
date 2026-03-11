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
                <div className="mb-10">
                    <Link
                        href="/dashboard/driver"
                        className="text-xs font-bold text-violet-400 hover:text-white transition-colors mb-4 inline-block flex items-center gap-2"
                    >
                        <span>←</span> Back to Console
                    </Link>
                    <h1 className="text-4xl font-black tracking-tight">Earnings &amp; History</h1>
                    <p className="text-gray-400 mt-1">Track your performance and completed trips</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <div className="sm:col-span-2 bg-gradient-to-br from-emerald-600/30 to-cyan-600/20 border border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3">Total Lifetime Earnings</p>
                        <p className="text-5xl font-black text-white">₹{earnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Total Trips</p>
                        <p className="text-4xl font-black">{rides.length}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Avg. Per Trip</p>
                        <p className="text-4xl font-black">₹{avgPerTrip}</p>
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
                                className="bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all cursor-pointer rounded-2xl p-5 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
                                        🚕
                                    </div>
                                    <div>
                                        <p className="font-bold">Trip with {ride.rider?.name || 'Rider'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(ride.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xl font-black text-emerald-400">₹{ride.fare}</p>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Completed</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trip Detail Modal */}
                {selectedRide && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRide(null)} />
                        <div className="relative z-10 bg-gray-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-emerald-500/20">
                                    🚕
                                </div>
                                <h2 className="text-xl font-black">Trip Details</h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Completed Journey</p>
                            </div>

                            <div className="space-y-3 border-y border-white/10 py-5 mb-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Date</span>
                                    <span className="font-bold">{new Date(selectedRide.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Rider</span>
                                    <span className="font-bold">{selectedRide.rider?.name || 'Customer'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Ride ID</span>
                                    <span className="font-mono text-gray-400 text-xs">{selectedRide.id.slice(0, 12)}…</span>
                                </div>
                                <div className="flex justify-between text-lg pt-3 border-t border-white/10">
                                    <span className="font-black">Earnings</span>
                                    <span className="font-black text-emerald-400">₹{selectedRide.fare}</span>
                                </div>
                            </div>

                            {selectedRide.ratings && selectedRide.ratings.length > 0 && (
                                <div className="mb-5 text-center">
                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Rider Rating</p>
                                    <div className="flex justify-center gap-1 text-yellow-400 text-xl">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i} className={i < selectedRide.ratings[0].rating ? 'opacity-100' : 'opacity-20'}>★</span>
                                        ))}
                                    </div>
                                    {selectedRide.ratings[0].comment && (
                                        <p className="text-xs text-gray-500 mt-2 italic">"{selectedRide.ratings[0].comment}"</p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedRide(null)}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
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
