import { Platform } from 'react-native';

/**
 * Push notification service.
 *
 * On a real device this uses expo-notifications.
 * Kept as a standalone service so it can be swapped to
 * Firebase Cloud Messaging (FCM) via @react-native-firebase/messaging
 * without touching the rest of the codebase.
 */

export async function registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
        // Dynamic import so the module is only loaded on native
        const Notifications = await import('expo-notifications');

        await Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Push notification permission denied');
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('📲 Expo push token:', token);
        return token;
    } catch (err) {
        console.warn('Push notification setup failed:', err);
        return null;
    }
}

export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
    try {
        const Notifications = await import('expo-notifications');
        await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: null, // fire immediately
        });
    } catch { }
}
