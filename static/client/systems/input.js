// static/client/systems/input.js
import { System } from '@shared/systems/system.js';
import { PhysicsSystem } from '@shared/systems/physics.js';

export class InputSystem extends System {
  constructor() {
    super();
    this.priority = 5; // Input should be processed early
    this.keys = {};
    this.previousKeys = {};
    this.hasFocus = true;
    this.initialized = false;
    
    // Input settings
    this.MOVE_SPEED = 5;
    this.JUMP_FORCE = 10;
  }
  
  init(world) {
    super.init(world);
    
    // Set up event listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    this.initialized = true;
    return this;
  }
  
  handleKeyDown(event) {
    this.keys[event.key] = true;
  }
  
  handleKeyUp(event) {
    this.keys[event.key] = false;
  }
  
  handleBlur() {
    this.hasFocus = false;
    this.clearKeys();
  }
  
  handleFocus() {
    this.hasFocus = true;
  }
  
  handleVisibilityChange() {
    if (document.hidden) {
      this.hasFocus = false;
      this.clearKeys();
    } else {
      this.hasFocus = true;
    }
  }
  
  clearKeys() {
    // Clear all key states when losing focus
    for (const key in this.keys) {
      this.keys[key] = false;
    }
  }
  
  isKeyDown(key) {
    return this.keys[key] === true;
  }
  
  isKeyPressed(key) {
    return this.keys[key] === true && this.previousKeys[key] !== true;
  }
  
  isKeyReleased(key) {
    return this.keys[key] !== true && this.previousKeys[key] === true;
  }
  
  update(deltaTime) {
    if (!this.initialized || !this.hasFocus) return;
    
    // Find all player-controlled entities (entities with input component)
    const inputEntities = this.world.with('input', 'transform', 'physics');
    
    for (const entity of inputEntities) {
      this.processEntityInput(entity, deltaTime);
    }
    
    // Store key states for next frame
    this.previousKeys = {...this.keys};
  }
  
  processEntityInput(entity, deltaTime) {
    const { input, physics } = entity;
    
    // Skip if not player controlled
    if (!input.isPlayerControlled) return;
    
    // Calculate movement direction
    let moveDirection = 0;
    
    if (this.isKeyDown('ArrowLeft') || this.isKeyDown('a')) {
      moveDirection -= 1;
    }
    
    if (this.isKeyDown('ArrowRight') || this.isKeyDown('d')) {
      moveDirection += 1;
    }
    
    // Apply movement
    if (moveDirection !== 0) {
      // If we have a physics system and this is a character controller
      if (physics.isCharacter) {
        // Get reference to physics system
        const physicsSystem = this.world.systems.find(sys => sys instanceof PhysicsSystem);
        if (physicsSystem) {
          physicsSystem.moveCharacter(entity, {
            x: moveDirection * this.MOVE_SPEED * deltaTime,
            y: 0
          });
          
          // Update facing direction in input component
          input.facing = moveDirection > 0 ? 'right' : 'left';
        }
      } else {
        // Otherwise, apply direct velocity change
        physics.velocity.x = moveDirection * this.MOVE_SPEED;
      }
    } else if (!physics.isCharacter) {
      // Slow down if no direction keys pressed (for non-character controllers)
      physics.velocity.x *= 0.9;
    }
    
    // Handle jumping
    if (physics.grounded && (this.isKeyPressed('ArrowUp') || this.isKeyPressed('w') || this.isKeyPressed(' '))) {
      // Apply jump force
      if (physics.isCharacter) {
        const physicsSystem = this.world.systems.find(sys => sys instanceof PhysicsSystem);
        if (physicsSystem) {
          physicsSystem.moveCharacter(entity, {
            x: 0,
            y: this.JUMP_FORCE * deltaTime
          });
        }
      } else {
        // Apply impulse for non-character controllers
        physics.velocity.y = this.JUMP_FORCE;
      }
      
      // Set grounded to false immediately to prevent multiple jumps
      physics.grounded = false;
    }
  }
  
  destroy() {
    // Remove event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.initialized = false;
  }
}