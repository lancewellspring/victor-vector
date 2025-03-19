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
    this.eventSubscriptions = [];
  }
  
  /**
   * Initialize the system with a world reference
   * @param {Object} world - The Miniplex world
   */
  init(world) {
    this.world = world;
    this.registerEvents();
    return this;
  }
  
  /**
   * Register event handlers
   * Override in subclasses to add event handling
   */
  registerEvents() {
    // Override in subclasses
  }
  
   /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event occurs
   */
  subscribe(event, callback) {
    const unsubscribe = this.world.events.on(event, callback, this);
    this.eventSubscriptions.push(unsubscribe);
    return unsubscribe;
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
    // Unsubscribe from all events
    for (const unsubscribe of this.eventSubscriptions) {
      unsubscribe();
    }
    this.eventSubscriptions = [];
  }
}