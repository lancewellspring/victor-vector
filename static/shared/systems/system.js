// static/shared/systems/system.js
/**
 * Base System class for the ECS architecture
 */
export class System {
  constructor() {
    this.world = null;
    this.enabled = true;
    this.priority = 0;
    this.name = this.constructor.name;
  }
  
  /**
   * Initialize the system with a world reference
   * @param {Object} world - The Miniplex world
   */
  init(world) {
    this.world = world;
    return this;
  }
  
  /**
   * Update method called each frame
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
  
  /**
   * Clean up resources when system is destroyed
   */
  destroy() {
    // Override in subclasses if needed
  }
}