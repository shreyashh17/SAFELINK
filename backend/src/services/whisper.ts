import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: 'whisper-1',
            language: 'en',
        });
        return transcription.text;
    } catch (err) {
        console.error('Whisper transcription error:', err);
        throw new Error('Audio transcription failed');
    }
}

// AI-based distress keyword detection
const DISTRESS_KEYWORDS = [
    'help', 'emergency', 'fire', 'attack', 'danger', 'hurt', 'bleeding',
    'accident', 'earthquake', 'flood', 'robbery', 'kidnap', 'save me',
    'call police', 'call ambulance', 'i am trapped', 'please help', 'sos',
];

export function detectDistress(text: string): {
    isDistress: boolean;
    confidence: number;
    matchedKeywords: string[];
} {
    const lower = text.toLowerCase();
    const matched = DISTRESS_KEYWORDS.filter((kw) => lower.includes(kw));
    const confidence = Math.min(matched.length / 3, 1.0);
    return {
        isDistress: matched.length > 0,
        confidence: parseFloat(confidence.toFixed(2)),
        matchedKeywords: matched,
    };
}
