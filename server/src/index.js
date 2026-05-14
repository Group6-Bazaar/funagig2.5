import http from 'http';
import app from './app.js';
import setupWebSocket from './sockets/messageSocket.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8080;

// Create HTTP server attached to Express app
const server = http.createServer(app);

// Attach WebSocket server to the same HTTP server
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
