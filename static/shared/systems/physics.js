// static/shared/systems/physics-system.js
import { System } from "./system.js";
import * as RAPIER from "@dimforge/rapier2d-compat";

export class PhysicsSystem extends System {
  constructor() {
    super();
    this.name = "PhysicsSystem";
    this.priority = 20;
    this.physicsWorld = null;
    this.bodies = new Map(); // entity ID → physics body
    this.characterControllers = new Map(); // entity ID → controller
    this.collisionPairs = []; // collisions detected this frame
    this.PHYSICS_SCALE = 0.1; // Convert game units to physics units
    this.RAPIER = null; // Will be set during initialization
  }

  async init(world) {
    super.init(world);

    // Get Rapier reference
    if (typeof window !== "undefined" && window.RAPIER) {
      this.RAPIER = window.RAPIER;
    } else {
      try {
        this.RAPIER = await import("@dimforge/rapier2d-compat");
      } catch (err) {
        console.error("Failed to load Rapier:", err);
        return this;
      }
    }

    // Initialize Rapier
    if (typeof this.RAPIER.init === "function") {
      await this.RAPIER.init();
    }

    // Create physics world
    this.physicsWorld = new this.RAPIER.World({ x: 0, y: -9.81 });

    // Setup collision events
    this.setupCollisionEvents();

    return this;
  }

  setupCollisionEvents() {
    const world = this.physicsWorld;

    // Create event handler for collisions
    world.contactPairEvents().forEach((event) => {
      const collider1 = event.collider1();
      const collider2 = event.collider2();

      // Get rigid bodies
      const body1 = collider1.parent();
      const body2 = collider2.parent();

      // Get entity IDs (stored as userData)
      const entityId1 = body1?.userData;
      const entityId2 = body2?.userData;

      if (entityId1 && entityId2) {
        // Store collision pair to process during update
        this.collisionPairs.push({
          entityA: entityId1,
          entityB: entityId2,
          type: event.started() ? "begin" : "end",
        });
      }
    });
  }

  processCollisions() {
    // Process all collision pairs collected during physics step
    for (const collision of this.collisionPairs) {
      const entityA = this.world.getEntity(collision.entityA);
      const entityB = this.world.getEntity(collision.entityB);

      if (entityA && entityB) {
        // Emit collision event
        this.world.events.emit("collision", {
          entityA,
          entityB,
          type: collision.type,
        });
      }
    }

    // Clear collision pairs for next frame
    this.collisionPairs = [];
  }

  createRigidBody(entity) {
    const { physics, transform } = entity;

    // Skip if already created
    if (physics.rigidBody) return physics.rigidBody;

    // Create body description based on type
    let bodyDesc;
    switch (physics.bodyType) {
      case "static":
        bodyDesc = this.RAPIER.RigidBodyDesc.fixed();
        break;
      case "kinematic":
        bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case "dynamic":
      default:
        bodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
    }

    // Set position (scaled to physics units)
    bodyDesc.setTranslation(
      transform.x * this.PHYSICS_SCALE,
      transform.y * this.PHYSICS_SCALE
    );

    // Create rigid body
    const rigidBody = this.physicsWorld.createRigidBody(bodyDesc);
    rigidBody.userData = entity.id; // Store entity ID for collision lookup

    // Store reference
    physics.rigidBody = rigidBody;
    this.bodies.set(entity.id, rigidBody);

    // Create collider based on type
    this.createCollider(entity);

    // Create character controller if needed
    if (physics.isCharacter) {
      this.createCharacterController(entity);
    }

    return rigidBody;
  }

  createCollider(entity) {
    const { physics } = entity;

    if (!physics.rigidBody) return null;

    // Create collider description based on type
    let colliderDesc;
    switch (physics.colliderType) {
      case "circle":
        colliderDesc = this.RAPIER.ColliderDesc.ball(
          physics.radius * this.PHYSICS_SCALE
        );
        break;
      case "box":
      default:
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
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
      physics.rigidBody
    );

    // Store reference
    physics.collider = collider;

    return collider;
  }

  createCharacterController(entity) {
    const { physics } = entity;

    if (!physics.rigidBody || !physics.collider) return null;

    // Create character controller
    const controller = this.physicsWorld.createCharacterController(0.01);

    // Configure controller
    controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
    controller.enableAutostep(0.5, 0.2, true);
    controller.enableSnapToGround(0.5);

    // Store reference
    physics.controller = controller;
    this.characterControllers.set(entity.id, controller);

    return controller;
  }

  teleportEntity(entity, x, y) {
    if (!this.initialized || !entity.physics || !entity.physics.rigidbody)
      return false;

    // Convert to physics units
    const physX = x * this.PHYSICS_SCALE;
    const physY = y * this.PHYSICS_SCALE;

    // Set position directly
    if (entity.physics.bodyType === "dynamic") {
      entity.physics.rigidbody.setTranslation({ x: physX, y: physY }, true);
    } else {
      entity.physics.rigidbody.setNextKinematicTranslation({
        x: physX,
        y: physY,
      });
    }

    // Update transform
    entity.transform.x = x;
    entity.transform.y = y;

    return true;
  }

  update(deltaTime) {
    // Step the physics simulation
    this.physicsWorld.step();

    // Process collision events
    this.processCollisions();

    // Update transform components from physics bodies
    const physicsEntities = this.world.with("physics", "transform");

    for (const entity of physicsEntities) {
      this.updateTransformFromPhysics(entity);
    }

    // Update grounded state for character controllers
    this.updateGroundedStates();
  }

  updateTransformFromPhysics(entity) {
    const { physics, transform } = entity;

    if (!physics.rigidBody || !transform.physicsControlled) return;

    // Get position from physics body
    const position = physics.rigidBody.translation();

    // Scale back to game units
    transform.x = position.x / this.PHYSICS_SCALE;
    transform.y = position.y / this.PHYSICS_SCALE;

    // Update rotation for dynamic bodies
    if (physics.bodyType === "dynamic") {
      transform.rotationZ = physics.rigidBody.rotation();
    }
  }

  updateGroundedStates() {
    // Cast a ray downward for each character controller
    for (const [entityId, controller] of this.characterControllers.entries()) {
      const entity = this.world.getEntity(entityId);

      if (entity && entity.physics && entity.physics.rigidBody) {
        const pos = entity.physics.rigidBody.translation();

        // Cast ray downward a short distance
        const ray = { x: pos.x, y: pos.y };
        const dir = { x: 0, y: -1 };

        const hit = this.physicsWorld.castRay(ray, dir, 0.2, true);

        // Update grounded state
        entity.physics.grounded = hit !== null;
      }
    }
  }

  // Helper for character movement (called by InputSystem)
  moveCharacter(entity, direction) {
    const { physics } = entity;

    if (!physics.isCharacter || !physics.controller) return false;

    // Calculate desired movement
    const movement = {
      x: direction * physics.moveSpeed * this.PHYSICS_SCALE,
      y: 0,
    };

    // Compute collision-free movement
    physics.controller.computeColliderMovement(physics.collider, movement);

    // Get the corrected movement
    const computedMovement = physics.controller.computedMovement();

    // Apply the movement
    const currentPos = physics.rigidBody.translation();
    physics.rigidBody.setNextKinematicTranslation({
      x: currentPos.x + computedMovement.x,
      y: currentPos.y + computedMovement.y,
    });

    return true;
  }

  // Helper for character jumping (called by InputSystem)
  jumpCharacter(entity) {
    const { physics } = entity;

    if (!physics.isCharacter || !physics.grounded) return false;

    // Apply jump impulse
    const currentPos = physics.rigidBody.translation();
    physics.rigidBody.setTranslation({
      x: currentPos.x,
      y: currentPos.y + physics.jumpForce * this.PHYSICS_SCALE,
    });

    // Update grounded state
    physics.grounded = false;

    return true;
  }

  // Create terrain collider from points
  createTerrainCollider(points, options = {}) {
    // Create static rigid body for terrain
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.physicsWorld.createRigidBody(rigidBodyDesc);

    // Convert points to heights for heightfield
    const heights = points.map((p) => p.y * this.PHYSICS_SCALE);

    // Create heightfield collider
    const colliderDesc = this.RAPIER.ColliderDesc.heightfield(
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
      y: 0,
    });

    return { rigidBody, collider };
  }

  removeBody(entity) {
    if (!this.initialized || !entity || !entity.physics) return;

    // Remove from physics world
    if (entity.physics.rigidbody) {
      this.physicsWorld.removeRigidBody(entity.physics.rigidbody);
    }

    // Remove from internal maps
    this.bodies.delete(entity.id);
    this.characterControllers.delete(entity.id);

    // Clean up component references
    if (entity.physics) {
      entity.physics.rigidbody = null;
      entity.physics.collider = null;
      entity.physics.controller = null;
    }
  }

  destroy() {
    // Clean up physics resources
    this.bodies.clear();
    this.characterControllers.clear();
    this.physicsWorld = null;
  }
}
