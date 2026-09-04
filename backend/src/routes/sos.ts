import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';
import axios from 'axios';

const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

/* ── Find nearest police station via OpenStreetMap Overpass API ────────────── */
async function findNearestPolicePhone(lat: number, lng: number): Promise<string | null> {
    if (!lat || !lng) return null;
    try {
        const query = `[out:json][timeout:8];
(
  node[amenity=police](around:8000,${lat},${lng});
  way[amenity=police](around:8000,${lat},${lng});
);
out center 5;`;
        const resp = await axios.post(
            'https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(query)}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
        );
        const elements = resp.data?.elements || [];
        if (elements.length === 0) return null;
        // Pick first result that has a phone number
        for (const el of elements) {
            const tags = el.tags || {};
            const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];
            if (phone) return phone.replace(/\s+/g, '');
        }
        return null;
    } catch {
        return null;
    }
}

/* ── SOS Trigger ─────────────────────────────────────────────────────────── */
router.post('/trigger', authenticate, async (req: AuthRequest, res) => {
    const { latitude, longitude, message = 'SOS triggered', type = 'SOS' } = req.body;
    const uid = req.user!.uid;
    const alertId = localStore.newId();

    const alert = {
        id: alertId, uid, type, message, latitude, longitude,
        status: 'active', timestamp: new Date().toISOString(),
    };

    if (isFirebase()) {
        const { db, firestore, messaging } = await import('../services/firebase');
        await db.ref(`alerts/${alertId}`).set(alert);
        await firestore.collection('alerts').doc(alertId).set(alert);
        try {
            await messaging.send({
                topic: 'admins',
                notification: { title: '🚨 SOS ALERT', body: `New emergency from user ${uid}` },
                data: { alertId, latitude: String(latitude), longitude: String(longitude) },
            });
        } catch { }
    } else {
        localStore.set('alerts', alertId, alert);
    }

    broadcast('SOS_ALERT', alert);

    // SMS to admin emergency number
    let smsSent = false;
    try {
        const { sendEmergencySMS } = await import('../services/twilio');
        await sendEmergencySMS(uid, latitude, longitude, message);
        smsSent = true;
    } catch { smsSent = false; }

    // ── Also SMS nearest police station (if Twilio configured + phone found) ──
    let policeSmsResult: 'sent' | 'no_phone' | 'unavailable' = 'unavailable';
    try {
        const { sendSMSAlert } = await import('../services/twilio');
        const nearestPhone = await findNearestPolicePhone(latitude, longitude);
        if (nearestPhone) {
            const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
            const body = `🚨 SAFELINK EMERGENCY ALERT 🚨\nUser in distress at your location.\nMessage: ${message}\nGPS: ${mapsLink}\nPlease dispatch immediately.`;
            await sendSMSAlert(nearestPhone, body);
            policeSmsResult = 'sent';
            // Log that we contacted a station
            localStore.set('police_notifications', localStore.newId(), {
                alertId, policePhone: nearestPhone, latitude, longitude,
                timestamp: new Date().toISOString(),
            });
        } else {
            policeSmsResult = 'no_phone';
        }
    } catch { policeSmsResult = 'unavailable'; }

    res.status(201).json({ success: true, alertId, alert, smsSent, policeSmsResult });
});

/* ── Resolve Alert ─────────────────────────────────────────────────────────── */
router.patch('/:alertId/resolve', authenticate, async (req: AuthRequest, res) => {
    const id = String(req.params['alertId']);
    if (isFirebase()) {
        const { db, firestore } = await import('../services/firebase');
        await db.ref(`alerts/${id}`).update({ status: 'resolved' });
        await firestore.collection('alerts').doc(id).update({ status: 'resolved' });
    } else {
        localStore.update('alerts', id, { status: 'resolved' });
    }
    broadcast('ALERT_RESOLVED', { alertId: id });
    res.json({ success: true });
});

/* ── Log emergency call attempt ────────────────────────────────────────────── */
router.post('/emergency-call', authenticate, async (req: AuthRequest, res) => {
    const { serviceType, stationName, stationPhone, latitude, longitude, distance } = req.body;
    const uid = req.user!.uid;
    const callId = localStore.newId();
    const callLog = {
        id: callId, uid, serviceType, stationName, stationPhone,
        latitude, longitude, distance,
        timestamp: new Date().toISOString(),
    };
    localStore.set('emergency_calls', callId, callLog);
    broadcast('EMERGENCY_CALL', callLog);
    res.status(201).json({ success: true, callId });
});

export default router;
