export const SHIP_SECTORS = ["左翼", "中枢", "右翼"];
export const SHIP_SECTOR_CENTERS = [140, 360, 580];
export const SHIP_SECTOR_BOUNDS = [
  [30, 250],
  [250, 470],
  [470, 690],
];
export const SHIP_MOVE_BOUNDS = [30, 690];
export const SECTOR_SPAWN_MARGIN = 28;
export const AUTO_TARGET_HOLD_TIME = 300;
export const AUTO_BULLET_DAMAGE = 24;
export const AUTO_BULLET_INTERVAL = 260;
export const MISSILE_DAMAGE = 64;
export const MISSILE_LOCK_TIME = 820;
export const MISSILE_LOCK_DECAY_TIME = 260;
export const MISSILE_SALVO_INTERVAL = 1700;
export const MISSILE_SALVO_SIZE = 3;
export const MISSILE_TARGET_LOSS_RETENTION = 0.4;
export const MACHINEGUN_WEAKPOINT_HITS = 6;
export const MACHINEGUN_WEAKPOINT_DURATION_MS = 2400;
export const SWARM_RESCUE_WINDOW_MS = 3000;
// The reactor is deliberately smaller than its surrounding glow.  Enemies only
// score a breakthrough when they touch the reactor body, so the player gets a
// readable final approach instead of losing the core at the first outer ring.
export const CORE_LAYOUT = Object.freeze({
  centerY: 1090,
  bodyRadius: 26,
  integrityRadius: 46,
  glowRadius: 76,
  contactRadius: 10,
  pathExtensionPx: 148,
});
export const BATTLE_LAYOUT = Object.freeze({
  fieldTop: 140,
  entryMinY: 120,
  entryMaxY: 160,
  shipY: 970,
  minMainLinePx: 820,
  targetMainLinePx: 840,
});
export const MAX_NON_BOSS_ENEMIES = 22;
export const THREAT_RANK = Object.freeze({ breakthrough: 4, dangerous: 3, highValue: 2, cleanup: 1 });
export const OVERLOAD_MAX_ENERGY = 100;
export const OVERLOAD_DURATION = 8;
export const OVERLOAD_EMPTY_PAUSE_LIMIT = 2;
export const OVERLOAD_CROSS_SECTOR_DAMAGE = 0.7;
export const BOSS_OVERLOAD_LOCAL_DAMAGE = 0.45;
export const BOSS_OVERLOAD_CROSS_SECTOR_DAMAGE = 0.25;
export const BOSS_OVERLOAD_DAMAGE_CAP_RATIO = 0.34;
export const OVERLOAD_ENERGY_PER_DAMAGE = 0.075;
// Opening pressure is intentionally budgeted per encounter.  The full-domain
// entrance should feel urgent, but a player who misses every telegraph still
// needs a recoverable first read of the boss.
export const BOSS_OPENING_DAMAGE_BUDGET = 32;
// 真人反馈证明旧版 220px / 2.2s 才接管过晚：玩家已经看到小舰贴近核心，
// 火控却仍把远处的辅助舰当作主要目标。近防窗口前移，但只覆盖同区且
// 仍可拦截的目标，避免把战术索敌退化为“永远打最近”。
export const EMERGENCY_INTERCEPT_DISTANCE = 360;
export const EMERGENCY_INTERCEPT_TIME = 4.2;
export const EMERGENCY_INTERCEPT_BUFFER = 1.1;
export const EMERGENCY_WARNING_TIME = 5;
export const EMERGENCY_SWITCH_HOLD_MS = 240;
// D1.1 近防预备只提前“注意力”，不提前给伤害。进入真正拦截态后，
// 近防僚机才获得专属倍率，避免把全局僚机 DPS 当成修复索敌的手段。
export const NEAR_DEFENSE_PREP_TIME = 6;
export const NEAR_DEFENSE_PREP_BUFFER = 1.8;
export const NEAR_DEFENSE_INTERVAL_SCALE = 0.75;
export const NEAR_DEFENSE_DAMAGE_SCALE = 1.4;
export const NEAR_DEFENSE_FIRST_RESPONSE_MS = 450;
export const NEAR_DEFENSE_STATES = Object.freeze({
  observe: "observe",
  prepare: "prepare",
  intercept: "intercept",
  breakthrough: "breakthrough",
  excluded: "excluded",
});
export const PRESSURE_STATES = Object.freeze(["breath", "clash", "high", "extreme"]);
export const ENEMY_SPECIAL_TYPES = Object.freeze(["shield", "relay", "splitter"]);
export const ENEMY_SYNERGY_TYPES = Object.freeze({
  escort: { id: "escort", name: "护送冲锋", hint: "先拆护盾舰，再处理突袭艇" },
  swarm: { id: "swarm", name: "增殖洪流", hint: "先击破中继舰，阻止分裂加速" },
  heavy: { id: "heavy", name: "重装推进", hint: "点杀辅助舰，避免重舰拖住火力" },
});

// Boss 招式是独立的战场对象，不再把所有威胁压缩成一条共享读条。
// 数值集中在模型层，方便自动测试、QA 入口和两轮以内的数值校准。
export const BOSS_ATTACK_TYPES = Object.freeze({
  spear: Object.freeze({
    id: "spear",
    label: "断界裁决光矛",
    // 重复招式的最低预警；首次出场由 bossAttackTimingForType 提升到教学时长。
    telegraphMs: 1400,
    travelMs: 3200,
    hp: 180,
    enhancedHp: 220,
    coreDamage: 20,
    enhancedDamage: 22,
    counterDamage: 56,
    radius: 20,
  }),
  podAssault: Object.freeze({
    id: "pod-assault",
    label: "蜂巢突击舱",
    telegraphMs: 1300,
    travelMs: 3300,
    hp: 52,
    enhancedHp: 55,
    coreDamage: 7,
    enhancedDamage: 8,
    counterDamage: 0,
    radius: 15,
  }),
  podCommand: Object.freeze({
    id: "pod-command",
    label: "蜂巢指挥舱",
    telegraphMs: 1300,
    travelMs: 3300,
    hp: 102,
    enhancedHp: 110,
    // 指挥舱的伤害预算转为电磁状态；自然结束时只由 BOSS 状态机结算 6% 轻伤。
    coreDamage: 0,
    enhancedDamage: 0,
    counterDamage: 0,
    radius: 22,
  }),
  verdictAnchor: Object.freeze({
    id: "verdict-anchor",
    label: "黑日裁决锚",
    telegraphMs: 1800,
    travelMs: 0,
    hp: 160,
    enhancedHp: 170,
    coreDamage: 0,
    enhancedDamage: 0,
    counterDamage: 0,
    radius: 30,
  }),
});

const BOSS_ATTACK_TYPE_KEYS = Object.freeze({
  "pod-assault": "podAssault",
  "pod-command": "podCommand",
  "verdict-anchor": "verdictAnchor",
});

// 攻击时序是 Boss 的可读性契约，和伤害 / 血量分开维护，避免为了“更难”
// 把预警压短。first 只用于首次教学，其余重复招式使用 repeatTelegraphMs。
export const BOSS_ATTACK_TIMING = Object.freeze({
  // 0.45s 扫描 + 0.70s 跟踪 + 0.50s 锁定，预警本体保持细针而不是粗长线。
  // 旅行段自动补足到 5s，避免把反制窗口压短。
  spear: Object.freeze({ firstTelegraphMs: 1700, repeatTelegraphMs: 1650, minTotalMs: 5000 }),
  "pod-assault": Object.freeze({ firstTelegraphMs: 1600, repeatTelegraphMs: 1300, minTotalMs: 0 }),
  "pod-command": Object.freeze({ firstTelegraphMs: 1600, repeatTelegraphMs: 1300, minTotalMs: 0 }),
  "verdict-anchor": Object.freeze({ firstTelegraphMs: 1800, repeatTelegraphMs: 1800, minTotalMs: 0 }),
});

export const BOSS_PHASE_THRESHOLDS = Object.freeze({ phase2: 2 / 3, phase3: 1 / 3 });
export const BOSS_PHASE_TRANSITION = Object.freeze({
  2: Object.freeze({ durationMs: 2200, minimumMs: 1400 }),
  3: Object.freeze({ durationMs: 2500, minimumMs: 1600 }),
});
export const BOSS_PHASE_WATCHDOG_MS = 3200;
export const BOSS_EMP_DURATION_MS = 2200;
export const BOSS_EMP_NATURAL_DAMAGE = 6;
export const BOSS_EMP_IMMUNITY_MS = 1200;
export const BOSS_EMP_LAUNCH_GAP_MS = 9000;
export const BOSS_EMP_REAPPLY_GAP_MS = 6000;

export function bossPhaseTransitionEnd({
  startedAt = 0,
  durationMs = 0,
  minimumMs = 0,
  breakEnergy = 0,
  maxReductionMs = 800,
} = {}) {
  const start = Math.max(0, Number(startedAt) || 0);
  const baseEnd = start + Math.max(0, Number(durationMs) || 0);
  const minimumEnd = start + Math.max(0, Number(minimumMs) || 0);
  const reduction = Math.min(Math.max(0, Number(maxReductionMs) || 0), Math.round(Math.max(0, Number(breakEnergy) || 0) * 2));
  return Math.max(minimumEnd, baseEnd - reduction);
}

export function bossPhaseTransitionState({ now = 0, plannedEnd = 0, watchdogAt = 0 } = {}) {
  const current = Math.max(0, Number(now) || 0);
  const planned = Math.max(0, Number(plannedEnd) || 0);
  const watchdog = Math.max(0, Number(watchdogAt) || 0);
  const forced = watchdog > 0 && current >= watchdog;
  return Object.freeze({ ready: forced || (planned > 0 && current >= planned), forced });
}

export const BOSS_RIVAL_PROFILES = Object.freeze({
  observe: Object.freeze({ id: "observe", route: null, label: "初次识别", pattern: "fixed" }),
  barrage: Object.freeze({ id: "barrage", route: "crit", label: "压制弹幕路线", pattern: "pods-first" }),
  sever: Object.freeze({ id: "sever", route: "missile", label: "断链机动路线", pattern: "split-lanes" }),
  decapitate: Object.freeze({ id: "decapitate", route: "swarm", label: "斩首指挥路线", pattern: "spear-first" }),
});

export function bossDamageRouteForSource(source = "") {
  const key = String(source).toLowerCase();
  if (key.includes("missile") || key.includes("guided") || key.includes("split")) return "missile";
  if (key.includes("drone") || key.includes("swarm")) return "swarm";
  if (key.includes("auto") || key.includes("hunter") || key.includes("machinegun")) return "crit";
  return null;
}

export function bossRivalProfileForEncounter({ encounterCount = 1, routeDamage = {}, previousId = null } = {}) {
  const count = Math.max(1, Math.floor(Number(encounterCount) || 1));
  if (count <= 1) return BOSS_RIVAL_PROFILES.observe;
  const routes = ["crit", "missile", "swarm"];
  const dominant = routes.sort((left, right) => (Number(routeDamage[right]) || 0) - (Number(routeDamage[left]) || 0))[0];
  const mapped = dominant === "missile" ? BOSS_RIVAL_PROFILES.sever : dominant === "swarm" ? BOSS_RIVAL_PROFILES.decapitate : BOSS_RIVAL_PROFILES.barrage;
  if (mapped.id !== previousId) return mapped;
  const rotation = [BOSS_RIVAL_PROFILES.barrage, BOSS_RIVAL_PROFILES.sever, BOSS_RIVAL_PROFILES.decapitate];
  return rotation[(rotation.findIndex((profile) => profile.id === mapped.id) + 1) % rotation.length];
}

export function bossPhaseForIntegrity({ integrity = 1, phase = 1 } = {}) {
  const value = clamp(Number(integrity) || 0, 0, 1);
  const current = clamp(Math.round(phase), 1, 3);
  if (value <= BOSS_PHASE_THRESHOLDS.phase3) return 3;
  if (value <= BOSS_PHASE_THRESHOLDS.phase2) return Math.max(2, current);
  return current;
}

export function bossPhaseGateForDamage({ remainingHp = 0, totalHp = 1, phase = 1, damage = 0 } = {}) {
  const safeTotal = Math.max(1, Number(totalHp) || 1);
  const safeRemaining = clamp(Number(remainingHp) || 0, 0, safeTotal);
  const safeDamage = Math.max(0, Number(damage) || 0);
  const normalizedPhase = clamp(Math.round(phase), 1, 3);
  const thresholdRatio = normalizedPhase === 1 ? BOSS_PHASE_THRESHOLDS.phase2 : normalizedPhase === 2 ? BOSS_PHASE_THRESHOLDS.phase3 : 0;
  const thresholdHp = safeTotal * thresholdRatio;
  const allowedDamage = normalizedPhase >= 3 ? safeDamage : Math.max(0, safeRemaining - thresholdHp);
  const appliedDamage = Math.min(safeDamage, allowedDamage);
  return Object.freeze({
    thresholdHp,
    allowedDamage,
    appliedDamage,
    overflowDamage: Math.max(0, safeDamage - appliedDamage),
    reached: normalizedPhase < 3 && safeRemaining - appliedDamage <= thresholdHp + 0.0001,
    nextPhase: normalizedPhase >= 3 ? 3 : normalizedPhase + 1,
  });
}

export function bossEmpCanClear({ active = false, startSector = null, nextSector = null } = {}) {
  return Boolean(active && Number.isInteger(startSector) && Number.isInteger(nextSector) && startSector !== nextSector);
}

export function bossEmpNaturalDamage({ active = false, elapsedMs = 0, durationMs = BOSS_EMP_DURATION_MS } = {}) {
  return active && Number(elapsedMs) >= Number(durationMs) ? BOSS_EMP_NATURAL_DAMAGE : 0;
}

export function bossAttackTimingForType(type = "spear", { first = false } = {}) {
  const key = BOSS_ATTACK_TYPE_KEYS[type] ? type : type === "podAssault" ? "pod-assault" : type === "podCommand" ? "pod-command" : type === "verdictAnchor" ? "verdict-anchor" : type;
  const timing = BOSS_ATTACK_TIMING[key] ?? BOSS_ATTACK_TIMING.spear;
  return Object.freeze({
    ...timing,
    telegraphMs: first ? timing.firstTelegraphMs : timing.repeatTelegraphMs,
    first: Boolean(first),
  });
}

export function bossMajorGapMs(phase = 1) {
  const normalizedPhase = clamp(Math.round(phase), 1, 3);
  return normalizedPhase === 3 ? 3800 : normalizedPhase === 2 ? 4200 : 4800;
}

export function bossOpeningDamageFor(damage = 0, dealt = 0, budget = BOSS_OPENING_DAMAGE_BUDGET) {
  const remaining = Math.max(0, Number(budget) - Math.max(0, Number(dealt)));
  return Math.max(0, Math.min(Math.max(0, Number(damage)), remaining));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function machinegunVisualProfile({ overload = false, critical = false, level = 0 } = {}) {
  const routeLevel = clamp(Math.round(level), 0, 3);
  // 主战机的可见射线预算：基础 1、强化 2，过载普通 3、过载暴击 4。
  // 每颗子弹会在运行时从自己的炮口绘制一条线，避免再次展开成 N×N。
  const barrelCount = overload && routeLevel >= 1 ? (critical ? 4 : 3) : routeLevel >= 1 ? 2 : 1;
  return Object.freeze({
    barrelCount,
    barrelSpacing: barrelCount >= 2 ? 18 : 0,
    densityScale: overload ? (routeLevel >= 1 ? 1.9 : 1.55) : 1,
    tracerWidth: overload ? 6 : critical ? 5 : barrelCount >= 2 ? 4 : 3,
    glowWidth: overload ? 12 : critical ? 10 : barrelCount >= 2 ? 8 : 7,
    impactRadius: overload ? 34 : critical ? 28 : barrelCount >= 2 ? 22 : 18,
    tracerColor: critical ? "yellow" : overload ? "cyanBright" : "cyan",
  });
}

export function machinegunDamageParts(totalDamage = 0, barrelCount = 1) {
  const count = clamp(Math.round(barrelCount), 1, 4);
  const total = Math.max(0, Math.round(totalDamage));
  if (!total) return Array.from({ length: count }, () => 0);
  const weights = count >= 4 ? [0.32, 0.28, 0.22, 0.18] : count === 3 ? [0.4, 0.34, 0.26] : count === 2 ? [0.58, 0.42] : [1];
  const parts = [];
  let assigned = 0;
  for (let index = 0; index < count; index += 1) {
    const part = index === count - 1 ? Math.max(1, total - assigned) : Math.max(1, Math.round(total * weights[index]));
    parts.push(part);
    assigned += part;
  }
  parts[parts.length - 1] += total - parts.reduce((sum, part) => sum + part, 0);
  return parts;
}

export function machinegunVolleyParts(totalDamage = 0, barrelCount = 1, { critical = false, volleyId = null } = {}) {
  return Object.freeze(machinegunDamageParts(totalDamage, barrelCount).map((damage, index) => Object.freeze({
    damage,
    source: critical ? "crit" : "auto",
    critical: Boolean(critical),
    criticalProc: Boolean(critical) && index === 0,
    volleyId,
  })));
}

export function overloadEnergyGain({ effectiveDamage = 0, targetType = "scout", isBossPart = false } = {}) {
  const threatBonus = isBossPart ? 5 : targetType === "frigate" ? 2.5 : targetType === "relay" ? 2 : targetType === "shield" ? 1.8 : targetType === "splitter" ? 1.4 : targetType === "striker" ? 1.2 : 0.25;
  return Math.max(0, effectiveDamage) * OVERLOAD_ENERGY_PER_DAMAGE + threatBonus;
}

export function pressureScoreForSignals({ killsPerSecond = 0, backlog = 0, highThreats = 0, recentCoreLoss = 0, overloadReady = false } = {}) {
  return clamp(50 + killsPerSecond * 14 - backlog * 4 - highThreats * 7 - recentCoreLoss * 10 + (overloadReady ? 8 : 0), 0, 100);
}

export function pressureStateForScore(score = 50, current = "clash") {
  const value = clamp(score, 0, 100);
  const index = PRESSURE_STATES.indexOf(current);
  if (index < 0) return value >= 79 ? "extreme" : value >= 61 ? "high" : value <= 38 ? "breath" : "clash";
  if (value >= 79 && index < 3) return PRESSURE_STATES[index + 1];
  if (value <= 38 && index > 0) return PRESSURE_STATES[index - 1];
  return current;
}

export function pressureEventForElapsed(elapsed = 0) {
  if (elapsed < 6) return "breath";
  if (elapsed < 18) return "clash";
  if (elapsed < 34) return "high";
  if (elapsed < 54) return "high";
  if (elapsed < 66) return "extreme";
  return "boss";
}

export function shipXForPointer(x) {
  return clamp(Number.isFinite(x) ? x : SHIP_SECTOR_CENTERS[1], SHIP_MOVE_BOUNDS[0], SHIP_MOVE_BOUNDS[1]);
}

export function battleEntryY(y = BATTLE_LAYOUT.entryMinY, index = 0) {
  const stagger = (Math.max(0, Math.round(index)) % 3) * 8;
  return clamp(Math.round(y) - 60 + stagger, BATTLE_LAYOUT.entryMinY, BATTLE_LAYOUT.entryMaxY);
}

export function mainBattleLineLength(spawnY = BATTLE_LAYOUT.entryMinY, shipY = BATTLE_LAYOUT.shipY) {
  return Math.max(0, Math.round(shipY) - Math.round(spawnY));
}

export function shipSectorForX(x) {
  if (x < SHIP_SECTOR_BOUNDS[0][1]) return 0;
  if (x < SHIP_SECTOR_BOUNDS[1][1]) return 1;
  return 2;
}

export function shipSectorRange(sector) {
  return SHIP_SECTOR_BOUNDS[clamp(Math.round(sector), 0, 2)];
}

export function nextShipSector(currentSector, direction) {
  return clamp(Math.round(currentSector) + Math.sign(direction), 0, 2);
}

export function sectorSpawnRange(sector, extraMargin = 0) {
  const [min, max] = shipSectorRange(sector);
  const margin = Math.max(0, SECTOR_SPAWN_MARGIN + Number(extraMargin || 0));
  return [min + margin, max - margin];
}

export function safeSpawnXForSector(x, sector = shipSectorForX(x), extraMargin = 0) {
  const safeSector = clamp(Math.round(sector), 0, 2);
  const [min, max] = sectorSpawnRange(safeSector, extraMargin);
  return clamp(Number.isFinite(x) ? x : SHIP_SECTOR_CENTERS[safeSector], min, max);
}

export function enemySector(enemy) {
  if (Number.isInteger(enemy?.combatSector)) return clamp(enemy.combatSector, 0, 2);
  if (Number.isInteger(enemy?.sector)) return clamp(enemy.sector, 0, 2);
  return shipSectorForX(enemy?.x ?? SHIP_SECTOR_CENTERS[1]);
}

export function enemyTimeToCore(enemy, coreY = 1015) {
  if (Number.isFinite(enemy?.timeToCore)) return enemy.timeToCore;
  const remaining = Math.max(0, coreY - (enemy.y ?? 0));
  return remaining / Math.max(1, enemy.speed ?? 1);
}

export function enemyCoreDistance(enemy, coreY = 1015) {
  return Math.max(0, coreY - (enemy?.y ?? 0));
}

export function enemyTimeToKill(enemy, { damage = AUTO_BULLET_DAMAGE, interval = AUTO_BULLET_INTERVAL, projectileTime = 0.2 } = {}) {
  const hp = Math.max(1, enemy?.hp ?? enemy?.maxHp ?? 1);
  const shots = Math.max(1, Math.ceil(hp / Math.max(1, damage)));
  return Math.max(0, (shots - 1) * interval / 1000 + projectileTime);
}

export function enemyInterceptProfile(enemy, {
  coreY = 1015,
  damage = AUTO_BULLET_DAMAGE,
  interval = AUTO_BULLET_INTERVAL,
  projectileTime = 0.2,
  committedDamage = 0,
  emergencyDistance = EMERGENCY_INTERCEPT_DISTANCE,
  emergencyTime = EMERGENCY_INTERCEPT_TIME,
  emergencyBuffer = EMERGENCY_INTERCEPT_BUFFER,
  warningTime = EMERGENCY_WARNING_TIME,
} = {}) {
  const eta = enemyTimeToCore(enemy, coreY);
  const reserved = Math.max(0, Number(committedDamage) || 0);
  const effectiveHp = Math.max(1, (enemy?.hp ?? enemy?.maxHp ?? 1) - reserved);
  const ttk = enemyTimeToKill({ ...enemy, hp: effectiveHp, maxHp: effectiveHp }, { damage, interval, projectileTime });
  const distance = enemyCoreDistance(enemy, coreY);
  const emergency = distance <= emergencyDistance || eta <= Math.max(emergencyTime, ttk + emergencyBuffer);
  const warning = !emergency && (enemy?.type === "striker" || enemy?.type === "shard") && eta <= warningTime;
  return Object.freeze({
    distance,
    eta,
    ttk,
    margin: eta - ttk,
    emergency,
    warning,
    saveable: eta + 0.05 >= ttk,
  });
}

export function isEmergencyTarget(enemy, options = {}) {
  return enemyInterceptProfile(enemy, options).emergency;
}

function committedDamageForTarget(committedDamageById, target) {
  if (!target) return 0;
  return committedDamageById instanceof Map
    ? committedDamageById.get(target.id) ?? 0
    : Number(committedDamageById?.[target.id] ?? 0);
}

function nearDefenseDamageForTarget(enemy, currentSector, damage, crossSectorDamageScale = 1) {
  return enemySector(enemy) === currentSector ? damage : damage * crossSectorDamageScale;
}

function nearDefenseStateRank(state) {
  return state === NEAR_DEFENSE_STATES.intercept ? 2 : state === NEAR_DEFENSE_STATES.prepare ? 1 : 0;
}

function nearDefenseLocalRank(enemy, currentSector) {
  return enemySector(enemy) === currentSector ? 1 : 0;
}

export function nearDefenseStateFor(enemy, {
  coreY = 1015,
  damage = AUTO_BULLET_DAMAGE,
  interval = AUTO_BULLET_INTERVAL,
  projectileTime = 0.2,
  committedDamage = 0,
  prepTime = NEAR_DEFENSE_PREP_TIME,
  prepBuffer = NEAR_DEFENSE_PREP_BUFFER,
  emergencyDistance = EMERGENCY_INTERCEPT_DISTANCE,
  emergencyTime = EMERGENCY_INTERCEPT_TIME,
  emergencyBuffer = EMERGENCY_INTERCEPT_BUFFER,
  warningTime = EMERGENCY_WARNING_TIME,
} = {}) {
  if (!enemy || enemy.dead || enemy.isBoss || enemy.isBossCore || enemy.isBossAttack || enemy.isBossWeapon) {
    return Object.freeze({ state: NEAR_DEFENSE_STATES.excluded, actionable: false, boosted: false, saveable: false, emergency: false, distance: Infinity, eta: Infinity, ttk: Infinity, margin: -Infinity, warning: false });
  }
  const profile = enemyInterceptProfile(enemy, {
    coreY,
    damage,
    interval,
    projectileTime,
    committedDamage,
    emergencyDistance,
    emergencyTime,
    emergencyBuffer,
    warningTime,
  });
  const state = profile.emergency
    ? (profile.saveable ? NEAR_DEFENSE_STATES.intercept : NEAR_DEFENSE_STATES.breakthrough)
    : profile.saveable && (profile.eta <= prepTime || profile.eta <= profile.ttk + prepBuffer)
      ? NEAR_DEFENSE_STATES.prepare
      : NEAR_DEFENSE_STATES.observe;
  return Object.freeze({
    ...profile,
    state,
    actionable: state === NEAR_DEFENSE_STATES.prepare || state === NEAR_DEFENSE_STATES.intercept,
    boosted: state === NEAR_DEFENSE_STATES.intercept,
  });
}

export function chooseNearDefenseTarget(enemies, currentSector, {
  coreY = 1015,
  damage = AUTO_BULLET_DAMAGE,
  interval = AUTO_BULLET_INTERVAL,
  projectileTime = 0.2,
  committedDamageById = null,
  allowAdjacent = false,
  crossSectorDamageScale = 1,
  prepTime = NEAR_DEFENSE_PREP_TIME,
  prepBuffer = NEAR_DEFENSE_PREP_BUFFER,
} = {}) {
  const candidates = enemies
    .filter((enemy) => {
      if (!enemy || enemy.dead) return false;
      const distance = Math.abs(enemySector(enemy) - currentSector);
      if (distance !== 0 && (!allowAdjacent || distance !== 1)) return false;
      const committedDamage = committedDamageForTarget(committedDamageById, enemy);
      const effectiveDamage = nearDefenseDamageForTarget(enemy, currentSector, damage, crossSectorDamageScale);
      const state = nearDefenseStateFor(enemy, { coreY, damage: effectiveDamage, interval, projectileTime, committedDamage, prepTime, prepBuffer });
      return state.actionable;
    })
    .map((enemy) => {
      const committedDamage = committedDamageForTarget(committedDamageById, enemy);
      const effectiveDamage = nearDefenseDamageForTarget(enemy, currentSector, damage, crossSectorDamageScale);
      const state = nearDefenseStateFor(enemy, { coreY, damage: effectiveDamage, interval, projectileTime, committedDamage, prepTime, prepBuffer });
      return { enemy, state, committedDamage, effectiveDamage };
    })
    .filter(({ state, enemy }) => state.actionable && state.saveable && (enemy.hp ?? enemy.maxHp ?? 0) > 0)
    .sort((left, right) => {
      const stateDiff = nearDefenseStateRank(right.state.state) - nearDefenseStateRank(left.state.state);
      if (stateDiff) return stateDiff;
      const localDiff = nearDefenseLocalRank(right.enemy, currentSector) - nearDefenseLocalRank(left.enemy, currentSector);
      if (localDiff) return localDiff;
      const marginDiff = left.state.margin - right.state.margin;
      if (Math.abs(marginDiff) > 0.05) return marginDiff;
      const etaDiff = left.state.eta - right.state.eta;
      if (Math.abs(etaDiff) > 0.05) return etaDiff;
      return compareThreat(left.enemy, right.enemy, coreY);
    });
  return candidates[0]?.enemy ?? null;
}

export function resolveNearDefenseTarget({
  targets = [],
  sector,
  currentTarget = null,
  options = {},
  committedDamageById = new Map(),
  allowAdjacent = false,
  crossSectorDamageScale = 1,
  combatClock = 0,
  lastEmergencySwitchAt = null,
} = {}) {
  const candidate = chooseNearDefenseTarget(targets, sector, {
    ...options,
    committedDamageById,
    allowAdjacent,
    crossSectorDamageScale,
  });
  if (!candidate) return null;
  const candidateCommitted = committedDamageById.get(candidate.id) ?? 0;
  const candidateState = nearDefenseStateFor(candidate, { ...options, committedDamage: candidateCommitted });
  if (!currentTarget || currentTarget.id === candidate.id) return { target: candidate, state: candidateState.state, profile: candidateState };
  const currentCommitted = committedDamageById.get(currentTarget.id) ?? 0;
  const currentState = nearDefenseStateFor(currentTarget, { ...options, committedDamage: currentCommitted });
  const recentSwitch = combatClock - (lastEmergencySwitchAt ?? -Infinity) < EMERGENCY_SWITCH_HOLD_MS;
  const currentRank = (currentState.state === "intercept" ? 2 : currentState.state === "prepare" ? 1 : 0) + (enemySector(currentTarget) === sector ? 0.1 : 0);
  const candidateRank = (candidateState.state === "intercept" ? 2 : candidateState.state === "prepare" ? 1 : 0) + (enemySector(candidate) === sector ? 0.1 : 0);
  if (currentState.actionable && currentState.saveable && (recentSwitch || currentRank >= candidateRank)) {
    return { target: currentTarget, state: currentState.state, profile: currentState };
  }
  return { target: candidate, state: candidateState.state, profile: candidateState };
}

export function enemyThreatRank(enemy, coreY = 1015) {
  if (enemy.timeToCore != null ? enemy.timeToCore <= 1.5 : enemyTimeToCore(enemy, coreY) <= 1.5) return THREAT_RANK.breakthrough;
  if (enemy.charging || enemy.attackStarted || enemy.type === "striker" || enemy.isBossWeapon || enemy.isBossAttack) return THREAT_RANK.dangerous;
  if (["frigate", "shield", "relay", "splitter"].includes(enemy.type) || enemy.isBossCore || enemy.maxHp >= 110) return THREAT_RANK.highValue;
  return THREAT_RANK.cleanup;
}

export function enemyThreatDescriptor(enemy, coreY = 1015) {
  if (enemy?.type === "shield") return "护盾源";
  if (enemy?.type === "relay") return "增幅源";
  if (enemy?.type === "splitter") return "分裂源";
  const rank = enemyThreatRank(enemy, coreY);
  return rank === THREAT_RANK.breakthrough ? "立即突破" : rank === THREAT_RANK.dangerous ? "危险动作" : rank === THREAT_RANK.highValue ? "高价值" : "普通清理";
}

export function enemySpecialInfo(type) {
  return {
    shield: { name: "护盾舰", ability: "保护附近单位", color: "#65e7f5" },
    relay: { name: "中继舰", ability: "加速附近单位", color: "#ffcf66" },
    splitter: { name: "分裂舰", ability: "击毁后生成碎片", color: "#ff8b70" },
    shard: { name: "碎片艇", ability: "快速冲向核心", color: "#ffb39b" },
  }[type] ?? null;
}

export function enemySynergyForTypes(types = []) {
  const set = new Set(types);
  if (set.has("shield") && set.has("striker")) return ENEMY_SYNERGY_TYPES.escort;
  if (set.has("relay") && set.has("splitter")) return ENEMY_SYNERGY_TYPES.swarm;
  if (set.has("frigate") && (set.has("shield") || set.has("relay"))) return ENEMY_SYNERGY_TYPES.heavy;
  return null;
}

export function resolveEnemySynergyPlan(enemies = []) {
  const alive = enemies.filter((enemy) => !enemy.dead && !enemy.isBoss && !enemy.isBossAttack && !enemy.isFragment);
  const updates = [];
  const plannedSpeed = new Map();
  for (const enemy of alive) {
    const speed = enemy.baseSpeed ?? enemy.speed;
    plannedSpeed.set(enemy, speed);
    updates.push({ enemy, fields: { shieldedBy: null, relayTargets: [], relayBoosted: false, speed } });
  }

  for (const shield of alive.filter((enemy) => enemy.type === "shield")) {
    const candidates = alive
      .filter((enemy) => enemy.id !== shield.id && enemySector(enemy) === enemySector(shield) && ["striker", "frigate", "scout", "splitter"].includes(enemy.type))
      .sort((left, right) => {
        const leftX = shield.x - left.x;
        const leftY = shield.y - left.y;
        const rightX = shield.x - right.x;
        const rightY = shield.y - right.y;
        return Math.sqrt(leftX * leftX + leftY * leftY) - Math.sqrt(rightX * rightX + rightY * rightY);
      })
      .slice(0, 2);
    for (const target of candidates) updates.push({ enemy: target, fields: { shieldedBy: shield.id } });
  }

  for (const relay of alive.filter((enemy) => enemy.type === "relay")) {
    const relayTargets = alive
      .filter((enemy) => {
        if (enemy.id === relay.id || enemySector(enemy) !== enemySector(relay)) return false;
        const dx = relay.x - enemy.x;
        const dy = relay.y - enemy.y;
        return Math.sqrt(dx * dx + dy * dy) <= 160;
      })
      .sort((left, right) => {
        const leftX = relay.x - left.x;
        const leftY = relay.y - left.y;
        const rightX = relay.x - right.x;
        const rightY = relay.y - right.y;
        return Math.sqrt(leftX * leftX + leftY * leftY) - Math.sqrt(rightX * rightX + rightY * rightY);
      })
      .slice(0, 3);
    updates.push({ enemy: relay, fields: { relayTargets } });
    for (const target of relayTargets) {
      const speed = (target.baseSpeed ?? plannedSpeed.get(target)) * (target.type === "splitter" ? 1.22 : 1.14);
      plannedSpeed.set(target, speed);
      updates.push({ enemy: target, fields: { relayBoosted: true, speed } });
    }
  }

  const activeTypes = [...new Set(alive.map((enemy) => enemy.type))];
  return { updates, synergy: enemySynergyForTypes(activeTypes) };
}

export function bossCommandForSide(side = 0) {
  return side === 1 ? "swarm" : "escort";
}

export function compareThreat(left, right, coreY = 1015) {
  const rankDiff = enemyThreatRank(right, coreY) - enemyThreatRank(left, coreY);
  if (rankDiff) return rankDiff;
  const timeDiff = enemyTimeToCore(left, coreY) - enemyTimeToCore(right, coreY);
  if (Math.abs(timeDiff) > 0.001) return timeDiff;
  const damageDiff = (right.coreDamage ?? right.damage ?? 0) - (left.coreDamage ?? left.damage ?? 0);
  if (damageDiff) return damageDiff;
  const hpDiff = (right.hp ?? 0) - (left.hp ?? 0);
  if (hpDiff) return hpDiff;
  return String(left.id ?? "").localeCompare(String(right.id ?? ""));
}

export function compareInterceptPriority(left, right, {
  coreY = 1015,
  damage = AUTO_BULLET_DAMAGE,
  interval = AUTO_BULLET_INTERVAL,
  projectileTime = 0.2,
  committedDamage = 0,
  rightCommittedDamage = 0,
} = {}) {
  const leftProfile = enemyInterceptProfile(left, { coreY, damage, interval, projectileTime, committedDamage });
  const rightProfile = enemyInterceptProfile(right, { coreY, damage, interval, projectileTime, committedDamage: rightCommittedDamage });
  const leftActionable = leftProfile.emergency && leftProfile.saveable;
  const rightActionable = rightProfile.emergency && rightProfile.saveable;
  if (leftActionable !== rightActionable) return rightActionable ? 1 : -1;
  if (leftActionable && rightActionable) {
    const marginDiff = leftProfile.margin - rightProfile.margin;
    if (Math.abs(marginDiff) > 0.05) return marginDiff;
    const etaDiff = leftProfile.eta - rightProfile.eta;
    if (Math.abs(etaDiff) > 0.05) return etaDiff;
  }
  if (leftProfile.emergency && !leftProfile.saveable && !rightProfile.emergency) return 1;
  if (rightProfile.emergency && !rightProfile.saveable && !leftProfile.emergency) return -1;
  return compareThreat(left, right, coreY);
}

export function shipThreatScore(enemy, coreY = 1015) {
  return enemyThreatRank(enemy, coreY) * 1000 + clamp((1.5 - enemyTimeToCore(enemy, coreY)) * 100, 0, 150) + (enemy.coreDamage ?? enemy.damage ?? 0) * 4 + clamp((enemy.y / coreY) * 46, 0, 46);
}

export function missileThreatScore(enemy, coreY = 1015) {
  const typeThreat = enemyThreatRank(enemy, coreY) * 1000 + (enemy.isBossWeapon ? 260 : 0) + (enemy.isBossCore ? 180 : 0);
  const durability = clamp((enemy.maxHp ?? enemy.hp ?? 0) / 4, 0, 60);
  const proximity = clamp((enemy.y / coreY) * 42, 0, 42);
  return typeThreat + durability + proximity;
}

export function chooseShipTarget(enemies, currentSector, coreY = 1015) {
  return enemies
    .filter((enemy) => !enemy.dead && enemySector(enemy) === currentSector)
    .sort((left, right) => compareInterceptPriority(left, right, { coreY }) || shipThreatScore(right, coreY) - shipThreatScore(left, coreY))[0] ?? null;
}

export function chooseEmergencyTarget(enemies, currentSector, {
  coreY = 1015,
  damage = AUTO_BULLET_DAMAGE,
  interval = AUTO_BULLET_INTERVAL,
  projectileTime = 0.2,
  committedDamageById = null,
} = {}) {
  return enemies
    .filter((enemy) => {
      if (enemy.dead || enemySector(enemy) !== currentSector) return false;
      const committedDamage = committedDamageById instanceof Map
        ? committedDamageById.get(enemy.id) ?? 0
        : Number(committedDamageById?.[enemy.id] ?? 0);
      const profile = enemyInterceptProfile(enemy, { coreY, damage, interval, projectileTime, committedDamage });
      return profile.emergency && profile.saveable;
    })
    .sort((left, right) => {
      const leftCommitted = committedDamageById instanceof Map ? committedDamageById.get(left.id) ?? 0 : Number(committedDamageById?.[left.id] ?? 0);
      const rightCommitted = committedDamageById instanceof Map ? committedDamageById.get(right.id) ?? 0 : Number(committedDamageById?.[right.id] ?? 0);
      return compareInterceptPriority(left, right, { coreY, damage, interval, projectileTime, committedDamage: leftCommitted, rightCommittedDamage: rightCommitted });
    })[0] ?? null;
}

export function allocateDroneTargets(enemies, currentSector, {
  count = 2,
  coreY = 1015,
  damage = 15,
  interval = 760,
  projectileTime = 0.23,
  coveredIds = [],
  committedDamageById = null,
  escortDuty = false,
  crossSectorDamageScale = 1,
  prepTime = NEAR_DEFENSE_PREP_TIME,
  prepBuffer = NEAR_DEFENSE_PREP_BUFFER,
} = {}) {
  const safeCount = Math.max(0, Math.round(count));
  const covered = new Set(coveredIds);
  const local = enemies.filter((enemy) => !enemy.dead && enemySector(enemy) === currentSector);
  const isCovered = (enemy) => {
    if (covered.has(enemy.id)) return true;
    return committedDamageForTarget(committedDamageById, enemy) >= Math.max(1, enemy.hp ?? enemy.maxHp ?? 1) - 0.01;
  };
  const stateFor = (enemy) => nearDefenseStateFor(enemy, {
    coreY,
    damage: nearDefenseDamageForTarget(enemy, currentSector, damage, crossSectorDamageScale),
    interval,
    projectileTime,
    committedDamage: committedDamageForTarget(committedDamageById, enemy),
    prepTime,
    prepBuffer,
  });
  const nearSort = (left, right) => {
    const leftState = stateFor(left);
    const rightState = stateFor(right);
    const stateDiff = nearDefenseStateRank(rightState.state) - nearDefenseStateRank(leftState.state);
    if (stateDiff) return stateDiff;
    const marginDiff = leftState.margin - rightState.margin;
    if (Math.abs(marginDiff) > 0.05) return marginDiff;
    const etaDiff = leftState.eta - rightState.eta;
    if (Math.abs(etaDiff) > 0.05) return etaDiff;
    return compareThreat(left, right, coreY);
  };
  const localNear = local.filter((enemy) => !isCovered(enemy) && stateFor(enemy).actionable).sort(nearSort);
  const localTactical = local
    .filter((enemy) => !isCovered(enemy)
      && !localNear.includes(enemy)
      && stateFor(enemy).state !== NEAR_DEFENSE_STATES.breakthrough
      && stateFor(enemy).state !== NEAR_DEFENSE_STATES.excluded)
    .sort((left, right) => compareThreat(left, right, coreY));
  const localOrdered = [...localNear, ...localTactical];
  const selected = [];
  const localSlots = escortDuty && safeCount > 1 ? safeCount - 1 : safeCount;
  for (let index = 0; index < localSlots; index += 1) {
    const unclaimed = localOrdered.find((enemy) => !covered.has(enemy.id) && !isCovered(enemy));
    const target = unclaimed ?? localOrdered[index % Math.max(1, localOrdered.length)] ?? null;
    if (!target) break;
    selected.push(target);
    covered.add(target.id);
  }
  if (escortDuty && selected.length < safeCount) {
    const support = enemies
      .filter((enemy) => {
        if (enemy.dead || isCovered(enemy) || enemySector(enemy) === currentSector || Math.abs(enemySector(enemy) - currentSector) > 1) return false;
        return stateFor(enemy).actionable;
      })
      .sort(nearSort)[0] ?? null;
    if (support) {
      selected.push(support);
      covered.add(support.id);
    }
  }
  for (let index = selected.length; index < safeCount; index += 1) {
    const unclaimed = localOrdered.find((enemy) => !covered.has(enemy.id) && !isCovered(enemy));
    const target = unclaimed ?? localOrdered[index % Math.max(1, localOrdered.length)] ?? null;
    if (!target) break;
    selected.push(target);
    covered.add(target.id);
  }
  return selected;
}

export function machinegunWeakpointAfterHit({ progress = 0, targetChanged = false, threshold = MACHINEGUN_WEAKPOINT_HITS } = {}) {
  const safeThreshold = Math.max(1, Math.round(threshold));
  const retained = targetChanged ? Math.floor(Math.max(0, progress) * 0.5) : Math.max(0, progress);
  const next = Math.min(safeThreshold, retained + 1);
  return Object.freeze({ progress: next, exposed: next >= safeThreshold, threshold: safeThreshold });
}

export function canWeakpointExecute({ enabled = false, isBoss = false, hp = 0, maxHp = 1, pressure = 0, threshold = MACHINEGUN_WEAKPOINT_HITS, executeRatio = 0.25 } = {}) {
  if (!enabled || isBoss || hp <= 0) return false;
  const lowHealth = hp <= Math.max(1, maxHp) * Math.max(0, executeRatio);
  return lowHealth || pressure >= Math.max(1, threshold);
}

export function shouldArmSwarmRescue({ enabled = false, fromSector = 1, toSector = 1, targets = [], coreY = 1015 } = {}) {
  if (!enabled || fromSector === toSector) return false;
  return targets.some((enemy) => !enemy.dead
    && !enemy.isBoss
    && !enemy.isBossCore
    && !enemy.isBossAttack
    && !enemy.isBossWeapon
    && enemySector(enemy) === toSector
    && isEmergencyTarget(enemy, { coreY }));
}

export function shouldOpenFirstOverloadTutorial({
  seen = false,
  active = false,
  shown = false,
  state = "playing",
  overloadActive = false,
  energy = 0,
  maxEnergy = OVERLOAD_MAX_ENERGY,
  targetCount = 0,
  emergencyCount = 0,
  sectorCount = 0,
  readyAt = null,
  now = 0,
  maxWaitMs = 8000,
  pressureScore = 0,
  bossActive = false,
  empActive = false,
} = {}) {
  if (seen || active || shown || state !== "playing" || overloadActive || empActive) return false;
  if (bossActive) return false;
  if (energy < maxEnergy || targetCount <= 0) return false;
  const broadPressureWindow = emergencyCount > 0 || (targetCount >= 3 && (sectorCount >= 2 || sectorCount === 0));
  const timedFallback = Number.isFinite(readyAt) && Number(now) - Number(readyAt) >= Math.max(0, Number(maxWaitMs) || 0);
  return broadPressureWindow || timedFallback;
}

export function chooseMissileTarget(enemies, currentSector, coreY = 1015, { committedDamageById = null } = {}) {
  return enemies
    .filter((enemy) => !enemy.dead && enemySector(enemy) === currentSector)
    .sort((left, right) => compareInterceptPriority(left, right, {
      coreY,
      damage: MISSILE_DAMAGE,
      interval: MISSILE_SALVO_INTERVAL,
      projectileTime: 0.72,
      committedDamage: committedDamageById instanceof Map ? committedDamageById.get(left.id) ?? 0 : Number(committedDamageById?.[left.id] ?? 0),
      rightCommittedDamage: committedDamageById instanceof Map ? committedDamageById.get(right.id) ?? 0 : Number(committedDamageById?.[right.id] ?? 0),
    }) || missileThreatScore(right, coreY) - missileThreatScore(left, coreY))[0] ?? null;
}

export function chooseOverloadTarget(enemies, currentSector, coreY = 1015) {
  const local = chooseShipTarget(enemies, currentSector, coreY);
  if (local) return local;
  return enemies
    .filter((enemy) => !enemy.dead && (!enemy.isBossCore || enemy.vulnerable !== false))
    .sort((left, right) => compareThreat(left, right, coreY) || shipThreatScore(right, coreY) - shipThreatScore(left, coreY))[0] ?? null;
}

export function overloadSupportForTarget(target, currentSector, { crossSectorBonus = 0 } = {}) {
  if (!target) return { crossSector: false, damageScale: 1, sector: null };
  const crossSector = enemySector(target) !== currentSector;
  const isBoss = Boolean(target.isBoss);
  const baseScale = isBoss ? (crossSector ? BOSS_OVERLOAD_CROSS_SECTOR_DAMAGE : BOSS_OVERLOAD_LOCAL_DAMAGE) : (crossSector ? OVERLOAD_CROSS_SECTOR_DAMAGE : 1);
  const damageScale = !isBoss && crossSector ? Math.min(1, baseScale + Math.max(0, Number(crossSectorBonus) || 0)) : baseScale;
  return { crossSector, damageScale, sector: enemySector(target) };
}

export function chooseBossObjectiveTarget(enemies, currentSector, activeSide = null, coreY = 1015) {
  const candidates = enemies.filter((enemy) => !enemy.dead && enemySector(enemy) === currentSector);
  const objective = candidates.find((enemy) => enemy.isBossWeapon && enemy.sector === activeSide && enemy.charging);
  if (objective) return objective;
  return candidates.sort((left, right) => compareThreat(left, right, coreY) || shipThreatScore(right, coreY) - shipThreatScore(left, coreY))[0] ?? null;
}

export function bossPhaseForState({ aliveWeapons = 2, bossClock = 0, phase = 1, tutorialComplete = false } = {}) {
  if (aliveWeapons <= 0) return 3;
  if (aliveWeapons < 2 || tutorialComplete || bossClock >= 8 || phase >= 2) return 2;
  return 1;
}

// Reuses the old fixed-machinegun Boss principle: a strong run should meet a
// stronger finale, while a damaged run still receives a recoverable fight.
// The profile changes existing objects and cadence; it never removes warning.
export function bossEncounterProfileForRun({ pressureScore = 50, coreHealth = 55, kills = 80, upgradeCount = 3, activeRoutes = 1 } = {}) {
  const strength = clamp(
    0.9
      + clamp((pressureScore - 50) * 0.003, -0.12, 0.15)
      + clamp((coreHealth - 50) * 0.003, -0.12, 0.15)
      + clamp((kills - 80) / 500, -0.08, 0.22)
      + clamp(upgradeCount, 0, 3) * 0.025
      + clamp(activeRoutes - 1, 0, 2) * 0.05,
    0.88,
    1.25,
  );
  const normalized = (strength - 0.88) / 0.37;
  return Object.freeze({
    strength,
    partHpScale: 0.92 + normalized * 0.26,
    attackHpScale: 0.9 + normalized * 0.35,
    damageScale: 0.9 + normalized * 0.25,
    travelScale: 0.98 - normalized * 0.1,
    cadenceScale: 1.04 - normalized * 0.26,
    escortIntervalMs: Math.round(7000 - normalized * 2200),
  });
}

export function bossPhaseLabel(phase = 1) {
  return phase === 3 ? "核心暴露" : phase === 2 ? "舰队压迫" : "武器舱蓄能";
}

export function bossAttackProfile({ phase = 1, inTargetSector = false } = {}) {
  const normalizedPhase = clamp(Math.round(phase), 1, 3);
  if (normalizedPhase === 3) {
    return Object.freeze({ phase: 3, chargeTime: 5200, damage: 26, suppressionThreshold: 1, sameSectorScale: inTargetSector ? 0.72 : 1, label: "核心终局打击" });
  }
  if (normalizedPhase === 2) {
    return Object.freeze({ phase: 2, chargeTime: 2350, damage: 18, suppressionThreshold: 250, sameSectorScale: inTargetSector ? 0.52 : 1, label: "双线压迫炮击" });
  }
  return Object.freeze({ phase: 1, chargeTime: 2550, damage: 14, suppressionThreshold: 220, sameSectorScale: inTargetSector ? 0.42 : 1, label: "指挥模块炮击" });
}

export function bossAttackProfileForType(type = "spear", enhanced = false) {
  const profileKey = BOSS_ATTACK_TYPE_KEYS[type] ?? type;
  const profile = BOSS_ATTACK_TYPES[profileKey] ?? BOSS_ATTACK_TYPES.spear;
  return Object.freeze({
    ...profile,
    hp: enhanced ? profile.enhancedHp : profile.hp,
    coreDamage: enhanced ? profile.enhancedDamage : profile.coreDamage,
    enhanced: Boolean(enhanced),
  });
}

export function bossVerdictDamageForAnchors(anchorCount = 0) {
  return [8, 16, 24][clamp(Math.round(anchorCount), 0, 2)];
}

export function calculateSynergyDamage({ baseDamage = 0, synergy = "", marked = false } = {}) {
  if (synergy === "weakpoint-detonation") return Math.round(baseDamage * (marked ? 1.42 : 1));
  if (synergy === "full-fleet") return Math.round(baseDamage * 1.08);
  return Math.round(baseDamage);
}

export function synergyPulseOffsets() {
  return Object.freeze({ mark: 0, heavy: 0.46, missiles: 0.96 });
}

export function retainMissileLockOnTargetLoss(progress = 0, retention = MISSILE_TARGET_LOSS_RETENTION) {
  return clamp(progress * retention, 0, 1);
}

export function resolveMissileTargetDecision({
  previousTarget = null,
  currentTargetValid = false,
  nearDefenseCandidate = null,
  candidate = null,
  lockProgress = 0,
} = {}) {
  let target = previousTarget;
  let nextLockProgress = lockProgress;
  let targetChangeDelta = 0;
  let nearDefenseRecord = null;
  let emergencyTargetToAnnounce = null;

  if (!currentTargetValid) {
    if (previousTarget && previousTarget.dead && lockProgress > 0 && lockProgress < 1) {
      nextLockProgress = retainMissileLockOnTargetLoss(lockProgress);
    }
    target = nearDefenseCandidate?.target ?? candidate ?? null;
    if (candidate && candidate.id !== previousTarget?.id) targetChangeDelta += 1;
    if (nearDefenseCandidate) {
      nearDefenseRecord = { target, state: nearDefenseCandidate.state, source: "missile" };
    }
  } else if (nearDefenseCandidate && nearDefenseCandidate.target.id !== previousTarget.id) {
    target = nearDefenseCandidate.target;
    nextLockProgress = retainMissileLockOnTargetLoss(lockProgress);
    targetChangeDelta += 1;
    nearDefenseRecord = { target: nearDefenseCandidate.target, state: nearDefenseCandidate.state, source: "missile" };
    if (nearDefenseCandidate.state === "intercept") emergencyTargetToAnnounce = nearDefenseCandidate.target;
  } else if (candidate && candidate.id !== previousTarget.id) {
    const currentScore = previousTarget ? (previousTarget.hp ?? 0) + (previousTarget.damage ?? 0) * 5 : 0;
    const candidateScore = (candidate.hp ?? 0) + (candidate.damage ?? 0) * 5;
    if (candidateScore > currentScore * 1.35) {
      target = candidate;
      nextLockProgress = retainMissileLockOnTargetLoss(lockProgress);
      targetChangeDelta += 1;
    }
  }

  return {
    target,
    lockProgress: nextLockProgress,
    targetChangeDelta,
    nearDefenseRecord,
    emergencyTargetToAnnounce,
  };
}

// Phase4D: pure clock/state transition for the hub overload loop. Core retains all effects.
export function resolveOverloadClockTransition({
  fireControlDisabled = false,
  overloadActive = false,
  hasTarget = false,
  combatClock,
  overloadActiveUntil,
  overloadPausedMs,
  overloadPauseState,
  dt = 0,
} = {}) {
  let nextActiveUntil = overloadActiveUntil;
  let nextPausedMs = overloadPausedMs;
  let nextPauseState = overloadPauseState;
  let finishExpired = false;
  let notifyWaiting = false;
  let notifyResumed = false;

  if (fireControlDisabled) {
    if (overloadActive) {
      nextActiveUntil += Math.max(0, dt * 1000);
      nextPauseState = "emp";
    }
    return {
      overloadActiveUntil: nextActiveUntil,
      overloadPausedMs: nextPausedMs,
      overloadPauseState: nextPauseState,
      finishExpired,
      notifyWaiting,
      notifyResumed,
    };
  }

  if (!overloadActive) {
    finishExpired = Boolean(nextActiveUntil && combatClock >= nextActiveUntil);
    return {
      overloadActiveUntil: nextActiveUntil,
      overloadPausedMs: nextPausedMs,
      overloadPauseState: nextPauseState,
      finishExpired,
      notifyWaiting,
      notifyResumed,
    };
  }

  if (!hasTarget && nextPausedMs < OVERLOAD_EMPTY_PAUSE_LIMIT * 1000) {
    const pauseMs = Math.min(Math.max(0, dt * 1000), OVERLOAD_EMPTY_PAUSE_LIMIT * 1000 - nextPausedMs);
    nextActiveUntil += pauseMs;
    nextPausedMs += pauseMs;
    if (nextPauseState !== "waiting") {
      nextPauseState = "waiting";
      notifyWaiting = true;
    }
  } else if (hasTarget && nextPauseState === "waiting") {
    nextPauseState = "active";
    notifyResumed = true;
  }

  return {
    overloadActiveUntil: nextActiveUntil,
    overloadPausedMs: nextPausedMs,
    overloadPauseState: nextPauseState,
    finishExpired,
    notifyWaiting,
    notifyResumed,
  };
}

export function allocateMissileTargets(targets = [], { missileCount = MISSILE_SALVO_SIZE, missileDamage = MISSILE_DAMAGE, reservedDamage = new Map(), coreY = 1015 } = {}) {
  const candidates = targets.filter((target) => !target.dead).slice().sort((left, right) => compareInterceptPriority(left, right, { coreY, damage: missileDamage, interval: MISSILE_SALVO_INTERVAL, projectileTime: 0.72 }));
  const remaining = new Map(candidates.map((target) => [target.id, Math.max(1, (target.hp ?? target.maxHp ?? 1) - (reservedDamage.get(target.id) ?? 0))]));
  const assignments = [];
  for (let index = 0; index < missileCount && candidates.length; index += 1) {
    const target = candidates.find((candidate) => (remaining.get(candidate.id) ?? 0) > 0) ?? candidates[0];
    assignments.push(target.id);
    remaining.set(target.id, (remaining.get(target.id) ?? 0) - missileDamage);
  }
  return assignments;
}

export function automaticDps({ damage = AUTO_BULLET_DAMAGE, interval = AUTO_BULLET_INTERVAL } = {}) {
  return damage / (interval / 1000);
}

export function advanceMissileLock({ progress = 0, dt = 0, targetAvailable = false, sameSector = true, lockTime = MISSILE_LOCK_TIME, decayTime = MISSILE_LOCK_DECAY_TIME } = {}) {
  const direction = targetAvailable && sameSector ? 1 : -1;
  const duration = direction > 0 ? lockTime : decayTime;
  return clamp(progress + direction * (dt * 1000) / duration, 0, 1);
}

export function canFireMissileSalvo({ target, lockProgress = 0, elapsed, lastShotAt = -Infinity, interval = MISSILE_SALVO_INTERVAL } = {}) {
  return Boolean(target && !target.dead && lockProgress >= 1 && elapsed - lastShotAt >= interval);
}

export function missilePhase(progress) {
  if (progress < 0.2) return "cold-launch";
  if (progress < 0.6) return "ignite-turn";
  return "terminal-dive";
}

export function missilePosition({ progress, startX, startY, targetX, targetY, side = 1, fanOffset = 0 } = {}) {
  const ratio = clamp(progress, 0, 1);
  const spread = Number.isFinite(fanOffset) ? fanOffset : 0;
  const launch = { x: startX + side * 48 + spread * 0.18, y: startY - 12 };
  const approach = { x: targetX + side * 90 + spread * 0.35, y: targetY - 70 };
  if (ratio < 0.2) {
    const phase = ratio / 0.2;
    return { x: startX + (side * 48 + spread * 0.18) * phase, y: startY - 12 * phase };
  }
  if (ratio < 0.6) {
    const phase = (ratio - 0.2) / 0.4;
    const control = { x: startX + side * 150 + spread * 1.15, y: Math.min(startY - 130, targetY - 240) };
    const inverse = 1 - phase;
    return {
      x: inverse * inverse * launch.x + 2 * inverse * phase * control.x + phase * phase * approach.x,
      y: inverse * inverse * launch.y + 2 * inverse * phase * control.y + phase * phase * approach.y,
    };
  }
  const phase = (ratio - 0.6) / 0.4;
  return {
    x: approach.x + (targetX - approach.x) * phase,
    y: approach.y + (targetY - approach.y) * phase,
  };
}

export function criticalDamageNumber(baseDamage = AUTO_BULLET_DAMAGE, multiplier = 2) {
  return Math.round(baseDamage * multiplier);
}

export function missileSalvoLayout(count = MISSILE_SALVO_SIZE, { shipX = SHIP_SECTOR_CENTERS[1], spacing = 38 } = {}) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const center = (count - 1) / 2;
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    return {
      index,
      side,
      startX: shipX + side * (46 + lane * 10),
      startY: 824 + lane * 5,
      fanOffset: (index - center) * spacing,
      launchDelay: index * 0.085,
    };
  });
}

export function droneFormationOffset(index = 0, count = 2, active = false) {
  const side = index % 2 === 0 ? -1 : 1;
  const lane = Math.floor(index / 2);
  const laneSpacing = count >= 4 ? 42 : 22;
  return {
    x: side * (74 + lane * laneSpacing + (active ? 18 : 0)),
    y: -8 - (active ? 18 : 0) + Math.sin(index * 1.7) * 4,
  };
}

export function droneShotInterval({ swarmActive = false, interceptReady = false } = {}) {
  if (swarmActive) return 280;
  return interceptReady ? 430 : 470;
}

export function shouldTriggerSwarm(enemy) {
  return Boolean(enemy && !enemy.dead && (enemy.isBossWeapon || enemy.charging || enemy.type === "striker" || enemy.timeToCore <= 1.5));
}

export function impactPositionForMissile(missile, fallback = { x: 0, y: 0 }) {
  return missile?.lastKnownPosition ?? fallback;
}

export function calculateCoreDamage({ baseDamage, enemySector: incomingSector, currentSector, shieldActive = true }) {
  if (incomingSector === currentSector && shieldActive) {
    return { damage: baseDamage * 0.3, shielded: true };
  }
  return { damage: baseDamage, shielded: false };
}

export function shouldInterceptProjectile({ incomingSector, currentSector, interceptAvailable = true }) {
  return incomingSector === currentSector && interceptAvailable;
}

export function isShipRunComplete({ elapsed, duration = 20, coreHealth }) {
  return coreHealth <= 0 || elapsed >= duration;
}

// 历史 P1.1/P1.2 的导出别名保留给旧验证数据；运行时不再使用准星或手动锁定。
export const POINTER_LOCK_RADIUS = 72;
export const POINTER_RELEASE_RADIUS = 94;
export const DIRECTED_MISSILE_DAMAGE = MISSILE_DAMAGE;
export const DIRECTED_MISSILE_INTERVAL = MISSILE_SALVO_INTERVAL;
export const MANUAL_LOCK_RADIUS = POINTER_LOCK_RADIUS;
export const MANUAL_RELEASE_RADIUS = POINTER_RELEASE_RADIUS;
export const MANUAL_MISSILE_DAMAGE = MISSILE_DAMAGE;
export const MANUAL_MISSILE_INTERVAL = MISSILE_SALVO_INTERVAL;
export const choosePointerTarget = chooseMissileTarget;
export const shouldReleasePointerLock = () => true;
export const directedDps = ({ damage = MISSILE_DAMAGE, interval = MISSILE_SALVO_INTERVAL } = {}) => damage / (interval / 1000);
export const manualDps = directedDps;
export const canFireDirectedMissile = ({ target, elapsed, lastShotAt = -Infinity, interval = MISSILE_SALVO_INTERVAL } = {}) => canFireMissileSalvo({ target, lockProgress: 1, elapsed, lastShotAt, interval });
export const canFireManualMissile = ({ manualActive = true, ...args } = {}) => manualActive && canFireDirectedMissile(args);
export const pointerMissilePhase = missilePhase;
export const pointerMissilePosition = missilePosition;
export const manualMissilePhase = missilePhase;
export const manualMissilePosition = missilePosition;
