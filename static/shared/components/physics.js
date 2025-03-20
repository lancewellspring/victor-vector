import { registerComponent } from './registry.js';

/**
 * Physics Component - Handles physical properties and collision
 * @returns {Object} Default physics component data
 */
// static/shared/components/physics.js
function createPhysics() {
  return {
    // Physics body type
    bodyType: 'dynamic', // dynamic, static, kinematic, character
    
    // Collider properties
    colliderType: 'box', // box, circle, convex, heightfield
    
    // Dimensions (used based on colliderType)
    width: 1,
    height: 1,
    radius: 0.5,
    points: [], // For convex/heightfield colliders
    
    // Physics properties
    friction: 0.2,
    restitution: 0.2,
    
    // Movement state
    velocity: { x: 0, y: 0 },
    grounded: false,
    
    // Character controller specific
    isCharacter: false,
    jumpForce: 5,
    moveSpeed: 3,
    maxSlope: 45, // degrees
    
    // References (set by physics system)
    rigidBody: null,
    collider: null,
    controller: null,
    
    // Network state
    lastProcessedInput: 0
  };
}

registerComponent('physics', createPhysics);

export { createPhysics };