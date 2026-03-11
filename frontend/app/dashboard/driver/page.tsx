'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import SocketService from '@/lib/socket';
import { getMe, updateDriverAvailability, respondToRide, updateRideStatus, getDriverMe, getPendingRides } from '@/lib/api';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>
});

export default function DriverDashboard() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadPendingRides = async () => {
        const token = await getToken();
        if (!token) return;
        try {
            const data = await getPendingRides(token);
            setRequests(data.rides || []);
        } catch (err) {
            console.error('Failed to load pending rides:', err);
        }
    };

    const toggleAvailability = async () => {
        const token = await getToken();
        if (!token) return;

        try {
            const newStatus = !isOnline;
            const data = await updateDriverAvailability(token, newStatus);
            setIsOnline(newStatus);
            setProfile(data.driver);

            if (newStatus) {
                // If going online, check for existing pending rides
                await loadPendingRides();
            } else {
                setRequests([]); // Clear requests when offline
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    useEffect(() => {
        const init = async () => {
            if (!user) return;
            const token = await getToken();
            if (!token) return;

            try {
                // Role guard: verify this user is actually a driver
                const meData = await getMe(token);
                if (!meData?.user) {
                    router.push('/onboarding');
                    return;
                }
                if (meData.user.role !== 'driver') {
                    router.push(`/dashboard/${meData.user.role}`);
                    return;
                }

                // Fetch driver-specific profile
                const data = await getDriverMe(token);
                if (data?.driver) {
                    setProfile(data.driver);
                    setIsOnline(data.driver.availability);

                    if (data.driver.availability) {
                        await loadPendingRides();
                    }

                    // Connect to socket and join driver room reliably
                    // We must use the database user_id, NOT the Clerk user.id, so that backend emits reach us!
                    SocketService.connect(data.driver.user_id, 'driver');
                    const socket = SocketService.getInstance();

                    // Cleanup before adding to avoid duplicates if useEffect re-runs
                    socket.off('ride-request');
                    socket.off('status-update');

                    socket.on('ride-request', (requestData) => {
                        console.log('New ride request:', requestData);
                        setRequests(prev => {
                            // Avoid duplicates
                            if (prev.find(r => r.id === requestData.ride.id)) return prev;
                            return [requestData.ride, ...prev];
                        });
                    });

                    socket.on('status-update', (updateData) => {
                        setActiveRide((prev: any) => prev?.id === updateData.ride.id ? updateData.ride : prev);
                    });
                } else {
                    // No driver record found
                    setProfile(null);
                }
            } catch (err) {
                console.error('Error fetching driver profile:', err);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            SocketService.disconnect();
        };
    }, [user, getToken]);

    const handleResponse = async (rideId: string, action: 'accept' | 'reject') => {
        const token = await getToken();
        if (!token) return;

        try {
            const data = await respondToRide(token, rideId, action);
            if (action === 'accept') {
                setActiveRide(data.ride);
                setRequests([]); // Clear others
            } else {
                setRequests(prev => prev.filter(r => r.id !== rideId));
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || `Failed to ${action} ride`);
        }
    };

    const handleStatusChange = async () => {
        if (!activeRide) return;
        const token = await getToken();
        if (!token) return;

        let nextStatus = '';
        if (activeRide.status === 'accepted') nextStatus = 'ongoing';
        else if (activeRide.status === 'ongoing') nextStatus = 'completed';

        if (!nextStatus) return;

        try {
            const data = await updateRideStatus(token, activeRide.id, nextStatus, activeRide.status === 'ongoing' ? activeRide.fare : undefined);
            if (nextStatus === 'completed') {
                setActiveRide(null);
                alert('Trip Completed!');
                // Check for new pending rides after completion
                await loadPendingRides();
            } else {
                setActiveRide(data.ride);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
            <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Initializing Driver Console...</p>
        </div>
    );

    if (!profile) return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <Navbar role="driver" />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mb-6 text-3xl border border-violet-500/20">
                    🚕
                </div>
                <h1 className="text-3xl font-bold mb-4">No Driver Profile found</h1>
                <p className="text-gray-400 mb-8 max-w-sm">
                    You're logged in, but you haven't registered as a driver yet. Register now to start earning!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                        href="/dashboard/driver/setup"
                        className="btn-primary px-8 py-3 rounded-xl font-bold transition-all inline-flex items-center justify-center text-white"
                    >
                        Complete Driver Setup
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-950 text-white overflow-hidden relative">
            {/* Sidebar */}
            <div className="w-full md:w-96 h-[45vh] md:h-full shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-white/5 bg-gray-900/50 backdrop-blur-xl z-20">
                <div className="p-4 md:p-8 border-b border-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-xl font-bold">Driver Console</h1>
                        <button
                            onClick={toggleAvailability}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isOnline
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                        >
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>
                    </div>

                    <div className="space-y-0.5 md:space-y-1">
                        <p className="text-sm text-gray-400">{user?.fullName}</p>
                        <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-2 md:mb-4">{profile.vehicle_type} • {profile.license_number}</p>
                        <Link
                            href="/dashboard/driver/history"
                            className="inline-flex items-center gap-2 px-3 py-1 md:py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[10px] md:text-xs font-semibold text-gray-300 hover:text-white"
                        >
                            📊 <span>View Earnings & History</span>
                        </Link>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-custom">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                        {activeRide ? 'Active Trip' : 'New Requests'}
                    </h2>

                    {activeRide ? (
                        <div className="glass p-4 md:p-6 rounded-2xl border-violet-500/30">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded font-bold uppercase">
                                    {activeRide.status}
                                </span>
                                <span className="text-xs font-mono">₹{activeRide.fare || '--'}</span>
                            </div>
                            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                                <div className="flex gap-2 md:gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                    <div>
                                        <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Pickup</p>
                                        <p className="text-[11px] md:text-xs text-white line-clamp-2">{activeRide.pickup_address || 'Address not available'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 md:gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <div>
                                        <p className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Destination</p>
                                        <p className="text-[11px] md:text-xs text-white line-clamp-2">{activeRide.drop_address || 'Address not available'}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Trip actions */}
                            <button
                                onClick={handleStatusChange}
                                className="w-full bg-violet-600 hover:bg-violet-500 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                            >
                                {activeRide.status === 'accepted' ? 'START TRIP' : 'COMPLETE TRIP'}
                            </button>
                        </div>
                    ) : requests.length > 0 ? (
                        <div className="space-y-3 md:space-y-4">
                            {requests.map((req) => (
                                <div key={req.id} className="glass p-4 md:p-5 rounded-2xl hover:bg-white/5 transition-all border border-white/5 group/card">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-xs md:text-sm border border-violet-500/20 font-bold text-violet-400">
                                            {req.rider?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] md:text-xs font-bold">{req.rider?.name || 'User'}</p>
                                            <span className="text-[8px] md:text-[9px] text-gray-500 font-mono uppercase tracking-widest">New Request</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4 mb-4">
                                        <div className="flex gap-3">
                                            <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                            <p className="text-[10px] text-gray-300 line-clamp-2">{req.pickup_address || 'Pickup near you'}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                            <p className="text-[10px] text-gray-300 line-clamp-2">{req.drop_address || 'To destination'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleResponse(req.id, 'accept')}
                                            className="flex-1 bg-violet-600 hover:bg-violet-500 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.95]"
                                        >
                                            ACCEPT
                                        </button>
                                        <button
                                            onClick={() => handleResponse(req.id, 'reject')}
                                            className="flex-1 bg-white/5 hover:bg-white/10 py-2.5 rounded-xl text-[11px] font-bold transition-all active:scale-[0.95]"
                                        >
                                            REJECT
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-xl">
                                📡
                            </div>
                            <p className="text-sm text-gray-500 mb-6">
                                {isOnline ? 'Searching for nearby rides...' : 'Go online to start receiving rides'}
                            </p>
                            {!isOnline && (
                                <button
                                    onClick={toggleAvailability}
                                    className="btn-primary px-6 md:px-8 py-2 md:py-3 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-violet-500/20 active:scale-[0.95] transition-all"
                                >
                                    GO ONLINE
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                <Map
                    pickup={activeRide ? [activeRide.pickup_lat, activeRide.pickup_lng] : null}
                    drop={activeRide ? [activeRide.drop_lat, activeRide.drop_lng] : null}
                    route={activeRide?.route_geometry || null}
                    onMapClick={() => { }}
                />

                {!isOnline && (
                    <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-6">
                            <div className="glass px-6 py-3 rounded-full text-xs font-bold border border-white/10 shadow-2xl">
                                YOU ARE CURRENTLY OFFLINE
                            </div>
                            <button
                                onClick={toggleAvailability}
                                className="btn-primary px-10 py-4 rounded-2xl text-base font-bold shadow-2xl shadow-violet-500/40 active:scale-[0.95] transition-all animate-bounce"
                            >
                                GO ONLINE NOW
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
