'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { getMe, updateCredits, getUserPayments } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function RiderPaymentsPage() {
    const { user, isLoaded: userLoaded } = useUser();
    const { getToken } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [credits, setCredits] = useState<number>(0);
    const [cardDetails, setCardDetails] = useState({ last4: '4242', expiry: '12/26' });
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = await getToken();
                if (!token) return;

                // Fetch Profile for credits
                const profileData = await getMe(token);
                setCredits(profileData.user.credits || 0);

                // Fetch payments for transactions
                const paymentsData = await getUserPayments(token);
                setTransactions(paymentsData.payments || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (userLoaded && user) fetchData();
    }, [userLoaded, user, getToken]);

    const handleAddFunds = async () => {
        const amountStr = window.prompt('Enter amount to add to your wallet (₹):', '500');
        if (!amountStr || isNaN(parseFloat(amountStr))) return;

        const amount = parseFloat(amountStr);
        if (amount <= 0) return;

        setProcessing(true);
        try {
            const token = await getToken();
            const data = await updateCredits(token!, amount);
            setCredits(data.user.credits);
            alert(`Successfully added ₹${amount} to your wallet!`);
        } catch (err: any) {
            alert(err.message || 'Failed to add funds');
        } finally {
            setProcessing(false);
        }
    };

    const handleEditCard = () => {
        const newLast4 = window.prompt('Enter new last 4 digits of card:', cardDetails.last4);
        const newExpiry = window.prompt('Enter new expiry date (MM/YY):', cardDetails.expiry);

        if (newLast4 && newLast4.length === 4 && newExpiry) {
            setCardDetails({ last4: newLast4, expiry: newExpiry });
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
                    <h1 className="text-4xl font-black tracking-tight mb-2">Payments & Wallet</h1>
                    <p className="text-gray-400">Manage your transactions and payment methods</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="md:col-span-2 glass-dark p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-4">Default Payment Method</p>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-white/10 flex items-center justify-center text-xs font-bold tracking-widest shadow-xl">
                                    VISA
                                </div>
                                <div>
                                    <p className="font-bold text-xl">•••• •••• •••• {cardDetails.last4}</p>
                                    <p className="text-xs text-gray-500">Expires {cardDetails.expiry}</p>
                                </div>
                                <button
                                    onClick={handleEditCard}
                                    className="ml-auto text-xs font-bold text-violet-400 hover:text-white transition-colors"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-dark p-8 rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Ride Credits</p>
                        <p className="text-4xl font-black">₹{parseFloat(credits.toString()).toFixed(2)}</p>
                        <button
                            onClick={handleAddFunds}
                            disabled={processing}
                            className="mt-4 text-xs font-bold text-white bg-emerald-600 px-4 py-2 rounded-full hover:bg-emerald-500 transition-all disabled:opacity-50"
                        >
                            {processing ? 'Processing...' : 'Add Funds'}
                        </button>
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-6">Recent Transactions</h2>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-16 glass-dark rounded-3xl border border-white/5">
                        <p className="text-gray-500 italic">No transactions found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="glass-dark p-6 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        {tx.status === 'paid' ? '💳' : '⏳'}
                                    </div>
                                    <div>
                                        <p className="font-bold">Ride Payment</p>
                                        <p className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase mb-1">Ride ID: {tx.ride_id.slice(0, 12)}</p>
                                        <p className="text-[10px] text-gray-500 uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-rose-400">- ₹{tx.amount}</p>
                                    <p className={`text-[9px] uppercase font-black ${tx.status === 'paid' ? 'text-emerald-400' : 'text-yellow-400'}`}>{tx.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
