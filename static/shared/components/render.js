import { registerComponent } from './registry.js';

/**
 * Render Component - Handles visual representation of entities
 * @returns {Object} Default render component data
 */
function createRender() {
  return {
    // Visual type
    type: 'mesh', // mesh, sprite, particle, etc.
    
    // Mesh properties
    geometry: null, // Will hold reference to THREE.js geometry
    material: null, // Will hold reference to THREE.js material
    mesh: null, // Will hold reference to THREE.js mesh
    
    // Visual settings
    color: 0xffffff,
    opacity: 1.0,
    visible: true,
    castShadow: true,
    receiveShadow: true,
    
    // Model reference (if using external model)
    modelUrl: null,
    
    // Animation state
    animations: [],
    currentAnimation: null,
    
    // For tracking visual state
    needsUpdate: true
  };
}

registerComponent('render', createRender);

export { createRender };