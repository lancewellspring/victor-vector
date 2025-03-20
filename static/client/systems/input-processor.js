// static/client/systems/input-processor.js
import { System } from '@shared/systems/system';

export class InputProcessorSystem extends System {
  constructor() {
    super();
    this.name = 'InputProcessorSystem';
    this.priority = 15; // Run after input but before player system
    this.dependsOn('InputSystem', 'PlayerSystem');
  }
  
  init(world) {
    super.init(world);
    
    // Set up key mappings for skills
    this.skillKeyMap = {
      // Weapon skills
      'mouse0': 'weapon', // Left mouse
      
      // Movement skills
      'Space': 'movement',
      
      // Defense skills
      'ShiftLeft': 'defense',
      'ShiftRight': 'defense',
      
      // Utility skills
      'q': 'utility1',
      'e': 'utility2',
      
      // Add more mappings as needed
    };
    
    return this;
  }
  
  update(deltaTime) {
    // Get the input system
    const inputSystem = this.getSystem('InputSystem');
    const playerSystem = this.getSystem('PlayerSystem');
    
    if (!inputSystem || !playerSystem) return;
    
    // Process each player-controlled entity
    const playerEntities = this.world.with('player', 'input');
    
    for (const entity of playerEntities) {
      if (!entity.input.isPlayerControlled) continue;
      
      // Process movement input
      this.processMovementInput(entity, inputSystem);
      
      // Process skill activation
      this.processSkillInput(entity, inputSystem, playerSystem);
      
      // Process resource gathering (contextual)
      this.processGatheringInput(entity, inputSystem);
    }
  }
  
  /**
   * Process movement input
   * @param {Object} entity - Player entity
   * @param {Object} inputSystem - Reference to input system
   */
  processMovementInput(entity, inputSystem) {
    // Basic movement is already handled by InputSystem directly,
    // but we could add character-specific modifications here
    
    // For example, modify movement based on player state
    if (entity.player.state === 'gathering') {
      // Slow movement while gathering
      entity.input.moveModifier = 0.5;
    } else {
      entity.input.moveModifier = 1.0;
    }
  }
  
  /**
   * Process skill activation input
   * @param {Object} entity - Player entity
   * @param {Object} inputSystem - Reference to input system
   * @param {Object} playerSystem - Reference to player system
   */
  processSkillInput(entity, inputSystem, playerSystem) {
    // Check each key mapping for skill activation
    for (const [key, skillType] of Object.entries(this.skillKeyMap)) {
      if (inputSystem.isKeyPressed(key)) {
        // Try to activate the skill
        playerSystem.activateSkill(entity, skillType);
      }
    }
  }
  
  /**
   * Process resource gathering input (contextual)
   * @param {Object} entity - Player entity
   * @param {Object} inputSystem - Reference to input system
   */
  processGatheringInput(entity, inputSystem) {
    // For now, we'll use 'F' key for gathering
    if (inputSystem.isKeyPressed('f')) {
      // Check if near a resource node
      this.attemptGathering(entity);
    }
  }
  
  /**
   * Attempt to gather resources if near a node
   * @param {Object} entity - Player entity
   */
  attemptGathering(entity) {
    // In a real implementation, we'd check for nearby resource nodes
    // using collision detection or a spatial query
    
    // For now, just emit an event that other systems can listen for
    this.world.events.emit('gatheringAttempted', { entity });
  }
}