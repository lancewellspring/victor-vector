// static/client/systems/render.js
import { System } from '@shared/systems/system.js';
import { BackgroundSystem } from './background.js';
import * as THREE from 'three';

export class RenderSystem extends System {
  constructor() {
    super();
    this.name = 'RenderSystem';
    this.priority = 50; // Render should run after other systems
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.meshes = new Map(); // Map entity IDs to THREE.js meshes
    this.initialized = false;
  }
  
  init(world) {
    super.init(world);
    
    // Check if THREE.js is available
    if (typeof THREE === 'undefined') {
      console.error('THREE not found - RenderSystem requires THREE.js to be loaded');
      return this;
    }
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    this.camera.position.set(0, 0, 10);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: document.getElementById('game-container'),
      antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB); // Sky blue background
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    this.initialized = true;
    
    // Initialize existing entities with render components
    this.initExistingEntities();
    
    // Clear depth buffer before rendering the main scene
    this.renderer.autoClear = false;
    
    return this;
  }
  
  initExistingEntities() {
    // Find all entities with render components and initialize them
    const renderEntities = this.world.with('render', 'transform');
    
    for (const entity of renderEntities) {
      this.initEntityRender(entity);
    }
  }
  
  initEntityRender(entity) {
    if (!this.initialized) return;
    
    const { render, transform } = entity;
    
    if (this.meshes.has(entity.id)) {
      console.warn(`Entity ${entity.id} already has render initialized`);
      return;
    }
    
    // Create geometry based on type
    let geometry;
    if (render.geometry) {
      // Use provided geometry
      geometry = render.geometry;
    } else {
      // Create default geometry based on entity type
      switch (render.type) {
        case 'box':
          geometry = new THREE.BoxGeometry(1, 1, 1);
          break;
        case 'sphere':
          geometry = new THREE.SphereGeometry(0.5, 16, 16);
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }
    }
    
    // Create material
    let material;
    if (render.material) {
      // Use provided material
      material = render.material;
    } else {
      // Create default material
      material = new THREE.MeshStandardMaterial({ 
        color: render.color,
        transparent: render.opacity < 1,
        opacity: render.opacity
      });
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = render.castShadow;
    mesh.receiveShadow = render.receiveShadow;
    
    // Set initial position from transform
    mesh.position.set(transform.x, transform.y, transform.z);
    mesh.rotation.set(transform.rotationX, transform.rotationY, transform.rotationZ);
    mesh.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);
    
    // Store references
    render.mesh = mesh;
    this.meshes.set(entity.id, mesh);
    
    // Add to scene
    this.scene.add(mesh);
  }
  
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Update mesh positions from transform components
    const renderEntities = this.world.with('render', 'transform');
    
    for (const entity of renderEntities) {
      this.updateEntityRender(entity);
    }
    
    // Update camera position if we have a camera entity
    this.updateCamera();
    
    // Render scenes
    // First, find background system
    const backgroundSystem = this.world.systems.find(sys => sys instanceof BackgroundSystem);
    
    if (backgroundSystem && backgroundSystem.initialized) {
      // Let background system render its scene first
      backgroundSystem.render(this.renderer);
      
      // Clear only the depth buffer to ensure proper 3D sorting
      this.renderer.clearDepth();
    } else {
      // If no background system, clear everything
      this.renderer.clear();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  updateEntityRender(entity) {
    const { render, transform } = entity;
    
    if (!render.mesh) return;
    
    // Update mesh properties from transform
    render.mesh.position.set(transform.x, transform.y, transform.z);
    render.mesh.rotation.set(transform.rotationX, transform.rotationY, transform.rotationZ);
    render.mesh.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);
    
    // Update visibility
    render.mesh.visible = render.visible;
    
    // Update material if needed
    if (render.needsUpdate) {
      render.mesh.material.color.set(render.color);
      render.mesh.material.opacity = render.opacity;
      render.mesh.material.transparent = render.opacity < 1;
      render.mesh.material.needsUpdate = true;
      render.needsUpdate = false;
    }
  }
  
  updateCamera() {
    // Find camera entity (entity with camera component)
    const cameraEntities = this.world.with('camera', 'transform');
    
    if (cameraEntities.length > 0) {
      // Use the first camera entity
      const cameraEntity = cameraEntities[0];
      const { camera, transform } = cameraEntity;
      
      // Update camera position and rotation
      this.camera.position.set(transform.x, transform.y, transform.z);
      this.camera.rotation.set(transform.rotationX, transform.rotationY, transform.rotationZ);
      
      // Update camera properties
      if (camera.fov) this.camera.fov = camera.fov;
      if (camera.near) this.camera.near = camera.near;
      if (camera.far) this.camera.far = camera.far;
      
      // Look at target if specified
      if (camera.lookAt) {
        this.camera.lookAt(camera.lookAt.x, camera.lookAt.y, camera.lookAt.z);
      }
      
      this.camera.updateProjectionMatrix();
    }
  }
  
  handleResize() {
    if (!this.initialized) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  destroy() {
    // Clean up THREE.js resources
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
    this.renderer.dispose();
    this.initialized = false;
  }
}