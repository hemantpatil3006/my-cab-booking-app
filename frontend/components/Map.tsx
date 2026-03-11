'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const TaxiIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/198/198424.png', // Taxi icon
    iconSize: [35, 35],
    iconAnchor: [17, 35],
});

interface MapProps {
    pickup: [number, number] | null;
    drop: [number, number] | null;
    route: [number, number][] | null;
    driver?: [number, number] | null;
    onMapClick: (lat: number, lng: number) => void;
}

// ─── Helper Components ──────────────────────────────────────────────────────

function MapUpdater({ pickup, drop, route, driver }: { pickup: any, drop: any, route: any, driver: any }) {
    const map = useMap();

    useEffect(() => {
        if (!map || !(map as any)._container) return;

        try {
            if (driver && !pickup && !drop) {
                map.panTo(driver, { animate: true });
            } else if (pickup && drop) {
                const points = [pickup, drop];
                if (driver) points.push(driver);
                const bounds = L.latLngBounds(points as any);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } catch (err) {
            console.debug('Leaflet view update suppressed:', err);
        }
    }, [pickup, drop, driver, map]);

    return null;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// ─── Main Map Component ─────────────────────────────────────────────────────

export default function Map({ pickup, drop, route, driver, onMapClick }: MapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Helper to ensure map fills container after mount/resize
    const FixResizer = () => {
        const map = useMap();
        useEffect(() => {
            const timer = setTimeout(() => {
                try {
                    // Safety check: Ensure map and its container are still in the DOM
                    if (map && (map as any)._container) {
                        map.invalidateSize({ animate: false });
                    }
                } catch (err) {
                    console.debug('Leaflet resize error ignored:', err);
                }
            }, 300);
            return () => clearTimeout(timer);
        }, [map]);
        return null;
    };

    if (!isMounted) return <div className="w-full h-full bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
    </div>;

    return (
        <MapContainer
            center={[12.9716, 77.5946]}
            zoom={13}
            className="w-full h-full"
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {pickup && (
                <Marker position={pickup} icon={DefaultIcon}>
                    <Popup className="custom-popup">
                        <div className="font-bold text-gray-900 text-xs">Pickup Point</div>
                    </Popup>
                </Marker>
            )}

            {drop && (
                <Marker position={drop} icon={DefaultIcon}>
                    <Popup className="custom-popup">
                        <div className="font-bold text-gray-900 text-xs">Destination</div>
                    </Popup>
                </Marker>
            )}

            {route && (
                <Polyline
                    positions={route}
                    color="#4f46e5"
                    weight={8}
                    opacity={0.9}
                    lineCap="round"
                    lineJoin="round"
                />
            )}

            {driver && (
                <Marker position={driver} icon={TaxiIcon}>
                    <Popup className="custom-popup">
                        <div className="font-bold text-violet-600 text-xs text-center">Driver is here</div>
                    </Popup>
                </Marker>
            )}

            <MapUpdater pickup={pickup} drop={drop} route={route} driver={driver} />
            <ClickHandler onMapClick={onMapClick} />
            <FixResizer />

            {/* Map border/outline */}
            <div className="absolute inset-0 pointer-events-none border-l border-white/10 z-[1000]" />
        </MapContainer>
    );
}
