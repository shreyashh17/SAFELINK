import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import api from './api';
import UserPortal from './UserPortal';
import LoginFlow from './LoginFlow';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });

/* ── inject keyframes once ───────────────────────────────────────────────── */
const kf = document.createElement('style');
kf.textContent = `
@keyframes sosPing { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.06)} }
@keyframes slideIn { from{transform:translateX(-16px);opacity:0} to{transform:none;opacity:1} }
`;
if (!document.head.contains(kf)) document.head.appendChild(kf);

const PIE_COLORS = ['#FF3B3B', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const NAV = [
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'alerts', icon: '🚨', label: 'Live Alerts' },
    { id: 'map', icon: '🗺️', label: 'User Map' },
    { id: 'complaints', icon: '📝', label: 'Complaints' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'geofences', icon: '🔵', label: 'Geofences' },
    { id: 'calllogs', icon: '📞', label: 'Call Logs' },
    { id: 'broadcast', icon: '📢', label: 'Send Alert' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   BROADCAST PAGE — Admin sends government alert to all users
───────────────────────────────────────────────────────────────────────────── */
function BroadcastPage({ broadcasts }: { broadcasts: any[] }) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('warning');
    const [area, setArea] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState('');

    const severityColor: Record<string, string> = {
        info: '#3B82F6', warning: '#F59E0B', critical: '#FF3B3B',
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) return;
        setSending(true); setResult('');
        try {
            await api.post('/api/broadcast', { title, message, severity, area: area || 'All Areas' });
            setResult('✅ Alert broadcast to all users!');
            setTitle(''); setMessage(''); setArea('');
        } catch (e: any) {
            setResult('❌ Failed: ' + (e?.response?.data?.error || 'Unknown error'));
        }
        setSending(false);
        setTimeout(() => setResult(''), 5000);
    };

    return (
        <div>
            <div className="section">
                <div className="section-header"><span className="section-title">📢 Send Government Alert to All Users</span></div>
                <div className="card card-body">
                    <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                        This alert will be instantly pushed to every logged-in user via WebSocket and stored for users who log in later.
                    </p>
                    {result && (
                        <div style={{ background: result.startsWith('✅') ? '#10B98122' : '#FF3B3B22', border: `1px solid ${result.startsWith('✅') ? '#10B98144' : '#FF3B3B44'}`, color: result.startsWith('✅') ? '#10B981' : '#FF3B3B', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{result}</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ color: '#888', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Alert Title *</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Flood Warning — Low-lying Areas" style={{ width: '100%', background: '#1E2438', border: '1px solid #252c43', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 15 }} />
                        </div>
                        <div>
                            <label style={{ color: '#888', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Message *</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Detailed instructions for citizens…" style={{ width: '100%', background: '#1E2438', border: '1px solid #252c43', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14, resize: 'vertical', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: '#888', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Severity</label>
                                <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ width: '100%', background: '#1E2438', border: '1px solid #252c43', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14 }}>
                                    <option value="info">ℹ️ Info</option>
                                    <option value="warning">⚠️ Warning</option>
                                    <option value="critical">🚨 Critical</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ color: '#888', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Area (optional)</label>
                                <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Mumbai, All Areas" style={{ width: '100%', background: '#1E2438', border: '1px solid #252c43', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14 }} />
                            </div>
                        </div>
                        <button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()} style={{ background: severityColor[severity], border: 'none', color: '#fff', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: (sending || !title.trim() || !message.trim()) ? 0.5 : 1 }}>
                            {sending ? '📡 Broadcasting…' : '📢 Broadcast Alert to All Users'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="section">
                <div className="section-header"><span className="section-title">📋 Recent Broadcasts ({broadcasts.length})</span></div>
                <div className="card">
                    {broadcasts.length === 0
                        ? <div className="empty"><div className="empty-icon">📢</div>No broadcasts sent yet</div>
                        : broadcasts.map((b, i) => (
                            <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: (severityColor as any)[b.severity] || '#888', marginTop: 5, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.title}</div>
                                    <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5, marginBottom: 6 }}>{b.message}</div>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as any }}>
                                        <span className={`badge badge-${b.severity === 'critical' ? 'red' : b.severity === 'warning' ? 'yellow' : 'blue'}`}>{b.severity}</span>
                                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>📍 {b.area}</span>
                                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(b.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANALYTICS PAGE
───────────────────────────────────────────────────────────────────────────── */
function AnalyticsPage({ stats }: { stats: any }) {
    if (!stats) return <div className="spinner" />;
    return (
        <div>
            {/* KPI Row */}
            <div className="stats-row">
                <div className="stat-card stat-red"><div className="stat-icon">🚨</div><div className="stat-value">{stats.totalAlerts}</div><div className="stat-label">Total Alerts</div></div>
                <div className="stat-card stat-green"><div className="stat-icon">👥</div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Registered Users</div></div>
                <div className="stat-card stat-blue"><div className="stat-icon">📝</div><div className="stat-value">{stats.totalComplaints}</div><div className="stat-label">Complaints</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">📞</div><div className="stat-value">{stats.totalCallLogs}</div><div className="stat-label">Emergency Calls Logged</div></div>
            </div>

            {/* Second KPI row */}
            <div className="stats-row" style={{ marginTop: -12 }}>
                <div className="stat-card stat-red"><div className="stat-icon">🔴</div><div className="stat-value">{stats.activeAlerts}</div><div className="stat-label">Active SOS</div></div>
                <div className="stat-card stat-green"><div className="stat-icon">✅</div><div className="stat-value">{stats.resolvedAlerts}</div><div className="stat-label">Resolved</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">⚠️</div><div className="stat-value">{stats.distressComplaints}</div><div className="stat-label">Distress Detected</div></div>
                <div className="stat-card stat-blue"><div className="stat-icon">📈</div><div className="stat-value">{stats.totalAlerts > 0 ? Math.round((stats.resolvedAlerts / stats.totalAlerts) * 100) : 0}%</div><div className="stat-label">Resolution Rate</div></div>
            </div>

            <div className="two-col">
                {/* Alert Trend */}
                <div className="section">
                    <div className="section-header"><span className="section-title">📈 Alert Trend (Last 7 Days)</span></div>
                    <div className="card card-body">
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={stats.alertsByDay}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#252c43" />
                                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: '#151928', border: '1px solid #252c43', borderRadius: 8 }} />
                                <Line type="monotone" dataKey="count" stroke="#FF3B3B" strokeWidth={2} dot={{ fill: '#FF3B3B', r: 4 }} name="Alerts" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Complaint Categories */}
                <div className="section">
                    <div className="section-header"><span className="section-title">🥧 Complaint Categories</span></div>
                    <div className="card card-body">
                        {stats.complaintByCategory.length === 0
                            ? <div className="empty"><div className="empty-icon">📭</div>No complaints yet</div>
                            : <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={stats.complaintByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {stats.complaintByCategory.map((_: any, i: number) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#151928', border: '1px solid #252c43', borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

                {/* Calls by Service */}
                <div className="section">
                    <div className="section-header"><span className="section-title">📞 Emergency Calls by Service</span></div>
                    <div className="card card-body">
                        {stats.callsByService.length === 0
                            ? <div className="empty"><div className="empty-icon">📞</div>No calls logged yet</div>
                            : <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={stats.callsByService}>
                                    <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#888', fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ background: '#151928', border: '1px solid #252c43', borderRadius: 8 }} />
                                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        }
                    </div>
                </div>

                {/* Summary card */}
                <div className="section">
                    <div className="section-header"><span className="section-title">🔢 Quick Summary</span></div>
                    <div className="card card-body">
                        {[
                            { label: 'Total Registered Users', value: stats.totalUsers, color: '#10B981' },
                            { label: 'Total SOS Alerts', value: stats.totalAlerts, color: '#FF3B3B' },
                            { label: 'Currently Active SOS', value: stats.activeAlerts, color: '#FF3B3B' },
                            { label: 'Total Complaints', value: stats.totalComplaints, color: '#3B82F6' },
                            { label: 'Distress Complaints', value: stats.distressComplaints, color: '#F59E0B' },
                            { label: 'Emergency Calls Logged', value: stats.totalCallLogs, color: '#8B5CF6' },
                        ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1E2438' }}>
                                <span style={{ color: '#aaa', fontSize: 14 }}>{row.label}</span>
                                <span style={{ fontWeight: 800, color: row.color, fontSize: 18 }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE ALERTS PAGE
───────────────────────────────────────────────────────────────────────────── */
function AlertsPage({ alerts, onResolve }: { alerts: any[]; onResolve: (id: string) => void }) {
    const active = alerts.filter(a => a.status === 'active').length;
    return (
        <div>
            <div className="stats-row">
                <div className="stat-card stat-red"><div className="stat-icon">🚨</div><div className="stat-value">{active}</div><div className="stat-label">Active SOS Alerts</div></div>
                <div className="stat-card stat-green"><div className="stat-icon">✅</div><div className="stat-value">{alerts.filter(a => a.status === 'resolved').length}</div><div className="stat-label">Resolved</div></div>
                <div className="stat-card stat-blue"><div className="stat-icon">📊</div><div className="stat-value">{alerts.length}</div><div className="stat-label">Total Alerts</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">⏱️</div><div className="stat-value">~2m</div><div className="stat-label">Avg Response Time</div></div>
            </div>
            {active > 0 && (
                <div style={{ background: '#FF3B3B', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, animation: 'sosPing 1.5s ease-in-out infinite' }}>
                    <span style={{ fontSize: 28 }}>🚨</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{active} ACTIVE SOS ALERT{active > 1 ? 'S' : ''}</div>
                        <div style={{ opacity: 0.85, fontSize: 13 }}>Immediate response required — scroll down to resolve</div>
                    </div>
                </div>
            )}
            <div className="section">
                <div className="section-header">
                    <span className="section-title">Real-Time Emergency Alerts</span>
                    <span className="section-badge">{alerts.length} total</span>
                </div>
                <div className="card">
                    {alerts.length === 0 ? <div className="empty"><div className="empty-icon">✅</div>No active alerts</div> : alerts.map((a) => (
                        <div className="alert-item" key={a.id || a.timestamp} style={{ animation: 'slideIn .3s ease' }}>
                            <div className={`alert-dot ${a.type === 'SOS' ? 'sos' : a.status}`} />
                            <div className="alert-body">
                                <div className="alert-type">
                                    <span className={`badge badge-${a.type === 'SOS' ? 'red' : 'blue'}`}>{a.type}</span>
                                    {' '}{a.message}
                                </div>
                                <div className="alert-meta">
                                    UID: {a.uid} · 📍 {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                                    {' · '}
                                    <a href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>View on Map ↗</a>
                                </div>
                                <div className="alert-time">{new Date(a.timestamp).toLocaleString()}</div>
                            </div>
                            {a.status === 'active' && (
                                <button className="btn btn-outline" style={{ width: 'auto', fontSize: 12, padding: '6px 14px' }} onClick={() => onResolve(a.id)}>
                                    ✅ Resolve
                                </button>
                            )}
                            <span className={`badge badge-${a.status === 'active' ? 'red' : 'gray'}`}>{a.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAP PAGE
───────────────────────────────────────────────────────────────────────────── */
function MapPage({ locations, alerts, zones }: { locations: any[]; alerts: any[]; zones: any[] }) {
    const center: [number, number] = locations[0] ? [locations[0].latitude, locations[0].longitude] : [20.5937, 78.9629];
    return (
        <div>
            <div className="stats-row">
                <div className="stat-card stat-green"><div className="stat-icon">📍</div><div className="stat-value">{locations.length}</div><div className="stat-label">Active Users</div></div>
                <div className="stat-card stat-red"><div className="stat-icon">🚨</div><div className="stat-value">{alerts.filter(a => a.status === 'active').length}</div><div className="stat-label">Open Alerts</div></div>
                <div className="stat-card stat-blue"><div className="stat-icon">🔵</div><div className="stat-value">{zones.length}</div><div className="stat-label">Geofence Zones</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">🌐</div><div className="stat-value">Live</div><div className="stat-label">Map Feed</div></div>
            </div>
            <div className="section">
                <div className="section-header"><span className="section-title">Live User Map</span><span className="section-badge">Auto-updates</span></div>
                <div className="card">
                    <div className="map-container">
                        <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CartoDB" />
                            {locations.map((loc, i) => (
                                <Marker key={i} position={[loc.latitude, loc.longitude]}>
                                    <Popup><b>User:</b> {loc.uid}<br /><b>Updated:</b> {new Date(loc.updatedAt).toLocaleTimeString()}</Popup>
                                </Marker>
                            ))}
                            {alerts.filter(a => a.status === 'active').map((a, i) => (
                                <Marker key={`alert-${i}`} position={[a.latitude, a.longitude]} icon={redIcon}>
                                    <Popup><b>🚨 {a.type}</b><br />{a.message}<br />{new Date(a.timestamp).toLocaleString()}</Popup>
                                </Marker>
                            ))}
                            {zones.map((z, i) => (
                                <Circle key={i} center={[z.latitude, z.longitude]} radius={z.radius} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.1 }}>
                                    <Popup><b>{z.name}</b><br />Type: {z.type}<br />Radius: {z.radius}m</Popup>
                                </Circle>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPLAINTS PAGE
───────────────────────────────────────────────────────────────────────────── */
function ComplaintsPage({ complaints }: { complaints: any[] }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const filtered = complaints
        .filter(c => filter === 'all' ? true : (filter === 'distress' ? c.distress?.isDistress : c.status === filter))
        .filter(c => !search || c.text?.toLowerCase().includes(search.toLowerCase()) || c.uid?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card stat-blue"><div className="stat-icon">📝</div><div className="stat-value">{complaints.length}</div><div className="stat-label">Total Complaints</div></div>
                <div className="stat-card stat-red"><div className="stat-icon">⚠️</div><div className="stat-value">{complaints.filter(c => c.distress?.isDistress).length}</div><div className="stat-label">Distress Detected</div></div>
                <div className="stat-card stat-green"><div className="stat-icon">✅</div><div className="stat-value">{complaints.filter(c => c.status === 'resolved').length}</div><div className="stat-label">Resolved</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">🕐</div><div className="stat-value">{complaints.filter(c => c.status === 'open').length}</div><div className="stat-label">Open</div></div>
            </div>
            <div className="section">
                <div className="section-header">
                    <span className="section-title">Complaint Logs</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, width: 160 }} />
                        {['all', 'distress', 'open', 'resolved'].map(f => (
                            <button key={f} className={`btn ${filter === f ? 'btn-red' : 'btn-outline'}`} style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => setFilter(f)}>
                                {f === 'distress' ? '⚠️ Distress' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="card">
                    {filtered.length === 0 ? <div className="empty"><div className="empty-icon">📭</div>No complaints found</div> : filtered.map((c, i) => (
                        <div className="complaint-item" key={i}>
                            <div className="complaint-header">
                                <span className={`badge badge-${c.distress?.isDistress ? 'red' : 'blue'}`}>{c.category || 'General'}</span>
                                <span className={`badge badge-${c.status === 'open' ? 'yellow' : 'green'}`}>{c.status || 'open'}</span>
                                <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="complaint-text">{c.text}</div>
                            {c.distress?.isDistress && <div className="complaint-kw">⚠️ Distress detected · Keywords: {c.distress.matchedKeywords?.join(', ')}</div>}
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                                📍 {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)} · UID: {c.uid}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   USERS PAGE
───────────────────────────────────────────────────────────────────────────── */
function UsersPage({ users }: { users: any[] }) {
    const [search, setSearch] = useState('');
    const filtered = users.filter(u =>
        !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    );
    return (
        <div>
            <div className="stats-row">
                <div className="stat-card stat-blue"><div className="stat-icon">👥</div><div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card stat-red"><div className="stat-icon">🛡️</div><div className="stat-value">{users.filter(u => u.role === 'admin').length}</div><div className="stat-label">Admins</div></div>
                <div className="stat-card stat-green"><div className="stat-icon">👤</div><div className="stat-value">{users.filter(u => u.role !== 'admin').length}</div><div className="stat-label">Citizens</div></div>
                <div className="stat-card stat-yellow"><div className="stat-icon">📅</div><div className="stat-value">{users.filter(u => { const d = new Date(u.createdAt); const now = new Date(); return now.getTime() - d.getTime() < 7 * 86400000; }).length}</div><div className="stat-label">New This Week</div></div>
            </div>
            <div className="section">
                <div className="section-header">
                    <span className="section-title">Registered Users</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, width: 260 }} />
                </div>
                <div className="card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0
                                    ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No users found</td></tr>
                                    : filtered.map((u, i) => (
                                        <tr key={i}>
                                            <td><strong>{u.name || '—'}</strong></td>
                                            <td style={{ color: 'var(--muted)' }}>{u.email}</td>
                                            <td>
                                                <span className={`badge badge-${u.role === 'admin' ? 'red' : 'blue'}`}>
                                                    {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GEOFENCES PAGE
───────────────────────────────────────────────────────────────────────────── */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
    return null;
}

function GeofencesPage({ zones, onZoneCreated }: { zones: any[]; onZoneCreated: () => void }) {
    const [creating, setCreating] = useState(false);
    const [pendingLatLng, setPendingLatLng] = useState<[number, number] | null>(null);
    const [formName, setFormName] = useState('');
    const [formRadius, setFormRadius] = useState('500');
    const [formType, setFormType] = useState('event');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const handleMapClick = (lat: number, lng: number) => {
        if (!creating) return;
        setPendingLatLng([lat, lng]);
    };

    const saveZone = async () => {
        if (!pendingLatLng || !formName) return;
        setSaving(true);
        try {
            await api.post('/api/geofence/zones', {
                name: formName, latitude: pendingLatLng[0], longitude: pendingLatLng[1],
                radius: Number(formRadius), type: formType,
            });
            setMsg('✅ Zone created!');
            setCreating(false); setPendingLatLng(null); setFormName(''); setFormRadius('500');
            onZoneCreated();
            setTimeout(() => setMsg(''), 3000);
        } catch (e: any) {
            setMsg('❌ ' + (e?.response?.data?.error || 'Failed to create zone'));
        }
        setSaving(false);
    };

    return (
        <div>
            <div className="section">
                <div className="section-header">
                    <span className="section-title">🔵 Geofence Zones ({zones.length})</span>
                    <button className={`btn ${creating ? 'btn-red' : 'btn-outline'}`} style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }} onClick={() => { setCreating(!creating); setPendingLatLng(null); }}>
                        {creating ? '✕ Cancel' : '+ Create Zone'}
                    </button>
                </div>

                {msg && <div style={{ background: msg.startsWith('✅') ? '#10B98122' : '#FF3B3B22', border: `1px solid ${msg.startsWith('✅') ? '#10B98144' : '#FF3B3B44'}`, color: msg.startsWith('✅') ? '#10B981' : '#FF3B3B', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{msg}</div>}

                {creating && (
                    <div style={{ background: '#151928', border: '1px solid #3B82F644', borderRadius: 14, padding: '20px', marginBottom: 16 }}>
                        <div style={{ color: '#3B82F6', fontWeight: 700, marginBottom: 12 }}>📍 Click on the map to place the zone center</div>
                        {pendingLatLng && (
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div>
                                    <label style={{ color: '#888', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Zone Name</label>
                                    <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. City Centre" style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }} />
                                </div>
                                <div>
                                    <label style={{ color: '#888', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Radius (m)</label>
                                    <input type="number" value={formRadius} onChange={e => setFormRadius(e.target.value)} style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, width: 100 }} />
                                </div>
                                <div>
                                    <label style={{ color: '#888', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
                                    <select value={formType} onChange={e => setFormType(e.target.value)} style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}>
                                        <option value="event">Event</option>
                                        <option value="restricted">Restricted</option>
                                        <option value="safe">Safe Zone</option>
                                        <option value="disaster">Disaster Zone</option>
                                    </select>
                                </div>
                                <button className="btn btn-red" style={{ width: 'auto', padding: '8px 20px' }} onClick={saveZone} disabled={saving || !formName}>
                                    {saving ? 'Saving…' : '💾 Save Zone'}
                                </button>
                            </div>
                        )}
                        {pendingLatLng && <div style={{ color: '#888', fontSize: 13, marginTop: 10 }}>📌 Selected: {pendingLatLng[0].toFixed(5)}, {pendingLatLng[1].toFixed(5)}</div>}
                    </div>
                )}

                <div className="card">
                    <div className="map-container" style={{ height: 420 }}>
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CartoDB" />
                            <MapClickHandler onMapClick={handleMapClick} />
                            {pendingLatLng && <Circle center={pendingLatLng} radius={Number(formRadius)} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.2 }} />}
                            {zones.map((z, i) => (
                                <Circle key={i} center={[z.latitude, z.longitude]} radius={z.radius} pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.1 }}>
                                    <Popup><b>{z.name}</b><br />Type: {z.type}<br />Radius: {z.radius}m</Popup>
                                </Circle>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                {zones.length > 0 && (
                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Name</th><th>Type</th><th>Radius</th><th>Coordinates</th><th>Created</th></tr></thead>
                                <tbody>
                                    {zones.map((z, i) => (
                                        <tr key={i}>
                                            <td><strong>{z.name}</strong></td>
                                            <td><span className="badge badge-blue">{z.type}</span></td>
                                            <td>{z.radius}m</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{z.latitude?.toFixed(4)}, {z.longitude?.toFixed(4)}</td>
                                            <td style={{ color: 'var(--muted)', fontSize: 13 }}>{z.createdAt ? new Date(z.createdAt).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CALL LOGS PAGE
───────────────────────────────────────────────────────────────────────────── */
function CallLogsPage({ callLogs }: { callLogs: any[] }) {
    const [search, setSearch] = useState('');
    const filtered = callLogs.filter(c => !search || c.serviceType?.toLowerCase().includes(search.toLowerCase()) || c.stationName?.toLowerCase().includes(search.toLowerCase()) || c.uid?.toLowerCase().includes(search.toLowerCase()));
    const serviceCounts: Record<string, number> = {};
    callLogs.forEach(c => { serviceCounts[c.serviceType] = (serviceCounts[c.serviceType] || 0) + 1; });

    return (
        <div>
            <div className="stats-row">
                <div className="stat-card stat-blue"><div className="stat-icon">📞</div><div className="stat-value">{callLogs.length}</div><div className="stat-label">Total Calls Logged</div></div>
                {Object.entries(serviceCounts).slice(0, 3).map(([svc, cnt]) => (
                    <div key={svc} className="stat-card stat-green"><div className="stat-icon">🆘</div><div className="stat-value">{cnt}</div><div className="stat-label">{svc}</div></div>
                ))}
            </div>
            <div className="section">
                <div className="section-header">
                    <span className="section-title">Emergency Call Logs</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: '#1E2438', border: '1px solid #252c43', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, width: 220 }} />
                </div>
                <div className="card">
                    {callLogs.length === 0 ? <div className="empty"><div className="empty-icon">📞</div>No call logs yet</div>
                        : <div className="table-wrap">
                            <table>
                                <thead><tr><th>User</th><th>Service</th><th>Station Called</th><th>Phone</th><th>Distance</th><th>Time</th></tr></thead>
                                <tbody>
                                    {filtered.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.uid}</td>
                                            <td><span className="badge badge-blue">{c.serviceType}</span></td>
                                            <td><strong>{c.stationName || '—'}</strong></td>
                                            <td style={{ fontFamily: 'monospace', color: '#10B981' }}>{c.stationPhone || '—'}</td>
                                            <td>{c.distance > 0 ? `${(c.distance / 1000).toFixed(1)} km` : 'National'}</td>
                                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(c.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string>(localStorage.getItem('role') || 'user');
    const [userInfo, setUserInfo] = useState<any>(() => {
        try { return JSON.parse(localStorage.getItem('userInfo') || '{}'); } catch { return {}; }
    });
    const [page, setPage] = useState('analytics');
    const [alerts, setAlerts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);


    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sosAlarm, setSosAlarm] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    /* ── Play SOS alarm sound ─────────────────────────────────────────────── */
    const playAlarm = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch { }
    }, []);

    const fetchAll = useCallback(async () => {
        if (!token || role !== 'admin') return;   // never call admin APIs for regular users
        setLoading(true);
        try {
            const [a, l, c, z, , u, s, cl, br] = await Promise.all([
                api.get('/api/admin/alerts').then(r => r.data).catch(() => []),
                api.get('/api/admin/locations').then(r => r.data).catch(() => []),
                api.get('/api/admin/complaints').then(r => r.data).catch(() => []),
                api.get('/api/geofence/zones').then(r => r.data).catch(() => []),
                api.get('/api/admin/crowd-density').then(r => r.data).catch(() => []),
                api.get('/api/admin/users').then(r => r.data).catch(() => []),
                api.get('/api/admin/stats').then(r => r.data).catch(() => null),
                api.get('/api/admin/call-logs').then(r => r.data).catch(() => []),
                api.get('/api/broadcast').then(r => r.data).catch(() => []),
            ]);
            setAlerts(a); setLocations(l); setComplaints(c); setZones(z);
            setUsers(u); setStats(s); setCallLogs(cl); setBroadcasts(br);
        } finally { setLoading(false); }
    }, [token, role]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // WebSocket — admin-only real-time updates
    useEffect(() => {
        if (!token || role !== 'admin') return;
        let alive = true;
        const wsUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000')
            .replace(/^https/, 'wss').replace(/^http/, 'ws');
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => { if (alive) setWsConnected(true); };
        ws.onclose = () => { if (alive) setWsConnected(false); };
        ws.onerror = () => { /* suppress console noise in dev */ };
        ws.onmessage = (evt) => {
            if (!alive) return;
            try {
                const { type, payload } = JSON.parse(evt.data);
                if (type === 'SOS_ALERT') {
                    setAlerts(prev => [payload, ...prev]);
                    setSosAlarm(true);
                    playAlarm();
                    setTimeout(() => setSosAlarm(false), 8000);
                }
                if (type === 'LOCATION_UPDATE') setLocations(prev => { const f = prev.filter(l => l.uid !== payload.uid); return [payload, ...f]; });
                if (type === 'NEW_COMPLAINT') setComplaints(prev => [payload, ...prev]);
                if (type === 'EMERGENCY_CALL') setCallLogs(prev => [payload, ...prev]);
                if (type === 'GOV_ALERT') setBroadcasts(prev => [payload, ...prev]);
            } catch { /* ignore malformed messages */ }
        };
        return () => { alive = false; ws.close(); };
    }, [token, role, playAlarm]);

    const handleResolve = async (id: string) => {
        await api.patch(`/api/sos/${id}/resolve`);
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
        setStats((s: any) => s ? { ...s, activeAlerts: Math.max(0, s.activeAlerts - 1), resolvedAlerts: s.resolvedAlerts + 1 } : s);
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('userInfo');
        setToken(null); setRole('user'); setUserInfo({});
    };

    const handleLogin = (newToken: string, newRole: string, newUserInfo: any) => {
        setToken(newToken); setRole(newRole); setUserInfo(newUserInfo);
    };

    if (!token) return <LoginFlow onLogin={handleLogin} />;
    if (role !== 'admin') return <UserPortal userInfo={userInfo} onLogout={handleLogout} />;

    const titles: Record<string, string> = {
        analytics: 'Analytics Overview', alerts: 'Live Alerts', map: 'User Map',
        complaints: 'Complaints', users: 'Users', geofences: 'Geofence Zones',
        calllogs: 'Emergency Call Logs', broadcast: 'Send Alert to Citizens',
    };

    return (
        <div className="layout">
            {/* SOS Banner */}
            {sosAlarm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#FF3B3B', zIndex: 9999, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, animation: 'sosPing 1s ease-in-out infinite' }}>
                    <span style={{ fontSize: 32 }}>🚨</span>
                    <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>NEW SOS ALERT RECEIVED</span>
                    <button style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => { setSosAlarm(false); setPage('alerts'); }}>
                        View Alert →
                    </button>
                </div>
            )}

            {/* Mobile Sidebar Overlay */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={sosAlarm ? { top: 50 } : {}}>
                <div className="sidebar-logo">
                    <img src="/logo1.png" alt="SafeLink" className="sidebar-logo-icon" style={{ width: 40, height: 40, objectFit: 'contain', background: 'none' }} />
                    <div className="sidebar-logo-name">SafeLink</div>
                    <div className="sidebar-logo-sub">Admin Dashboard</div>
                </div>
                <nav className="sidebar-nav">
                    {NAV.map(n => (
                        <div key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => { setPage(n.id); setSidebarOpen(false); }}>
                            <span className="nav-icon">{n.icon}</span>{n.label}
                            {n.id === 'alerts' && alerts.filter(a => a.status === 'active').length > 0 && (
                                <span style={{ marginLeft: 'auto', background: '#FF3B3B', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                                    {alerts.filter(a => a.status === 'active').length}
                                </span>
                            )}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Logged in as Admin</div>
                    <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13, minHeight: 40 }} onClick={handleLogout}>🚪 Logout</button>
                </div>
            </aside>

            {/* Main */}
            <main className="main" style={sosAlarm ? { marginTop: 50 } : {}}>
                <div className="topbar">
                    <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">☰</button>
                    <div className="topbar-title">{titles[page]}</div>
                    <div className="topbar-right">
                        <div className="ws-badge">
                            <div className="ws-dot" style={{ background: wsConnected ? 'var(--green)' : 'var(--red)' }} />
                            <span>{wsConnected ? 'Live' : '...'}</span>
                        </div>
                        <div className="admin-badge">ADMIN</div>
                        <button className="btn btn-outline topbar-refresh" style={{ width: 'auto', padding: '8px 12px', fontSize: 12, minHeight: 36 }} onClick={fetchAll}>↻</button>
                    </div>
                </div>
                <div className="content">
                    {loading && page !== 'map' && page !== 'geofences' ? <div className="spinner" /> : (
                        <>
                            {page === 'analytics' && <AnalyticsPage stats={stats} />}
                            {page === 'alerts' && <AlertsPage alerts={alerts} onResolve={handleResolve} />}
                            {page === 'map' && <MapPage locations={locations} alerts={alerts} zones={zones} />}
                            {page === 'complaints' && <ComplaintsPage complaints={complaints} />}
                            {page === 'users' && <UsersPage users={users} />}
                            {page === 'geofences' && <GeofencesPage zones={zones} onZoneCreated={fetchAll} />}
                            {page === 'calllogs' && <CallLogsPage callLogs={callLogs} />}
                            {page === 'broadcast' && <BroadcastPage broadcasts={broadcasts} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
