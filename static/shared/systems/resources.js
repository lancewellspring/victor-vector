// static/shared/systems/resources.js
import { System } from './system.js';

export class ResourceSystem extends System {
  constructor() {
    super();
    this.name = 'ResourceSystem';
    this.priority = 35;
    this.dependsOn('PlayerSystem');
    this.activeGatherers = new Map(); // Entity ID -> resource node being gathered
  }
  
  init(world) {
    super.init(world);
    
    // Subscribe to gathering attempt events
    this.subscribe('gatheringAttempted', this.handleGatheringAttempt.bind(this));
    
    return this;
  }
  
  update(deltaTime) {
    // Process active gathering
    for (const [entityId, nodeId] of this.activeGatherers.entries()) {
      this.updateGathering(entityId, nodeId, deltaTime);
    }
    
    // Process resource node respawning
    this.updateResourceNodes(deltaTime);
  }
  
  handleGatheringAttempt(data) {
    const { entity } = data;
    if (!entity || !entity.player) return;
    
    // Find nearby resource nodes
    const nearbyNode = this.findNearbyResourceNode(entity);
    if (!nearbyNode) return;
    
    // Start gathering
    this.startGathering(entity, nearbyNode);
  }
  
  findNearbyResourceNode(entity) {
    // Get player position
    const playerPos = entity.transform;
    if (!playerPos) return null;
    
    // Find all resource nodes
    const resourceNodes = this.world.with('resourceNode', 'transform');
    
    // Find the closest node within range
    let closestNode = null;
    let closestDistance = Infinity;
    
    for (const node of resourceNodes) {
      const nodePos = node.transform;
      if (!nodePos) continue;
      
      // Calculate distance
      const dx = nodePos.x - playerPos.x;
      const dy = nodePos.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if within detection radius and closer than previous
      if (distance <= node.resourceNode.detectionRadius && distance < closestDistance) {
        closestNode = node;
        closestDistance = distance;
      }
    }
    
    return closestNode;
  }
  
  startGathering(entity, node) {
    if (!entity || !node) return;
    
    // Set node as being gathered
    node.resourceNode.isBeingGathered = true;
    node.resourceNode.gatherProgress = 0;
    
    // Set player as gathering
    entity.player.state = 'gathering';
    
    // Track the gathering
    this.activeGatherers.set(entity.id, node.id);
    
    // Emit event
    this.world.events.emit('gatheringStarted', { 
      entity, 
      node, 
      resourceType: node.resourceNode.type 
    });
  }
  
  updateGathering(entityId, nodeId, deltaTime) {
    const entity = this.world.getEntity(entityId);
    const node = this.world.getEntity(nodeId);
    
    if (!entity || !node || !entity.player || !node.resourceNode) {
      // Something is missing, cancel gathering
      this.stopGathering(entityId, nodeId);
      return;
    }
    
    // Check if still in range
    const playerPos = entity.transform;
    const nodePos = node.transform;
    if (!playerPos || !nodePos) {
      this.stopGathering(entityId, nodeId);
      return;
    }
    
    const dx = nodePos.x - playerPos.x;
    const dy = nodePos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > node.resourceNode.detectionRadius) {
      this.stopGathering(entityId, nodeId);
      return;
    }
    
    // Update gathering progress
    const gatherRate = node.resourceNode.gatherRate;
    node.resourceNode.gatherProgress += gatherRate * deltaTime;
    
    // Check if a unit has been gathered
    if (node.resourceNode.gatherProgress >= 1) {
      // Reset progress
      node.resourceNode.gatherProgress = 0;
      
      // Calculate amount gathered
      const amountToGather = Math.min(1, node.resourceNode.amount);
      
      if (amountToGather > 0) {
        // Update node amount
        node.resourceNode.amount -= amountToGather;
        
        // Add to player inventory
        this.world.events.emit('resourceCollected', {
          playerEntity: entity,
          resourceType: node.resourceNode.type,
          amount: amountToGather
        });
        
        // Apply fatigue
        this.world.events.emit('playerDamaged', {
          entity,
          amount: node.resourceNode.fatiguePerUnit * amountToGather,
          source: 'gathering',
          isFatal: false
        });
      }
      
      // Check if node is depleted
      if (node.resourceNode.amount <= 0) {
        node.resourceNode.gatherComplete = true;
        this.stopGathering(entityId, nodeId);
      }
    }
  }
  
  stopGathering(entityId, nodeId) {
    const entity = this.world.getEntity(entityId);
    const node = this.world.getEntity(nodeId);
    
    // Update player state
    if (entity && entity.player) {
      entity.player.state = 'idle';
    }
    
    // Update node state
    if (node && node.resourceNode) {
      node.resourceNode.isBeingGathered = false;
    }
    
    // Remove from active gatherers
    this.activeGatherers.delete(entityId);
    
    // Emit event
    this.world.events.emit('gatheringStopped', { entityId, nodeId });
  }
  
  updateResourceNodes(deltaTime) {
    // Process resource respawning
    const resourceNodes = this.world.with('resourceNode');
    
    for (const node of resourceNodes) {
      // Skip nodes being gathered or at max capacity
      if (node.resourceNode.isBeingGathered || 
          node.resourceNode.amount >= node.resourceNode.maxAmount) {
        continue;
      }
      
      // Respawn resources over time
      const respawnAmount = node.resourceNode.respawnRate * deltaTime;
      node.resourceNode.amount = Math.min(
        node.resourceNode.amount + respawnAmount,
        node.resourceNode.maxAmount
      );
      
      // Reset gather complete when fully respawned
      if (node.resourceNode.amount >= node.resourceNode.maxAmount) {
        node.resourceNode.gatherComplete = false;
      }
    }
  }
}