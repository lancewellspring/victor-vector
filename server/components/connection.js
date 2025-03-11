/**
 * Connection Component for server-side entities
 * Manages WebSocket connections and input buffering
 */

// Get access to the component registry
const { registerComponent } = require('../../static/shared/components');

/**
 * Create a default Connection component
 * @returns {Object} Default connection component data
 */
function createConnection() {
  return {
    // WebSocket reference
    socket: null,
    
    // Client ID
    clientId: null,
    
    // Last processed input sequence
    lastProcessedInput: 0,
    
    // Input buffer for handling received inputs
    inputBuffer: [],
    
    // Last time a message was received (for timeout detection)
    lastMessageTime: Date.now(),
    
    // Player entity ID
    playerEntityId: null
  };
}

// Register the component
registerComponent('connection', createConnection);

module.exports = {
  createConnection
};