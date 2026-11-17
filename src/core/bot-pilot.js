import { FORM_ORDER } from "./weapon-forms.js";

/**
 * Active Pilot AI for Bots & Spectated Local Autopilot (90% damage):
 * - Dodges incoming enemy bullets
 * - Actively tracks and intercepts the lowest/highest-threat enemy's X coordinate
 * - Switches weapon forms to detonate status reactions & casts skills/Overload
 */
export function stepAutopilot(session, dtMs, loop = null, { reactionMs = 180 } = {}) {
  if (!session || session.phase !== "playing") return;

  session._aiThinkMs = (session._aiThinkMs || 0) - dtMs;
  if (session._aiThinkMs > 0) return;
  session._aiThinkMs = reactionMs;

  if (session.canTriggerOverload() && (session.enemies.length >= 3 || session.boss)) {
    session.triggerOverload();
  }

  // Switch forms opportunistically to detonate enemy statuses
  const taggedEnemy = session.enemies.find((e) => e.status);
  if (taggedEnemy) {
    const nextForm =
      taggedEnemy.status === "resonance" ? "heavy" : taggedEnemy.status === "fracture" ? "pulse" : "heavy";
    session.switchForm(nextForm);
  } else if (Math.random() < 0.2) {
    session.switchForm(FORM_ORDER[Math.floor(Math.random() * FORM_ORDER.length)]);
  }

  if (loop && session.enemies.length >= 3 && loop.canCastSkill(session.activeForm)) {
    loop.triggerActiveFormSkill([]);
  }

  // 1. Dodge Boss laser lane telegraphs first!
  const warnSectors = new Set((session.bossWarnings || []).map((w) => w.sector));
  if (warnSectors.has(session.ship.sector)) {
    const safeSector = [1, 0, 2].find((sec) => !warnSectors.has(sec));
    if (safeSector !== undefined) {
      session.setShipTargetX(140 + safeSector * 220);
      return;
    }
  }

  // 2. Dodge nearby incoming enemy bullets!
  const dangerBullet = (session.enemyBullets || []).find(
    (b) => b.y > session.ship.y - 220 && b.y < session.ship.y + 20 && Math.abs(b.x - session.ship.x) < 56
  );
  if (dangerBullet) {
    const dodgeDir = dangerBullet.x >= session.ship.x ? -1 : 1;
    const dodgeX = Math.max(80, Math.min(640, session.ship.x + dodgeDir * 120));
    session.setShipTargetX(dodgeX);
    return;
  }

  // 3. Actively move to intercept the lowest enemy or track Boss!
  if (session.enemies.length > 0) {
    const sorted = [...session.enemies].sort((a, b) => b.y - a.y);
    const target = sorted[0];
    session.setShipTargetX(target.x);
  } else if (session.boss) {
    session.setShipTargetX(session.boss.x);
  }
}

export function pickBotPrizeCard(availableEntries) {
  if (!availableEntries || availableEntries.length === 0) return null;
  return availableEntries[0];
}
