// static/shared/systems/registry.js (updated)
export class SystemRegistry {
  constructor() {
    this.systems = [];
    this.systemsByName = new Map();
    this.systemsByType = new Map();
    this.initialized = false;
  }
  
  register(system, priority = 0) {
    if (!system.name) {
      system.name = system.constructor.name;
    }
    
    system.priority = priority;
    this.systems.push(system);
    this.systemsByName.set(system.name, system);
    this.systemsByType.set(system.constructor, system);
    
    // Sort systems by priority
    this.systems.sort((a, b) => a.priority - b.priority);
    
    // Initialize system if world is already initialized
    if (this.initialized && system.world) {
      system.init(system.world);
    }
    
    return system;
  }
  
  initAll(world) {
    // Determine initialization order based on dependencies
    const initOrder = this.getInitializationOrder();
    
    // Initialize in the determined order
    for (const systemName of initOrder) {
      const system = this.systemsByName.get(systemName);
      if (system) {
        system.init(world);
      }
    }
    
    this.initialized = true;
  }
  
  getInitializationOrder() {
    // Build dependency graph
    const graph = new Map();
    const visited = new Set();
    const initOrder = [];
    
    // Initialize graph
    for (const system of this.systems) {
      graph.set(system.name, system.dependencies || []);
    }
    
    // DFS to resolve dependencies
    const visit = (nodeName) => {
      if (visited.has(nodeName)) return;
      
      visited.add(nodeName);
      const dependencies = graph.get(nodeName) || [];
      
      for (const dep of dependencies) {
        if (!this.systemsByName.has(dep)) {
          console.warn(`System ${nodeName} depends on ${dep}, but it doesn't exist`);
          continue;
        }
        visit(dep);
      }
      
      initOrder.push(nodeName);
    };
    
    // Visit all nodes
    for (const system of this.systems) {
      visit(system.name);
    }
    
    return initOrder;
  }
  
  updateAll(deltaTime) {
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
  }
  
  getSystem(nameOrType) {
    if (typeof nameOrType === 'string') {
      return this.systemsByName.get(nameOrType);
    } else {
      return this.systemsByType.get(nameOrType);
    }
  }
  
  destroyAll() {
    // Destroy in reverse initialization order
    const systems = [...this.systems];
    systems.reverse();
    
    for (const system of systems) {
      system.destroy();
    }
    
    this.systems = [];
    this.systemsByName.clear();
    this.systemsByType.clear();
    this.initialized = false;
  }
}