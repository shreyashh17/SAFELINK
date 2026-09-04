import * as Location from 'expo-location';
import api from './api';

let locationWatcher: Location.LocationSubscription | null = null;
let lastKnownLocation: { latitude: number; longitude: number } | null = null;

export async function requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    lastKnownLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    return lastKnownLocation;
}

export function getLastKnownLocation() {
    return lastKnownLocation;
}

export async function startLocationTracking(onUpdate: (loc: { latitude: number; longitude: number }) => void): Promise<void> {
    const granted = await requestLocationPermission();
    if (!granted) return;

    locationWatcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        async (loc) => {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            lastKnownLocation = coords;
            onUpdate(coords);
            // Push to backend silently
            try {
                await api.post('/api/location/update', { ...coords, accuracy: loc.coords.accuracy });
            } catch { }
        }
    );
}

export function stopLocationTracking(): void {
    locationWatcher?.remove();
    locationWatcher = null;
}

// Haversine distance in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
