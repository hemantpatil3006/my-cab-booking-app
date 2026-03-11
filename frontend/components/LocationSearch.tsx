'use client';

import { useState, useEffect, useRef } from 'react';
import { searchAddress } from '@/lib/api';

interface LocationSearchProps {
    label: string;
    placeholder: string;
    onSelect: (lat: number, lng: number, address: string) => void;
    value?: string;
}

export default function LocationSearch({ label, placeholder, onSelect, value }: LocationSearchProps) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, []);

    const handleSearch = (val: string) => {
        setQuery(val);
        setError(false);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (val.length < 3) {
            setResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await searchAddress(val);
                setResults(data);
                setShowResults(true);
            } catch (err) {
                console.error('Search failed:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }, 500); // 500ms debounce
    };

    const handleSelect = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const name = result.display_name;

        setQuery(name);
        setShowResults(false);
        onSelect(lat, lon, name);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                {label}
            </label>
            <div className="relative group/input">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => query.length >= 3 && setShowResults(true)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all duration-300 placeholder:text-gray-600"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <span className="text-gray-600 group-focus-within/input:text-violet-500 transition-colors">🔍</span>
                    )}
                </div>
            </div>

            {showResults && (results.length > 0 || error) && (
                <div className="absolute z-[2000] w-full mt-3 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        {error ? (
                            <div className="px-4 py-3 text-[11px] text-red-400 flex items-center gap-2">
                                <span>⚠️</span>
                                <span>Search service temporary unavailable. Please try again.</span>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((result, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelect(result)}
                                    className="w-full text-left px-4 py-3 text-[11px] text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all flex items-start gap-3 group/item border-b border-white/5 last:border-0"
                                >
                                    <span className="mt-0.5 opacity-50 group-hover/item:opacity-100 transition-opacity italic">📍</span>
                                    <span>{result.display_name}</span>
                                </button>
                            ))
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
