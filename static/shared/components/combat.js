// static/shared/components/combat.js
import { registerComponent } from './registry.js';

function createCombat() {
  return {
    // Attack properties
    attackPower: 10,
    attackRange: 2,
    attackSpeed: 1.0,
    
    // Defense properties
    defense: 5,
    blockChance: 0.2,
    dodgeChance: 0.1,
    
    // State
    isAttacking: false,
    isBlocking: false,
    attackCooldown: 0,
    
    // Hit detection
    hitbox: {
      width: 1,
      height: 1,
      offsetX: 0.5, // Offset from entity position
      offsetY: 0
    },
    
    // Team/faction for determining targets
    team: 'player', // player, enemy, neutral
    
    // Last hit/damage information for feedback
    lastHitEntity: null,
    lastHitTime: 0,
    lastDamageTaken: 0,
    lastDamageSource: null,
    lastDamageTime: 0,
  };
}

registerComponent('combat', createCombat);
export { createCombat };