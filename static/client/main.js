// static/client/main.js (updated with proper error handling)
import { GameWorld } from "./world.js";
import { createComponent } from "@shared/components/index.js";

// Make sure all required components are properly registered
import "@shared/components/terrain.js";

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
        grounded: false,
        maxSpeed: 5
      }),
      render: createComponent('render', {
        type: 'box',
        color: 0x00ff00,
        castShadow: true,
        receiveShadow: true
      }),
      input: createComponent('input', {
        isPlayerControlled: true,
        facing: 'right',
        moveModifier: 1.0
      }),
      player: createComponent('player', {
        name: 'Adventurer',
        characterClass: 'explorer',
        tier: 1
      }),
      network: {
        isOwned: true,
        inputSequence: 0
      },
      // Add animation component
      animation: createComponent('animation', {
        currentState: 'idle',
        states: {
          idle: { name: 'idle', loop: true },
          walk: { name: 'walk', loop: true },
          jump: { name: 'jump', loop: false },
          fall: { name: 'fall', loop: true }
        }
      }),
      // Add combat component for interactions
      combat: createComponent('combat', {
        team: 'player',
        attackPower: 10,
        defense: 5
      })
    });
    
    // Set camera to follow player
    const cameraSystem = game.systems.getSystem('CameraSystem');
    if (cameraSystem) {
      cameraSystem.setTarget(playerEntity);
    }
    
    // Generate test venture
    const ventureSeed = Math.floor(Math.random() * 10000);
    generateTestVenture(ventureSeed, 1);
    
    // Start the game loop
    game.start();
    
    console.log('Game initialized');
  } catch (error) {
    console.error('Error initializing game:', error);
  }
}

// Add venture generation function
function generateTestVenture(seed, difficulty) {
  const segmentedTerrainSystem = game.systems.getSystem('SegmentedTerrainSystem');
  if (!segmentedTerrainSystem) {
    console.error('SegmentedTerrainSystem not found');
    return;
  }
  
  // Generate terrain
  const ventureId = `test_venture_${seed}`;
  segmentedTerrainSystem.generateVentureTerrain(ventureId, seed, difficulty, 5);
  
  // Place the player at the start
  const startPosition = segmentedTerrainSystem.placePlayerAtStart();
  
  if (startPosition) {
    console.log(`Player placed at ${startPosition.x}, ${startPosition.y}`);
    
    // Set camera boundaries
    const cameraSystem = game.systems.getSystem('CameraSystem');
    if (cameraSystem) {
      cameraSystem.calculateBoundariesFromTerrain();
    }
  }
  
  // Create some resource nodes for testing
  createTestResourceNodes();
}

// Add resource node creation
function createTestResourceNodes() {
  const segmentedTerrainSystem = game.systems.getSystem('SegmentedTerrainSystem');
  if (!segmentedTerrainSystem) return;
  
  // Get all terrain segments
  const segmentEntities = game.world.with('terrainSegment');
  
  // Create resource nodes on each segment
  for (const entity of segmentEntities) {
    const segment = entity.terrainSegment;
    
    // Create 1-3 resources per segment
    const resourceCount = 1 + Math.floor(Math.random() * 3);
    const resourceTypes = ['wood', 'stone', 'fiber', 'metal', 'radix'];
    
    for (let i = 0; i < resourceCount; i++) {
      // Position within segment
      const x = segment.instanceX + 10 + Math.random() * (segment.width - 20);
      const y = segment.instanceY + 5 + Math.random() * 5; // Just above ground
      
      // Pick random resource type
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      
      // Create resource node
      segmentedTerrainSystem.createResourceNode(x, y, resourceType, 10 + Math.floor(Math.random() * 10));
    }
  }
}

// Add a reset function for development
window.resetGame = function() {
  // Stop current game
  game.stop();
  
  // Clear all entities except player
  const playerEntities = game.world.with('player');
  const playerEntity = playerEntities.length > 0 ? playerEntities[0] : null;
  
  // Save player ID if it exists
  const playerId = playerEntity ? playerEntity.id : null;
  
  // Remove all entities
  for (const entity of [...game.world.entities]) {
    // Skip player
    if (playerId && entity.id === playerId) continue;
    game.world.removeEntity(entity);
  }
  
  // Generate new venture
  const newSeed = Math.floor(Math.random() * 10000);
  generateTestVenture(newSeed, 1);
  
  // Resume game
  game.start();
  
  console.log('Game reset with new seed:', newSeed);
};

// Start the game when the DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  initGame();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') {
    window.resetGame();
  }
});

// Export game API for debugging
window.Game = {
  world: game,
  start: () => game.start(),
  stop: () => game.stop(),
  isRunning: () => game.running,
};
