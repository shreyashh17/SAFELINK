import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';

const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

// Get current user's own SOS alerts
router.get('/alerts', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('alerts')
            .where('uid', '==', uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        return;
    }
    const all = localStore.where<any>('alerts', 'uid', uid);
    all.sort((a, b) => b.timestamp > a.timestamp ? 1 : -1);
    res.json(all.slice(0, 20));
});

// Get current user's own complaints
router.get('/complaints', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('complaints')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        return;
    }
    const all = localStore.where<any>('complaints', 'uid', uid);
    all.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
    res.json(all.slice(0, 20));
});

// Get user profile
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const doc = await firestore.collection('users').doc(uid).get();
        if (!doc.exists) { res.status(404).json({ error: 'User not found' }); return; }
        const { passwordHash, ...safe } = doc.data() as any;
        res.json(safe);
        return;
    }
    const user = localStore.get<any>('users', uid);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { passwordHash, ...safe } = user;
    res.json(safe);
});

// ── Trusted Contacts ─────────────────────────────────────────────────────────
router.get('/contacts', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    const contacts = localStore.where<any>('trusted_contacts', 'uid', uid);
    res.json(contacts);
});

router.post('/contacts', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    const { name, phone, relationship } = req.body;
    if (!name || !phone) { res.status(400).json({ error: 'Name and phone are required' }); return; }

    // Limit to 3 contacts
    const existing = localStore.where<any>('trusted_contacts', 'uid', uid);
    if (existing.length >= 3) {
        res.status(400).json({ error: 'Maximum 3 trusted contacts allowed' });
        return;
    }

    const id = localStore.newId();
    const contact = { id, uid, name, phone, relationship: relationship || 'Other', createdAt: new Date().toISOString() };
    localStore.set('trusted_contacts', id, contact);
    res.status(201).json(contact);
});

router.delete('/contacts/:id', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    const id = String(req.params['id']);
    const contact = localStore.get<any>('trusted_contacts', id);
    if (!contact || contact.uid !== uid) { res.status(404).json({ error: 'Contact not found' }); return; }
    localStore.update('trusted_contacts', id, { deleted: true } as any);
    res.json({ success: true });
});

// ── Safety Check-In ───────────────────────────────────────────────────────────
router.post('/checkin', authenticate, async (req: AuthRequest, res) => {
    const uid = req.user!.uid;
    const { latitude, longitude } = req.body;
    const id = localStore.newId();
    localStore.set('checkins', id, { id, uid, latitude, longitude, timestamp: new Date().toISOString() });
    res.status(201).json({ success: true, checkinId: id });
});

export default router;

