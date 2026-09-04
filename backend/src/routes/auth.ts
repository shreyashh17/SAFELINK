import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import localStore from '../services/localStore';

const router = Router();

// Helper to check if Firebase is properly configured
function isFirebaseConfigured(): boolean {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
}

async function findUserByEmail(email: string): Promise<any | null> {
    if (isFirebaseConfigured()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('users').where('email', '==', email).limit(1).get();
        return snap.empty ? null : snap.docs[0].data();
    }
    const results = localStore.where<any>('users', 'email', email);
    return results[0] ?? null;
}

async function saveUser(uid: string, data: object): Promise<void> {
    if (isFirebaseConfigured()) {
        const { firestore } = await import('../services/firebase');
        await firestore.collection('users').doc(uid).set(data);
        return;
    }
    localStore.set('users', uid, data);
}

router.post('/register', async (req, res) => {
    const { name, email, password, phone, emergencyContact } = req.body;
    if (!email || !password || !name) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
    }

    // Prevent duplicate email
    const existing = await findUserByEmail(email);
    if (existing) {
        res.status(409).json({ error: 'An account with this email already exists' });
        return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const uid = localStore.newId();
    const userData = {
        uid, name, email,
        phone: phone || '',
        emergencyContact: emergencyContact || '',
        passwordHash: hashed,
        role: email.endsWith('@admin.safelink') ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
    };

    await saveUser(uid, userData);

    const token = jwt.sign(
        { uid, email, role: userData.role },
        process.env.JWT_SECRET || 'safelink_dev_secret',
        { expiresIn: '30d' }
    );
    res.status(201).json({ token, uid, name, email, role: userData.role });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const token = jwt.sign(
        { uid: user.uid, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'safelink_dev_secret',
        { expiresIn: '30d' }
    );
    res.json({ token, uid: user.uid, name: user.name, email: user.email, role: user.role });
});

export default router;
