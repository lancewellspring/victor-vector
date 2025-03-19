/**
 * World module that wraps Miniplex functionality for the ECS architecture
 */
import { World as MiniplexWorld } from 'miniplex';
import eventBus from '../utils/event-bus.js';

/**
 * Create a new ECS World with additional helper methods
 * @returns {Object} Extended Miniplex World
 */
function createWorld() {
  // Create the base Miniplex world
  const world = new MiniplexWorld();
  world.events = eventBus;
  
  /**
   * Helper to create an entity with components
   * @param {Object} components - Initial components to add
   * @returns {Object} - The created entity
   */
  world.createEntity = function(components = {}) {
    // Generate a unique ID if not provided
    if (!components.id) {
      components.id = this.generateEntityId();
    }

    // Validate required component combinations
    this.validateComponents(components);

    // Create the entity
    const entity = this.add(components);

    // Emit entity created event
    this.events.emit('entityCreated', { entity });

    return entity;
  };
  
  world.generateEntityId = function() {
    return 'entity_' + Math.random().toString(36).substr(2, 9);
  };
  
  /**
   * Helper to remove an entity
   * @param {Object} entity - The entity to remove
   */
  world.removeEntity = function(entity) {
    this.events.emit('entityRemoved', { entity });
    return this.remove(entity);
  };
  
  world.validateComponents = function(components) {
    const componentTypes = Object.keys(components);

    // Define required combinations
    const requiredCombinations = [
      { has: ['render'], requires: ['transform'] },
      { has: ['physics'], requires: ['transform'] }
    ];

    // Check each combination
    for (const rule of requiredCombinations) {
      const hasAll = rule.has.every(type => componentTypes.includes(type));
      if (hasAll) {
        const missingRequired = rule.requires.filter(type => !componentTypes.includes(type));
        if (missingRequired.length > 0) {
          throw new Error(`Entity with ${rule.has.join(', ')} must also have ${missingRequired.join(', ')}`);
        }
      }
    }
  };
  
  /**
   * Get a specific entity by ID
   * @param {string|number} id - Entity ID
   * @returns {Object|null} Entity or null if not found
   */
  world.getEntity = function(id) {
    return this.entities.find(entity => entity.id === id) || null;
  };
  
  /**
   * Enhanced with method with better error handling
   * Filter entities that have all specified components
   * @param {...string} componentNames - Names of required components
   * @returns {Array} - Filtered entities
   */
  world.with = function(...componentNames) {
    // Original implementation might cause errors if entities lack expected structure
    // This safer version ensures we check for component existence properly
    
    return this.entities.where(({entity}) => {
      if (!entity) return false;
      
      return componentNames.every(componentName => {
        // Check if the entity has the component (component exists and is not null/undefined)
        return Object.prototype.hasOwnProperty.call(entity, componentName) && 
               entity[componentName] != null;
      });
    });
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
    // Process any deferred events before updating systems
    this.events.processEvents();
    for (const system of this.systems) {
      if (!system.enabled) continue;
      system.update(deltaTime);
    }
    // Process events again after updates
    this.events.processEvents();
  };
  
  return world;
}

export { createWorld };