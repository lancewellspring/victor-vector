// static/shared/systems/terrain-system.js
import { System } from './system.js';

export class TerrainSystem extends System {
  constructor() {
    super();
    this.priority = 15; // Run early in the update cycle
    this.initialized = false;
    this.noiseFunction = null;
    this.terrainBodies = new Map(); // Map entity IDs to physics bodies
  }
  
  init(world) {
    super.init(world);
    
    // Initialize noise function (platform-agnostic)
    this.initializeNoise();
    
    this.initialized = true;
    
    // Initialize existing terrain entities
    this.initExistingEntities();
    
    return this;
  }
  
  initializeNoise() {
    // Create a basic deterministic noise function that works everywhere
    this.noiseFunction = (x, y, seed) => {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const seed_value = seed || 0;
      
      // Simple hash function
      const hash = (n) => {
        let x = Math.sin(n + seed_value) * 10000;
        return x - Math.floor(x);
      };
      
      // Get interpolation weights
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      
      // Generate values at corners of cell
      const a = hash(X + Y * 57);
      const b = hash(X + 1 + Y * 57);
      const c = hash(X + (Y + 1) * 57);
      const d = hash(X + 1 + (Y + 1) * 57);
      
      // Smooth interpolation
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      
      // Interpolate between values
      const value = 
        a * (1 - sx) * (1 - sy) +
        b * sx * (1 - sy) +
        c * (1 - sx) * sy +
        d * sx * sy;
      
      return value * 2 - 1; // Convert to range [-1, 1]
    };
  }
  
  initExistingEntities() {
    // Find all entities with terrain components
    const terrainEntities = this.world.with('terrain');
    
    for (const entity of terrainEntities) {
      this.generateTerrainPoints(entity);
      
      // Create physics bodies for terrain with collision
      if (entity.terrain.hasCollision) {
        this.createTerrainPhysics(entity);
      }
    }
  }
  
  generateTerrainPoints(entity) {
    if (!entity.terrain) return;
    
    const terrain = entity.terrain;
    
    // Only generate points if they haven't been generated already
    if (terrain.points && terrain.points.length > 0) return;
    
    const points = this.createTerrainPoints(terrain);
    terrain.points = points;
    
    return points;
  }
  
  createTerrainPoints(terrain) {
    const { seed, width, segments, octaves, persistence, scale, baseHeight, amplitude, maxSlope, smoothing } = terrain;
    
    const points = [];
    let prevY = baseHeight;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width - (width / 2);
      let y = baseHeight;
      
      // Sum multiple octaves
      for (let o = 0; o < octaves; o++) {
        const freq = scale * Math.pow(2, o);
        const amp = amplitude * Math.pow(persistence, o);
        
        // Use noise function
        y += this.noiseFunction(x * freq, seed * freq, seed) * amp;
      }
      
      // Apply slope constraints if needed
      if (i > 0) {
        const prevX = ((i - 1) / segments) * width - (width / 2);
        const dx = x - prevX;
        const dy = y - prevY;
        const slope = Math.abs(dy / dx);
        
        if (slope > maxSlope) {
          // Limit the slope
          const maxDy = maxSlope * dx * Math.sign(dy);
          y = prevY + maxDy;
        }
      }
      
      // Apply smoothing
      if (i > 0 && smoothing > 0) {
        y = prevY * smoothing + y * (1 - smoothing);
      }
      
      prevY = y;
      points.push({ x, y, z: 0 });
    }
    
    return points;
  }
  
  createTerrainPhysics(entity) {
    if (!this.initialized || !entity.terrain || !entity.terrain.points) return;
    
    const terrain = entity.terrain;
    const points = terrain.points;
    
    // Find physics system
    const physicsSystem = this.world.systems.find(sys => sys.name === 'PhysicsSystem');
    if (!physicsSystem) return;
    
    // Create terrain physics
    // We'll keep this method platform-agnostic and let the physics system handle the details
    const physicsBody = physicsSystem.createTerrainCollider(
      points, 
      {
        friction: terrain.friction,
        restitution: terrain.restitution,
        isStatic: true,
        terrainId: entity.id
      }
    );
    
    if (physicsBody) {
      // Store reference to physics body
      this.terrainBodies.set(entity.id, physicsBody);
    }
  }
  
  update(deltaTime) {
    // Check for any new terrain entities that need points generated
    const terrainEntities = this.world.with('terrain');
    
    for (const entity of terrainEntities) {
      // Generate points if needed
      if (!entity.terrain.points || entity.terrain.points.length === 0) {
        this.generateTerrainPoints(entity);
      }
      
      // Create physics if needed
      if (entity.terrain.hasCollision && !this.terrainBodies.has(entity.id)) {
        this.createTerrainPhysics(entity);
      }
    }
  }
  
  destroy() {
    // Clean up terrain bodies
    this.terrainBodies.clear();
    this.initialized = false;
  }
}