/**
 * World module that wraps Miniplex functionality for the ECS architecture
 */
import { World as MiniplexWorld } from 'miniplex';

/**
 * Create a new ECS World with additional helper methods
 * @returns {Object} Extended Miniplex World
 */
function createWorld() {
  // Create the base Miniplex world
  const world = new MiniplexWorld();
  
  // Add custom functionality to the world
  
  /**
   * Helper to create an entity with components
   * @param {Object} components - Initial components to add
   * @returns {Object} - The created entity
   */
  world.createEntity = function(components = {}) {
    return this.add(components);
  };
  
  /**
   * Helper to remove an entity
   * @param {Object} entity - The entity to remove
   */
  world.removeEntity = function(entity) {
    return this.remove(entity);
  };
  
  /**
   * Register a system to run on each update
   * @param {Object} system - System object with update method
   * @param {number} priority - Execution priority (lower runs first)
   */
  world.systems = [];
  world.registerSystem = function(system, priority = 0) {
    system.priority = priority;
    system.world = this;
    this.systems.push(system);
    
    // Sort systems by priority
    this.systems.sort((a, b) => a.priority - b.priority);
    return system;
  };
  
  /**
   * Update all registered systems
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  world.update = function(deltaTime) {
    for (const system of this.systems) {
      if (!system.enabled) continue;
      system.update(deltaTime);
    }
  };
  
  return world;
}

export { createWorld };