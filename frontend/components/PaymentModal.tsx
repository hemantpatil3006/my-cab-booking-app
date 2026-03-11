'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { useAuth } from '@clerk/nextjs';
import { createPaymentIntent, rateRide, payWithWallet, getMe } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({
    rideId,
    amount,
    token,
    onSuccess
}: {
    rideId: string,
    amount: number,
    token: string,
    onSuccess: () => void
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [clientSecret, setClientSecret] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [step, setStep] = useState<'payment' | 'rating' | 'success'>('payment');
    const [method, setMethod] = useState<'card' | 'wallet'>('wallet');
    const [credits, setCredits] = useState<number>(0);

    const { getToken } = useAuth();

    useEffect(() => {
        const init = async () => {
            try {
                const freshToken = await getToken();
                if (!freshToken) throw new Error("Authentication failed");
                const data = await getMe(freshToken);
                if (data && data.user) {
                    const parsedCredits = parseFloat(data.user.credits);
                    setCredits(!isNaN(parsedCredits) ? parsedCredits : 0);
                }

                if (method === 'card') {
                    const intentData = await createPaymentIntent(freshToken, rideId);
                    setClientSecret(intentData.clientSecret);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Initialization failed");
            }
        };
        init();
    }, [rideId, method, getToken]);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        const freshToken = await getToken();
        if (!freshToken) {
            setError("Session expired. Please refresh.");
            setProcessing(false);
            return;
        }

        if (method === 'wallet') {
            try {
                await payWithWallet(freshToken, rideId);
                setProcessing(false);
                setStep('rating');
            } catch (err: any) {
                setError(err.message);
                setProcessing(false);
            }
            return;
        }

        if (!stripe || !elements || !clientSecret) return;
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card: cardElement },
        });

        if (result.error) {
            setError(result.error.message || 'Payment failed');
            setProcessing(false);
        } else if (result.paymentIntent.status === 'succeeded') {
            setProcessing(false);
            setStep('rating');
        }
    };

    const handleRating = async () => {
        setProcessing(true);
        try {
            const freshToken = await getToken();
            if (!freshToken) throw new Error("Session expired");

            await rateRide(freshToken, rideId, rating, comment);
            setStep('success');
            setTimeout(onSuccess, 2000);
        } catch (err: any) {
            setError(err.message);
            setStep('success'); // Still finish if rating fails
            setTimeout(onSuccess, 2000);
        }
    };

    if (step === 'success') {
        return (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl border border-emerald-500/30">
                    ✅
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Payment Successful!</h2>
                <p className="text-gray-400">Thank you for riding with RideLane.</p>
            </div>
        );
    }

    if (step === 'rating') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">How was your ride?</h2>
                    <p className="text-gray-400 text-sm mt-1">Rate your driver to help us improve</p>
                </div>

                <div className="flex justify-center gap-4 py-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-3xl transition-all ${rating >= star ? 'scale-125 grayscale-0' : 'grayscale opacity-30 hover:opacity-50'}`}
                        >
                            ⭐
                        </button>
                    ))}
                </div>

                <textarea
                    placeholder="Any comments? (Optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-violet-500 outline-none transition-all h-24 resize-none"
                />

                <button
                    onClick={handleRating}
                    disabled={processing}
                    className="btn-primary w-full py-4 font-bold disabled:opacity-50"
                >
                    {processing ? 'Submitting...' : 'Complete & Close'}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handlePayment} className="space-y-6 animate-in slide-in-from-left duration-500">
            <div className="text-center mb-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black mb-1">Final Amount</p>
                <p className="text-4xl font-black text-white">₹{amount}</p>
            </div>

            <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${method === 'card' ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Credit Card
                </button>
                <button
                    type="button"
                    onClick={() => setMethod('wallet')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${method === 'wallet' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Wallet (₹{parseFloat(credits.toString()).toFixed(2)})
                </button>
            </div>

            {method === 'card' ? (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#ffffff',
                                    '::placeholder': { color: '#6b7280' },
                                },
                            },
                        }}
                    />
                </div>
            ) : (
                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-xs text-emerald-400 font-medium">
                        {credits >= amount
                            ? `Available Balance: ₹${parseFloat(credits.toString()).toFixed(2)}`
                            : `Insufficient balance! Need ₹${(amount - credits).toFixed(2)} more.`}
                    </p>
                </div>
            )}

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            <button
                type="submit"
                disabled={(method === 'card' && (!stripe || !clientSecret)) || (method === 'wallet' && credits < amount) || processing}
                className={`w-full py-4 text-sm tracking-wide font-black disabled:opacity-50 shadow-2xl transition-all rounded-xl ${method === 'wallet' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20'
                    }`}
            >
                {processing ? 'Processing...' : `Pay ₹${amount} with ${method === 'card' ? 'Card' : 'Wallet'}`}
            </button>

            <p className="text-[10px] text-center text-gray-500 px-8 leading-relaxed">
                Secure payment processed by Stripe. Your card information never touches our servers.
            </p>
        </form>
    );
}

import { createPortal } from 'react-dom';

export default function PaymentModal({
    rideId,
    amount,
    token,
    isOpen,
    onClose
}: {
    rideId: string,
    amount: number,
    token: string,
    isOpen: boolean,
    onClose: () => void
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" onClick={onClose} />
            <div className="glass-dark w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-3xl shadow-black/50 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 blur-3xl -mr-16 -mt-16" />

                <Elements stripe={stripePromise}>
                    <CheckoutForm
                        rideId={rideId}
                        amount={amount}
                        token={token}
                        onSuccess={onClose}
                    />
                </Elements>
            </div>
        </div>,
        document.body
    );
}
