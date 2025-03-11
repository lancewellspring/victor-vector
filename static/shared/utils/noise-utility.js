// static/shared/utils/noise-utility.js
export class NoiseUtility {
  constructor(seed = Math.random() * 10000) {
    this.seed = seed;
  }
  
  // Simple deterministic noise function
  noise2D(x, y, customSeed = null) {
    const seed = customSeed !== null ? customSeed : this.seed;
    
    // Hash function to generate pseudo-random values based on inputs
    const hash = (n) => {
      let x = Math.sin(n + seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Grid cell coordinates
    const X = Math.floor(x);
    const Y = Math.floor(y);
    
    // Fractional components for interpolation
    const fx = x - X;
    const fy = y - Y;
    
    // Generate values at corners of cell
    const a = hash(X + Y * 57);
    const b = hash(X + 1 + Y * 57);
    const c = hash(X + (Y + 1) * 57);
    const d = hash(X + 1 + (Y + 1) * 57);
    
    // Smoothed interpolation weights
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    
    // Interpolate between values
    const value = 
      a * (1 - sx) * (1 - sy) +
      b * sx * (1 - sy) +
      c * (1 - sx) * sy +
      d * sx * sy;
    
    return value * 2 - 1; // Convert to range [-1, 1]
  }
  
  // Generate a series of points using noise
  generatePoints(options) {
    const {
      width = 1000,
      segments = 100,
      octaves = 3,
      persistence = 0.5,
      scale = 0.01,
      baseHeight = 0,
      amplitude = 50,
      maxSlope = 0.8,
      smoothing = 0.2,
      seed = this.seed
    } = options;
    
    const points = [];
    let prevY = baseHeight;
    
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width - (width / 2);
      let y = baseHeight;
      
      // Sum multiple octaves
      for (let o = 0; o < octaves; o++) {
        const freq = scale * Math.pow(2, o);
        const amp = amplitude * Math.pow(persistence, o);
        
        // Use noise function
        y += this.noise2D(x * freq, seed * freq, seed) * amp;
      }
      
      // Apply slope constraints if needed
      if (i > 0 && maxSlope > 0) {
        const prevX = ((i - 1) / segments) * width - (width / 2);
        const dx = x - prevX;
        const dy = y - prevY;
        const slope = Math.abs(dy / dx);
        
        if (slope > maxSlope) {
          // Limit the slope
          const maxDy = maxSlope * dx * Math.sign(dy);
          y = prevY + maxDy;
        }
      }
      
      // Apply smoothing
      if (i > 0 && smoothing > 0) {
        y = prevY * smoothing + y * (1 - smoothing);
      }
      
      prevY = y;
      points.push({ x, y, z: 0 });
    }
    
    return points;
  }
}