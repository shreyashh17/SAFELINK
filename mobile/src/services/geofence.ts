import api from './api';
import { getCurrentLocation, getDistanceMeters } from './location';

export interface GeofenceZone {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    type: string;
}

let watchInterval: ReturnType<typeof setInterval> | null = null;
const enteredZones = new Set<string>();

export async function loadZones(): Promise<GeofenceZone[]> {
    try {
        const res = await api.get('/api/geofence/zones');
        return res.data;
    } catch {
        return [];
    }
}

export function startGeofenceMonitoring(
    zones: GeofenceZone[],
    onEnter: (zone: GeofenceZone) => void,
    onExit: (zone: GeofenceZone) => void
): void {
    if (watchInterval) clearInterval(watchInterval);

    watchInterval = setInterval(async () => {
        try {
            const loc = await getCurrentLocation();
            for (const zone of zones) {
                const dist = getDistanceMeters(loc.latitude, loc.longitude, zone.latitude, zone.longitude);
                const inside = dist <= zone.radius;
                const wasInside = enteredZones.has(zone.id);

                if (inside && !wasInside) {
                    enteredZones.add(zone.id);
                    onEnter(zone);
                    // notify backend
                    api.post('/api/geofence/event', {
                        zoneId: zone.id, zoneName: zone.name, eventType: 'enter',
                        latitude: loc.latitude, longitude: loc.longitude,
                    }).catch(() => { });
                } else if (!inside && wasInside) {
                    enteredZones.delete(zone.id);
                    onExit(zone);
                    api.post('/api/geofence/event', {
                        zoneId: zone.id, zoneName: zone.name, eventType: 'exit',
                        latitude: loc.latitude, longitude: loc.longitude,
                    }).catch(() => { });
                }
            }
        } catch { }
    }, 10000); // check every 10 seconds
}

export function stopGeofenceMonitoring(): void {
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
    enteredZones.clear();
}
