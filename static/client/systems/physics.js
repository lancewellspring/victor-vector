// static/client/systems/physics.js
import { PhysicsSystem } from '@shared/systems/physics.js';
import * as THREE from 'three';

export class ClientPhysicsSystem extends PhysicsSystem {
  constructor() {
    super();
    this.debugDraw = false;
    this.debugMeshes = [];
  }
  
  async init(world) {
    // Call parent init
    await super.init(world);
    
    // Add client-specific initialization
    this.initDebugRenderer();
    
    // Subscribe to physics events
    this.subscribe('entityCreated', this.handleEntityCreated);
    
    return this;
  }
  
  handleEntityCreated(data) {
    const { entity } = data;
    if (entity.physics && entity.transform && !entity.physics.rigidbody) {
      this.createRigidBody(entity);
    }
  }
  
  initDebugRenderer() {
    // Only initialize if THREE is available and debug is enabled
    if (typeof THREE === 'undefined' || !this.debugDraw) return;
    
    // Find render system
    const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
    if (!renderSystem || !renderSystem.scene) return;
    
    // Create materials for debug visualization
    this.debugMaterials = {
      static: new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
      dynamic: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
      kinematic: new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true }),
      character: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
    };
  }
  
  update(deltaTime) {
    // Update physics
    super.update(deltaTime);
    
    // Update debug visualization if enabled
    if (this.debugDraw) {
      this.updateDebugVisualization();
    }
  }
  
  updateDebugVisualization() {
    // Find render system
    const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
    if (!renderSystem || !renderSystem.scene) return;
    
    // Update or create debug meshes for each physics body
    for (const [entityId, { rigidBody, collider }] of this.bodies.entries()) {
      // Skip if no rigid body or collider
      if (!rigidBody || !collider) continue;
      
      // Get entity for this physics body
      const entity = this.world.entities.find(e => e.id === entityId);
      if (!entity) continue;
      
      // Get or create debug mesh
      let debugMesh = this.debugMeshes.find(m => m.userData.entityId === entityId);
      
      if (!debugMesh) {
        // Create new debug mesh based on collider type
        debugMesh = this.createDebugMesh(entity);
        if (debugMesh) {
          debugMesh.userData.entityId = entityId;
          this.debugMeshes.push(debugMesh);
          renderSystem.scene.add(debugMesh);
        }
      }
      
      if (debugMesh) {
        // Update debug mesh position and rotation
        const position = rigidBody.translation();
        debugMesh.position.set(
          position.x / this.PHYSICS_SCALE,
          position.y / this.PHYSICS_SCALE,
          0
        );
        
        // Update rotation if applicable
        if (entity.physics.bodyType === 'dynamic') {
          debugMesh.rotation.z = rigidBody.rotation();
        }
      }
    }
  }
  
  createDebugMesh(entity) {
    if (!entity.physics) return null;
    
    const { physics } = entity;
    
    // Create geometry based on collider type
    let geometry;
    switch (physics.colliderType) {
      case 'circle':
        geometry = new THREE.CircleGeometry(physics.radius, 32);
        break;
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(physics.width, physics.height, 0.1);
        break;
    }
    
    // Get material based on body type
    let material;
    if (physics.isCharacter) {
      material = this.debugMaterials.character;
    } else {
      material = this.debugMaterials[physics.bodyType] || this.debugMaterials.dynamic;
    }
    
    // Create mesh
    return new THREE.Mesh(geometry, material);
  }
  
  toggleDebugDraw() {
    this.debugDraw = !this.debugDraw;
    
    if (this.debugDraw && this.debugMeshes.length === 0) {
      this.initDebugRenderer();
      
      // Create debug meshes for existing physics bodies
      const physicsEntities = this.world.with('physics');
      for (const entity of physicsEntities) {
        const debugMesh = this.createDebugMesh(entity);
        if (debugMesh) {
          debugMesh.userData.entityId = entity.id;
          this.debugMeshes.push(debugMesh);
          
          // Find render system and add mesh to scene
          const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
          if (renderSystem && renderSystem.scene) {
            renderSystem.scene.add(debugMesh);
          }
        }
      }
    }
    
    // Show/hide debug meshes
    for (const mesh of this.debugMeshes) {
      mesh.visible = this.debugDraw;
    }
    
    return this.debugDraw;
  }
  
  destroy() {
    // Clean up debug visualization resources
    const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
    if (renderSystem && renderSystem.scene) {
      for (const mesh of this.debugMeshes) {
        renderSystem.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      }
    }
    
    this.debugMeshes = [];
    
    // Call parent destroy
    super.destroy();
  }
}