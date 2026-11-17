// 无尽模式的节奏只由“子波 / 旗帜 / 两旗战线是否解决”承重，不由生存秒数承重。
// 一面旗帜由三支连续接替的子波组成；两面旗帜完整解决后才进入一次整备。
export const ENDLESS_WAVE_ENTRY_SEC = 0.72;
export const ENDLESS_CLEAR_TO_UPGRADE_SEC = 1.0;
export const ENDLESS_UPGRADE_TO_WAVE_SEC = 0.72;
export const ENDLESS_FLAGS_PER_LINE = 2;
export const ENDLESS_SUBWAVES_PER_FLAG = 3;
// 后期成长使用“相对基础值加算”而不是逐层乘算。三组上限既是平衡
// 护栏，也是选卡页可以直接展示的刻度；不要在战斗逻辑里另写一套数字。
export const ENDLESS_LATE_BALANCE = Object.freeze({
  damage: Object.freeze({ earlyLayers: 5, earlyStep: 0.07, lateStep: 0.04, maxBonus: 0.55 }),
  haste: Object.freeze({ step: 0.06, maxBonus: 0.36 }),
  overload: Object.freeze({ gainStep: 0.08, maxGainBonus: 0.4, durationStep: 0.35, maxDuration: 1.4 }),
  resonance: Object.freeze({
    critArmorStep: 0.06,
    critArmorMax: 0.24,
    critExecuteStep: 0.0075,
    critExecuteMax: 0.03,
    missileRadiusStep: 0.06,
    missileRadiusMax: 0.3,
    missileDamageStep: 0.04,
    missileDamageMax: 0.2,
    swarmCycleStep: 0.05,
    swarmCycleMax: 0.25,
    swarmSupportStep: 0.05,
    swarmSupportMax: 0.15,
  }),
});
// 第一只无尽 Boss 延后到第 8 旗：前 7 旗用于让玩家熟悉三条路线与
// 近防索敌，Boss 仍保持每 4 旗一次的记忆节拍。
export const ENDLESS_FIRST_BOSS_FLAG = 8;
export const ENDLESS_BOSS_INTERVAL_FLAGS = 4;
export const ENDLESS_BOSS_EVERY_FLAGS = 4;
// 旧 QA/外部调用的兼容别名：现在的编号语义是旗帜，不再是固定时间波次。
export const ENDLESS_BOSS_EVERY_WAVES = ENDLESS_BOSS_EVERY_FLAGS;
export const ENDLESS_MAX_ACTIVE_ENEMIES = 22;
export const ENDLESS_FORMATIONS_PER_WAVE = 3;
export const ENDLESS_FORMATION_OVERLAP_REMAINING = 2;
export const ENDLESS_FORMATION_SPAWN_HEADROOM = 4;
export const ENDLESS_SUBWAVE_OVERLAP_RATIO = 0.4;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const ENDLESS_DIRECTOR_STATES = Object.freeze([
  "recovery",
  "steady",
  "tense",
  "assault",
]);

const DIRECTOR_STATE_ORDER = Object.freeze({ recovery: 0, steady: 1, tense: 2, assault: 3 });

export function endlessBossFlagForCount(count = 1) {
  const safeCount = Math.max(1, Math.floor(count));
  return ENDLESS_FIRST_BOSS_FLAG + (safeCount - 1) * ENDLESS_BOSS_INTERVAL_FLAGS;
}

export function endlessIsBossFlag(flag = 1) {
  const safeFlag = Math.max(1, Math.floor(flag));
  return safeFlag >= ENDLESS_FIRST_BOSS_FLAG
    && (safeFlag - ENDLESS_FIRST_BOSS_FLAG) % ENDLESS_BOSS_INTERVAL_FLAGS === 0;
}

// 兼容旧 QA 调用；核心逻辑使用 endlessIsBossFlag。
export function endlessIsBossWave(wave = 1) {
  return endlessIsBossFlag(wave);
}

export function endlessDirectorAdjustmentFor(state = "steady") {
  const safeState = ENDLESS_DIRECTOR_STATES.includes(state) ? state : "steady";
  const adjustments = {
    recovery: { budgetScale: 0.9, healthScale: 0.96, damageScale: 0.88, speedScale: 0.98, overlapRatio: 0.25, entryDelayScale: 1.22 },
    steady: { budgetScale: 1, healthScale: 1, damageScale: 1, speedScale: 1, overlapRatio: ENDLESS_SUBWAVE_OVERLAP_RATIO, entryDelayScale: 1 },
    tense: { budgetScale: 1.05, healthScale: 1.03, damageScale: 1, speedScale: 1.02, overlapRatio: 0.5, entryDelayScale: 0.94 },
    assault: { budgetScale: 1.08, healthScale: 1.06, damageScale: 1.04, speedScale: 1.04, overlapRatio: 0.58, entryDelayScale: 0.88 },
  };
  return Object.freeze({ state: safeState, ...adjustments[safeState] });
}

export function endlessThreatScale(wave = 1, upgradeCount = 0, directorState = "steady") {
  const safeWave = Math.max(1, Math.floor(wave));
  const safeUpgrades = Math.max(0, Math.floor(upgradeCount));
  const safeState = ENDLESS_DIRECTOR_STATES.includes(directorState) ? directorState : "steady";
  const upgradeBonus = Math.min(0.06, safeUpgrades * 0.006);
  let budget;
  let health;
  let damage;
  let speed;
  if (safeWave <= 2) {
    budget = 10 + safeWave;
    health = 0.94 + (safeWave - 1) * 0.1;
    damage = 0.72 + (safeWave - 1) * 0.08;
    speed = 0.98 + (safeWave - 1) * 0.015;
  } else if (safeWave <= 5) {
    budget = 13 + (safeWave - 3) * 2;
    health = 1.1 + (safeWave - 3) * 0.13;
    damage = 0.88 + (safeWave - 3) * 0.08;
    speed = 1.015 + (safeWave - 3) * 0.025;
  } else if (safeWave <= 12) {
    budget = 17 + (safeWave - 6) * 2;
    health = 1.44 + (safeWave - 6) * 0.16;
    damage = 1.05 + (safeWave - 6) * 0.1;
    speed = 1.08 + (safeWave - 6) * 0.0167;
  } else {
    const deepSteps = safeWave - 12;
    budget = Math.floor(29 * Math.pow(1.045, deepSteps));
    health = 2.4 * Math.pow(1.075, deepSteps);
    damage = 1.65 * Math.pow(1.035, deepSteps);
    speed = Math.min(1.35, 1.18 + deepSteps * 0.018);
  }
  const adjustment = endlessDirectorAdjustmentFor(safeState);
  return Object.freeze({
    wave: safeWave,
    budget: Math.max(10, Math.floor((budget + safeUpgrades * 0.4) * adjustment.budgetScale)),
    health: health * (1 + upgradeBonus) * adjustment.healthScale,
    damage: damage * adjustment.damageScale,
    speed: Math.min(1.35, speed * adjustment.speedScale),
    upgradeBonus,
    directorState: safeState,
    overlapRatio: adjustment.overlapRatio,
    entryDelayScale: adjustment.entryDelayScale,
  });
}

export function endlessControlMargin({
  coreLoss = 0,
  nearCoreSeconds = 0,
  backlog = 0,
  emergencyMisses = 0,
  emergencySuccesses = 0,
  overloadReady = false,
  clearSeconds = 0,
} = {}) {
  const coreScore = clamp(100 - Math.max(0, Number(coreLoss) || 0) * 4, 0, 100);
  const nearCoreScore = clamp(100 - Math.max(0, Number(nearCoreSeconds) || 0) * 12, 0, 100);
  const backlogScore = clamp(100 - Math.max(0, Number(backlog) || 0) * 4 - Math.max(0, Number(clearSeconds) - 8) * 7, 0, 100);
  const emergencyScore = clamp(100 - Math.max(0, Number(emergencyMisses) || 0) * 20 + Math.max(0, Number(emergencySuccesses) || 0) * 4, 0, 100);
  const reserveScore = overloadReady ? 100 : 55;
  return Math.round(coreScore * 0.35 + nearCoreScore * 0.25 + backlogScore * 0.2 + emergencyScore * 0.1 + reserveScore * 0.1);
}

export function endlessDirectorStateForMargin({
  currentState = "steady",
  margin = 50,
  highStreak = 0,
  lowStreak = 0,
  flag = 1,
  coreHealth = 100,
} = {}) {
  const current = ENDLESS_DIRECTOR_STATES.includes(currentState) ? currentState : "steady";
  if (Number(coreHealth) < 35) return "recovery";
  if (Math.max(1, Math.floor(flag)) <= 2) return "steady";
  const currentIndex = DIRECTOR_STATE_ORDER[current];
  if (Number(margin) > 70 && Number(highStreak) >= 2) return ENDLESS_DIRECTOR_STATES[Math.min(3, currentIndex + 1)];
  if (Number(margin) < 45 && Number(lowStreak) >= 2) return ENDLESS_DIRECTOR_STATES[Math.max(0, currentIndex - 1)];
  return current;
}

export function endlessWaveForWave(wave = 1) {
  const safeWave = Math.max(1, Math.floor(wave));
  const patternIndex = (safeWave - 1) % 5;
  const patterns = [
    [["scout", 0, -42], ["scout", 0, 42], ["scout", 1, 0], ["scout", 2, 42], ["striker", 2, -24], ["striker", 0, 0]],
    [["striker", 2, -34], ["frigate", 0, 12], ["scout", 0, -42], ["scout", 1, 40], ["striker", 2, 34], ["scout", 1, -30], ["scout", 0, 36]],
    [["shield", 0, -18], ["frigate", 0, 28], ["relay", 2, -24], ["striker", 2, 28], ["scout", 1, 0], ["scout", 2, -44], ["striker", 1, 34], ["scout", 0, 44], ["scout", 2, 38]],
    [["splitter", 1, 0], ["scout", 1, -42], ["scout", 1, 42], ["striker", 0, 24], ["striker", 2, -24], ["frigate", 2, 28], ["relay", 0, -34], ["scout", 2, 44], ["striker", 1, 24], ["scout", 0, 42], ["scout", 2, -42], ["scout", 1, 24]],
    [["relay", 0, -22], ["shield", 2, 22], ["frigate", 1, 0], ["striker", 0, 28], ["striker", 2, -28], ["scout", 1, 44], ["splitter", 0, 36], ["scout", 2, 44], ["striker", 1, -34], ["scout", 0, -42], ["scout", 2, -44], ["scout", 1, 30]],
  ];
  const base = patterns[patternIndex].map(([type, sector, offset], index) => ({ type, sector, offset, index }));
  const extra = Math.min(10, Math.floor(Math.max(0, safeWave - 5) * 0.6));
  const additions = [];
  for (let index = 0; index < extra; index += 1) {
    const sector = (index + safeWave) % 3;
    const type = safeWave < 3 ? "scout" : index % 4 === 0 ? "striker" : index % 5 === 0 ? "frigate" : "scout";
    additions.push({ type, sector, offset: (index % 2 ? 1 : -1) * (24 + (index % 3) * 12), index: base.length + index });
  }
  const formationLabels = ["接敌编队", "冲突编队", "压力编队"];
  const formations = Array.from({ length: ENDLESS_FORMATIONS_PER_WAVE }, () => []);
  base.concat(additions).forEach((unit, index, all) => {
    const formationIndex = Math.min(
      ENDLESS_FORMATIONS_PER_WAVE - 1,
      Math.floor(index * ENDLESS_FORMATIONS_PER_WAVE / Math.max(1, all.length)),
    );
    formations[formationIndex].push({ ...unit, formationIndex });
  });
  return Object.freeze({
    wave: safeWave,
    label: `第 ${safeWave} 波 · ${patternIndex === 0 ? "三段换区" : patternIndex === 1 ? "快慢分流" : patternIndex === 2 ? "先拆支援" : patternIndex === 3 ? "双区高压" : "多源交叉"}`,
    units: [...base, ...additions].map((unit, index, all) => ({
      ...unit,
      formationIndex: Math.min(
        ENDLESS_FORMATIONS_PER_WAVE - 1,
        Math.floor(index * ENDLESS_FORMATIONS_PER_WAVE / Math.max(1, all.length)),
      ),
    })),
    formationLabels,
    formations: formations.map((units, index) => Object.freeze({
      index,
      label: formationLabels[index],
      units: Object.freeze(units),
    })),
  });
}

export function endlessFlagForFlag(flag = 1) {
  const safeFlag = Math.max(1, Math.floor(flag));
  const subwaves = Array.from({ length: ENDLESS_SUBWAVES_PER_FLAG }, (_, index) => {
    const subwave = endlessWaveForWave((safeFlag - 1) * ENDLESS_SUBWAVES_PER_FLAG + index + 1);
    return Object.freeze({
      ...subwave,
      flag: safeFlag,
      subwaveIndex: index,
      subwaveLabel: `第 ${index + 1} 子波`,
    });
  });
  const units = subwaves.flatMap((subwave) => subwave.units.map((unit) => ({
    ...unit,
    flag: safeFlag,
    subwaveIndex: subwave.subwaveIndex,
  })));
  return Object.freeze({
    flag: safeFlag,
    label: `第 ${safeFlag} 旗帜`,
    subwaves: Object.freeze(subwaves),
    units: Object.freeze(units),
  });
}

// 兼容旧 QA 调用，但参数不再映射到秒数或计时周期。
export const endlessWaveForCycle = endlessWaveForWave;

export function endlessFormationForWave(wave = 1, formationIndex = 0) {
  const safeIndex = clamp(Math.floor(formationIndex), 0, ENDLESS_FORMATIONS_PER_WAVE - 1);
  return endlessWaveForWave(wave).formations[safeIndex];
}

export function endlessCanAdvanceSubwave({
  remaining = 0,
  total = 0,
  active = 0,
  maxActive = ENDLESS_MAX_ACTIVE_ENEMIES,
  overlapRatio = ENDLESS_SUBWAVE_OVERLAP_RATIO,
} = {}) {
  const safeRemaining = Math.max(0, Math.floor(remaining));
  const safeTotal = Math.max(1, Math.floor(total));
  const safeActive = Math.max(0, Math.floor(active));
  const safeOverlapRatio = clamp(Number(overlapRatio) || ENDLESS_SUBWAVE_OVERLAP_RATIO, 0, 1);
  const nearClear = safeRemaining <= ENDLESS_FORMATION_OVERLAP_REMAINING
    || safeRemaining <= Math.ceil(safeTotal * safeOverlapRatio);
  return nearClear && safeActive <= maxActive - ENDLESS_FORMATION_SPAWN_HEADROOM;
}

// 兼容旧调用；现在这里表示当前子波尾部接替条件。
export const endlessCanAdvanceFormation = endlessCanAdvanceSubwave;

export function endlessCanCompleteLine({
  completedFlags = 0,
  flagsPerLine = ENDLESS_FLAGS_PER_LINE,
  remaining = 0,
  active = 0,
} = {}) {
  return Math.max(0, Math.floor(completedFlags)) >= Math.max(1, Math.floor(flagsPerLine))
    && Math.max(0, Math.floor(remaining)) <= 0
    && Math.max(0, Math.floor(active)) <= 0;
}

export function endlessLateUpgradePool(state = {}, { phase = null } = {}) {
  const counts = state.lateUpgrades ?? {};
  const safePhase = Number.isFinite(Number(phase)) ? Math.max(0, Math.floor(Number(phase))) : null;
  const routeBreak = safePhase !== null && safePhase % 3 === 2;
  const damageBonus = Math.max(0, Number(state.lateDamageBonus ?? (Number(state.damageMultiplier ?? 1) - 1)));
  const hasteBonus = Math.max(0, Number(state.attackSpeedMultiplier ?? 1) - 1);
  const overloadGainBonus = Math.max(0, Number(state.overloadGainMultiplier ?? 1) - 1);
  const overloadDuration = Math.max(0, Number(state.overloadDurationBonus ?? 0));
  const routeCount = (id) => Math.max(0, Math.floor(Number(counts[id] ?? 0)));
  const damageStep = routeCount("late-damage") < ENDLESS_LATE_BALANCE.damage.earlyLayers
    ? ENDLESS_LATE_BALANCE.damage.earlyStep
    : ENDLESS_LATE_BALANCE.damage.lateStep;
  const routeCards = [
    {
      id: "resonance-crit",
      route: "crit",
      category: "路线协议突破",
      name: "穿甲余量",
      behavior: "机枪装甲压制增强",
      shortDetail: `本层穿甲 +${Math.round(ENDLESS_LATE_BALANCE.resonance.critArmorStep * 100)}%，处决线 +${(ENDLESS_LATE_BALANCE.resonance.critExecuteStep * 100).toFixed(2)}%`,
      detail: `每层穿甲 +${Math.round(ENDLESS_LATE_BALANCE.resonance.critArmorStep * 100)}%，处决线 +${(ENDLESS_LATE_BALANCE.resonance.critExecuteStep * 100).toFixed(2)}%`,
      stat: `穿甲上限 +${Math.round(ENDLESS_LATE_BALANCE.resonance.critArmorMax * 100)}% · 处决线上限 +${(ENDLESS_LATE_BALANCE.resonance.critExecuteMax * 100).toFixed(2)}%`,
      icon: "machinegun",
      upgradeKind: "breakthrough",
    },
    {
      id: "resonance-missile",
      route: "missile",
      category: "路线协议突破",
      name: "弹头扩容",
      behavior: "导弹爆心范围与伤害增强",
      shortDetail: `本层范围 +${Math.round(ENDLESS_LATE_BALANCE.resonance.missileRadiusStep * 100)}%，爆心 +${Math.round(ENDLESS_LATE_BALANCE.resonance.missileDamageStep * 100)}%`,
      detail: `只强化导弹爆炸，不改变机枪与僚机`,
      stat: `范围上限 +${Math.round(ENDLESS_LATE_BALANCE.resonance.missileRadiusMax * 100)}% · 爆心上限 +${Math.round(ENDLESS_LATE_BALANCE.resonance.missileDamageMax * 100)}%`,
      icon: "missile",
      upgradeKind: "breakthrough",
    },
    {
      id: "resonance-swarm",
      route: "swarm",
      category: "路线协议突破",
      name: "蜂群带宽",
      behavior: "僚机循环与跨区支援增强",
      shortDetail: `本层僚机循环 +${Math.round(ENDLESS_LATE_BALANCE.resonance.swarmCycleStep * 100)}%，跨区 +${Math.round(ENDLESS_LATE_BALANCE.resonance.swarmSupportStep * 100)}个百分点`,
      detail: "只强化僚机，保留换区的部署价值",
      stat: `僚机循环上限 +${Math.round(ENDLESS_LATE_BALANCE.resonance.swarmCycleMax * 100)}% · 跨区总效率上限 85%`,
      icon: "drones",
      upgradeKind: "breakthrough",
    },
  ];
  if (routeBreak) {
    return routeCards;
  }
  const universal = [
    { id: "late-damage", route: "all", category: "舰体校准", name: "火力校准", behavior: "所有武器伤害提升", shortDetail: `本层伤害 +${Math.round(damageStep * 100)}%，软上限 +55%`, detail: "以基础火力加算，避免后期无限滚雪球", stat: `伤害 ${(1 + damageBonus) * 100}% → ${(1 + Math.min(ENDLESS_LATE_BALANCE.damage.maxBonus, damageBonus + damageStep)) * 100}%`, icon: "calibration-damage", upgradeKind: "calibration" },
    { id: "late-haste", route: "all", category: "舰体校准", name: "循环超频", behavior: "全舰自动攻击循环加速", shortDetail: `本层循环效率 +${Math.round(ENDLESS_LATE_BALANCE.haste.step * 100)}%，上限 +36%`, detail: "改善机枪、导弹和僚机的响应密度，但不改变 FPS", stat: `循环 ${Math.round((1 + hasteBonus) * 100)}% → ${Math.round((1 + Math.min(ENDLESS_LATE_BALANCE.haste.maxBonus, hasteBonus + ENDLESS_LATE_BALANCE.haste.step)) * 100)}%`, icon: "calibration-haste", upgradeKind: "calibration" },
    { id: "late-overload", route: "all", category: "舰体校准", name: "过载蓄能", behavior: "主动过载窗口更容易掌控", shortDetail: overloadGainBonus < ENDLESS_LATE_BALANCE.overload.maxGainBonus - 0.0001 ? `本层充能 +${Math.round(ENDLESS_LATE_BALANCE.overload.gainStep * 100)}%，充能上限 +40%` : `充能已封顶，本层持续 +${ENDLESS_LATE_BALANCE.overload.durationStep.toFixed(2)}s`, detail: "先提高可用频率，再用少量时长延长终结窗口", stat: overloadGainBonus < ENDLESS_LATE_BALANCE.overload.maxGainBonus - 0.0001 ? `充能 ${Math.round((1 + overloadGainBonus) * 100)}% → ${Math.round((1 + Math.min(ENDLESS_LATE_BALANCE.overload.maxGainBonus, overloadGainBonus + ENDLESS_LATE_BALANCE.overload.gainStep)) * 100)}%` : `持续 +${overloadDuration.toFixed(2)}s → ${Math.min(ENDLESS_LATE_BALANCE.overload.maxDuration, overloadDuration + ENDLESS_LATE_BALANCE.overload.durationStep).toFixed(2)}s`, icon: "calibration-overload", upgradeKind: "calibration" },
  ];
  const available = universal.filter((card) => {
    if (card.id === "late-damage" && damageBonus >= ENDLESS_LATE_BALANCE.damage.maxBonus - 0.0001) return false;
    if (card.id === "late-haste" && hasteBonus >= ENDLESS_LATE_BALANCE.haste.maxBonus - 0.0001) return false;
    if (card.id === "late-overload" && overloadGainBonus >= ENDLESS_LATE_BALANCE.overload.maxGainBonus - 0.0001 && overloadDuration >= ENDLESS_LATE_BALANCE.overload.maxDuration - 0.0001) return false;
    return true;
  });
  if (available.length >= 3) return available.slice(0, 3);
  const fallback = routeCards.filter((card) => !available.some((candidate) => candidate.id === card.id));
  return [...available, ...fallback.slice(0, Math.max(0, 3 - available.length))];
}

export function endlessBossRoleOrder(index = 0) {
  const orders = [[1, 0, 2], [2, 1, 0], [0, 2, 1]];
  return orders[Math.max(0, Math.floor(index)) % orders.length];
}

export function endlessBossRoleIntervalMs(phase = 1) {
  return [7000, 5600, 4800][clamp(Math.round(phase), 1, 3) - 1];
}
