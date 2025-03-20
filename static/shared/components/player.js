// static/shared/components/player.js
import { registerComponent } from './registry.js';

/**
 * Player Component - Manages character state, skills, and progression
 * @returns {Object} Default player component data
 */
function createPlayer() {
  return {
    // Identity
    name: 'Unnamed Adventurer',
    characterClass: 'novice',
    tier: 1, // Character tier/power level
    
    // Core stats
    strength: 10,
    agility: 10,
    vitality: 10,
    intelligence: 10,
    
    // Fatigue system (serves as health)
    maxFatigue: 100,
    currentFatigue: 0,
    fatigueRecoveryRate: 5, // Units per second
    fatigueResistance: 0, // Reduces fatigue from actions
    
    // Skill system
    skills: {
      // Default skill slots based on game design
      weapon: null,      // Basic attack/weapon type
      movement: null,    // Movement skill 
      defense: null,     // Defense skill
      utility1: null,    // Additional skill 1
      utility2: null,    // Additional skill 2 (unlocked via progression)
    },
    
    skillLocks: {
      // Tracks which skills are locked due to fatigue
      weapon: false,
      movement: false,
      defense: false,
      utility1: false,
      utility2: false,
    },
    
    // Cooldowns for each skill (milliseconds)
    cooldowns: {
      weapon: 0,
      movement: 0,
      defense: 0,
      utility1: 0,
      utility2: 0,
    },
    
    // Equipment
    armor: {
      type: 'light', // light, flexible, heavy
      tier: 1,
      modifiers: []
    },
    
    // Movement properties affected by equipment and skills
    movementSpeed: 5,
    jumpHeight: 10,
    carryingCapacity: 100,
    
    // Resources being carried (affects fatigue)
    inventory: {
      fiber: 0,
      wood: 0,
      stone: 0,
      metal: 0,
      radix: 0,
    },
    
    // Current inventory weight
    currentWeight: 0,
    
    // Character state
    state: 'idle', // idle, moving, jumping, attacking, gathering, blocked, etc.
    facing: 'right', // left or right
    grounded: true,
    
    // House/Legacy information
    houseId: null,
    houseName: '',
    prestige: 0,
    
    // Death system
    permadeathEnabled: false, // Based on venture tier
    deathCount: 0,
    
    // Active venture/mission
    currentVentureId: null,
    
    // Network synchronization
    needsSync: true, // Flag for network system
    lastSyncTime: 0,
  };
}

registerComponent('player', createPlayer);

export { createPlayer };