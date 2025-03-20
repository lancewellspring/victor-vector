// static/shared/components/terrain-segment.js
import { registerComponent } from './registry.js';

function createTerrainSegment() {
  return {
    // Segment identification
    id: '',
    name: 'Default Segment',
    type: 'path', // path, challenge, resource, encounter
    
    // Segment dimensions
    width: 50,
    height: 30,
    
    // Connection points (for connecting segments)
    entryPoint: { x: 0, y: 0 },
    exitPoint: { x: 50, y: 0 },
    
    // Terrain definition - either procedural params or explicit points
    generationType: 'procedural', // procedural or explicit
    
    // For procedural generation
    proceduralParams: {
      seed: 0,
      octaves: 3,
      persistence: 0.5,
      amplitude: 10,
      baseHeight: 0
    },
    
    // For explicit generation
    explicitPoints: [],
    
    // Segment features
    features: [
      // Example: { type: 'platform', x: 10, y: 5, width: 8, height: 1 }
      // Example: { type: 'resource', x: 25, y: 8, resourceType: 'wood', amount: 10 }
      // Example: { type: 'enemy', x: 30, y: 10, enemyType: 'scout', level: 1 }
    ],
    
    // Difficulty requirements
    minTier: 1,
    maxTier: 5,
    
    // Visual theme
    theme: 'forest', // forest, cave, mountain, etc.
    
    // Metadata
    tags: [], // For filtering/selection
    
    // Instancing data (when placed in world)
    instanceX: 0,
    instanceY: 0,
    instanceId: null
  };
}

registerComponent('terrainSegment', createTerrainSegment);
export { createTerrainSegment };