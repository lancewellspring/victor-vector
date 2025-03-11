/**
 * Connection System for server-side networking
 * Manages client connections and message handling
 */

// Import System base class
const { System } = require('../../static/shared/ecs');
const { createComponent } = require('../../static/shared/components');

class ConnectionSystem extends System {
  constructor(wss) {
    super();
    this.wss = wss;
    this.connections = new Map();
    this.messageHandlers = {};
  }
  
  /**
   * Initialize the system with WebSocket server
   * @param {WebSocket.Server} wss - WebSocket server instance
   */
  init(world, wss = null) {
    super.init(world);
    
    if (wss) {
      this.wss = wss;
    }
    
    if (!this.wss) {
      throw new Error('ConnectionSystem requires a WebSocket server');
    }
    
    // Set up connection handling
    this.wss.on('connection', this.handleNewConnection.bind(this));
    
    // Register default message handlers
    this.registerHandler('join', this.handleJoin.bind(this));
    this.registerHandler('input', this.handleInput.bind(this));
    
    return this;
  }
  
  /**
   * Handle new WebSocket connection
   * @param {WebSocket} socket - The new client WebSocket
   */
  handleNewConnection(socket) {
    console.log('New client connected');
    
    // Generate client ID
    const clientId = this.generateClientId();
    
    // Create connection entity
    const connectionEntity = this.world.createEntity({
      connection: createComponent('connection', {
        socket,
        clientId,
        lastMessageTime: Date.now()
      })
    });
    
    // Store connection by client ID
    this.connections.set(clientId, connectionEntity);
    
    // Set up message handling
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        connectionEntity.connection.lastMessageTime = Date.now();
        
        if (data.type && this.messageHandlers[data.type]) {
          this.messageHandlers[data.type](connectionEntity, data.data);
        } else {
          console.warn('Unknown message type:', data.type);
        }
      } catch (e) {
        console.error('Error handling message:', e);
      }
    });
    
    // Handle disconnection
    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });
  }
  
  /**
   * Handle client disconnection
   * @param {string} clientId - ID of disconnected client
   */
  handleDisconnection(clientId) {
    console.log(`Client ${clientId} disconnected`);
    
    const connectionEntity = this.connections.get(clientId);
    if (connectionEntity) {
      // Remove player entity if it exists
      if (connectionEntity.connection.playerEntityId) {
        const playerEntity = this.world.getEntity(connectionEntity.connection.playerEntityId);
        if (playerEntity) {
          this.world.removeEntity(playerEntity);
        }
      }
      
      // Remove connection entity
      this.world.removeEntity(connectionEntity);
      this.connections.delete(clientId);
    }
  }
  
  /**
   * Generate unique client ID
   * @returns {string} Unique client ID
   */
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Register message handler
   * @param {string} type - Message type
   * @param {Function} handler - Handler function
   */
  registerHandler(type, handler) {
    this.messageHandlers[type] = handler;
  }
  
  /**
   * Handle join message
   * @param {Object} connectionEntity - Connection entity
   * @param {Object} data - Join message data
   */
  handleJoin(connectionEntity, data) {
    console.log(`Client ${connectionEntity.connection.clientId} joining`);
    
    // We'll implement player creation later
  }
  
  /**
   * Handle input message
   * @param {Object} connectionEntity - Connection entity
   * @param {Object} data - Input message data
   */
  handleInput(connectionEntity, data) {
    // Add input to buffer for processing
    connectionEntity.connection.inputBuffer.push({
      sequence: data.sequence,
      input: data.input,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send message to specific client
   * @param {string} clientId - Target client ID
   * @param {string} type - Message type
   * @param {Object} data - Message payload
   */
  sendToClient(clientId, type, data) {
    const connectionEntity = this.connections.get(clientId);
    if (!connectionEntity) return;
    
    const socket = connectionEntity.connection.socket;
    if (socket.readyState === 1) { // OPEN
      socket.send(JSON.stringify({ type, data }));
    }
  }
  
  /**
   * Broadcast message to all connected clients
   * @param {string} type - Message type
   * @param {Object} data - Message payload
   * @param {string} excludeClientId - Client ID to exclude
   */
  broadcast(type, data, excludeClientId = null) {
    for (const [clientId, connectionEntity] of this.connections) {
      if (excludeClientId && clientId === excludeClientId) continue;
      
      this.sendToClient(clientId, type, data);
    }
  }
  
  /**
   * Update method called each frame
   * @param {number} deltaTime - Time in seconds since last update
   */
  update(deltaTime) {
    // Check for timeouts
    const now = Date.now();
    const timeoutThreshold = 30000; // 30 seconds
    
    for (const [clientId, connectionEntity] of this.connections) {
      const connection = connectionEntity.connection;
      
      if (now - connection.lastMessageTime > timeoutThreshold) {
        console.log(`Client ${clientId} timed out`);
        
        // Close socket and handle disconnection
        if (connection.socket.readyState === 1) { // OPEN
          connection.socket.close(1001, "Connection timeout");
        }
        
        this.handleDisconnection(clientId);
      }
    }
  }
}

module.exports = { ConnectionSystem };