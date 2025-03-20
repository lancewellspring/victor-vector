// static/shared/systems/segmented-terrain.js
import { System } from "./system.js";
import { NoiseUtility } from "../utils/noise-utility.js";

export class SegmentedTerrainSystem extends System {
  constructor() {
    super();
    this.name = "SegmentedTerrainSystem";
    this.priority = 10;
    this.noiseUtil = new NoiseUtility();

    // Store segment templates and active segments
    this.segmentTemplates = new Map();
    this.activeSegments = new Map();

    // Keep track of the current venture
    this.currentVentureId = null;
  }

  init(world) {
    super.init(world);

    // Load segment templates
    this.loadSegmentTemplates();

    return this;
  }

  loadSegmentTemplates() {
    // In a real implementation, you'd load these from a file or database
    // For now, we'll create a few basic templates

    const templates = [
      {
        id: "basic_path",
        name: "Basic Path",
        type: "path",
        width: 50,
        height: 30,
        entryPoint: { x: 0, y: 0 },
        exitPoint: { x: 50, y: 0 },
        generationType: "procedural",
        proceduralParams: {
          seed: 0,
          octaves: 2,
          persistence: 0.5,
          amplitude: 5,
          baseHeight: 0,
        },
        features: [],
        minTier: 1,
        maxTier: 5,
        theme: "forest",
        tags: ["path", "basic"],
      },
      {
        id: "resource_area",
        name: "Resource Area",
        type: "resource",
        width: 60,
        height: 40,
        entryPoint: { x: 0, y: 0 },
        exitPoint: { x: 60, y: 0 },
        generationType: "procedural",
        proceduralParams: {
          seed: 0,
          octaves: 2,
          persistence: 0.5,
          amplitude: 5,
          baseHeight: 0,
        },
        features: [
          { type: "resource", x: 20, y: 5, resourceType: "wood", amount: 10 },
          { type: "resource", x: 30, y: 5, resourceType: "wood", amount: 10 },
          { type: "resource", x: 40, y: 5, resourceType: "stone", amount: 5 },
        ],
        minTier: 1,
        maxTier: 5,
        theme: "forest",
        tags: ["resource", "gathering"],
      },
      {
        id: "platform_challenge",
        name: "Platform Challenge",
        type: "challenge",
        width: 80,
        height: 50,
        entryPoint: { x: 0, y: 0 },
        exitPoint: { x: 80, y: 10 },
        generationType: "procedural",
        proceduralParams: {
          seed: 0,
          octaves: 1,
          persistence: 0.5,
          amplitude: 2,
          baseHeight: -10,
        },
        features: [
          { type: "platform", x: 15, y: 5, width: 10, height: 1 },
          { type: "platform", x: 35, y: 10, width: 10, height: 1 },
          { type: "platform", x: 55, y: 15, width: 10, height: 1 },
          { type: "platform", x: 75, y: 10, width: 5, height: 1 },
        ],
        minTier: 2,
        maxTier: 5,
        theme: "forest",
        tags: ["challenge", "platforming"],
      },
    ];

    // Register templates
    for (const template of templates) {
      this.segmentTemplates.set(template.id, template);
    }

    console.log(`Loaded ${this.segmentTemplates.size} segment templates`);
  }

  generateVentureTerrain(ventureId, ventureSeed, difficulty, length = 10) {
    console.log(
      `Generating terrain for venture ${ventureId} with seed ${ventureSeed}`
    );

    // Clear any existing segments for this venture
    this.clearVentureTerrain();

    // Set as current venture
    this.currentVentureId = ventureId;

    // Create a seeded random generator
    const random = this.noiseUtil.createRandomGenerator(ventureSeed);

    // Select segments based on difficulty and length
    const selectedSegments = this.selectSegments(random, difficulty, length);

    // Place segments
    this.placeSegments(selectedSegments, ventureSeed);

    return this.activeSegments;
  }

  selectSegments(random, difficulty, length) {
    const segments = [];

    // Always start with a basic path segment
    segments.push({
      templateId: "basic_path",
      seed: random.nextInt(0, 10000),
    });

    // Choose segments based on venture requirements
    for (let i = 1; i < length - 1; i++) {
      // Filter templates by difficulty tier
      const validTemplates = Array.from(this.segmentTemplates.values()).filter(
        (template) =>
          template.minTier <= difficulty && template.maxTier >= difficulty
      );

      // Weighted selection based on segment type
      const roll = random.next();
      let templateId;

      if (i % 3 === 0) {
        // Every third segment is a resource area
        templateId = "resource_area";
      } else if (roll < 0.3) {
        // 30% chance for challenge
        const challenges = validTemplates.filter((t) => t.type === "challenge");
        if (challenges.length > 0) {
          templateId = challenges[random.nextInt(0, challenges.length)].id;
        } else {
          templateId = "basic_path";
        }
      } else {
        // Otherwise path
        const paths = validTemplates.filter((t) => t.type === "path");
        if (paths.length > 0) {
          templateId = paths[random.nextInt(0, paths.length)].id;
        } else {
          templateId = "basic_path";
        }
      }

      segments.push({
        templateId,
        seed: random.nextInt(0, 10000),
      });
    }

    // End with a basic path segment
    segments.push({
      templateId: "basic_path",
      seed: random.nextInt(0, 10000),
    });

    return segments;
  }

  placeSegments(selectedSegments, ventureSeed) {
    let currentX = 0;
    let currentY = 0;

    // Place each segment
    for (let i = 0; i < selectedSegments.length; i++) {
      const { templateId, seed } = selectedSegments[i];
      const template = this.segmentTemplates.get(templateId);

      if (!template) {
        console.error(`Template ${templateId} not found`);
        continue;
      }

      // Create segment entity
      const segmentEntity = this.createSegmentEntity(
        template,
        currentX,
        currentY,
        seed,
        i
      );

      // Store active segment
      this.activeSegments.set(segmentEntity.id, segmentEntity);

      // Move to next segment position
      currentX += template.width;
      currentY = template.exitPoint.y;
    }
  }

  createSegmentEntity(template, x, y, seed, index) {
    // Create a copy of the template
    const segmentData = { ...template };

    // Set instance data
    segmentData.instanceX = x;
    segmentData.instanceY = y;
    segmentData.instanceId = `${this.currentVentureId}_segment_${index}`;

    // Update seed for this instance
    if (segmentData.generationType === "procedural") {
      segmentData.proceduralParams.seed = seed;
    }

    // Create segment entity
    const segmentEntity = this.world.createEntity({
      terrainSegment: segmentData,
      transform: {
        x,
        y,
        z: 0,
      },
    });

    // Generate terrain for this segment
    this.generateSegmentTerrain(segmentEntity);

    // Create features
    this.createSegmentFeatures(segmentEntity);

    return segmentEntity;
  }

  generateSegmentTerrain(segmentEntity) {
    const segment = segmentEntity.terrainSegment;

    if (segment.generationType === "procedural") {
      // Generate terrain points procedurally
      const params = segment.proceduralParams;
      const points = this.noiseUtil.generatePoints({
        width: segment.width,
        segments: segment.width,
        octaves: params.octaves,
        persistence: params.persistence,
        amplitude: params.amplitude,
        baseHeight: params.baseHeight,
        seed: params.seed,
      });

      // Offset points by segment position
      for (const point of points) {
        point.x += segment.instanceX;
        point.y += segment.instanceY;
      }

      // Create terrain entity
      this.world.createEntity({
        terrain: {
          type: "ground",
          points,
          seed: params.seed,
          hasCollision: true,
        },
        transform: {
          x: segment.instanceX,
          y: segment.instanceY,
          z: 0,
        },
      });
    } else if (segment.generationType === "explicit") {
      // Use explicit points
      const points = [...segment.explicitPoints];

      // Offset points by segment position
      for (const point of points) {
        point.x += segment.instanceX;
        point.y += segment.instanceY;
      }

      // Create terrain entity
      this.world.createEntity({
        terrain: {
          type: "ground",
          points,
          seed: segment.proceduralParams.seed,
          hasCollision: true,
        },
        transform: {
          x: segment.instanceX,
          y: segment.instanceY,
          z: 0,
        },
      });
    }
  }

  createSegmentFeatures(segmentEntity) {
    const segment = segmentEntity.terrainSegment;

    // Process each feature
    for (const feature of segment.features) {
      // Offset feature position by segment position
      const x = feature.x + segment.instanceX;
      const y = feature.y + segment.instanceY;

      switch (feature.type) {
        case "platform":
          this.createPlatform(x, y, feature.width, feature.height);
          break;
        case "resource":
          this.createResourceNode(x, y, feature.resourceType, feature.amount);
          break;
        case "enemy":
          this.createEnemy(x, y, feature.enemyType, feature.level);
          break;
        // Additional feature types here
      }
    }
  }

  createPlatform(x, y, width, height) {
    return this.world.createEntity({
      transform: {
        x,
        y,
        z: 0,
      },
      physics: {
        bodyType: "static",
        colliderType: "box",
        width,
        height,
        friction: 0.2,
        restitution: 0.1,
      },
      render: {
        type: "box",
        color: 0x8b4513, // Brown color for platforms
        width,
        height,
      },
    });
  }

  createResourceNode(x, y, resourceType, amount) {
    return this.world.createEntity({
      transform: {
        x,
        y,
        z: 0,
      },
      physics: {
        bodyType: "static",
        colliderType: "circle",
        radius: 1,
        isSensor: true,
      },
      render: {
        type: "sphere",
        color: this.getResourceColor(resourceType),
        scale: 0.8,
      },
      resourceNode: {
        type: resourceType,
        amount,
        maxAmount: amount,
        gatherRate: 1,
        respawnRate: 0.1,
        fatiguePerUnit: 2,
        detectionRadius: 2,
      },
    });
  }

  createEnemy(x, y, enemyType, level) {
    // Enemy creation would go here - not implementing fully for brevity
    console.log(`Created enemy: ${enemyType} at ${x},${y} (level ${level})`);
  }

  getResourceColor(resourceType) {
    // Return color based on resource type
    switch (resourceType) {
      case "wood":
        return 0x8b4513; // Brown
      case "stone":
        return 0x808080; // Gray
      case "fiber":
        return 0x228b22; // Green
      case "metal":
        return 0xb87333; // Copper/Bronze
      case "radix":
        return 0x4b0082; // Indigo
      default:
        return 0xffffff; // White
    }
  }
  alignPhysicsWithTerrain(segmentEntity) {
    const segment = segmentEntity.terrainSegment;
    const terrainEntities = this.world
      .with("terrain")
      .filter(
        (entity) =>
          entity.transform.x >= segment.instanceX &&
          entity.transform.x < segment.instanceX + segment.width
      );

    // For each terrain entity in this segment
    for (const terrainEntity of terrainEntities) {
      // Ensure physics components are properly created
      const physicsSystem = this.world.systems.find(
        (sys) => sys.name === "PhysicsSystem"
      );
      if (physicsSystem && !terrainEntity.physics) {
        // Create physics body if missing
        this.world.addComponent(terrainEntity, "physics", {
          bodyType: "static",
          colliderType: "terrain",
          friction: 0.6,
          restitution: 0.1,
        });

        physicsSystem.createTerrainCollider(terrainEntity.terrain.points, {
          terrainId: terrainEntity.id,
          friction: 0.6,
          restitution: 0.1,
        });
      }
    }
  }

  // Method to place player at start of the segment sequence
  placePlayerAtStart() {
    if (this.activeSegments.size === 0) return null;

    // Find the first segment
    const firstSegment = Array.from(this.activeSegments.values()).find(
      (segmentEntity) =>
        segmentEntity.terrainSegment.instanceId.endsWith("_segment_0")
    );

    if (!firstSegment) return null;

    // Get player spawn position from segment entry point
    const segment = firstSegment.terrainSegment;
    const spawnX = segment.instanceX + segment.entryPoint.x + 5; // Add small offset
    const spawnY = segment.instanceY + segment.entryPoint.y + 10; // Start above ground

    // Find player entity
    const playerEntities = this.world.with("player");
    if (playerEntities.length === 0) return null;

    const playerEntity = playerEntities[0];

    // Update player position
    playerEntity.transform.x = spawnX;
    playerEntity.transform.y = spawnY;

    // If player has physics, update physics body
    if (playerEntity.physics && playerEntity.physics.rigidbody) {
      const physicsSystem = this.world.systems.find(
        (sys) => sys.name === "PhysicsSystem"
      );
      if (physicsSystem) {
        physicsSystem.teleportEntity(playerEntity, spawnX, spawnY);
      }
    }

    return { x: spawnX, y: spawnY };
  }

  clearVentureTerrain() {
    // Remove all active segments and their features
    for (const [id, segmentEntity] of this.activeSegments) {
      this.world.removeEntity(segmentEntity);
    }

    this.activeSegments.clear();
    this.currentVentureId = null;
  }

  update(deltaTime) {
    // Most work is done on-demand rather than per-frame
    // Could add streaming/LOD loading here for large worlds
  }
}
