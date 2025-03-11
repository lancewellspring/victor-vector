const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const WebSocket = require("ws");

// Database setup
const db = new sqlite3.Database("game.db");

// Determine if we're in production
const isProduction = process.env.NODE_ENV === "production";
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

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
  
  // Set up WebSocket server
  const wss = new WebSocket.Server({
    server,
    path: '/ws', // Match the path in your vite config proxy
    clientTracking: true,
  });

  // WebSocket setup
  wss.on("connection", (ws) => {
    console.log("New client connected");
    ws.isAlive = true;
    ws.lastHeartbeat = Date.now();

    ws.on("pong", () => {
      ws.isAlive = true;
      ws.lastHeartbeat = Date.now();
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        console.log("Received message:", data.type);
        // Handle message based on type
      } catch (e) {
        console.error("Error handling message:", e);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  // Heartbeat check
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log("Client timed out, terminating connection");
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  return { app, server };
}

createServer();