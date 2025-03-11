/**
 * Physics Component
 * Represents physics properties for an entity
 */

// Get access to the component registry
import {registerComponent} from './index'

/**
 * Create a default Physics component
 * @returns {Object} Default physics data
 */
function createPhysics() {
  return {
    // Velocity vector
    velocityX: 0,
    velocityY: 0,
    
    // Acceleration vector
    accelerationX: 0,
    accelerationY: 0,
    
    // Mass affects physics calculations
    mass: 1,
    
    // Collision properties
    collider: {
      type: 'box', // box, circle, etc.
      width: 1,
      height: 1,
      radius: 0.5, // For circle colliders
      offset: { x: 0, y: 0 } // Offset from transform position
    },
    
    // Physics material properties
    friction: 0.2,
    restitution: 0.2, // Bounciness
    
    // Physics body type
    bodyType: 'dynamic', // dynamic, static, kinematic
    
    // Collision flags
    isSensor: false,
    collisionLayer: 1,  // What layer this entity is on
    collisionMask: 1,   // What layers this entity collides with
    
    // Reference for physics engine
    body: null, // Will store reference to Rapier body
    
    // For client-server reconciliation
    lastProcessedInput: 0
  };
}

// Register the component
registerComponent.registerComponent('physics', createPhysics);

export {
  createPhysics
};