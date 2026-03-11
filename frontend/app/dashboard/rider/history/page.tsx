'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { getRiderHistory, rateRide } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function RiderHistoryPage() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken } = useAuth();
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRide, setSelectedRide] = useState<any | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const token = await getToken();
                const data = await getRiderHistory(token!);
                setRides(data.rides);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (userLoaded && user) fetchHistory();
    }, [userLoaded, user, getToken]);

    const handleRate = async (rideId: string) => {
        setSubmittingRating(true);
        try {
            const token = await getToken();
            await rateRide(token!, rideId, rating, comment);

            // Update UI locally
            setRides((prev) =>
                prev.map((r) =>
                    r.id === rideId
                        ? { ...r, ratings: [{ rating, comment }] }
                        : r
                )
            );

            // Update selected ride too
            if (selectedRide && selectedRide.id === rideId) {
                setSelectedRide({ ...selectedRide, ratings: [{ rating, comment }] });
            }

            alert('Thank you for rating your ride!');
        } catch (err: any) {
            alert(err.message || 'Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    if (!userLoaded || !user) return null;

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <Navbar role="rider" />

            <main className="max-w-6xl mx-auto p-8">
                <div className="mb-12">
                    <Link
                        href="/dashboard/rider"
                        className="text-xs font-bold text-violet-400 hover:text-white transition-colors mb-4 inline-block flex items-center gap-2"
                    >
                        <span>←</span> Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight mb-2">Ride History</h1>
                            <p className="text-gray-400">View and manage your past trips</p>
                        </div>
                        <Link href="/dashboard/rider/book" className="btn-primary px-6 py-3 text-sm font-bold shadow-xl shadow-violet-500/10 self-start md:self-auto">
                            Book New Ride
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : rides.length === 0 ? (
                    <div className="text-center py-20 glass-dark rounded-3xl border border-white/5">
                        <div className="text-4xl mb-4">📭</div>
                        <h2 className="text-xl font-bold mb-2">No rides yet</h2>
                        <p className="text-gray-500 text-sm mb-8">Your trip history will appear here once you take your first ride.</p>
                        <Link href="/dashboard/rider/book" className="text-violet-400 font-bold hover:underline">Start your first trip →</Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {rides.map((ride) => (
                            <div key={ride.id} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl -mr-16 -mt-16 group-hover:bg-violet-600/10 transition-all" />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">
                                            {ride.status === 'completed' ? '✅' : '❌'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">
                                                {new Date(ride.created_at).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                            <h3 className="text-lg font-bold flex flex-wrap items-center gap-2">
                                                Ride to Destination
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${ride.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {ride.status}
                                                </span>
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-1 truncate italic">
                                                RID ID: {ride.id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full pt-4 sm:pt-0 border-t border-white/5 sm:border-0 mt-2 sm:mt-0">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Fare Paid</p>
                                            <p className="text-2xl font-black text-white">₹{ride.fare || 0}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedRide(ride)}
                                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/btn shrink-0"
                                        >
                                            <span className="text-gray-400 group-hover/btn:text-white transition-colors">📄</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Receipt Modal */}
                {selectedRide && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRide(null)} />
                        <div className="glass-dark w-full max-w-sm p-8 rounded-[2.5rem] border border-white/10 relative z-10 shadow-3xl animate-in zoom-in-95 duration-300">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-violet-500/20">
                                    🧾
                                </div>
                                <h1 className="text-2xl font-black">Ride Receipt</h1>
                                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Transaction Successful</p>
                            </div>

                            <div className="space-y-4 border-y border-white/5 py-6 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Date</span>
                                    <span className="font-bold">{new Date(selectedRide.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Ride ID</span>
                                    <span className="font-mono text-xs">{selectedRide.id.slice(0, 12)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Driver</span>
                                    <span className="font-bold">{selectedRide.driver?.name || 'Assigned Driver'}</span>
                                </div>
                                <div className="flex justify-between text-xl pt-4 border-t border-white/5">
                                    <span className="font-black">Total Paid</span>
                                    <span className="font-black text-violet-400">₹{selectedRide.fare}</span>
                                </div>
                            </div>

                            {selectedRide.status === 'completed' && (
                                <div className="mb-6 border-b border-white/5 pb-6">
                                    {selectedRide.ratings && selectedRide.ratings.length > 0 ? (
                                        <div className="text-center">
                                            <p className="text-sm text-gray-400 mb-2">You rated this ride</p>
                                            <div className="flex items-center justify-center gap-1 text-yellow-400 text-2xl">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i} className={i < selectedRide.ratings[0].rating ? "opacity-100" : "opacity-30"}>★</span>
                                                ))}
                                            </div>
                                            {selectedRide.ratings[0].comment && (
                                                <p className="text-xs text-gray-500 mt-2 italic">"{selectedRide.ratings[0].comment}"</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                            <p className="text-sm font-bold mb-3 text-center">Rate your experience</p>
                                            <div className="flex items-center justify-center gap-2 mb-4">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setRating(star)}
                                                        className={`text-3xl transition-transform hover:scale-125 ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                placeholder="Optional feedback..."
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:border-violet-500 transition-colors resize-none placeholder:text-gray-600"
                                                rows={2}
                                            />
                                            <button
                                                onClick={() => handleRate(selectedRide.id)}
                                                disabled={submittingRating}
                                                className="w-full bg-violet-600 hover:bg-violet-500 text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                {submittingRating ? 'Submitting...' : 'Submit Rating'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setSelectedRide(null);
                                    setRating(5);
                                    setComment('');
                                }}
                                className="btn-primary w-full py-4 text-sm font-bold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
