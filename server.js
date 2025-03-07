const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const express = require('express');
const app = express();

const db = new sqlite3.Database('game.db');

//const MessageHandlers = require('./server/websocket/messageHandlers');


// Middleware
app.use(express.static('static'));
app.use(express.json());

// HTTP endpoints
app.get('/api/characters', (req, res) => {
  db.all('SELECT * FROM characters', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '/static/client/index.html'));
});

const server = require('http').createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ 
    server,
    clientTracking: true 
});



wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastHeartbeat = Date.now();
    });
    
    ws.on('message', (message) => {
        try {
            
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });
    
    ws.on('close', () => {});
});

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
});

