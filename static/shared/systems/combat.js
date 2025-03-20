import { System } from "./system.js";

export class CombatSystem extends System {
  constructor() {}

  applyAttack(attackerEntity, direction) {
    if (!attackerEntity.combat) return;

    const combat = attackerEntity.combat;
    const transform = attackerEntity.transform;

    if (!transform) return;

    // Calculate hitbox position based on entity facing direction
    const directionMultiplier = direction === "right" ? 1 : -1;
    const hitboxX = transform.x + combat.hitbox.offsetX * directionMultiplier;
    const hitboxY = transform.y + combat.hitbox.offsetY;

    // Find potential targets
    const targets = this.world.with("combat", "transform").filter((entity) => {
      // Skip self
      if (entity.id === attackerEntity.id) return false;

      // Skip same team
      if (entity.combat.team === combat.team) return false;

      // Check if in range
      const targetTransform = entity.transform;
      const dx = targetTransform.x - hitboxX;
      const dy = targetTransform.y - hitboxY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= combat.attackRange;
    });

    // Apply damage to targets
    for (const target of targets) {
      this.applyDamage(attackerEntity, target);
    }

    // Set cooldown
    combat.attackCooldown = 1 / combat.attackSpeed;

    // Emit attack event
    this.world.events.emit("entityAttacked", {
      attacker: attackerEntity,
      direction,
      targets,
    });
  }

  applyDamage(attackerEntity, targetEntity) {
    const attackerCombat = attackerEntity.combat;
    const targetCombat = targetEntity.combat;

    // Calculate if blocked or dodged
    if (targetCombat.isBlocking && Math.random() < targetCombat.blockChance) {
      // Attack was blocked
      this.world.events.emit("attackBlocked", {
        attacker: attackerEntity,
        target: targetEntity,
      });
      return;
    }

    if (Math.random() < targetCombat.dodgeChance) {
      // Attack was dodged
      this.world.events.emit("attackDodged", {
        attacker: attackerEntity,
        target: targetEntity,
      });
      return;
    }

    // Calculate damage
    const baseDamage = attackerCombat.attackPower;
    const defense = targetCombat.defense;
    const damageReduction = defense / (defense + 50); // Formula giving diminishing returns
    const finalDamage = baseDamage * (1 - damageReduction);

    // Apply damage (in this game, damage is fatigue)
    this.world.events.emit("playerDamaged", {
      entity: targetEntity,
      amount: finalDamage,
      source: attackerEntity,
      isFatal: true,
    });

    // Update hit information
    attackerCombat.lastHitEntity = targetEntity.id;
    attackerCombat.lastHitTime = Date.now();

    targetCombat.lastDamageTaken = finalDamage;
    targetCombat.lastDamageSource = attackerEntity.id;
    targetCombat.lastDamageTime = Date.now();
  }
}
