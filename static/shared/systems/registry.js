/**
 * System Registry - Central registration and management for systems
 */
export class SystemRegistry {
  constructor() {
    this.systems = [];
  }
  
  /**
   * Register a system with the registry
   * @param {System} system - System instance
   * @param {number} priority - Update priority (lower runs first)
   * @returns {System} The registered system
   */
  register(system, priority = 0) {
    system.priority = priority;
    this.systems.push(system);
    
    // Sort systems by priority
    this.systems.sort((a, b) => a.priority - b.priority);
    
    return system;
  }
  
  /**
   * Initialize all systems with a world reference
   * @param {Object} world - Miniplex world reference
   */
  initAll(world) {
    for (const system of this.systems) {
      system.init(world);
    }
  }
  
  /**
   * Update all systems
   * @param {number} deltaTime - Time in seconds since last update
   */
  updateAll(deltaTime) {
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
  }
  
  /**
   * Get a system by class
   * @param {Class} SystemClass - The system class to find
   * @returns {System|null} The system instance or null if not found
   */
  getSystem(SystemClass) {
    return this.systems.find(system => system instanceof SystemClass) || null;
  }
  
  /**
   * Destroy all systems and clean up resources
   */
  destroyAll() {
    for (const system of this.systems) {
      system.destroy();
    }
    this.systems = [];
  }
}