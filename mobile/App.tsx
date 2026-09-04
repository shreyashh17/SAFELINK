import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ComplaintScreen from './src/screens/ComplaintScreen';
import EventScreen from './src/screens/EventScreen';
import MapScreen from './src/screens/MapScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { registerForPushNotifications } from './src/services/notification';
import { loadZones, startGeofenceMonitoring, stopGeofenceMonitoring } from './src/services/geofence';
import { Alert } from 'react-native';

const Stack = createStackNavigator();

function AppNavigator() {
    const { user, loading } = useAuth();

    // Start geofence monitoring and push notifications after login
    useEffect(() => {
        if (!user) return;

        // Register for push notifications
        registerForPushNotifications().catch(() => { });

        // Start geofence monitoring
        loadZones().then((zones) => {
            if (zones.length === 0) return;
            startGeofenceMonitoring(
                zones,
                (zone) => {
                    Alert.alert(
                        '📍 Safety Zone Entered',
                        `You have entered "${zone.name}". Event safety monitoring is now active.`,
                        [{ text: 'OK' }]
                    );
                },
                (zone) => {
                    Alert.alert('📍 Zone Exited', `You have left "${zone.name}".`, [{ text: 'OK' }]);
                }
            );
        });

        return () => stopGeofenceMonitoring();
    }, [user]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0A0E1A', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#FF3B3B" size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0A0E1A' } }}
            >
                {!user ? (
                    <>
                        <Stack.Screen name="Splash" component={SplashScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Complaint" component={ComplaintScreen} />
                        <Stack.Screen name="Event" component={EventScreen} />
                        <Stack.Screen name="Map" component={MapScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}
