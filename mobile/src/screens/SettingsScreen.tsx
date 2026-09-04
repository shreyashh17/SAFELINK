import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }: any) {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    const items = [
        { icon: '📝', label: 'My Complaints', onPress: () => navigation.navigate('Complaint') },
        { icon: '📍', label: 'Event Mode & Geofencing', onPress: () => navigation.navigate('Event') },
        { icon: '📞', label: 'Emergency Contacts', onPress: () => Alert.alert('Info', 'Emergency contacts management coming soon') },
        { icon: '🔔', label: 'Notifications', onPress: () => Alert.alert('Info', 'Notifications settings coming soon') },
        { icon: '🔒', label: 'Privacy & Security', onPress: () => Alert.alert('Info', 'End-to-end encrypted communication enabled') },
        { icon: '📖', label: 'About SafeLink', onPress: () => Alert.alert('SafeLink v1.0', 'Real-time emergency help & disaster response system') },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text></View>
                <View>
                    <Text style={styles.profileName}>{user?.name}</Text>
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                    <View style={styles.badge}><Text style={styles.badgeText}>{user?.role?.toUpperCase()}</Text></View>
                </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuCard}>
                {items.map((item, i) => (
                    <TouchableOpacity key={i} style={[styles.menuItem, i < items.length - 1 && styles.menuDivider]} onPress={item.onPress}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <Text style={styles.menuChevron}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 40 : 20, marginBottom: 24 },
    back: { color: '#FF3B3B', fontSize: 16, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151928', borderRadius: 16, padding: 20, marginBottom: 20, gap: 16, borderWidth: 1, borderColor: '#1E2438' },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF3B3B', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
    profileName: { color: '#fff', fontWeight: '700', fontSize: 17 },
    profileEmail: { color: '#888', fontSize: 13, marginTop: 2 },
    badge: { backgroundColor: '#FF3B3B22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FF3B3B55' },
    badgeText: { color: '#FF3B3B', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    menuCard: { backgroundColor: '#151928', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2438', marginBottom: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    menuDivider: { borderBottomWidth: 1, borderBottomColor: '#1E2438' },
    menuIcon: { fontSize: 20 },
    menuLabel: { flex: 1, color: '#ddd', fontSize: 15 },
    menuChevron: { color: '#555', fontSize: 18 },
    logoutBtn: { backgroundColor: '#FF3B3B22', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B3B55' },
    logoutText: { color: '#FF3B3B', fontWeight: '700', fontSize: 16 },
});
