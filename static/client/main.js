/**
 * Client entry point for Venture & Valor
 * Initializes the game world and systems
 */

// Import ECS framework
const { 
  createWorld, 
  System, 
  Components, 
  createComponent 
} = window.ECS;

// Create the game world
const world = createWorld();

// Game state
let lastTime = 0;
let running = false;

// Main game loop
function gameLoop(timestamp) {
  if (!running) return;
  
  // Calculate delta time in seconds
  const now = timestamp || performance.now();
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;
  
  // Update all game systems
  world.update(deltaTime);
  
  // Schedule next frame
  requestAnimationFrame(gameLoop);
}

// Initialize network system after creating the world
function initGame() {
  console.log('Initializing Venture & Valor...');
  
  // Initialize network system
  const networkSystem = window.ECS.createSystem('network');
  world.registerSystem(networkSystem, 0);
  
  // Connect to server
  networkSystem.connect();
  
  // Rest of initialization
  
  // Start the game loop
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  
  console.log('Game initialized');
}

// Start the game when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', initGame);

// Export game API for debugging
window.Game = {
  world,
  start: () => { running = true; requestAnimationFrame(gameLoop); },
  stop: () => { running = false; },
  isRunning: () => running
};