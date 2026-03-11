'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { syncUser, getMe } from '@/lib/api';

export default function OnboardingPage() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken, isLoaded: authLoaded } = useAuth();
    const router = useRouter();

    const [role, setRole] = useState<'rider' | 'driver' | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkExistingUser() {
            if (!userLoaded || !authLoaded || !user) return;

            try {
                const token = await getToken();
                if (!token) throw new Error('No auth token');

                const profile = await getMe(token);
                if (profile && profile.user) {
                    router.push(`/dashboard/${profile.user.role}`);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                setLoading(false);
            }
        }


        checkExistingUser();
    }, [userLoaded, authLoaded, user, getToken, router]);

    const handleSync = async () => {
        if (!role || !user) return;
        setSyncing(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) throw new Error('No auth token');

            const email = user.primaryEmailAddress?.emailAddress || '';
            const name = user.fullName || '';

            await syncUser(token, role, email, name);
            router.push(`/dashboard/${role}`);
        } catch (err: any) {
            setError(err.message || 'Failed to set role. Please try again.');
            setSyncing(false);
        }
    };


    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-700/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-2xl text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
                    One last step, <span className="gradient-text">{user.firstName}</span>
                </h1>
                <p className="text-gray-400 text-lg mb-12">How do you want to use RideLane today?</p>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                    <button
                        onClick={() => setRole('rider')}
                        className={`card group text-left border-2 transition-all ${role === 'rider' ? 'border-violet-500 bg-violet-500/10' : 'border-transparent'
                            }`}
                    >

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${role === 'rider' ? 'bg-violet-500 text-white' : 'bg-white/10 text-gray-400 group-hover:bg-white/20'
                            }`}>
                            🚗
                        </div>
                        <h3 className="text-xl font-bold mb-2">Rider</h3>
                        <p className="text-gray-400 text-sm">
                            I want to book rides, track my trips, and get where I'm going safely.
                        </p>
                    </button>

                    <button
                        onClick={() => setRole('driver')}
                        className={`card group text-left border-2 transition-all ${role === 'driver' ? 'border-cyan-500 bg-cyan-500/10' : 'border-transparent'
                            }`}
                    >

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${role === 'driver' ? 'bg-cyan-500 text-white' : 'bg-white/10 text-gray-400 group-hover:bg-white/20'
                            }`}>
                            🚕
                        </div>
                        <h3 className="text-xl font-bold mb-2">Driver</h3>
                        <p className="text-gray-400 text-sm">
                            I want to accept ride requests, earn money, and manage my driving schedule.
                        </p>
                    </button>
                </div>

                <button
                    onClick={handleSync}
                    disabled={!role || syncing}
                    className={`btn-primary w-full max-w-xs py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {syncing ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Setting up...
                        </div>
                    ) : (
                        'Continue to Dashboard'
                    )}
                </button>
            </div>
        </main>
    );
}
