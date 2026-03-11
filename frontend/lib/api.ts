const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export async function syncUser(token: string, role: string, email: string, name: string) {
    const res = await fetch(`${API_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, email, name }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to sync user');
    }

    return res.json();
}

export async function getMe(token: string) {
    const res = await fetch(`${API_URL}/api/users/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) return null;
    return res.json();
}

export async function createRideRequest(token: string, data: any) {
    const res = await fetch(`${API_URL}/api/rides/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to request ride');
    }

    return res.json();
}

// ─── External APIs (Geocoding & Routing) ───────────────────────────────────

export async function searchAddress(query: string) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`
    );
    if (!res.ok) throw new Error('Geocoding failed');
    return res.json();
}

export async function getRoute(pickup: [number, number], drop: [number, number]) {
    const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup[1]},${pickup[0]};${drop[1]},${drop[0]}?overview=full&geometries=geojson`
    );
    if (!res.ok) throw new Error('Routing failed');
    return res.json();
}
export async function updateDriverAvailability(token: string, available: boolean) {
    const res = await fetch(`${API_URL}/api/drivers/availability`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ available }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update availability');
    }

    return res.json();
}
export async function respondToRide(token: string, rideId: string, action: 'accept' | 'reject') {
    const res = await fetch(`${API_URL}/api/rides/${rideId}/respond`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to respond to ride');
    }

    return res.json();
}

export async function updateRideStatus(token: string, rideId: string, status: string, fare?: number) {
    const res = await fetch(`${API_URL}/api/rides/${rideId}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, fare }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update ride status');
    }

    return res.json();
}
export async function createPaymentIntent(token: string, rideId: string) {
    const res = await fetch(`${API_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ride_id: rideId }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment intent');
    }

    return res.json();
}

export async function getRiderHistory(token: string) {
    const res = await fetch(`${API_URL}/api/rides/history/rider`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch rider history');
    return res.json();
}

export async function getDriverHistory(token: string) {
    const res = await fetch(`${API_URL}/api/rides/history/driver`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch driver history');
    return res.json();
}

export async function getPendingRides(token: string) {
    const res = await fetch(`${API_URL}/api/rides/pending`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch pending rides');
    return res.json();
}

export async function rateRide(token: string, rideId: string, rating: number, comment?: string) {
    const res = await fetch(`${API_URL}/api/rides/${rideId}/rate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit rating');
    }

    return res.json();
}

export async function payWithWallet(token: string, rideId: string) {
    const res = await fetch(`${API_URL}/api/payments/pay-with-wallet`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rideId }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to pay with wallet');
    }

    return res.json();
}

export async function updateCredits(token: string, amount: number) {
    const res = await fetch(`${API_URL}/api/users/add-credits`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update credits');
    }

    return res.json();
}

export async function getUserPayments(token: string) {
    const res = await fetch(`${API_URL}/api/payments/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
}

export async function getDriverMe(token: string) {
    const res = await fetch(`${API_URL}/api/drivers/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) return null;
    return res.json();
}

export async function saveDriverProfile(token: string, data: { vehicle_type: string; license_number: string }) {
    const res = await fetch(`${API_URL}/api/drivers/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save driver profile');
    }

    return res.json();
}
