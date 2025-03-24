import express from "express";
import path from "path";
import sqlite3 from "sqlite3";
import http from "http";
import WebSocket from "ws";
import { fileURLToPath } from 'url';

// Import game systems
import  { createWorld } from './static/shared/ecs/world.js';
import {ServerPhysicsSystem} from './server/systems/server-physics.js';
import {ConnectionSystem} from './server/systems/connection.js';
import websocket from './server/network/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database setup
const db = new sqlite3.Database("game.db");

// Determine if we're in production
const isProduction = process.env.NODE_ENV === "production";
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// Create server game world
const gameWorld = createWorld();

async function createServer() {
  const app = express();
  app.use(express.json());
  
  // API Routes - these should be defined before the static file middleware
  app.get("/api/characters", (req, res) => {
    db.all("SELECT * FROM characters", [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  });

  // Static file serving based on environment
  if (isProduction) {
    console.log("Serving production build from dist/");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    // In development, we'll let Vite's own dev server handle it
    // You'll run 'vite' separately in another terminal
    console.log("Development mode - API server only");
  }

  // Create HTTP server
  const server = http.createServer(app);
  
  // Initialize the game world and systems
  await initializeGameWorld(server);
  
  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start game loop
    startGameLoop();
  });
  
  return { app, server };
}

/**
 * Initialize the game world and register systems
 * @param {http.Server} server - HTTP server instance
 */
async function initializeGameWorld(server) {
  console.log('Initializing game world...');
  
  try {
    // Create WebSocket server
    const wss = websocket.createWebSocketServer(server, gameWorld);
    
    // Register systems
    // Note: Order is important!
    const connectionSystem = new ConnectionSystem(wss);
    gameWorld.registerSystem(connectionSystem, 10);
    
    // Initialize physics system
    const physicsSystem = new ServerPhysicsSystem();
    await physicsSystem.init(gameWorld);
    gameWorld.registerSystem(physicsSystem, 20);
    
    // Initialize other systems here
    // ...
    
    // Store reference to the WebSocket server
    gameWorld.wss = wss;
    
    console.log('Game world initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game world:', error);
    throw error;
  }
}

/**
 * Start the game loop for server-side simulation
 */
function startGameLoop() {
  console.log('Starting game loop');
  
  let lastTime = Date.now();
  const targetFPS = 60;
  const targetFrameTime = 1000 / targetFPS;
  
  // Track performance metrics
  let frameCount = 0;
  let lastFpsTime = Date.now();
  
  function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000; // Convert to seconds
    lastTime = now;
    
    // Cap delta time to prevent large jumps
    const cappedDeltaTime = Math.min(deltaTime, 0.1);
    
    try {
      // Update all systems
      if (gameWorld && gameWorld.update) {
        gameWorld.update(cappedDeltaTime);
      }
    } catch (error) {
      console.error('Error in game loop:', error);
    }
    
    // Calculate FPS
    frameCount++;
    if (now - lastFpsTime >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      console.log(`Server running at ${fps} FPS`);
      frameCount = 0;
      lastFpsTime = now;
    }
    
    // Schedule next frame
    const frameTime = Date.now() - now;
    const delay = Math.max(0, targetFrameTime - frameTime);
    
    setTimeout(gameLoop, delay);
  }
  
  // Start the loop
  gameLoop();
}

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Clean up game world
  if (gameWorld) {
    // Close WebSocket server
    if (gameWorld.wss) {
      gameWorld.wss.cleanup();
    }
    
    // Destroy all systems
    if (gameWorld.systems) {
      gameWorld.systems.forEach(system => {
        if (system.destroy) {
          system.destroy();
        }
      });
    }
  }
  
  // Close database
  db.close();
  
  console.log('Server shutdown complete');
  process.exit(0);
});

createServer().catch(err => {
  console.error('Failed to create server:', err);
  process.exit(1);
});