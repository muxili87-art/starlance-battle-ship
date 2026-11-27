import { clamp } from "../core/combat-rules.js";
import { FIGHTERS } from "../core/fighter-catalog.js";
import { applyCard, drawCards, CONTRACT, MODULE } from "../core/upgrade-cards.js";

export const FIELD = { width: 720, height: 1280, top: 155, bottom: 1160, side: 46 };
export const HIT_RADIUS = 10;
export const GRAZE_RADIUS = 28;
export const PICKUP_RADIUS = 130;
export const SHIELD_MAX = 35;

export const MUTATORS = [
  { id: "electromagnetic", label: "电磁风暴" },
  { id: "elite-swarm", label: "精英倾巢" },
  { id: "frenzy-overload", label: "狂暴超载" },
];

export class SoloSession {
  constructor(fighterId, random = Math.random, { mode = "campaign", difficulty = "standard" } = {}) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.mutator = null;
    this.fighterId = fighterId;
    this.fighter = FIGHTERS[fighterId];
    this.random = random;
    this.overload = this.fighter.overload;
    this.ship = { x: 360, y: 1030, targetX: 360, targetY: 1030, vx: 0 };
    this.phase = "playing";
    this.maxHp = this.fighter.hp;
    this.hp = this.maxHp;
    this.shield = 0;
    this.guard = this.fighter.weapon === "guard";
    this.xp = 0;
    this.baseXpNeeded = 3;
    this.level = 1;
    this.energy = 0;
    this.invulnerableMs = 0;
    this.overloadMs = 0;
    this.warpDashMs = 900;
    this.stage = 1;
    this.wave = 1;
    this.elapsedMs = 0;
    this.stageStartedAt = 0;
    this.transitionUntil = 0;
    this.emergencyPending = false;
    this.kills = 0;
    this.breaches = 0;
    this.breachMeter = 0;
    this.breachMax = 5;
    this.parts = 0;
    this.grazes = 0;
    this.recentGrazes = [];
    this.contractGrazes = 0;
    this.feverUntil = 0;
    this.bloodUntil = 0;
    this.combatScore = 0;
    this.freeUpgrades = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboUntil = 0;
    this.maxBulletCancel = 0;
    this.flawlessBosses = 0;
    this.bossDamaged = false;
    this.unlockedInRun = [];
    this.cards = [];
    this.build = { main: 1, secondary: {}, synergy: null };
  }

  get sector() { return (this.stage - 1) % 3 + 1; }
  get loop() { return Math.floor((this.stage - 1) / 3) + 1; }
  get hardcore() { return this.difficulty === "hardcore"; }
  get frontline() { return this.ship.y < FIELD.height / 2; }
  get comboTier() { return this.combo >= 60 ? 3 : this.combo >= 30 ? 2 : this.combo >= 15 ? 1 : 0; }
  get xpNeeded() { return this.hardcore ? Math.max(2, Math.ceil(this.baseXpNeeded * 0.9)) : this.baseXpNeeded; }
  get weaponDamageScale() { return this.build.secondary[CONTRACT.glass] ? 1.45 : 1; }
  get enemyCadence() { return (this.hardcore ? 0.72 : 1) * (this.mutator?.id === "frenzy-overload" ? 0.85 : 1); }

  setTarget(x, y) {
    this.ship.targetX = clamp(x, FIELD.side, FIELD.width - FIELD.side);
    this.ship.targetY = clamp(y, FIELD.top, FIELD.bottom);
  }

  move(dtMs) {
    const { ship } = this;
    const ease = 1 - Math.exp(-dtMs / 54);
    const dx = (ship.targetX - ship.x) * ease;
    const dy = (ship.targetY - ship.y) * ease;
    const factor = Math.min(1, 1.8 * (this.fighter.move ?? 1) * (this.comboTier ? 1.08 : 1) * dtMs / (Math.hypot(dx, dy) || 1));
    ship.x += dx * factor;
    ship.y += dy * factor;
    ship.vx += (dx * factor * 1000 / dtMs - ship.vx) * ease;
  }

  gainXp(amount) {
    this.xp += amount;
    this.settleUpgrades();
  }

  chooseUpgrade(id) {
    if (this.phase !== "upgrade") return false;
    const card = this.cards.find((option) => option.id === id);
    if (!card) return false;
    this.evolution = applyCard(this, card) ?? this.evolution;
    this.finishUpgrade();
    return true;
  }

  finishUpgrade() {
    if (this.phase !== "upgrade") return;
    this.cards = [];
    this.phase = "playing";
    this.settleUpgrades();
  }

  settleUpgrades() {
    if (this.phase !== "playing" || this.transitionUntil) return false;
    if (this.freeUpgrades > 0) this.freeUpgrades--;
    else {
      const threshold = this.xpNeeded;
      if (this.xp + 1e-8 < threshold) return false;
      this.xp = Math.max(0, this.xp - threshold);
      this.baseXpNeeded += Math.ceil(this.level * 0.8) + 2;
      this.level++;
    }
    this.offerUpgrade();
    return true;
  }

  offerUpgrade() {
    if (this.phase !== "playing") return;
    this.cards = drawCards(this, this.random);
    this.phase = "upgrade";
  }

  beginStageTransition() {
    this.stage++;
    this.wave = 1;
    this.warpDashMs = 1500;
    this.transitionUntil = this.elapsedMs + this.warpDashMs;
    this.stageStartedAt = this.transitionUntil;
    this.heal(this.maxHp * (this.mode === "endless" ? 0.4 : 0.3));
    if (this.mode === "endless") {
      this.addShield(25);
      if (this.loop >= 2) this.mutator = MUTATORS[(this.stage - 4) % MUTATORS.length];
    }
  }

  takeDamage(amount) {
    if (this.phase !== "playing" || this.invulnerableMs > 0) return false;
    const hp = this.hp;
    if (this.guard) this.guard = false;
    else {
      const blocked = Math.min(this.shield, amount);
      this.shield -= blocked;
      this.hp = Math.max(0, this.hp - (amount - blocked));
      if (this.build.secondary[MODULE.emergency]) this.emergencyPending = true;
    }
    if (this.hp < hp) {
      this.bossDamaged = true;
      this.combo = Math.floor(this.combo / 2);
      if (this.build.secondary[CONTRACT.blood]) {
        this.energy = 100;
        this.bloodUntil = this.elapsedMs + 2000;
      }
    }
    this.invulnerableMs = 520;
    if (this.hp === 0) this.phase = "defeat";
    return true;
  }

  recordKill() {
    this.kills++;
    this.combatScore += this.frontline ? 240 : 120;
    this.combo = (this.elapsedMs <= this.comboUntil ? this.combo : 0) + 1;
    this.comboUntil = this.elapsedMs + 3400;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (this.comboTier === 3 && this.kills % 3 === 0) this.addShield(1);
  }

  recordGraze() {
    this.grazes++;
    this.parts++;
    this.combatScore += this.frontline ? 180 : 90;
    this.charge(3 * (this.frontline ? 1.8 : 1) * (this.hardcore ? 1.4 : 1)
      * (this.mutator?.id === "electromagnetic" ? 1.3 : 1), false);
    if (this.feverUntil > this.elapsedMs) return false;
    this.recentGrazes = this.recentGrazes.filter((at) => this.elapsedMs - at <= 3000);
    this.recentGrazes.push(this.elapsedMs);
    if (this.recentGrazes.length < 5) return false;
    this.recentGrazes.length = 0;
    this.feverUntil = this.elapsedMs + 4000;
    return true;
  }

  addShield(amount) {
    this.shield = Math.min(SHIELD_MAX, this.shield + amount);
  }

  heal(amount) {
    const restored = Math.min(this.maxHp - this.hp, amount);
    this.hp += restored;
    return amount - restored;
  }

  charge(amount, applyModifiers = true) {
    const rage = this.rageUntil > this.elapsedMs ? 1.5 : 1;
    const bonus = applyModifiers ? rage * (this.build.secondary[MODULE.magnet] ? 1.22 : 1) : 1;
    this.energy = Math.min(100, this.energy + amount * bonus);
  }

  startOverload() {
    if (this.phase !== "playing" || this.transitionUntil || this.energy < 100) return false;
    this.energy = 0;
    const duration = this.mutator?.id === "frenzy-overload" ? 1.4 : 1;
    this.overloadMs = 680 * duration;
    this.invulnerableMs = Math.max(this.invulnerableMs, 1100 * duration);
    if (this.overload.heal) this.heal(this.overload.heal);
    this.addShield(this.overload.shield ?? 0);
    return true;
  }
}
