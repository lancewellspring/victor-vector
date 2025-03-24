# Venture & Valor

A side-scrolling multiplayer RPG with procedural generation, physics-based platforming, and persistent character progression.

## Overview

Venture & Valor is a cooperative RPG that combines persistent world progression with instanced side-scrolling adventures. The game focuses on strategic character building, cooperative play, and meaningful risk-reward decisions.

Players maintain a legacy through their House, which persists even as individual characters may be lost. The game emphasizes specialized character builds, careful resource management, and coordinated team play to overcome increasingly challenging content.

## Technology Stack

- **JavaScript/ECMAScript**: Primary programming language for both client and server
- **Three.js**: 3D rendering and visual effects
- **Rapier.js (2D)**: Physics simulation for precise platforming mechanics
- **WebSockets**: Real-time multiplayer communication
- **Vite**: Frontend build tool and development server
- **Express**: Backend API server
- **ECS Architecture**: Entity Component System for game logic

## Module System

This project uses ES Modules (ESM) throughout both client and server code. Always use:
- `import` statements instead of `require()`
- `export` instead of `module.exports`
- Named exports are preferred over default exports where appropriate

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/venture-valor.git
   cd venture-valor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run server
   ```

4. In a separate terminal, start the frontend development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Project Structure

```
venture-valor/
├── server/               # Server-side code
│   ├── components/       # Server-side components
│   ├── game/             # Game logic and validation
│   ├── network/          # WebSocket and networking
│   └── systems/          # Server-side ECS systems
├── static/               # Shared and client code
│   ├── client/           # Client-specific code
│   │   ├── assets/       # Game assets (audio, models, textures)
│   │   ├── components/   # Client-side components
│   │   ├── systems/      # Client-side ECS systems
│   │   └── main.js       # Client entry point
│   └── shared/           # Code shared between client and server
│       ├── components/   # Shared ECS components
│       ├── ecs/          # Core ECS implementation
│       ├── procedural/   # Procedural generation code
│       ├── systems/      # Shared ECS systems
│       └── utils/        # Utility functions
├── server.js             # Main server entry point
└── vite.config.js        # Vite configuration
```

## Game Controls

- **Movement**: WASD or Arrow Keys
- **Jump**: Space
- **Special Abilities**: Q, E
- **Attack**: Left Mouse Button
- **Gather Resources**: F
- **Debug Mode**: F3

## Available Scripts

- `npm run dev`: Start the Vite development server
- `npm run server`: Start the backend server in development mode with auto-reload
- `npm run build`: Build the client for production
- `npm start`: Start the server in production mode
- `npm run prod`: Same as start, runs the server in production mode

## Testing Framework

The game includes a built-in debug overlay that can be accessed by pressing F3 while playing. This displays:

- Entity counts
- Player position and state
- Physics information
- Frame rate

## License

This project is licensed under the MIT License - see the LICENSE file for details.