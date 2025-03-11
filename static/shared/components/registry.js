/**
 * Component Registry - Central registration system for components
 */
const components = {};

/**
 * Register a component type
 * @param {string} name - Component name
 * @param {Function} factory - Factory function that creates component instance
 */
function registerComponent(name, factory) {
  components[name] = factory;
  console.log(`Registered component: ${name}`);
}

/**
 * Create a component instance
 * @param {string} name - Component name
 * @param {Object} data - Initial data to override defaults
 * @returns {Object} New component instance
 */
function createComponent(name, data = {}) {
  if (!components[name]) {
    throw new Error(`Component type "${name}" not registered`);
  }
  
  // Create default component and merge with provided data
  const defaultData = components[name]();
  return { ...defaultData, ...data };
}

/**
 * Get all registered component types
 * @returns {Object} Map of component names to factory functions
 */
function getRegisteredComponents() {
  return { ...components };
}

export { 
  registerComponent, 
  createComponent, 
  getRegisteredComponents 
};