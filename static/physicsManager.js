let RAPIER;

if(typeof window !== 'undefined') window.RAPIER = exports;

if (typeof window !== 'undefined') {
  console.log('Window RAPIER check:', typeof window.RAPIER);
  // Check if it has the World constructor
  if (window.RAPIER) {
    console.log('RAPIER World check:', typeof window.RAPIER.World);
  } 
  RAPIER = window.RAPIER;
  
} else {
  // Node.js environment
  try {
    RAPIER = require('@dimforge/rapier2d-compat');
    console.log('Rapier loaded successfully');
    
    // Log available properties to debug
    //console.log('RAPIER contains:', Object.keys(RAPIER));
  } catch (err) {
    console.error('Failed to load Rapier:', err);
  }
}

const RATIO = .1;

class PhysicsManager {
  // Common physics code used by both client and server
  async createPhysicsWorld() {
    this.colliders = [];
    try {
      // Check if World constructor exists
      if (typeof RAPIER.World !== 'function') {
        console.error('RAPIER.World is not a constructor:', typeof RAPIER.World);
        return null;
      }
      if (typeof RAPIER.init === 'function') {
        await RAPIER.init();
      }

      // Create world with verbose error handling
      const gravity = { x: 0, y: -9.81 };
      console.log('Creating world with gravity:', gravity);
      this.world = new RAPIER.World(gravity);
      console.log('World created successfully');
      return this.world;
    } catch (err) {
      console.error('Error creating physics world:', err);
      return null;
    }
  }
  
  createCharacter(mesh){
    this.player = this.world.createCharacterController(0.01);
    // Don’t allow climbing slopes larger than 45 degrees.
    this.player.setMaxSlopeClimbAngle(45 * Math.PI / 180);
    // Automatically slide down on slopes smaller than 30 degrees.
    this.player.setMinSlopeSlideAngle(30 * Math.PI / 180);
    this.player.enableAutostep(0.5, 0.2, true);
    this.player.enableSnapToGround(0.5);
    mesh.collider = this.player;
  }
  
  createGround(mesh){
    // Create a static rigid body for the ground
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    const hf = [];
    mesh.groundPoints.forEach(point => {
      hf.push(point.y * RATIO);
    });
    let heightField = RAPIER.ColliderDesc.heightfield(hf, 1000);
    this.ground = this.world.createCollider(heightField, rigidBody);
  }
  
  createConvexBody(mesh){
    const points = [];
    mesh.geometry.points.forEach(point => {
      points.push(point.x*RATIO, point.y*RATIO);
    });
    let colliderDesc = RAPIER.ColliderDesc.convexHull(points);
    mesh.collider = this.world.createCollider(colliderDesc);
    mesh.collider.setTranslation(mesh.position.x * RATIO, mesh.position.y * RATIO);
    this.colliders.push(mesh.collider);
  }
}

// Export based on environment
if (typeof window !== 'undefined') {
  window.PhysicsManager = PhysicsManager;
} else {
  module.exports = PhysicsManager;
}