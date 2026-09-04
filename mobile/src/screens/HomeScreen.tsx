import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, Animated,
    StatusBar, ScrollView, Platform, Vibration,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { triggerSOS, callEmergencyService, SOSType } from '../services/sos';
import { startLocationTracking, stopLocationTracking } from '../services/location';

const EMERGENCY_SERVICES = [
    { type: 'POLICE' as SOSType, label: 'Police', emoji: '🚔', color: '#3B82F6' },
    { type: 'AMBULANCE' as SOSType, label: 'Ambulance', emoji: '🚑', color: '#10B981' },
    { type: 'FIRE' as SOSType, label: 'Fire', emoji: '🚒', color: '#F59E0B' },
];

export default function HomeScreen({ navigation }: any) {
    const { user } = useAuth();
    const [sosActive, setSosActive] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        startLocationTracking(setLocation);
        // Idle glow pulse on SOS button
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
        return () => stopLocationTracking();
    }, []);

    const handleSOS = async () => {
        if (sosActive) return;
        setSosActive(true);
        Vibration.vibrate([0, 500, 200, 500, 200, 500]);
        // Animate press
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.88, duration: 120, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();

        Alert.alert(
            '🚨 SEND SOS?',
            'This will alert emergency services and send your location.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => setSosActive(false) },
                {
                    text: 'SEND SOS', style: 'destructive',
                    onPress: async () => {
                        try {
                            await triggerSOS('SOS', `EMERGENCY! User ${user?.name} needs help!`);
                            Alert.alert('✅ SOS Sent', 'Emergency services have been alerted. Stay calm.');
                        } catch (e: any) {
                            Alert.alert('📱 SMS Fallback', e.message || 'SOS sent via SMS');
                        } finally {
                            setSosActive(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEmergencyCall = (type: SOSType, label: string) => {
        Alert.alert(`Call ${label}?`, `This will call ${label} directly.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: `Call ${label}`, onPress: () => callEmergencyService(type) },
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Welcome, {user?.name?.split(' ')[0]} 👋</Text>
                    <Text style={styles.headerSub}>
                        {location ? `📍 Location active` : '📍 Acquiring location...'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.profileIcon}>⚙️</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* SOS Button */}
                <View style={styles.sosContainer}>
                    <Animated.View style={[styles.sosGlow, { opacity: glowAnim }]} />
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.85}>
                            <Text style={styles.sosText}>SOS</Text>
                            <Text style={styles.sosSubText}>Hold to Alert</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.sosHint}>Press the button to send an emergency alert</Text>
                </View>

                {/* Emergency Services */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Emergency Call</Text>
                    <View style={styles.serviceRow}>
                        {EMERGENCY_SERVICES.map((s) => (
                            <TouchableOpacity
                                key={s.type}
                                style={[styles.serviceCard, { backgroundColor: s.color + '22', borderColor: s.color }]}
                                onPress={() => handleEmergencyCall(s.type, s.label)}>
                                <Text style={styles.serviceEmoji}>{s.emoji}</Text>
                                <Text style={[styles.serviceLabel, { color: s.color }]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Complaint')}>
                            <Text style={styles.actionIcon}>📝</Text>
                            <Text style={styles.actionLabel}>File Complaint</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Event')}>
                            <Text style={styles.actionIcon}>📍</Text>
                            <Text style={styles.actionLabel}>Event Mode</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Map')}>
                            <Text style={styles.actionIcon}>🗺️</Text>
                            <Text style={styles.actionLabel}>My Location</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Settings')}>
                            <Text style={styles.actionIcon}>👤</Text>
                            <Text style={styles.actionLabel}>Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Banner */}
                <View style={styles.statusBanner}>
                    <Text style={styles.statusDot}>🟢</Text>
                    <Text style={styles.statusText}>SafeLink is active and monitoring your safety</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#1A1F35',
    },
    greeting: { fontSize: 18, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: '#10B981', marginTop: 2 },
    profileBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1F35', borderRadius: 20 },
    profileIcon: { fontSize: 18 },
    scroll: { flexGrow: 1, padding: 20, paddingBottom: 32 },
    sosContainer: { alignItems: 'center', marginVertical: 28, position: 'relative' },
    sosGlow: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#FF3B3B', top: -10,
    },
    sosButton: {
        width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF3B3B',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#FF3B3B', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 30, elevation: 20,
        borderWidth: 4, borderColor: '#FF6B6B',
    },
    sosText: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 4 },
    sosSubText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    sosHint: { color: '#555', fontSize: 13, marginTop: 16, textAlign: 'center' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
    serviceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    serviceCard: {
        flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5,
    },
    serviceEmoji: { fontSize: 28 },
    serviceLabel: { fontSize: 12, fontWeight: '700', marginTop: 6 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionCard: {
        width: '47%', backgroundColor: '#151928', borderRadius: 14, padding: 16,
        alignItems: 'center', borderWidth: 1, borderColor: '#1E2438',
    },
    actionIcon: { fontSize: 28 },
    actionLabel: { fontSize: 13, color: '#ccc', marginTop: 8, fontWeight: '600', textAlign: 'center' },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D2218',
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#0D4A2A',
    },
    statusDot: { fontSize: 14, marginRight: 10 },
    statusText: { color: '#10B981', fontSize: 13, flex: 1 },
});
