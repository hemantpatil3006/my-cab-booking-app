'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createRideRequest, getRoute, getMe } from '@/lib/api';
import SocketService from '@/lib/socket';
import Navbar from '@/components/Navbar';
import LocationSearch from '@/components/LocationSearch';
import PaymentModal from '@/components/PaymentModal';
import Link from 'next/link';

// Dynamically import Map to prevent SSR errors (Leaflet depends on window)
const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-900 animate-pulse flex items-center justify-center text-gray-500">Loading Map...</div>
});

const BASE_FARE = 50; // ₹50
const PER_KM_RATE = 15; // ₹15 per km

export default function BookRidePage() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken, isLoaded: authLoaded } = useAuth();
    const router = useRouter();

    const [pickup, setPickup] = useState<[number, number] | null>(null);
    const [drop, setDrop] = useState<[number, number] | null>(null);
    const [pickupAddress, setPickupAddress] = useState('');
    const [dropAddress, setDropAddress] = useState('');
    const [routeData, setRouteData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [activeRide, setActiveRide] = useState<any>(null);
    const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
    const [error, setError] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [dbUserId, setDbUserId] = useState<string | null>(null);

    // Verification check (ensure user is rider)
    useEffect(() => {
        async function checkRole() {
            if (!userLoaded || !authLoaded || !user) return;
            const token = await getToken();
            setAuthToken(token);
            const data = await getMe(token!);
            if (!data) {
                router.push('/onboarding');
            } else {
                setDbUserId(data.user.id);
            }
        }
        checkRole();
    }, [userLoaded, authLoaded, user, getToken, router]);

    // Socket listeners for Real-time updates
    useEffect(() => {
        if (!dbUserId) return;

        SocketService.connect(dbUserId);
        const socket = SocketService.getInstance();

        // 1. Remove previous listeners to prevent duplicates if useEffect re-runs
        socket.off('ride-response');
        socket.off('status-update');
        socket.off('driver-update');

        socket.on('ride-response', (data) => {
            console.log('Ride response:', data);
            if (data.action === 'accept') {
                setActiveRide(data.ride);
                setBooking(false);
            } else {
                setBooking(false);
                setError('Your ride request was rejected or cancelled.');
            }
        });

        socket.on('status-update', (data) => {
            console.log('Status update:', data);
            setActiveRide(data.ride);
            if (data.ride.status === 'completed') {
                setIsPaymentModalOpen(true);
            }
        });

        socket.on('driver-update', (data) => {
            // Check via latest activeRide by using the existing activeRide state
            // But since we removed it from deps, we should check data.driver.ride_id instead if backend sends it.
            // For now, updating location directly.  The frontend check is nice but less critical than dropping sockets.
            setDriverLocation([data.driver.current_lat, data.driver.current_lng]);
        });

        // We DO NOT want to disconnect on every activeRide change
        // So we remove `activeRide` from the dependency array.  Disconnection happens on unmount.
        return () => {
            socket.off('ride-response');
            socket.off('status-update');
            socket.off('driver-update');
            // SocketService.disconnect(); // Let the global context or unmount handle this, don't kill it inside route change! Let's keep it though for component unmount
        };
    }, [dbUserId, router]);

    // Cleanup socket on complete unmount of the page
    useEffect(() => {
        return () => {
            SocketService.disconnect();
        }
    }, [])

    // Calculate Route & Fare
    useEffect(() => {
        if (!pickup || !drop) {
            setRouteData(null);
            return;
        }

        async function fetchRoute() {
            setLoading(true);
            try {
                const data = await getRoute(pickup!, drop!);
                const route = data.routes[0];
                const distanceKM = route.distance / 1000;
                const durationMIN = route.duration / 60;

                setRouteData({
                    geometry: route.geometry.coordinates.map((c: any) => [c[1], c[0]]),
                    distance: distanceKM,
                    duration: durationMIN,
                    fare: Math.round(BASE_FARE + distanceKM * PER_KM_RATE),
                });
            } catch (err) {
                console.error(err);
                setError('Could not calculate route. Try a different location.');
            } finally {
                setLoading(false);
            }
        }

        fetchRoute();
    }, [pickup, drop]);

    const handleMapClick = (lat: number, lng: number) => {
        if (!pickup) {
            setPickup([lat, lng]);
            setPickupAddress(`Map Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } else if (!drop) {
            setDrop([lat, lng]);
            setDropAddress(`Map Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
    };

    const handleBook = async () => {
        if (!pickup || !drop || !routeData) return;

        setBooking(true);
        setError('');
        try {
            const token = await getToken();
            const res = await createRideRequest(token!, {
                pickup_lat: pickup[0],
                pickup_lng: pickup[1],
                drop_lat: drop[0],
                drop_lng: drop[1],
                pickup_address: pickupAddress,
                drop_address: dropAddress,
                fare: routeData.fare
            });

            // Instead of redirecting, we set the active ride to the pending one
            // so the socket listeners can take over
            setActiveRide(res.ride);
            // We keep booking as true (or another state) to show "Finding Driver"
            setBooking(true);
        } catch (err: any) {
            setError(err.message || 'Failed to book ride');
            setBooking(false);
        }
    };

    if (!userLoaded || !user) return null;

    return (
        <div className="h-screen flex flex-col bg-gray-950 overflow-hidden font-sans">
            <Navbar role="rider" />

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* ─── SIDEBAR: INPUTS ────────────────────────────────────────── */}
                <div className="w-full md:w-[450px] p-4 md:p-8 bg-gray-950/80 backdrop-blur-xl border-r border-white/10 flex flex-col gap-6 md:gap-8 overflow-y-auto z-20 shadow-2xl relative">
                    {/* Header */}
                    <div className="space-y-4">
                        <Link
                            href="/dashboard/rider"
                            className="text-xs font-bold text-violet-400 hover:text-white transition-colors inline-flex items-center gap-2"
                        >
                            <span>←</span> Back to Dashboard
                        </Link>
                        <div>
                            <div className="inline-flex items-center px-3 py-1 mb-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] uppercase tracking-widest font-bold">
                                Plan Your Trip
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                {activeRide ? 'Ride Status' : 'Book Your Ride'}
                            </h1>
                            {!activeRide && <p className="text-xs md:text-sm text-gray-400">Enter details to see estimated fare</p>}
                        </div>
                    </div>

                    {/* Inputs - Hidden when ride is active to save space */}
                    {!activeRide && (
                        <div className="flex flex-col gap-6">
                            <div className={`relative transition-all duration-300 ${pickup ? 'ring-2 ring-emerald-500/30 rounded-2xl' : ''}`}>
                                <LocationSearch
                                    label="Pickup"
                                    placeholder="Current location or search address"
                                    value={pickupAddress}
                                    onSelect={(lat, lng, addr) => {
                                        setPickup([lat, lng]);
                                        setPickupAddress(addr);
                                    }}
                                />
                                {pickup && <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">Set</div>}
                            </div>

                            <div className="relative h-2 flex items-center justify-center">
                                <div className="w-px h-12 bg-gradient-to-b from-violet-500/50 to-cyan-500/50 absolute top-[-24px]" />
                            </div>

                            <div className={`relative transition-all duration-300 ${drop ? 'ring-2 ring-emerald-500/30 rounded-2xl' : ''}`}>
                                <LocationSearch
                                    label="Destination"
                                    placeholder="Where to?"
                                    value={dropAddress}
                                    onSelect={(lat, lng, addr) => {
                                        setDrop([lat, lng]);
                                        setDropAddress(addr);
                                    }}
                                />
                                {drop && <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-emerald-500 text-white text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-bold shadow-lg">Set</div>}
                            </div>
                        </div>
                    )}

                    {/* Booking / Route Details - Reordered to be right after inputs */}
                    {!activeRide && routeData && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all" />

                            <div className="flex justify-between items-start relative z-10 mb-5 md:mb-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-500 font-black">Estimated Fare</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl md:text-4xl font-black text-white">₹{routeData.fare}</span>
                                        <span className="text-[9px] md:text-[10px] text-gray-500">approx</span>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <div className="inline-flex items-center gap-1.5 md:gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] md:text-[10px] font-bold text-gray-300">
                                        <span>⏱️ {Math.round(routeData.duration)} min</span>
                                    </div>
                                    <p className="text-[10px] md:text-[11px] text-gray-500 font-medium tracking-tighter">Distance: {routeData.distance.toFixed(1)} km</p>
                                </div>
                            </div>

                            <button
                                onClick={handleBook}
                                disabled={booking}
                                className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50"
                            >
                                {booking ? 'Finding Driver...' : 'Confirm & Request Ride'}
                            </button>
                        </div>
                    )}

                    {/* Active Ride Tracking Widget */}
                    {activeRide && (
                        <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-xl shadow-lg shadow-violet-500/20">
                                        {activeRide.status === 'pending' ? '🔍' : '🚕'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 mb-1">
                                            {activeRide.status === 'pending' ? 'Finding Driver' :
                                                activeRide.status === 'accepted' ? 'Driver is coming' : 'Trip in progress'}
                                        </p>
                                        <p className="text-lg font-bold">
                                            {activeRide.status === 'pending' ? 'Connecting...' : `Ride #${activeRide.id.slice(0, 5)}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-mono font-bold">FARE</p>
                                    <p className="text-2xl font-black text-white">₹{activeRide.fare}</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                    <p className="text-[11px] text-gray-400 leading-tight">{activeRide.pickup_address}</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    <p className="text-[11px] text-gray-400 leading-tight">{activeRide.drop_address}</p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                                    <div className="h-full bg-violet-500 w-full animate-pulse shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                                </div>
                                <p className="text-[10px] text-gray-500 text-center font-bold tracking-widest uppercase">
                                    Please stay at pickup location
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Footer / Helper Info */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        {!activeRide && !pickup && !loading && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-[11px] leading-relaxed text-gray-400 flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-lg shrink-0">📍</div>
                                <div>
                                    <p className="font-bold text-white mb-1">How to book?</p>
                                    <p className="text-gray-400">Search for an address or <span className="text-violet-400 font-bold">click on the map</span> to set points.</p>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center py-4 gap-3 text-sm text-gray-400">
                                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                <span>Calculating route...</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 flex items-center gap-3">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {(pickup || drop) && !booking && !activeRide && (
                            <button
                                onClick={() => {
                                    setPickup(null); setDrop(null); setPickupAddress(''); setDropAddress(''); setRouteData(null);
                                }}
                                className="text-xs text-gray-500 hover:text-white transition-colors block mx-auto py-2 font-medium"
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── MAP LAYER ─────────────────────────────────────────────── */}
                <div className="flex-1 h-[400px] md:h-full relative overflow-hidden bg-gray-950">
                    <Map
                        pickup={pickup}
                        drop={drop}
                        route={routeData?.geometry || null}
                        driver={driverLocation}
                        onMapClick={handleMapClick}
                    />

                    {/* Attribution */}
                    <div className="absolute bottom-6 right-6 z-[1000]">
                        <div className="glass px-3 py-1.5 rounded-lg text-[10px] text-gray-500 font-mono tracking-tighter backdrop-blur-md">
                            OSM • OSRM • Leaflet
                        </div>
                    </div>
                </div>
            </div>

            {activeRide && authToken && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => router.push('/dashboard/rider')}
                    rideId={activeRide.id}
                    amount={activeRide.fare}
                    token={authToken}
                />
            )}
        </div>
    );
}
