import { registerComponent } from './registry.js';

/**
 * Transform Component - Handles position, rotation, and scale of entities
 * @returns {Object} Default transform component data
 */
function createTransform() {
  return {
    // Position
    x: 0,
    y: 0,
    z: 0,
    
    // Rotation (in radians)
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    
    // Scale (1 is default size)
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    
    // Parent entity ID for hierarchical transformations (null means root)
    parent: null,
    
    // Whether physics should update this transform
    physicsControlled: false,
    
    // For interpolation between physics steps
    previousX: 0,
    previousY: 0,
    previousZ: 0
  };
}

// Register the component
registerComponent('transform', createTransform);

export { createTransform };