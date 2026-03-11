'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { saveDriverProfile, syncUser } from '@/lib/api';

export default function DriverSetupPage() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    const [vehicleType, setVehicleType] = useState('sedan');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const token = await getToken();
        if (!token || !user) {
            setError('Not authenticated');
            setLoading(false);
            return;
        }

        try {
            // 1. Ensure user has 'driver' role in DB via sync
            const email = user.primaryEmailAddress?.emailAddress || '';
            const name = user.fullName || '';
            await syncUser(token, 'driver', email, name);

            // 2. Create driver profile
            await saveDriverProfile(token, {
                vehicle_type: vehicleType,
                license_number: licenseNumber
            });

            router.push('/dashboard/driver');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to complete setup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <Navbar role="driver" />

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.1),transparent_50%)]">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-widest mb-6">
                            Driver Registration
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Complete Setup</h1>
                        <p className="text-gray-400">Enter your vehicle details to start accepting rides.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="glass-dark p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Vehicle Type</label>
                            <select
                                value={vehicleType}
                                onChange={(e) => setVehicleType(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="bike" className="bg-gray-900">Bike</option>
                                <option value="auto" className="bg-gray-900">Auto Rickshaw</option>
                                <option value="sedan" className="bg-gray-900">Sedan</option>
                                <option value="suv" className="bg-gray-900">SUV</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">License Number</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. KA01AB1234"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-4 rounded-2xl text-sm font-bold tracking-wide shadow-xl shadow-violet-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Registering...</span>
                                </div>
                            ) : (
                                'Complete Registration'
                            )}
                        </button>

                        <div className="text-center pt-4">
                            <Link href="/dashboard/driver" className="text-xs text-gray-500 hover:text-white transition-colors">
                                Cancel and go back
                            </Link>
                        </div>
                    </form>

                    <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-white/5 text-[11px] leading-relaxed text-gray-500">
                        <p className="font-bold text-gray-400 mb-2 uppercase tracking-widest text-[10px]">Requirements:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Valid commercial driving license</li>
                            <li>Vehicle in good working condition</li>
                            <li>Correct vehicle category selection</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
