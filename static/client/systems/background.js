import { System } from '../../shared/systems/system.js';
import { NoiseUtility } from '../../shared/utils/noise-utility.js';
import * as THREE from 'three';

export class BackgroundSystem extends System {
  constructor() {
    super();
    this.name = 'BackgroundSystem';
    this.priority = 45; // Run after camera but before main rendering
    this.initialized = false;
    this.noiseUtility = new NoiseUtility();
    
    // THREE.js specific properties
    this.scene = null;
    this.camera = null;
    this.meshes = new Map(); // Map entity IDs to background meshes
  }
  
  init(world) {
    super.init(world);
    
    // Check if THREE.js is available
    if (typeof THREE === 'undefined') {
      console.error('THREE not found - BackgroundSystem requires THREE.js to be loaded');
      return this;
    }
    
    // Create background scene and camera
    this.scene = new THREE.Scene();
    
    // Orthographic camera for background (will be adjusted to match screen)
    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      1,
      1000
    );
    this.camera.position.z = 0;
    
    // Add lighting to background scene
    const ambient = new THREE.AmbientLight(0xccccff, 0.6);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(500, 1000, 300);
    this.scene.add(directional);
    
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    this.scene.add(hemiLight);
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    this.initialized = true;
    
    // Initialize existing background entities
    this.initExistingBackgrounds();
    
    return this;
  }
  
  handleResize() {
    if (!this.initialized) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
  }
  
  initExistingBackgrounds() {
    // Find all entities with background components
    const backgroundEntities = this.world.with('background');
    
    for (const entity of backgroundEntities) {
      this.generateBackground(entity);
    }
  }
  
  generateBackground(entity) {
    if (!this.initialized || !entity.background) return;
    
    const background = entity.background;
    
    // Skip if already generated
    if (background.generated && this.meshes.has(entity.id)) return;
    
    // Generate points if needed
    if (!background.points || background.points.length === 0) {
      background.points = this.noiseUtility.generatePoints({
        width: background.width,
        segments: background.segments,
        octaves: background.octaves,
        persistence: background.persistence,
        scale: background.scale,
        baseHeight: background.baseHeight,
        amplitude: background.amplitude,
        maxSlope: background.maxSlope,
        smoothing: background.smoothing,
        seed: background.seed
      });
    }
    
    // Create visual representation
    this.createBackgroundMesh(entity, background.points);
    
    // Mark as generated
    background.generated = true;
  }
  
  createBackgroundMesh(entity, points) {
    const background = entity.background;
    
    // Create geometry from points
    const geometry = new THREE.BufferGeometry();
    
    // Create vertices and indices for a triangle strip
    const vertices = [];
    const uvs = [];
    const indices = [];
    const vertexMap = new Map(); // Track vertex indices
    
    // Parameters for layer thickness
    const segments = 15;
    const thickness = 300;
    const drop = 600;
    
    // Create vertices for the background layer
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      // Create vertices at different depths
      for (let z = 0; z <= segments; z++) {
        const zPos = z / segments * thickness;
        const yPos = z / segments * drop * (0.8 + Math.random() * 0.2);
        
        // Add vertex
        vertices.push(point.x, point.y - yPos, -zPos);
        
        // Add UV (can be used for texturing)
        uvs.push(i / (points.length - 1), z / segments);
        
        // Create mapping key for vertex lookups
        const key = `${i}_${z}`;
        vertexMap.set(key, vertices.length / 3 - 1);
      }
      
      // Add bottom vertex
      vertices.push(point.x, -background.height, -thickness);
      uvs.push(i / (points.length - 1), 1);
      vertexMap.set(`${i}_${segments}`, vertices.length / 3 - 1);
    }
    
    // Create triangles connecting vertices
    for (let i = 0; i < points.length - 1; i++) {
      for (let z = 0; z < segments; z++) {
        // Get vertex indices for this quad
        const v0 = vertexMap.get(`${i}_${z}`);
        const v1 = vertexMap.get(`${i}_${z + 1}`);
        const v2 = vertexMap.get(`${i + 1}_${z}`);
        const v3 = vertexMap.get(`${i + 1}_${z + 1}`);
        
        // Create two triangles for the quad
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
    }
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    // Create material
    let material;
    if (background.flatShading) {
      material = new THREE.MeshStandardMaterial({
        color: background.color,
        flatShading: true,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: background.color,
        flatShading: false,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = background.depth;
    
    // Store reference
    this.meshes.set(entity.id, mesh);
    
    // Add to scene
    this.scene.add(mesh);
    
    return mesh;
  }
  
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Find camera entity with transform for main camera position
    const cameraEntities = this.world.with('camera', 'transform');
    if (cameraEntities.length === 0) return;
    
    const cameraTransform = cameraEntities[0].transform;
    
    // Update background positions based on camera
    for (const entity of this.world.with('background')) {
      // Generate background if needed
      if (!entity.background.generated) {
        this.generateBackground(entity);
      }
      
      // Update position based on camera and parallax rate
      const mesh = this.meshes.get(entity.id);
      if (mesh) {
        this.updateParallax(mesh, entity.background, cameraTransform);
      }
    }
  }
  
  updateParallax(mesh, background, cameraTransform) {
    // Update mesh position based on camera and parallax rate
    mesh.position.x = -cameraTransform.x * background.parallaxRate;
    
    // Apply less vertical parallax (looks more natural)
    mesh.position.y = -cameraTransform.y * background.parallaxRate * 0.1;
  }
  
  render(renderer) {
    if (!this.initialized) return;
    
    // Render the background scene
    renderer.autoClear = true;
    renderer.render(this.scene, this.camera);
    
    // Set to not clear before next render (main scene will overlay)
    renderer.autoClear = false;
  }
  
  destroy() {
    // Clean up background meshes
    for (const mesh of this.meshes.values()) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      
      this.scene.remove(mesh);
    }
    
    this.meshes.clear();
    window.removeEventListener('resize', this.handleResize);
    this.initialized = false;
  }
}