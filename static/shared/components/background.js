// static/shared/components/background.js
import { registerComponent } from './registry.js';

/**
 * Background Component - Represents a parallax background layer
 * @returns {Object} Default background component data
 */
function createBackground() {
  return {
    // Layer properties
    depth: 0, // z-coordinate, negative values are farther
    parallaxRate: 0.1, // How quickly this layer moves relative to camera
    
    // Visual properties
    color: 0x87CEEB, // Sky blue default
    opacity: 1.0,
    
    // Generation parameters
    width: 3000,
    height: 1000,
    segments: 100,
    seed: Math.floor(Math.random() * 10000),
    
    // Noise parameters
    octaves: 2,
    persistence: 0.5,
    amplitude: 100,
    scale: 0.001,
    baseHeight: 0,
    
    // Shape parameters
    maxSlope: 0.4,
    smoothing: 0.5,
    edgeFading: true, // Fade height near edges
    
    // Generated data
    points: [],
    
    // Visual options
    type: 'mountain', // mountain, cloud, etc.
    flatShading: true,
    
    // Prevents regeneration if already generated
    generated: false
  };
}

registerComponent('background', createBackground);

export { createBackground };