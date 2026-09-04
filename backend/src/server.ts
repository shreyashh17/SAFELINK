import * as dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app';
import { setupWebSocket } from './services/websocket';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

server.listen(PORT, () => {
    console.log(`🚀 SafeLink backend running on port ${PORT}`);
});
