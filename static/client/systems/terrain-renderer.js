// static/client/systems/terrain-renderer.js
import { System } from '../../shared/systems/system.js';
import * as THREE from 'three';

export class TerrainRendererSystem extends System {
  constructor() {
    super();
    this.priority = 25; // Run after terrain generation but before rendering
    this.initialized = false;
    this.terrainMeshes = new Map(); // Map entity IDs to terrain meshes
  }
  
  init(world) {
    super.init(world);
    
    // Check if THREE.js is available
    if (typeof THREE === 'undefined') {
      console.error('THREE not found - TerrainRendererSystem requires THREE.js to be loaded');
      return this;
    }
    
    this.initialized = true;
    
    // Initialize existing terrain entities
    this.initExistingEntities();
    
    return this;
  }
  
  initExistingEntities() {
    // Find all entities with terrain components that have points
    const terrainEntities = this.world.with('terrain').filter(
      entity => entity.terrain.points && entity.terrain.points.length > 0
    );
    
    for (const entity of terrainEntities) {
      this.createTerrainMesh(entity);
    }
  }
  
  createTerrainMesh(entity) {
    if (!this.initialized || !entity.terrain || !entity.terrain.points) return;
    
    const terrain = entity.terrain;
    const points = terrain.points;
    
    // Skip if mesh already exists
    if (terrain.hasVisualMesh) return;
    
    // Create visual representation based on terrain type
    switch (terrain.type) {
      case 'ground':
        this.createGroundMesh(entity, points);
        break;
      case 'platform':
        this.createPlatformMesh(entity, points);
        break;
      case 'background':
        this.createBackgroundMesh(entity, points);
        break;
    }
    
    // Mark that the terrain now has a visual mesh
    terrain.hasVisualMesh = true;
  }
  
  createGroundMesh(entity, points) {
    // Find render system scene
    const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
    if (!renderSystem || !renderSystem.scene) return;
    
    // Create geometry from points
    const geometry = new THREE.BufferGeometry();
    
    // Create vertices array
    const vertices = [];
    const uvs = [];
    const indices = [];
    
    // Create a triangle strip for the terrain
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      // Top vertex
      vertices.push(point.x, point.y, point.z);
      uvs.push(i / (points.length - 1), 1);
      
      // Bottom vertex
      vertices.push(point.x, point.y - 100, point.z); // Extend down for thickness
      uvs.push(i / (points.length - 1), 0);
      
      // Create triangles (two per segment)
      if (i < points.length - 1) {
        const topLeft = i * 2;
        const bottomLeft = topLeft + 1;
        const topRight = topLeft + 2;
        const bottomRight = topLeft + 3;
        
        indices.push(topLeft, bottomLeft, topRight);
        indices.push(bottomLeft, bottomRight, topRight);
      }
    }
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0x33AA33,
      side: THREE.DoubleSide,
      flatShading: true,
      roughness: 0.8
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Store the mesh
    this.terrainMeshes.set(entity.id, mesh);
    
    // Add to scene
    renderSystem.scene.add(mesh);
  }
  
  createPlatformMesh(entity, points) {
    // Similar to createGroundMesh but for platforms
    // Would be implemented based on your platform needs
  }
  
  createBackgroundMesh(entity, points) {
    // Similar to createGroundMesh but for background layers
    // Would be implemented based on your background needs
  }
  
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Check for terrain entities that have points but no mesh
    const terrainEntities = this.world.with('terrain').filter(
      entity => entity.terrain.points && 
               entity.terrain.points.length > 0 && 
               !entity.terrain.hasVisualMesh
    );
    
    for (const entity of terrainEntities) {
      this.createTerrainMesh(entity);
    }
  }
  
  destroy() {
    // Clean up terrain meshes
    for (const [entityId, mesh] of this.terrainMeshes.entries()) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      
      // Remove from scene
      if (mesh.parent) mesh.parent.remove(mesh);
    }
    
    this.terrainMeshes.clear();
    this.initialized = false;
  }
}