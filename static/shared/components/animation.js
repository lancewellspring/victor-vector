// static/shared/components/animation.js
import { registerComponent } from './registry.js';

function createAnimation() {
  return {
    // Current animation state
    currentState: 'idle',
    previousState: 'idle',
    
    // Animation playback
    frameTime: 0,
    playbackSpeed: 1.0,
    
    // State machine for animations
    states: {
      idle: {
        name: 'idle',
        frames: [],
        duration: 1.0,
        loop: true,
        transitions: ['walk', 'jump', 'attack']
      },
      // Add other states as needed
    },
    
    // Track for state transitions
    transitionTime: 0,
    transitionDuration: 0.25,
    transitionFrom: null,
    transitionTo: null,
    
    // For procedural animations
    blendParams: {},
    
    // For network sync
    needsSync: false
  };
}

registerComponent('animation', createAnimation);
export { createAnimation };