/**
 * Server Physics System
 * Authoritative physics system for server-side validation and simulation
 */

// Import shared System base class
import { System } from "../../static/shared/systems/system.js";
// Import RAPIER physics engine
import RAPIER from '@dimforge/rapier2d-compat';
// Import validation module
import validation from '../game/validation.js';
// Import WebSocket module for sending updates
import websocket from '../network/websocket.js';

export class ServerPhysicsSystem extends System {
  constructor() {
    super();
    this.name = 'ServerPhysicsSystem';
    this.priority = 20; // Run after input processing but before state updates
    
    // Physics world and state
    this.physicsWorld = null;
    this.bodies = new Map(); // entity ID → physics body
    this.characterControllers = new Map(); // entity ID → controller
    this.PHYSICS_SCALE = 0.1; // Convert game units to physics units
    
    // Collision detection
    this.collisionPairs = [];
    
    // Input processing
    this.inputQueue = new Map(); // entity ID → array of inputs
    
    // Validation tracking
    this.invalidMoves = new Map(); // entity ID → count of invalid moves
    this.MAX_INVALID_MOVES = 10; // How many invalid moves before taking action
    
    // Performance monitoring
    this.lastUpdateTime = 0;
    this.updateTimes = []; // For averaging
  }
  
  async init(world) {
    super.init(world);
    
    // Initialize RAPIER physics
    await RAPIER.init();
    
    // Create physics world
    this.physicsWorld = new RAPIER.World({ x: 0, y: -9.81 });
    
    // Set up event handling
    this.setupCollisionEvents();
    
    // Initialize existing physics entities
    this.initializeExistingEntities();
    
    console.log('ServerPhysicsSystem initialized');
    return this;
  }
  
  setupCollisionEvents() {
    const world = this.physicsWorld;
    
    // Create event handler for collisions
//     world.contactPairEvents().forEach((event) => {
//       const collider1 = event.collider1();
//       const collider2 = event.collider2();
      
//       // Get rigid bodies
//       const body1 = collider1.parent();
//       const body2 = collider2.parent();
      
//       // Get entity IDs (stored as userData)
//       const entityId1 = body1?.userData;
//       const entityId2 = body2?.userData;
      
//       if (entityId1 && entityId2) {
//         // Store collision pair to process during update
//         this.collisionPairs.push({
//           entityA: entityId1,
//           entityB: entityId2,
//           type: event.started() ? 'begin' : 'end'
//         });
//       }
//     });
  }
  
  initializeExistingEntities() {
    // Find all entities with server physics components
    const physicsEntities = this.world.with('serverPhysics', 'transform');
    
    for (const entity of physicsEntities) {
      this.createPhysicsBody(entity);
    }
    
    console.log(`Initialized ${physicsEntities.length} physics entities`);
  }
  
  createPhysicsBody(entity) {
    // Skip if already has a rigid body
    if (entity.serverPhysics.rigidbody) return;
    
    let bodyDesc;
    
    // Determine body type based on entity components
    if (entity.physics) {
      // Use client-facing physics component for configuration
      switch (entity.physics.bodyType) {
        case 'static':
          bodyDesc = RAPIER.RigidBodyDesc.fixed();
          break;
        case 'kinematic':
          bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
          break;
        case 'dynamic':
        default:
          bodyDesc = RAPIER.RigidBodyDesc.dynamic();
      }
      
      // Set initial position
      bodyDesc.setTranslation(
        entity.transform.x * this.PHYSICS_SCALE,
        entity.transform.y * this.PHYSICS_SCALE
      );
      
      // Create rigid body
      const rigidBody = this.physicsWorld.createRigidBody(bodyDesc);
      rigidBody.userData = entity.id; // Store entity ID for collision lookup
      
      // Store reference
      entity.serverPhysics.rigidbody = rigidBody;
      this.bodies.set(entity.id, rigidBody);
      
      // Create collider based on type
      this.createCollider(entity);
      
      // Create character controller if needed
      if (entity.physics.isCharacter) {
        this.createCharacterController(entity);
      }
    } else {
      // For entities that only have serverPhysics (server-only entities)
      bodyDesc = RAPIER.RigidBodyDesc.dynamic();
      bodyDesc.setTranslation(
        entity.transform.x * this.PHYSICS_SCALE,
        entity.transform.y * this.PHYSICS_SCALE
      );
      
      const rigidBody = this.physicsWorld.createRigidBody(bodyDesc);
      rigidBody.userData = entity.id;
      
      entity.serverPhysics.rigidbody = rigidBody;
      this.bodies.set(entity.id, rigidBody);
      
      // Create box collider by default
      const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1);
      this.physicsWorld.createCollider(colliderDesc, rigidBody);
    }
  }
  
  createCollider(entity) {
    const { physics } = entity;
    
    if (!entity.serverPhysics.rigidbody) return null;
    
    // Create collider description based on type
    let colliderDesc;
    switch (physics.colliderType) {
      case 'circle':
        colliderDesc = RAPIER.ColliderDesc.ball(
          physics.radius * this.PHYSICS_SCALE
        );
        break;
      case 'box':
      default:
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          (physics.width * this.PHYSICS_SCALE) / 2,
          (physics.height * this.PHYSICS_SCALE) / 2
        );
    }
    
    // Set material properties
    colliderDesc.setFriction(physics.friction);
    colliderDesc.setRestitution(physics.restitution);
    
    // Create collider
    const collider = this.physicsWorld.createCollider(
      colliderDesc,
      entity.serverPhysics.rigidbody
    );
    
    return collider;
  }
  
  createCharacterController(entity) {
    if (!entity.serverPhysics.rigidbody) return null;
    
    // Create character controller
    const controller = this.physicsWorld.createCharacterController(0.01);
    
    // Configure controller
    controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    controller.enableAutostep(0.5, 0.2, true);
    controller.enableSnapToGround(0.5);
    
    // Store reference
    this.characterControllers.set(entity.id, controller);
    
    return controller;
  }
  
  processInputs() {
    // Find all entities with connection components
    const connectionEntities = this.world.with('connection', 'serverPhysics');
    
    for (const entity of connectionEntities) {
      // Skip disconnected entities
      if (!entity.connection.connected) continue;
      
      // Get input buffer from connection
      const inputBuffer = entity.connection.inputBuffer || [];
      if (inputBuffer.length === 0) continue;
      
      // Sort inputs by sequence number
      inputBuffer.sort((a, b) => a.sequence - b.sequence);
      
      // Process each input
      for (const inputData of inputBuffer) {
        this.processInput(entity, inputData);
      }
      
      // Clear processed inputs
      entity.connection.inputBuffer = [];
      
      // Update last processed input
      if (inputBuffer.length > 0) {
        const lastInput = inputBuffer[inputBuffer.length - 1];
        entity.connection.lastProcessedInput = lastInput.sequence;
        entity.serverPhysics.lastProcessedInput = lastInput.sequence;
      }
    }
  }
  
  processInput(entity, inputData) {
    // Validate input
    if (!validation.validateInputMessage(inputData)) {
      console.warn(`Invalid input from client ${entity.connection.clientId}`);
      return false;
    }
    
    const { input, sequence } = inputData;
    
    // Skip if this input has already been processed
    if (sequence <= entity.serverPhysics.lastProcessedInput) {
      return false;
    }
    
    // Process movement
    if (input.moveDirection !== undefined) {
      this.processMovement(entity, input.moveDirection);
    }
    
    // Process jump
    if (input.jump) {
      this.processJump(entity);
    }
    
    // Process skill usage
    if (input.skill) {
      this.processSkill(entity, input.skill);
    }
    
    // Process gathering
    if (input.gather) {
      this.processGathering(entity);
    }
    
    return true;
  }
  
  processMovement(entity, moveDirection) {
    // Get character controller
    const controller = this.characterControllers.get(entity.id);
    if (!controller) return false;
    
    // Get rigid body
    const rigidBody = entity.serverPhysics.rigidbody;
    if (!rigidBody) return false;
    
    // Calculate movement speed
    const moveSpeed = entity.physics ? entity.physics.moveSpeed : 5;
    const scaledSpeed = moveSpeed * this.PHYSICS_SCALE;
    
    // Calculate movement vector
    const movement = { x: moveDirection * scaledSpeed, y: 0 };
    
    // Get collider from rigid body
    const collider = rigidBody.collider(0);
    if (!collider) return false;
    
    // Compute collision-free movement
    controller.computeColliderMovement(collider, movement);
    
    // Get the corrected movement
    const computedMovement = controller.computedMovement();
    
    // Apply the movement
    const currentPos = rigidBody.translation();
    rigidBody.setNextKinematicTranslation({
      x: currentPos.x + computedMovement.x,
      y: currentPos.y + computedMovement.y
    });
    
    // Update entity facing direction
    if (entity.player && moveDirection !== 0) {
      entity.player.facing = moveDirection > 0 ? 'right' : 'left';
    }
    
    return true;
  }
  
  processJump(entity) {
    // Check if grounded
    if (!entity.serverPhysics.grounded) return false;
    
    // Get rigid body
    const rigidBody = entity.serverPhysics.rigidbody;
    if (!rigidBody) return false;
    
    // Get jump force
    const jumpForce = entity.physics ? entity.physics.jumpForce : 10;
    const scaledForce = jumpForce * this.PHYSICS_SCALE;
    
    // Apply jump impulse
    const currentPos = rigidBody.translation();
    rigidBody.setTranslation({
      x: currentPos.x,
      y: currentPos.y + scaledForce * 0.1 // Apply initial boost
    });
    
    // Apply vertical impulse
    rigidBody.applyImpulse({ x: 0, y: scaledForce }, true);
    
    // Update grounded state
    entity.serverPhysics.grounded = false;
    if (entity.physics) {
      entity.physics.grounded = false;
    }
    
    return true;
  }
  
  processSkill(entity, skillType) {
    // Validate skill usage
    if (!validation.validateSkillUsage(entity, skillType)) {
      return false;
    }
    
    // Placeholder for skill system integration
    console.log(`${entity.id} used skill ${skillType}`);
    
    // The actual skill usage would typically be processed by a separate SkillSystem
    
    return true;
  }
  
  processGathering(entity) {
    // Find nearby resource nodes
    const resourceNode = this.findNearbyResourceNode(entity);
    if (!resourceNode) return false;
    
    // Validate resource collection
    if (!validation.validateResourceCollection({}, entity, resourceNode)) {
      return false;
    }
    
    // Placeholder for resource system integration
    console.log(`${entity.id} gathering from ${resourceNode.id}`);
    
    // The actual gathering would typically be processed by a separate ResourceSystem
    
    return true;
  }
  
  findNearbyResourceNode(entity) {
    // Simple implementation - would be expanded to include spatial partitioning
    const resourceNodes = this.world.with('resourceNode', 'transform');
    const MAX_GATHER_DISTANCE = 3; // Game units
    
    let closestNode = null;
    let closestDistance = MAX_GATHER_DISTANCE;
    
    for (const node of resourceNodes) {
      const dx = node.transform.x - entity.transform.x;
      const dy = node.transform.y - entity.transform.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNode = node;
      }
    }
    
    return closestNode;
  }
  
  updateGroundedStates() {
    // Cast a ray downward for each character controller
    for (const [entityId, controller] of this.characterControllers.entries()) {
      const entity = this.world.getEntity(entityId);
      
      if (entity && entity.serverPhysics && entity.serverPhysics.rigidbody) {
        const pos = entity.serverPhysics.rigidbody.translation();
        
        // Cast ray downward a short distance
        const ray = { x: pos.x, y: pos.y };
        const dir = { x: 0, y: -1 };
        
        const hit = this.physicsWorld.castRay(ray, dir, 0.2, true);
        
        // Update grounded state
        const wasGrounded = entity.serverPhysics.grounded;
        const isGrounded = hit !== null;
        
        entity.serverPhysics.grounded = isGrounded;
        
        // Also update client physics component if it exists
        if (entity.physics) {
          entity.physics.grounded = isGrounded;
        }
        
        // Emit event if grounded state changed
        if (wasGrounded !== isGrounded) {
          this.world.events.emit('groundedStateChanged', {
            entity,
            grounded: isGrounded
          });
        }
      }
    }
  }
  
  processPendingCollisions() {
    // Process collision events
    for (const collision of this.collisionPairs) {
      const entityA = this.world.getEntity(collision.entityA);
      const entityB = this.world.getEntity(collision.entityB);
      
      if (entityA && entityB) {
        // Emit collision event
        this.world.events.emit('collision', {
          entityA,
          entityB,
          type: collision.type
        });
      }
    }
    
    // Clear collision pairs for next frame
    this.collisionPairs = [];
  }
  
  updateTransforms() {
    // Update transform components from physics state
    for (const [entityId, body] of this.bodies.entries()) {
      const entity = this.world.getEntity(entityId);
      if (!entity || !entity.transform) continue;
      
      // Get position
      const position = body.translation();
      
      // Store previous position for interpolation
      entity.transform.previousX = entity.transform.x;
      entity.transform.previousY = entity.transform.y;
      
      // Update transform
      entity.transform.x = position.x / this.PHYSICS_SCALE;
      entity.transform.y = position.y / this.PHYSICS_SCALE;
      
      // Update rotation for dynamic bodies
      if (entity.physics && entity.physics.bodyType === 'dynamic') {
        entity.transform.rotationZ = body.rotation();
      }
      
      // Update server physics component
      if (entity.serverPhysics) {
        entity.serverPhysics.position.x = entity.transform.x;
        entity.serverPhysics.position.y = entity.transform.y;
        entity.serverPhysics.rotation = entity.transform.rotationZ;
        
        // Track position history for validation
        entity.serverPhysics.previousPositions.push({
          x: entity.transform.x,
          y: entity.transform.y,
          time: Date.now()
        });
        
        // Keep only recent positions
        if (entity.serverPhysics.previousPositions.length > 10) {
          entity.serverPhysics.previousPositions.shift();
        }
        
        // Mark for synchronization
        entity.serverPhysics.needsSync = true;
      }
    }
  }
  
  broadcastUpdates() {
    // Find connection system
    const connectionSystem = this.world.systems.find(sys => sys.name === 'ConnectionSystem');
    if (!connectionSystem) return;
    
    // Get entities that need synchronization
    const syncEntities = this.world.with('serverPhysics').where(entity => 
      entity.serverPhysics.needsSync
    );
    
    if (syncEntities.length === 0) return;
    
    // Create state update message
    const updates = [];
    
    for (const entity of syncEntities) {
      updates.push({
        id: entity.id,
        position: {
          x: entity.serverPhysics.position.x,
          y: entity.serverPhysics.position.y
        },
        rotation: entity.serverPhysics.rotation,
        physics: {
          velocity: entity.serverPhysics.velocity,
          grounded: entity.serverPhysics.grounded
        },
        lastProcessedInput: entity.serverPhysics.lastProcessedInput
      });
      
      // Reset sync flag
      entity.serverPhysics.needsSync = false;
    }
    
    // Broadcast update
    connectionSystem.broadcast('entityUpdates', {
      entities: updates,
      timestamp: Date.now()
    });
  }
  
  update(deltaTime) {
    const startTime = Date.now();
    
    // Process inputs
    this.processInputs();
    
    // Step physics simulation
    this.physicsWorld.step();
    
    // Update grounded states
    this.updateGroundedStates();
    
    // Process collisions
    this.processPendingCollisions();
    
    // Update transforms from physics
    this.updateTransforms();
    
    // Broadcast updates to clients
    this.broadcastUpdates();
    
    // Track performance
    const endTime = Date.now();
    const updateTime = endTime - startTime;
    
    this.updateTimes.push(updateTime);
    if (this.updateTimes.length > 100) {
      this.updateTimes.shift();
    }
    
    // Log performance occasionally
    if (endTime - this.lastUpdateTime > 5000) {
      const avgUpdateTime = this.updateTimes.reduce((sum, time) => sum + time, 0) / this.updateTimes.length;
      console.log(`Physics update avg time: ${avgUpdateTime.toFixed(2)}ms`);
      this.lastUpdateTime = endTime;
    }
  }
  
  createTerrainCollider(points, options = {}) {
    // Create static rigid body for terrain
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);
    
    // Convert points to heights for heightfield
    const heights = points.map(p => p.y * this.PHYSICS_SCALE);
    
    // Create heightfield collider
    const colliderDesc = RAPIER.ColliderDesc.heightfield(
      heights.length - 1,
      heights,
      { x: 1.0, y: 1.0 }
    );
    
    // Set material properties
    colliderDesc.setFriction(options.friction || 0.5);
    colliderDesc.setRestitution(options.restitution || 0.1);
    
    // Create collider
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    
    // Position the terrain
    rigidBody.setTranslation({
      x: points[0].x * this.PHYSICS_SCALE,
      y: 0
    });
    
    return { rigidBody, collider };
  }
  
  removeBody(entity) {
    if (!entity) return;
    
    // Remove character controller if exists
    if (this.characterControllers.has(entity.id)) {
      // No explicit cleanup needed for character controller
      this.characterControllers.delete(entity.id);
    }
    
    // Remove rigid body if exists
    if (this.bodies.has(entity.id)) {
      const body = this.bodies.get(entity.id);
      if (body) {
        this.physicsWorld.removeRigidBody(body);
      }
      this.bodies.delete(entity.id);
    }
    
    // Clear references
    if (entity.serverPhysics) {
      entity.serverPhysics.rigidbody = null;
    }
  }
  
  destroy() {
    // Clean up physics resources
    this.bodies.clear();
    this.characterControllers.clear();
    this.physicsWorld = null;
    
    super.destroy();
  }
}
