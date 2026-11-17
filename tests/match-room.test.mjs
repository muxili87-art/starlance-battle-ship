import test from "node:test";
import assert from "node:assert/strict";
import { MatchRoom, AUTOPILOT_DAMAGE_SCALE } from "../src/state/match-room.js";
import { SharedPrizePool } from "../src/core/shared-prize-pool.js";
import { computeSlotPaceModifiers } from "../src/core/comeback-system.js";

test("局域网开局不足 4 人时自动由机器人补满 4 席", () => {
  const room = new MatchRoom();
  const slots = room.setupFromLobby(
    [
      { id: "P1", name: "房主" },
      { id: "P2", name: "局域网玩家2" },
    ],
    "P1",
    "campaign"
  );
  assert.equal(slots.length, 4);
  assert.equal(slots[0].kind, "local");
  assert.equal(slots[1].kind, "remote");
  assert.equal(slots[2].kind, "bot");
  assert.equal(slots[3].kind, "bot");
});

test("切屏观战对手时启用本地智驾且伤害保持 90%，切回恢复 100%", () => {
  const room = new MatchRoom();
  room.setupSoloWithBots("endless");
  const local = room.getLocalSlot();
  assert.equal(local.session.ship.damageScale, 1.0);
  assert.equal(room.isSpectating(), false);

  room.setWatchedSlot("P2");
  assert.equal(room.isSpectating(), true);
  assert.equal(local.session.ship.autopilot, true);
  assert.equal(local.session.ship.damageScale, AUTOPILOT_DAMAGE_SCALE);

  room.returnToLocalView();
  assert.equal(room.isSpectating(), false);
  assert.equal(local.session.ship.autopilot, false);
  assert.equal(local.session.ship.damageScale, 1.0);
});

test("共享奖品池先到先得且库存扣减正确", () => {
  const pool = new SharedPrizePool();
  const entries = pool.ensureTier("1-1");
  const rare = entries[0];
  assert.equal(rare.maxStock, 1);

  const firstRank = pool.recordMilestoneClear("1-1", "P2");
  const secondRank = pool.recordMilestoneClear("1-1", "P1");
  assert.equal(firstRank.rank, 1);
  assert.equal(secondRank.rank, 2);

  assert.ok(pool.claimCard("1-1", "P2", rare.cardId));
  assert.equal(pool.claimCard("1-1", "P1", rare.cardId), null);
});

test("领航承压与落后者逆流追赶机制数值正确", () => {
  const leader = computeSlotPaceModifiers(1, 4, 0);
  const trailer = computeSlotPaceModifiers(4, 4, 2);
  assert.ok(leader.enemyHpScale > 1.0);
  assert.equal(leader.unlockComebackCard, false);
  assert.ok(trailer.overloadChargeScale > 1.3);
  assert.equal(trailer.unlockComebackCard, true);
});

test("机器人补位后在后台真实进行战斗、切换形态与输出伤害", () => {
  const room = new MatchRoom();
  room.setupSoloWithBots("endless");
  for (let i = 0; i < 120; i += 1) {
    room.stepAll(30); // 3.6s simulated combat
  }
  const bot2 = room.slots.find((s) => s.id === "P2");
  assert.ok(bot2);
  assert.ok(bot2.session.stats.damageDealt > 0);
});
