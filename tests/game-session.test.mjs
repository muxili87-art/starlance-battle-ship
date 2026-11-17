import test from "node:test";
import assert from "node:assert/strict";
import { GameSession, GAME_PHASES } from "../src/state/game-session.js";
import { CombatLoop } from "../src/core/combat-loop.js";
import { resolveOrderedReaction } from "../src/core/weapon-forms.js";

test("GameSession 暂停/恢复、隐藏战机与过载生命周期稳定", () => {
  const session = new GameSession();
  session.startRun("endless");
  assert.equal(session.phase, GAME_PHASES.PLAYING);

  session.setShipVisible(false);
  const loop = new CombatLoop(session);
  const events = loop.step(16);
  assert.ok(Array.isArray(events));

  session.pause();
  assert.equal(session.phase, GAME_PHASES.PAUSED);
  assert.equal(loop.step(16).length, 0);

  session.resume();
  assert.equal(session.phase, GAME_PHASES.PLAYING);

  assert.equal(session.triggerOverload(), false);
  session.core.energy = session.core.maxEnergy;
  assert.equal(session.triggerOverload(), true);
  assert.equal(session.core.overloadActive, true);
  assert.equal(session.core.energy, 0);
});

test("敌舰突破核心扣除耐久并在归零时结束本局", () => {
  const session = new GameSession();
  session.startRun("endless");
  session.core.hp = 10;
  session.enemies.push({
    id: session.allocateId(),
    type: "scout",
    sector: 1,
    x: 360,
    y: 1082,
    vx: 0,
    vy: 200,
    baseSpeed: 200,
    mass: 1,
    hp: 30,
    maxHp: 30,
    radius: 22,
    hitFlashMs: 0,
    status: null,
    statusTimerMs: 0,
  });

  const loop = new CombatLoop(session);
  const events = loop.step(50);
  assert.equal(session.core.hp, 0);
  assert.equal(session.phase, GAME_PHASES.ENDED);
  assert.equal(session.result, "defeat");
  assert.ok(events.some((e) => e.type === "run-ended"));
});

test("三种武装形态切换、独立技能CD后台冷却及6种前后有序组合反应", () => {
  // Verify all 6 ordered reactions are unique
  const pairs = [
    ["resonance", "heavy"],
    ["fracture", "pulse"],
    ["resonance", "magnet"],
    ["magnet", "pulse"],
    ["fracture", "magnet"],
    ["magnet", "heavy"],
  ];
  const ids = new Set(pairs.map(([s, f]) => resolveOrderedReaction(s, f)?.id));
  assert.equal(ids.size, 6);

  const session = new GameSession();
  session.startRun("endless");
  const loop = new CombatLoop(session);

  // Skill requires 25 energy unless Overloaded
  assert.equal(loop.triggerActiveFormSkill([]), false);
  session.core.energy = 30;
  assert.equal(loop.triggerActiveFormSkill([]), true);
  assert.equal(session.core.energy, 5);
  assert.ok(session.formCooldowns.pulse > 0);
  assert.equal(session.switchForm("heavy"), true);
  session.core.energy = 30;
  assert.equal(loop.canCastSkill("heavy"), true);

  const cdBefore = session.formCooldowns.pulse;
  loop.step(50);
  assert.ok(session.formCooldowns.pulse < cdBefore);
});

test("重炮物理击退引发敌舰多米诺碰撞伤害", () => {
  const session = new GameSession();
  session.startRun("endless");
  session.enemies.push(
    { id: 101, type: "scout", sector: 1, x: 360, y: 500, vx: 0, vy: -320, baseSpeed: 80, mass: 1, hp: 50, maxHp: 50, radius: 22, hitFlashMs: 0, status: null, statusTimerMs: 0 },
    { id: 102, type: "scout", sector: 1, x: 360, y: 470, vx: 0, vy: 80, baseSpeed: 80, mass: 1, hp: 50, maxHp: 50, radius: 22, hitFlashMs: 0, status: null, statusTimerMs: 0 }
  );

  const loop = new CombatLoop(session);
  loop.step(16);
  assert.ok(session.enemies[0].hp < 50);
  assert.ok(session.enemies[1].hp < 50);
});
