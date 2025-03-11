/**
 * Base System class for the ECS architecture
 */
class System {
  constructor() {
    this.priority = 0;
    this.world = null;
    this.enabled = true;
  }
  
  /**
   * Update method called each frame
   * Should be overridden by subclasses
   * @param {number} deltaTime - Time in seconds since last update
   */
  update(deltaTime) {
    // Override in subclasses
  }
  
  /**
   * Enable the system
   */
  enable() {
    this.enabled = true;
    return this;
  }
  
  /**
   * Disable the system
   */
  disable() {
    this.enabled = false;
    return this;
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = { System };
} else {
  window.ECS = window.ECS || {};
  window.ECS.System = System;
}