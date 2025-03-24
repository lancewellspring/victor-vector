/**
 * Connection System - Server-side
 * Manages WebSocket connections and routes messages
 */

const { System } = require('@static/shared/systems/system.js');
const sessions = require('../network/sessions');
const messages = require('../network/messages');
const { createComponent } = require('@static/shared/components');

class ConnectionSystem extends System {
  constructor(wss) {
    super();
    this.name = 'ConnectionSystem';
    this.priority = 10; // Run early to process inputs before physics
    
    this.wss = wss; // WebSocket server
    this.connections = new Map(); // clientId -> connection entity
    this.messageQueue = []; // Messages to process this frame
    
    this.lastClientUpdate = 0; // Track when we last sent updates
    this.updateInterval = 50; // Update clients every 50ms (20 updates/second)
    
    this.clientUpdateBuffer = new Map(); // Buffer entity updates for each client
  }
  
  init(world) {
    super.init(world);
    
    // Set up event subscription
    this.subscribe('entityCreated', this.handleEntityCreated.bind(this));
    this.subscribe('entityRemoved', this.handleEntityRemoved.bind(this));
    
    // Set up message handlers for the WebSocket server
    if (this.wss) {
      this.setupMessageHandlers();
    }
    
    return this;
  }
  
  setupMessageHandlers() {
    // Set up connection handler
    this.wss.on('connection', this.handleConnection.bind(this));
  }
  
  handleConnection(ws, req) {
    const clientId = req.headers['client-id'] || `client_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`New client connected: ${clientId}`);
    
    // Initialize connection properties
    ws.isAlive = true;
    ws.lastActivity = Date.now();
    ws.clientId = clientId;
    
    // Set up ping/pong for connection monitoring
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = Date.now();
    });
    
    // Set up message handling
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Queue message for processing
        this.messageQueue.push({
          clientId,
          type: data.type,
          data: data.data,
          timestamp: Date.now()
        });
        
        // Update activity timestamp
        ws.lastActivity = Date.now();
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });
    
    // Create connection entity
    const connectionEntity = this.world.createEntity({
      connection: createComponent('connection', {
        clientId,
        socket: ws,
        lastProcessedInput: 0,
        connected: true
      })
    });
    
    // Store connection entity
    this.connections.set(clientId, connectionEntity);
    
    // Create session
    sessions.createSession(clientId, ws);
    
    return connectionEntity;
  }
  
  handleDisconnection(clientId) {
    console.log(`Client disconnected: ${clientId}`);
    
    // Get connection entity
    const connectionEntity = this.connections.get(clientId);
    if (connectionEntity) {
      // Mark as disconnected
      connectionEntity.connection.connected = false;
      connectionEntity.connection.disconnectedAt = Date.now();
      
      // Emit event
      this.world.events.emit('clientDisconnected', { clientId, connectionEntity });
    }
    
    // Update session
    sessions.disconnectSession(clientId);
  }
  
  handleEntityCreated(data) {
    const { entity } = data;
    
    // If this is a player entity, let's associate it with the connection
    if (entity.player && entity.connection) {
      const clientId = entity.connection.clientId;
      
      // Get connection entity
      const connectionEntity = this.connections.get(clientId);
      if (connectionEntity) {
        // Associate player entity with session
        sessions.associateEntity(clientId, entity.id);
      }
    }
  }
  
  handleEntityRemoved(data) {
    const { entity } = data;
    
    // If this was a connection entity, clean up
    if (entity.connection) {
      const clientId = entity.connection.clientId;
      
      // Remove from connections map
      this.connections.delete(clientId);
      
      // Remove from session
      sessions.removeSession(clientId);
    }
  }
  
  processMessages() {
    // Process each queued message
    for (const message of this.messageQueue) {
      this.processMessage(message);
    }
    
    // Clear the queue
    this.messageQueue = [];
  }
  
  processMessage(message) {
    const { clientId, type, data } = message;
    
    // Get connection entity
    const connectionEntity = this.connections.get(clientId);
    if (!connectionEntity) {
      console.warn(`Received message from unknown client: ${clientId}`);
      return;
    }
    
    // Get socket
    const socket = connectionEntity.connection.socket;
    
    // Process different message types
    switch (type) {
      case 'join':
        messages.handleJoinMessage(this.wss, socket, data);
        break;
        
      case 'input':
        this.handleInputMessage(connectionEntity, data);
        break;
        
      case 'chat':
        messages.handleChatMessage(this.wss, socket, data);
        break;
        
      case 'venture':
        messages.handleVentureMessage(this.wss, socket, data);
        break;
        
      default:
        console.warn(`Unknown message type: ${type}`);
    }
  }
  
  handleInputMessage(connectionEntity, data) {
    // Find player entity associated with this connection
    const playerEntity = this.findPlayerEntity(connectionEntity.connection.clientId);
    
    if (!playerEntity) {
      console.warn(`No player entity found for client: ${connectionEntity.connection.clientId}`);
      return;
    }
    
    // Add input to buffer
    if (!playerEntity.connection.inputBuffer) {
      playerEntity.connection.inputBuffer = [];
    }
    
    playerEntity.connection.inputBuffer.push({
      sequence: data.sequence,
      input: data.input,
      timestamp: Date.now()
    });
  }
  
  findPlayerEntity(clientId) {
    // Find all entities with player and connection components
    const playerEntities = this.world.with('player', 'connection');
    
    // Find the one with matching clientId
    return playerEntities.find(entity => entity.connection.clientId === clientId);
  }
  
  sendEntityUpdates() {
    const now = Date.now();
    
    // Only send updates at specified interval
    if (now - this.lastClientUpdate < this.updateInterval) {
      return;
    }
    
    this.lastClientUpdate = now;
    
    // Find all entities with serverPhysics that need syncing
    const syncEntities = this.world.with('serverPhysics', 'transform').filter(
      entity => entity.serverPhysics.needsSync
    );
    
    if (syncEntities.length === 0) {
      return;
    }
    
    // Prepare entity updates
    const updates = [];
    
    for (const entity of syncEntities) {
      // Create update object
      const update = {
        id: entity.id,
        position: {
          x: entity.transform.x,
          y: entity.transform.y
        },
        rotation: entity.transform.rotationZ || 0
      };
      
      // Add physics data if available
      if (entity.physics) {
        update.physics = {
          velocity: entity.physics.velocity,
          grounded: entity.physics.grounded
        };
      }
      
      // Add player data if available
      if (entity.player) {
        update.player = {
          state: entity.player.state,
          facing: entity.player.facing,
          currentFatigue: entity.player.currentFatigue
        };
      }
      
      // Add last processed input
      if (entity.connection && entity.connection.lastProcessedInput) {
        update.lastProcessedInput = entity.connection.lastProcessedInput;
      }
      
      updates.push(update);
      
      // Reset sync flag
      entity.serverPhysics.needsSync = false;
    }
    
    // Send to all connected clients
    this.broadcast('entityUpdates', {
      entities: updates,
      timestamp: now
    });
  }
  
  heartbeat() {
    const now = Date.now();
    
    // Send pings to check connections
    for (const [clientId, connectionEntity] of this.connections) {
      if (!connectionEntity.connection.connected) continue;
      
      const socket = connectionEntity.connection.socket;
      
      // Check if socket is still alive
      if (!socket || socket.readyState !== 1) { // 1 = WebSocket.OPEN
        this.handleDisconnection(clientId);
        continue;
      }
      
      // Check for timeouts
      if (now - socket.lastActivity > 30000) { // 30 seconds
        console.log(`Client ${clientId} timed out`);
        socket.terminate();
        this.handleDisconnection(clientId);
        continue;
      }
      
      // Send ping
      try {
        socket.ping();
      } catch (e) {
        console.error(`Error sending ping to ${clientId}:`, e);
        this.handleDisconnection(clientId);
      }
    }
  }
  
  sendMessage(clientId, type, data) {
    const connectionEntity = this.connections.get(clientId);
    if (!connectionEntity || !connectionEntity.connection.connected) return;
    
    const socket = connectionEntity.connection.socket;
    if (!socket || socket.readyState !== 1) return; // 1 = WebSocket.OPEN
    
    const message = JSON.stringify({
      type,
      data
    });
    
    try {
      socket.send(message);
    } catch (e) {
      console.error(`Error sending message to ${clientId}:`, e);
      this.handleDisconnection(clientId);
    }
  }
  
  broadcast(type, data, excludeClientId = null) {
    for (const [clientId, connectionEntity] of this.connections) {
      if (excludeClientId === clientId) continue;
      if (!connectionEntity.connection.connected) continue;
      
      this.sendMessage(clientId, type, data);
    }
  }
  
  broadcastToVenture(ventureId, type, data) {
    // Find all players in this venture
    const playerEntities = this.world.with('player').filter(
      entity => entity.player.currentVentureId === ventureId
    );
    
    // Send to each player
    for (const playerEntity of playerEntities) {
      if (!playerEntity.connection) continue;
      
      const clientId = playerEntity.connection.clientId;
      this.sendMessage(clientId, type, data);
    }
  }
  
  update(deltaTime) {
    // Process queued messages
    this.processMessages();
    
    // Send entity updates
    this.sendEntityUpdates();
    
    // Check connections every second
    if (Math.random() < deltaTime) { // ~once per second with 60 FPS
      this.heartbeat();
    }
    
    // Clean up timed out sessions
    if (Math.random() < deltaTime * 0.1) { // ~once per 10 seconds
      sessions.cleanupSessions();
    }
  }
  
  destroy() {
    // Close all connections
    for (const [clientId, connectionEntity] of this.connections) {
      if (connectionEntity.connection.socket) {
        try {
          connectionEntity.connection.socket.close();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
    
    // Clear maps
    this.connections.clear();
    this.clientUpdateBuffer.clear();
    
    super.destroy();
  }
}

module.exports = ConnectionSystem;