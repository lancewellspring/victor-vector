// static/client/main.js (updated with proper error handling)
import { GameWorld } from './world.js';
import { createComponent } from '../shared/components/index.js';

// Make sure all required components are properly registered
import '../shared/components/terrain.js';

// Create and initialize the game world
const game = new GameWorld();

// Initialize the game
async function initGame() {
  console.log('Initializing Venture & Valor...');
  
  try {
    // Initialize the world
    await game.init();
    
    // Create a camera entity
    const cameraEntity = game.createEntity({
      transform: createComponent('transform', {
        x: 0,
        y: 5,
        z: 20
      }),
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        lookAt: { x: 0, y: 0, z: 0 }
      }
    });
    
    // Create a player entity
    const playerEntity = game.createEntity({
      transform: createComponent('transform', {
        x: 0,
        y: 5,
        z: 0,
        physicsControlled: true
      }),
      physics: createComponent('physics', {
        bodyType: 'dynamic',
        colliderType: 'box',
        width: 1,
        height: 2,
        depth: 1,
        friction: 0.2,
        restitution: 0.1,
        isCharacter: true,
        grounded: false
      }),
      render: createComponent('render', {
        type: 'box',
        color: 0x00ff00,
        castShadow: true,
        receiveShadow: true
      }),
      input: {
        isPlayerControlled: true,
        facing: 'right'
      }
    });
    
    // Create a terrain entity - using createComponent to ensure proper structure
    const terrainEntity = game.createEntity({
      transform: createComponent('transform', {
        x: 0,
        y: 0,
        z: 0
      }),
      terrain: createComponent('terrain', {
        type: 'ground',
        width: 1000,
        segments: 100,
        seed: 12345,
        amplitude: 20,
        baseHeight: -10,
        // Ensure these properties exist to prevent errors
        points: [],
        hasCollision: true,
        octaves: 3,
        persistence: 0.5,
        scale: 0.01,
        maxSlope: 0.8,
        smoothing: 0.2,
        friction: 0.5,
        restitution: 0.1
      })
    });
    
    // Create background layers
    // Far background (mountains)
    game.createEntity({
      background: createComponent('background', {
        depth: -700,
        parallaxRate: 0.1,
        color: 0xDEEEDE,
        width: 3000,
        segments: 100,
        amplitude: 1200,
        scale: 0.001,
        octaves: 1,
        maxSlope: 1,
        smoothing: 0,
        flatShading: false
      })
    });
    
    // Middle background (hills)
    game.createEntity({
      background: createComponent('background', {
        depth: -400,
        parallaxRate: 0.2,
        color: 0xBECEBE,
        width: 6000,
        segments: 100,
        amplitude: 700,
        scale: 0.001,
        octaves: 1,
        maxSlope: 0.8,
        smoothing: 0
      })
    });
    
    // Close background (foothills)
    game.createEntity({
      background: createComponent('background', {
        depth: -100,
        parallaxRate: 0.4,
        color: 0x8ECE8E,
        width: 12000,
        segments: 100,
        amplitude: 400,
        scale: 0.01,
        octaves: 1,
        maxSlope: 0.4,
        smoothing: 0.5,
        flatShading: true
      })
    });
    
    // Set camera to follow player
    const cameraSystem = game.systems.getSystem('CameraSystem');
    if (cameraSystem) {
      cameraSystem.setTarget(playerEntity);
    }
    
    // Start the game loop
    game.start();
    
    console.log('Game initialized');
  } catch (error) {
    console.error('Error initializing game:', error);
  }
}

// Start the game when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  initGame();
});

// Export game API for debugging
window.Game = {
  world: game,
  start: () => game.start(),
  stop: () => game.stop(),
  isRunning: () => game.running
};