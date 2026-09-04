import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { transcribeAudio, detectDistress } from '../services/whisper';
import { broadcast } from '../services/websocket';

const upload = multer({ dest: 'uploads/' });
const router = Router();
const isFirebase = () => {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
};

router.post('/submit', authenticate, async (req: AuthRequest, res) => {
    const { text, latitude, longitude, category = 'general' } = req.body;
    const uid = req.user!.uid;
    const distress = detectDistress(text || '');
    const complaint = {
        uid, text, category, latitude, longitude,
        status: 'open', createdAt: new Date().toISOString(), distress,
    };

    let id: string;
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const ref = await firestore.collection('complaints').add(complaint);
        id = ref.id;
    } else {
        id = localStore.newId();
        localStore.set('complaints', id, { ...complaint, id });
    }

    broadcast('NEW_COMPLAINT', { id, ...complaint });
    res.status(201).json({ id, complaint, distress });
});

router.post('/transcribe', authenticate, upload.single('audio'), async (req: AuthRequest, res) => {
    if (!req.file) { res.status(400).json({ error: 'No audio file provided' }); return; }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey || openAiKey === 'your_openai_api_key') {
        fs.unlinkSync(req.file.path);
        res.status(200).json({
            transcript: '[Transcription requires OPENAI_API_KEY — type your complaint manually]',
            distress: { isDistress: false, confidence: 0, matchedKeywords: [] },
        });
        return;
    }

    try {
        const transcript = await transcribeAudio(req.file.path);
        const distress = detectDistress(transcript);
        fs.unlinkSync(req.file.path);
        res.json({ transcript, distress });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', authenticate, async (_req, res) => {
    if (isFirebase()) {
        const { firestore } = await import('../services/firebase');
        const snap = await firestore.collection('complaints').orderBy('createdAt', 'desc').limit(50).get();
        res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        return;
    }
    res.json(localStore.getAll('complaints', 'createdAt'));
});

export default router;
