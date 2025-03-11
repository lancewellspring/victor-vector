import { System } from '@shared/ecs/system';
/**
 * Network System for client-side networking
 * Handles communication with the server
 */


export class NetworkSystem extends System {
  constructor() {
    super();
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.serverUrl = null;
    this.clientId = null;
    this.pendingMessages = [];
    this.messageHandlers = {};
  }
  
  /**
   * Initialize the network connection
   * @param {string} serverUrl - WebSocket server URL
   */
  connect(serverUrl) {
    // Automatically detect if we need secure WebSockets based on the page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    this.serverUrl = serverUrl || `${protocol}//${host}/ws`;

    console.log(`Connecting to server at ${this.serverUrl}`);
    this.socket = new WebSocket(this.serverUrl);

    this.socket.onopen = this.handleConnect.bind(this);
    this.socket.onclose = this.handleDisconnect.bind(this);
    this.socket.onerror = this.handleError.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
  }
  
  /**
   * Handle successful connection
   */
  handleConnect() {
    console.log('Connected to server');
    this.connected = true;
    
    // Send any pending messages
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.sendMessage(message.type, message.data);
    }
    
    // Send join message to server
    this.sendMessage('join', {
      clientId: this.clientId
    });
  }
  
  /**
   * Handle disconnection
   */
  handleDisconnect(event) {
    console.log(`Disconnected from server: ${event.code} ${event.reason}`);
    this.connected = false;
    
    // Attempt reconnection after delay
    if (!this.reconnecting) {
      this.reconnecting = true;
      setTimeout(() => {
        this.reconnecting = false;
        this.connect(this.serverUrl);
      }, 3000);
    }
  }
  
  /**
   * Handle connection error
   */
  handleError(error) {
    console.error('WebSocket error:', error);
  }
  
  /**
   * Handle incoming message
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type && this.messageHandlers[message.type]) {
        this.messageHandlers[message.type](message.data);
      } else {
        console.warn('Unknown message type:', message.type);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  }
  
  /**
   * Send message to server
   * @param {string} type - Message type
   * @param {Object} data - Message payload
   */
  sendMessage(type, data) {
    const message = JSON.stringify({
      type,
      data
    });
    
    if (this.connected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      // Queue message to send when connected
      this.pendingMessages.push({ type, data });
    }
  }
  
  /**
   * Register message handler
   * @param {string} type - Message type
   * @param {Function} handler - Message handler function
   */
  registerHandler(type, handler) {
    this.messageHandlers[type] = handler;
  }
  
  /**
   * Send player input to server
   * @param {Object} input - Player input data
   * @param {number} sequence - Input sequence number
   */
  sendInput(input, sequence) {
    this.sendMessage('input', {
      sequence,
      input
    });
  }
  
  /**
   * Update method called each frame
   * @param {number} deltaTime - Time in seconds since last update
   */
  update(deltaTime) {
    // Replace the archetype call with a proper Miniplex query
    // Using Miniplex's query API instead of 'archetype'
    
    // Option 1: If you're using Miniplex's "with" function:
    const networkEntities = this.world.with('network');
    
    // Option 2: If you need to filter entities with a specific component
    // const networkEntities = this.world.entities.filter(entity => 'network' in entity);
    
    for (const entity of networkEntities) {
      if (entity.network.isOwned) {
        // Handle owned entity (local player)
        // Your code here...
      } else {
        // Handle remote entity interpolation
        // Your code here...
      }
    }
  }
}