import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';

const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

router.post('/update', authenticate, async (req: AuthRequest, res) => {
    const { latitude, longitude, accuracy } = req.body;
    const uid = req.user!.uid;
    const locationData = {
        uid, latitude, longitude, accuracy: accuracy || 0,
        updatedAt: new Date().toISOString(),
    };

    if (isFirebase()) {
        const { db } = await import('../services/firebase');
        await db.ref(`locations/${uid}`).set(locationData);
    } else {
        localStore.set('locations', uid, locationData);
    }
    broadcast('LOCATION_UPDATE', locationData);
    res.json({ success: true });
});

router.get('/active', authenticate, async (_req, res) => {
    if (isFirebase()) {
        const { db } = await import('../services/firebase');
        const snap = await db.ref('locations').once('value');
        res.json(Object.values(snap.val() || {}));
        return;
    }
    res.json(localStore.getAll('locations'));
});

export default router;
