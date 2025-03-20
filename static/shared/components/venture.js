// static/shared/components/venture.js
import { registerComponent } from './registry.js';

function createVenture() {
  return {
    // Venture identification
    id: '',
    name: 'Unnamed Venture',
    description: '',
    
    // Venture properties
    tier: 1, // Difficulty tier
    seed: 0, // For procedural generation
    type: 'gather', // gather, combat, scout, boss
    
    // Objectives
    primaryObjective: {
      type: 'gather', // gather, kill, reach, survive
      target: 'wood', // Resource type, enemy type, location
      amount: 10, // Amount needed
      progress: 0 // Current progress
    },
    
    secondaryObjectives: [], // Additional optional objectives
    
    // Rewards
    rewards: {
      resources: {},
      prestige: 0,
      radix: 0,
      artifactChance: 0,
      totemChance: 0
    },
    
    // Risk settings
    permadeath: false, // Based on tier and type
    timeLimit: 0, // In seconds, 0 = no limit
    
    // Current state
    state: 'pending', // pending, active, completed, failed
    startTime: 0,
    elapsedTime: 0,
    
    // Players in this venture
    playerIds: [],
    
    // Checkpoint system
    checkpoints: [],
    activeCheckpoint: null,
  };
}

registerComponent('venture', createVenture);
export { createVenture };