import { registerComponent } from './registry.js';

/**
 * Physics Component - Handles physical properties and collision
 * @returns {Object} Default physics component data
 */
function createPhysics() {
  return {
    // Physics body type
    bodyType: 'dynamic', // dynamic, static, kinematic
    
    // Collider properties
    colliderType: 'box', // box, circle, convex, etc.
    width: 1,
    height: 1,
    depth: 1,
    radius: 0.5,
    
    // Physics material properties
    friction: 0.2,
    restitution: 0.2, // Bounciness
    
    // Physics state
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    
    // Gravity multiplier (1.0 = normal gravity)
    gravityScale: 1.0,
    
    // Collision groups and masks
    collisionGroup: 1,
    collisionMask: 0xFFFF, // Collide with everything by default
    
    // Rapier.js references (will be set by PhysicsSystem)
    rigidbody: null,
    collider: null,
    
    // For character controller
    isCharacter: false,
    grounded: false,
    
    // For network synchronization
    lastProcessedInput: 0
  };
}

registerComponent('physics', createPhysics);

export { createPhysics };