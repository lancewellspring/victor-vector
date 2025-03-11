/**
 * Component Registry
 * Manages component types and provides utilities for component creation
 */

// Component registry object
const Components = {};

/**
 * Register a component type with an initialization function
 * @param {string} name - Component name
 * @param {Function} initFn - Function that creates component data
 */
function registerComponent(name, initFn) {
  Components[name] = initFn;
}

/**
 * Create a component instance
 * @param {string} name - Component name
 * @param {Object} data - Initial data to merge with defaults
 * @returns {Object} Component data
 */
function createComponent(name, data = {}) {
  if (!Components[name]) {
    throw new Error(`Component type "${name}" not registered`);
  }
  
  // Create default component data and merge with provided data
  const defaults = Components[name]();
  return { ...defaults, ...data };
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = {
    Components,
    registerComponent,
    createComponent
  };
} else {
  window.ECS = window.ECS || {};
  window.ECS.Components = Components;
  window.ECS.registerComponent = registerComponent;
  window.ECS.createComponent = createComponent;
}