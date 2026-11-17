const BASE_PATTERNS = Object.freeze({
  redline: Object.freeze({
    id: "redline-rescue",
    label: "红线抢救 · 快攻 / 远端积压",
    pressures: Object.freeze(["快攻", "积压"]),
    units: Object.freeze([
      Object.freeze({ type: "striker", sector: 0, offset: 0, entryY: 176 }),
      Object.freeze({ type: "scout", sector: 2, offset: -34, entryY: 224 }),
      Object.freeze({ type: "scout", sector: 2, offset: 34, entryY: 244 }),
    ]),
  }),
  rushMass: Object.freeze({
    id: "rush-vs-mass",
    label: "截击抉择 · 双突击 / 重装舰群",
    pressures: Object.freeze(["快攻", "数量积压"]),
    units: Object.freeze([
      Object.freeze({ type: "striker", sector: 0, offset: -28, entryY: 170 }),
      Object.freeze({ type: "striker", sector: 0, offset: 28, entryY: 222 }),
      Object.freeze({ type: "frigate", sector: 2, offset: 0, entryY: 166 }),
      Object.freeze({ type: "scout", sector: 2, offset: -56, entryY: 224 }),
      Object.freeze({ type: "scout", sector: 2, offset: 0, entryY: 246 }),
      Object.freeze({ type: "scout", sector: 2, offset: 56, entryY: 232 }),
    ]),
  }),
  sourceBreach: Object.freeze({
    id: "source-vs-breach",
    label: "源头抉择 · 增幅源 / 直接突破",
    pressures: Object.freeze(["辅助源", "快攻"]),
    units: Object.freeze([
      Object.freeze({ type: "relay", sector: 0, offset: -32, entryY: 184 }),
      Object.freeze({ type: "splitter", sector: 0, offset: 32, entryY: 230 }),
      Object.freeze({ type: "frigate", sector: 1, offset: 0, entryY: 174 }),
      Object.freeze({ type: "striker", sector: 2, offset: -28, entryY: 174 }),
      Object.freeze({ type: "striker", sector: 2, offset: 28, entryY: 226 }),
    ]),
  }),
  triage: Object.freeze({
    id: "three-sector-triage",
    label: "三线裁决 · 护送 / 快攻 / 增幅",
    pressures: Object.freeze(["护送积压", "快攻", "辅助源"]),
    units: Object.freeze([
      Object.freeze({ type: "shield", sector: 0, offset: -28, entryY: 176 }),
      Object.freeze({ type: "frigate", sector: 0, offset: 34, entryY: 224 }),
      Object.freeze({ type: "striker", sector: 1, offset: 0, entryY: 170 }),
      Object.freeze({ type: "relay", sector: 2, offset: -32, entryY: 188 }),
      Object.freeze({ type: "scout", sector: 2, offset: 34, entryY: 236 }),
    ]),
  }),
  overload: Object.freeze({
    id: "overload-crossfire",
    label: "过载窗口 · 双翼快攻 / 中枢舰群",
    pressures: Object.freeze(["双翼快攻", "密集积压"]),
    units: Object.freeze([
      Object.freeze({ type: "striker", sector: 0, offset: -26, entryY: 170 }),
      Object.freeze({ type: "striker", sector: 0, offset: 30, entryY: 226 }),
      Object.freeze({ type: "frigate", sector: 1, offset: 0, entryY: 166 }),
      Object.freeze({ type: "scout", sector: 1, offset: -48, entryY: 228 }),
      Object.freeze({ type: "scout", sector: 1, offset: 48, entryY: 244 }),
      Object.freeze({ type: "striker", sector: 2, offset: -30, entryY: 224 }),
      Object.freeze({ type: "striker", sector: 2, offset: 26, entryY: 172 }),
    ]),
  }),
  recovery: Object.freeze({
    id: "recovery-intercept",
    label: "防线收束 · 单点快攻 / 轻型牵制",
    pressures: Object.freeze(["单点快攻", "轻型牵制"]),
    units: Object.freeze([
      Object.freeze({ type: "striker", sector: 0, offset: 0, entryY: 180 }),
      Object.freeze({ type: "scout", sector: 2, offset: -30, entryY: 224 }),
      Object.freeze({ type: "scout", sector: 2, offset: 30, entryY: 244 }),
    ]),
  }),
});

function mirrored(pattern, shouldMirror) {
  if (!pattern || !shouldMirror) return pattern;
  return {
    ...pattern,
    units: pattern.units.map((unit) => ({ ...unit, sector: 2 - unit.sector, offset: -unit.offset })),
  };
}

export function pressurePatternFor({ state = "clash", index = 0, overloadReady = false, coreHealth = 100 } = {}) {
  if (state === "breath") return null;
  let pattern;
  if (coreHealth < 35) pattern = BASE_PATTERNS.recovery;
  else if (state === "extreme" && overloadReady) pattern = BASE_PATTERNS.overload;
  else if (state === "extreme") pattern = index % 2 === 0 ? BASE_PATTERNS.triage : BASE_PATTERNS.sourceBreach;
  else if (state === "high") pattern = index % 2 === 0 ? BASE_PATTERNS.rushMass : BASE_PATTERNS.sourceBreach;
  else pattern = BASE_PATTERNS.redline;
  return mirrored(pattern, index % 2 === 1);
}

export function canSpawnPressurePattern({ aliveCount = 0, unitCount = 0, maxEnemies = 22 } = {}) {
  return Math.max(0, aliveCount) + Math.max(0, unitCount) <= Math.max(0, maxEnemies);
}

export function upgradePressureGraceMs(tier = 1) {
  return [2600, 2200, 1800][Math.max(0, Math.min(2, Math.round(tier) - 1))];
}

export function pressureDirectorCanSpawn({ upgradeCount = 0, combatClock = 0, graceUntil = 0, bossActive = false } = {}) {
  return !bossActive && upgradeCount > 0 && combatClock >= graceUntil;
}
