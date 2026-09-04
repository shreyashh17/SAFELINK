import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';

const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

// Contact event security
router.post('/contact', authenticate, async (req: AuthRequest, res) => {
    const { zoneId, message, latitude, longitude } = req.body;
    const uid = req.user!.uid;

    let zoneName = 'Unknown Zone';
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const zoneDoc = await firestore.collection('geofenceZones').doc(zoneId).get();
        if (!zoneDoc.exists) { res.status(404).json({ error: 'Zone not found' }); return; }
        zoneName = zoneDoc.data()!.name;
    } else {
        const zone = localStore.get<any>('geofenceZones', zoneId);
        if (!zone) { res.status(404).json({ error: 'Zone not found' }); return; }
        zoneName = zone.name;
    }

    const id = localStore.newId();
    const contact = {
        uid, zoneId, zoneName, message, latitude, longitude,
        status: 'pending', timestamp: new Date().toISOString(),
    };

    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        await firestore.collection('eventContacts').doc(id).set(contact);
    } else {
        localStore.set('eventContacts', id, contact);
    }
    broadcast('EVENT_CONTACT', { id, ...contact });
    res.status(201).json({ id, ...contact });
});

// Get event contacts for a zone
router.get('/contacts/:zoneId', authenticate, async (req, res) => {
    const { zoneId } = req.params;
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('eventContacts')
            .where('zoneId', '==', zoneId).orderBy('timestamp', 'desc').get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        return;
    }
    res.json(localStore.where<any>('eventContacts', 'zoneId', zoneId));
});

export default router;
