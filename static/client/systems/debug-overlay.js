// static/client/systems/debug-overlay.js
import { System } from '@shared/systems/system';

export class DebugOverlaySystem extends System {
  constructor() {
    super();
    this.name = 'DebugOverlaySystem';
    this.priority = 110; // After UI
    this.visible = true;
    this.container = null;
    this.fpsCounter = null;
    this.entityCounter = null;
    this.playerInfo = null;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
  }
  
  init(world) {
    super.init(world);
    
    // Create debug overlay
    this.createOverlay();
    
    // Register toggle shortcut (F3)
    window.addEventListener('keydown', (event) => {
      if (event.key === 'F3') {
        this.toggleVisibility();
      }
    });
    
    return this;
  }
  
  createOverlay() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'debug-overlay';
    this.container.style.position = 'absolute';
    this.container.style.top = '10px';
    this.container.style.left = '10px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.fontSize = '12px';
    this.container.style.color = 'white';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.container.style.padding = '5px';
    this.container.style.borderRadius = '3px';
    this.container.style.zIndex = '1000';
    
    // FPS counter
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.textContent = 'FPS: 0';
    this.container.appendChild(this.fpsCounter);
    
    // Entity counter
    this.entityCounter = document.createElement('div');
    this.entityCounter.textContent = 'Entities: 0';
    this.container.appendChild(this.entityCounter);
    
    // Player info
    this.playerInfo = document.createElement('div');
    this.playerInfo.textContent = 'Player: N/A';
    this.container.appendChild(this.playerInfo);
    
    // Physics info
    this.physicsInfo = document.createElement('div');
    this.physicsInfo.textContent = 'Physics: N/A';
    this.container.appendChild(this.physicsInfo);
    
    // Add separator
    const separator = document.createElement('hr');
    separator.style.margin = '5px 0';
    separator.style.border = '0';
    separator.style.borderTop = '1px solid rgba(255, 255, 255, 0.3)';
    this.container.appendChild(separator);
    
    // Controls
    const controls = document.createElement('div');
    controls.textContent = 'F3: Toggle Debug | R: Reset Player';
    this.container.appendChild(controls);
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Initial visibility
    this.setVisibility(this.visible);
  }
  
  toggleVisibility() {
    this.visible = !this.visible;
    this.setVisibility(this.visible);
  }
  
  setVisibility(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }
  
  update(deltaTime) {
    if (!this.visible || !this.container) return;
    
    // Update frame counter
    this.frameCount++;
    
    // Update FPS every second
    const now = performance.now();
    if (now - this.lastFpsUpdate > 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    // Update entity count
    this.entityCounter.textContent = `Entities: ${this.world.entities.length}`;
    
    // Update player info
    const playerEntities = this.world.with('player');
    if (playerEntities.length > 0) {
      const player = playerEntities[0];
      this.playerInfo.textContent = `Player: x=${player.transform.x.toFixed(1)}, y=${player.transform.y.toFixed(1)}, fatigue=${player.player.currentFatigue.toFixed(1)}/${player.player.maxFatigue}`;
      
      // Update physics info
      if (player.physics) {
        this.physicsInfo.textContent = `Physics: vx=${player.physics.velocity.x.toFixed(2)}, vy=${player.physics.velocity.y.toFixed(2)}, grounded=${player.physics.grounded}`;
      }
    }
  }
  
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    window.removeEventListener('keydown', this.toggleVisibility);
    super.destroy();
  }
}