// static/shared/systems/physics-system.js
import { System } from './system.js';
import * as RAPIER from '@dimforge/rapier2d-compat';

export class PhysicsSystem extends System {
  constructor() {
    super();
    this.name = 'PhysicsSystem';
    this.priority = 20;
    this.world = null;
    this.physicsWorld = null;
    this.initialized = false;
    this.bodies = new Map(); // Map entity IDs to physics bodies
    this.characterControllers = new Map(); // Map entity IDs to character controllers
    this.PHYSICS_SCALE = 0.1; // Convert game units to physics units
    
    // Rapier reference (will be set during initialization)
    this.RAPIER = null;
  }
  
  async init(world) {
    super.init(world);
    
    // Load Rapier
    if (typeof RAPIER === 'undefined') {
      console.error('RAPIER not found - PhysicsSystem requires Rapier.js to be loaded');
      return this;
    }
    
    this.RAPIER = RAPIER;
    
    // Initialize Rapier
    if (typeof this.RAPIER.init === 'function') {
      await this.RAPIER.init();
    }
    
    // Create the physics world
    this.physicsWorld = new this.RAPIER.World({ x: 0, y: -9.81 });
    console.log('Physics world created successfully');
    
    this.initialized = true;
    
    // Initialize existing physics entities
    this.initExistingEntities();
    
    return this;
  }
  
  initExistingEntities() {
    // Find all entities with physics components and initialize them
    const physicsEntities = this.world.with('physics', 'transform');
    
    for (const entity of physicsEntities) {
      this.createRigidBody(entity);
    }
  }
  
  createRigidBody(entity) {
    if (!this.initialized || !entity.physics || !entity.transform) return null;
    
    const { physics, transform } = entity;
    
    if (this.bodies.has(entity.id)) {
      return this.bodies.get(entity.id);
    }
    
    // Create rigid body description based on body type
    let bodyDesc;
    switch (physics.bodyType) {
      case 'static':
        bodyDesc = this.RAPIER.RigidBodyDesc.fixed();
        break;
      case 'kinematic':
        bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'dynamic':
      default:
        bodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
        break;
    }
    
    // Set initial position
    bodyDesc.setTranslation(
      transform.x * this.PHYSICS_SCALE,
      transform.y * this.PHYSICS_SCALE
    );
    
    // Create rigid body
    const rigidBody = this.physicsWorld.createRigidBody(bodyDesc);
    
    // Create collider based on collider type
    let colliderDesc;
    switch (physics.colliderType) {
      case 'circle':
        colliderDesc = this.RAPIER.ColliderDesc.ball(physics.radius * this.PHYSICS_SCALE);
        break;
      case 'box':
      default:
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
          physics.width * this.PHYSICS_SCALE / 2,
          physics.height * this.PHYSICS_SCALE / 2
        );
        break;
    }
    
    // Set physics material properties
    colliderDesc.setFriction(physics.friction);
    colliderDesc.setRestitution(physics.restitution);
    
    // Create collider
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    
    // Store references to Rapier objects
    physics.rigidbody = rigidBody;
    physics.collider = collider;
    
    // Store mapping from entity to rigid body
    this.bodies.set(entity.id, { rigidBody, collider });
    
    // Create character controller if needed
    if (physics.isCharacter) {
      this.createCharacterController(entity);
    }
    
    return { rigidBody, collider };
  }
  
  createCharacterController(entity) {
    if (!this.initialized || !entity.physics || !entity.physics.isCharacter) return null;
    
    const controller = this.physicsWorld.createCharacterController(0.01);
    
    // Configure character controller
    controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
    controller.enableAutostep(0.5, 0.2, true);
    controller.enableSnapToGround(0.5);
    
    // Store controller reference
    this.characterControllers.set(entity.id, controller);
    entity.physics.controller = controller;
    
    return controller;
  }
  
  createTerrainCollider(points, options) {
    if (!this.initialized) return null;
    
    // Create a static rigid body for the terrain
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);
    
    // Convert points to heights for a heightfield collider
    const heights = points.map(p => p.y * this.PHYSICS_SCALE);
    const width = points[points.length - 1].x - points[0].x;
    const scale = width / (points.length - 1) * this.PHYSICS_SCALE;
    
    // Create heightfield collider
    const colliderDesc = this.RAPIER.ColliderDesc.heightfield(
      points.length - 1,
      heights,
      { x: scale, y: 1.0 }
    );
    
    colliderDesc.setFriction(options.friction || 0.5);
    colliderDesc.setRestitution(options.restitution || 0.1);
    
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    
    // Position the terrain correctly
    rigidBody.setTranslation({
      x: points[0].x * this.PHYSICS_SCALE,
      y: 0
    });
    
    // Store reference if terrain ID provided
    if (options.terrainId) {
      this.bodies.set(options.terrainId, { rigidBody, collider });
    }
    
    return { rigidBody, collider };
  }
  
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Step the physics simulation
    this.physicsWorld.step();
    
    // Update transform components from physics state
    const physicsEntities = this.world.with('physics', 'transform');
    
    for (const entity of physicsEntities) {
      this.updateEntityFromPhysics(entity);
    }
    
    // Update grounded state for character controllers
    this.updateCharacterGroundedState();
  }
  
  updateEntityFromPhysics(entity) {
    const { physics, transform } = entity;
    
    if (!physics.rigidbody) return;
    
    // Skip if transform shouldn't be controlled by physics
    if (!transform.physicsControlled) return;
    
    // Get position from physics body
    const position = physics.rigidbody.translation();
    
    // Update transform with physics position (convert back to game units)
    transform.x = position.x / this.PHYSICS_SCALE;
    transform.y = position.y / this.PHYSICS_SCALE;
    
    // If the body is a dynamic body, update rotation as well
    if (physics.bodyType === 'dynamic') {
      const rotation = physics.rigidbody.rotation();
      transform.rotationZ = rotation;
    }
  }
  
  updateCharacterGroundedState() {
    for (const [entityId, controller] of this.characterControllers.entries()) {
      const entity = this.world.entities.find(e => e.id === entityId);
      if (entity && entity.physics) {
        // Update grounded state with a ray cast
        const position = entity.physics.rigidbody.translation();
        
        // Cast a short ray downward to check for ground
        const rayOrigin = { x: position.x, y: position.y };
        const rayDir = { x: 0, y: -1 };
        const hit = this.physicsWorld.castRay(
          rayOrigin, 
          rayDir, 
          0.2, // Max distance
          true  // Solid objects only
        );
        
        entity.physics.grounded = hit !== null;
      }
    }
  }
  
  moveCharacter(entity, movement) {
    if (!this.initialized || !entity.physics || !entity.physics.isCharacter) return false;
    
    const controller = this.characterControllers.get(entity.id);
    if (!controller) return false;
    
    const collider = entity.physics.collider;
    if (!collider) return false;
    
    // Scale movement to physics units
    const physicsMovement = {
      x: movement.x * this.PHYSICS_SCALE,
      y: movement.y * this.PHYSICS_SCALE
    };
    
    // Compute collision-free movement
    controller.computeColliderMovement(collider, physicsMovement);
    
    // Get the corrected movement
    const computedMovement = controller.computedMovement();
    
    // Apply the movement
    const currentPos = entity.physics.rigidbody.translation();
    entity.physics.rigidbody.setNextKinematicTranslation({
      x: currentPos.x + computedMovement.x,
      y: currentPos.y + computedMovement.y
    });
    
    return true;
  }
  
  applyImpulse(entity, impulse) {
    if (!this.initialized || !entity.physics || !entity.physics.rigidbody) return;
    
    // Only apply impulses to dynamic bodies
    if (entity.physics.bodyType !== 'dynamic') return;
    
    // Scale impulse to physics units
    const physicsImpulse = {
      x: impulse.x * this.PHYSICS_SCALE,
      y: impulse.y * this.PHYSICS_SCALE
    };
    
    entity.physics.rigidbody.applyImpulse(physicsImpulse, true);
  }
  
  destroy() {
    // Clean up physics resources
    this.bodies.clear();
    this.characterControllers.clear();
    this.physicsWorld = null;
    this.initialized = false;
  }
}