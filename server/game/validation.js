/**
 * Validation module for server
 * Validates client inputs and actions to prevent cheating
 */

// Constants for validation
const MAX_MOVE_SPEED = 10; // Maximum allowed movement speed
const MAX_JUMP_FORCE = 15; // Maximum allowed jump force
const MAX_MESSAGE_LENGTH = 500; // Maximum chat message length
const MAX_NAME_LENGTH = 20; // Maximum player name length
const MAX_INPUTS_PER_SECOND = 30; // Maximum input messages per second
const MAX_DISTANCE_DELTA = 5; // Maximum allowed position difference per frame
const MAX_RESOURCE_GATHER_DISTANCE = 3; // Maximum distance for resource gathering

// Client input validation
/**
 * Validate join request data
 * @param {Object} data - Join request data
 * @returns {boolean} Whether the data is valid
 */
function validateJoinRequest(data) {
  // Check if required fields exist
  if (!data) return false;
  
  // Validate name if provided
  if (data.name && (typeof data.name !== 'string' || 
                    data.name.length === 0 || 
                    data.name.length > MAX_NAME_LENGTH)) {
    return false;
  }
  
  // Validate character class if provided
  if (data.characterClass && !isValidCharacterClass(data.characterClass)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a character class is valid
 * @param {string} characterClass - Character class name
 * @returns {boolean} Whether the class is valid
 */
function isValidCharacterClass(characterClass) {
  const validClasses = ['novice', 'explorer', 'warrior', 'ranger', 'scholar'];
  return validClasses.includes(characterClass);
}

/**
 * Validate player input message
 * @param {Object} data - Input message data
 * @returns {boolean} Whether the input is valid
 */
function validateInputMessage(data) {
  // Check if required fields exist
  if (!data || !data.input || typeof data.sequence !== 'number') {
    return false;
  }
  
  const input = data.input;
  
  // Validate movement input
  if (input.moveDirection !== undefined) {
    if (typeof input.moveDirection !== 'number' || 
        input.moveDirection < -1 || 
        input.moveDirection > 1) {
      return false;
    }
  }
  
  // Validate jump input
  if (input.jump !== undefined && typeof input.jump !== 'boolean') {
    return false;
  }
  
  // Validate skill input
  if (input.skill !== undefined) {
    if (typeof input.skill !== 'string' || 
        !isValidSkillType(input.skill)) {
      return false;
    }
  }
  
  // Validate gather input
  if (input.gather !== undefined && typeof input.gather !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Check if a skill type is valid
 * @param {string} skillType - Skill type identifier
 * @returns {boolean} Whether the skill type is valid
 */
function isValidSkillType(skillType) {
  const validSkillTypes = [
    'weapon', 'movement', 'defense', 'utility1', 'utility2'
  ];
  return validSkillTypes.includes(skillType);
}

/**
 * Validate chat message
 * @param {Object} data - Chat message data
 * @returns {boolean} Whether the message is valid
 */
function validateChatMessage(data) {
  // Check if required fields exist
  if (!data || typeof data.message !== 'string') {
    return false;
  }
  
  // Check message length
  if (data.message.length === 0 || data.message.length > MAX_MESSAGE_LENGTH) {
    return false;
  }
  
  // Validate channel if provided
  if (data.channel && !isValidChatChannel(data.channel)) {
    return false;
  }
  
  // For whispers, validate target
  if (data.channel === 'whisper' && !data.targetId) {
    return false;
  }
  
  return true;
}

/**
 * Check if a chat channel is valid
 * @param {string} channel - Chat channel name
 * @returns {boolean} Whether the channel is valid
 */
function isValidChatChannel(channel) {
  const validChannels = ['global', 'venture', 'whisper'];
  return validChannels.includes(channel);
}

/**
 * Validate venture request
 * @param {Object} data - Venture request data
 * @returns {boolean} Whether the request is valid
 */
function validateVentureRequest(data) {
  // Check if required fields exist
  if (!data || !data.action) {
    return false;
  }
  
  // Validate action
  const validActions = ['start', 'join', 'leave', 'complete'];
  if (!validActions.includes(data.action)) {
    return false;
  }
  
  // Action-specific validation
  switch (data.action) {
    case 'start':
      return validateStartVentureRequest(data);
    case 'join':
      return !!data.ventureId;
    case 'leave':
      return true; // No additional validation needed
    case 'complete':
      return !!data.ventureId;
    default:
      return false;
  }
}

/**
 * Validate start venture request
 * @param {Object} data - Start venture request data
 * @returns {boolean} Whether the request is valid
 */
function validateStartVentureRequest(data) {
  // Check for required fields
  if (!data.type || !isValidVentureType(data.type)) {
    return false;
  }
  
  // Validate tier
  if (data.tier !== undefined) {
    if (!Number.isInteger(data.tier) || data.tier < 1 || data.tier > 5) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a venture type is valid
 * @param {string} type - Venture type
 * @returns {boolean} Whether the type is valid
 */
function isValidVentureType(type) {
  const validTypes = ['gather', 'combat', 'scout', 'boss'];
  return validTypes.includes(type);
}

/**
 * Validate resource collection request
 * @param {Object} data - Resource collection request
 * @param {Object} playerEntity - Player entity
 * @param {Object} resourceEntity - Resource entity
 * @returns {boolean} Whether the request is valid
 */
function validateResourceCollection(data, playerEntity, resourceEntity) {
  if (!playerEntity || !resourceEntity) {
    return false;
  }
  
  // Check if player is within range of resource
  const dx = playerEntity.transform.x - resourceEntity.transform.x;
  const dy = playerEntity.transform.y - resourceEntity.transform.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > MAX_RESOURCE_GATHER_DISTANCE) {
    return false;
  }
  
  // Check if resource has available amount
  if (resourceEntity.resourceNode.amount <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Validate player movement
 * @param {Object} playerEntity - Player entity
 * @param {Object} previousPosition - Previous position
 * @param {Object} newPosition - New position
 * @param {number} deltaTime - Time since last update in seconds
 * @returns {boolean} Whether the movement is valid
 */
function validatePlayerMovement(playerEntity, previousPosition, newPosition, deltaTime) {
  // Calculate distance moved
  const dx = newPosition.x - previousPosition.x;
  const dy = newPosition.y - previousPosition.y;
  const distanceMoved = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate maximum allowed distance
  const maxDistance = playerEntity.physics.maxSpeed * deltaTime + MAX_DISTANCE_DELTA;
  
  // Check if distance is within allowed limit
  if (distanceMoved > maxDistance) {
    return false;
  }
  
  return true;
}

/**
 * Validate skill usage
 * @param {Object} playerEntity - Player entity
 * @param {string} skillType - Type of skill
 * @returns {boolean} Whether the skill usage is valid
 */
function validateSkillUsage(playerEntity, skillType) {
  // Check if player has the skill
  if (!playerEntity.player.skills[skillType]) {
    return false;
  }
  
  // Check if skill is locked
  if (playerEntity.player.skillLocks[skillType]) {
    return false;
  }
  
  // Check cooldown
  if (playerEntity.player.cooldowns[skillType] > 0) {
    return false;
  }
  
  // Check fatigue
  const skillEntity = playerEntity.player.skills[skillType];
  if (skillEntity && skillEntity.skill) {
    const fatigueCost = skillEntity.skill.fatigueCost || 0;
    if (playerEntity.player.currentFatigue + fatigueCost > playerEntity.player.maxFatigue) {
      return false;
    }
  }
  
  return true;
}

/**
 * Perform rate limiting check for client
 * @param {Object} session - Client session
 * @param {string} actionType - Type of action
 * @returns {boolean} Whether the action is allowed
 */
function checkRateLimit(session, actionType) {
  // Reset counter if time window has passed
  const now = Date.now();
  if (now > session.messageCountResetTime) {
    session.messageCount = 0;
    session.messageCountResetTime = now + 60000; // 1 minute window
  }
  
  // Increment message count
  session.messageCount++;
  
  // Check against rate limit
  switch (actionType) {
    case 'input':
      return session.messageCount <= MAX_INPUTS_PER_SECOND * 60;
    case 'chat':
      return session.messageCount <= 60; // 1 message per second max
    default:
      return session.messageCount <= 100; // General limit
  }
}

module.exports = {
  validateJoinRequest,
  validateInputMessage,
  validateChatMessage,
  validateVentureRequest,
  validateResourceCollection,
  validatePlayerMovement,
  validateSkillUsage,
  checkRateLimit
};