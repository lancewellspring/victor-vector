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
    
    const physicsSystem = this.world.systems.find(sys => sys instanceof PhysicsSystem);
    if (!physicsSystem) return;
    
    // Find player entity (with input and physics components)
    const playerEntities = this.world.with('input', 'physics'); //not include transform?
    
    for (const entity of playerEntities) {
      // Skip entities that aren't player controlled
      if (!entity.input.isPlayerControlled) continue;
      
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
        physicsSystem.moveCharacter(entity, moveDirection);
      }
      
      // Handle jumping
      if ((this.isKeyDown('ArrowUp') || this.isKeyDown('w') || this.isKeyDown(' ')) && 
          entity.physics.grounded) {
        physicsSystem.jumpCharacter(entity);
      }
    }
    
    // Store key states for next frame
    this.previousKeys = {...this.keys};
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