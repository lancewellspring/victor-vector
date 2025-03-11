/**
 * Network Component for client-side entities
 * Handles synchronization with server
 */

// Get access to the component registry
const registry = typeof window !== 'undefined' ? window.ECS : require('../../shared/components');

/**
 * Create a default Network component
 * @returns {Object} Default network component data
 */
function createNetwork() {
  return {
    // Entity network ID assigned by server
    networkId: null,
    
    // Last server state received for reconciliation
    serverState: null,
    
    // Input sequence number for reconciliation
    inputSequence: 0,
    
    // Last acknowledged input from server
    lastAcknowledgedInput: 0,
    
    // Flag to determine if entity is owned by this client
    isOwned: false,
    
    // Buffer of pending inputs
    inputBuffer: []
  };
}

// Register the component
if (typeof window !== 'undefined') {
  window.ECS.registerComponent('network', createNetwork);
  window.ECS.createNetwork = createNetwork;
}

// No need to export for Node.js - client-only component