import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    Platform, ScrollView, Alert,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '../services/location';
import api from '../services/api';

interface Zone { id: string; name: string; latitude: number; longitude: number; radius: number; }

export default function MapScreen({ navigation }: any) {
    const mapRef = useRef<MapView>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const loc = await getCurrentLocation();
                setLocation(loc);
                const zonesRes = await api.get('/api/geofence/zones').catch(() => ({ data: [] }));
                setZones(zonesRes.data);
            } catch { } finally { setLoading(false); }
        };

        init();
        startLocationTracking((loc) => {
            setLocation(loc);
            mapRef.current?.animateToRegion({
                latitude: loc.latitude, longitude: loc.longitude,
                latitudeDelta: 0.01, longitudeDelta: 0.01,
            }, 800);
        });

        return () => stopLocationTracking();
    }, []);

    const centerOnMe = () => {
        if (location) {
            mapRef.current?.animateToRegion({
                latitude: location.latitude, longitude: location.longitude,
                latitudeDelta: 0.01, longitudeDelta: 0.01,
            }, 700);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Location</Text>
                <TouchableOpacity onPress={centerOnMe}>
                    <Text style={styles.center}>⊙</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color="#FF3B3B" size="large" />
                    <Text style={styles.loadingText}>Acquiring GPS signal...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={{
                            latitude: location?.latitude ?? 20.5937,
                            longitude: location?.longitude ?? 78.9629,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        showsUserLocation
                        showsMyLocationButton={false}
                        mapType="standard"
                        customMapStyle={darkMapStyle}
                    >
                        {/* User position marker */}
                        {location && (
                            <Marker coordinate={location} title="You are here" pinColor="#FF3B3B" />
                        )}

                        {/* Geofence zone circles */}
                        {zones.map((zone) => (
                            <React.Fragment key={zone.id}>
                                <Circle
                                    center={{ latitude: zone.latitude, longitude: zone.longitude }}
                                    radius={zone.radius}
                                    strokeColor="#3B82F6"
                                    strokeWidth={2}
                                    fillColor="rgba(59,130,246,0.12)"
                                />
                                <Marker
                                    coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                                    title={zone.name}
                                    description={`Safety zone · ${zone.radius}m radius`}
                                    pinColor="#3B82F6"
                                />
                            </React.Fragment>
                        ))}
                    </MapView>

                    {/* Location info card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>📍</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Current GPS Coordinates</Text>
                                <Text style={styles.infoValue}>
                                    {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Unavailable'}
                                </Text>
                            </View>
                            <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
                        </View>

                        {zones.length > 0 && (
                            <View style={styles.zoneChips}>
                                <Text style={styles.zoneLabel}>Nearby Zones:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {zones.map((z) => (
                                        <TouchableOpacity
                                            key={z.id}
                                            style={styles.zoneChip}
                                            onPress={() => mapRef.current?.animateToRegion({
                                                latitude: z.latitude, longitude: z.longitude,
                                                latitudeDelta: (z.radius / 50000), longitudeDelta: (z.radius / 50000),
                                            }, 700)}>
                                            <Text style={styles.zoneChipText}>🔵 {z.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
        backgroundColor: '#0A0E1A', borderBottomWidth: 1, borderBottomColor: '#1A1F35',
        zIndex: 10,
    },
    back: { color: '#FF3B3B', fontSize: 16, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    center: { color: '#FF3B3B', fontSize: 24 },
    map: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText: { color: '#888', fontSize: 14 },
    infoCard: {
        backgroundColor: '#151928', padding: 16, borderTopWidth: 1, borderTopColor: '#1E2438',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    infoIcon: { fontSize: 22 },
    infoLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
    infoValue: { color: '#fff', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },
    liveBadge: { backgroundColor: '#FF3B3B22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FF3B3B55' },
    liveText: { color: '#FF3B3B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    zoneLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8 },
    zoneChips: {},
    zoneChip: { backgroundColor: '#1E2438', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: '#3B82F644' },
    zoneChipText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
});
