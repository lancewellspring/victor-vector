/**
 * WebSocket management module for server
 * Handles connections, message routing, and connection lifecycle
 */

import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import sessions from './sessions.js';
import messages from './messages.js';


/**
 * Create and configure WebSocket server
 * @param {Object} server - HTTP server instance
 * @param {Object} gameWorld - Server-side game world instance
 * @returns {WebSocket.Server} Configured WebSocket server
 */
function createWebSocketServer(server, gameWorld) {
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    clientTracking: true
  });

  // Store reference to game world
  wss.gameWorld = gameWorld;

  // Connection handling
  wss.on('connection', (ws, req) => this.handleConnection(wss, ws, req));

  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => this.checkConnections(wss), 30000);
  wss.heartbeatInterval = heartbeatInterval;

  // Attach cleanup method
  wss.cleanup = () => {
    clearInterval(heartbeatInterval);
    wss.close();
  };

  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} req - HTTP request
 */
function handleConnection(wss, ws, req) {
  // Generate client ID
  const clientId = uuidv4();
  console.log(`New client connected: ${clientId}`);

  // Initialize connection properties
  ws.isAlive = true;
  ws.lastHeartbeat = Date.now();
  ws.clientId = clientId;
  ws.playerEntityId = null;

  // Set up ping/pong for connection monitoring
  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastHeartbeat = Date.now();
  });

  // Set up message handling
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      this.handleMessage(wss, ws, message);
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
    }
  });

  // Handle disconnection
  ws.on('close', () => this.handleDisconnect(wss, ws));

  // Create session
  sessions.createSession(clientId, ws);
}

/**
 * Handle client disconnection
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 */
function handleDisconnect(wss, ws) {
  console.log(`Client disconnected: ${ws.clientId}`);

  // Clean up player entity if it exists
  if (ws.playerEntityId && wss.gameWorld) {
    // Find player entity in game world
    const playerEntity = wss.gameWorld.getEntity(ws.playerEntityId);
    if (playerEntity) {
      // Mark player as disconnected but don't remove immediately
      // This allows for reconnection within a grace period
      playerEntity.connection.connected = false;
      playerEntity.connection.disconnectedAt = Date.now();
    }
  }

  // Remove session
  sessions.removeSession(ws.clientId);
}

/**
 * Check connections for timeouts
 * @param {WebSocket.Server} wss - WebSocket server
 */
function checkConnections(wss) {
  const now = Date.now();
  const timeoutThreshold = 30000; // 30 seconds

  wss.clients.forEach((ws) => {
    // Check if connection has timed out
    if (now - ws.lastHeartbeat > timeoutThreshold) {
      console.log(`Client ${ws.clientId} timed out`);
      ws.terminate();
      return;
    }

    // Send ping to check connection
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();
  });

  // Clean up disconnected player entities that have exceeded grace period
  if (wss.gameWorld) {
    const gracePeriod = 60000; // 1 minute
    const connectionEntities = wss.gameWorld.with('connection');

    for (const entity of connectionEntities) {
      if (!entity.connection.connected && 
          now - entity.connection.disconnectedAt > gracePeriod) {
        console.log(`Removing disconnected player: ${entity.id}`);
        wss.gameWorld.removeEntity(entity);
      }
    }
  }
}

/**
 * Route incoming messages to appropriate handlers
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} message - Parsed message object
 */
function handleMessage(wss, ws, message) {
  if (!message.type) {
    console.warn(`Received message without type from ${ws.clientId}`);
    return;
  }

  // Update last activity time
  ws.lastHeartbeat = Date.now();

  // Handle different message types
  switch (message.type) {
    case 'join':
      messages.handleJoinMessage(wss, ws, message.data);
      break;
    case 'input':
      messages.handleInputMessage(wss, ws, message.data);
      break;
    case 'chat':
      messages.handleChatMessage(wss, ws, message.data);
      break;
    case 'venture':
      messages.handleVentureMessage(wss, ws, message.data);
      break;
    case 'heartbeat':
      // Just update the heartbeat timestamp
      break;
    default:
      console.warn(`Unknown message type from ${ws.clientId}: ${message.type}`);
  }
}

/**
 * Send message to specific client
 * @param {WebSocket} ws - Target client WebSocket
 * @param {string} type - Message type
 * @param {Object} data - Message payload
 */
function sendMessage(ws, type, data) {
  if (ws.readyState !== WebSocket.OPEN) return;

  const message = JSON.stringify({
    type,
    data
  });

  ws.send(message);
}

/**
 * Broadcast message to all connected clients
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {string} type - Message type
 * @param {Object} data - Message payload
 * @param {String} excludeClientId - Client ID to exclude from broadcast
 */
function broadcastMessage(wss, type, data, excludeClientId = null) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        (!excludeClientId || client.clientId !== excludeClientId)) {
      this.sendMessage(client, type, data);
    }
  });
}

const websocket = {
  broadcastMessage,
  sendMessage,
  handleMessage,
  checkConnections,
  handleDisconnect,
  createWebSocketServer
};

export default websocket;
