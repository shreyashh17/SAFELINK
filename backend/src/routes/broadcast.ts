import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';

const router = Router();

// POST /api/broadcast — Admin sends a government alert to all users
router.post('/', authenticate, requireAdmin, async (req: any, res) => {
    const { title, message, severity = 'info', area } = req.body;
    if (!title || !message) {
        res.status(400).json({ error: 'title and message are required' });
        return;
    }

    const id = localStore.newId();
    const alert = {
        id,
        title,
        message,
        severity, // 'info' | 'warning' | 'critical'
        area: area || 'All Areas',
        createdBy: req.user!.uid,
        timestamp: new Date().toISOString(),
    };

    localStore.set('broadcasts', id, alert);

    // Push to ALL connected WebSocket clients (users + admins)
    broadcast('GOV_ALERT', alert);

    res.status(201).json({ success: true, alert });
});

// GET /api/broadcast — Get recent government broadcasts (for users on login)
router.get('/', authenticate, async (_req, res) => {
    const all = localStore.getAll<any>('broadcasts', 'timestamp');
    // Return last 20
    res.json(all.slice(0, 20));
});

export default router;
