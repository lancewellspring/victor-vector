import { registerComponent, createComponent, getRegisteredComponents } from './registry.js';

// Import all component definitions to ensure they're registered
import './background.js';
import './physics.js';
import './player.js';
import './render.js';
import './terrain.js';
import './transform.js';
import './skill.js';
// Add more imports as you create them

export {
  registerComponent,
  createComponent,
  getRegisteredComponents
};