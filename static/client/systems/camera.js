// static/client/systems/camera.js
import { System } from "@shared/systems/system";
import * as THREE from "three";

export class CameraSystem extends System {
  constructor() {
    super();
    this.name = "CameraSystem";
    this.priority = 40; // Run after physics, before rendering
    this.target = null;
    this.offset = { x: 0, y: 5, z: 20 };
    this.smoothing = 0.1; // 0 = no smoothing, 1 = maximum smoothing

    // Camera constraints
    this.bounds = {
      minX: -Infinity,
      maxX: Infinity,
      minY: -Infinity,
      maxY: Infinity,
    };

    this.lookAhead = 5; // Units to look ahead in movement direction
    this.verticalDeadzone = 2; // Vertical movement ignored within this range
  }

  init(world) {
    super.init(world);
    return this;
  }

  setTarget(entity) {
    this.target = entity;
  }

  setBounds(bounds) {
    this.bounds = { ...this.bounds, ...bounds };
  }

  setBoundaries(minX, maxX, minY, maxY) {
    this.bounds = { minX, maxX, minY, maxY };
    console.log(`Camera boundaries set: ${minX}, ${maxX}, ${minY}, ${maxY}`);
  }

  // Calculate boundaries from segmented terrain
  calculateBoundariesFromTerrain() {
    // Find all terrain segments
    const segmentEntities = this.world.with("terrainSegment");
    if (segmentEntities.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // Calculate bounds from all segments
    for (const entity of segmentEntities) {
      const segment = entity.terrainSegment;

      minX = Math.min(minX, segment.instanceX);
      maxX = Math.max(maxX, segment.instanceX + segment.width);

      // Y bounds are trickier - set some reasonable values
      minY = Math.min(minY, segment.instanceY - 100); // Allow camera to go below
      maxY = Math.max(maxY, segment.instanceY + segment.height + 100); // And above
    }

    // Add some padding
    minX -= 20;
    maxX += 20;

    // Set the boundaries
    this.setBoundaries(minX, maxX, minY, maxY);
  }

  update(deltaTime) {
    if (!this.target) return;

    // Find all camera entities
    const cameraEntities = this.world.with("camera", "transform");
    if (cameraEntities.length === 0) return;

    const cameraEntity = cameraEntities[0];
    const targetTransform = this.target.transform;

    if (!targetTransform) return;

    // Calculate camera boundaries from terrain periodically
    this._boundaryUpdateTimer = (this._boundaryUpdateTimer || 0) + deltaTime;
    if (this._boundaryUpdateTimer > 5) {
      // Every 5 seconds
      this._boundaryUpdateTimer = 0;
      this.calculateBoundariesFromTerrain();
    }

    let targetX = targetTransform.x;
    let targetY = targetTransform.y;

    // Apply look-ahead in facing direction
    if (this.target.input && this.target.input.facing) {
      const direction = this.target.input.facing === "right" ? 1 : -1;
      targetX += this.lookAhead * direction;
    }

    // Apply vertical deadzone
    const cameraY = cameraEntity.transform.y;
    const deltaY = targetY - cameraY;
    if (Math.abs(deltaY) < this.verticalDeadzone) {
      targetY = cameraY;
    }

    // Apply smoothing
    const smoothX =
      this.smoothing === 0
        ? targetX
        : cameraEntity.transform.x +
          (targetX - cameraEntity.transform.x) * (1 - this.smoothing);

    const smoothY =
      this.smoothing === 0
        ? targetY
        : cameraEntity.transform.y +
          (targetY - cameraEntity.transform.y) * (1 - this.smoothing);

    // Apply bounds constraints
    const constrainedX = Math.max(
      this.bounds.minX,
      Math.min(this.bounds.maxX, smoothX)
    );
    const constrainedY = Math.max(
      this.bounds.minY,
      Math.min(this.bounds.maxY, smoothY)
    );

    // Update camera position
    cameraEntity.transform.x = constrainedX + this.offset.x;
    cameraEntity.transform.y = constrainedY + this.offset.y;
    cameraEntity.transform.z = this.offset.z;

    // Update lookAt target
    if (cameraEntity.camera && cameraEntity.camera.lookAt) {
      cameraEntity.camera.lookAt.x = constrainedX;
      cameraEntity.camera.lookAt.y = constrainedY;
      cameraEntity.camera.lookAt.z = 0;
    }
  }
}
