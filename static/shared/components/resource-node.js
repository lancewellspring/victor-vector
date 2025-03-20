// static/shared/components/resource-node.js
import { registerComponent } from './registry.js';

function createResourceNode() {
  return {
    // Resource type (fiber, wood, stone, metal, radix)
    type: 'wood',
    
    // Resource amount contained
    amount: 10,
    maxAmount: 10,
    
    // Collection properties
    gatherRate: 1, // Units per second
    respawnRate: 0.1, // Units per second
    fatiguePerUnit: 2, // Fatigue cost per unit gathered
    
    // Current state
    isBeingGathered: false,
    gatherProgress: 0,
    gatherComplete: false,
    
    // Visual representation
    visualType: 'default', // default, large, small, etc.
    particleEffect: '', // Effect when gathering
    
    // Rarity/tier
    tier: 1, // 1-5, affects gather difficulty and amount
    
    // Collision detection
    detectionRadius: 2, // How close player must be to gather
  };
}

registerComponent('resourceNode', createResourceNode);
export { createResourceNode };