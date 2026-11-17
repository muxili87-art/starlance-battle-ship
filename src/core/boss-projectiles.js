// V6.3 首章整合 · 07 首 Boss 真实弹体（纯推进 / 接触判定）
//
// 职责：把「预警 → 逐发可见弹体 → 到达判定带 → 结算」变成可测试的纯函数。
// 场景只负责按返回的命中事件调用已有的 applyCoreDamage；本模块不碰核心生命、
// 不碰存档、不使用真实时钟与随机数。
//
// 关键规则（合同 11.2）：
//   * 发射时确定目标分区与轨迹，飞行不追玩家；
//   * 从炮口到判定带的飞行时间不少于 0.65 秒；
//   * 到达判定带时只核对玩家**当前**分区一次；脱离危险区不受伤；
//   * 大 dt 跨过判定带也必须检测到达，不能穿透。

export const CAMPAIGN_BOSS_PROJECTILE_VERSION = "campaign-boss-projectiles-v62";

export const BOSS_MUZZLE_Y = 520;
export const BOSS_JUDGE_BAND_Y = 1040;
export const BOSS_MIN_FLIGHT_SECONDS = 0.65;
export const BOSS_PROJECTILE_DAMAGE = 2;

export const BOSS_CANNON_INTERVAL_MS = 4000;
export const BOSS_CANNON_WARN_MS = 900;
export const BOSS_CANNON_VOLLEY = 6;
export const BOSS_CANNON_SPACING_MS = 120;
export const BOSS_CANNON_DAMAGE_CAP = 12; // 6 发 × 2

export const BOSS_SWEEP_INTERVAL_MS = 4000;
export const BOSS_SWEEP_WARN_MS = 1400;
export const BOSS_SWEEP_STEP_VOLLEY = 8;
export const BOSS_SWEEP_STEP_SPACING_MS = 80;
export const BOSS_SWEEP_STEP_CAP = 16; // 8 发 × 2
export const BOSS_SWEEP_GAP_MS = 800; // 两次危险到达的最短间隔
export const BOSS_ENTRY_INVULNERABLE_MS = 1200;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const SECTORS = Object.freeze([0, 1, 2]);

export function createCampaignBossBarrage() {
  return { projectiles: [], nextId: 1, fired: 0 };
}

/** 由炮口到判定带的距离与最小飞行时间推导速度上限。 */
export function projectileSpeedFor({ fromY = BOSS_MUZZLE_Y, bandY = BOSS_JUDGE_BAND_Y, minSeconds = BOSS_MIN_FLIGHT_SECONDS } = {}) {
  const distance = Math.max(1, bandY - fromY);
  return distance / Math.max(0.05, minSeconds);
}

/** 一次齐射的逐发计划：每发有自己的发射时刻与目标分区，之后不再改变。 */
export function planVolley({ sector, count, intervalMs, startAt, fromY = BOSS_MUZZLE_Y, bandY = BOSS_JUDGE_BAND_Y } = {}) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const spacing = Math.max(0, Number(intervalMs) || 0);
  const speed = projectileSpeedFor({ fromY, bandY });
  return Object.freeze(Array.from({ length: safeCount }, (_, index) => Object.freeze({
    sector: clamp(Math.round(Number(sector) || 0), 0, 2),
    spawnAt: Number(startAt) + index * spacing,
    travelMs: Math.round((bandY - fromY) / speed * 1000),
  })));
}

/** 把计划里到点的弹体真正生成出来；未到点的留在 pending 里等下一帧或取消。 */
export function advanceCampaignBossProjectiles(state, { dt = 0, now = 0, playerSector = 1, pending = [], bandY = BOSS_JUDGE_BAND_Y } = {}) {
  const step = Math.max(0, Number(dt) || 0);
  const projectiles = state?.projectiles ?? [];
  // 1) 到点生成
  const stillPending = [];
  for (const shot of pending ?? []) {
    if ((shot.spawnAt ?? 0) <= now) {
      projectiles.push({
        id: state.nextId,
        sector: shot.sector,
        y: BOSS_MUZZLE_Y,
        speed: projectileSpeedFor({ bandY }),
        at: now,
      });
      state.nextId += 1;
      state.fired = (state.fired ?? 0) + 1;
    } else {
      stillPending.push(shot);
    }
  }
  // 2) 推进并判定到达（大 dt 跨过判定带也要检测）
  const hits = [];
  const alive = [];
  for (const projectile of projectiles) {
    const nextY = projectile.y + projectile.speed * step;
    if (nextY >= bandY) {
      const hit = clamp(Math.round(Number(playerSector) || 0), 0, 2) === projectile.sector;
      hits.push({ id: projectile.id, sector: projectile.sector, damage: hit ? BOSS_PROJECTILE_DAMAGE : 0, hit });
    } else {
      alive.push({ ...projectile, y: nextY });
    }
  }
  state.projectiles = alive;
  return { projectiles: alive, hits, pending: stillPending };
}

export function cancelPendingForSector(pending = [], sector) {
  return (pending ?? []).filter((shot) => shot.sector !== sector);
}

/**
 * 双炮尽毁后的两步扇形计划。约束：
 *   * 每步 8 发、间隔 80ms、单发 2（单步上限 16）；
 *   * 每步至少留一个安全区（只覆盖 2 个分区）；
 *   * 第二步的安全区必须能从第一步的安全区转移过去（相同或相邻）；
 *   * 两次危险到达至少相隔 800ms。
 */
export function planSweepSteps({ step = 0, startAt = 0, previousSafeSector = 1 } = {}) {
  const safeOptions = SECTORS.filter((sector) => Math.abs(sector - previousSafeSector) <= 1);
  const safeSector = safeOptions[step % safeOptions.length] ?? previousSafeSector;
  const covered = SECTORS.filter((sector) => sector !== safeSector);
  const warnAt = Number(startAt);
  const firstShotAt = warnAt + BOSS_SWEEP_WARN_MS;
  const volleySpan = (BOSS_SWEEP_STEP_VOLLEY - 1) * BOSS_SWEEP_STEP_SPACING_MS;
  const arrivalAt = firstShotAt + volleySpan + Math.round((BOSS_JUDGE_BAND_Y - BOSS_MUZZLE_Y) / projectileSpeedFor({}) * 1000);
  return Object.freeze({
    step,
    safeSector,
    coveredSectors: Object.freeze(covered),
    warnAt,
    firstShotAt,
    arrivalAt,
    // 8 发按 0.08 秒全局串行、在两个被覆盖分区之间交替，既保证间隔又能留出安全区。
    shots: Object.freeze(Array.from({ length: BOSS_SWEEP_STEP_VOLLEY }, (_, index) => Object.freeze({
      sector: covered[index % covered.length],
      spawnAt: firstShotAt + index * BOSS_SWEEP_STEP_SPACING_MS,
      travelMs: Math.round((BOSS_JUDGE_BAND_Y - BOSS_MUZZLE_Y) / projectileSpeedFor({}) * 1000),
    }))),
    damageCap: BOSS_SWEEP_STEP_CAP,
  });
}

/** 双炮阶段的下一轮：存活炮交替、瞄准一个分区。 */
export function planCannonRound({ now = 0, liveCannonSectors = [], serial = 0, entryUntil = 0 } = {}) {
  if (!liveCannonSectors.length) return null;
  const startAt = Math.max(Number(now), Number(entryUntil));
  const cannonSector = liveCannonSectors[serial % liveCannonSectors.length];
  const targetSector = clamp(Math.round(Number(cannonSector) || 0), 0, 2);
  const warnAt = startAt;
  const firstShotAt = warnAt + BOSS_CANNON_WARN_MS;
  return Object.freeze({
    cannonSector,
    targetSector,
    warnAt,
    firstShotAt,
    nextRoundAt: startAt + BOSS_CANNON_INTERVAL_MS,
    damageCap: BOSS_CANNON_DAMAGE_CAP,
    shots: Object.freeze(planVolley({
      sector: targetSector, count: BOSS_CANNON_VOLLEY, intervalMs: BOSS_CANNON_SPACING_MS, startAt: firstShotAt,
    })),
  });
}
