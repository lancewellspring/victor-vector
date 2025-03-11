import { World } from 'miniplex';
import { SystemRegistry } from '../shared/systems/registry.js';
import { TerrainSystem } from '../shared/systems/terrain.js';
import { ClientPhysicsSystem } from './systems/physics.js';
import { TerrainRendererSystem } from './systems/terrain-renderer.js';
import { RenderSystem } from './systems/render.js';
import { InputSystem } from './systems/input.js';
import { CameraSystem } from './systems/camera.js';
import { BackgroundSystem } from './systems/background.js';

export class GameWorld {
  constructor() {
    // Create Miniplex world
    this.world = new World();
    
    // Create entity ID counter
    this.nextEntityId = 1;
    
    // Create system registry
    this.systems = new SystemRegistry();
    
    // Game loop variables
    this.running = false;
    this.lastTime = 0;
  }
  
  async init() {
    console.log('Initializing game world...');
    
    // Register shared systems first
    this.systems.register(new TerrainSystem(), 15);
    
    // Register client-specific systems
    this.systems.register(new InputSystem(), 10);
    this.systems.register(new ClientPhysicsSystem(), 20);
    this.systems.register(new TerrainRendererSystem(), 25);
    this.systems.register(new CameraSystem(), 40);
    this.systems.register(new BackgroundSystem(), 45); // Run before rendering
    this.systems.register(new RenderSystem(), 50);
    
    // Initialize all systems
    this.systems.initAll(this.world);
    
    // Wait for physics system to initialize
    const physicsSystem = this.systems.getSystem(ClientPhysicsSystem);
    if (physicsSystem) {
      await physicsSystem.init(this.world);
    }
    
    console.log('Game world initialized');
    return this;
  }
  
  createEntity(components = {}) {
    // Add id to entity
    const entity = {
      id: this.nextEntityId++,
      ...components
    };
    
    // Add entity to world
    this.world.add(entity);
    
    return entity;
  }
  
  removeEntity(entity) {
    // Clean up resources first
    
    // Remove from physics
    if (entity.physics) {
      const physicsSystem = this.systems.getSystem(ClientPhysicsSystem);
      if (physicsSystem) {
        // Clean up physics resources
        // (This would be implemented in the PhysicsSystem)
      }
    }
    
    // Remove from renderer
    if (entity.render) {
      const renderSystem = this.systems.getSystem(RenderSystem);
      if (renderSystem && renderSystem.meshes.has(entity.id)) {
        const mesh = renderSystem.meshes.get(entity.id);
        renderSystem.scene.remove(mesh);
        renderSystem.meshes.delete(entity.id);
      }
    }
    
    // Remove from world
    this.world.remove(entity);
  }
  
  start() {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
    
    console.log('Game loop started');
  }
  
  stop() {
    this.running = false;
    console.log('Game loop stopped');
  }
  
  gameLoop(timestamp) {
    if (!this.running) return;
    
    // Calculate delta time in seconds
    const now = timestamp || performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;
    
    // Update all game systems
    this.systems.updateAll(deltaTime);
    
    // Schedule next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  destroy() {
    this.stop();
    this.systems.destroyAll();
    // Clear all entities
    this.world.clear();
  }
}