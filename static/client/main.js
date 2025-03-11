// static/client/main.js

// Import ECS framework - direct imports instead of accessing window
import { createWorld } from '@shared/ecs/world';
import { System } from '@shared/ecs/system';
import { Components, createComponent } from '@shared/components/index';

// Import your systems
import {NetworkSystem} from '../client/systems/network'; // This will register the system
import {RenderSystem} from '../client/systems/render';
import {InputSystem} from '../client/systems/input';

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

// Initialize the game
function initGame() {
  console.log('Initializing Venture & Valor...');
  
  // Create and register systems
  const networkSystem = world.registerSystem(new NetworkSystem(), 0);
  const renderSystem = world.registerSystem(new RenderSystem(), 10);
  const inputSystem = world.registerSystem(new InputSystem(), 5);
  
  // Initialize systems
  networkSystem.connect();
  renderSystem.init();
  inputSystem.init();
  
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