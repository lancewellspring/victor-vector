const shared = typeof window !== 'undefined' 
  ? window
  : {};

// ECS module index
shared.createWorld = typeof require !== 'undefined' 
  ? require('./world').createWorld
  : window.ECS;
  
shared.System = typeof require !== 'undefined' 
  ? require('./system').System
  : window.ECS;

// Export for both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = {
    createWorld: shared.createWorld,
    System: shared.System
  };
} else {
  // Create global ECS namespace if it doesn't exist
//   window.ECS = window.ECS || {};

//   // Only define these if they haven't been defined yet
//   if (!window.ECS.createWorld) {
//     window.ECS.createWorld = function() {
//       // Import from the World implementation
//       return shared.createWorld();
//     };
//   }

//   if (!window.ECS.System) {
//     window.ECS.System = shared.System;
//   }
}

