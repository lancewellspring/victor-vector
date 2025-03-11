/**
 * Transform Component
 * Represents position, rotation, and scale of an entity
 */

// Get access to the component registry
const registry = typeof require !== 'undefined' 
  ? require('./index')
  : window.ECS;

/**
 * Create a default Transform component
 * @returns {Object} Default transform data
 */
function createTransform() {
  return {
    // Position vector
    x: 0,
    y: 0,
    z: 0,
    
    // Rotation (in radians)
    rotation: 0,
    
    // Scale (1 is default size)
    scaleX: 1,
    scaleY: 1,
    
    // Optional parent entity ID for hierarchical transformations
    parent: null,
    
    // Flag to determine if coordinates are in local or world space
    local: true
  };
}

// Register the component
registry.registerComponent('transform', createTransform);

// Export for both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = {
    createTransform
  };
} else {
  window.ECS = window.ECS || {};
  window.ECS.createTransform = createTransform;
}