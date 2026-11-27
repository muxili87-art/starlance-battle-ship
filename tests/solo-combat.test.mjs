import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FIGHTERS, OVERLOADS } from "../src/core/fighter-catalog.js";
import { SoloCombat } from "../src/core/solo-combat.js";
import { BOSS_ARRIVAL_MS, CAMPAIGN, DISPLAY_TARGETS, ENEMY_PROFILES, StageDirector, WAVE_COUNT } from "../src/core/stage-director.js";
import { CONTRACT, MODULE, SYNERGIES } from "../src/core/upgrade-cards.js";
import { computeRunRank } from "../src/state/records.js";
import { FIELD, HIT_RADIUS, PICKUP_RADIUS, SoloSession } from "../src/state/solo-session.js";

const manifest = JSON.parse(readFileSync(new URL("../public/assets/manifest.json", import.meta.url), "utf8"));

function start(fighterId = manifest.fighters[0].id, random = () => 0, options) {
  const session = new SoloSession(fighterId, random, options);
  return { session, combat: new SoloCombat(session, manifest, random) };
}

function advance(combat, ms) {
  for (let remaining = ms; remaining > 0; remaining -= 10) combat.advance(Math.min(remaining, 10));
}

test("steering stays smooth and bounded, with the declared speed advantage on 疾风", () => {
  const { session, combat } = start();
  const fast = start("02_jifeng");
  for (const instance of [{ session, combat }, fast]) {
    instance.session.setTarget(-40, FIELD.height + 40);
    advance(instance.combat, 50);
  }
  assert(session.ship.x < 360 && session.ship.x > FIELD.side);
  assert(session.ship.y > 1030 && session.ship.y < FIELD.bottom);
  assert(fast.session.ship.x < session.ship.x);
  advance(combat, 800);
  assert(Math.abs(session.ship.x - FIELD.side) < 0.1);
  assert(Math.abs(session.ship.y - FIELD.bottom) < 0.1);
});

test("the 10px core hits while a 28px near miss pays exactly once after passing", () => {
  const { session: s, combat } = start();
  const bullet = { x: s.ship.x + HIT_RADIUS + 6.1, y: s.ship.y, vx: 0, vy: 0, radius: 6, damage: 12 };
  combat.enemyShots.push(bullet);
  advance(combat, 10);
  assert.equal(s.hp, s.maxHp);
  assert.equal(s.parts, 0);
  bullet.x += 14;
  advance(combat, 10);
  assert.equal(s.parts, 1);
  assert.equal(s.grazes, 1);
  assert(Math.abs(s.energy - 3.023) < 0.000001);
  bullet.x -= 13;
  advance(combat, 10);
  bullet.x += 13;
  advance(combat, 10);
  assert.equal(s.parts, 1);
  s.shield = 7;
  bullet.x = s.ship.x + HIT_RADIUS + 5.9;
  advance(combat, 10);
  assert.equal(combat.enemyShots.length, 0);
  assert.equal(s.shield, 0);
  assert.equal(s.hp, s.maxHp - 5);
  assert.equal(s.takeDamage(30), false);
});

test("magnets accelerate crystal pickup, pause the clock, and offer one card of each kind", () => {
  const { session: s, combat } = start();
  const gem = { x: s.ship.x + PICKUP_RADIUS + 1, y: s.ship.y, type: "gold", value: 10, speed: 0 };
  combat.pickups.push(gem);
  advance(combat, 50);
  assert.equal(gem.speed, 0);
  gem.x -= 3;
  advance(combat, 100);
  assert(gem.speed > 100);
  assert(gem.x < s.ship.x + PICKUP_RADIUS - 5);
  advance(combat, 300);
  assert.equal(s.phase, "upgrade");
  assert.equal(s.level, 2);
  assert.equal(s.xp, 7);
  assert.equal(combat.pickups.length, 0);
  const clock = s.elapsedMs;
  advance(combat, 500);
  assert.equal(s.elapsedMs, clock);
  assert.deepEqual(s.cards.map((card) => card.kind), ["专属", "副武", "通用"]);
  assert.equal(s.chooseUpgrade("invalid"), false);
  assert(s.chooseUpgrade("main"));
  assert.equal(s.level, 3);
  assert.equal(s.phase, "upgrade");
  assert(s.chooseUpgrade(CONTRACT.glass));
  assert.equal(s.build.main, 2);
  assert.equal(s.build.secondary[CONTRACT.glass], 1);
  assert.equal(s.phase, "playing");
});

test("all nine fighter arsenals audibly fire, visually diverge, and upgrade in actual projectile state", () => {
  const types = new Set();
  for (const { id } of manifest.fighters) {
    const { session: s, combat } = start(id);
    advance(combat, 10);
    const base = combat.shots[0];
    assert.equal(base.kind, FIGHTERS[id].weapon);
    assert.deepEqual(combat.events.filter(({ type }) => type === "muzzle").map(({ cue }) => cue),
      Array(combat.shots.length).fill(FIGHTERS[id].audio));
    if (id === "01_chifeng") assert.equal(base.pierce, 2);
    types.add(base.kind);
    for (let i = 0; i < 2; i++) {
      s.gainXp(s.xpNeeded);
      assert(s.chooseUpgrade("main"));
    }
    advance(combat, 480);
    assert(combat.shots.some(({ kind, rank, damage }) => kind === base.kind && rank === 3 && damage > base.damage));
    if (id === "09_fengqun") assert.equal(combat.weapons.drones.length, 6);
  }
  assert.equal(types.size, 9);
});

test("all nine resonances require a rank-three main gun and compatible sidearm", () => {
  assert.equal(Object.keys(SYNERGIES).length, 9);
  for (const [id, fighter] of Object.entries(FIGHTERS)) {
    const resonance = SYNERGIES[fighter.weapon];
    if (!resonance) continue;
    const { combat, session } = start(id, () => 0.97);
    for (let count = 0; count < 2; count++) {
      session.gainXp(session.xpNeeded);
      assert(session.chooseUpgrade("main"));
      assert.equal(session.build.synergy, null);
    }
    session.gainXp(session.xpNeeded);
    assert.equal(session.cards[1].id, resonance.secondary);
    assert.equal(session.cards[1].resonance, resonance.name);
    combat.enemyShots.push(roundAt(90, 400));
    assert(session.chooseUpgrade(resonance.secondary));
    assert.equal(session.shield, 30);
    advance(combat, 10);
    assert.equal(combat.enemyShots.length, 0);
    assert(combat.events.some(({ type, count }) => type === "bullet-cancel" && count === 1));
    assert.equal(session.build.synergy, resonance);
    assert(combat.shots.some(({ powered }) => powered));
    assert(combat.events.some(({ type, label }) => type === "evolution" && label === resonance.name));
  }
});

test("all nine charged bursts clear hostile shots and confer temporary invulnerability", () => {
  const names = new Set();
  for (const fighter of manifest.fighters) {
    const { session: s, combat } = start(fighter.id);
    names.add(s.overload.name);
    s.charge(99.9);
    assert.equal(combat.triggerOverload(), false);
    s.charge(1);
    combat.enemyShots.push(roundAt(100, 300));
    assert.equal(combat.triggerOverload(), true);
    assert.equal(s.energy, 0);
    assert.equal(s.takeDamage(25), false);
    assert.equal(combat.enemyShots.length, 0);
    assert.equal(combat.shots.length, OVERLOADS[fighter.id].count);
    assert.equal(combat.triggerOverload(), false);
  }
  assert.equal(names.size, 9);
});

test("five dense waves per sector use all enemy profiles, curved and flanking formations, and one flagship", () => {
  const director = new StageDirector(() => 0);
  const { session } = start();
  const seen = new Set();
  const layouts = new Set();
  for (const [index, expected] of CAMPAIGN.entries()) {
    session.stage = index + 1;
    session.stageStartedAt = index * 60000;
    const waves = new Set();
    const flagships = [];
    let warps = 0;
    let boss;
    let maxFormation = 0;
    for (let time = 0; time <= BOSS_ARRIVAL_MS; time += 25) {
      session.elapsedMs = session.stageStartedAt + time;
      const events = [];
      let count = 0;
      boss = director.update(session, (id, x, y, options) => {
        seen.add(id);
        if (options?.formation) layouts.add(options.formation);
        if (options?.flagship) flagships.push(id);
        count++;
        return id;
      }, events);
      if (events.some(({ type }) => type === "wave")) waves.add(session.wave);
      if (events.some(({ type }) => type === "warp")) {
        warps++;
        assert.equal(session.warpDashMs, 1500);
      }
      maxFormation = Math.max(maxFormation, count);
    }
    assert.equal(boss, expected.boss);
    assert.deepEqual(flagships, [expected.flagship]);
    assert.equal(waves.size, WAVE_COUNT);
    assert.equal(warps, 2);
    assert(maxFormation >= 6);
  }
  assert(layouts.has("arc") && layouts.has("flank"));
  assert(manifest.enemies.every(({ id }) => seen.has(id)));
});

test("Direction B scales assets and normal attack families use the fixed enemy palette", () => {
  const { session, combat } = start();
  combat.weapons.nextShot = Infinity;
  advance(combat, 650);
  const first = combat.enemies[0];
  assert.equal(first.scale * manifest.enemies.find(({ id }) => id === first.id).height, DISPLAY_TARGETS.normal);
  combat.enemies = [];
  for (const { id, category } of manifest.enemies) {
    const profile = ENEMY_PROFILES[id];
    if (!profile.attack) continue;
    combat.enemies.push({
      ...profile, id, category, x: 360, y: 245, age: 3, drift: 0, maxHp: profile.hp, nextFire: 0,
    });
  }
  assert(session.hp > 0);
  advance(combat, 10);
  const normal = combat.enemyShots.filter(({ missile }) => !missile);
  const missiles = combat.enemyShots.filter(({ missile }) => missile);
  assert(normal.length > 20);
  assert(normal.every((shot) => shot.color === 0xff3355 && shot.coreColor === 0xffffff));
  assert(missiles.length >= 3);
  assert(missiles.every((shot) => shot.color === 0xff3355 && shot.accent === 0xffd13b));
});

function roundAt(x, y, extra = {}) {
  return { x, y, vx: 0, vy: 0, radius: 6, damage: 12, ...extra };
}

function enterBoss(stage = 1, options) {
  const { session, combat } = start(undefined, undefined, options);
  session.stage = stage;
  session.baseXpNeeded = 1000;
  session.elapsedMs = BOSS_ARRIVAL_MS;
  combat.weapons.nextShot = Infinity;
  advance(combat, 3710);
  return { session, combat, boss: combat.boss };
}

function advanceUntil(combat, condition, limit = 6000) {
  for (let elapsed = 0; !condition() && elapsed < limit; elapsed += 10) advance(combat, 10);
  assert(condition(), "combat did not reach the expected state");
}

function enterPhase(combat, phase) {
  const boss = combat.boss;
  assert.equal(boss.phase, phase - 1);
  combat.strikeAreaTarget(boss, boss.hp);
  assert.equal(boss.phase, phase);
  assert.equal(boss.hp, boss.maxHp * (phase === 2 ? 0.65 : 0.30));
  assert(combat.events.some((event) => event.type === "boss-phase" && event.phase === phase && event.id === boss.id));
  assert(combat.bossShielded);
}

function finishBoss(combat) {
  for (const phase of [2, 3]) {
    enterPhase(combat, phase);
    if (combat.boss.shieldHp) combat.strikeAreaTarget(combat.boss, combat.boss.shieldHp);
    advanceUntil(combat, () => !combat.bossShielded);
  }
  combat.strikeAreaTarget(combat.boss, combat.boss.hp);
}

test("Marshal alternates its opening aim and spiral before locking a 900ms sweeping laser in phase two", () => {
  const { session: s, boss, combat } = enterBoss();
  assert.equal(boss.maxHp, 2100);
  assert.deepEqual(boss.parts.slice(0, 2).map(({ maxHp }) => maxHp), [240, 240]);
  assert.equal(boss.scale * manifest.bosses[0].width, DISPLAY_TARGETS.boss);
  assert(combat.events.some(({ mode }) => mode === "aimed"));
  advanceUntil(combat, () => combat.enemyShots.some((shot) => shot.pulse && shot.turnRate > 0));
  assert.equal(boss.laser, null);
  enterPhase(combat, 2);
  assert.equal(combat.enemyShots.length, 0);
  advanceUntil(combat, () => boss.laser?.phase === "charge");
  const laser = boss.laser;
  const alignment = [laser.x, laser.y, laser.ex, laser.ey];
  const hp = s.hp;
  assert.equal(laser.chargeUntil - s.elapsedMs, 900);
  assert.equal(laser.color, 0xff3355);
  advance(combat, 890);
  assert.equal(s.hp, hp);
  assert.deepEqual([laser.x, laser.y, laser.ex, laser.ey], alignment);
  advanceUntil(combat, () => laser.phase === "fire");
  assert.equal(s.hp, hp - boss.damage - 10);
  advance(combat, 160);
  assert.notEqual(laser.ex, alignment[2]);
  advance(combat, 330);
  assert.equal(s.hp, hp - boss.damage - 10);
  assert.equal(boss.laser, null);
});

test("Marshal's wing rewards reach the ship, and phase three crossing blades come only from intact wings", () => {
  const { session: s, boss, combat } = enterBoss();
  const [left, right] = boss.parts;
  const origin = combat.bossTargets().find(({ part }) => part === left);
  combat.enemyShots.push(roundAt(44, 280));
  const count = combat.enemyShots.length;
  combat.weapons.launch(origin.x, origin.y + 7, 0, left.hp + 20, { kind: "aux", speed: 860 });
  advance(combat, 10);
  assert.equal(left.hp, 0);
  assert.equal(boss.hp, boss.maxHp);
  assert.equal(combat.enemyShots.length, 0);
  assert(combat.events.some(({ type, id }) => type === "part-break" && id === "left"));
  assert(combat.events.some((event) => event.type === "bullet-cancel" && event.count === count));
  assert(combat.pickups.some(({ shield }) => shield === 18));
  const rightBefore = right.hp;
  enterPhase(combat, 2);
  combat.strikeAreaTarget(boss, 400, right);
  assert.equal(right.hp, rightBefore);
  advanceUntil(combat, () => !combat.bossShielded);
  assert.equal(s.shield, 18);
  enterPhase(combat, 3);
  s.setTarget(65, 1120);
  advanceUntil(combat, () => combat.events.some(({ mode }) => mode === "blades"));
  const blades = combat.enemyShots.filter(({ blade }) => blade);
  assert.equal(blades.length, 4);
  assert(blades.every(({ part, vx, color, accent }) => part === "right" && vx < 0 && color === 0xff3355 && accent === 0xffd13b));
  assert(Math.abs(boss.nextFire - boss.age - 1.10 * 0.8) < 1e-7);
  s.energy = 0;
  combat.strikeAreaTarget(boss, right.hp, right);
  combat.strikeAreaTarget(boss, 100, right);
  assert.equal(combat.pickups.filter(({ energy }) => energy === 25).length, 1);
  advanceUntil(combat, () => !combat.pickups.some(({ energy }) => energy === 25));
  assert(s.energy >= 25);
});

test("Citadel's shoulder missiles are destructible and its phase shield can stagger or expire", () => {
  const { session: s, boss, combat } = enterBoss(2);
  assert.equal(boss.maxHp, 3800);
  assert.deepEqual(boss.parts.slice(0, 2).map(({ maxHp }) => maxHp), [340, 340]);
  const missiles = combat.enemyShots.filter(({ missile }) => missile);
  assert.deepEqual(missiles.map(({ part }) => part), ["left", "left", "right", "right"]);
  const missile = missiles[0];
  combat.weapons.launch(missile.x, missile.y + 8, 0, 40, { kind: "aux", speed: 800 });
  advance(combat, 10);
  assert(!combat.enemyShots.includes(missile));
  advanceUntil(combat, () => combat.events.some(({ mode }) => mode === "fans"));
  assert(combat.enemyShots.some(({ missile, part, vx }) => !missile && part === "left" && vx > 0));
  assert(combat.enemyShots.some(({ missile, part, vx }) => !missile && part === "right" && vx < 0));
  enterPhase(combat, 2);
  assert.equal(boss.shieldHp, 260);
  combat.strikeAreaTarget(boss, 259);
  assert.equal(boss.shieldHp, 1);
  assert.equal(boss.hp, 2470);
  combat.strikeAreaTarget(boss, 1);
  assert.equal(boss.staggerUntil - s.elapsedMs, 3000);
  assert(combat.events.some(({ type }) => type === "boss-stagger"));
  const x = boss.x;
  combat.strikeAreaTarget(boss, 100);
  assert.equal(boss.hp, 2310);
  advance(combat, 350);
  assert.equal(boss.x, x);
  advanceUntil(combat, () => s.elapsedMs >= boss.staggerUntil);
  enterPhase(combat, 3);
  advanceUntil(combat, () => combat.events.filter(({ mode }) => mode === "corridor").length === 2);
  assert.deepEqual(combat.events.filter(({ mode }) => mode === "corridor").map(({ part, side }) => [part, side]),
    [["left", -1], ["right", 1]]);

  const expiry = enterBoss(2);
  enterPhase(expiry.combat, 2);
  advanceUntil(expiry.combat, () => !expiry.combat.bossShielded);
  assert.equal(expiry.boss.shieldHp, 0);
  assert.equal(expiry.boss.staggerUntil, 0);
});

test("Overmind reverses paired rings, applies gravity and live-hatch spawns, then alternates two laser lanes", () => {
  const { session: s, boss, combat } = enterBoss(3);
  assert.equal(boss.maxHp, 5800);
  assert.deepEqual(boss.parts.slice(0, 2).map(({ maxHp }) => maxHp), [460, 460]);
  advanceUntil(combat, () => combat.events.filter(({ type }) => type === "boss-pulse").length === 4);
  assert.deepEqual(combat.events.filter(({ type }) => type === "boss-pulse").map(({ color }) => color),
    [0xff3355, 0xffd13b, 0xff3355, 0xffd13b]);
  assert(combat.enemyShots.some(({ turnRate }) => turnRate < 0));
  assert(combat.enemyShots.some(({ turnRate }) => turnRate > 0));
  combat.strikeAreaTarget(boss, boss.parts[0].hp, boss.parts[0]);
  enterPhase(combat, 2);
  s.setTarget(62, 1080);
  advanceUntil(combat, () => boss.gravityUntil > s.elapsedMs);
  const gravitatingX = s.ship.x;
  advance(combat, 100);
  assert(s.ship.x > gravitatingX);
  advanceUntil(combat, () => combat.enemies.some(({ summoned }) => summoned));
  const drones = combat.enemies.filter(({ summoned }) => summoned);
  assert.equal(drones.length, 3);
  assert(drones.every(({ id, flight }) => id === "normal_bomber" && flight === "bomber"));
  assert.deepEqual(combat.events.filter(({ mode }) => mode === "bombers").map(({ part }) => part), ["right"]);
  enterPhase(combat, 3);
  advanceUntil(combat, () => boss.laser?.phase === "charge");
  const first = boss.laser;
  assert(first.x < FIELD.width / 2);
  advanceUntil(combat, () => boss.laser && boss.laser !== first);
  assert(boss.laser.x > FIELD.width / 2);
  advanceUntil(combat, () => combat.events.some(({ type, count }) => type === "boss-pulse" && count === 16));
});

test("campaign heals and grants one card per warp, while the third clear banks its last gold rain", () => {
  const { session: s, combat } = start();
  combat.weapons.nextShot = Infinity;
  s.build.secondary[MODULE.magnet] = 1;
  s.setTarget(65, 1120);
  for (let stage = 1; stage <= 3; stage++) {
    assert.equal(s.stage, stage);
    const level = s.level;
    s.elapsedMs = s.stageStartedAt + BOSS_ARRIVAL_MS;
    advance(combat, 3710);
    assert.equal(combat.boss.id, CAMPAIGN[stage - 1].boss);
    s.hp = 30;
    for (const phase of [2, 3]) {
      enterPhase(combat, phase);
      if (combat.boss.shieldHp) combat.strikeAreaTarget(combat.boss, combat.boss.shieldHp);
      advanceUntil(combat, () => !combat.bossShielded);
    }
    s.energy = 0;
    combat.enemyShots.push(roundAt(s.ship.x, s.ship.y - 40));
    s.breachMeter = 4;
    combat.strikeAreaTarget(combat.boss, combat.boss.hp);
    assert.equal(s.breachMeter, 0);
    assert(combat.events.some(({ type, count }) => type === "bullet-cancel" && count >= 1));
    if (stage === 3) {
      assert.equal(s.phase, "victory");
      assert.equal(s.transitionUntil, 0);
      assert(s.energy > 1.2);
      assert(!combat.pickups.some(({ deliver }) => deliver));
      break;
    }
    combat.advance(0);
    assert.equal(s.stage, stage + 1);
    assert.equal(s.phase, "playing");
    assert.equal(s.warpDashMs, 1500);
    assert(Math.abs(s.hp - (30 + s.maxHp * 0.3)) < 1e-6);
    assert.equal(combat.boss, null);
    assert.equal(combat.enemies.length + combat.enemyShots.length + combat.shots.length, 0);
    advance(combat, 1490);
    assert.equal(s.phase, "playing");
    advance(combat, 10);
    assert.equal(s.phase, "upgrade");
    assert.equal(s.cards.length, 3);
    assert.equal(s.level, level);
    assert(s.chooseUpgrade("main"));
    assert.equal(s.build.main, stage + 1);
    assert.equal(s.build.secondary[MODULE.magnet], 1);
    assert.equal(s.phase, "playing");
  }
  assert.deepEqual(combat.events.filter(({ type }) => type === "sector-clear").map(({ id }) => id),
    CAMPAIGN.map(({ boss }) => boss));
});

test("tactical rewards reuse the equipment map and cycle through five modules before offering repeats", () => {
  const { session: s } = start();
  const names = [];
  for (let i = 0; i < 5; i++) {
    s.offerUpgrade();
    const { id, label, kind, level } = s.cards[2];
    assert.equal(kind, "通用");
    assert.equal(id, label);
    assert.equal(level, 1);
    assert(s.chooseUpgrade(id));
    names.push(id);
  }
  assert.deepEqual(names, Object.values(MODULE));
  s.offerUpgrade();
  assert.equal(s.cards[2].level, 2);
});

test("grazes launch one homing counter; prism and frenzy add real arcs, pierce, critical hits and fire rate", () => {
  const { session: s, combat } = start();
  Object.assign(s.build.secondary, { [MODULE.counter]: 1, [MODULE.prism]: 1, [MODULE.frenzy]: 1 });
  combat.weapons.nextShot = Infinity;
  const bullet = { x: s.ship.x + 22, y: s.ship.y, vx: 0, vy: 0, radius: 6, damage: 12 };
  combat.enemyShots.push(bullet);
  advance(combat, 10);
  bullet.x += 12;
  advance(combat, 10);
  assert.equal(combat.shots.filter(({ payload, homing }) => payload === "counter" && homing).length, 1);
  advance(combat, 40);
  assert.equal(combat.shots.filter(({ payload }) => payload === "counter").length, 1);

  combat.weapons.nextShot = 0;
  s.combo = 10;
  for (let volley = 1; volley <= 4; volley++) {
    s.elapsedMs = Math.max(s.elapsedMs, combat.weapons.nextShot);
    combat.shots.length = 0;
    combat.weapons.update(0);
    assert(Math.abs(combat.weapons.nextShot - s.elapsedMs - s.fighter.interval / 1.2) < 1e-6);
    assert(combat.shots.every(({ pierce }) => pierce === 3));
    assert.equal(combat.shots.length, volley === 4 ? 3 : 1);
  }
  const [primary, left, right] = combat.shots;
  assert(primary.critical && primary.damage > s.fighter.damage);
  for (const [shot, sign] of [[left, -1], [right, 1]]) {
    assert(Math.abs(Math.atan2(shot.vx, -shot.vy) - sign * Math.PI / 15) < 1e-6);
  }
});

test("Emergency Capacitor clears only nearby rounds once the damage grace period ends; Magnet boosts both systems", () => {
  const { session: s, combat } = start();
  Object.assign(s.build.secondary, { [MODULE.emergency]: 1, [MODULE.magnet]: 1 });
  s.charge(10);
  assert.equal(s.energy, 12.2);
  const gem = { x: s.ship.x + PICKUP_RADIUS + 32, y: s.ship.y, type: "green", value: 1, speed: 0 };
  combat.pickups.push(gem);
  assert(s.takeDamage(10));
  const close = { x: s.ship.x + 85, y: s.ship.y, vx: 0, vy: 0, radius: 6, damage: 10 };
  const far = { ...close, x: s.ship.x + 190 };
  combat.enemyShots.push(close, far);
  advance(combat, 510);
  assert(gem.speed > 0);
  assert.equal(s.shield, 0);
  assert(combat.enemyShots.includes(close));
  advance(combat, 10);
  assert.equal(s.shield, 12);
  assert.deepEqual(combat.enemyShots.filter((shot) => shot === close || shot === far), [far]);
  advance(combat, 30);
  assert.equal(combat.events.filter(({ type }) => type === "reflect").length, 1);
});

test("the three added resonances alter combat beyond the powered flag", () => {
  const storm = start("03_leiting");
  const targets = Array.from({ length: 7 }, (_, i) => ({ x: 90 + i * 66, y: 300, hp: 100, maxHp: 100, category: "normal" }));
  storm.combat.enemies.push(...targets);
  storm.combat.weapons.impact({ x: 90, y: 300, kind: "arc", color: 0xffd13b, damage: 28, rank: 3, powered: true }, targets[0]);
  assert(storm.combat.events.some(({ type, points }) => type === "arc" && points.length === 7));
  assert(storm.combat.events.some(({ type, label }) => type === "mechanism" && label === "九霄天雷"));
  assert(targets.every(({ hp }) => hp < 100));

  const corona = start("05_lieyang");
  corona.combat.weapons.impact({ x: 360, y: 400, kind: "rocket", color: 0xff7a22, damage: 50, rank: 3, powered: true }, { hp: 100 });
  assert.equal(corona.combat.shots.filter(({ payload, homing }) => payload === "corona" && homing).length, 2);

  const { session: shield, combat } = start("08_tiandun");
  shield.build.secondary.blade = 1;
  shield.build.synergy = SYNERGIES.guard;
  const bullet = { x: shield.ship.x + 150, y: shield.ship.y, vx: 0, vy: 0, radius: 6, damage: 10 };
  combat.enemyShots.push(bullet);
  combat.weapons.update(0);
  assert.equal(combat.enemyShots.length, 0);
  assert(combat.weapons.blades.every(({ radius }) => radius === 64));
  shield.guard = false;
  combat.enemyShots.push(bullet);
  shield.elapsedMs += 940;
  combat.weapons.update(0);
  assert(combat.enemyShots.includes(bullet));
  assert(combat.weapons.blades.every(({ radius }) => radius === 35));
});

test("a cleared wave advances reinforcement to 320ms and preserves the planned boss warp", () => {
  const { session: s, combat } = start();
  combat.weapons.nextShot = Infinity;
  advance(combat, 600);
  const scheduled = combat.director.next;
  assert(combat.enemies.length > 0);
  advance(combat, 30);
  assert.equal(combat.director.next, scheduled);
  combat.enemies.forEach((enemy) => { enemy.hp = 0; });
  advance(combat, 10);
  assert.equal(combat.director.next - s.elapsedMs, 320);
  advance(combat, 310);
  assert.equal(combat.enemies.length, 0);
  advance(combat, 10);
  assert(combat.enemies.length > 0);
  combat.enemyShots.push(roundAt(49, 440));
  s.elapsedMs = BOSS_ARRIVAL_MS;
  advance(combat, 10);
  assert.deepEqual(combat.enemies, [combat.boss]);
  assert.equal(combat.enemyShots.length, 0);
  assert.equal(s.warpDashMs, 1500);
});

test("the flagship follows the mid-sector warp and magnetizes the entire field on defeat", () => {
  const { session: s, combat } = start();
  combat.weapons.nextShot = Infinity;
  s.elapsedMs = 18000;
  advance(combat, 10);
  assert.equal(s.warpDashMs, 1500);
  advance(combat, 1480);
  assert(!combat.enemies.some(({ flagship }) => flagship));
  advance(combat, 10);
  const flagship = combat.enemies.find((enemy) => enemy.flagship);
  assert(flagship);
  const far = { x: 48, y: 35, type: "green", value: 1, speed: 0 };
  combat.pickups.push(far);
  s.energy = 0;
  const hp = flagship.hp;
  s.breachMeter = 4;
  combat.strikeAreaTarget(flagship, hp);
  assert.equal(s.breachMeter, 0);
  assert(combat.pickups.every(({ speed }) => speed >= 480));
  assert.equal(s.energy, hp * 0.016 + 7 + 35);
  assert(combat.events.some(({ type }) => type === "flagship-down"));
});

test("one bounty convoy offers a free card, shield and 25% hull repair; an escaped convoy gives no loot", () => {
  function convoy() {
    const { session, combat } = start();
    combat.weapons.nextShot = Infinity;
    session.elapsedMs = 27000;
    advance(combat, 490);
    const enemy = combat.enemies.find(({ bountyUntil }) => bountyUntil);
    assert(enemy);
    assert.equal(enemy.bountyUntil - session.elapsedMs, 7990);
    assert.deepEqual(combat.events.find(({ type }) => type === "bounty-start"), { type: "bounty-start", durationMs: 8000 });
    return { session, combat, enemy };
  }
  const { session: s, combat, enemy } = convoy();
  s.hp = 32;
  combat.strikeAreaTarget(enemy, enemy.hp);
  advance(combat, 10);
  assert.equal(s.hp, 32 + s.maxHp * 0.25);
  assert.equal(s.shield, 20);
  assert.equal(s.phase, "upgrade");
  assert.equal(s.cards.length, 3);
  assert.equal(s.level, 1);
  assert(combat.events.some(({ type }) => type === "bounty-clear"));
  s.finishUpgrade();
  advance(combat, 3600);
  assert.equal(combat.events.filter(({ type }) => type === "bounty-start").length, 1);
  const escaped = convoy();
  escaped.session.elapsedMs = escaped.enemy.bountyUntil - 10;
  advance(escaped.combat, 10);
  assert(!escaped.combat.enemies.includes(escaped.enemy));
  assert.equal(escaped.combat.pickups.length, 0);
  assert.equal(escaped.session.breaches, 0);
  assert(!escaped.combat.events.some(({ type }) => type === "bounty-clear"));
  const offscreen = convoy();
  offscreen.enemy.y = FIELD.height + offscreen.enemy.radius + 1;
  advance(offscreen.combat, 10);
  assert(!offscreen.combat.enemies.includes(offscreen.enemy));
  assert.equal(offscreen.combat.pickups.length, 0);
  assert.equal(offscreen.session.breachMeter, 2);
});

function graze(combat, count = 1, distance = 24) {
  const { ship } = combat.session;
  const rounds = Array.from({ length: count }, () => roundAt(ship.x + distance, ship.y));
  combat.enemyShots.push(...rounds);
  advance(combat, 10);
  for (const round of rounds) round.x += 30;
  advance(combat, 10);
}

test("frontline doubles combat score and applies XP and charge bonuses at the instant of the kill or graze", () => {
  for (const y of [639, 640]) {
    const { session: s, combat } = start();
    s.ship.y = s.ship.targetY = y;
    s.baseXpNeeded = 100;
    const target = { x: s.ship.x, y: y - 200, hp: 10, category: "normal" };
    combat.strikeAreaTarget(target, 10);
    graze(combat);
    const xpScale = y === 639 ? 1.5 : 1;
    const chargeScale = y === 639 ? 1.8 : 1;
    assert.deepEqual(combat.pickups.map(({ value }) => value), [1 * xpScale, 2.5 * xpScale]);
    assert(Math.abs(s.xp - 0.12 * xpScale) < 1e-9);
    assert(Math.abs(s.energy - (6 * chargeScale + 0.16 + 0.023)) < 1e-9);
    assert.equal(s.combatScore, 210 * (y === 639 ? 2 : 1));
  }
});

test("five grazes in three seconds start four seconds of frenzy, freeze combo decay and boost main fire by 25%", () => {
  const { session: s, combat } = start();
  s.combo = 15;
  s.comboUntil = 2000;
  graze(combat, 4);
  assert.equal(s.feverUntil, 0);
  graze(combat);
  assert.equal(s.feverUntil - s.elapsedMs, 4000);
  assert.deepEqual(combat.events.find(({ type }) => type === "fever"), { type: "fever", active: true, until: s.feverUntil });
  combat.weapons.nextShot = 0;
  combat.weapons.update(0);
  assert(Math.abs(combat.weapons.nextShot - s.elapsedMs - s.fighter.interval * 0.8 / 1.08) < 1e-9);
  combat.weapons.nextShot = Infinity;
  combat.shots.length = 0;
  advance(combat, 4010);
  assert.equal(s.combo, 15);
  assert(Math.abs(s.comboUntil - 6000) < 1e-7);
  assert.deepEqual(combat.events.filter(({ type, active }) => type === "fever" && !active), [{ type: "fever", active: false }]);
  const late = start();
  graze(late.combat, 4);
  advance(late.combat, 3010);
  graze(late.combat);
  assert.equal(late.session.feverUntil, 0);
});

test("Overdrive clears all live rounds but caps gold rain at 60 real homing XP and energy pickups", () => {
  const { session: s, combat } = start();
  s.baseXpNeeded = 100;
  s.energy = 100;
  for (let i = 0; i < 72; i++) combat.enemyShots.push(roundAt(300, s.ship.y - 42));
  combat.enemyShots.unshift(roundAt(300, s.ship.y - 42, { gone: true }));
  assert(combat.triggerOverload());
  assert.equal(combat.enemyShots.length, 0);
  assert.equal(combat.pickups.length, 60);
  assert(combat.pickups.every(({ energy, speed, type, value }) => energy === 1.2 && speed > 0 && type === "gold" && value === 0.35));
  assert.deepEqual(combat.events.find(({ type }) => type === "bullet-cancel"), { type: "bullet-cancel", count: 60 });
  advance(combat, 120);
  assert.equal(combat.pickups.length, 0);
  assert(Math.abs(s.xp - 21) < 1e-8);
  assert(Math.abs(s.energy - (72 + 0.12 * 1.15)) < 1e-8);
});

test("combo tiers apply movement, main and secondary cadence, 18% criticals and shield recovery", () => {
  const { session: s, combat } = start();
  const normal = start();
  for (const craft of [normal.session, s]) craft.setTarget(FIELD.side, FIELD.top);
  s.combo = 15;
  s.move(10);
  normal.session.move(10);
  assert(Math.abs((360 - s.ship.x) / (360 - normal.session.ship.x) - 1.08) < 1e-9);
  s.build.secondary.gun = 1;
  for (const [combo, rate] of [[15, 1.08], [30, 1.15], [60, 1.22]]) {
    s.combo = combo;
    combat.weapons.nextShot = 0;
    combat.weapons.secondaryTimers.gun = 0;
    combat.weapons.update(0);
    assert.equal(combat.weapons.nextShot, s.fighter.interval / rate);
    assert.equal(combat.weapons.secondaryTimers.gun, 420 * (combo >= 30 ? 0.85 : 1));
  }
  for (const [roll, expected] of [[0.1799, 15], [0.18, 10]]) {
    combat.random = () => roll;
    const enemy = { x: 33, y: 50, hp: 100, category: "normal" };
    combat.strikeAreaTarget(enemy, 10);
    assert.equal(100 - enemy.hp, expected);
  }
  s.addShield(34);
  s.recordKill();
  s.recordKill();
  assert.equal(s.shield, 34);
  s.recordKill();
  assert.equal(s.shield, 35);
  s.recordKill();
  s.recordKill();
  s.recordKill();
  assert.equal(s.shield, 35);
  s.takeDamage(5);
  assert.equal(s.combo, 66);
  s.invulnerableMs = 0;
  s.takeDamage(40);
  assert.equal(s.combo, 33);
});

test("contracts only replace eligible third slots and apply glass damage, bloodrage and the tenth-graze pulse", () => {
  for (const chance of [0.3499, 0.35]) {
    const { session } = start(undefined, () => chance);
    session.level = 3;
    session.offerUpgrade();
    assert.equal(session.cards[2].kind, chance < 0.35 ? "超频" : "通用");
  }
  const glass = start();
  const previousMax = glass.session.maxHp;
  glass.session.hp = previousMax / 2;
  glass.session.level = 3;
  glass.session.offerUpgrade();
  assert(glass.session.chooseUpgrade(CONTRACT.glass));
  assert.equal(glass.session.maxHp, Math.floor(previousMax * 0.8));
  assert.equal(glass.session.hp, glass.session.maxHp / 2);
  const target = { x: 160, y: 300, hp: 100 };
  glass.combat.strikeAreaTarget(target, 20);
  assert.equal(target.hp, 71);
  glass.session.offerUpgrade();
  assert.notEqual(glass.session.cards[2].id, CONTRACT.glass);

  const blood = start();
  blood.session.build.secondary[CONTRACT.blood] = 1;
  blood.session.shield = 14;
  blood.session.takeDamage(12);
  assert.equal(blood.session.energy, 0);
  blood.session.invulnerableMs = 0;
  blood.session.takeDamage(12);
  assert.equal(blood.session.energy, 100);
  assert.equal(blood.session.bloodUntil, 2000);
  blood.combat.weapons.update(0);
  assert.equal(blood.combat.weapons.nextShot, blood.session.fighter.interval / 1.35);

  const eater = start();
  eater.session.build.secondary[CONTRACT.eater] = 1;
  for (const dx of [40, 270]) eater.combat.enemyShots.push(roundAt(eater.session.ship.x + dx, eater.session.ship.y, { grazed: true }));
  graze(eater.combat, 9, 36);
  assert.equal(eater.session.grazes, 9);
  assert.equal(eater.session.shield, 0);
  graze(eater.combat, 1, 36);
  assert.equal(eater.session.shield, 6);
  assert(eater.combat.enemyShots.every(({ x }) => x > eater.session.ship.x + 260));
  assert(eater.combat.events.some(({ type, radius }) => type === "reflect" && radius === 260));
});

test("hardcore adds enemy HP, faster shots, extra elite and boss volleys, and boosts player rewards", () => {
  const standard = start();
  const hard = start(undefined, undefined, { difficulty: "hardcore" });
  for (const { session: s, combat } of [standard, hard]) {
    combat.weapons.nextShot = Infinity;
    s.baseXpNeeded = 19;
    advance(combat, 490);
    graze(combat);
  }
  assert.equal(hard.session.xpNeeded, 18);
  assert.equal(hard.combat.enemies[0].hp, Math.round(standard.combat.enemies[0].hp * 1.30));
  assert(Math.abs((hard.session.energy - 0.51 * 1.15) / (standard.session.energy - 0.51 * 1.15) - 1.4) < 1e-9);
  assert.equal(computeRunRank(hard.session).score, Math.round(computeRunRank(standard.session).score * 1.5));
  for (const { combat } of [standard, hard]) {
    const profile = ENEMY_PROFILES.elite_spread;
    combat.enemyShots.length = 0;
    combat.enemies = [{ ...profile, category: "elite", x: 360, y: 260, nextFire: 0, age: 2, drift: 0 }];
    advance(combat, 10);
  }
  assert.equal(hard.combat.enemyShots.length, standard.combat.enemyShots.length + 5);
  assert(Math.abs(Math.hypot(hard.combat.enemyShots[0].vx, hard.combat.enemyShots[0].vy) / 350 - 1.18) < 1e-9);
  assert.equal(hard.combat.enemyShots[0].damage, 20);
  const elite = hard.combat.enemies[0];
  assert(Math.abs((elite.nextFire - elite.age) * 1000 - elite.interval * 0.72) < 1e-9);
  const { boss, combat } = enterBoss(1, { difficulty: "hardcore" });
  assert.equal(boss.maxHp, Math.round(2100 * 1.30));
  assert(Math.abs(boss.nextFire - 3.63 - 0.72) < 0.02);
  assert(combat.events.some(({ mode }) => mode === "hardcore"));
});

test("endless clears continue beyond Overmind, scale threats, and rotate three sector mutators", () => {
  const { session: s, combat, boss } = enterBoss(3, { mode: "endless" });
  assert.equal(boss.id, "boss_overmind");
  const ids = ["electromagnetic", "elite-swarm", "frenzy-overload"];
  for (const [index, id] of ids.entries()) {
    s.hp = 25;
    finishBoss(combat);
    assert.notEqual(s.phase, "victory");
    const shield = s.shield;
    combat.advance(0);
    assert.equal(s.stage, index + 4);
    assert.equal(s.sector, index + 1);
    assert.equal(s.loop, 2);
    assert.equal(s.mutator.id, id);
    assert.equal(s.hp, 25 + s.maxHp * 0.4);
    assert.equal(s.shield, Math.min(35, shield + 25));
    assert(combat.events.some((event) => event.type === "mutator" && event.id === id && event.label === s.mutator.label));
    advance(combat, 1500);
    assert.equal(s.phase, "upgrade");
    s.finishUpgrade();
    advance(combat, 510);
    const living = combat.enemies[0];
    assert.equal(living.hp, Math.round(ENEMY_PROFILES[living.id].hp * [1, 1.85, 3.10][index] * 1.55));
    if (id === "electromagnetic") {
      s.energy = 20;
      const before = s.energy;
      graze(combat);
      assert(Math.abs(s.energy - before - 3 * 1.3 - 0.023) < 1e-8);
    } else if (id === "elite-swarm") {
      assert(combat.enemies.filter(({ category }) => category === "elite").length >= 1);
      const count = combat.pickups.length;
      combat.strikeAreaTarget(living, living.hp);
      assert.equal(combat.pickups[count].value, (living.category === "normal" ? 1.5 : 4) * 1.25);
    } else {
      s.energy = 100;
      assert(combat.triggerOverload());
      assert.equal(s.enemyCadence, 0.85);
      assert.equal(s.overloadMs, 680 * 1.4);
    }
    s.elapsedMs = s.stageStartedAt + BOSS_ARRIVAL_MS;
    advance(combat, 3710);
    assert.equal(combat.boss.id, CAMPAIGN[index].boss);
    assert.equal(combat.boss.maxHp, Math.round(ENEMY_PROFILES[combat.boss.id].hp * 1.45));
    if (id === "electromagnetic") {
      const first = combat.enemyShots[0];
      assert(Math.abs(Math.hypot(first.vx, first.vy) - 316 * 1.1 * 1.12) < 1e-8);
    }
  }
});

test("early normal fire starts above y=115 and its bullet consumes hull after a full shield is depleted", () => {
  const { session: s, combat } = start();
  combat.weapons.nextShot = Infinity;
  advance(combat, 490);
  const leader = combat.enemies[0];
  assert.equal(leader.nextFire, 0.65);
  advanceUntil(combat, () => combat.enemyShots.length > 0, 1500);
  assert(leader.y >= 85 && leader.y < 115);
  const [shot] = combat.enemyShots;
  assert(Math.abs(Math.hypot(shot.vx, shot.vy) - 315) < 1e-8);
  assert.equal(shot.damage, 12);

  s.addShield(100);
  assert.equal(s.shield, 35);
  for (const [shield, hpLoss] of [[23, 0], [11, 0], [0, 1]]) {
    s.invulnerableMs = 0;
    combat.enemyShots = [{ ...shot, x: s.ship.x, y: s.ship.y }];
    advance(combat, 10);
    assert.equal(s.shield, shield);
    assert.equal(s.hp, s.maxHp - hpLoss);
    assert.equal(s.invulnerableMs, 520);
  }
});

test("elites and flagship fire early, and a hardcore boss laser strips shield and hull", () => {
  const { session, combat } = start(undefined, () => 0.5);
  combat.weapons.nextShot = Infinity;
  session.stage = 2;
  session.elapsedMs = 9000;
  advance(combat, 490);
  const elite = combat.enemies.find(({ category }) => category === "elite");
  assert.equal(elite.nextFire, 0.65);
  session.elapsedMs = 19500;
  advance(combat, 10);
  const flagship = combat.enemies.find((enemy) => enemy.flagship);
  assert.equal(flagship.nextFire, 0.65);
  combat.enemies = [flagship];
  combat.enemyShots = [];
  advanceUntil(combat, () => combat.enemyShots.length > 0, 3000);
  assert.equal(combat.enemyShots[0].damage, 24);

  const hard = enterBoss(1, { difficulty: "hardcore" });
  enterPhase(hard.combat, 2);
  advanceUntil(hard.combat, () => hard.boss.laser?.phase === "charge");
  hard.combat.enemyShots = [];
  hard.session.addShield(80);
  const hp = hard.session.hp;
  advanceUntil(hard.combat, () => hard.boss.laser.hit);
  assert.equal(hard.session.shield, 0);
  assert.equal(hard.session.hp, hp - (22 + 10) * 1.25 + 35);
});

test("every large shield grant goes through the same cap", () => {
  const { session: s, combat } = start("08_tiandun");
  s.addShield(25);
  s.energy = 100;
  assert(combat.triggerOverload());
  assert.equal(s.shield, 35);
  s.gainXp(s.xpNeeded);
  assert(s.chooseUpgrade("main"));
  s.gainXp(s.xpNeeded);
  assert(s.chooseUpgrade("main"));
  s.gainXp(s.xpNeeded);
  assert(s.chooseUpgrade("blade"));
  assert(s.build.synergy);
  assert.equal(s.shield, 35);
  const wingReward = { x: s.ship.x, y: s.ship.y, type: "gold", shield: 18, value: 0 };
  combat.pickups.push(wingReward);
  advance(combat, 10);
  assert(!combat.pickups.includes(wingReward));
  assert.equal(s.shield, 35);
});

function crossingEnemy(id, x, extra = {}) {
  const category = id.split("_")[0];
  return { ...ENEMY_PROFILES[id], id, category, x, y: FIELD.height + 24, age: 0, drift: 0, ...extra };
}

test("breaches damage hull through immunity, halve combo once, and deploy three aimed interceptors at five points", () => {
  const { session: s, combat } = start();
  combat.weapons.nextShot = Infinity;
  s.combo = 80;
  s.comboUntil = 3400;
  const near = crossingEnemy("normal_light_fighter", 200, { y: FIELD.height + 23, speed: 0 });
  combat.enemies.push(near);
  advance(combat, 10);
  assert.equal(s.breaches, 0);
  near.y++;
  advance(combat, 10);
  assert.equal(s.hp, s.maxHp - 6);
  assert.equal(s.combo, 40);
  assert.equal(s.breachMeter, 1);
  assert.deepEqual(combat.events.find(({ type }) => type === "breach"),
    { type: "breach", x: 200, cost: 1, meter: 1, max: 5, enemyId: "normal_light_fighter" });
  assert(!combat.enemies.includes(near));

  s.addShield(35);
  combat.enemies.push(crossingEnemy("elite_fighter", 320), crossingEnemy("medium_transport", 560));
  advance(combat, 10);
  assert.equal(s.breaches, 3);
  assert.equal(s.hp, s.maxHp - 6 - 8 - 8 - 18);
  assert.equal(s.shield, 35);
  assert.equal(s.combo, 10);
  assert.equal(s.breachMeter, 0);
  assert.deepEqual(combat.events.filter(({ type }) => type === "breach").map(({ meter }) => meter), [1, 3, 5]);
  assert.deepEqual(combat.events.filter(({ type }) => type === "breach-alarm"), [{ type: "breach-alarm", x: 360, y: 120 }]);
  assert.deepEqual(combat.enemies.map(({ id, summoned, x, attack }) => [id, summoned, x, attack]),
    [180, 360, 540].map((x) => ["elite_fighter", true, x, "burst"]));
  const hunters = [...combat.enemies];
  for (const hunter of hunters) hunter.y = FIELD.height + 106;
  advance(combat, 10);
  assert(hunters.every((hunter) => !combat.enemies.includes(hunter)));
  assert.equal(s.breaches, 3);
});

test("immune breach damage keeps the last hull point, but the alarm can end the run through a full shield", () => {
  const { session: s, combat } = start();
  s.invulnerableMs = 300;
  s.hp = 3;
  s.addShield(35);
  combat.enemies.push(crossingEnemy("normal_light_fighter", 200));
  advance(combat, 10);
  assert.equal(s.hp, 1);
  assert.equal(s.phase, "playing");
  s.breachMeter = 4;
  combat.enemies.push(crossingEnemy("normal_light_fighter", 200));
  advance(combat, 10);
  assert.equal(s.hp, 0);
  assert.equal(s.shield, 35);
  assert.equal(s.phase, "defeat");
  assert.equal(s.breachMeter, 0);
});

test("sector and wave HP multiply with bounded level catch-up, which also accelerates new enemies' shots", () => {
  const cases = [
    { stage: 1, wave: 1, level: 3, scale: 1, bulletScale: 1 },
    { stage: 2, wave: 1, level: 6, scale: 1.85, bulletScale: 1 },
    { stage: 3, wave: 1, level: 9, scale: 3.10, bulletScale: 1 },
    { stage: 2, wave: 1, level: 9, scale: 1.85 * 1.36, bulletScale: 1.12 },
    { stage: 3, wave: 5, level: 30, scale: 3.10 * 1.4 * 1.6, bulletScale: 1.20 },
  ];
  for (const { stage, wave, level, scale, bulletScale } of cases) {
    const { session: s, combat } = start();
    combat.weapons.nextShot = Infinity;
    s.stage = stage;
    s.level = level;
    s.elapsedMs = (wave - 1) * 9000;
    advance(combat, wave === 1 ? 490 : 1550);
    const lead = combat.enemies.find(({ flagship }) => !flagship);
    assert.equal(s.wave, wave);
    assert.equal(lead.hp, Math.round(ENEMY_PROFILES[lead.id].hp * scale));
    assert.equal(lead.bulletCatchUp, bulletScale);
    if (wave === 1) {
      advanceUntil(combat, () => combat.enemyShots.length > 0, 1500);
      const { vx, vy } = combat.enemyShots[0];
      assert(Math.abs(Math.hypot(vx, vy) - 315 * bulletScale) < 1e-8);
    }
  }
});

test("endless loop 2+ spawns dual-wing hordes and respects MAX_ACTIVE_ENEMIES", () => {
  const { session: s, combat } = start("01_chifeng", () => 0.9, { mode: "endless", difficulty: "standard" });
  s.stage = 4; // Loop 2
  s.baseXpNeeded = 1000;
  combat.weapons.nextShot = Infinity;
  advance(combat, 500);
  assert(combat.enemies.length >= 10 && combat.enemies.length <= 60);
});

test("ace affixes: aegis reduces nearby ally damage and splitter spawns 3 bombers on death", () => {
  const { session: s, combat } = start();
  s.baseXpNeeded = 1000;
  combat.weapons.nextShot = Infinity;
  const aegis = { ...ENEMY_PROFILES.elite_shield, id: "elite_shield", category: "elite", x: 300, y: 300, hp: 500, maxHp: 500, age: 1, nextFire: 99, drift: 0, turn: 0, scale: 1, ace: "aegis" };
  const ally = { ...ENEMY_PROFILES.normal_gunner, id: "normal_gunner", category: "normal", x: 360, y: 300, hp: 200, maxHp: 200, age: 1, nextFire: 99, drift: 0, turn: 0, scale: 1, ace: null };
  combat.enemies.push(aegis, ally);
  combat.strikeAreaTarget(ally, 100);
  assert.equal(ally.hp, 135);

  const splitter = { ...ENEMY_PROFILES.elite_fighter, id: "elite_fighter", category: "elite", x: 420, y: 300, hp: 10, maxHp: 10, age: 1, nextFire: 99, drift: 0, turn: 0, scale: 1, ace: "splitter" };
  combat.enemies.push(splitter);
  combat.strikeAreaTarget(splitter, 50);
  assert.equal(combat.enemies.filter((e) => e.id === "normal_bomber" && e.summoned).length, 3);
});

test("achievements unlock on endless progression, gold rain, and flawless boss kill", () => {
  const { session: s, combat } = start("01_chifeng", () => 0.5, { mode: "endless" });
  s.stage = 4;
  s.bestCombo = 60;
  for (let i = 0; i < 42; i++) combat.enemyShots.push(roundAt(100 + i * 10, 400));
  s.energy = 100;
  combat.triggerOverload();
  advance(combat, 20);
  assert(s.unlockedInRun.includes("gold_rain"));
  assert(s.unlockedInRun.includes("endless_s4"));
  assert(s.unlockedInRun.includes("combo_60"));
  assert(combat.events.some((e) => e.type === "achievement" && e.id === "gold_rain"));
});
