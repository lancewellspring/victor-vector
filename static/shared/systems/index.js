/**
 * Systems Registry
 * Manages system types and provides utilities for system registration
 */

// Systems registry object
const Systems = {};

/**
 * Register a system type
 * @param {string} name - System name
 * @param {Class} SystemClass - System class (should extend System)
 */
function registerSystem(name, SystemClass) {
  // Verify the class extends System
  if (!(SystemClass.prototype instanceof System)) {
    console.warn(`System ${name} does not extend the System base class`);
  }
  
  Systems[name] = SystemClass;
}

/**
 * Create a system instance
 * @param {string} name - System name
 * @param {Object} config - Configuration options
 * @returns {System} System instance
 */
function createSystem(name, config = {}) {
  if (!Systems[name]) {
    throw new Error(`System type "${name}" not registered`);
  }
  
  const system = new Systems[name](config);
  return system;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = {
    Systems,
    registerSystem,
    createSystem
  };
} else {
  window.ECS = window.ECS || {};
  window.ECS.Systems = Systems;
  window.ECS.registerSystem = registerSystem;
  window.ECS.createSystem = createSystem;
}