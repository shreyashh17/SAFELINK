import React, { useState, useEffect, useRef } from 'react';
import api from './api';

/* ─────────────────────────────────────────────────────────────────────────────
   SafeLink – USER EMERGENCY PORTAL
   Tabs: Home · Quick Alert · Map · My Alerts · Profile
───────────────────────────────────────────────────────────────────────────── */

interface Alert { id: string; type: string; message: string; status: string; timestamp: string; latitude?: number; longitude?: number; }

interface NearestStation {
    name: string;
    phone: string;
    distance: number; // metres
    lat: number;
    lng: number;
    address?: string;
    fallback: boolean;
}

const EMERGENCY_SERVICES = [
    {
        label: 'Police',
        number: '100',
        color: '#3B82F6',
        icon: '👮',
        gradient: 'linear-gradient(135deg, #1d4ed8, #3B82F6)',
        overpassType: 'amenity=police',
        description: 'Call Police (100)',
        fallbackNumber: '100',
    },
    {
        label: 'Ambulance',
        number: '108',
        color: '#10B981',
        icon: '🚑',
        gradient: 'linear-gradient(135deg, #047857, #10B981)',
        overpassType: 'amenity=hospital',
        description: 'Call Ambulance (108)',
        fallbackNumber: '108',
    },
    {
        label: 'Fire Brigade',
        number: '101',
        color: '#F97316',
        icon: '🚒',
        gradient: 'linear-gradient(135deg, #c2410c, #F97316)',
        overpassType: 'amenity=fire_station',
        description: 'Call Fire Brigade (101)',
        fallbackNumber: '101',
    },
    {
        label: 'Disaster',
        number: '1078',
        color: '#F59E0B',
        icon: '🆘',
        gradient: 'linear-gradient(135deg, #b45309, #F59E0B)',
        overpassType: 'amenity=government',
        description: 'Disaster Helpline (1078)',
        fallbackNumber: '1078',
    },
    {
        label: "Women's Help",
        number: '1091',
        color: '#EC4899',
        icon: '🤝',
        gradient: 'linear-gradient(135deg, #9d174d, #EC4899)',
        overpassType: 'amenity=police',
        description: "Women's Helpline (1091)",
        fallbackNumber: '1091',
    },
    {
        label: 'Child Help',
        number: '1098',
        color: '#8B5CF6',
        icon: '🧒',
        gradient: 'linear-gradient(135deg, #6d28d9, #8B5CF6)',
        overpassType: 'amenity=police',
        description: 'Childline (1098)',
        fallbackNumber: '1098',
    },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
}

/* ─── Nearest Station Modal ──────────────────────────────────────────────── */
function NearestStationModal({
    service,
    location,
    onClose,
    onCallLogged,
}: {
    service: typeof EMERGENCY_SERVICES[0];
    location: { lat: number; lng: number } | null;
    onClose: () => void;
    onCallLogged: () => void;
}) {
    const [station, setStation] = useState<NearestStation | null>(null);
    const [loading, setLoading] = useState(true);
    const [callInitiated, setCallInitiated] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function fetchNearest() {
            if (!location) {
                setStation({
                    name: `National ${service.label} Helpline`,
                    phone: service.fallbackNumber,
                    distance: 0,
                    lat: 0,
                    lng: 0,
                    fallback: true,
                });
                setLoading(false);
                return;
            }

            const { lat, lng } = location;
            const radius = 8000; // 8 km search radius

            // Build Overpass QL query for the specific amenity type
            const query = `[out:json][timeout:10];
(
  node[${service.overpassType}](around:${radius},${lat},${lng});
  way[${service.overpassType}](around:${radius},${lat},${lng});
  relation[${service.overpassType}](around:${radius},${lat},${lng});
);
out center;`;

            try {
                const resp = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: `data=${encodeURIComponent(query)}`,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                const data = await resp.json();
                if (cancelled) return;

                if (!data.elements || data.elements.length === 0) throw new Error('no results');

                // Pick closest
                const closest = data.elements
                    .map((el: any) => {
                        const eLat = el.lat ?? el.center?.lat ?? 0;
                        const eLng = el.lon ?? el.center?.lon ?? 0;
                        return { ...el, _dist: haversineDistance(lat, lng, eLat, eLng), _lat: eLat, _lng: eLng };
                    })
                    .sort((a: any, b: any) => a._dist - b._dist)[0];

                const tags = closest.tags || {};
                const name = tags.name || tags['name:en'] || `Nearest ${service.label}`;
                const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || service.fallbackNumber;
                const address = [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ');

                setStation({
                    name,
                    phone: phone.replace(/\s+/g, '').replace(/^00/, '+'),
                    distance: Math.round(closest._dist),
                    lat: closest._lat,
                    lng: closest._lng,
                    address: address || undefined,
                    fallback: false,
                });
            } catch {
                if (!cancelled) {
                    setStation({
                        name: `National ${service.label} Helpline`,
                        phone: service.fallbackNumber,
                        distance: 0,
                        lat: 0,
                        lng: 0,
                        fallback: true,
                    });
                }
            }
            setLoading(false);
        }
        fetchNearest();
        return () => { cancelled = true; };
    }, [service, location]);

    const handleCall = () => {
        if (!station) return;
        setCallInitiated(true);
        // Log call to backend
        api.post('/api/sos/emergency-call', {
            serviceType: service.label,
            stationName: station.name,
            stationPhone: station.phone,
            latitude: location?.lat ?? 0,
            longitude: location?.lng ?? 0,
            distance: station.distance,
        }).catch(() => { });
        onCallLogged();
        window.location.href = `tel:${station.phone}`;
    };

    return (
        <div style={m.overlay} onClick={onClose}>
            <div style={m.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ ...m.modalHeader, background: service.gradient }}>
                    <span style={{ fontSize: 48 }}>{service.icon}</span>
                    <div>
                        <div style={m.modalTitle}>{service.label} Emergency</div>
                        <div style={m.modalSubtitle}>Finding nearest {service.label.toLowerCase()} station…</div>
                    </div>
                    <button style={m.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div style={m.modalBody}>
                    {loading ? (
                        <div style={m.loadingBox}>
                            <div style={m.spinner} />
                            <div style={m.loadingText}>Searching nearby {service.label.toLowerCase()} stations…</div>
                            <div style={m.loadingHint}>Using your GPS to find the closest station</div>
                        </div>
                    ) : station ? (
                        <>
                            {station.fallback && (
                                <div style={m.fallbackBanner}>
                                    ⚠️ No nearby station found in database — showing national helpline
                                </div>
                            )}

                            <div style={m.stationCard}>
                                <div style={{ ...m.stationIcon, background: service.color + '22', color: service.color }}>
                                    {service.icon}
                                </div>
                                <div style={m.stationInfo}>
                                    <div style={m.stationName}>{station.name}</div>
                                    {station.address && <div style={m.stationAddr}>📍 {station.address}</div>}
                                    {station.distance > 0 && (
                                        <div style={{ ...m.distanceBadge, background: service.color + '22', color: service.color }}>
                                            📏 {formatDistance(station.distance)} away
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={m.phoneSection}>
                                <div style={m.phoneLabel}>📞 Contact Number</div>
                                <div style={{ ...m.phoneNumber, color: service.color }}>{station.phone}</div>
                            </div>

                            {callInitiated ? (
                                <div style={m.callingBox}>
                                    <div style={{ fontSize: 40 }}>📞</div>
                                    <div style={m.callingText}>Calling {station.name}…</div>
                                    <div style={m.callingHint}>Check your phone application. Alert logged to SafeLink.</div>
                                </div>
                            ) : (
                                <button
                                    style={{ ...m.callBtn, background: service.gradient, boxShadow: `0 8px 32px ${service.color}66` }}
                                    onClick={handleCall}
                                >
                                    <span style={{ fontSize: 28 }}>📞</span>
                                    <span style={m.callBtnLabel}>CALL NOW</span>
                                    <span style={m.callBtnNum}>{station.phone}</span>
                                </button>
                            )}

                            {station.lat !== 0 && (
                                <a
                                    href={`https://maps.google.com/?q=${station.lat},${station.lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={m.mapsLink}
                                >
                                    🗺️ View {station.name} on Google Maps
                                </a>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/* ─── Spinner keyframes injected once ───────────────────────────────────── */
const _styleId = 'safelink-portal-styles';
if (!document.getElementById(_styleId)) {
    const spinnerStyle = document.createElement('style');
    spinnerStyle.id = _styleId;
    spinnerStyle.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.15)} }
@keyframes callPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,59,59,.5)} 50%{transform:scale(1.04);box-shadow:0 0 0 16px rgba(255,59,59,0)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes overlayIn { from{opacity:0} to{opacity:1} }
`;
    document.head.appendChild(spinnerStyle);
}

/* ─── Responsive helper ──────────────────────────────────────────────────── */
const isMobile = window.innerWidth < 600;

const QUICK_MESSAGES = [
    { emoji: '🔥', label: 'Fire Nearby', msg: 'Fire emergency! I need immediate help. Fire nearby.' },
    { emoji: '🌊', label: 'Flood / Disaster', msg: 'Natural disaster! Flooding in my area, need evacuation help.' },
    { emoji: '🤕', label: 'Medical Emergency', msg: 'Medical emergency! Need ambulance immediately.' },
    { emoji: '👊', label: 'Unsafe / Threat', msg: 'I am in an unsafe situation. Please send help immediately.' },
    { emoji: '⚡', label: 'Gas / Electric', msg: 'Hazardous situation — gas leak or electrical danger. Need emergency response.' },
    { emoji: '🚗', label: 'Road Accident', msg: 'Road accident. Need ambulance and emergency services at my location.' },
    { emoji: '🏚️', label: 'Building Collapse', msg: 'Building collapse! People are trapped. Need rescue immediately.' },
    { emoji: '🌪️', label: 'Storm / Cyclone', msg: 'Severe storm / cyclone in my area. Need emergency assistance.' },
];

export default function UserPortal({ userInfo, onLogout }: { userInfo: any; onLogout: () => void }) {
    const [tab, setTab] = useState<'home' | 'alert' | 'map' | 'history' | 'profile'>('home');
    const [location, setLocation] = useState<{ lat: number; lng: number; acc: number } | null>(null);
    const [locError, setLocError] = useState('');
    const [myAlerts, setMyAlerts] = useState<Alert[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [sosCountdown, setSosCountdown] = useState(0);
    const [sosSending, setSosSending] = useState(false);
    const [sosSent, setSosSent] = useState(false);
    const [customMsg, setCustomMsg] = useState('');
    const [msgSending, setMsgSending] = useState(false);
    const [msgSentText, setMsgSentText] = useState('');
    const [activeService, setActiveService] = useState<typeof EMERGENCY_SERVICES[0] | null>(null);
    const [callNotif, setCallNotif] = useState('');
    const [govAlerts, setGovAlerts] = useState<any[]>([]);
    const [govBanner, setGovBanner] = useState<any | null>(null);
    const timerId = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ── WebSocket for government alerts ───────────────────────────────────── */
    useEffect(() => {
        const wsUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace('http', 'ws');
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (evt) => {
            try {
                const { type, payload } = JSON.parse(evt.data);
                if (type === 'GOV_ALERT') {
                    setGovAlerts(prev => [payload, ...prev]);
                    setGovBanner(payload);
                    setTimeout(() => setGovBanner(null), 12000);
                }
            } catch { }
        };
        return () => ws.close();
    }, []);

    /* ── Load past broadcasts on mount ──────────────────────────────────────── */
    useEffect(() => {
        api.get('/api/broadcast').then(r => setGovAlerts(r.data)).catch(() => {});
    }, []);

    /* ── GPS init ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!navigator.geolocation) { setLocError('GPS not supported in this browser'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const l = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
                setLocation(l);
                api.post('/api/location/update', { latitude: l.lat, longitude: l.lng, accuracy: l.acc }).catch(() => { });
            },
            () => setLocError('Location permission denied'),
            { enableHighAccuracy: true }
        );
    }, []);

    /* ── Load data ─────────────────────────────────────────────────────────── */
    const loadAlerts = () => api.get('/api/user/alerts').then(r => setMyAlerts(r.data)).catch(() => { });
    const loadProfile = () => api.get('/api/user/me').then(r => setProfile(r.data)).catch(() => { });
    useEffect(() => { loadAlerts(); loadProfile(); }, [sosSent]);

    /* ── SOS countdown logic ────────────────────────────────────────────────── */
    const startSOS = () => {
        if (sosCountdown > 0 || sosSending) return;
        setSosCountdown(3);
        timerId.current = setInterval(() => {
            setSosCountdown(prev => {
                if (prev <= 1) { clearInterval(timerId.current!); fireSOS(); return 0; }
                return prev - 1;
            });
        }, 1000);
    };
    const cancelSOS = () => { clearInterval(timerId.current!); setSosCountdown(0); };
    const fireSOS = async () => {
        setSosSending(true);
        try {
            await api.post('/api/sos/trigger', {
                type: 'SOS', message: 'EMERGENCY SOS — I need immediate help!',
                latitude: location?.lat ?? 0, longitude: location?.lng ?? 0,
            });
            setSosSent(true);
            setTimeout(() => setSosSent(false), 8000);
        } catch { }
        setSosSending(false);
    };

    /* ── Quick/custom message ───────────────────────────────────────────────── */
    const sendAlert = async (msg: string) => {
        setMsgSending(true); setMsgSentText('');
        try {
            await api.post('/api/complaint/submit', {
                text: msg, category: 'emergency',
                latitude: location?.lat ?? 0, longitude: location?.lng ?? 0,
            });
            setMsgSentText(msg); setCustomMsg('');
            loadAlerts();
        } catch { }
        setMsgSending(false);
    };

    const handleCallLogged = () => {
        setCallNotif(`📞 Emergency call logged`);
        setTimeout(() => setCallNotif(''), 4000);
        loadAlerts();
    };

    /* ── Shared helpers ──────────────────────────────────────────────────────── */
    const locLabel = locError
        ? '📵 No GPS'
        : location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '⏳ Getting GPS…';

    /* ═══════════════════════════════════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════════════════════════════════ */
    return (
        <div style={c.root}>

            {/* ── Nearest Station Modal ────────────────────────────────────────── */}
            {activeService && (
                <NearestStationModal
                    service={activeService}
                    location={location}
                    onClose={() => setActiveService(null)}
                    onCallLogged={handleCallLogged}
                />
            )}

            {/* ── Call Notification Toast ──────────────────────────────────────── */}
            {callNotif && (
                <div style={c.toast}>{callNotif}</div>
            )}

            {/* ── Government Alert Banner (real-time from admin) ───────────────── */}
            {govBanner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: govBanner.severity === 'critical' ? '#FF3B3B' : govBanner.severity === 'warning' ? '#F59E0B' : '#3B82F6',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                } as React.CSSProperties}>
                    <span style={{ fontSize: 28 }}>
                        {govBanner.severity === 'critical' ? '🚨' : govBanner.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>{govBanner.title}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{govBanner.message} — {govBanner.area}</div>
                    </div>
                    <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => setGovBanner(null)}>✕</button>
                </div>
            )}

            {/* ── Top Header ───────────────────────────────────────────────────── */}
            <header style={c.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26 }}>🛡️</span>
                    <div>
                        <div style={c.headerTitle}>SafeLink</div>
                        <div style={c.headerSub}>Emergency Portal</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={locError ? c.gpsBad : location ? c.gpsGood : c.gpsWait}>{locLabel}</span>
                    <span style={c.userChip}>👤 {userInfo?.name || 'User'}</span>
                    <button style={c.logoutBtn} onClick={onLogout}>Logout</button>
                </div>
            </header>

            {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
            <nav style={c.tabBar}>
                {([
                    { id: 'home', icon: '🏠', label: 'Home' },
                    { id: 'alert', icon: '💬', label: 'Send Alert' },
                    { id: 'map', icon: '🗺️', label: 'My Location' },
                    { id: 'history', icon: '📋', label: 'My Alerts' },
                    { id: 'profile', icon: '👤', label: 'Profile' },
                ] as { id: typeof tab; icon: string; label: string }[]).map(t => (
                    <button key={t.id} style={{ ...c.tabBtn, ...(tab === t.id ? c.tabActive : {}) }} onClick={() => setTab(t.id)}>
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        <span style={c.tabLabel}>{t.label}</span>
                    </button>
                ))}
            </nav>

            {/* ── Content ──────────────────────────────────────────────────────── */}
            <div style={c.content}>

                {/* ══════════  HOME  ══════════ */}
                {tab === 'home' && (
                    <div style={c.homeGrid}>

                        {/* SOS Hero */}
                        <div style={c.sosSection}>
                            {sosSent ? (
                                <div style={c.sentCard}>
                                    <div style={{ fontSize: 64 }}>✅</div>
                                    <div style={c.sentTitle}>SOS Alert Sent!</div>
                                    <div style={c.sentSub}>Authorities have been notified. Your GPS location has been shared. Stay calm — help is on the way.</div>
                                </div>
                            ) : sosCountdown > 0 ? (
                                <div style={c.countdownWrap}>
                                    <div style={c.countdownNum}>{sosCountdown}</div>
                                    <div style={{ color: '#888', fontSize: 15, marginBottom: 20 }}>Sending SOS in…</div>
                                    <button style={c.cancelBtn} onClick={cancelSOS}>✕ Cancel</button>
                                </div>
                            ) : (
                                <>
                                    <button style={c.sosBtn} onClick={startSOS} disabled={sosSending}>
                                        <div style={c.sosPulse} />
                                        <div style={c.sosBtnInner}>
                                            <span style={{ fontSize: 56 }}>🆘</span>
                                            <span style={c.sosBtnLabel}>SOS</span>
                                            <span style={c.sosBtnHint}>{sosSending ? 'Sending…' : 'Tap to Send'}</span>
                                        </div>
                                    </button>
                                    <p style={c.sosCaption}>Hold — 3 second countdown before sending · Tap again to cancel</p>
                                </>
                            )}
                        </div>

                        {/* ── Emergency Service Buttons ────────────────────────── */}
                        <div style={c.section}>
                            <div style={c.sectionTitle}>🚨 Emergency Services — Tap to Call Nearest</div>
                            <p style={c.hint}>Tap any service to instantly find the nearest station and place a call.</p>
                            <div style={c.serviceGrid}>
                                {EMERGENCY_SERVICES.map(svc => (
                                    <button
                                        key={svc.label}
                                        style={{ ...c.serviceCard, borderColor: svc.color + '44' }}
                                        onClick={() => setActiveService(svc)}
                                    >
                                        <div style={{ ...c.serviceIconWrap, background: svc.gradient }}>
                                            <span style={{ fontSize: 28 }}>{svc.icon}</span>
                                        </div>
                                        <span style={{ ...c.serviceNum, color: svc.color }}>{svc.number}</span>
                                        <span style={c.serviceLabel}>{svc.label}</span>
                                        <span style={{ ...c.serviceCta, color: svc.color }}>Find Nearest →</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Government Alerts Section ───────────── */}
                        {govAlerts.length > 0 && (
                            <div style={c.section}>
                                <div style={c.sectionTitle}>📢 Government / Authority Alerts</div>
                                {govAlerts.slice(0, 5).map((g, i) => (
                                    <div key={i} style={{
                                        background: g.severity === 'critical' ? '#FF3B3B11' : g.severity === 'warning' ? '#F59E0B11' : '#3B82F611',
                                        border: `1px solid ${g.severity === 'critical' ? '#FF3B3B44' : g.severity === 'warning' ? '#F59E0B44' : '#3B82F644'}`,
                                        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ fontSize: 20 }}>
                                                {g.severity === 'critical' ? '🚨' : g.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                            </span>
                                            <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{g.title}</span>
                                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>{new Date(g.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>{g.message}</div>
                                        <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>📍 {g.area}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Status chips */}
                        <div style={c.statusRow}>
                            <div style={c.statusChip}>
                                <span>📡</span>
                                <span>Backend: <strong style={{ color: '#10B981' }}>Online</strong></span>
                            </div>
                            <div style={c.statusChip}>
                                <span>📍</span>
                                <span>GPS: <strong style={{ color: locError ? '#FF3B3B' : location ? '#10B981' : '#F59E0B' }}>{locError ? 'Denied' : location ? 'Active' : 'Loading'}</strong></span>
                            </div>
                            <div style={c.statusChip}>
                                <span>🚨</span>
                                <span>Active Alerts: <strong style={{ color: '#FF3B3B' }}>{myAlerts.filter(a => a.status === 'active').length}</strong></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════  SEND ALERT  ══════════ */}
                {tab === 'alert' && (
                    <div>
                        {msgSentText && (
                            <div style={c.successBanner}>
                                ✅ Alert sent: "{msgSentText.slice(0, 70)}{msgSentText.length > 70 ? '…' : ''}"
                            </div>
                        )}

                        <div style={c.sectionTitle}>⚡ One-Tap Emergency Alerts</div>
                        <p style={c.hint}>Tap any card below to instantly send a pre-written emergency alert with your GPS location.</p>
                        <div style={c.quickGrid}>
                            {QUICK_MESSAGES.map(q => (
                                <button key={q.label} style={c.quickCard} onClick={() => sendAlert(q.msg)} disabled={msgSending}>
                                    <span style={{ fontSize: 36 }}>{q.emoji}</span>
                                    <span style={c.quickLabel}>{q.label}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ ...c.sectionTitle, marginTop: 28 }}>✍️ Describe Your Situation</div>
                        <p style={c.hint}>Tell authorities exactly what's happening. Include floor/room, number of people, injuries.</p>
                        <textarea
                            style={c.textarea}
                            rows={5}
                            placeholder={'Example: "Trapped on 3rd floor of XYZ building. Gas smell, window broken. 3 people with me, one injured."'}
                            value={customMsg}
                            onChange={e => setCustomMsg(e.target.value)}
                        />
                        <button
                            style={{ ...c.sendBtn, opacity: (!customMsg.trim() || msgSending) ? 0.5 : 1 }}
                            disabled={!customMsg.trim() || msgSending}
                            onClick={() => sendAlert(customMsg)}>
                            {msgSending ? '📡 Sending alert…' : '📤 Send Emergency Alert'}
                        </button>

                        <div style={c.tipBox}>
                            💡 <strong>Tip:</strong> All alerts include your GPS coordinates automatically. Authorities can see your exact location on the admin map.
                        </div>
                    </div>
                )}

                {/* ══════════  MAP / LOCATION  ══════════ */}
                {tab === 'map' && (
                    <div>
                        <div style={c.sectionTitle}>📍 My Current Location</div>
                        {locError ? (
                            <div style={{ ...c.tipBox, borderColor: '#FF3B3B44', background: '#FF3B3B11', color: '#FF3B3B', marginBottom: 16 }}>
                                ❌ {locError} — Please allow location access in your browser and refresh the page.
                            </div>
                        ) : !location ? (
                            <div style={c.emptyState}><span style={{ fontSize: 40 }}>⏳</span><p>Acquiring GPS signal…</p></div>
                        ) : (
                            <>
                                <div style={c.coordCard}>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Latitude</span>
                                        <span style={c.coordValue}>{location.lat.toFixed(6)}°</span>
                                    </div>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Longitude</span>
                                        <span style={c.coordValue}>{location.lng.toFixed(6)}°</span>
                                    </div>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Accuracy</span>
                                        <span style={c.coordValue}>±{Math.round(location.acc)}m</span>
                                    </div>
                                </div>

                                <div style={c.mapFrame}>
                                    <iframe
                                        title="My Location"
                                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                                        src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
                                        allowFullScreen
                                    />
                                </div>

                                <a
                                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={c.openMapsBtn}>
                                    🗺️ Open in Google Maps
                                </a>
                            </>
                        )}
                    </div>
                )}

                {/* ══════════  HISTORY  ══════════ */}
                {tab === 'history' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={c.sectionTitle}>📋 My Alert History</div>
                            <button style={c.refreshBtn} onClick={loadAlerts}>↻ Refresh</button>
                        </div>
                        {myAlerts.length === 0 ? (
                            <div style={c.emptyState}>
                                <span style={{ fontSize: 48 }}>✅</span>
                                <p style={{ color: '#888', marginTop: 12 }}>No alerts sent yet</p>
                                <p style={{ color: '#555', fontSize: 13 }}>Use the Home or Send Alert tab to send a one-tap SOS when needed.</p>
                            </div>
                        ) : (
                            myAlerts.map(a => (
                                <div key={a.id} style={{ ...c.alertCard, borderLeftColor: a.status === 'active' ? '#FF3B3B' : '#10B981' }}>
                                    <div style={c.alertTop}>
                                        <span style={{ ...c.alertBadge, background: a.status === 'active' ? '#FF3B3B22' : '#10B98122', color: a.status === 'active' ? '#FF3B3B' : '#10B981' }}>
                                            {a.type}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: a.status === 'active' ? '#FF3B3B' : '#888' }}>
                                            {a.status === 'active' ? '🔴 Active' : '✅ Resolved'}
                                        </span>
                                        <span style={{ color: '#555', fontSize: 12, marginLeft: 'auto' }}>{new Date(a.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={c.alertMsg}>{a.message}</p>
                                    {a.latitude != null && (
                                        <a href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`} target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#3B82F6', fontSize: 12, textDecoration: 'none' }}>
                                            📍 {a.latitude.toFixed(5)}, {a.longitude?.toFixed(5)} · View on map
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ══════════  PROFILE  ══════════ */}
                {tab === 'profile' && (
                    <div>
                        <div style={c.sectionTitle}>👤 My Profile</div>
                        <div style={c.profileCard}>
                            <div style={c.profileAvatar}>{(userInfo?.name || 'U')[0].toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <div style={c.profileName}>{userInfo?.name || profile?.name || '—'}</div>
                                <div style={c.profileEmail}>{userInfo?.email || profile?.email || '—'}</div>
                                <div style={c.profileRole}>Role: <strong style={{ color: '#3B82F6' }}>{profile?.role || 'user'}</strong></div>
                                <div style={c.profileRole}>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={c.statsRow}>
                            <div style={c.statCard}>
                                <div style={c.statNum}>{myAlerts.length}</div>
                                <div style={c.statLabel}>Total Alerts</div>
                            </div>
                            <div style={c.statCard}>
                                <div style={{ ...c.statNum, color: '#FF3B3B' }}>{myAlerts.filter(a => a.status === 'active').length}</div>
                                <div style={c.statLabel}>Active</div>
                            </div>
                            <div style={c.statCard}>
                                <div style={{ ...c.statNum, color: '#10B981' }}>{myAlerts.filter(a => a.status === 'resolved').length}</div>
                                <div style={c.statLabel}>Resolved</div>
                            </div>
                        </div>

                        {/* Safety info */}
                        <div style={{ ...c.tipBox, marginTop: 24 }}>
                            <strong>🛡️ Emergency Quick Reference</strong><br /><br />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                {EMERGENCY_SERVICES.map(s => (
                                    <button key={s.label} style={{ ...c.profileEmergBtn, borderColor: s.color + '44', color: s.color }} onClick={() => setActiveService(s)}>
                                        {s.icon} {s.label} · <strong>{s.number}</strong>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button style={{ ...c.sendBtn, marginTop: 24, background: '#1E2438', color: '#FF3B3B', border: '1px solid #FF3B3B44' }} onClick={onLogout}>
                            🚪 Logout
                        </button>
                    </div>
                )}

            </div>

            {/* ── Always-visible Emergency Strip ──────────────────────────────────── */}
            <div style={c.strip}>
                {EMERGENCY_SERVICES.slice(0, 4).map(n => (
                    <button key={n.label} style={{ ...c.stripBtn, color: n.color, borderColor: n.color + '44', background: n.color + '11' }}
                        onClick={() => setActiveService(n)}>
                        {n.icon} {n.label} · {n.number}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── Portal Styles ──────────────────────────────────────────────────────── */
const c: Record<string, React.CSSProperties> = {
    root: { backgroundColor: '#0A0E1A', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 72 },

    // Toast
    toast: { position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', padding: '10px 24px', borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px #10B98166', animation: 'fadeIn .3s ease', whiteSpace: 'nowrap' as any, maxWidth: '90vw', textAlign: 'center' as any },

    // Header
    header: { background: '#151928', borderBottom: '1px solid #252c43', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, position: 'sticky', top: 0, zIndex: 100 },
    headerTitle: { fontSize: 16, fontWeight: 900, color: '#FF3B3B', letterSpacing: 2 },
    headerSub: { fontSize: 10, color: '#888', letterSpacing: 1 },
    gpsGood: { background: '#10B98111', border: '1px solid #10B98133', color: '#10B981', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
    gpsBad: { background: '#FF3B3B11', border: '1px solid #FF3B3B33', color: '#FF3B3B', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
    gpsWait: { background: '#F59E0B11', border: '1px solid #F59E0B33', color: '#F59E0B', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
    userChip: { background: '#1E2438', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
    logoutBtn: { background: 'none', border: '1px solid #252c43', color: '#888', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, minHeight: 32 },

    // Tab bar — touch-friendly
    tabBar: { display: 'flex', background: '#111827', borderBottom: '1px solid #1E2438', overflowX: 'auto' as any },
    tabBtn: { flex: 1, minWidth: 56, padding: '10px 4px', border: 'none', borderBottom: '2px solid transparent', background: 'transparent', color: '#888', fontWeight: 600, fontSize: 11, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .2s', minHeight: 56 } as any,
    tabActive: { color: '#FF3B3B', borderBottomColor: '#FF3B3B', background: '#FF3B3B08' },
    tabLabel: { fontSize: 9 },

    // Content
    content: { padding: '16px 14px', maxWidth: 680, margin: '0 auto' },

    // Home
    homeGrid: { display: 'flex', flexDirection: 'column', gap: 20 },
    hint: { color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 14, marginTop: -2 },

    // SOS
    sosSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 8 },
    sosBtn: { background: 'none', border: 'none', cursor: 'pointer', position: 'relative', width: 200, height: 200 },
    sosBtnInner: { position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 38% 35%, #ff6b6b, #FF3B3B, #b00000)', boxShadow: '0 0 60px #FF3B3B77, 0 0 100px #FF3B3B33', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 },
    sosPulse: { position: 'absolute', inset: -12, borderRadius: '50%', border: '2px solid #FF3B3B55', animation: 'ping 2s ease-in-out infinite' } as any,
    sosBtnLabel: { color: '#fff', fontWeight: 900, fontSize: 28, letterSpacing: 6 },
    sosBtnHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
    sosCaption: { color: '#444', fontSize: 12, marginTop: 12, maxWidth: 280 },

    // Countdown
    countdownWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
    countdownNum: { fontSize: 100, fontWeight: 900, color: '#FF3B3B', lineHeight: 1 },
    cancelBtn: { background: '#1E2438', border: '1px solid #FF3B3B55', color: '#FF3B3B', padding: '12px 32px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, minHeight: 48 },

    // SOS sent
    sentCard: { background: '#10B98111', border: '1px solid #10B98133', borderRadius: 20, padding: '28px 20px', textAlign: 'center', width: '100%' },
    sentTitle: { fontSize: 22, fontWeight: 900, color: '#10B981', marginTop: 10 },
    sentSub: { color: '#888', fontSize: 14, lineHeight: 1.6, marginTop: 10, maxWidth: 340, margin: '10px auto 0' },

    // Emergency service grid
    section: { display: 'flex', flexDirection: 'column', gap: 12 },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 },
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
    serviceCard: { background: '#151928', border: '1px solid', borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' } as any,
    serviceIconWrap: { width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    serviceNum: { fontSize: 16, fontWeight: 900 },
    serviceLabel: { color: '#ccc', fontSize: 11, fontWeight: 700 },
    serviceCta: { fontSize: 10, fontWeight: 600, opacity: 0.8 },

    // Status chips
    statusRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as any },
    statusChip: { background: '#151928', border: '1px solid #252c43', borderRadius: 20, padding: '7px 12px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' },

    // Alert tab
    successBanner: { background: '#10B98122', border: '1px solid #10B98144', color: '#10B981', padding: '12px 16px', borderRadius: 12, fontWeight: 600, fontSize: 14, marginBottom: 20 },
    quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 8 },
    quickCard: { background: '#151928', border: '1px solid #1E2438', borderRadius: 14, padding: '16px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'background .15s' },
    quickLabel: { fontSize: 12, fontWeight: 600, color: '#ccc', textAlign: 'center' as any },
    textarea: { background: '#1E2438', border: '1px solid #2A3050', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 14, width: '100%', resize: 'vertical' as any, lineHeight: 1.6, outline: 'none', marginBottom: 12, boxSizing: 'border-box' as any },
    sendBtn: { background: '#FF3B3B', border: 'none', color: '#fff', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: 15, cursor: 'pointer', width: '100%', transition: 'opacity .2s', minHeight: 48 },
    tipBox: { background: '#3B82F611', border: '1px solid #3B82F633', color: '#3B82F6', borderRadius: 12, padding: '12px 16px', fontSize: 13, lineHeight: 1.6, marginTop: 16 },

    // Map tab
    coordCard: { background: '#151928', border: '1px solid #252c43', borderRadius: 14, padding: '14px 16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 },
    coordRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E2438', paddingBottom: 8, flexWrap: 'wrap' as any, gap: 4 },
    coordLabel: { color: '#888', fontSize: 13, fontWeight: 600 },
    coordValue: { color: '#fff', fontSize: 14, fontFamily: 'monospace', fontWeight: 700 },
    mapFrame: { height: 300, borderRadius: 12, overflow: 'hidden', border: '1px solid #252c43', marginBottom: 14 },
    openMapsBtn: { display: 'block', textAlign: 'center' as any, background: '#1E2438', border: '1px solid #3B82F644', color: '#3B82F6', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, textDecoration: 'none', minHeight: 48, lineHeight: '24px' },

    // History tab
    refreshBtn: { background: 'none', border: '1px solid #252c43', color: '#888', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
    emptyState: { background: '#151928', border: '1px solid #252c43', borderRadius: 16, padding: '48px 20px', textAlign: 'center' as any, fontSize: 14 },
    alertCard: { background: '#151928', border: '1px solid #252c43', borderLeft: '4px solid', borderRadius: 12, padding: '14px 16px', marginBottom: 10 },
    alertTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as any },
    alertBadge: { padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800 },
    alertMsg: { color: '#ccc', fontSize: 14, lineHeight: 1.5, margin: '0 0 6px' },

    // Profile tab
    profileCard: { background: '#151928', border: '1px solid #252c43', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: isMobile ? 'center' : 'flex-start', marginBottom: 20, textAlign: isMobile ? 'center' : 'left' } as any,
    profileAvatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #FF3B3B, #b00000)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 },
    profileName: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
    profileEmail: { color: '#888', fontSize: 13, marginBottom: 8 },
    profileRole: { color: '#666', fontSize: 12, marginBottom: 2 },
    profileEmergBtn: { background: 'transparent', border: '1px solid', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'left' as any },
    statsRow: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 10 } as any,
    statCard: { background: '#151928', border: '1px solid #252c43', borderRadius: 14, padding: '16px', textAlign: 'center' as any },
    statNum: { fontSize: 28, fontWeight: 900, marginBottom: 4 },
    statLabel: { color: '#888', fontSize: 12, fontWeight: 600 },

    // Bottom strip
    strip: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0D1120', borderTop: '1px solid #1E2438', padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' as any, zIndex: 200 },
    stripBtn: { border: '1px solid', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' as any, cursor: 'pointer', background: 'transparent' },
};

/* ─── Modal Styles ───────────────────────────────────────────────────────── */
const m: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'overlayIn .25s ease' } as any,
    modal: { background: '#111827', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', animation: 'fadeIn .3s ease' } as any,

    modalHeader: { padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: '24px 24px 0 0', position: 'relative' },
    modalTitle: { fontSize: 20, fontWeight: 900, color: '#fff' },
    modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    closeBtn: { position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },

    modalBody: { padding: '20px' },

    loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' },
    spinner: { width: 48, height: 48, border: '4px solid #1E2438', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' } as any,
    loadingText: { color: '#fff', fontSize: 16, fontWeight: 700 },
    loadingHint: { color: '#888', fontSize: 13 },

    fallbackBanner: { background: '#F59E0B11', border: '1px solid #F59E0B33', color: '#F59E0B', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 },

    stationCard: { background: '#1E2438', borderRadius: 16, padding: '18px', display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
    stationIcon: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 },
    stationInfo: { flex: 1 },
    stationName: { fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4, lineHeight: 1.3 },
    stationAddr: { color: '#888', fontSize: 13, marginBottom: 8 },
    distanceBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 },

    phoneSection: { background: '#0A0E1A', borderRadius: 14, padding: '16px 20px', marginBottom: 20, textAlign: 'center' as any },
    phoneLabel: { color: '#888', fontSize: 12, fontWeight: 600, marginBottom: 4 },
    phoneNumber: { fontSize: 32, fontWeight: 900, letterSpacing: 2, fontFamily: 'monospace' },

    callBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', border: 'none', borderRadius: 16, padding: '18px', cursor: 'pointer', marginBottom: 12, animation: 'callPulse 2s ease-in-out infinite' } as any,
    callBtnLabel: { color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 2 },
    callBtnNum: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'monospace' },

    callingBox: { background: '#10B98111', border: '1px solid #10B98133', borderRadius: 14, padding: '24px', textAlign: 'center' as any, marginBottom: 12 },
    callingText: { color: '#10B981', fontWeight: 800, fontSize: 18, marginTop: 8 },
    callingHint: { color: '#888', fontSize: 13, marginTop: 6 },

    mapsLink: { display: 'block', textAlign: 'center' as any, color: '#3B82F6', fontSize: 13, textDecoration: 'none', fontWeight: 600, padding: '10px', borderRadius: 10, border: '1px solid #3B82F633', background: '#3B82F611' },
};
