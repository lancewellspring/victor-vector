import { registerComponent, createComponent, getRegisteredComponents } from './registry.js';

// Import all component definitions to ensure they're registered
import './transform.js';
import './physics.js';
import './render.js';
// Add more imports as you create them

export {
  registerComponent,
  createComponent,
  getRegisteredComponents
};