/**
 * Session management module for server
 * Tracks active connections and provides session utilities
 */

// Map client IDs to session objects
const activeSessions = new Map();

// Map player entity IDs to client IDs for quick lookups
const entityToClientMap = new Map();

/**
 * Create a new client session
 * @param {string} clientId - Unique client identifier
 * @param {WebSocket} socket - Client WebSocket connection
 * @returns {Object} Created session object
 */
function createSession(clientId, socket) {
  // Create session object
  const session = {
    clientId,
    socket,
    playerEntityIds: [], // One client could have multiple characters
    activeCharacterId: null,
    connected: true,
    firstConnectedAt: Date.now(),
    lastConnectedAt: Date.now(),
    disconnectedAt: null,
    ipAddress: socket._socket.remoteAddress,
    userAgent: socket.upgradeReq ? socket.upgradeReq.headers['user-agent'] : 'Unknown',
    authToken: null,
    account: null, // Will be populated after authentication
    // Stats for monitoring
    messagesSent: 0,
    messagesReceived: 0,
    lastActivity: Date.now(),
    // Game state
    currentVentureId: null,
    currentLocation: null,
    // Used for rate limiting
    messageCount: 0,
    messageCountResetTime: Date.now() + 60000, // 1 minute window
  };
  
  // Store in session map
  activeSessions.set(clientId, session);
  
  return session;
}

/**
 * Get a session by client ID
 * @param {string} clientId - Client ID
 * @returns {Object|null} Session object or null if not found
 */
function getSession(clientId) {
  return activeSessions.get(clientId) || null;
}

/**
 * Remove a session
 * @param {string} clientId - Client ID
 */
function removeSession(clientId) {
  // Get session first
  const session = activeSessions.get(clientId);
  
  if (session) {
    // Clean up entity to client mappings
    for (const entityId of session.playerEntityIds) {
      entityToClientMap.delete(entityId);
    }
    
    // Remove session
    activeSessions.delete(clientId);
  }
}

/**
 * Mark a session as disconnected
 * @param {string} clientId - Client ID
 */
function disconnectSession(clientId) {
  const session = activeSessions.get(clientId);
  
  if (session) {
    session.connected = false;
    session.disconnectedAt = Date.now();
  }
}

/**
 * Mark a session as reconnected
 * @param {string} clientId - Client ID
 * @param {WebSocket} socket - New WebSocket connection
 */
function reconnectSession(clientId, socket) {
  const session = activeSessions.get(clientId);
  
  if (session) {
    session.connected = true;
    session.lastConnectedAt = Date.now();
    session.disconnectedAt = null;
    session.socket = socket;
  }
}

/**
 * Associate a player entity with a client session
 * @param {string} clientId - Client ID
 * @param {string} entityId - Player entity ID
 */
function associateEntity(clientId, entityId) {
  const session = activeSessions.get(clientId);
  
  if (session) {
    session.playerEntityIds.push(entityId);
    
    // If no active character, set this as active
    if (!session.activeCharacterId) {
      session.activeCharacterId = entityId;
    }
    
    // Map entity to client for reverse lookup
    entityToClientMap.set(entityId, clientId);
  }
}

/**
 * Get client ID associated with a player entity
 * @param {string} entityId - Player entity ID
 * @returns {string|null} Client ID or null if not found
 */
function getClientIdForEntity(entityId) {
  return entityToClientMap.get(entityId) || null;
}

/**
 * Clean up old sessions based on timeout threshold
 * @param {number} timeoutMs - Timeout threshold in milliseconds
 */
function cleanupSessions(timeoutMs = 3600000) { // Default 1 hour
  const now = Date.now();
  
  for (const [clientId, session] of activeSessions.entries()) {
    // Skip connected sessions
    if (session.connected) continue;
    
    // Check if session has been disconnected longer than threshold
    if (session.disconnectedAt && now - session.disconnectedAt > timeoutMs) {
      console.log(`Removing timed out session for client ${clientId}`);
      removeSession(clientId);
    }
  }
}

/**
 * Get the number of active connections
 * @returns {number} Number of active connections
 */
function getActiveConnectionCount() {
  let count = 0;
  
  for (const session of activeSessions.values()) {
    if (session.connected) count++;
  }
  
  return count;
}

/**
 * Get information about active sessions
 * @returns {Array} Array of session info objects
 */
function getSessionInfo() {
  const sessions = [];
  
  for (const [clientId, session] of activeSessions.entries()) {
    sessions.push({
      clientId,
      connected: session.connected,
      entityIds: [...session.playerEntityIds],
      activeCharacterId: session.activeCharacterId,
      firstConnectedAt: session.firstConnectedAt,
      lastConnectedAt: session.lastConnectedAt,
      disconnectedAt: session.disconnectedAt,
      currentVentureId: session.currentVentureId
    });
  }
  
  return sessions;
}

module.exports = {
  createSession,
  getSession,
  removeSession,
  disconnectSession,
  reconnectSession,
  associateEntity,
  getClientIdForEntity,
  cleanupSessions,
  getActiveConnectionCount,
  getSessionInfo
};