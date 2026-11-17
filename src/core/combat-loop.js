import {
  BATTLE_LAYOUT,
  CORE_LAYOUT,
  SHIP_SECTOR_CENTERS,
  chooseShipTarget,
  enemySector,
  overloadEnergyGain,
} from "./combat-rules.js";
import { BUILD_CARDS, applyBuildCard, buildStatsFor } from "./build-system.js";
import { bossDefinitionFor, createBlockadeCycle, stepBlockadeCycle } from "./boss-catalog.js";
import { WEAPON_FORMS, resolveOrderedReaction } from "./weapon-forms.js";
import { getPressurePhase } from "./pressure-curve.js";
import { GAME_PHASES } from "../state/game-session.js";

const ENEMY_TYPES = ["scout", "striker", "frigate", "shield", "relay"];
export const SKILL_ENERGY_COST = 25;

/**
 * Pure simulation step:
 * - All 3 weapons (Pulse, Heavy, Magnet) fire simultaneously; the activeForm is empowered!
 * - Skill casting hooks into Energy Gauge + independent Form CDs; Ordered Reactions refund energy & shave CDs!
 * - 2.5D depth-aware enemy spawns & 2D elastic domino collisions.
 */
export class CombatLoop {
  constructor(session) {
    this.session = session;
  }

  step(dtMs) {
    const events = [];
    const s = this.session;
    if (s.phase !== GAME_PHASES.PLAYING) return events;

    const dtSec = Math.min(0.05, dtMs / 1000);
    s.elapsedMs += dtMs;
    if (s.warpDashMs > 0) s.warpDashMs = Math.max(0, s.warpDashMs - dtMs);

    this.#stepCooldowns(dtMs);
    this.#stepActiveSkillBuff(dtMs, events);
    this.#stepEconomy(dtMs, events);
    this.#stepShip(dtSec);
    this.#stepOverload(dtMs, events);
    this.#stepNebulaZones(dtSec, events);
    this.#stepSpawner(dtMs, events);
    this.#stepBoss(dtMs, events);
    this.#stepAllWeapons(dtMs, events);
    this.#stepProjectiles(dtSec, events);
    this.#stepEnemyBullets(dtSec, events);
    this.#stepEnemiesPhysics(dtSec, events);
    this.#stepSupplyPods(dtSec, events);

    if (s.projectiles.length > 160) s.projectiles.splice(0, s.projectiles.length - 160);
    if ((s.enemyBullets?.length || 0) > 120) s.enemyBullets.splice(0, s.enemyBullets.length - 120);

    return events;
  }

  #stepEconomy(dtMs, events = []) {
    const s = this.session;
    const eco = s.economy;
    if (!eco) return;
    if (eco.comboTimerMs > 0) {
      eco.comboTimerMs = Math.max(0, eco.comboTimerMs - dtMs);
      if (eco.comboTimerMs === 0) eco.combo = 0;
    }
    // Auto-Repair when Core HP drops to <= 75% and player has enough Scrap (mobile-friendly!)
    if (s.core.hp > 0 && s.core.hp <= s.core.maxHp * 0.75 && eco.scrap >= this.nextRepairCost()) {
      this.spendScrapForRepair(events, true);
    }
  }

  nextRepairCost() {
    return 30 + (this.session.economy?.repairCount || 0) * 35;
  }

  nextOverclockCost() {
    return 80 + (this.session.economy?.overclockCount || 0) * 65;
  }

  spendScrapForRepair(events = [], isAuto = false) {
    const s = this.session;
    const cost = this.nextRepairCost();
    if (!s.economy || s.economy.scrap < cost || s.core.hp >= s.core.maxHp) return false;
    s.economy.scrap -= cost;
    s.economy.repairCount += 1;
    s.core.hp = Math.min(s.core.maxHp, s.core.hp + 20);
    const prefix = isAuto ? "自动星屑维修" : "星屑维修";
    events.push({ type: "reaction", x: s.ship.x, y: s.ship.y - 36, label: `${prefix} -${cost} · +20% 耐久`, color: 0x58e69a });
    return true;
  }

  spendScrapForOverclock(events = []) {
    const s = this.session;
    const cost = this.nextOverclockCost();
    if (!s.economy || s.economy.scrap < cost) return false;
    s.economy.scrap -= cost;
    s.economy.overclockCount += 1;
    const route = s.activeForm === "heavy" ? "missile" : s.activeForm === "magnet" ? "swarm" : "crit";
    s.build.routes[route] = Math.min(4, (s.build.routes[route] || 0) + 1);
    s.build.damageMultiplier = Number((s.build.damageMultiplier + 0.14).toFixed(2));
    s.installedModules.push(`scrap-oc-${s.economy.overclockCount}`);
    const col = s.activeForm === "heavy" ? 0xff8c3a : s.activeForm === "magnet" ? 0xb07cff : 0x43cff4;
    events.push({ type: "pod-install", x: s.ship.x, y: s.ship.y - 40, label: `星屑超频 -${cost} · ${WEAPON_FORMS[s.activeForm].name}强化!`, color: col });
    return true;
  }

  #stepNebulaZones(dtSec, events) {
    const s = this.session;
    if (!s.nebulaZones) s.nebulaZones = [];
    if (s.nebulaZones.length === 0 && Math.floor(s.elapsedMs / 15000) > Math.floor((s.elapsedMs - dtSec * 1000) / 15000)) {
      const lane = Math.floor(Math.random() * 3);
      s.nebulaZones.push({
        id: s.allocateId(),
        x: SHIP_SECTOR_CENTERS[lane],
        y: 340,
        vy: 62,
        radius: 112,
      });
      events.push({ type: "reaction", x: SHIP_SECTOR_CENTERS[lane], y: 390, label: "⚡ 离子星云降临 · 充能×1.8", color: 0xb07cff });
    }
    let inside = false;
    for (const neb of s.nebulaZones) {
      neb.y += neb.vy * dtSec;
      if (Math.hypot(s.ship.x - neb.x, s.ship.y - neb.y) < neb.radius) {
        inside = true;
      }
    }
    s.inIonNebula = inside;
    if (s.nebulaShockMs > 0) s.nebulaShockMs = Math.max(0, s.nebulaShockMs - dtSec * 1000);
    s.nebulaHeat = s.nebulaHeat ?? 0;
    if (inside) {
      s.nebulaHeat = Math.min(100, s.nebulaHeat + 34 * dtSec);
      if (s.nebulaHeat >= 100) {
        s.nebulaHeat = 18;
        s.nebulaShockMs = 950;
        s.core.hp = Math.max(0, s.core.hp - 5);
        s.stats.coreHits += 1;
        events.push({ type: "core-hit", x: s.ship.x, y: s.ship.y });
        events.push({ type: "reaction", x: s.ship.x, y: s.ship.y - 38, label: "⚡ 星云过热反噬 -5%耐久!", color: 0xff4b5c });
        if (s.core.hp <= 0) {
          s.result = "defeat";
          s.setPhase(GAME_PHASES.ENDED);
          events.push({ type: "run-ended", result: "defeat" });
        }
      }
    } else {
      s.nebulaHeat = Math.max(0, s.nebulaHeat - 30 * dtSec);
    }
    s.nebulaZones = s.nebulaZones.filter((n) => n.y < 1180);
  }

  #spawnSupplyPods(clearedWave) {
    const s = this.session;
    const offset = Math.max(0, Math.floor((clearedWave - 1) / 2) * 3) % BUILD_CARDS.length;
    s.supplyPods = [0, 1, 2].map((lane) => {
      const card = BUILD_CARDS[(offset + lane) % BUILD_CARDS.length];
      const startX = 360 + (lane - 1) * 58;
      const targetX = SHIP_SECTOR_CENTERS[lane];
      return {
        id: s.allocateId(),
        lane,
        startX,
        x: startX,
        targetX,
        y: 345,
        targetY: 960,
        vy: 330,
        ttlMs: 7500,
        card,
      };
    });
  }

  #stepSupplyPods(dtSec, events) {
    const s = this.session;
    if (!s.supplyPods || s.supplyPods.length === 0) return;
    const dtMs = dtSec * 1000;
    for (const pod of s.supplyPods) {
      pod.ttlMs -= dtMs;
      if (pod.y < pod.targetY) {
        pod.y = Math.min(pod.targetY, pod.y + pod.vy * dtSec);
        const t = Math.max(0, Math.min(1, (pod.y - 345) / (pod.targetY - 345)));
        pod.x = pod.startX + (pod.targetX - pod.startX) * t;
      }
      // Fly-through pickup when player ship flies into the lane pod!
      if (Math.abs(s.ship.x - pod.x) < 62 && Math.abs(s.ship.y - pod.y) < 82) {
        applyBuildCard(s.build, pod.card);
        s.installedModules.push(pod.card.id);
        const color = pod.card.route === "missile" ? 0xff8c3a : pod.card.route === "swarm" ? 0xb07cff : 0x43cff4;
        events.push({ type: "pod-install", x: pod.x, y: pod.y - 30, label: `空投实装 · ${pod.card.name}`, color });
        s.supplyPods = [];
        return;
      }
    }
    s.supplyPods = s.supplyPods.filter((p) => p.ttlMs > 0);
  }

  #stepCooldowns(dtMs) {
    const cds = this.session.formCooldowns;
    for (const key of Object.keys(cds)) {
      if (cds[key] > 0) cds[key] = Math.max(0, cds[key] - dtMs);
    }
  }

  #stepShip(dtSec) {
    const { ship } = this.session;
    const shockScale = (this.session.nebulaShockMs || 0) > 0 ? 0.65 : 1.0;
    const chassisSpeed = this.session.chassis === "viper" ? 1.15 : 1.0;
    const speed = 1350 * shockScale * chassisSpeed;
    const dx = ship.targetX - ship.x;
    const maxStep = speed * dtSec;
    if (Math.abs(dx) <= maxStep) {
      ship.vx = 0;
      ship.x = ship.targetX;
    } else {
      const dir = Math.sign(dx);
      ship.vx = dir * speed;
      ship.x += dir * maxStep;
    }
  }

  canCastSkill(formId = this.session.activeForm) {
    const s = this.session;
    if (s.phase !== GAME_PHASES.PLAYING) return false;
    if ((s.formCooldowns[formId] || 0) > 0) return false;
    if (!s.core.overloadActive && s.core.energy < SKILL_ENERGY_COST) return false;
    return true;
  }

  triggerActiveFormSkill(events = []) {
    const s = this.session;
    const formId = s.activeForm;
    if (!this.canCastSkill(formId)) return false;

    const form = WEAPON_FORMS[formId];
    if (!s.core.overloadActive) {
      s.core.energy = Math.max(0, s.core.energy - SKILL_ENERGY_COST);
    }
    s.formCooldowns[formId] = Math.round(form.skillCooldownMs * (s.chassis === "r9" ? 0.85 : 1.0));
    events.push({ type: "skill-cast", formId, x: s.ship.x, y: s.ship.y, color: form.color });

    // 3.0s Sustained Skill Mode: fires Volley 1 immediately and Volley 2 at 1.45s!
    s.activeSkillBuff = {
      formId,
      remainingMs: 3000,
      volleyTimerMs: 1450,
      volleysLeft: 1,
    };
    this.#fireSkillVolley(formId, form, events);
    return true;
  }

  #stepActiveSkillBuff(dtMs, events) {
    const s = this.session;
    const buff = s.activeSkillBuff;
    if (!buff) return;
    buff.remainingMs -= dtMs;
    buff.volleyTimerMs -= dtMs;
    if (buff.volleysLeft > 0 && buff.volleyTimerMs <= 0) {
      buff.volleysLeft -= 1;
      const form = WEAPON_FORMS[buff.formId];
      this.#fireSkillVolley(buff.formId, form, events);
    }
    if (buff.remainingMs <= 0) {
      s.activeSkillBuff = null;
    }
  }

  #fireSkillVolley(formId, form, events) {
    const s = this.session;
    if (formId === "pulse") {
      for (let i = -4; i <= 4; i += 1) {
        s.projectiles.push({
          id: s.allocateId(),
          kind: "pulse",
          formId: "pulse",
          x: s.ship.x + i * 10,
          y: s.ship.y - 38,
          vx: i * 145,
          vy: -1240,
          pierce: 3,
          damage: 40,
          alive: true,
        });
      }
      events.push({ type: "mega-beam", x: s.ship.x, y: s.ship.y - 40, color: form.color });
    } else if (formId === "heavy") {
      for (const ox of [-90, -45, 0, 45, 90]) {
        s.projectiles.push({
          id: s.allocateId(),
          kind: "heavy",
          formId: "heavy",
          x: s.ship.x + ox,
          y: s.ship.y - 36,
          vx: ox * 0.75,
          vy: -940,
          pierce: 1,
          damage: 94,
          knockbackVy: -380,
          alive: true,
        });
      }
      events.push({ type: "mega-blast", x: s.ship.x, y: s.ship.y - 160, color: form.color });
    } else if (formId === "magnet") {
      const pullX = s.ship.x;
      const pullY = s.ship.y - 360;
      const targets = s.enemies.filter((e) => e.hp > 0).slice(0, 8);
      for (const e of targets) {
        const dx = pullX - e.x;
        e.vx += Math.max(-380, Math.min(380, dx * 2.4));
        e.vy = Math.min(e.vy, 10);
        this.#applyHitAndReaction(e, 56, "magnet", e.x, e.y, events, -65);
        events.push({ type: "chain", x1: pullX, y1: pullY, x2: e.x, y2: e.y, color: form.color });
      }
      s.enemies = s.enemies.filter((e) => e.hp > 0);
      events.push({ type: "singularity", x: pullX, y: pullY, color: form.color });
    }
  }

  triggerOverloadDive(events = []) {
    const s = this.session;
    if (!s.triggerOverload()) return false;
    events.push({ type: "overload-start", x: s.ship.x, y: s.ship.y });

    // First-person dive-bombing strike across the battlefield (strongest along current lane)
    const dmgScale = Number(s.build?.damageMultiplier ?? 1);
    const strikeDmg = Math.round(85 * dmgScale);
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      this.#applyHitAndReaction(enemy, strikeDmg, "heavy", enemy.x, enemy.y, events, -120);
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0);
    return true;
  }

  #stepOverload(dtMs, events) {
    const s = this.session;
    const { core } = s;
    if (!core.overloadActive) return;
    core.overloadRemainingMs = Math.max(0, core.overloadRemainingMs - dtMs);
    if (core.overloadRemainingMs <= 0) {
      core.overloadActive = false;
      // Post-overload 3rd-person barrel-roll dive-bombing finisher shockwave!
      const dmgScale = Number(s.build?.damageMultiplier ?? 1);
      const finisherDmg = Math.round(70 * dmgScale);
      for (const enemy of s.enemies) {
        if (enemy.hp <= 0) continue;
        this.#applyHitAndReaction(enemy, finisherDmg, "heavy", enemy.x, enemy.y, events, -150);
      }
      s.enemies = s.enemies.filter((e) => e.hp > 0);
      events.push({ type: "overload-end", x: s.ship.x, y: s.ship.y });
    }
  }

  #stepSpawner(dtMs, events) {
    const s = this.session;
    if (s.boss || (s.warpDashMs || 0) > 650) return;

    // Scheme 2: Comeback Airdrop interference sent by trailing rivals onto #1 Leader!
    if (s.endless.pendingInterference > 0) {
      s.endless.pendingInterference -= 1;
      const sector = Math.floor(Math.random() * 3);
      const dropX = 360 + (sector - 1) * 110;
      this.#spawnEnemyUnit("frigate", sector, dropX, 250, events);
      events.push({ type: "interference-drop", x: dropX, y: 260 });
    }

    const phase = getPressurePhase(s.elapsedMs);
    s.endless.spawnTimerMs -= dtMs;
    if (s.endless.spawnTimerMs > 0 || s.enemies.length >= phase.maxEnemies) return;
    s.endless.spawnTimerMs = phase.spawnIntervalMs;

    // Spawn coordinated formation batch emerging from deep-space vanishing point (y=350)
    for (let i = 0; i < phase.batchSize; i += 1) {
      if (s.enemies.length >= phase.maxEnemies) break;
      const sector = (i + Math.floor(Math.random() * 3)) % 3;
      const type = phase.weights[Math.floor(Math.random() * phase.weights.length)];
      const horizonX = 360 + (sector - 1) * 95 + (Math.random() - 0.5) * 55;
      this.#spawnEnemyUnit(type, sector, horizonX, 350 + i * 10, events);
    }
  }

  #spawnEnemyUnit(type, sector, x, y, events) {
    const s = this.session;
    const timeScale = 1 + Math.floor(s.elapsedMs / 25000) * 0.14;
    const hpFactor = s.core.hp > 85 ? 1.12 : s.core.hp < 40 ? 0.9 : 1.0;
    const scale = timeScale * Number(s.pace?.enemyHpScale ?? 1.0) * hpFactor;
    const hpBase =
      type === "frigate" || type === "shield" ? 145 : type === "relay" ? 105 : type === "striker" ? 80 : 54;
    const hp = Math.round(hpBase * scale);
    const baseSpeed = type === "scout" ? 112 : type === "frigate" ? 58 : type === "relay" ? 68 : 84;
    const enemy = {
      id: s.allocateId(),
      type,
      sector,
      x: Math.max(64, Math.min(656, x)),
      y,
      vx: (sector - 1) * 28 + (Math.random() - 0.5) * 20, // perspective fan-out!
      vy: baseSpeed,
      baseSpeed,
      mass: type === "frigate" ? 2.4 : 1.0,
      hp,
      maxHp: hp,
      radius: type === "frigate" ? 30 : 22,
      hitFlashMs: 0,
      ageMs: 0,
      fireCooldownMs: type === "frigate" ? 1800 : 99999,
      status: null,
      statusTimerMs: 0,
    };
    s.enemies.push(enemy);
    events.push({ type: "enemy-spawn", enemy });
  }

  #stepBoss(dtMs, events) {
    const s = this.session;
    if (!s.boss) return;

    const boss = s.boss;
    const dtSec = dtMs / 1000;
    const isPhase2 = boss.phase === 2;
    if (boss.invulnMs > 0) {
      boss.invulnMs = Math.max(0, boss.invulnMs - dtMs);
    }

    // Rival Ace Boss actively weaves & banks across the 3 lanes (faster in Phase 2 Rage)!
    const moveSpeed = isPhase2 ? 265 : 185;
    boss.moveTimerMs = (boss.moveTimerMs ?? 2400) - dtMs;
    if (boss.moveTimerMs <= 0) {
      boss.moveTimerMs = isPhase2 ? 1750 : 2500;
      const lane = Math.floor(Math.random() * 3);
      boss.targetX = SHIP_SECTOR_CENTERS[lane];
    }
    const dx = (boss.targetX ?? 360) - boss.x;
    const stepX = moveSpeed * dtSec;
    if (Math.abs(dx) <= stepX) {
      boss.vx = 0;
      boss.x = boss.targetX ?? 360;
    } else {
      boss.vx = Math.sign(dx) * moveSpeed;
      boss.x += boss.vx * dtSec;
    }

    // Keep Boss parts anchored to moving Boss airframe!
    for (const part of boss.parts) {
      part.x = boss.x + (part.offsetX || 0);
      part.y = part.id === "reactor" ? 316 : 344;
    }

    // Mirrored 3-Form Arsenal Switching (pulse / heavy / magnet)
    boss.formTimerMs = (boss.formTimerMs ?? 5200) - dtMs;
    if (boss.formTimerMs <= 0) {
      boss.formTimerMs = isPhase2 ? 3800 : 5200;
      const order = ["pulse", "heavy", "magnet"];
      boss.activeForm = order[(order.indexOf(boss.activeForm || "pulse") + 1) % order.length];
      const f = WEAPON_FORMS[boss.activeForm];
      events.push({ type: "reaction", x: boss.x, y: 280, label: `⚠ ${boss.name} 切换【${f.name}】`, color: f.color });
    }

    s.enemyBullets = s.enemyBullets || [];
    const rateScale = isPhase2 ? 0.68 : 1.0;

    // 1. Rapid Vulcan Machine Gun burst aimed toward player's lane
    boss.vulcanTimerMs = (boss.vulcanTimerMs ?? 1500) - dtMs;
    if (boss.vulcanTimerMs <= 0) {
      boss.vulcanTimerMs = Math.round(1650 * rateScale);
      const count = isPhase2 ? 5 : 3;
      const aimDx = s.ship.x - boss.x;
      const aimDy = Math.max(120, s.ship.y - 360);
      const baseAngle = Math.atan2(aimDy, aimDx);
      for (let i = 0; i < count; i += 1) {
        const spread = (i - (count - 1) / 2) * 0.12;
        const ang = baseAngle + spread;
        s.enemyBullets.push({
          id: s.allocateId(),
          kind: "vulcan",
          x: boss.x + (i % 2 === 0 ? -24 : 24),
          y: 365,
          vx: Math.cos(ang) * (isPhase2 ? 460 : 390),
          vy: Math.sin(ang) * (isPhase2 ? 460 : 390),
          dmg: isPhase2 ? 8 : 5,
          alive: true,
        });
      }
    }

    // 2. Spread Homing Missiles (destructible by player bullets!)
    boss.missileTimerMs = (boss.missileTimerMs ?? 2600) - dtMs;
    if (boss.missileTimerMs <= 0) {
      boss.missileTimerMs = Math.round(3100 * rateScale);
      const count = isPhase2 ? 5 : 3;
      for (let i = 0; i < count; i += 1) {
        const offset = i - (count - 1) / 2;
        s.enemyBullets.push({
          id: s.allocateId(),
          kind: "boss-missile",
          x: boss.x + offset * 42,
          y: 358,
          vx: offset * 125,
          vy: isPhase2 ? 235 : 195,
          hp: isPhase2 ? 32 : 24,
          maxHp: isPhase2 ? 32 : 24,
          radius: 16,
          dmg: isPhase2 ? 10 : 7,
          alive: true,
        });
      }
    }

    // 3. Spawn Advancing Destructible Escort Drones from wingtips
    boss.escortTimerMs = (boss.escortTimerMs ?? 4500) - dtMs;
    if (boss.escortTimerMs <= 0 && s.enemies.length < 8) {
      boss.escortTimerMs = isPhase2 ? 3600 : 5200;
      const escortType = isPhase2 ? "striker" : "scout";
      for (const side of [-1, 1]) {
        const sx = Math.max(70, Math.min(650, boss.x + side * 88));
        const sector = sx < 250 ? 0 : sx > 470 ? 2 : 1;
        this.#spawnEnemyUnit(escortType, sector, sx, 368, events);
      }
      events.push({ type: "reaction", x: boss.x, y: 392, label: "⚠ 母机释放护卫僚机!", color: 0xff8c3a });
    }

    const cannons = boss.parts.filter((p) => p.id !== "reactor");
    const cycleEvents = stepBlockadeCycle(boss.cycle, {
      now: s.elapsedMs,
      cannons,
      coreAlive: s.core.hp > 0,
    });

    for (const ev of cycleEvents) {
      if (ev.type === "warning") {
        s.bossWarnings.push({ sector: ev.sector, fireAt: ev.fireAt });
      } else if (ev.type === "fire") {
        s.bossWarnings = s.bossWarnings.filter((w) => w.fireAt !== ev.fireAt || w.sector !== ev.sector);
        s.core.hp = Math.max(0, s.core.hp - ev.damage * (isPhase2 ? 1.35 : 1));
        s.stats.coreHits += 1;
        events.push({ type: "core-hit", x: SHIP_SECTOR_CENTERS[ev.sector], y: CORE_LAYOUT.centerY });
        if (s.core.hp <= 0) {
          s.result = "defeat";
          s.setPhase(GAME_PHASES.ENDED);
          events.push({ type: "run-ended", result: "defeat" });
        }
      }
    }
  }

  #stepAllWeapons(dtMs, events) {
    const s = this.session;
    const stats = buildStatsFor(s.build);
    const pilotScale = Number(s.ship.damageScale ?? (s.ship.autopilot ? 0.9 : 1.0));
    const overloadRate = (s.core.overloadActive ? 1.5 : 1) * (s.inIonNebula ? 1.22 : 1);
    const dmgScale = stats.damageMultiplier * (s.core.overloadActive ? 1.35 : 1) * pilotScale;

    const activeTargets = this.#collectTargets();
    const primaryTarget = chooseShipTarget(activeTargets, s.ship.sector, s.ship.x);
    s.lockedTargetId = primaryTarget ? primaryTarget.id : null;
    if (activeTargets.length === 0) return;

    // 1. Pulse Machinegun (always active at normal 1.0x; empowered 1.9x + 3-way spread when activeForm === "pulse")
    const pulseEmpowered = s.activeForm === "pulse";
    const firstPerson = s.core.overloadActive;
    const vanishX = 360 + (s.ship.x - 360) * 0.48;
    s.weapons.machinegunCooldownMs -= dtMs * (pulseEmpowered ? 1.9 : 1.0) * stats.attackSpeedMultiplier * overloadRate;
    if (s.weapons.machinegunCooldownMs <= 0) {
      s.weapons.machinegunCooldownMs = WEAPON_FORMS.pulse.fireIntervalMs;
      const barrels = firstPerson ? [-220, 220] : pulseEmpowered ? [-16, 0, 16] : [0];
      for (const ox of barrels) {
        const sx = s.ship.x + ox;
        const sy = firstPerson ? 1020 : s.ship.y - 38;
        const aimX = firstPerson ? s.ship.x : vanishX + ox * 0.35;
        const aimY = firstPerson ? 480 : 344;
        const dx = aimX - sx;
        const dy = aimY - sy;
        const len = Math.hypot(dx, dy) || 1;
        s.projectiles.push({
          id: s.allocateId(),
          kind: "pulse",
          formId: "pulse",
          x: sx,
          y: sy,
          vx: (dx / len) * 1180,
          vy: (dy / len) * 1180,
          pierce: (pulseEmpowered ? 1 : 0) + (s.chassis === "viper" ? 1 : 0),
          damage: Math.round((pulseEmpowered ? 22 : 12) * dmgScale),
          alive: true,
        });
      }
      events.push({ type: "muzzle", kind: "pulse", x: s.ship.x, y: s.ship.y - 38 });
    }

    // 2. Heavy Cannon (always active at normal 1.0x; empowered 1.95x + twin pods when activeForm === "heavy")
    const heavyEmpowered = s.activeForm === "heavy";
    s.weapons.missileCooldownMs -= dtMs * (heavyEmpowered ? 1.95 : 1.0) * stats.attackSpeedMultiplier * overloadRate;
    if (s.weapons.missileCooldownMs <= 0) {
      s.weapons.missileCooldownMs = WEAPON_FORMS.heavy.fireIntervalMs;
      const offsets = firstPerson ? [-240, 240] : heavyEmpowered ? [-20, 20] : [0];
      for (const ox of offsets) {
        const sx = s.ship.x + ox;
        const sy = firstPerson ? 1020 : s.ship.y - 34;
        const aimX = firstPerson ? s.ship.x : vanishX + ox * 0.4;
        const aimY = firstPerson ? 480 : 344;
        const dx = aimX - sx;
        const dy = aimY - sy;
        const len = Math.hypot(dx, dy) || 1;
        s.projectiles.push({
          id: s.allocateId(),
          kind: "heavy",
          formId: "heavy",
          x: sx,
          y: sy,
          vx: (dx / len) * 860,
          vy: (dy / len) * 860,
          pierce: 0,
          damage: Math.round((heavyEmpowered ? 58 : 26) * dmgScale),
          knockbackVy: heavyEmpowered ? -260 : -110,
          alive: true,
        });
      }
      events.push({ type: "muzzle", kind: "heavy", x: s.ship.x, y: s.ship.y - 34 });
    }

    // 3. Orbiting Escort Drones (Magnet Arcs — always active at 1.0x; empowered 1.95x when activeForm === "magnet")
    const magnetEmpowered = s.activeForm === "magnet";
    s.weapons.droneCooldownsMs[0] = (s.weapons.droneCooldownsMs[0] || 0) - dtMs * (magnetEmpowered ? 1.95 : 1.0) * overloadRate;
    if (s.weapons.droneCooldownsMs[0] <= 0) {
      s.weapons.droneCooldownsMs[0] = WEAPON_FORMS.magnet.fireIntervalMs;
      const count = 2;
      for (let i = 0; i < count; i += 1) {
        const target = activeTargets[i % activeTargets.length];
        const sx = s.ship.x + (i === 0 ? -56 : 56);
        const sy = s.ship.y - 12;
        const dx = target.x - sx;
        const dy = target.y - sy;
        const len = Math.hypot(dx, dy) || 1;
        s.projectiles.push({
          id: s.allocateId(),
          kind: "magnet",
          formId: "magnet",
          x: sx,
          y: sy,
          vx: (dx / len) * 920,
          vy: (dy / len) * 920,
          targetId: target.id,
          pierce: 0,
          damage: Math.round((magnetEmpowered ? 34 : 18) * dmgScale),
          alive: true,
        });
      }
      events.push({ type: "muzzle", kind: "magnet", x: s.ship.x, y: s.ship.y - 14 });
    }
  }

  #collectTargets() {
    const s = this.session;
    const targets = [...s.enemies];
    for (const b of s.enemyBullets || []) {
      if (b.alive && b.kind === "boss-missile" && (b.hp || 0) > 0) {
        targets.push({
          id: `missile:${b.id}`,
          isMissile: true,
          bullet: b,
          x: b.x,
          y: b.y,
          hp: b.hp,
          maxHp: b.maxHp || 24,
          radius: b.radius || 16,
        });
      }
    }
    if (s.boss) {
      const cannonsAlive = s.boss.parts.filter((p) => p.id !== "reactor" && !p.dead);
      const activeParts = cannonsAlive.length ? cannonsAlive : s.boss.parts.filter((p) => !p.dead);
      for (const part of activeParts) {
        targets.push({
          id: `boss:${part.id}`,
          isBossPart: true,
          part,
          x: part.x,
          y: part.y,
          hp: part.hp,
          maxHp: part.maxHp,
          radius: part.id === "reactor" ? 56 : 38,
        });
      }
    }
    return targets;
  }

  #stepProjectiles(dtSec, events) {
    const s = this.session;
    const targets = this.#collectTargets();
    const targetById = new Map(targets.map((t) => [t.id, t]));

    for (const p of s.projectiles) {
      if (!p.alive) continue;
      if (p.kind === "magnet" && p.targetId) {
        const target = targetById.get(p.targetId);
        if (target) {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx = (dx / dist) * 920;
          p.vy = (dy / dist) * 920;
        }
      }
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      if (p.y < 340 || p.y > 1340 || p.x < -40 || p.x > 760) {
        p.alive = false;
        continue;
      }

      p._hitIds = p._hitIds || new Set();
      for (const t of targets) {
        if (t.hp <= 0 || p._hitIds.has(t.id)) continue;
        // Let enemies warp in past y=335 so players clearly see their 2.5D silhouettes before they die
        if (!t.isBossPart && t.y < 335) continue;
        if (Math.hypot(t.x - p.x, t.y - p.y) <= t.radius + 12) {
          p._hitIds.add(t.id);
          if ((p.pierce || 0) > 0) p.pierce -= 1;
          else p.alive = false;
          if (t.isBossPart) {
            this.#applyBossDamage(t.part, p.damage, p.formId, p.x, p.y, events);
          } else if (t.isMissile) {
            t.bullet.hp -= p.damage;
            events.push({ type: "hit", kind: p.formId, x: t.x, y: t.y });
            if (t.bullet.hp <= 0) {
              t.bullet.alive = false;
              if (s.economy) s.economy.scrap += 6;
              events.push({ type: "kill", enemy: { x: t.x, y: t.y }, kind: p.formId });
            }
          } else {
            this.#applyHitAndReaction(t, p.damage, p.formId, p.x, p.y, events, p.knockbackVy || -35);
          }
          if (!p.alive) break;
        }
      }
    }

    s.projectiles = s.projectiles.filter((p) => p.alive);
    s.enemies = s.enemies.filter((e) => e.hp > 0);
  }

  #applyHitAndReaction(enemy, amount, formId, hitX, hitY, events, knockbackVy = -35) {
    const s = this.session;
    const form = WEAPON_FORMS[formId] || WEAPON_FORMS.pulse;
    if (formId === "pulse" || formId === "magnet") {
      // Piercing / Arc forms bypass Shield barrier; others take 50% on shield carriers
    } else if (enemy.type === "shield") {
      amount = Math.round(amount * 0.55);
    }

    let totalDmg = amount;

    const reaction = resolveOrderedReaction(enemy.status, formId);
    if (reaction) {
      enemy.status = null;
      enemy.statusTimerMs = 0;
      totalDmg += reaction.bonusDamage;
      events.push({ type: "reaction", label: reaction.label, x: enemy.x, y: enemy.y - 24, color: reaction.color });

      // Reaction refunds Energy & shaves -800ms off all Form CDs!
      s.core.energy = Math.min(s.core.maxEnergy, s.core.energy + 12);
      for (const k of Object.keys(s.formCooldowns)) {
        if (s.formCooldowns[k] > 0) s.formCooldowns[k] = Math.max(0, s.formCooldowns[k] - 800);
      }

      if (reaction.aoeRadius) {
        for (const other of s.enemies) {
          if (other.id !== enemy.id && other.hp > 0 && Math.hypot(other.x - enemy.x, other.y - enemy.y) <= reaction.aoeRadius) {
            other.hp -= Math.round(reaction.bonusDamage * 0.7);
            other.hitFlashMs = 75;
            const dx = other.x - enemy.x;
            const dy = other.y - enemy.y;
            const d = Math.hypot(dx, dy) || 1;
            other.vx += (dx / d) * 180;
            other.vy += (reaction.knockbackVy || -120) / other.mass;
            if (other.hp <= 0) this.#onEnemyKilled(other, formId, events);
          }
        }
      } else if (reaction.chainCount) {
        const nearby = s.enemies
          .filter((o) => o.id !== enemy.id && o.hp > 0)
          .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))
          .slice(0, reaction.chainCount);
        for (const target of nearby) {
          target.hp -= Math.round(reaction.bonusDamage * 0.85);
          target.hitFlashMs = 75;
          events.push({ type: "chain", x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y, color: reaction.color });
          if (target.hp <= 0) this.#onEnemyKilled(target, formId, events);
        }
      }
      enemy.vy += (reaction.knockbackVy || -80) / enemy.mass;
    } else if (formId === s.activeForm) {
      // Primary empowered form applies its status tag
      enemy.status = form.status;
      enemy.statusTimerMs = 5500;
    }

    enemy.hp -= totalDmg;
    enemy.hitFlashMs = 75;
    enemy.vy += knockbackVy / enemy.mass;
    s.stats.damageDealt += totalDmg;

    if (!s.core.overloadActive) {
      const chargeScale = Number(s.pace?.overloadChargeScale ?? 1.0) * (s.inIonNebula ? 1.8 : 1.0);
      s.core.energy = Math.min(
        s.core.maxEnergy,
        s.core.energy + overloadEnergyGain(totalDmg, enemySector(enemy.x) === s.ship.sector) * 1.4 * chargeScale
      );
    }

    events.push({ type: "hit", kind: formId, x: hitX, y: hitY, enemyId: enemy.id });

    if (enemy.hp <= 0) {
      this.#onEnemyKilled(enemy, formId, events);
    }
  }

  #onEnemyKilled(enemy, formId, events) {
    const s = this.session;
    if (enemy._killed) return;
    enemy._killed = true;
    s.stats.kills += 1;
    s.endless.waveKills += 1;
    const isHeavy = enemy.type === "relay" || enemy.type === "frigate" || enemy.type === "shield";
    if (s.economy) {
      s.economy.combo += 1;
      s.economy.comboTimerMs = 3800;
      const mult = 1 + Math.min(1.5, s.economy.combo * 0.08);
      const scrapMult = s.chassis === "r9" ? 1.3 : 1.0;
      s.economy.scrap += Math.round((isHeavy ? 8 : 4) * mult * scrapMult);
    }
    events.push({ type: "kill", enemy: { ...enemy }, kind: formId, hitstopMs: isHeavy ? 26 : 0 });

    if (s.mode === "endless" && s.endless.waveKills >= s.endless.waveTargetKills) {
      const clearedWave = s.endless.wave;
      s.endless.wave += 1;
      s.endless.waveKills = 0;
      s.endless.waveTargetKills = 10 + (s.endless.wave - 1) * 3;
      if (s.chassis === "aegis" && s.core.hp < s.core.maxHp) {
        s.core.hp = Math.min(s.core.maxHp, s.core.hp + 6);
        events.push({ type: "reaction", x: s.ship.x, y: s.ship.y - 46, label: "🛡 盾卫每波回盾 +6%", color: 0x58e69a });
      }
      events.push({ type: "wave-clear", wave: clearedWave, nextWave: s.endless.wave });
      // Every 4th wave spawns the Route Boss (封锁巡洋舰)!
      if (clearedWave % 2 === 0) {
        s.warpDashMs = 1900;
        events.push({ type: "reaction", x: 360, y: 340, label: `▶▶ 航段跃迁冲刺 · 突入 W${s.endless.wave}!`, color: 0x43cff4 });
      } else {
        s.warpDashMs = 550;
      }

      if (clearedWave % 4 === 0 && s.phase === GAME_PHASES.PLAYING && !s.boss) {
        this.#spawnRouteBoss(clearedWave);
        events.push({ type: "reaction", x: 360, y: 370, label: "⚠ 警告：航段 BOSS 封锁巡洋舰降临！", color: 0xff4b5c });
      } else if (clearedWave % 2 === 0 && s.phase === GAME_PHASES.PLAYING) {
        this.#spawnSupplyPods(clearedWave);
        events.push({ type: "reaction", x: 360, y: 390, label: "⚡ 航道武装空投已降临！飞越拾取", color: 0xffd166 });
      }
    }

    // Relay carrier death discharges a chain-lightning burst to nearby enemies
    if (enemy.type === "relay") {
      const nearby = s.enemies.filter((o) => o.id !== enemy.id && o.hp > 0 && Math.hypot(o.x - enemy.x, o.y - enemy.y) < 220);
      for (const o of nearby) {
        o.hp -= 36;
        o.hitFlashMs = 80;
        events.push({ type: "chain", x1: enemy.x, y1: enemy.y, x2: o.x, y2: o.y, color: 0xb07cff });
        if (o.hp <= 0) this.#onEnemyKilled(o, "magnet", events);
      }
    }
  }

  #spawnRouteBoss(clearedWave) {
    const s = this.session;
    const def = bossDefinitionFor("blockade-cruiser");
    const hpTotal = Math.round(1450 * (1 + Math.floor(clearedWave / 4) * 0.45));
    const offsets = [-130, 130, 0];
    s.boss = {
      id: def.id,
      name: "NEMESIS-IX 宿敌母机",
      phase: 1,
      invulnMs: 0,
      x: 360,
      targetX: 360,
      vx: 0,
      activeForm: "pulse",
      formTimerMs: 5200,
      vulcanTimerMs: 1400,
      missileTimerMs: 2600,
      escortTimerMs: 4400,
      moveTimerMs: 2200,
      maxHp: hpTotal,
      hp: hpTotal,
      dpsDealt: 0,
      cycle: createBlockadeCycle(s.elapsedMs),
      parts: def.parts.map((p, idx) => {
        const partHp = Math.round(hpTotal * p.hpShare);
        const offsetX = offsets[idx] ?? 0;
        return {
          id: p.id,
          label: p.label,
          role: p.role,
          offsetX,
          x: 360 + offsetX,
          y: p.id === "reactor" ? 316 : 344,
          hp: partHp,
          maxHp: partHp,
          dead: false,
        };
      }),
    };
    s.bossWarnings = [];
  }

  #applyBossDamage(part, amount, formId, hitX, hitY, events) {
    const s = this.session;
    if (!s.boss || part.dead) return;
    if ((s.boss.invulnMs || 0) > 0) {
      events.push({ type: "hit", kind: "pulse", x: hitX, y: hitY });
      return;
    }
    // Enemy-Ally Mirror Counter: countering Boss's active form deals +20% bonus!
    // First-Person Overload Weakpoint Lock: aligned head-on deals +25% bonus!
    let dmg = formId !== s.boss.activeForm ? Math.round(amount * 1.2) : amount;
    if (s.core.overloadActive && Math.abs(s.boss.x - s.ship.x) < 135) {
      dmg = Math.round(dmg * 1.25);
    }
    // Phase 2 Threshold Lock: at 50% HP, lock health & trigger 2.6s Invulnerable Rage Awakening!
    const thresholdHp = Math.ceil(s.boss.maxHp * 0.5);
    if (s.boss.phase === 1 && s.boss.hp - dmg <= thresholdHp) {
      dmg = Math.max(1, s.boss.hp - thresholdHp);
      part.hp = Math.max(1, part.hp - dmg);
      s.boss.hp = s.boss.parts.reduce((sum, p) => sum + p.hp, 0);
      s.boss.dpsDealt = (s.boss.dpsDealt || 0) + dmg;
      s.stats.damageDealt += dmg;
      s.boss.phase = 2;
      s.boss.invulnMs = 2600;
      events.push({
        type: "reaction",
        x: s.boss.x,
        y: 295,
        label: "⚠ 锁血护盾开启 · 二阶段狂暴觉醒!",
        color: 0xff4b5c,
      });
      return;
    }

    part.hp = Math.max(0, part.hp - dmg);
    s.boss.hp = s.boss.parts.reduce((sum, p) => sum + p.hp, 0);
    s.boss.dpsDealt = (s.boss.dpsDealt || 0) + dmg;
    s.stats.damageDealt += dmg;
    events.push({ type: "hit", kind: formId, x: hitX, y: hitY });

    if (part.hp <= 0) {
      part.dead = true;
      events.push({ type: "kill", enemy: { x: part.x, y: part.y }, kind: formId, hitstopMs: 32 });
    }
    if (s.boss.hp <= 0) {
      if (s.mode === "endless") {
        s.boss = null;
        s.bossWarnings = [];
        if (s.economy) s.economy.scrap += 120;
        s.installedModules.push(`boss-core-${s.endless.wave}`);
        s.build.damageMultiplier = Number((s.build.damageMultiplier + 0.18).toFixed(2));
        events.push({ type: "pod-install", x: 360, y: 340, label: "BOSS 击破！战机进化 +120星屑", color: 0xffd166 });
      } else {
        s.result = "victory";
        s.setPhase(GAME_PHASES.ENDED);
        events.push({ type: "run-ended", result: "victory" });
      }
    }
  }

  #stepEnemyBullets(dtSec, events) {
    const s = this.session;
    const bullets = s.enemyBullets || [];
    for (const b of bullets) {
      if (!b.alive) continue;
      if (b.kind === "boss-missile" && s.ship.visible) {
        const steer = Math.sign(s.ship.x - b.x) * 145 * dtSec;
        b.vx = Math.max(-180, Math.min(180, b.vx + steer));
      }
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      if (b.y > 1280 || b.x < 0 || b.x > 720) {
        b.alive = false;
        continue;
      }
      const hitRadius = s.core.overloadActive ? 40 : 28;
      const dist = s.ship.visible || s.core.overloadActive ? Math.hypot(b.x - s.ship.x, b.y - s.ship.y) : 999;
      if (dist <= hitRadius) {
        b.alive = false;
        if (s.core.overloadActive && b.kind !== "boss-missile") {
          // Overload Phase-Shield deflects standard/vulcan fire cleanly into scrap & graze!
          if (s.economy) s.economy.scrap += 3;
          events.push({ type: "graze", x: b.x, y: b.y });
          continue;
        }
        const rawDmg = Number(b.dmg || 6);
        const scaledDmg = s.core.overloadActive ? Math.max(2, Math.round(rawDmg * 0.4)) : rawDmg;
        const dmg = this.#applyChassisDamageMitigation(scaledDmg, events);
        s.core.hp = Math.max(0, s.core.hp - dmg);
        s.stats.coreHits += 1;
        events.push({ type: "core-hit", x: s.ship.x, y: s.ship.y });
        if (s.core.hp <= 0) {
          s.result = "defeat";
          s.setPhase(GAME_PHASES.ENDED);
          events.push({ type: "run-ended", result: "defeat" });
        }
      } else if (!b._grazed && dist <= 62) {
        b._grazed = true;
        s.core.energy = Math.min(s.core.maxEnergy, s.core.energy + 5);
        if (s.economy) s.economy.scrap += 2;
        events.push({ type: "graze", x: b.x, y: b.y });
      }
    }
    s.enemyBullets = bullets.filter((b) => b.alive);
  }

  #stepEnemiesPhysics(dtSec, events) {
    const s = this.session;
    const coreY = CORE_LAYOUT.centerY;
    const hasRelay = s.enemies.some((e) => e.type === "relay" && e.hp > 0);

    for (const e of s.enemies) {
      e.ageMs = (e.ageMs || 0) + dtSec * 1000;
      const relayBoost = hasRelay && e.type !== "relay" ? 1.18 : 1.0;

      // Scout S-curve weave; Frigate periodic bullet fire
      if (e.type === "scout") {
        e.vx += Math.sin(e.ageMs * 0.005 + e.id) * 140 * dtSec;
      } else if (e.type === "frigate") {
        e.fireCooldownMs = (e.fireCooldownMs ?? 1800) - dtSec * 1000;
        if (e.fireCooldownMs <= 0 && e.y > 300 && e.y < 820) {
          e.fireCooldownMs = 2400;
          const dx = s.ship.x - e.x;
          const dy = s.ship.y - e.y;
          const len = Math.hypot(dx, dy) || 1;
          s.enemyBullets = s.enemyBullets || [];
          s.enemyBullets.push({
            id: s.allocateId(),
            x: e.x,
            y: e.y + 18,
            vx: (dx / len) * 240,
            vy: (dy / len) * 240,
            alive: true,
          });
        }
      }

      e.vy += (e.baseSpeed * relayBoost - e.vy) * Math.min(1, dtSec * 4.5);
      e.vx *= Math.pow(0.45, dtSec);
      e.x = Math.max(48, Math.min(672, e.x + e.vx * dtSec));
      e.y = Math.max(255, e.y + e.vy * dtSec);

      if (e.hitFlashMs > 0) e.hitFlashMs = Math.max(0, e.hitFlashMs - dtSec * 1000);
      if (e.statusTimerMs > 0) {
        e.statusTimerMs -= dtSec * 1000;
        if (e.statusTimerMs <= 0) e.status = null;
      }
    }

    for (let i = 0; i < s.enemies.length; i += 1) {
      const a = s.enemies[i];
      if (a.hp <= 0) continue;
      for (let j = i + 1; j < s.enemies.length; j += 1) {
        const b = s.enemies[j];
        if (b.hp <= 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.radius + b.radius;
        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x = Math.max(48, Math.min(672, a.x - nx * overlap));
          a.y = Math.max(255, a.y - ny * overlap);
          b.x = Math.max(48, Math.min(672, b.x + nx * overlap));
          b.y = Math.max(255, b.y + ny * overlap);

          const relSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
          if (relSpeed > 150) {
            a.hp -= 24;
            b.hp -= 24;
            a.hitFlashMs = 70;
            b.hitFlashMs = 70;
            events.push({ type: "hit", kind: "heavy", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
            if (a.hp <= 0) this.#onEnemyKilled(a, "heavy", events);
            if (b.hp <= 0) this.#onEnemyKilled(b, "heavy", events);
          }
        }
      }
    }

    const breachDmg = 12 + Math.floor((s.elapsedMs || 0) / 45000) * 3;
    for (const e of s.enemies) {
      if (e.hp > 0 && e.y >= coreY - CORE_LAYOUT.contactRadius) {
        e.hp = 0;
        const dmg = this.#applyChassisDamageMitigation(breachDmg, events);
        s.core.hp = Math.max(0, s.core.hp - dmg);
        s.stats.coreHits += 1;
        events.push({ type: "core-hit", x: e.x, y: coreY });
        if (s.core.hp <= 0) {
          s.result = "defeat";
          s.setPhase(GAME_PHASES.ENDED);
          events.push({ type: "run-ended", result: "defeat" });
          break;
        }
      }
    }

    s.enemies = s.enemies.filter((e) => e.hp > 0);
  }

  #applyChassisDamageMitigation(rawDmg, events) {
    const s = this.session;
    if (s.chassis !== "aegis") return rawDmg;
    const reduced = Math.max(1, Math.round(rawDmg * 0.7));
    // Aegis Shock-Pulse: clears enemy bullets within 200px & knocks back nearby enemies!
    for (const b of s.enemyBullets || []) {
      if (b.alive && Math.hypot(b.x - s.ship.x, b.y - s.ship.y) <= 200) {
        b.alive = false;
      }
    }
    for (const e of s.enemies || []) {
      if (e.hp > 0 && Math.hypot(e.x - s.ship.x, e.y - s.ship.y) <= 190) {
        e.hp -= 28;
        e.vy = Math.min(e.vy, -120);
        e.hitFlashMs = 80;
        if (e.hp <= 0) this.#onEnemyKilled(e, "magnet", events);
      }
    }
    events.push({ type: "mega-blast", x: s.ship.x, y: s.ship.y, color: 0xb07cff });
    events.push({ type: "reaction", x: s.ship.x, y: s.ship.y - 44, label: "🛡 盾卫减伤30% · 反震清弹!", color: 0xb07cff });
    return reduced;
  }
}
