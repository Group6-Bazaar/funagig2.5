import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Room registry: Map<conversationId, Set<WebSocket>>
const rooms = new Map();

export default function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // Basic JWT verification on upgrade
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      request.user = decoded;
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const convId = url.searchParams.get('convId');

    if (convId) {
      if (!rooms.has(convId)) {
        rooms.set(convId, new Set());
      }
      rooms.get(convId).add(ws);

      ws.on('close', () => {
        const room = rooms.get(convId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            rooms.delete(convId);
          }
        }
      });
    }

    ws.on('error', console.error);
  });
}

export function broadcastToRoom(convId, payload) {
  const room = rooms.get(convId.toString());
  if (room) {
    const message = JSON.stringify(payload);
    for (const client of room) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }
  }
}
