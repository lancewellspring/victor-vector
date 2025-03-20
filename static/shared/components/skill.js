// static/shared/components/skill.js
import { registerComponent } from './registry.js';

/**
 * Skill Component - Defines a player skill or ability
 * @returns {Object} Default skill component data
 */
function createSkill() {
  return {
    // Basic info
    id: '',
    name: '',
    description: '',
    type: '', // weapon, movement, defense, utility
    tier: 1,
    
    // Skill properties
    fatigueCost: 10,
    cooldownTime: 1000, // milliseconds
    radixCost: 0, // Special resource cost
    
    // Requirements
    requirements: {
      minTier: 1,
      attributes: {},
    },
    
    // Effect parameters
    effectType: 'none', // damage, movement, buff, etc.
    effectValue: 0,
    effectRadius: 0,
    effectDuration: 0,
    
    // Modification system
    modifiers: [],
    
    // Visual representation
    animation: '',
    particle: '',
    sound: '',
    
    // Function references for custom skill behavior
    // These will be function names that the SkillSystem will look up
    activateFunction: '',
    updateFunction: '',
    endFunction: '',
    
    // State
    isActive: false,
    activeTime: 0,
  };
}

registerComponent('skill', createSkill);

export { createSkill };