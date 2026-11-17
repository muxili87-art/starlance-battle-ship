import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIP_SECTORS,
  SHIP_SECTOR_CENTERS,
  chooseMissileTarget,
  chooseShipTarget,
  overloadEnergyGain,
  shipSectorForX,
} from "../src/core/combat-rules.js";
import { buildStatsFor, createBuildState } from "../src/core/build-system.js";

test("三区坐标与索敌规则保持一致", () => {
  assert.equal(SHIP_SECTORS.length, 3);
  assert.equal(shipSectorForX(SHIP_SECTOR_CENTERS[0]), 0);
  assert.equal(shipSectorForX(SHIP_SECTOR_CENTERS[1]), 1);
  assert.equal(shipSectorForX(SHIP_SECTOR_CENTERS[2]), 2);

  const enemies = [
    { id: 1, x: SHIP_SECTOR_CENTERS[0], y: 400, hp: 40, type: "scout" },
    { id: 2, x: SHIP_SECTOR_CENTERS[1], y: 760, hp: 40, type: "striker" },
  ];
  const shipTarget = chooseShipTarget(enemies, 1, SHIP_SECTOR_CENTERS[1]);
  assert.equal(shipTarget?.id, 2);

  const missileTarget = chooseMissileTarget(enemies, 1, SHIP_SECTOR_CENTERS[1]);
  assert.ok(missileTarget);
});

test("初始构筑与过载能量增益计算正确", () => {
  const build = createBuildState();
  const stats = buildStatsFor(build);
  assert.ok(stats.damageMultiplier >= 1);
  assert.ok(overloadEnergyGain(100, true) > 0);
});
