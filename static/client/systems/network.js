import { System } from "@shared/systems/system";
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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
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
    console.log("Connected to server");
    this.connected = true;

    // Send any pending messages
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.sendMessage(message.type, message.data);
    }

    // Send join message to server
    this.sendMessage("join", {
      clientId: this.clientId,
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
    console.error("WebSocket error:", error);
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
        console.warn("Unknown message type:", message.type);
      }
    } catch (e) {
      console.error("Error parsing message:", e);
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
      data,
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
    this.sendMessage("input", {
      sequence,
      input,
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
    const networkEntities = this.world.with("network");

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

  /**
   * Send player input to server with prediction
   * @param {Object} entity - Player entity
   * @param {Object} input - Input state
   */
  sendPlayerInput(entity, input) {
    if (!entity || !entity.network || !entity.network.isOwned) return;

    // Generate sequence number
    const sequence = entity.network.inputSequence++;

    // Store input for reconciliation
    entity.network.inputBuffer.push({
      sequence,
      input: { ...input },
      timestamp: performance.now(),
    });

    // Apply input locally (prediction)
    this.applyInput(entity, input);

    // Send to server
    this.sendMessage("input", {
      sequence,
      entityId: entity.network.networkId,
      input,
    });
  }

  /**
   * Apply input to entity
   * @param {Object} entity - Entity to apply input to
   * @param {Object} input - Input state
   */
  applyInput(entity, input) {
    // Find physics system
    const physicsSystem = this.world.systems.find(
      (sys) => sys.name === "PhysicsSystem"
    );
    if (!physicsSystem) return;

    // Apply movement based on input
    if (input.moveDirection) {
      physicsSystem.moveCharacter(entity, {
        x: input.moveDirection * 5 * (1 / 60), // Assuming 60fps
        y: 0,
      });
    }

    // Apply jump if requested
    if (input.jump && entity.physics && entity.physics.grounded) {
      physicsSystem.moveCharacter(entity, {
        x: 0,
        y: 10 * (1 / 60), // Assuming 60fps
      });
      entity.physics.grounded = false;
    }
  }

  /**
   * Handle server state update with reconciliation
   * @param {Object} data - Server state data
   */
  handleServerState(data) {
    for (const entityState of data.entities) {
      const entity = this.findNetworkEntity(entityState.id);
      if (!entity) continue;

      if (entity.network.isOwned) {
        // This is our player, reconcile prediction
        this.reconcileState(entity, entityState);
      } else {
        // Remote entity, just update
        this.updateEntityState(entity, entityState);
      }
    }
  }

  /**
   * Reconcile local prediction with server state
   * @param {Object} entity - Local entity
   * @param {Object} serverState - Server entity state
   */
  reconcileState(entity, serverState) {
    // Get last acknowledged input
    const lastAck = serverState.lastProcessedInput;
    entity.network.lastAcknowledgedInput = lastAck;

    // Remove acknowledged inputs from buffer
    entity.network.inputBuffer = entity.network.inputBuffer.filter(
      (input) => input.sequence > lastAck
    );

    // Check if reconciliation is needed
    const needsReconciliation = this.checkReconciliationNeeded(
      entity,
      serverState
    );

    if (needsReconciliation) {
      // Set authoritative state
      this.updateEntityState(entity, serverState);

      // Reapply remaining inputs
      for (const input of entity.network.inputBuffer) {
        this.applyInput(entity, input.input);
      }
    }
  }

  /**
   * Check if entity needs reconciliation
   * @param {Object} entity - Local entity
   * @param {Object} serverState - Server entity state
   * @returns {boolean} Whether reconciliation is needed
   */
  checkReconciliationNeeded(entity, serverState) {
    // Simple position threshold check
    const positionThreshold = 0.5; // Units

    const dx = Math.abs(entity.transform.x - serverState.position.x);
    const dy = Math.abs(entity.transform.y - serverState.position.y);

    return dx > positionThreshold || dy > positionThreshold;
  }

  /**
   * Update entity state from server
   * @param {Object} entity - Entity to update
   * @param {Object} state - Server state
   */
  updateEntityState(entity, state) {
    // Update position
    entity.transform.x = state.position.x;
    entity.transform.y = state.position.y;

    // Update physics state if needed
    if (entity.physics && state.physics) {
      entity.physics.velocity.x = state.physics.velocity.x;
      entity.physics.velocity.y = state.physics.velocity.y;
      entity.physics.grounded = state.physics.grounded;
    }

    // Update player state if needed
    if (entity.player && state.player) {
      // Update player-specific state
    }
  }

  /**
   * Find entity by network ID
   * @param {string} networkId - Network ID
   * @returns {Object} Entity or null
   */
  findNetworkEntity(networkId) {
    return this.world.entities.find(
      (entity) => entity.network && entity.network.networkId === networkId
    );
  }
}
