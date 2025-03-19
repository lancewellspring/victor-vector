/**
 * Central event system for entity component communication
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.deferredEvents = [];
    this.processingEvents = false;
  }
  
  /**
   * Register a listener for an event
   * @param {string} event - Event name
   * @param {Function} callback - Function to call when event occurs
   * @param {Object} context - 'this' context for the callback
   * @returns {Function} Function to remove the listener
   */
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const listener = { callback, context };
    this.listeners.get(event).push(listener);
    
    // Return a function to remove this specific listener
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(listener);
        if (index !== -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  off(event) {
    this.listeners.delete(event);
  }
  
  /**
   * Emit an event immediately
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data = {}) {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;
    
    for (const listener of eventListeners) {
      listener.callback.call(listener.context, data);
    }
  }
  
  /**
   * Defer an event to be processed later
   * Useful for avoiding cascading events during updates
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  defer(event, data = {}) {
    this.deferredEvents.push({ event, data });
  }
  
  /**
   * Process all deferred events
   */
  processEvents() {
    // Prevent reentrant event processing
    if (this.processingEvents) return;
    this.processingEvents = true;
    
    const events = [...this.deferredEvents];
    this.deferredEvents = [];
    
    for (const { event, data } of events) {
      this.emit(event, data);
    }
    
    this.processingEvents = false;
  }
}

// Create singleton instance
const eventBus = new EventBus();
export default eventBus;