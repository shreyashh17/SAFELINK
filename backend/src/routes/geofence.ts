import { Router } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import localStore from '../services/localStore';

const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

// Create a geofence zone
router.post('/zones', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    const { name, latitude, longitude, radius, type = 'event' } = req.body;
    const zone = {
        name, latitude, longitude, radius, type,
        createdBy: req.user!.uid, createdAt: new Date().toISOString(), active: true,
    };
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const ref = await firestore.collection('geofenceZones').add(zone);
        res.status(201).json({ id: ref.id, ...zone });
        return;
    }
    const id = localStore.newId();
    localStore.set('geofenceZones', id, { ...zone, id });
    res.status(201).json({ id, ...zone });
});

// Get all active zones
router.get('/zones', authenticate, async (_req, res) => {
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('geofenceZones').where('active', '==', true).get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        return;
    }
    res.json(localStore.getAll<any>('geofenceZones').filter((z) => z.active));
});

// User entered/exited geofence zone
router.post('/event', authenticate, async (req: AuthRequest, res) => {
    const { zoneId, zoneName, eventType, latitude, longitude } = req.body;
    const uid = req.user!.uid;
    const event = { uid, zoneId, zoneName, eventType, latitude, longitude, timestamp: new Date().toISOString() };
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        await firestore.collection('geofenceEvents').add(event);
    } else {
        localStore.set('geofenceEvents', localStore.newId(), event);
    }
    res.status(201).json({ success: true, event });
});

export default router;
