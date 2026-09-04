import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, FlatList,
    Alert, ActivityIndicator, Platform,
} from 'react-native';
import api from '../services/api';
import { getCurrentLocation, getDistanceMeters } from '../services/location';

interface Zone { id: string; name: string; latitude: number; longitude: number; radius: number; type: string; }

export default function EventScreen({ navigation }: any) {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [zonesRes, loc] = await Promise.all([
                api.get('/api/geofence/zones'),
                getCurrentLocation().catch(() => null),
            ]);
            setZones(zonesRes.data);
            setUserLoc(loc);
        } catch { } finally { setLoading(false); }
    };

    const contactSecurity = async (zone: Zone) => {
        if (!userLoc) { Alert.alert('Error', 'Could not get your location'); return; }
        Alert.alert(`Contact Security – ${zone.name}`, 'Send your location to the security control room?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Contact Now', onPress: async () => {
                    try {
                        await api.post('/api/event/contact', {
                            zoneId: zone.id, message: 'User requests security assistance',
                            latitude: userLoc.latitude, longitude: userLoc.longitude,
                        });
                        Alert.alert('✅ Sent', 'Security has been notified with your location.');
                    } catch { Alert.alert('Error', 'Failed to contact security'); }
                },
            },
        ]);
    };

    const getDistance = (zone: Zone) => {
        if (!userLoc) return null;
        const d = getDistanceMeters(userLoc.latitude, userLoc.longitude, zone.latitude, zone.longitude);
        return d < 1000 ? `${Math.round(d)}m away` : `${(d / 1000).toFixed(1)}km away`;
    };

    const isInZone = (zone: Zone) => {
        if (!userLoc) return false;
        return getDistanceMeters(userLoc.latitude, userLoc.longitude, zone.latitude, zone.longitude) <= zone.radius;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>Event Mode</Text>
                <TouchableOpacity onPress={loadData}><Text style={styles.refresh}>↻</Text></TouchableOpacity>
            </View>

            <View style={styles.banner}>
                <Text style={styles.bannerIcon}>🎭</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Geofenced Safety Zones</Text>
                    <Text style={styles.bannerSub}>Contact event security instantly from within a zone</Text>
                </View>
            </View>

            {loading ? <ActivityIndicator color="#FF3B3B" style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={zones}
                    contentContainerStyle={{ padding: 16 }}
                    keyExtractor={(z) => z.id}
                    ListEmptyComponent={<Text style={styles.empty}>No active geofence zones found.</Text>}
                    renderItem={({ item: zone }) => {
                        const inside = isInZone(zone);
                        return (
                            <View style={[styles.zoneCard, inside && styles.zoneCardActive]}>
                                <View style={styles.zoneRow}>
                                    <View style={[styles.zoneDot, { backgroundColor: inside ? '#10B981' : '#555' }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.zoneName}>{zone.name}</Text>
                                        <Text style={styles.zoneSub}>
                                            {inside ? '✅ You are inside this zone' : getDistance(zone) || 'Unknown distance'}
                                            {' · '}{zone.type} · r={zone.radius}m
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={[styles.contactBtn, inside && styles.contactBtnActive]} onPress={() => contactSecurity(zone)}>
                                        <Text style={styles.contactBtnText}>{inside ? '📢 Alert' : '📡 Contact'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: '#1A1F35' },
    back: { color: '#FF3B3B', fontSize: 16, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    refresh: { color: '#FF3B3B', fontSize: 20, fontWeight: '700' },
    banner: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#151928', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E2438', gap: 12 },
    bannerIcon: { fontSize: 32 },
    bannerTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
    bannerSub: { color: '#888', fontSize: 12, marginTop: 4 },
    zoneCard: { backgroundColor: '#151928', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E2438' },
    zoneCardActive: { borderColor: '#10B981', backgroundColor: '#0D2218' },
    zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    zoneDot: { width: 10, height: 10, borderRadius: 5 },
    zoneName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    zoneSub: { color: '#888', fontSize: 12, marginTop: 4 },
    contactBtn: { backgroundColor: '#1E2438', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    contactBtnActive: { backgroundColor: '#FF3B3B' },
    contactBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    empty: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
