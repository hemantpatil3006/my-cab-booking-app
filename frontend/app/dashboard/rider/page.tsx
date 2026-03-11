'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function RiderDashboard() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken, isLoaded: authLoaded } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [recentRides, setRecentRides] = useState<any[]>([]);

    useEffect(() => {
        async function verifyRider() {
            if (!userLoaded || !authLoaded || !user) return;

            try {
                const token = await getToken();
                if (!token) throw new Error('No token');

                const data = await getMe(token);
                if (!data || !data.user) {
                    router.push('/onboarding');
                    return;
                }

                // Role guard: redirect to correct dashboard
                if (data.user.role !== 'rider') {
                    router.push(`/dashboard/${data.user.role}`);
                    return;
                }

                setProfile(data.user);

                // Fetch recent rides
                const historyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/rides/history/rider`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    setRecentRides(historyData.rides.slice(0, 3));
                }

                setLoading(false);
            } catch (err) {
                router.push('/onboarding');
            }
        }


        verifyRider();
    }, [userLoaded, authLoaded, user, getToken, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <Navbar role="rider" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <header className="mb-12">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, <span className="gradient-text">{user.firstName}</span>!
                    </h1>
                    <p className="text-gray-400">Where would you like to go today?</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Link href="/dashboard/rider/book" className="card border border-violet-500/30 bg-violet-500/5 group cursor-pointer hover:border-violet-500 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                            📍
                        </div>
                        <h3 className="text-xl font-bold mb-2">Book a Ride</h3>
                        <p className="text-sm text-gray-400">Request a car and get picked up in minutes.</p>
                    </Link>

                    <Link href="/dashboard/rider/history" className="card hover:border-violet-500/50 transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                            🕒
                        </div>
                        <h3 className="text-xl font-bold mb-2">Ride History</h3>
                        <p className="text-sm text-gray-400">View your past trips, receipts, and ratings.</p>
                    </Link>

                    <Link href="/dashboard/rider/payments" className="card hover:border-violet-500/50 transition-all cursor-pointer group">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                            💳
                        </div>
                        <h3 className="text-xl font-bold mb-2">Payments</h3>
                        <p className="text-sm text-gray-400">Manage your saved cards and payment methods.</p>
                    </Link>
                </div>

                <section className="glass rounded-3xl p-8 border border-white/10">

                    <h2 className="text-xl font-bold mb-6">Recent Activity</h2>

                    {recentRides.length > 0 ? (
                        <div className="space-y-4">
                            {recentRides.map(ride => (
                                <div key={ride.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all gap-4">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-sm shrink-0">
                                            🚕
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-sm truncate">Trip to Destination</p>
                                            <p className="text-[10px] text-gray-500 uppercase">{new Date(ride.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right pt-2 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0">
                                        <p className="font-black text-white text-lg">₹{ride.fare}</p>
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase">{ride.status}</p>
                                    </div>
                                </div>
                            ))}
                            <Link href="/dashboard/rider/history" className="block text-center text-sm text-violet-400 font-bold mt-4 hover:underline">View All Activity →</Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 italic text-gray-500">
                                ?
                            </div>
                            <p className="text-gray-400">No recent rides found. Start your first journey!</p>
                            <Link href="/dashboard/rider/book" className="btn-primary mt-6 px-8 py-3">Request Now</Link>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
