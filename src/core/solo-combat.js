import { checkAchievements } from "../state/achievements.js";
import { FIELD, GRAZE_RADIUS, HIT_RADIUS, PICKUP_RADIUS } from "../state/solo-session.js";
import { CAMPAIGN, createBossParts, DISPLAY_TARGETS, ENEMY_PROFILES, StageDirector } from "./stage-director.js";
import { SoloWeapons } from "./solo-weapons.js";
import { CONTRACT, MODULE } from "./upgrade-cards.js";

const CRIMSON = 0xff3355;
const GOLD = 0xffd13b;
const WHITE = 0xffffff;
const BOSS_PATTERNS = {
  boss_marshal: [["aimed", "spiral"], ["laser", "spiral", "aimed"], ["blades", "aimed", "spiral"]],
  boss_citadel: [["missiles", "fans"], ["missiles", "fans"], ["corridor"]],
  boss_overmind: [["spiral"], ["gravity", "bombers", "aimed"], ["laser", "laser", "spiral"]],
};
const SECTOR_ENEMY_HP = [1, 1.85, 3.10];
const PHASE_GATES = [0.65, 0.30];
const CORE_EXPOSURE = { boss_marshal: 1.37, boss_citadel: 2.25, boss_overmind: 2.55 };
const FAN = [-0.44, -0.22, 0, 0.22, 0.44];

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function touches(a, b, radius) {
  return distanceSquared(a, b) <= radius * radius;
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

export class SoloCombat {
  constructor(session, manifest, random = Math.random) {
    this.session = session;
    this.catalog = new Map([...manifest.enemies, ...manifest.bosses].map((entry) => [entry.id, entry]));
    this.random = random;
    this.enemies = [];
    this.shots = [];
    this.enemyShots = [];
    this.pickups = [];
    this.events = [];
    this.boss = null;
    this.director = new StageDirector(random);
    this.weapons = new SoloWeapons(this);
    this.nextGuardMs = 0;
    this.transitionPending = false;
  }

  get bossShielded() {
    return Boolean(this.boss && (this.boss.age < 3.25 || this.boss.shieldUntil > this.session.elapsedMs));
  }

  bossTargets(includeDestroyed = false) {
    if (!this.boss) return [];
    return this.boss.parts.filter((part) => includeDestroyed || part.hp > 0)
      .map((part) => ({ x: this.boss.x + part.dx, y: this.boss.y + part.dy, part }));
  }

  advance(dtMs, steer) {
    // Substeps bound collision travel and drop background-tab catch-up.
    const s = this.session;
    if (s.evolution) {
      this.#cancelToGold();
      this.events.push({ type: "evolution", label: s.evolution, color: s.fighter.color, x: s.ship.x, y: s.ship.y });
      s.evolution = null;
      this.#pollAchievements();
    }
    if (this.transitionPending) this.#beginStageTransition();
    let remaining = Math.min(dtMs, 50);
    while (remaining > 0.001 && this.session.phase === "playing") {
      const step = Math.min(remaining, 1000 / 60);
      this.#step(step, steer);
      if (this.transitionPending) this.#beginStageTransition();
      remaining -= step;
    }
  }

  #step(ms, steer) {
    const s = this.session;
    const dt = ms / 1000;
    const previousTime = s.elapsedMs;
    s.elapsedMs += ms;
    if (s.feverUntil > previousTime) {
      s.comboUntil += Math.min(ms, s.feverUntil - previousTime);
      if (s.elapsedMs >= s.feverUntil) this.events.push({ type: "fever", active: false });
    }
    s.invulnerableMs = Math.max(0, s.invulnerableMs - ms);
    s.overloadMs = Math.max(0, s.overloadMs - ms);
    s.warpDashMs = Math.max(0, s.warpDashMs - ms);
    if (s.comboUntil < s.elapsedMs) s.combo = 0;
    if (s.fighter.weapon === "guard" && !s.guard && s.elapsedMs >= this.nextGuardMs) {
      s.guard = true;
      this.events.push({ type: "guard", x: s.ship.x, y: s.ship.y, color: 0xd3edff });
    }
    steer?.(ms);
    s.move(ms);
    if (s.emergencyPending && s.invulnerableMs === 0) this.#emergencyPulse();
    if (s.transitionUntil) {
      this.#movePickups(dt);
      if (s.elapsedMs + 0.001 >= s.transitionUntil) {
        s.transitionUntil = 0;
        s.warpDashMs = 0;
        s.stageStartedAt = s.elapsedMs;
        s.offerUpgrade();
        this.events.push({ type: "level" });
      }
      return;
    }
    s.charge(dt * 1.15);
    if (!this.boss) {
      const activeNonBoss = this.enemies.filter(({ hp, summoned }) => hp > 0 && !summoned).length;
      const fieldClear = activeNonBoss === 0;
      this.boss = this.director.update(s, (...args) => this.#spawn(...args), this.events, fieldClear, this.enemies.length);
      if (this.boss) {
        this.enemies = [this.boss];
        this.#clearEnemyShots();
      }
    }
    this.#moveEnemies(dt);
    if (s.phase !== "playing" || this.transitionPending) return;
    this.weapons.update(dt);
    if (s.phase !== "playing" || this.transitionPending) return;
    this.#movePlayerShots(dt);
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    if (s.phase !== "playing" || this.transitionPending) return;
    if (s.settleUpgrades()) {
      this.events.push({ type: "level" });
      return;
    }
    this.#moveEnemyShots(dt);
    if (s.phase === "playing") this.#movePickups(dt);
  }

  #beginStageTransition() {
    this.transitionPending = false;
    this.session.beginStageTransition();
    this.boss = null;
    this.enemies.length = 0;
    this.shots.length = 0;
    this.pickups = this.pickups.filter(({ deliver }) => deliver);
    this.#clearEnemyShots();
    this.weapons.clearStageEffects();
    this.events.push({ type: "warp", stage: this.session.stage });
    if (this.session.mutator) this.events.push({ type: "mutator", ...this.session.mutator });
    this.#pollAchievements();
  }

  #spawn(id, x, y, { side = 0, formation, flagship = false, summoned = false, bounty = false, opening = false, ace = null } = {}) {
    const entry = this.catalog.get(id);
    const { category } = entry;
    const profile = ENEMY_PROFILES[id];
    const span = category === "boss" ? entry.width : entry.height;
    const s = this.session;
    const boss = category === "boss";
    const loop = s.loop - 1;
    const extraLv = Math.max(0, s.level - ((s.stage - 1) * 3 + 3));
    const waveScale = 1 + (Math.max(1, s.wave) - 1) * 0.10;
    const catchUpHp = 1 + Math.min(0.60, extraLv * 0.12);
    const stageScale = boss ? 1 + loop * 0.45 :
      SECTOR_ENEMY_HP[s.sector - 1] * (1 + loop * 0.55) * waveScale * catchUpHp;
    const hpScale = stageScale * (s.hardcore ? 1.30 : 1);
    const hp = Math.round(profile.hp * hpScale * (flagship ? 2.4 : summoned ? 0.75 : 1));
    const nextFire = boss ? 3.62 : s.enemyCadence * (category === "normal"
      ? 0.65 + this.random() * 0.55 : 0.45 + this.random() * 0.40);
    const enemy = {
      ...profile, id, category, x, y, age: 0, turn: 0, hp, maxHp: hp,
      scale: DISPLAY_TARGETS[category] / span * (flagship ? 1.22 : summoned ? 0.82 : 1),
      direction: formation === "cross" ? -side : side, formation, flagship, summoned, opening, ace,
      nextFire, flashUntil: 0, drift: 0,
      bulletCatchUp: boss ? 1 : 1 + Math.min(0.20, extraLv * 0.04),
    };
    if (ace === "sniper") enemy.interval *= 0.78;
    if (ace) this.events.push({ type: "ace-spawn", ace, x, y });
    if (bounty) enemy.bountyUntil = s.elapsedMs + 8000;
    if (flagship) {
      enemy.interval *= 0.65;
      enemy.speed *= 0.9;
      enemy.radius *= 1.15;
    }
    if (summoned) enemy.speed *= 1.25;
    if (category === "boss") {
      s.bossDamaged = false;
      enemy.parts = createBossParts(entry, enemy.scale, enemy.hp, hpScale);
      enemy.hitWidth = Math.max(...enemy.parts.map((part) => Math.abs(part.dx) + part.radius));
      enemy.hitHeight = Math.max(...enemy.parts.map((part) => Math.abs(part.dy) + part.radius));
      enemy.phase = 1;
      enemy.patternIndex = 0;
      enemy.spiralAngle = 0;
      enemy.beamLane = -1;
      enemy.corridorSide = -1;
      enemy.rings = null;
      enemy.laser = null;
      enemy.sway = 0;
      enemy.engagedAt = 0;
      enemy.shieldUntil = 0;
      enemy.shieldHp = 0;
      enemy.staggerUntil = 0;
    }
    this.enemies.push(enemy);
    return enemy;
  }

  #moveEnemies(dt) {
    const { session: s } = this;
    if (this.boss?.hp > 0) {
      this.boss.age += dt;
      this.#moveBoss(this.boss, dt);
    }
    if (s.phase !== "playing") return;
    const escaped = [];
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.hp <= 0 || (enemy.bountyUntil && enemy.bountyUntil <= s.elapsedMs)) return false;
      if (enemy === this.boss || s.phase !== "playing") return true;
      enemy.age += dt;
      const now = s.elapsedMs;
      const frozen = enemy.frozenUntil > now;
      const slowdown = frozen ? 0 : enemy.icedUntil > now ? 0.64 : 1;
      const step = dt * slowdown;
      const previousX = enemy.x;
      enemy.drift += step;
      enemy.y += enemy.speed * step;
      if (enemy.formation === "cross" && enemy.drift < 3.4) enemy.x += enemy.direction * 60 * step;
      if (enemy.formation === "arc" && enemy.drift < 4.1) {
        enemy.x -= enemy.direction * Math.sin(enemy.drift * 1.45) * 113 * step;
        enemy.y += 38 * Math.min(enemy.drift, 2.3) * step;
      }
      if (enemy.formation === "flank" && enemy.drift < 3.7) {
        const turnIn = Math.max(0, 1 - Math.abs(enemy.drift - 1.9) / 1.8);
        enemy.x -= enemy.direction * 143 * turnIn * step;
      }
      if (enemy.flight === "weave") enemy.x += Math.cos(enemy.drift * 2.3) * (enemy.id === "normal_scout" ? 116 : 66) * step;
      if (enemy.flight === "cross") enemy.x += (enemy.direction || 1) * Math.cos(enemy.drift * 1.2) * 63 * step;
      if (enemy.flight === "dive" || enemy.flight === "rush") {
        enemy.y += step * Math.min(65, enemy.drift * 19);
        if (enemy.flight === "rush") enemy.x += Math.sign(s.ship.x - enemy.x) * 40 * step;
      }
      if (enemy.flight === "bomber" && !frozen) this.#bomber(enemy, step);
      enemy.x = Math.max(26, Math.min(694, enemy.x));
      enemy.turn = (enemy.x - previousX) / Math.max(dt, 0.001) * 0.00125;

      if (enemy.hp > 0 && !enemy.summoned && enemy.y >= FIELD.height + 24) {
        escaped.push(enemy);
        return false;
      }
      if (!frozen && enemy.attack && enemy.y >= 85 && enemy.y < 930 && enemy.age >= enemy.nextFire) {
        this.#fireEnemy(enemy);
      }
      if (enemy.hp > 0 && touches(enemy, s.ship, enemy.radius + HIT_RADIUS)) this.#damageShip(enemy.damage);
      return enemy.hp > 0 && enemy.y < FIELD.height + 105;
    });
    for (const enemy of escaped) {
      if (s.phase !== "playing") break;
      this.#handleBreach(enemy);
    }
  }

  #handleBreach(enemy) {
    const s = this.session;
    const cost = enemy.category === "normal" ? 1 : 2;
    const combo = s.combo;
    s.breaches++;
    if (s.invulnerableMs > 0) {
      s.hp = Math.max(1, s.hp - cost * 4);
      this.events.push({ type: "hurt", x: s.ship.x, y: s.ship.y, color: CRIMSON });
    } else {
      this.#damageShip(cost * 6);
    }
    s.combo = Math.floor(combo * 0.5);
    s.breachMeter += cost;
    const { x, id: enemyId } = enemy;
    const { breachMeter: meter, breachMax: max } = s;
    this.events.push({ type: "breach", x, cost, meter, max, enemyId });
    this.events.push({ type: "mechanism", x, y: FIELD.height - 82, label: `防线警戒 ${Math.min(meter, max)}/${max}`, color: CRIMSON });
    if (meter < max) return;

    s.breachMeter = 0;
    s.hp = Math.max(0, s.hp - 18);
    if (s.hp === 0) s.phase = "defeat";
    for (const lane of [180, 360, 540]) this.#spawn("elite_fighter", lane, -40, { summoned: true });
    this.events.push({ type: "breach-alarm", x: 360, y: 120 });
    this.events.push({ type: "mechanism", x: 360, y: 120, label: "防线失守 · 追猎反扑", color: CRIMSON });
  }

  #bomber(enemy, dt) {
    const { ship, elapsedMs } = this.session;
    if (enemy.fuseUntil) {
      if (elapsedMs >= enemy.fuseUntil) {
        this.events.push({ type: "blast", x: enemy.x, y: enemy.y, radius: 85, color: CRIMSON, accent: GOLD, hostile: true });
        if (touches(enemy, ship, 85 + HIT_RADIUS)) this.#damageShip(enemy.summoned ? 24 : 22);
        enemy.hp = 0;
      }
      return;
    }
    if ((enemy.summoned || enemy.y > 300) && ship.y > enemy.y - 50) {
      enemy.x += Math.sign(ship.x - enemy.x) * (enemy.summoned ? 165 : 108) * dt;
    }
    if (touches(enemy, ship, 178)) {
      enemy.fuseUntil = elapsedMs + 810;
      enemy.speed = 72;
      this.events.push({ type: "bomber-warning", x: enemy.x, y: enemy.y, radius: 85, color: CRIMSON, accent: GOLD });
    }
  }

  #bullet(x, y, direction, speed, enemy, options = {}) {
    if (this.enemyShots.length >= 520) return;
    const s = this.session;
    const speedScale = (s.hardcore ? 1.18 : 1) * Math.min(1.85, 1 + (s.loop - 1) * 0.10)
      * (s.mutator?.id === "electromagnetic" ? 1.12 : 1) * (enemy.bulletCatchUp ?? 1);
    const damage = ((options.damage ?? enemy.damage) + (enemy.flagship ? 4 : 0)) * (s.hardcore ? 1.25 : 1);
    const velocity = speed * speedScale;
    this.enemyShots.push({
      x, y, vx: Math.sin(direction) * velocity, vy: Math.cos(direction) * velocity, speedScale,
      radius: options.missile ? 11 : enemy.category === "boss" ? 8 : 6,
      ...options, damage,
      color: options.pulse ? options.color : CRIMSON, coreColor: WHITE,
    });
  }

  #fireEnemy(enemy) {
    const { ship, elapsedMs } = this.session;
    const { x, category, attack } = enemy;
    const y = enemy.y + enemy.radius * 0.65;
    const aim = Math.atan2(ship.x - x, Math.max(225, ship.y - y));
    const speed = category === "normal" ? 315 : 350;
    enemy.nextFire = enemy.age + enemy.interval * this.session.enemyCadence / 1000;

    if (attack === "missile" || attack === "launcher") {
      const spreads = attack === "launcher" ? [-0.38, 0.38] : [0];
      for (const offset of spreads) this.#bullet(x + offset * 59, y, aim + offset, 232, enemy,
        { missile: true, hp: 18, fuel: 2.1, accent: GOLD });
    } else if (attack === "jam") {
      enemy.jamUntil = elapsedMs + 1250;
      this.events.push({ type: "jam", x, y, color: CRIMSON, radius: 210 });
      for (let i = 0; i < 11; i++) this.#bullet(x, y, 2 * Math.PI * i / 11, 215, enemy);
    } else if (attack === "twin" || attack === "broadside") {
      for (const side of [-1, 1]) this.#bullet(x + side * 18, y, attack === "twin" ? side * 0.025 : aim + side * 0.3, speed, enemy);
    } else if (attack === "burst") {
      for (let i = 0; i < 4; i++) this.#bullet(x, y, aim, speed * (0.66 + i * 0.2), enemy);
    } else if (attack === "fan" || attack === "fortress") {
      for (const offset of [-0.52, -0.27, 0, 0.27, 0.52]) this.#bullet(x, y, aim + offset, speed, enemy);
    } else {
      this.#bullet(x, y, attack === "slant" ? -(enemy.direction || 1) * 0.47 : aim, speed, enemy);
    }
    if (this.session.hardcore && category === "elite") {
      for (const offset of FAN) this.#bullet(x, y, aim + offset, 326, enemy);
    }
    if (enemy.ace === "sniper") {
      for (const offset of [-0.08, 0.08]) this.#bullet(x, y, aim + offset, speed * 1.35, enemy);
    }
  }

  #moveBoss(boss, dt) {
    const s = this.session;
    const now = s.elapsedMs;
    boss.y = Math.min(308, boss.y + boss.speed * dt);
    if (boss.age < 3.25) return;
    boss.engagedAt ||= now;
    if (now >= boss.shieldUntil) boss.shieldHp = 0;
    if (boss.staggerUntil > now) return;
    if (!boss.laser) {
      const speed = (boss.phase === 1 ? 0.75 : 0.95) * (boss.parts[0].hp <= 0 ? 0.86 : 1)
        * (boss.parts[1].hp <= 0 ? 0.86 : 1);
      const amplitude = boss.id === "boss_citadel" ? 102 : boss.id === "boss_overmind" ? 154 : 142;
      boss.sway += dt * speed * (boss.frozenUntil > now ? 0.56 : 1);
      boss.x = 360 + Math.sin(boss.sway) * amplitude;
    }
    if (boss.gravityUntil > now) {
      const remaining = boss.gravityUntil - now;
      const direction = remaining > 480 ? 1 : -1;
      const pull = (FIELD.width / 2 - s.ship.x) * direction * dt * 0.8;
      s.ship.x = Math.max(FIELD.side, Math.min(FIELD.width - FIELD.side, s.ship.x + pull));
    }
    if (boss.laser) {
      this.#updateBossLaser(boss);
      return;
    }
    if (boss.rings && now >= boss.rings.next) this.#launchBossRing(boss);
    if (boss.age < boss.nextFire || (this.bossShielded && !boss.shieldHp)) return;
    const patterns = BOSS_PATTERNS[boss.id][boss.phase - 1];
    const pattern = patterns[boss.patternIndex++ % patterns.length];
    const cooldown = { aimed: 1.0, spiral: 1.22, laser: 1.55, blades: 1.1, missiles: 1.05,
      fans: 0.95, corridor: 0.86, gravity: 1.15, bombers: 1.05 }[pattern];
    const enraged = boss.id === "boss_marshal" && boss.phase === 3 ? 0.8 : 1;
    boss.nextFire = boss.age + cooldown * enraged * s.enemyCadence;
    switch (pattern) {
      case "spiral":
        boss.rings = { index: 0, total: boss.id === "boss_overmind" ? (boss.phase === 3 ? 8 : 4) : 3, next: now };
        this.#launchBossRing(boss);
        break;
      case "laser": this.#beginBossLaser(boss); break;
      case "blades": this.#bossBlades(boss); break;
      case "missiles": this.#citadelVolley(boss, true); break;
      case "fans": this.#citadelVolley(boss, false); break;
      case "corridor": this.#citadelCorridor(boss); break;
      case "bombers": this.#overmindBombers(); break;
      case "gravity":
        boss.gravityUntil = now + 960;
        this.events.push({ type: "boss-gravity", x: FIELD.width / 2, y: boss.y, duration: 960 });
        this.#bossAimed(boss);
        break;
      case "aimed": this.#bossAimed(boss); break;
    }
    if (s.hardcore) this.#bossAimed(boss, true);
  }

  #bossAimed(boss, extra = false) {
    const { ship } = this.session;
    const { x, y } = this.bossTargets().find(({ part }) => part.id === "core");
    const aim = Math.atan2(ship.x - x, Math.max(160, ship.y - y));
    this.events.push({ type: "barrage", mode: extra ? "hardcore" : "aimed", part: "core", x, y, color: CRIMSON, count: FAN.length });
    for (const offset of FAN) this.#bullet(x, y, aim + offset, extra ? 360 : 316, boss, { part: "core" });
  }

  #citadelVolley(boss, missiles) {
    const { ship } = this.session;
    const nodes = this.bossTargets();
    const wings = nodes.filter(({ part }) => part.id !== "core");
    const emitters = missiles || wings.length > 0 ? wings : nodes;
    for (const { x, y, part } of emitters) {
      const side = part.id === "core" ? 0 : Math.sign(part.dx);
      const aim = Math.atan2((ship.x + boss.x) / 2 - x - side * 120, Math.max(240, ship.y - y));
      const offsets = missiles ? [-0.21, 0.21] : side ? [-0.28, 0, 0.28] : FAN;
      this.events.push({ type: "barrage", mode: missiles ? "missiles" : "fans", part: part.id,
        x, y, color: missiles ? GOLD : CRIMSON, count: offsets.length });
      for (const offset of offsets) {
        const options = missiles ? { missile: true, hp: 25, fuel: 1.65, accent: GOLD } : {};
        this.#bullet(x, y, aim + offset, missiles ? 235 : 304, boss, { ...options, part: part.id });
      }
    }
  }

  #citadelCorridor(boss) {
    const middle = FIELD.width / 2;
    const nodes = this.bossTargets();
    const side = boss.corridorSide;
    const node = nodes.find(({ part }) => part.id === (side < 0 ? "left" : "right"));
    boss.corridorSide *= -1;
    // A destroyed shoulder leaves this half of the alternating pattern silent.
    if (!node) {
      if (nodes.length === 1) this.#bossAimed(boss);
      return;
    }
    const { x, y, part } = node;
    this.events.push({ type: "barrage", mode: "corridor", part: part.id, side, x, y, color: CRIMSON, count: 9 });
    for (let i = 0; i < 9; i++) {
      const goalX = middle + side * (52 + i * 39);
      const originX = x + side * (i - 4) * 19;
      const angle = Math.atan2(goalX - originX, 920 - y);
      this.#bullet(originX, y + i * 8, angle, 347 + i * 5, boss, { part: part.id });
    }
  }

  #overmindBombers() {
    for (const { x, y, part } of this.bossTargets()) {
      if (part.id === "core") continue;
      const count = 3;
      this.events.push({ type: "barrage", mode: "bombers", part: part.id, count, x, y, color: CRIMSON });
      for (let i = 0; i < count; i++) {
        this.#spawn("normal_bomber", x + (i - (count - 1) / 2) * 34, y - i * 42, { summoned: true });
      }
    }
  }

  #launchBossRing(boss) {
    const ring = boss.rings;
    const { x, y } = this.bossTargets().find(({ part }) => part.id === "core");
    const overmind = boss.id === "boss_overmind";
    const count = overmind ? (boss.phase === 3 ? 16 : 12) : 8;
    const reverse = overmind && ring.index % 2 === 1;
    const direction = reverse ? -1 : 1;
    const color = reverse ? GOLD : CRIMSON;
    this.events.push({ type: "boss-pulse", x, y, color, radius: 104, count });
    for (let i = 0; i < count; i++) {
      const angle = boss.spiralAngle * direction + i * Math.PI * 2 / count;
      this.#bullet(x, y, angle, reverse ? 288 : overmind ? 312 : 269, boss, {
        part: "core", radius: 10, color, pulse: true, turnRate: overmind ? direction * 0.39 : 0.15,
      });
    }
    boss.spiralAngle += 0.21;
    ring.index++;
    if (ring.index === ring.total) boss.rings = null;
    else ring.next += (overmind ? (ring.index % 2 ? 115 : 190) : 240) * this.session.enemyCadence;
  }

  #bossBlades(boss) {
    const offsets = [-0.26, -0.09, 0.09, 0.26];
    for (const { x, y, part } of this.bossTargets()) {
      if (part.id === "core") continue;
      const side = Math.sign(part.dx);
      const crossX = boss.x - side * 170 + (this.session.ship.x - boss.x) * 0.25;
      const aim = Math.atan2(crossX - x, Math.max(280, this.session.ship.y - y));
      this.events.push({ type: "barrage", mode: "blades", part: part.id, count: offsets.length, x, y, color: GOLD });
      for (const offset of offsets) this.#bullet(x, y, aim + offset, 376, boss, {
        part: part.id, damage: boss.damage + 3, accent: GOLD, blade: true, spin: side,
      });
    }
  }

  #beginBossLaser(boss) {
    const { elapsedMs: now, ship } = this.session;
    const core = boss.parts[2];
    const overmind = boss.id === "boss_overmind";
    const x = overmind ? FIELD.width * (boss.beamLane < 0 ? 0.28 : 0.72) : boss.x + core.dx;
    const y = boss.y + core.dy;
    const angle = overmind ? 0 : Math.atan2(ship.x - x, ship.y - y);
    const charge = overmind ? 580 : 900;
    const duration = overmind ? 440 : 480;
    const width = overmind ? 160 : 42;
    boss.laser = {
      x, y, ex: x + Math.sin(angle) * 1500, ey: y + Math.cos(angle) * 1500,
      angle, sweep: overmind ? 0 : (ship.x < FIELD.width / 2 ? -0.43 : 0.43),
      phase: "charge", chargeUntil: now + charge, activeUntil: now + charge + duration, duration,
      width, hit: false, color: CRIMSON,
    };
    if (overmind) boss.beamLane *= -1;
    this.events.push({ type: "boss-laser-charge", x, y, duration: charge, color: CRIMSON });
  }

  #updateBossLaser(boss) {
    const now = this.session.elapsedMs;
    const laser = boss.laser;
    if (now >= laser.activeUntil) {
      boss.laser = null;
      return;
    }
    if (laser.phase === "charge" && now >= laser.chargeUntil) {
      laser.phase = "fire";
      this.events.push({ type: "boss-laser-fire", x: laser.x, y: laser.y, duration: laser.duration, color: CRIMSON, accent: WHITE });
    }
    if (laser.phase !== "fire") return;
    if (laser.sweep) {
      const angle = laser.angle + laser.sweep * (now - laser.chargeUntil) / laser.duration;
      laser.ex = laser.x + Math.sin(angle) * 1500;
      laser.ey = laser.y + Math.cos(angle) * 1500;
    }
    if (!laser.hit && pointToSegmentDistance(this.session.ship, laser, { x: laser.ex, y: laser.ey }) <= laser.width / 2 + HIT_RADIUS) {
      laser.hit = this.#damageShip((boss.damage + 10) * (this.session.hardcore ? 1.25 : 1));
    }
  }

  #movePlayerShots(dt) {
    const active = this.shots;
    const missiles = this.enemyShots.filter((bullet) => bullet.missile);
    this.shots = [];
    for (const shot of active) {
      if (this.session.phase !== "playing" || this.transitionPending) break;
      this.weapons.steerShot(shot, dt);
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.y < -48 || shot.y > 1328 || shot.x < -58 || shot.x > 778) continue;
      const missile = missiles.find((bullet) => !bullet.gone && touches(shot, bullet, bullet.radius + 7));
      if (missile) {
        missile.hp -= shot.damage * this.session.weaponDamageScale;
        this.events.push({ type: "impact", x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy, color: shot.color, kind: shot.kind });
        if (missile.hp <= 0) {
          missile.gone = true;
          this.events.push({ type: "blast", x: missile.x, y: missile.y, radius: 27, color: CRIMSON, accent: GOLD, hostile: true });
        }
        continue;
      }

      let survives = true;
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || enemy === shot.exclude || enemy.y < 10) continue;
        let part;
        const width = shot.width ?? 5;
        if (enemy === this.boss) {
          // Broad-phase before checking the three separately registered hit areas.
          if (Math.abs(shot.x - enemy.x) > enemy.hitWidth + width || Math.abs(shot.y - enemy.y) > enemy.hitHeight + width) continue;
          const node = this.bossTargets().filter((node) => !shot.hit?.has(node.part) && touches(shot, node, node.part.radius + width))
            .sort((a, b) => distanceSquared(shot, a) - distanceSquared(shot, b))[0];
          if (!node) continue;
          part = node.part;
        } else if (shot.hit?.has(enemy) || !touches(shot, enemy, enemy.radius + width)) continue;

        if (enemy === this.boss && this.bossShielded) {
          this.#chipBossShield(enemy, this.weapons.damageFor(shot, enemy));
          this.events.push({ type: "impact", x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy,
            color: 0x33ddcc, kind: shot.kind });
          survives = false;
          break;
        }
        let damage = this.weapons.damageFor(shot, enemy);
        if (enemy.shielded && shot.kind !== "lance" && shot.kind !== "arc" && shot.y >= enemy.y - 8 &&
          Math.abs(shot.x - enemy.x) < enemy.radius * 0.78) damage *= 0.37;
        this.#hitEnemy(enemy, damage, part, shot);
        this.weapons.impact(shot, enemy, part);
        if (shot.pierce <= 0 || !shot.hit) {
          survives = false;
          break;
        }
        shot.pierce--;
        shot.hit.add(part ?? enemy);
      }
      if (survives) this.shots.push(shot);
    }
  }

  targetsNear(origin, radius, excludes) {
    return this.enemies.filter((enemy) => enemy !== excludes && enemy.hp > 0 && enemy.y >= 10 && touches(origin, enemy, radius));
  }

  strikeAreaTarget(enemy, damage, part) {
    if (enemy.hp <= 0 || this.session.phase !== "playing") return;
    if (enemy === this.boss && this.bossShielded) this.#chipBossShield(enemy, damage);
    else this.#hitEnemy(enemy, damage, part ?? (enemy === this.boss ? enemy.parts[2] : null), null);
  }

  #chipBossShield(boss, damage) {
    if (boss.shieldHp <= 0) return;
    const s = this.session;
    boss.shieldHp = Math.max(0, boss.shieldHp - damage * s.weaponDamageScale);
    if (boss.shieldHp > 0) return;
    boss.shieldUntil = 0;
    boss.staggerUntil = s.elapsedMs + 3000;
    this.#clearEnemyShots();
    this.events.push({ type: "boss-stagger", id: boss.id, x: boss.x, y: boss.y, durationMs: 3000 });
  }

  #hitEnemy(enemy, amount, part, shot) {
    const s = this.session;
    const target = part ?? enemy;
    if (s.phase !== "playing" || this.transitionPending || target.hp <= 0) return;
    const amp = enemy.shockedUntil > s.elapsedMs ? 1.22 : 1;
    const aegis = enemy !== this.boss && enemy.ace !== "aegis" &&
      this.enemies.some((ally) => ally.hp > 0 && ally.ace === "aegis" && touches(enemy, ally, 180)) ? 0.65 : 1;
    const critical = s.comboTier === 3 && this.random() < 0.18;
    let damage = amount * amp * aegis * s.weaponDamageScale * (critical ? 1.5 : 1);
    const bossCore = part?.id === "core";
    if (bossCore && enemy.parts.slice(0, 2).every(({ hp }) => hp <= 0)) damage *= CORE_EXPOSURE[enemy.id];
    if (bossCore && enemy.staggerUntil > s.elapsedMs) damage *= 1.6;
    const gate = bossCore && PHASE_GATES[enemy.phase - 1] * target.maxHp;
    const phaseChange = gate > 0 && target.hp - damage <= gate;
    const applied = Math.min(damage, target.hp - (phaseChange ? gate : 0));
    target.hp -= applied;
    enemy.flashUntil = s.elapsedMs + 70;
    if (shot) this.events.push({ type: "impact", x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy, color: shot.color, pierce: shot.pierce,
      kind: shot.kind, powered: shot.powered });
    if (critical) this.events.push({ type: "mechanism", label: "连击暴击", x: enemy.x, y: enemy.y, color: GOLD });
    s.charge(applied * 0.016);

    if (phaseChange) this.#changeBossPhase(enemy, part);
    if (part && !bossCore) {
      if (target.hp <= 0) this.#breakBossPart(enemy, part);
      return;
    }
    enemy.hp = target.hp;
    if (enemy.hp <= 0) this.#resolveKill(enemy);
  }

  #changeBossPhase(boss, core) {
    const now = this.session.elapsedMs;
    boss.phase++;
    const breakable = boss.id === "boss_citadel" && boss.phase === 2;
    const shieldMs = breakable ? 2700 : 1800;
    boss.shieldUntil = now + shieldMs;
    boss.shieldHp = breakable ? 260 : 0;
    boss.nextFire = boss.age + (breakable ? 0.46 : shieldMs / 1000 + 0.10);
    boss.patternIndex = 0;
    boss.spiralAngle += Math.PI / 4;
    boss.laser = null;
    boss.rings = null;
    boss.gravityUntil = 0;
    this.#clearEnemyShots();
    this.events.push({ type: "boss-phase", id: boss.id, phase: boss.phase,
      x: boss.x + core.dx, y: boss.y + core.dy, color: CRIMSON, accent: GOLD, radius: 860 });
  }

  #breakBossPart(boss, part) {
    const x = boss.x + part.dx;
    const y = boss.y + part.dy;
    this.events.push({ type: "part-break", id: part.id, label: part.label, x, y, heavy: true });
    this.session.parts += 8;
    this.#cancelToGold();
    this.pickups.push({ x, y, type: "gold", value: 0, speed: 760, deliver: true,
      shield: part.id === "left" ? 18 : 0, energy: part.id === "right" ? 25 : 0 });
  }

  #resolveKill(enemy) {
    const s = this.session;
    const heavy = enemy.category !== "normal";
    s.recordKill();
    s.parts += heavy ? 5 : 1;
    if (s.fighter.weapon === "bio" && s.heal(2) > 0) {
      s.rageUntil = s.elapsedMs + 5500 + 650 * (s.build.main - 1);
      if (s.build.synergy && s.shield < 12) s.addShield(2);
    }
    s.charge((heavy ? 7 : 3) * (s.frontline ? 1.8 : 1));
    this.events.push({ type: "destroy", x: enemy.x, y: enemy.y, heavy, id: enemy.id, scale: enemy.scale, turn: enemy.turn });
    if (enemy === this.boss) {
      if (!s.bossDamaged) s.flawlessBosses++;
      s.breachMeter = 0;
      this.events.push({ type: "sector-clear", id: enemy.id, stage: s.stage, durationMs: s.elapsedMs - s.stageStartedAt });
      this.transitionPending = s.mode === "endless" || s.stage < CAMPAIGN.length;
      enemy.laser = null;
      enemy.rings = null;
      this.#cancelToGold();
      this.#pollAchievements();
      if (!this.transitionPending) {
        s.phase = "victory";
        // The victory overlay pauses combat, so bank homing rewards before posting the run.
        this.pickups = this.pickups.filter((pickup) => {
          if (!pickup.deliver) return true;
          this.#collectPickup(pickup);
          return false;
        });
      }
      return;
    }

    const xpScale = (s.frontline ? 1.5 : 1) * (s.mutator?.id === "elite-swarm" ? 1.25 : 1);
    const { x, y } = enemy;
    const addCrystal = (dx, dy, value, type = "gold") => {
      const starter = enemy.opening && s.level === 1;
      this.pickups.push({ x: x + dx, y: y + dy, type, value: value * xpScale, speed: 0,
        readyAt: starter ? s.stageStartedAt + 7000 : 0, attract: starter });
    };
    if (enemy.bountyUntil || enemy.flagship) {
      for (const offset of [-52, -26, 0, 26, 52]) addCrystal(offset, Math.abs(offset) * 0.25, 4);
    } else addCrystal(0, 0, heavy ? 4 : enemy.opening ? 1.5 : 1, heavy ? "gold" : "green");
    if (touches(enemy, s.ship, 220)) addCrystal(0, 14, 2.5);
    if (enemy.flagship || heavy && !enemy.bountyUntil && this.random() < 0.2) {
      this.pickups.push({ x: x + 22, y: y + 14, type: "heal", value: enemy.flagship ? 34 : 20, speed: 0 });
    }
    if (enemy.flagship) {
      s.breachMeter = 0;
      for (const pickup of this.pickups) pickup.speed = Math.max(480, pickup.speed);
      s.charge(35, false);
      this.events.push({ type: "flagship-down" });
    }
    if (enemy.ace === "splitter") {
      for (const dx of [-42, 0, 42]) this.#spawn("normal_bomber", enemy.x + dx, enemy.y, { summoned: true });
    }
    if (enemy.bountyUntil) {
      s.heal(s.maxHp * 0.25);
      s.addShield(20);
      s.freeUpgrades++;
      this.events.push({ type: "bounty-clear" });
    }
    if (s.kills >= 300 || s.bestCombo >= 60) this.#pollAchievements();
  }

  #pollAchievements() {
    for (const ach of checkAchievements(this.session)) {
      this.events.push({ type: "achievement", ...ach });
    }
  }

  #cancelToGold() {
    let count = 0;
    for (const shot of this.enemyShots) {
      if (shot.gone) continue;
      this.pickups.push({ x: shot.x, y: shot.y, type: "gold", value: 0.35, energy: 1.2, speed: 780, deliver: true });
      if (++count === 60) break;
    }
    this.session.maxBulletCancel = Math.max(this.session.maxBulletCancel ?? 0, count);
    this.#clearEnemyShots();
    this.events.push({ type: "bullet-cancel", count });
    this.#pollAchievements();
  }

  #clearEnemyShots() {
    for (const shot of this.enemyShots) shot.gone = true;
    this.enemyShots.length = 0;
  }

  clearShotsNear(origin, radius) {
    this.enemyShots = this.enemyShots.filter((shot) => !shot.gone && !touches(origin, shot, radius + shot.radius));
  }

  #emergencyPulse() {
    const s = this.session;
    s.emergencyPending = false;
    const rank = s.build.secondary[MODULE.emergency];
    if (!rank) return;
    const radius = 120 + 14 * (rank - 1);
    s.addShield(12 + 4 * (rank - 1));
    this.clearShotsNear(s.ship, radius);
    this.events.push({ type: "reflect", x: s.ship.x, y: s.ship.y, color: 0x33ddcc, radius });
  }

  #moveEnemyShots(dt) {
    const s = this.session;
    const eater = s.build.secondary[CONTRACT.eater];
    const grazeRadius = GRAZE_RADIUS * (eater ? 1.45 : 1);
    let xp = 0;
    let pulses = 0;
    const kept = this.enemyShots.filter((shot) => {
      if (shot.gone || s.phase !== "playing") return false;
      shot.age = (shot.age ?? 0) + dt;
      if (shot.missile && shot.fuel > 0) {
        shot.fuel -= dt;
        const dir = Math.atan2(s.ship.x - shot.x, Math.max(23, s.ship.y - shot.y));
        const speed = 258 * (shot.speedScale ?? 1);
        shot.vx += (Math.sin(dir) * speed - shot.vx) * dt * 2.2;
        shot.vy += (Math.cos(dir) * speed - shot.vy) * dt * 2.2;
      }
      if (shot.turnRate) {
        const angle = shot.turnRate * dt;
        [shot.vx, shot.vy] = [
          shot.vx * Math.cos(angle) + shot.vy * Math.sin(angle),
          shot.vy * Math.cos(angle) - shot.vx * Math.sin(angle),
        ];
      }
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      const dist = distanceSquared(shot, s.ship);
      if (dist <= (shot.radius + HIT_RADIUS) ** 2) {
        this.#damageShip(shot.damage);
        return false;
      }
      if (!shot.grazed) {
        if (dist <= grazeRadius ** 2) {
          shot.near = true;
        } else if (shot.near) {
          shot.grazed = true;
          if (s.recordGraze()) this.events.push({ type: "fever", active: true, until: s.feverUntil });
          if (s.grazes >= 60) this.#pollAchievements();
          xp += s.frontline ? 0.18 : 0.12;
          if (eater && ++s.contractGrazes % 10 === 0) pulses++;
          this.weapons.counterGraze(shot);
          this.events.push({ type: "graze", x: s.ship.x, y: s.ship.y, toX: shot.x, toY: shot.y, color: 0x64f7ff });
        }
      }
      return shot.y < FIELD.height + 18 && shot.y > -42 && shot.x > -18 && shot.x < FIELD.width + 18;
    });
    this.enemyShots = kept.filter((shot) => !shot.gone);
    if (pulses) {
      s.addShield(pulses * 6);
      this.clearShotsNear(s.ship, 260);
      this.events.push({ type: "reflect", x: s.ship.x, y: s.ship.y, color: 0x33ddcc, radius: 260 });
    }
    if (xp > 0) {
      s.gainXp(xp);
      if (s.phase === "upgrade") this.events.push({ type: "level" });
    }
  }

  #damageShip(damage) {
    const s = this.session;
    const guard = s.guard;
    if (!s.takeDamage(damage)) return false;
    if (!guard) {
      this.events.push({ type: "hurt", x: s.ship.x, y: s.ship.y, color: CRIMSON });
      return true;
    }
    this.nextGuardMs = s.elapsedMs + Math.max(4500, 10000 - 850 * (s.build.main - 1));
    this.#clearEnemyShots();
    const radius = 235 + 26 * (s.build.main - 1);
    this.events.push({ type: "reflect", x: s.ship.x, y: s.ship.y, color: 0xe1efff, radius: 820 });
    this.events.push({ type: "mechanism", label: "反震清弹!", x: s.ship.x, y: s.ship.y, color: 0xe1efff });
    for (const enemy of this.targetsNear(s.ship, radius)) this.strikeAreaTarget(enemy, 47 + 16 * (s.build.main - 1));
    return true;
  }

  #movePickups(dt) {
    const s = this.session;
    const radius = PICKUP_RADIUS + 50 * (s.build.secondary[MODULE.magnet] ?? 0);
    this.pickups = this.pickups.filter((pickup) => {
      if (s.phase !== "playing") return true;
      const dx = s.ship.x - pickup.x;
      const dy = s.ship.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 14 && !(pickup.readyAt > s.elapsedMs)) {
        this.#collectPickup(pickup);
        if (s.phase === "upgrade") this.events.push({ type: "level" });
        return false;
      }
      if (pickup.attract || pickup.speed > 0 || dist <= radius) {
        pickup.speed = Math.min(1060, pickup.speed + 2200 * dt);
        const step = Math.min(1, pickup.speed * dt / (dist || 1));
        pickup.x += dx * step;
        pickup.y += dy * step;
      } else pickup.y += dt * 142;
      return pickup.y < FIELD.height + 24;
    });
  }

  #collectPickup(pickup) {
    const s = this.session;
    if (pickup.type === "heal") s.heal(pickup.value);
    else {
      s.addShield(pickup.shield ?? 0);
      if (pickup.energy) s.charge(pickup.energy, false);
      s.gainXp(pickup.value);
    }
    this.events.push({ type: "pickup", x: pickup.x, y: pickup.y, pickup: pickup.type });
  }

  triggerOverload() {
    const s = this.session;
    if (this.transitionPending || !s.startOverload()) return false;
    const { color, count, spread, damage, piercing } = s.overload;
    this.#cancelToGold();
    this.events.push({ type: "overload", x: s.ship.x, y: s.ship.y, color, kind: s.fighter.weapon });
    for (const enemy of this.enemies) {
      if (enemy.y < 0 || enemy.y > FIELD.height) continue;
      this.strikeAreaTarget(enemy, damage);
      if (s.fighter.weapon === "ice" && enemy !== this.boss && enemy.hp > 0) enemy.frozenUntil = s.elapsedMs + 1500;
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    if (this.transitionPending || s.phase === "victory") return true;
    for (let i = 0; i < count; i++) {
      const angle = (i - (count - 1) / 2) * spread;
      this.weapons.launch(s.ship.x, s.ship.y - 26, angle, 26, { kind: "overload", color, speed: 920, pierce: piercing ? 4 : 0 });
    }
    return true;
  }
}
