import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export function setupWebSocket(server: WebSocketServer): void {
    wss = server;
    server.on('connection', (ws) => {
        clients.add(ws);
        ws.on('close', () => clients.delete(ws));
        ws.send(JSON.stringify({ type: 'connected', message: 'SafeLink WebSocket ready' }));
    });
    console.log('🔌 WebSocket server ready');
}

export function broadcast(type: string, payload: object): void {
    const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
}
