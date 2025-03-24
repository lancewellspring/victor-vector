/**
 * Message handling module for server
 * Processes client messages and triggers appropriate game logic
 */

import sessions from './sessions.js';
import validation from '../game/validation.js';
import { createComponent } from '../../static/shared/components/index.js';

/**
 * Handle client join message
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} data - Message data
 */
function handleJoinMessage(wss, ws, data) {
  const clientId = ws.clientId;
  console.log(`Processing join for client ${clientId}`);
  
  // Validate join request
  if (!validation.validateJoinRequest(data)) {
    sendErrorMessage(ws, 'join', 'Invalid join request');
    return;
  }
  
  // Get client session
  const session = sessions.getSession(clientId);
  if (!session) {
    console.error(`Session not found for client ${clientId}`);
    return;
  }
  
  // Check if player already has an entity
  if (ws.playerEntityId) {
    // Player already joined, handle reconnection
    handleReconnection(wss, ws, ws.playerEntityId);
    return;
  }
  
  // Create player entity in game world
  const playerEntity = createPlayerEntity(wss.gameWorld, clientId, data);
  
  // Store entity ID in WebSocket and session
  ws.playerEntityId = playerEntity.id;
  sessions.associateEntity(clientId, playerEntity.id);
  
  // Send success response
  sendMessage(ws, 'joinResponse', {
    success: true,
    playerId: playerEntity.id,
    playerData: {
      name: playerEntity.player.name,
      position: {
        x: playerEntity.transform.x,
        y: playerEntity.transform.y
      }
    }
  });
  
  // Broadcast new player to other clients
  broadcastMessage(wss, 'playerJoined', {
    playerId: playerEntity.id,
    name: playerEntity.player.name,
    position: {
      x: playerEntity.transform.x,
      y: playerEntity.transform.y
    }
  }, clientId);
  
  console.log(`Player ${playerEntity.id} created for client ${clientId}`);
}

/**
 * Handle player reconnection
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {string} entityId - Player entity ID
 */
function handleReconnection(wss, ws, entityId) {
  console.log(`Processing reconnection for client ${ws.clientId}, entity ${entityId}`);
  
  // Find player entity
  const playerEntity = wss.gameWorld.getEntity(entityId);
  if (!playerEntity) {
    // Entity not found, create new one
    console.log(`Entity ${entityId} not found, creating new player`);
    handleJoinMessage(wss, ws, { newPlayer: true });
    return;
  }
  
  // Update connection status
  playerEntity.connection.connected = true;
  playerEntity.connection.socket = ws;
  
  // Send full world state to reconnected player
  sendWorldState(ws, wss.gameWorld);
  
  // Notify other players
  broadcastMessage(wss, 'playerReconnected', {
    playerId: entityId
  }, ws.clientId);
  
  console.log(`Player ${entityId} reconnected`);
}

/**
 * Handle client input message
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} data - Message data
 */
function handleInputMessage(wss, ws, data) {
  // Validate input message
  if (!validation.validateInputMessage(data)) {
    return; // Silently ignore invalid inputs to prevent spam
  }
  
  // Get player entity
  const entityId = ws.playerEntityId;
  if (!entityId) {
    console.warn(`Received input from client ${ws.clientId} with no associated entity`);
    return;
  }
  
  const playerEntity = wss.gameWorld.getEntity(entityId);
  if (!playerEntity) {
    console.warn(`Entity ${entityId} not found for client ${ws.clientId}`);
    return;
  }
  
  // Store input in connection component for processing by physics system
  playerEntity.connection.inputBuffer.push({
    sequence: data.sequence,
    input: data.input,
    timestamp: Date.now()
  });
}

/**
 * Handle venture interaction message
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} data - Message data
 */
function handleVentureMessage(wss, ws, data) {
  const clientId = ws.clientId;
  const session = sessions.getSession(clientId);
  
  if (!session) {
    console.error(`Session not found for client ${clientId}`);
    return;
  }
  
  // Route to appropriate handler based on venture action
  switch (data.action) {
    case 'start':
      startVenture(wss, ws, data);
      break;
    case 'join':
      joinVenture(wss, ws, data);
      break;
    case 'leave':
      leaveVenture(wss, ws, data);
      break;
    case 'complete':
      completeVenture(wss, ws, data);
      break;
    default:
      console.warn(`Unknown venture action: ${data.action}`);
  }
}

/**
 * Handle chat message
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} data - Message data
 */
function handleChatMessage(wss, ws, data) {
  // Validate chat message
  if (!validation.validateChatMessage(data)) {
    sendErrorMessage(ws, 'chat', 'Invalid chat message');
    return;
  }
  
  const clientId = ws.clientId;
  const session = sessions.getSession(clientId);
  
  if (!session) {
    console.error(`Session not found for client ${clientId}`);
    return;
  }
  
  // Get player info
  const entityId = ws.playerEntityId;
  if (!entityId) {
    sendErrorMessage(ws, 'chat', 'No player entity associated with session');
    return;
  }
  
  const playerEntity = wss.gameWorld.getEntity(entityId);
  if (!playerEntity) {
    sendErrorMessage(ws, 'chat', 'Player entity not found');
    return;
  }
  
  // Create chat message
  const chatMessage = {
    playerId: entityId,
    playerName: playerEntity.player.name,
    message: data.message,
    channel: data.channel || 'global',
    timestamp: Date.now()
  };
  
  // Don't send empty messages
  if (!data.message || data.message.trim() === '') {
    sendErrorMessage(ws, 'chat', 'Message cannot be empty');
    return;
  }

  // Broadcast to appropriate recipients based on channel
  switch (chatMessage.channel) {
    case 'global':
      broadcastMessage(wss, 'chat', chatMessage);
      break;
    case 'venture':
      // Only send to players in same venture
      if (session.currentVentureId) {
        broadcastToVenture(wss, session.currentVentureId, 'chat', chatMessage);
      } else {
        sendErrorMessage(ws, 'chat', 'Not in a venture');
      }
      break;
    case 'whisper':
      // Private message to specific player
      if (data.targetId) {
        sendWhisper(wss, entityId, data.targetId, chatMessage);
      } else {
        sendErrorMessage(ws, 'chat', 'No target specified for whisper');
      }
      break;
    default:
      sendErrorMessage(ws, 'chat', 'Unknown chat channel');
  }
}

// Helper functions

/**
 * Create a new player entity
 * @param {Object} gameWorld - Game world instance
 * @param {string} clientId - Client ID
 * @param {Object} data - Player creation data
 * @returns {Object} Created player entity
 */
function createPlayerEntity(gameWorld, clientId, data) {
  // Default position
  const startPosition = { x: 0, y: 5, z: 0 };
  
  // Find a good spawn position in the current world
  const segmentedTerrainSystem = gameWorld.systems.getSystem('SegmentedTerrainSystem');
  if (segmentedTerrainSystem) {
    const spawnPos = segmentedTerrainSystem.getSpawnPosition();
    if (spawnPos) {
      startPosition.x = spawnPos.x;
      startPosition.y = spawnPos.y;
    }
  }
  
  // Create entity with required components
  const playerEntity = gameWorld.createEntity({
    transform: createComponent('transform', {
      x: startPosition.x,
      y: startPosition.y,
      z: startPosition.z,
      physicsControlled: true
    }),
    player: createComponent('player', {
      name: data.name || `Player_${clientId.substring(0, 5)}`,
      characterClass: data.characterClass || 'novice'
    }),
    physics: createComponent('physics', {
      bodyType: 'dynamic',
      colliderType: 'box',
      width: 1,
      height: 2,
      depth: 1,
      friction: 0.2,
      restitution: 0.1,
      isCharacter: true,
      maxSpeed: 5
    }),
    serverPhysics: createComponent('serverPhysics'),
    connection: createComponent('connection', {
      clientId,
      socket: null, // Will be set by connection system
      lastProcessedInput: 0,
      connected: true
    })
  });
  
  return playerEntity;
}

/**
 * Send full world state to a client
 * @param {WebSocket} ws - Client WebSocket
 * @param {Object} gameWorld - Game world instance
 */
function sendWorldState(ws, gameWorld) {
  // Get all entities relevant to the player
  const entities = [];
  
  // Add terrain entities
  const terrainEntities = gameWorld.with('terrain');
  for (const entity of terrainEntities) {
    entities.push({
      id: entity.id,
      type: 'terrain',
      points: entity.terrain.points
    });
  }
  
  // Add player entities
  const playerEntities = gameWorld.with('player', 'transform');
  for (const entity of playerEntities) {
    entities.push({
      id: entity.id,
      type: 'player',
      name: entity.player.name,
      position: {
        x: entity.transform.x,
        y: entity.transform.y
      }
    });
  }
  
  // Add resource entities
  const resourceEntities = gameWorld.with('resourceNode', 'transform');
  for (const entity of resourceEntities) {
    entities.push({
      id: entity.id,
      type: 'resource',
      resourceType: entity.resourceNode.type,
      amount: entity.resourceNode.amount,
      position: {
        x: entity.transform.x,
        y: entity.transform.y
      }
    });
  }
  
  // Send world state
  sendMessage(ws, 'worldState', {
    entities,
    timestamp: Date.now()
  });
}



// These functions would be imported from the WebSocket module
// Defined here to avoid circular dependencies
function sendMessage(ws, type, data) {
  if (ws.readyState !== 1) return; // 1 = WebSocket.OPEN

  const message = JSON.stringify({
    type,
    data
  });

  ws.send(message);
}

function sendErrorMessage(ws, type, error) {
  sendMessage(ws, `${type}Error`, { error });
}

function broadcastMessage(wss, type, data, excludeClientId = null) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && // 1 = WebSocket.OPEN
        (!excludeClientId || client.clientId !== excludeClientId)) {
      sendMessage(client, type, data);
    }
  });
}

// Venture-related functions (stubs)
function startVenture(wss, ws, data) {
  // Implementation will be added later
  console.log('startVenture not fully implemented');
}

function joinVenture(wss, ws, data) {
  // Implementation will be added later
  console.log('joinVenture not fully implemented');
}

function leaveVenture(wss, ws, data) {
  // Implementation will be added later
  console.log('leaveVenture not fully implemented');
}

function completeVenture(wss, ws, data) {
  // Implementation will be added later
  console.log('completeVenture not fully implemented');
}

function broadcastToVenture(wss, ventureId, type, data) {
  // Implementation will be added later
  console.log('broadcastToVenture not fully implemented');
}

function sendWhisper(wss, fromId, toId, message) {
  // Implementation will be added later
  console.log('sendWhisper not fully implemented');
}

// Export functions

const messages = {
  handleJoinMessage,
  handleInputMessage,
  handleChatMessage,
  handleVentureMessage
};

export default messages;