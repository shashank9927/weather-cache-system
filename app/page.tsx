'use client';

import { useState, useEffect, useRef } from 'react';

interface CitySuggestion {
    name: string;
    fullName: string;
    lat: number;
    lon: number;
}

interface WeatherData {
    city: string;
    coordinates: { lat: number; lon: number };
    current: {
        time: string;
        temperature: number;
        humidity: number;
        apparentTemperature: number;
        pressure: number;
        weatherCode: number;
        windSpeed: number;
    };
    fetchedAt: string;
}

interface CacheEntry {
    city: string;
    lastFetched: string;
    status: 'fresh' | 'expired';
    age: number;
}

export default function Home() {
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [responseTime, setResponseTime] = useState(0);
    const [cacheSource, setCacheSource] = useState('');
    const [cacheStatus, setCacheStatus] = useState<('idle' | 'hit' | 'miss')[]>(['idle', 'idle', 'idle']);

    const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Viewer state
    const [showViewer, setShowViewer] = useState(false);
    const [viewerTab, setViewerTab] = useState<'l1' | 'l2'>('l1');
    const [l1Entries, setL1Entries] = useState<CacheEntry[]>([]);
    const [l2Entries, setL2Entries] = useState<CacheEntry[]>([]);
    const [cacheCapacity, setCacheCapacity] = useState(100);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (city.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/geocode?query=${encodeURIComponent(city)}`);
                const data = await res.json();
                if (data.success && data.suggestions?.length) {
                    setSuggestions(data.suggestions);
                    setShowSuggestions(true);
                }
            } catch { }
        }, 250);
    }, [city]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchViewerData = async () => {
        try {
            const [l1, l2, cap] = await Promise.all([
                fetch('/api/cache').then(r => r.json()),
                fetch('/api/database').then(r => r.json()),
                fetch('/api/cache/capacity').then(r => r.json())
            ]);
            if (l1.success) setL1Entries(l1.cache.entries);
            if (l2.success) setL2Entries(l2.database.entries);
            if (cap.success) setCacheCapacity(cap.capacity);
        } catch { }
    };

    const clearCache = async (type: 'l1' | 'l2') => {
        try {
            const endpoint = type === 'l1' ? '/api/cache/clear' : '/api/database/clear';
            await fetch(endpoint, { method: 'DELETE' });
            await fetchViewerData();
            showToast(type === 'l1' ? 'L1 Cache cleared successfully' : 'L2 Database cleared successfully', 'success');
        } catch {
            showToast('Failed to clear ' + (type === 'l1' ? 'cache' : 'database'), 'error');
        }
    };

    const updateCapacity = async (newCapacity: number) => {
        if (newCapacity < 1 || newCapacity > 1000) return;
        try {
            await fetch('/api/cache/capacity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ capacity: newCapacity })
            });
            setCacheCapacity(newCapacity);
            await fetchViewerData();
        } catch { }
    };

    useEffect(() => {
        if (showViewer) fetchViewerData();
    }, [showViewer]);

    const search = async (name: string, lat?: number, lon?: number) => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        setWeatherData(null);
        setShowSuggestions(false);
        setCacheStatus(['idle', 'idle', 'idle']);

        const start = performance.now();
        try {
            let url = `/api/weather?city=${encodeURIComponent(name)}`;
            if (lat !== undefined && lon !== undefined) url += `&lat=${lat}&lon=${lon}`;

            const res = await fetch(url);
            const data = await res.json();
            const time = Math.round(performance.now() - start);
            setResponseTime(time);

            if (!res.ok) throw new Error(data.error || 'Failed');

            setWeatherData(data.data);

            
            if (showViewer) fetchViewerData();

            if (time < 20) {
                setCacheSource('L1 Cache');
                setCacheStatus(['hit', 'idle', 'idle']);
            } else if (time < 100) {
                setCacheSource('L2 Cache');
                setCacheStatus(['miss', 'hit', 'idle']);
            } else {
                setCacheSource('API');
                setCacheStatus(['miss', 'miss', 'hit']);
            }
        } catch (err: any) {
            setError(err.message);
            setCacheStatus(['miss', 'miss', 'miss']);
        } finally {
            setLoading(false);
        }
    };

    const getWeatherEmoji = (code: number) => {
        const map: Record<number, string> = {
            0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 45: '🌫', 48: '🌫',
            51: '🌦', 61: '🌧', 63: '🌧', 65: '🌧', 71: '❄️', 73: '❄️', 75: '❄️', 95: '⛈'
        };
        return map[code] || '🌈';
    };

    const formatAge = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;

    const levels = [
        { label: 'L1 Cache', name: 'In-Memory LRU' },
        { label: 'L2 Cache', name: 'MongoDB' },
        { label: 'Source', name: 'OpenMeteo API' }
    ];

    return (
        <div className="app">
            <section className="hero">
                <h1>Weather Cache System</h1>
                <p className="lead">Multi-level caching with LRU eviction and lazy expiration. Search any city worldwide.</p>
            </section>

            {error && <div className="error fade">{error}</div>}

            <div className="main-grid">
                <div className="search-col">
                    <div className="search-wrap">
                        <div className="search-box" style={{ position: 'relative' }} ref={dropdownRef}>
                            <input
                                className="search-input"
                                placeholder="Search for a city..."
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search(city)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            />
                            <button className="search-btn" onClick={() => search(city)} disabled={loading}>
                                {loading ? <span className="loading" /> : 'Search'}
                            </button>

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="dropdown fade">
                                    {suggestions.map((s, i) => (
                                        <div key={i} className="dropdown-item" onClick={() => { setCity(s.name); search(s.name, s.lat, s.lon); }}>
                                            <span className="dropdown-icon">📍</span>
                                            <div>
                                                <div className="dropdown-name">{s.name}</div>
                                                <div className="dropdown-sub">{s.fullName}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p className="search-hint">
                            <span onClick={() => setShowViewer(!showViewer)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                                {showViewer ? 'Hide' : 'View'} cache contents
                            </span>
                        </p>
                    </div>

                    {showViewer && (
                        <div className="panel fade">
                            <div className="viewer-header">
                                <div className="viewer-title">{viewerTab === 'l1' ? 'L1 In-Memory Cache' : 'L2 MongoDB Store'}</div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {viewerTab === 'l1' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Size:</span>
                                            <button className="viewer-btn" onClick={() => updateCapacity(cacheCapacity - 10)} style={{ padding: '4px 8px' }}>−</button>
                                            <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '30px', textAlign: 'center' }}>{cacheCapacity}</span>
                                            <button className="viewer-btn" onClick={() => updateCapacity(cacheCapacity + 10)} style={{ padding: '4px 8px' }}>+</button>
                                        </div>
                                    )}
                                    <button className="viewer-btn" onClick={() => clearCache(viewerTab)}>Clear</button>
                                </div>
                            </div>
                            <div className="viewer-tabs">
                                <button className={`viewer-tab ${viewerTab === 'l1' ? 'active' : ''}`} onClick={() => setViewerTab('l1')}>L1 Cache</button>
                                <button className={`viewer-tab ${viewerTab === 'l2' ? 'active' : ''}`} onClick={() => setViewerTab('l2')}>L2 Database</button>
                            </div>
                            <div className="viewer-list">
                                {(viewerTab === 'l1' ? l1Entries : l2Entries).length === 0 ? (
                                    <div className="viewer-empty">No entries yet. Search for a city to populate.</div>
                                ) : (
                                    (viewerTab === 'l1' ? l1Entries : l2Entries).map((e, i) => (
                                        <div key={i} className="viewer-item">
                                            <div>
                                                <div className="viewer-city">{e.city}</div>
                                                <div className="viewer-meta">{formatAge(e.age)} ago</div>
                                            </div>
                                            <span className={`viewer-badge ${e.status}`}>{e.status === 'fresh' ? 'Fresh' : 'Expired'}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="weather-col">
                    {weatherData && (
                        <>
                            <div className="panel fade">
                                <div className="panel-title">{weatherData.city}</div>
                                <div className="weather">
                                    <div className="weather-temp">{Math.round(weatherData.current.temperature)}°</div>
                                    <div className="weather-info">
                                        <h3>{getWeatherEmoji(weatherData.current.weatherCode)} {Math.round(weatherData.current.temperature)}°C</h3>
                                        <p>Feels like {Math.round(weatherData.current.apparentTemperature)}°C</p>
                                    </div>
                                </div>
                                <div className="weather-grid">
                                    <div className="weather-stat"><div className="weather-stat-label">Humidity</div><div className="weather-stat-value">{Math.round(weatherData.current.humidity)}%</div></div>
                                    <div className="weather-stat"><div className="weather-stat-label">Wind</div><div className="weather-stat-value">{Math.round(weatherData.current.windSpeed)} km/h</div></div>
                                    <div className="weather-stat"><div className="weather-stat-label">Pressure</div><div className="weather-stat-value">{Math.round(weatherData.current.pressure)} hPa</div></div>
                                    <div className="weather-stat"><div className="weather-stat-label">Updated</div><div className="weather-stat-value">{new Date(weatherData.current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <span className="response-badge">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                        <path d="M7 13.25c3.2 0 5-1.8 5-5s-1.8-5-5-5s-5 1.8-5 5s1.8 5 5 5M5.5.75h3M7 .75v2.5m-6.227.333a7.8 7.8 0 0 1 1.596-1.586m10.858 1.586a7.8 7.8 0 0 0-1.595-1.586" />
                                        <path d="M7 6.26v2l1.2 1.2" />
                                    </svg>
                                    Response time: {responseTime}ms • Data source: {cacheSource}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {(weatherData || loading) && (
                <div className="panel fade">
                    <div className="panel-title">Cache Flow</div>
                    <div className="flow">
                        {levels.map((l, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                <div className={`flow-node ${cacheStatus[i]}`}>
                                    <div className="flow-label">{l.label}</div>
                                    <div className="flow-name">{l.name}</div>
                                    <span className="flow-badge">
                                        {cacheStatus[i] === 'hit' ? '✓ Hit' : cacheStatus[i] === 'miss' ? '✕ Miss' : 'Ready'}
                                    </span>
                                </div>
                                {i < 2 && <span className="flow-arrow">→</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`toast fade ${toast.type}`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    );
}
