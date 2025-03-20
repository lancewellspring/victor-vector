// static/client/systems/animation.js
import { System } from "@shared/systems/system";
import * as THREE from "three";

export class AnimationSystem extends System {
  constructor() {
    super();
    this.name = "AnimationSystem";
    this.priority = 35; // After player system, before rendering
    this.dependsOn("PlayerSystem");
    this.animationMixers = new Map(); // Entity ID -> THREE.AnimationMixer
  }

  init(world) {
    super.init(world);

    // Subscribe to events that should trigger animations
    this.subscribe("skillActivated", this.handleSkillActivated.bind(this));
    this.subscribe(
      "playerStateChanged",
      this.handlePlayerStateChanged.bind(this)
    );

    return this;
  }

  update(deltaTime) {
    // Update animation states based on entity states
    this.updateAnimationStates(deltaTime);

    // Update all animation mixers
    for (const [entityId, mixer] of this.animationMixers.entries()) {
      mixer.update(deltaTime);
    }
  }

  // Handle player state changes
  handlePlayerStateChanged(data) {
    const { entity, previousState, newState } = data;
    if (!entity || !entity.animation) return;

    this.changeAnimationState(entity, newState);
  }

  // Handle skill activations
  handleSkillActivated(data) {
    const { playerEntity, skillType, skillEntity } = data;
    if (!playerEntity || !playerEntity.animation) return;

    // Map skill types to animation states
    const animationMap = {
      weapon: "attack",
      movement: "jump",
      defense: "block",
      utility1: "special1",
      utility2: "special2",
    };

    const animState = animationMap[skillType] || "idle";
    this.changeAnimationState(playerEntity, animState);
  }

  // Change animation state with blending
  changeAnimationState(entity, stateName) {
    if (!entity.animation || entity.animation.currentState === stateName)
      return;

    entity.animation.previousState = entity.animation.currentState;
    entity.animation.currentState = stateName;
    entity.animation.transitionTime = 0;
    entity.animation.transitionFrom = entity.animation.previousState;
    entity.animation.transitionTo = stateName;

    // Start transition on the THREE.js animation mixer
    this.startTransition(entity, stateName);
  }

  // Core implementation would use THREE.js Animation system
  // This is a placeholder for the actual implementation
  startTransition(entity, stateName) {
    const mixer = this.animationMixers.get(entity.id);
    if (!mixer) return;

    // In a real implementation, you would:
    // 1. Find the animation clip for the new state
    // 2. Create an animation action from the clip
    // 3. Cross-fade from current action to new action
    console.log(`Transitioning ${entity.id} to animation: ${stateName}`);
  }

  initEntityAnimation(entity) {
    if (!entity.render || !entity.render.mesh || !entity.animation) return;

    const mesh = entity.render.mesh;

    // Check if mesh has animations
    if (!mesh.animations || mesh.animations.length === 0) return;

    // Create animation mixer
    const mixer = new THREE.AnimationMixer(mesh);
    this.animationMixers.set(entity.id, mixer);

    // Create animation actions for each state
    const actions = {};

    for (const clipName in entity.animation.states) {
      // Find matching animation clip
      const clip = mesh.animations.find(
        (anim) =>
          anim.name === clipName ||
          anim.name.toLowerCase().includes(clipName.toLowerCase())
      );

      if (clip) {
        const action = mixer.clipAction(clip);
        actions[clipName] = action;
      }
    }

    // Store actions on the entity for reference
    entity.animation.actions = actions;

    // Play default animation
    this.playAnimation(entity, entity.animation.currentState);
  }

  playAnimation(entity, stateName) {
    const actions = entity.animation.actions;
    if (!actions || !actions[stateName]) return;

    // Fade out all current actions
    for (const name in actions) {
      if (name !== stateName && actions[name].isRunning()) {
        actions[name].fadeOut(0.2);
      }
    }

    // Fade in new action
    actions[stateName]
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(0.2)
      .play();
  }
}
