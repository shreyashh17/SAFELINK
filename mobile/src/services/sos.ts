import api from './api';
import { getCurrentLocation } from './location';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';

export type SOSType = 'SOS' | 'POLICE' | 'AMBULANCE' | 'FIRE';

const EMERGENCY_NUMBERS: Record<SOSType, string> = {
    SOS: '112',
    POLICE: '100',
    AMBULANCE: '108',
    FIRE: '101',
};

export async function triggerSOS(type: SOSType = 'SOS', message = 'Emergency! Please help!'): Promise<string> {
    // Strong haptic feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    let latitude = 0, longitude = 0;
    try {
        const loc = await getCurrentLocation();
        latitude = loc.latitude;
        longitude = loc.longitude;
    } catch { }

    try {
        const res = await api.post('/api/sos/trigger', { latitude, longitude, message, type });
        return res.data.alertId;
    } catch (err: any) {
        // If network fails, still try native SMS fallback
        const emergencyNumber = EMERGENCY_NUMBERS[type];
        const smsBody = `EMERGENCY: ${message} Location: https://maps.google.com/?q=${latitude},${longitude}`;
        await Linking.openURL(`sms:${emergencyNumber}?body=${encodeURIComponent(smsBody)}`);
        throw new Error('SOS sent via SMS fallback');
    }
}

export function callEmergencyService(type: SOSType): void {
    const number = EMERGENCY_NUMBERS[type];
    Linking.openURL(`tel:${number}`);
}

export async function getSavedAlerts(): Promise<any[]> {
    try {
        const res = await api.get('/api/admin/alerts');
        return res.data;
    } catch {
        return [];
    }
}
