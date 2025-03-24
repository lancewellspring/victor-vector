/**
 * Server-side physics component
 * Handles authoritative physics state on the server
 */

// Use shared components registry
import { registerComponent } from '../../static/shared/components/registry';

/**
 * Create a default ServerPhysics component
 * @returns {Object} Default server physics component data
 */
function createServerPhysics() {
  return {
    // Reference to Rapier body (managed by server physics system)
    rigidbody: null,
    
    // Last processed client input
    lastProcessedInput: 0,
    
    // Validated position information
    position: { x: 0, y: 0 },
    rotation: 0,
    
    // Movement properties
    velocity: { x: 0, y: 0 },
    grounded: false,
    
    // For interpolation and detection of cheating
    previousPositions: [],
    
    // Character controller properties (if applicable)
    isCharacter: false,
    maxSpeed: 5,
    jumpForce: 10,
    
    // Collision history
    collisionEvents: [],
    
    // Validation flags
    needsValidation: false,
    validationErrors: [],
    
    // Sync flag
    needsSync: true
  };
}

// Register component for use in ECS
registerComponent('serverPhysics', createServerPhysics);

// Export for use in other server modules
export {
  createServerPhysics
};