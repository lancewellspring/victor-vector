// static/shared/systems/player.js
import { System } from './system.js';

export class PlayerSystem extends System {
  constructor() {
    super();
    this.name = 'PlayerSystem';
    this.priority = 25; // Run after input but before physics
    
    // Store active skills for updating
    this.activeSkills = new Map();
    
    // Define weight constants
    this.RESOURCE_WEIGHTS = {
      fiber: 0.5,
      wood: 1.0,
      stone: 2.0,
      metal: 2.5,
      radix: 0.3, // Light but unstable - game design mentions this
    };
    
    // Define weight penalty thresholds
    this.WEIGHT_THRESHOLDS = [
      { percent: 0.5, speedPenalty: 0, fatigueMultiplier: 1.0 }, // 0-50%
      { percent: 0.75, speedPenalty: 0.1, fatigueMultiplier: 1.25 }, // 50-75%
      { percent: 1.0, speedPenalty: 0.25, fatigueMultiplier: 1.5 }, // 75-100%
      { percent: 1.5, speedPenalty: 0.5, fatigueMultiplier: 2.0 }, // Over capacity
    ];
  }
  
  init(world) {
    super.init(world);
    
    // Register event handlers
    this.subscribe('skillActivated', this.handleSkillActivated.bind(this));
    this.subscribe('resourceCollected', this.handleResourceCollected.bind(this));
    this.subscribe('playerDamaged', this.handlePlayerDamaged.bind(this));
    
    return this;
  }
  
  update(deltaTime) {
    // Process all entities with player components
    const playerEntities = this.world.with('player');
    
    for (const entity of playerEntities) {
      // Update fatigue recovery
      this.updateFatigue(entity, deltaTime);
      
      // Update skill cooldowns
      this.updateCooldowns(entity, deltaTime);
      
      // Update active skills
      this.updateActiveSkills(entity, deltaTime);
      
      // Update weight effects
      this.updateWeightEffects(entity);
      
      // Check for skill unlock/recovery based on fatigue
      this.checkSkillRecovery(entity);
      
      // Update state based on other components
      this.updatePlayerState(entity);
    }
  }
  
  /**
   * Update fatigue recovery over time
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateFatigue(entity, deltaTime) {
    const { player } = entity;
    
    // Skip if at zero fatigue
    if (player.currentFatigue <= 0) return;
    
    // Calculate recovery rate modified by current weight
    const weightEffect = this.getWeightMultiplier(entity);
    const recoveryAmount = player.fatigueRecoveryRate * deltaTime / weightEffect;
    
    // Apply recovery
    player.currentFatigue = Math.max(0, player.currentFatigue - recoveryAmount);
    
    // Flag for network sync if player fatigue changed significantly
    if (Math.abs(recoveryAmount) > 1) {
      player.needsSync = true;
    }
  }
  
  /**
   * Update skill cooldowns
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateCooldowns(entity, deltaTime) {
    const { player } = entity;
    
    // Update each skill cooldown
    for (const skillType in player.cooldowns) {
      if (player.cooldowns[skillType] > 0) {
        player.cooldowns[skillType] -= deltaTime * 1000; // Convert to milliseconds
        
        // Ensure we don't go below zero
        if (player.cooldowns[skillType] < 0) {
          player.cooldowns[skillType] = 0;
        }
      }
    }
  }
  
  /**
   * Update active skills (like channeled abilities)
   * @param {Object} entity - Player entity
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateActiveSkills(entity, deltaTime) {
    // Get skill entities associated with this player
    const activeSkillIds = this.activeSkills.get(entity.id) || [];
    
    for (const skillId of activeSkillIds) {
      const skillEntity = this.world.getEntity(skillId);
      if (!skillEntity || !skillEntity.skill) continue;
      
      // Update active time
      skillEntity.skill.activeTime += deltaTime;
      
      // Check if skill should end
      if (skillEntity.skill.effectDuration > 0 && 
          skillEntity.skill.activeTime >= skillEntity.skill.effectDuration) {
        this.endSkill(entity, skillEntity);
        continue;
      }
      
      // Execute update function if defined
      if (skillEntity.skill.updateFunction) {
        this.executeSkillFunction(skillEntity.skill.updateFunction, entity, skillEntity, deltaTime);
      }
      
      // Apply ongoing fatigue cost for channeled skills
      if (skillEntity.skill.fatigueOverTime) {
        this.applyFatigue(entity, skillEntity.skill.fatigueOverTime * deltaTime);
      }
    }
  }
  
  /**
   * Execute a skill function by name
   * @param {string} functionName - Name of function to execute
   * @param {Object} playerEntity - Player entity
   * @param {Object} skillEntity - Skill entity
   * @param {number} deltaTime - Time since last update
   */
  executeSkillFunction(functionName, playerEntity, skillEntity, deltaTime) {
    // This would map to a function in a skill library
    // For now, we'll just log the function call
    console.log(`Executing skill function: ${functionName}`);
    
    // In a real implementation, you'd have something like:
    // if (typeof this.skillFunctions[functionName] === 'function') {
    //   this.skillFunctions[functionName](playerEntity, skillEntity, deltaTime);
    // }
  }
  
  /**
   * End an active skill
   * @param {Object} playerEntity - Player entity
   * @param {Object} skillEntity - Skill entity
   */
  endSkill(playerEntity, skillEntity) {
    // Call end function if defined
    if (skillEntity.skill.endFunction) {
      this.executeSkillFunction(skillEntity.skill.endFunction, playerEntity, skillEntity, 0);
    }
    
    // Update skill state
    skillEntity.skill.isActive = false;
    skillEntity.skill.activeTime = 0;
    
    // Remove from active skills
    const activeSkills = this.activeSkills.get(playerEntity.id) || [];
    const index = activeSkills.indexOf(skillEntity.id);
    if (index >= 0) {
      activeSkills.splice(index, 1);
    }
    
    // Emit event
    this.world.events.emit('skillEnded', { 
      playerEntity, 
      skillEntity 
    });
  }
  
  /**
   * Update player movement and other properties based on current weight
   * @param {Object} entity - Player entity
   */
  updateWeightEffects(entity) {
    const { player, physics } = entity;
    
    // Calculate current weight
    let totalWeight = 0;
    for (const resource in player.inventory) {
      totalWeight += player.inventory[resource] * (this.RESOURCE_WEIGHTS[resource] || 1);
    }
    
    // Update current weight
    player.currentWeight = totalWeight;
    
    // Find applicable threshold
    const weightRatio = player.currentWeight / player.carryingCapacity;
    let appliedThreshold = this.WEIGHT_THRESHOLDS[0];
    
    for (const threshold of this.WEIGHT_THRESHOLDS) {
      if (weightRatio <= threshold.percent) {
        appliedThreshold = threshold;
        break;
      }
    }
    
    // Apply movement speed penalty if physics exists
    if (physics) {
      // Calculate base speed from player component
      const baseSpeed = player.movementSpeed;
      
      // Apply penalty
      const effectiveSpeed = baseSpeed * (1 - appliedThreshold.speedPenalty);
      
      // Only update if significantly different
      if (Math.abs(physics.maxSpeed - effectiveSpeed) > 0.1) {
        physics.maxSpeed = effectiveSpeed;
        player.needsSync = true;
      }
    }
  }
  
  /**
   * Get the fatigue multiplier based on current weight
   * @param {Object} entity - Player entity
   * @returns {number} - Fatigue multiplier
   */
  getWeightMultiplier(entity) {
    const { player } = entity;
    
    // Calculate weight ratio
    const weightRatio = player.currentWeight / player.carryingCapacity;
    
    // Find applicable threshold
    for (const threshold of this.WEIGHT_THRESHOLDS) {
      if (weightRatio <= threshold.percent) {
        return threshold.fatigueMultiplier;
      }
    }
    
    // If we somehow exceed all thresholds, use the last one
    return this.WEIGHT_THRESHOLDS[this.WEIGHT_THRESHOLDS.length - 1].fatigueMultiplier;
  }
  
  /**
   * Apply fatigue to a player
   * @param {Object} entity - Player entity
   * @param {number} amount - Amount of fatigue to apply
   * @param {boolean} isFatal - Whether this fatigue can cause "death"
   * @returns {boolean} - Whether the fatigue was successfully applied
   */
  applyFatigue(entity, amount, isFatal = false) {
    const { player } = entity;
    
    // Apply fatigue resistance
    const resistedAmount = Math.max(0, amount - player.fatigueResistance);
    
    // Calculate new fatigue
    const newFatigue = player.currentFatigue + resistedAmount;
    
    // Check if we're at max and need to lock a skill
    if (newFatigue >= player.maxFatigue) {
      // If already at max, we need to lock a skill or cause "death"
      if (player.currentFatigue >= player.maxFatigue) {
        return this.lockSkill(entity, isFatal);
      }
      
      // Otherwise, cap at max
      player.currentFatigue = player.maxFatigue;
    } else {
      player.currentFatigue = newFatigue;
    }
    
    // Flag for network sync
    player.needsSync = true;
    
    return true;
  }
  
  /**
   * Lock a skill due to max fatigue
   * @param {Object} entity - Player entity
   * @param {boolean} isFatal - Whether this can cause "death"
   * @returns {boolean} - Whether a skill was successfully locked
   */
  lockSkill(entity, isFatal) {
    const { player } = entity;
    
    // Find last used unlocked skill
    // In a real implementation, you'd track the last used skill
    // For now, we'll just find any unlocked skill
    const unlocked = Object.keys(player.skillLocks).filter(
      skill => !player.skillLocks[skill] && player.skills[skill]
    );
    
    // If no unlocked skills and fatal, player "dies"
    if (unlocked.length === 0) {
      if (isFatal) {
        this.killPlayer(entity);
      }
      return false;
    }
    
    // Lock the skill (for now, just the first unlocked one)
    const skillToLock = unlocked[0];
    player.skillLocks[skillToLock] = true;
    
    // Emit event
    this.world.events.emit('skillLocked', { 
      entity, 
      skillType: skillToLock 
    });
    
    // Flag for network sync
    player.needsSync = true;
    
    return true;
  }
  
  /**
   * Check for skill recovery based on fatigue
   * @param {Object} entity - Player entity
   */
  checkSkillRecovery(entity) {
    const { player } = entity;
    
    // If fatigue is below threshold, unlock a skill
    // For now, let's say 50% of max fatigue is the threshold
    if (player.currentFatigue < player.maxFatigue * 0.5) {
      // Find a locked skill to unlock
      const locked = Object.keys(player.skillLocks).filter(
        skill => player.skillLocks[skill] && player.skills[skill]
      );
      
      if (locked.length > 0) {
        // Unlock the first locked skill
        const skillToUnlock = locked[0];
        player.skillLocks[skillToUnlock] = false;
        
        // Emit event
        this.world.events.emit('skillUnlocked', { 
          entity, 
          skillType: skillToUnlock 
        });
        
        // Flag for network sync
        player.needsSync = true;
      }
    }
  }
  
  /**
   * Update player state based on other components
   * @param {Object} entity - Player entity
   */
  updatePlayerState(entity) {
    const { player, physics, input } = entity;
    
    // Update state based on physics
    if (physics) {
      // Update grounded state
      player.grounded = physics.grounded;
      
      // Determine movement state
      if (!player.grounded) {
        player.state = physics.velocity.y > 0 ? 'jumping' : 'falling';
      } else if (Math.abs(physics.velocity.x) > 0.1) {
        player.state = 'moving';
      } else {
        player.state = 'idle';
      }
    }
    
    // Update facing based on input
    if (input && input.facing) {
      player.facing = input.facing;
    }
  }
  
  /**
   * Handle skill activation event
   * @param {Object} data - Event data
   */
  handleSkillActivated(data) {
    const { playerEntity, skillType, skillEntity } = data;
    
    if (!playerEntity || !playerEntity.player || !skillEntity || !skillEntity.skill) {
      return;
    }
    
    const { player } = playerEntity;
    const { skill } = skillEntity;
    
    // Check if skill is locked
    if (player.skillLocks[skillType]) {
      console.log(`Skill ${skillType} is locked and cannot be activated`);
      return;
    }
    
    // Check cooldown
    if (player.cooldowns[skillType] > 0) {
      console.log(`Skill ${skillType} is on cooldown`);
      return;
    }
    
    // Check if we have enough fatigue capacity
    if (player.currentFatigue + skill.fatigueCost > player.maxFatigue) {
      console.log(`Not enough fatigue capacity to use ${skillType}`);
      return;
    }
    
    // Apply fatigue cost
    this.applyFatigue(playerEntity, skill.fatigueCost);
    
    // Set cooldown
    player.cooldowns[skillType] = skill.cooldownTime;
    
    // Activate the skill
    skill.isActive = true;
    skill.activeTime = 0;
    
    // Track active skill
    if (!this.activeSkills.has(playerEntity.id)) {
      this.activeSkills.set(playerEntity.id, []);
    }
    this.activeSkills.get(playerEntity.id).push(skillEntity.id);
    
    // Execute activate function if defined
    if (skill.activateFunction) {
      this.executeSkillFunction(skill.activateFunction, playerEntity, skillEntity, 0);
    }
    
    // Emit activation event
    this.world.events.emit('skillEffectStarted', { 
      playerEntity, 
      skillEntity 
    });
  }
  
  /**
   * Handle resource collection event
   * @param {Object} data - Event data
   */
  handleResourceCollected(data) {
    const { playerEntity, resourceType, amount } = data;
    
    if (!playerEntity || !playerEntity.player) return;
    
    const { player } = playerEntity;
    
    // Add resource to inventory
    player.inventory[resourceType] = (player.inventory[resourceType] || 0) + amount;
    
    // Apply gathering fatigue
    // Fatigue scales with resource weight
    const fatigueAmount = amount * (this.RESOURCE_WEIGHTS[resourceType] || 1) * 0.5;
    this.applyFatigue(playerEntity, fatigueAmount);
    
    // Update weight effects
    this.updateWeightEffects(playerEntity);
    
    // Emit event
    this.world.events.emit('inventoryChanged', { 
      playerEntity, 
      resourceType, 
      newAmount: player.inventory[resourceType] 
    });
  }
  
  /**
   * Handle player taking damage
   * @param {Object} data - Event data
   */
  handlePlayerDamaged(data) {
    const { entity, amount, source, isFatal } = data;
    
    if (!entity || !entity.player) return;
    
    // Damage is represented as fatigue in this game
    this.applyFatigue(entity, amount, isFatal);
    
    // Emit event for other systems (like audio/visual feedback)
    this.world.events.emit('playerFatigueIncreased', { 
      entity, 
      amount, 
      source 
    });
  }
  
  /**
   * Kill player (implement permadeath or soft death)
   * @param {Object} entity - Player entity
   */
  killPlayer(entity) {
    const { player } = entity;
    
    // Increment death count
    player.deathCount++;
    
    // Check if permadeath is enabled for this venture
    if (player.permadeathEnabled) {
      // Emit permadeath event
      this.world.events.emit('playerPermaDeath', { entity });
      
      // In a real implementation, this would trigger character removal
      // and potentially prestige calculations for the house
      console.log(`Player ${player.name} has suffered permadeath!`);
    } else {
      // Soft death - reset fatigue, unlock skills
      player.currentFatigue = 0;
      
      for (const skill in player.skillLocks) {
        player.skillLocks[skill] = false;
      }
      
      // Emit soft death event
      this.world.events.emit('playerSoftDeath', { entity });
      
      console.log(`Player ${player.name} has suffered a soft death`);
    }
    
    // Flag for network sync
    player.needsSync = true;
  }
  
  /**
   * Create a skill entity for a player
   * @param {Object} playerEntity - Player entity
   * @param {string} skillType - Type of skill (weapon, movement, etc.)
   * @param {Object} skillData - Skill data
   * @returns {Object} Created skill entity
   */
  createPlayerSkill(playerEntity, skillType, skillData) {
    if (!playerEntity || !playerEntity.player) return null;
    
    // Create skill entity
    const skillEntity = this.world.createEntity({
      skill: {
        ...skillData,
        type: skillType,
      },
      owner: {
        entityId: playerEntity.id,
        skillSlot: skillType
      }
    });
    
    // Assign to player
    playerEntity.player.skills[skillType] = skillEntity.id;
    
    return skillEntity;
  }
  
  /**
   * Activate a player skill
   * @param {Object} playerEntity - Player entity
   * @param {string} skillType - Type of skill to activate
   * @returns {boolean} Whether the skill was activated
   */
  activateSkill(playerEntity, skillType) {
    if (!playerEntity || !playerEntity.player) return false;
    
    const { player } = playerEntity;
    
    // Check if we have this skill
    const skillId = player.skills[skillType];
    if (!skillId) return false;
    
    // Get skill entity
    const skillEntity = this.world.getEntity(skillId);
    if (!skillEntity || !skillEntity.skill) return false;
    
    // Trigger activation via event
    this.world.events.emit('skillActivated', {
      playerEntity,
      skillType,
      skillEntity
    });
    
    return true;
  }
  
  destroy() {
    this.activeSkills.clear();
    super.destroy();
  }
}