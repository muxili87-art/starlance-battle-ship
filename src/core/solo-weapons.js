import { MODULE, SECONDARIES } from "./upgrade-cards.js";

const FROST_SPIKES = [-0.85, 0, 0.85];
const BLADE_DAMAGE = 22;
const COMBO_RATES = [1, 1.08, 1.15, 1.22];

export class SoloWeapons {
  constructor(combat) {
    this.combat = combat;
    this.nextShot = 0;
    this.secondaryTimers = {};
    this.drones = [];
    this.fields = [];
    this.blades = [];
    this.streak = 0;
    this.streakUntil = 0;
    this.nextResonance = 0;
    this.nextGuardPulse = 0;
    this.volleys = 0;
  }

  update(dt) {
    const { session: s } = this.combat;
    const { fighter, elapsedMs: now, build } = s;
    if (now >= this.nextShot) {
      const streak = fighter.weapon === "pulse" && this.streakUntil > now ? this.streak : 0;
      const frenzy = s.combo >= 10 ? (build.secondary[MODULE.frenzy] ?? 0) : 0;
      const rate = (1 + Math.min(0.35, streak * 0.05) + (build.synergy ? 0.13 : 0)) * (frenzy ? 1.2 : 1)
        * COMBO_RATES[s.comboTier] * (s.feverUntil > now ? 1.25 : 1) * (s.bloodUntil > now ? 1.35 : 1);
      this.nextShot = now + fighter.interval / rate;
      this.#fireMain(frenzy);
    }
    this.#secondary();
    this.#drones(dt);
    this.#fields(dt);
  }

  clearStageEffects() {
    this.fields.length = 0;
    this.blades.length = 0;
    for (const drone of this.drones) drone.target = null;
  }

  counterGraze(shot) {
    const { session: s } = this.combat;
    const rank = s.build.secondary[MODULE.counter];
    if (!rank) return;
    const { x, y } = s.ship;
    this.launch(x, y - 10, shot.x < x ? -0.32 : 0.32, 18 + rank * 6, {
      kind: "missile", color: 0x33ddcc, speed: 920, homing: true, payload: "counter",
    });
  }

  #fireMain(frenzy) {
    const { session: s, events } = this.combat;
    const { fighter, build, ship, elapsedMs } = s;
    const rank = build.main;
    const powered = Boolean(build.synergy);
    const barrels = fighter.barrels.map(([x, angle]) => [x, angle, 1]);
    switch (fighter.weapon) {
      case "lance":
        if (rank >= 2) barrels.push([-26, -0.015, 0.28], [26, 0.015, 0.28]);
        break;
      case "pulse":
        if (rank >= 2) barrels.push([-26, -0.022, 0.35], [26, 0.022, 0.35]);
        break;
      case "arc":
      case "bio":
        if (rank >= 2) barrels.push([-22, -0.09, 0.33], [22, 0.09, 0.33]);
        break;
      case "rocket":
        if (rank >= 3) barrels.push([-25, -0.045, 0.39], [25, 0.045, 0.39]);
        break;
      case "void":
        if (rank >= 3) barrels.push([-24, -0.06, 0.37], [24, 0.06, 0.37]);
        break;
      case "ice":
        if (rank >= 2) barrels.push([-24, -0.14, 0.52], [24, 0.14, 0.52]);
        break;
      case "guard":
        if (rank >= 3) barrels.push([-38, -0.026, 0.45], [38, 0.026, 0.45]);
        break;
      case "needle":
        if (powered) barrels.push([-21, -0.045, 0.46], [21, 0.045, 0.46]);
        break;
    }
    const rage = s.rageUntil > elapsedMs ? 1.3 : 1;
    const guarded = s.guard ? 1.2 : 1;
    const boost = 1 + 0.12 * Math.min(2, rank - 1) + 0.065 * Math.max(0, rank - 3);
    this.volleys++;
    const critical = Boolean(frenzy && this.volleys % 4 === 0);
    const damage = fighter.damage * boost * rage * guarded * (powered ? 1.24 : 1)
      * (critical ? 1.42 + Math.min(0.3, frenzy * 0.08) : 1);
    const prism = build.secondary[MODULE.prism];
    if (prism && this.volleys % 4 === 0) {
      const angle = Math.PI / 15;
      const damageScale = Math.min(0.7, 0.32 + prism * 0.07);
      barrels.push([-12, -angle, damageScale], [12, angle, damageScale]);
    }
    const pierce = fighter.pierce ? fighter.pierce + Number(rank >= 2) + Number(powered)
      : Number(powered && fighter.weapon === "ice");
    for (const [offset, angle, power] of barrels) {
      const x = ship.x + offset;
      const y = ship.y - 29 + Math.abs(offset) * 0.27;
      this.launch(x, y, angle, damage * power, {
        kind: fighter.weapon, color: fighter.color, speed: fighter.speed, rank, powered,
        width: fighter.width ? fighter.width + (rank - 1) * 5 : 5,
        pierce: pierce + Number(Boolean(frenzy)), critical,
      });
      events.push({ type: "muzzle", x, y, color: fighter.color, kind: fighter.weapon,
        charged: fighter.weapon === "pulse" && this.streakUntil > elapsedMs && this.streak >= 7,
        heavy: fighter.audio === "heavy", cue: fighter.audio });
    }
  }

  launch(x, y, angle, damage, options) {
    const { speed = 975, pierce = 0 } = options;
    this.combat.shots.push({
      ...options, x, y, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed,
      damage, pierce, hit: pierce ? new Set() : null,
    });
  }

  #secondary() {
    const { session: s, events } = this.combat;
    const { ship, build, elapsedMs: now } = s;
    this.blades.length = 0;
    for (const { id } of SECONDARIES) {
      const rank = build.secondary[id];
      if (!rank) continue;
      const strength = 1 + (rank - 1) * 0.24 + (build.synergy?.secondary === id ? 0.4 : 0);
      if (id === "blade") this.#orbitBlades();
      if ((this.secondaryTimers[id] ?? 0) > now) continue;
      const target = this.#target(ship, 490);
      if (id === "relay" && target) {
        events.push({ type: "arc", points: [{ x: ship.x, y: ship.y }, target], color: 0x33ddcc });
        this.combat.strikeAreaTarget(target, 22 * strength);
        this.#arc(target, strength * 20, 151, 2, 0x33ddcc);
      } else if (id === "blade") {
        for (const blade of this.blades) {
          for (const enemy of this.combat.targetsNear(blade, blade.radius)) this.combat.strikeAreaTarget(enemy, BLADE_DAMAGE * strength);
        }
      } else if (id === "missile") {
        this.launch(ship.x - 20, ship.y, -0.22, 26 * strength, { kind: "missile", color: 0x33ddcc, speed: 700, homing: true });
        this.launch(ship.x + 20, ship.y, 0.22, 26 * strength, { kind: "missile", color: 0x33ddcc, speed: 700, homing: true });
      } else if (id === "bomb" || id === "gun") {
        const bomb = id === "bomb";
        for (const side of [-1, 1]) {
          this.launch(ship.x + side * 27, ship.y - 16, side * 0.046, (bomb ? 27 : 13) * strength,
            { kind: bomb ? "bomb" : "aux", color: bomb ? 0xffd13b : 0xffffff, speed: bomb ? 825 : 1130 });
        }
      }
      this.secondaryTimers[id] = now + ({ missile: 930, blade: 205, relay: 865, bomb: 840, gun: 420 })[id] * (s.comboTier >= 2 ? 0.85 : 1);
    }
  }

  #orbitBlades() {
    const { session: s, events } = this.combat;
    const { ship, elapsedMs: now } = s;
    const domain = s.fighter.weapon === "guard" && s.guard && s.build.synergy?.secondary === "blade";
    for (const offset of [0, Math.PI]) {
      const angle = now * 0.005 + offset;
      this.blades.push({
        x: ship.x + Math.cos(angle) * (domain ? 147 : 105),
        y: ship.y + Math.sin(angle) * (domain ? 111 : 77),
        angle, radius: domain ? 64 : 35,
      });
    }
    if (domain && now >= this.nextGuardPulse) {
      const radius = 182;
      this.nextGuardPulse = now + 920 * (s.comboTier >= 2 ? 0.85 : 1);
      this.combat.clearShotsNear(ship, radius);
      events.push({ type: "reflect", x: ship.x, y: ship.y, color: 0xe7f2ff, radius });
    }
  }

  #target(origin, radius, preferWeak = false) {
    let best = null;
    let score = Infinity;
    for (const enemy of this.combat.enemies) {
      if (enemy.hp <= 0 || enemy.y < 20 || enemy.y > origin.y + 25) continue;
      const d = Math.hypot(enemy.x - origin.x, enemy.y - origin.y);
      if (d > radius) continue;
      const weight = preferWeak ? d + enemy.hp / enemy.maxHp * 235 : d;
      if (weight < score) {
        best = enemy;
        score = weight;
      }
    }
    return best;
  }

  #drones(dt) {
    const { session: s, events } = this.combat;
    if (s.fighter.weapon !== "needle") return;
    const { ship, elapsedMs: now, build } = s;
    const count = Math.min(6, 2 + (build.main - 1) * 2);
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const rank = Math.floor(i / 2);
      const orbitX = ship.x + side * (48 + rank * 25 + Math.sin(now * 0.006 + i) * 10);
      const orbitY = ship.y + 18 - rank * 28 + Math.sin(now * 0.005 + i) * 11;
      const drone = this.drones[i] ??= { x: orbitX, y: orbitY, next: i * 83 + 235 };
      const target = this.#target(drone, 665, true);
      drone.target = target;
      const reach = target ? Math.min(172 + rank * 12, Math.max(0, ship.y - target.y - 35)) : 0;
      const advanceX = target ? Math.max(-95, Math.min(95, (target.x - ship.x) * 0.38)) : 0;
      const ease = Math.min(1, dt * 5);
      drone.x += (orbitX + advanceX - drone.x) * ease;
      drone.y += (orbitY - reach - drone.y) * ease;
      if (!target || now < drone.next) continue;
      const angle = Math.atan2(target.x - drone.x, drone.y - target.y);
      const power = (count === 2 ? 21.4 : count === 4 ? 14.4 : 12.1) * (1 + Math.max(0, build.main - 3) * 0.06);
      const diving = target.category !== "boss" && target.hp <= power * 1.7 && Math.hypot(target.x - drone.x, target.y - drone.y) < 300;
      const color = s.fighter.color;
      this.launch(drone.x, drone.y - 7, angle, power * (diving ? 1.55 : 1), {
        kind: diving ? "missile" : "drone", color, speed: diving ? 1180 : 1270, homing: true, powered: Boolean(build.synergy),
      });
      if (diving) {
        drone.x += (target.x - drone.x) * 0.33;
        drone.y += (target.y - drone.y) * 0.33;
      }
      drone.next = now + ((build.synergy ? 500 : 635) + i * 12) * (s.comboTier >= 2 ? 0.85 : 1);
      events.push({ type: "muzzle", x: drone.x, y: drone.y - 6, color, cue: "drone" });
    }
  }

  steerShot(shot, seconds) {
    if (!shot.homing) return;
    if (!shot.target || shot.target.hp <= 0) shot.target = this.#target(shot, 742, shot.kind === "drone");
    if (!shot.target) return;
    const { target, speed } = shot;
    const dy = shot.y - target.y;
    const angle = Math.atan2(target.x - shot.x, dy);
    const turn = Math.min(1, seconds * (shot.kind === "drone" ? 16 : 7));
    shot.vx += (Math.sin(angle) * speed - shot.vx) * turn;
    shot.vy += (-Math.cos(angle) * speed - shot.vy) * turn;
  }

  damageFor(shot, enemy) {
    const s = this.combat.session;
    let damage = shot.damage;
    if (shot.kind === "lance" && (enemy.category === "elite" || enemy.category === "boss")) damage *= 1.2;
    if (shot.kind === "ice" && enemy.frozenUntil > s.elapsedMs && !(enemy === this.combat.boss && this.combat.bossShielded)) damage *= 2;
    if (shot.kind === "rocket") damage *= 1 + this.combat.targetsNear(shot, 102 + 10 * (shot.rank - 1), enemy).length * 0.1;
    return damage;
  }

  impact(shot, enemy, part) {
    const { combat } = this;
    const { session: s, events } = combat;
    const now = s.elapsedMs;
    const { kind, color } = shot;
    if (shot.critical) events.push({ type: "mechanism", label: "连杀暴击", x: shot.x, y: shot.y, color });
    if (kind === "pulse") {
      this.streak = (this.streakUntil > now ? this.streak : 0) + (shot.rank > 1 ? 2 : 1);
      this.streakUntil = now + 900;
      if (shot.powered && now >= this.nextResonance) {
        this.nextResonance = now + 210;
        this.#arc(enemy, shot.damage * 0.72, 140, 2, 0x9eceff);
      }
    }
    if (kind === "lance" && shot.powered && now >= this.nextResonance) {
      this.nextResonance = now + 180;
      this.blast(shot, combat.targetsNear(shot, 93, enemy), 72, shot.damage * 0.42, 0xff3355, null, false, "lance");
    }
    if (kind === "arc") {
      enemy.shockedUntil = now + 1100;
      const jumps = this.#arc(enemy, shot.damage * (shot.powered ? 0.71 : 0.54),
        143 + 24 * (shot.rank - 1), shot.powered ? 6 : 3, color);
      if (shot.powered) {
        const center = { x: shot.x, y: shot.y };
        events.push({ type: "arc", points: [{ x: shot.x - 24, y: Math.max(0, shot.y - 135) }, center], color });
        this.blast(center, combat.targetsNear(center, 110), 110, shot.damage * 0.32, color, "九霄天雷");
      }
      if (!jumps && enemy === combat.boss) {
        const nodes = combat.bossTargets().filter((node) => node.part !== part);
        events.push({ type: "arc", points: [shot, ...nodes, { x: enemy.x, y: enemy.y - 31 }], color });
        if (nodes.length) combat.strikeAreaTarget(enemy, shot.damage * 0.32, nodes[0].part);
      }
    }
    if (kind === "rocket" || kind === "bomb" || kind === "missile") {
      const rank = shot.rank ?? 1;
      const radius = kind === "rocket" ? 102 + 10 * (rank - 1) : shot.payload === "corona" ? 91 : 66;
      const list = combat.targetsNear(shot, radius, enemy);
      this.blast(shot, list, radius, shot.damage * 0.6 * (1 + 0.1 * list.length), color, null, kind === "rocket", kind);
      if (kind === "rocket" && rank >= 2) {
        for (const spread of [-0.63, 0.63]) {
          const options = shot.powered
            ? { kind: "missile", color, speed: 800, homing: true, powered: true, payload: "corona" }
            : { kind: "ember", color, speed: 765 };
          this.launch(shot.x, shot.y - 17, spread, shot.damage * (shot.powered ? 0.36 : 0.25), options);
        }
      }
      if (kind === "rocket" && enemy.hp <= 0) this.blast(enemy, combat.targetsNear(enemy, 78, enemy), 78, shot.damage * 0.35, color, null, false, kind);
    }
    if (kind === "void") {
      this.fields.push({
        x: shot.x, y: shot.y, color, age: 0, tick: 0, damage: shot.damage, attracted: new Set(),
        radius: (shot.rank >= 2 ? 138 : 78) * (shot.powered ? 1.23 : 1), powered: shot.powered,
      });
      if (this.fields.length > 18) this.fields.shift();
    }
    if (kind === "ice") {
      if (enemy.frozenUntil > now) {
        const multipliers = shot.powered ? [-1.05, ...FROST_SPIKES, 1.05] : FROST_SPIKES;
        enemy.frozenUntil = 0;
        enemy.ice = 0;
        events.push({ type: "mechanism", label: "碎冰 ×2.0!", x: shot.x, y: shot.y, color },
          { type: "ice-shatter", x: shot.x, y: shot.y, color });
        for (const angle of multipliers) {
          this.launch(shot.x, shot.y, angle, shot.damage * 0.55, { kind: "shard", color, speed: 790, exclude: enemy });
        }
      } else {
        enemy.ice = (enemy.icedUntil > now ? enemy.ice : 0) + 1;
        enemy.icedUntil = now + 1550;
        if (enemy.ice >= 4) {
          enemy.frozenUntil = now + 1500;
          events.push({ type: "mechanism", label: "冻结", x: enemy.x, y: enemy.y, color });
        }
      }
    }
  }

  #arc(origin, damage, radius, limit, color) {
    const { combat } = this;
    const visited = [origin];
    let node = origin;
    for (let i = 0; i < limit; i++) {
      const target = combat.targetsNear(node, radius).find((enemy) => !visited.includes(enemy));
      if (!target) break;
      visited.push(target);
      combat.strikeAreaTarget(target, damage);
      target.shockedUntil = combat.session.elapsedMs + 1100;
      node = target;
    }
    if (visited.length > 1) {
      combat.events.push({ type: "arc", points: visited.map(({ x, y }) => ({ x, y })), color });
      combat.events.push({ type: "mechanism", label: "闪电链", x: origin.x, y: origin.y, color });
    }
    return visited.length - 1;
  }

  blast(origin, targets, radius, damage, color, label, ignite = false, kind = "blast") {
    const { x, y } = origin;
    this.combat.events.push({ type: "blast", x, y, radius, color, kind });
    if (label) this.combat.events.push({ type: "mechanism", x, y, color, label });
    for (const enemy of targets) {
      if (enemy.hp <= 0) continue;
      this.combat.strikeAreaTarget(enemy, damage);
      if (ignite && enemy.hp <= 0) {
        this.blast(enemy, this.combat.targetsNear(enemy, 78, enemy), 78, damage * 0.43, color, null, false, kind);
      }
    }
  }

  #fields(dt) {
    this.fields = this.fields.filter((field) => {
      field.age += dt;
      const targets = this.combat.targetsNear(field, field.radius);
      for (const enemy of targets) {
        field.attracted.add(enemy);
        if (enemy.category === "boss") continue;
        const pull = Math.min(0.25, dt * 3.2);
        enemy.x += (field.x - enemy.x) * pull;
        enemy.y += (field.y - enemy.y) * pull;
      }
      if (field.age >= 1.2) {
        const damage = field.damage * ((field.powered ? 0.74 : 0.53) + Math.min(8, field.attracted.size) * 0.12);
        this.blast(field, targets, field.radius, damage, field.color, "黑洞坍缩!", false, "void");
        return false;
      }
      if (field.age >= field.tick) {
        field.tick += 0.24;
        for (const enemy of targets) this.combat.strikeAreaTarget(enemy, field.damage * 0.14);
      }
      return true;
    });
  }
}
