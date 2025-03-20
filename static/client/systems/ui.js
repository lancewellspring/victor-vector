// static/client/systems/ui.js
import { System } from "@shared/systems/system";

export class UISystem extends System {
  constructor() {
    super();
    this.name = "UISystem";
    this.priority = 100; // Run last, after all game updates
    this.uiElements = {};
    this.initialized = false;
  }

  init(world) {
    super.init(world);

    // Create UI container
    this.createUIContainer();

    // Create UI elements
    this.createFatigueBar();
    this.createSkillBar();
    this.createResourceDisplay();
    this.createVentureObjectives();

    // Register event listeners
    this.subscribe("playerFatigueIncreased", this.updateFatigueUI.bind(this));
    this.subscribe("skillLocked", this.updateSkillUI.bind(this));
    this.subscribe("skillUnlocked", this.updateSkillUI.bind(this));
    this.subscribe("inventoryChanged", this.updateResourceUI.bind(this));

    this.initialized = true;
    return this;
  }

  update(deltaTime) {
    if (!this.initialized) return;

    // Get player entity (first entity with player component)
    const playerEntities = this.world.with("player");
    if (playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];

    // Update UI elements with player data
    this.updatePlayerUI(playerEntity, deltaTime);
  }

  createUIContainer() {
    // Create main UI container
    const uiContainer = document.createElement("div");
    uiContainer.id = "game-ui";
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "0";
    uiContainer.style.left = "0";
    uiContainer.style.width = "100%";
    uiContainer.style.height = "100%";
    uiContainer.style.pointerEvents = "none";
    document.body.appendChild(uiContainer);

    this.uiElements.container = uiContainer;
  }

  createFatigueBar() {
    const fatigueContainer = document.createElement("div");
    fatigueContainer.className = "ui-fatigue-container";
    fatigueContainer.style.position = "absolute";
    fatigueContainer.style.bottom = "20px";
    fatigueContainer.style.left = "20px";
    fatigueContainer.style.width = "300px";
    fatigueContainer.style.height = "20px";
    fatigueContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    fatigueContainer.style.borderRadius = "3px";

    const fatigueBar = document.createElement("div");
    fatigueBar.className = "ui-fatigue-bar";
    fatigueBar.style.width = "0%";
    fatigueBar.style.height = "100%";
    fatigueBar.style.backgroundColor = "#ff5555";
    fatigueBar.style.borderRadius = "3px";
    fatigueBar.style.transition = "width 0.3s ease-out";

    fatigueContainer.appendChild(fatigueBar);
    this.uiElements.container.appendChild(fatigueContainer);

    this.uiElements.fatigueBar = fatigueBar;
  }

  // Similar methods for skill bar, resource display, etc.

  updatePlayerUI(playerEntity, deltaTime) {
    const { player } = playerEntity;

    // Update fatigue bar
    if (this.uiElements.fatigueBar) {
      const fatiguePercent = (player.currentFatigue / player.maxFatigue) * 100;
      this.uiElements.fatigueBar.style.width = `${fatiguePercent}%`;

      // Change color based on fatigue level
      if (fatiguePercent > 75) {
        this.uiElements.fatigueBar.style.backgroundColor = "#ff3333";
      } else if (fatiguePercent > 50) {
        this.uiElements.fatigueBar.style.backgroundColor = "#ff9933";
      } else {
        this.uiElements.fatigueBar.style.backgroundColor = "#ff5555";
      }
    }

    // Update skill cooldowns
    this.updateSkillCooldowns(player);

    // Update resource display
    this.updateResourceCounters(player);
  }
}
