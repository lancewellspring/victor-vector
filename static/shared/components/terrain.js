// static/shared/components/terrain.js
import { registerComponent } from './registry.js';

/**
 * Terrain Component - Stores terrain generation data
 * @returns {Object} Default terrain component data
 */
function createTerrain() {
  return {
    // Terrain type
    type: 'ground', // ground, platform, background
    
    // Procedural generation parameters
    seed: Math.floor(Math.random() * 10000),
    width: 1000,
    segments: 100,
    
    // Noise parameters
    octaves: 3,
    persistence: 0.5,
    scale: 0.01,
    
    // Height parameters
    baseHeight: 0,
    amplitude: 50,
    
    // Physics parameters
    hasCollision: true,
    
    // Generated data (filled by TerrainSystem)
    points: [],
    
    // Additional terrain properties
    maxSlope: 0.8, // Maximum allowed slope
    smoothing: 0.2, // Smoothing factor for terrain generation
    
    // Physical properties
    friction: 0.5,
    restitution: 0.1
  };
}

registerComponent('terrain', createTerrain);

export { createTerrain };