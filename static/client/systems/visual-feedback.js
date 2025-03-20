// static/client/systems/visual-feedback.js
import { System } from '@shared/systems/system';
import * as THREE from 'three';

export class VisualFeedbackSystem extends System {
  constructor() {
    super();
    this.name = 'VisualFeedbackSystem';
    this.priority = 60; // After rendering
    this.particles = [];
    this.scene = null;
  }
  
  init(world) {
    super.init(world);
    
    // Get the scene from render system
    const renderSystem = this.world.systems.find(sys => sys.name === 'RenderSystem');
    if (renderSystem) {
      this.scene = renderSystem.scene;
    }
    
    // Subscribe to events
    this.subscribe('gatheringStarted', this.handleGatheringStarted.bind(this));
    this.subscribe('resourceCollected', this.handleResourceCollected.bind(this));
    this.subscribe('playerFatigueIncreased', this.handleFatigueIncrease.bind(this));
    this.subscribe('skillLocked', this.handleSkillLocked.bind(this));
    
    return this;
  }
  
  handleGatheringStarted(data) {
    const { entity, node } = data;
    
    if (!entity || !node || !this.scene) return;
    
    // Create gathering effect
    this.createGatheringEffect(node);
  }
  
  createGatheringEffect(node) {
    if (!node.transform || !this.scene) return;
    
    // Create a pulsing circle effect
    const geometry = new THREE.RingGeometry(1, 1.2, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: this.getResourceColor(node.resourceNode.type),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(node.transform.x, node.transform.y, 0.1);
    
    this.scene.add(ring);
    
    // Add to particles for animation
    this.particles.push({
      mesh: ring,
      type: 'gathering',
      createdAt: performance.now(),
      duration: 2000, // 2 seconds
      data: {
        startScale: 1,
        endScale: 2
      }
    });
  }
  
  handleResourceCollected(data) {
    const { playerEntity, resourceType, amount } = data;
    
    if (!playerEntity || !playerEntity.transform || !this.scene) return;
    
    // Create resource collection particles
    this.createResourceCollectionEffect(playerEntity, resourceType, amount);
    
    // Create floating text showing amount
    this.createFloatingText(playerEntity.transform.x, playerEntity.transform.y, `+${amount} ${resourceType}`);
  }
  
  createResourceCollectionEffect(entity, resourceType, amount) {
    const particleCount = Math.min(amount * 3, 15); // Cap at 15 particles
    
    for (let i = 0; i < particleCount; i++) {
      // Create a small particle
      const geometry = new THREE.CircleGeometry(0.2, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: this.getResourceColor(resourceType),
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(geometry, material);
      
      // Position near player
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 1.5;
      
      particle.position.set(
        entity.transform.x + Math.cos(angle) * distance,
        entity.transform.y + Math.sin(angle) * distance,
        0.1
      );
      
      this.scene.add(particle);
      
      // Add to particles for animation
      this.particles.push({
        mesh: particle,
        type: 'resource',
        createdAt: performance.now(),
        duration: 1000 + Math.random() * 500, // 1-1.5 seconds
        data: {
          startY: particle.position.y,
          velocityX: (Math.random() - 0.5) * 2,
          velocityY: Math.random() * 3 + 1
        }
      });
    }
  }
  
  createFloatingText(x, y, text) {
    // Create a canvas to render text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw text
    context.font = 'bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create material and sprite
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);
    sprite.position.set(x, y + 2, 0.1);
    
    this.scene.add(sprite);
    
    // Add to particles for animation
    this.particles.push({
      mesh: sprite,
      type: 'text',
      createdAt: performance.now(),
      duration: 1500, // 1.5 seconds
      data: {
        startY: sprite.position.y,
        velocityY: 1
      }
    });
  }
  
  handleFatigueIncrease(data) {
    const { entity, amount } = data;
    
    if (!entity || !entity.transform || !this.scene) return;
    
    // Create fatigue increase effect
    if (amount > 5) { // Only for significant fatigue increases
      this.createFatigueEffect(entity);
    }
  }
  
  createFatigueEffect(entity) {
    // Create red pulse around player
    const geometry = new THREE.RingGeometry(1.5, 2, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff3333,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.set(entity.transform.x, entity.transform.y, 0.1);
    
    this.scene.add(ring);
    
    // Add to particles for animation
    this.particles.push({
      mesh: ring,
      type: 'fatigue',
      createdAt: performance.now(),
      duration: 1000, // 1 second
      data: {
        startScale: 1,
        endScale: 2.5
      }
    });
  }
  
  handleSkillLocked(data) {
    const { entity, skillType } = data;
    
    if (!entity || !entity.transform || !this.scene) return;
    
    // Create skill lock effect
    this.createSkillLockEffect(entity);
    
    // Create floating text
    this.createFloatingText(entity.transform.x, entity.transform.y, `${skillType} locked!`);
  }
  
  createSkillLockEffect(entity) {
    // Create a pulsing X effect
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff0000,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    
    const size = 2;
    const points1 = [];
    points1.push(new THREE.Vector3(-size, -size, 0));
    points1.push(new THREE.Vector3(size, size, 0));
    
    const points2 = [];
    points2.push(new THREE.Vector3(-size, size, 0));
    points2.push(new THREE.Vector3(size, -size, 0));
    
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    
    const line1 = new THREE.Line(geometry1, material);
    const line2 = new THREE.Line(geometry2, material);
    
    const group = new THREE.Group();
    group.add(line1);
    group.add(line2);
    
    group.position.set(entity.transform.x, entity.transform.y, 0.2);
    
    this.scene.add(group);
    
    // Add to particles for animation
    this.particles.push({
      mesh: group,
      type: 'skillLock',
      createdAt: performance.now(),
      duration: 2000, // 2 seconds
      data: {
        rotationSpeed: Math.PI / 2 // 90 degrees per second
      }
    });
  }
  
  update(deltaTime) {
    const now = performance.now();
    
    // Update all particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const age = now - particle.createdAt;
      const lifeRatio = age / particle.duration;
      
      if (lifeRatio >= 1) {
        // Remove expired particle
        if (this.scene && particle.mesh) {
          this.scene.remove(particle.mesh);
          
          // Dispose resources
          if (particle.mesh.geometry) particle.mesh.geometry.dispose();
          if (particle.mesh.material) {
            if (Array.isArray(particle.mesh.material)) {
              particle.mesh.material.forEach(m => m.dispose());
            } else {
              particle.mesh.material.dispose();
            }
          }
        }
        
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update based on particle type
      switch (particle.type) {
        case 'gathering':
          // Pulse in and out
          const pulseScale = particle.data.startScale + 
            (particle.data.endScale - particle.data.startScale) * 
            (Math.sin(lifeRatio * Math.PI * 4) * 0.5 + 0.5);
          
          particle.mesh.scale.set(pulseScale, pulseScale, 1);
          particle.mesh.material.opacity = 0.7 * (1 - lifeRatio);
          break;
          
        case 'resource':
          // Float upward with gravity
          particle.mesh.position.x += particle.data.velocityX * deltaTime;
          particle.mesh.position.y += particle.data.velocityY * deltaTime;
          particle.data.velocityY -= 5 * deltaTime; // Gravity
          
          // Fade out
          particle.mesh.material.opacity = 0.8 * (1 - lifeRatio);
          break;
          
        case 'text':
          // Float upward
          particle.mesh.position.y = particle.data.startY + particle.data.velocityY * age / 1000;
          
          // Fade out
          particle.mesh.material.opacity = 1 - lifeRatio;
          break;
          
        case 'fatigue':
          // Expand and fade
          const fatigueScale = particle.data.startScale + 
            (particle.data.endScale - particle.data.startScale) * lifeRatio;
          
          particle.mesh.scale.set(fatigueScale, fatigueScale, 1);
          particle.mesh.material.opacity = 0.6 * (1 - lifeRatio);
          break;
          
        case 'skillLock':
          // Rotate and pulse
          particle.mesh.rotation.z += particle.data.rotationSpeed * deltaTime;
          
          // Pulse size
          const pulse = Math.sin(lifeRatio * Math.PI * 6) * 0.2 + 1;
          particle.mesh.scale.set(pulse, pulse, 1);
          
          // Fade out at the end
          if (lifeRatio > 0.7) {
            particle.mesh.children.forEach(child => {
              child.material.opacity = 0.8 * (1 - (lifeRatio - 0.7) / 0.3);
            });
          }
          break;
      }
    }
  }
  
  getResourceColor(resourceType) {
    // Return color based on resource type
    switch (resourceType) {
      case 'wood': return 0x8B4513; // Brown
      case 'stone': return 0x808080; // Gray
      case 'fiber': return 0x228B22; // Green
      case 'metal': return 0xB87333; // Copper/Bronze
      case 'radix': return 0x4B0082; // Indigo
      default: return 0xFFFFFF; // White
    }
  }
  
  destroy() {
    // Clean up all particles
    for (const particle of this.particles) {
      if (this.scene && particle.mesh) {
        this.scene.remove(particle.mesh);
        
        if (particle.mesh.geometry) particle.mesh.geometry.dispose();
        if (particle.mesh.material) {
          if (Array.isArray(particle.mesh.material)) {
            particle.mesh.material.forEach(m => m.dispose());
          } else {
            particle.mesh.material.dispose();
          }
        }
      }
    }
    
    this.particles = [];
    super.destroy();
  }
}