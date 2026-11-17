import { applyBuildCard, cardFor, cloneBuildState, createBuildState } from "./build-system.js";

// 这是 V3 的纯数据层：不依赖 Phaser，也不改变现有 V2 候选。所有随机
// 都从本局 seed 推导，方便复现一局的卡池、航路和奖励。
export const ROGUE_RUN_VERSION = "rogue-run-v3";
export const ROGUE_ROUTES = Object.freeze(["crit", "missile", "swarm"]);
export const ROGUE_STRUCTURE_LIMITS = Object.freeze({
  standard: Object.freeze({ crit: 3, missile: 3, swarm: 3 }),
  machinegun: Object.freeze({ crit: 5, missile: 2, swarm: 2 }),
  missile: Object.freeze({ crit: 2, missile: 5, swarm: 2 }),
  swarm: Object.freeze({ crit: 2, missile: 2, swarm: 5 }),
});
export const ROGUE_TOTAL_STRUCTURE_CHOICES = 9;

export function rogueRunEnabled({ gameplay, profile, mode } = {}) {
  // V5 的 route-command 候选承载完整首章；保留 V3 入口只作无尽对照，
  // 避免因为候选开关不同而把三武器与局内卡池拆成两套状态。
  return profile === "ui-v43"
    && ((gameplay === ROGUE_RUN_VERSION && mode === "endless")
      || (gameplay === "route-command-v4" && ["campaign", "endless"].includes(mode)));
}

// 基础三武器始终在场。结构路线从 0 计数，首张卡只把已有装备推进一阶，
// 不会把“安装武器”伪装成一次升级。僚机的一架是基础随舰火力，首阶再
// 增加第二架，延续旧卡的双僚机语义。
export const ROGUE_BASE_LOADOUT = Object.freeze({
  missileCount: 3,
  drones: 1,
  droneDamageScale: 1,
  baseWeapons: Object.freeze(["crit", "missile", "swarm"]),
});

export const ROGUE_TACTICS = Object.freeze([
  {
    id: "tracer-guidance",
    category: "集火联动",
    name: "曳光引导",
    trigger: "机枪命中",
    benefit: "该目标下一枚导弹命中获得加成并消费标记",
    stat: "标记 2.1 秒 · 导弹 ×1.42",
    maxStacks: 1,
    tag: "focus",
  },
  {
    id: "mark-relay",
    category: "集火联动",
    name: "标记接力",
    trigger: "僚机命中或目标被击毁",
    benefit: "短时标记转给邻近目标，主舰命中时消费",
    stat: "标记转移 1 次 · 2.0 秒",
    maxStacks: 2,
    tag: "focus",
  },
  {
    id: "core-hunt",
    category: "集火联动",
    name: "爆心追猎",
    trigger: "导弹命中",
    benefit: "短时提高机枪对同目标的压制，不增加射线",
    stat: "机枪对同目标 ×1.28 · 2.2 秒",
    maxStacks: 2,
    tag: "focus",
  },
  {
    id: "full-fleet-window",
    category: "集火联动",
    name: "三武器协同",
    trigger: "三类武器在窗口内命中同目标",
    benefit: "最后一击获得一次协同加成并进入冷却",
    stat: "协同窗口 1.6 秒 · 冷却 6 秒",
    maxStacks: 2,
    tag: "focus",
  },
  {
    id: "energy-reclaim",
    category: "能量节拍",
    name: "余能回收",
    trigger: "一次真实超载正常收束",
    benefit: "回收部分能量，缩短下一次爆发间隔",
    stat: "收束后回能 12% · 每次超载 1 次",
    maxStacks: 2,
    tag: "energy",
  },
  {
    id: "sync-charge",
    category: "能量节拍",
    name: "同步充能",
    trigger: "不同类型武器连续命中",
    benefit: "满足条件后额外回能，带独立冷却",
    stat: "两类命中回能 5% · 冷却 4 秒",
    maxStacks: 2,
    tag: "energy",
  },
  {
    id: "hunter-capacitor",
    category: "能量节拍",
    name: "猎杀电容",
    trigger: "击毁高威胁舰",
    benefit: "获得有储量上限的待回收能量",
    stat: "击毁回能 8% · 储量上限 16%",
    maxStacks: 2,
    tag: "energy",
  },
  {
    id: "afterglow",
    category: "能量节拍",
    name: "收束余波",
    trigger: "超载结束",
    benefit: "爆发后短时保留增伤，不延长超载本体",
    stat: "收束增伤 ×1.18 · 1.8 秒",
    maxStacks: 2,
    tag: "energy",
  },
  {
    id: "transfer-cover",
    category: "机动护航",
    name: "转场掩护",
    trigger: "完成一次有效换区",
    benefit: "获得短时护层，独立冷却",
    stat: "护层 10 · 冷却 7 秒",
    maxStacks: 2,
    tag: "escort",
  },
  {
    id: "crisis-escort",
    category: "机动护航",
    name: "危急护航",
    trigger: "核心首次跌过危险阈值",
    benefit: "获得一次护层，避免连续失守",
    stat: "护层 18 · 每局 1 次",
    maxStacks: 1,
    tag: "escort",
  },
  {
    id: "intercept-repair",
    category: "机动护航",
    name: "截击维修",
    trigger: "击毁正在威胁核心的敌舰",
    benefit: "少量修复；满血时转为有限护层",
    stat: "修复 4% · 护层上限 8%",
    maxStacks: 2,
    tag: "escort",
  },
  {
    id: "rally-defense",
    category: "机动护航",
    name: "集结防线",
    trigger: "三种武器共同参与一次击杀",
    benefit: "下一次核心受击获得有限减伤",
    stat: "下一击减伤 35% · 储存 1 次",
    maxStacks: 2,
    tag: "escort",
  },
]);

export const ROGUE_TACTIC_BY_ID = Object.freeze(Object.fromEntries(ROGUE_TACTICS.map((tactic) => [tactic.id, tactic])));

// 特异舰的主路线第 4／5 阶不改变三武器共存，只增加该舰型的操作
// 深度。标准舰的路线在第 3 阶封顶，因此这些卡不会出现在标准局。
export const ROGUE_SPECIALIST_CARDS = Object.freeze({
  crit: Object.freeze({
    4: Object.freeze({ id: "crit-4-specialist", route: "crit", tier: 4, name: "裂甲增幅", behavior: "弱点暴露后压制加深", shortDetail: "同一目标的连续命中更快兑现", detail: "主路线专属强化；不增加可见射线", stat: "弱点兑现窗口 +0.6 秒", icon: "machinegun", category: "机枪专精" }),
    5: Object.freeze({ id: "crit-5-specialist", route: "crit", tier: 5, name: "双重追击", behavior: "处决后追加第二轮追射", shortDetail: "只在有效处决后触发，避免常驻污染", detail: "主路线专属强化；Boss 转为模块压制", stat: "追射 +1 轮", icon: "machinegun", category: "机枪专精" }),
  }),
  missile: Object.freeze({
    4: Object.freeze({ id: "missile-4-specialist", route: "missile", tier: 4, name: "爆心扩张", behavior: "集束终爆范围扩大", shortDetail: "保留锁定和分配，扩大兑现区域", detail: "主路线专属强化；不强制增加弹道数量", stat: "爆心范围 ×1.20", icon: "missile", category: "导弹专精" }),
    5: Object.freeze({ id: "missile-5-specialist", route: "missile", tier: 5, name: "饱和弹巢", behavior: "主导弹齐射再扩编", shortDetail: "高密度齐射后进入更长的补舱节拍", detail: "主路线专属强化；保留三武器同时输出", stat: "主导弹 +2 枚", icon: "missile", category: "导弹专精" }),
  }),
  swarm: Object.freeze({
    4: Object.freeze({ id: "swarm-4-specialist", route: "swarm", tier: 4, name: "编队疾速", behavior: "僚机循环加快", shortDetail: "换区和护航时仍保持主舰责任", detail: "主路线专属强化；不让僚机自动替玩家换区", stat: "僚机循环 ×1.20", icon: "drones", category: "僚机专精" }),
    5: Object.freeze({ id: "swarm-5-specialist", route: "swarm", tier: 5, name: "四机编队", behavior: "常驻僚机由三架提升至四架", shortDetail: "过载时不额外复制弹道", detail: "主路线专属强化；仍受统一目标分配规则约束", stat: "常驻僚机 ×4", icon: "drones", category: "僚机专精" }),
  }),
});

export const ROGUE_RISK_ROUTES = Object.freeze([
  Object.freeze({
    id: "relay-intercept",
    name: "中继截击",
    preview: "中继舰护送编队；先拆中继可减轻增援压力",
    threat: "先处理中继，否则后续敌舰加速",
    rewardTag: "energy",
    rewardText: "下一次整备保证一张能量节拍卡",
  }),
  Object.freeze({
    id: "dual-wing-assault",
    name: "双翼突袭",
    preview: "两翼错峰接敌，先到的一翼会提前逼近核心",
    threat: "必须读懂先后顺序并及时换区",
    rewardTag: "escort",
    rewardText: "下一次整备保证一张机动护航卡",
  }),
  Object.freeze({
    id: "shield-escort",
    name: "护盾护送",
    preview: "护盾舰保护高威胁目标，拆盾后才容易集火",
    threat: "先拆保护关系，再兑现连续压制",
    rewardTag: "focus",
    rewardText: "下一次整备保证一张集火联动卡",
  }),
]);

export const ROGUE_NORMAL_ROUTE = Object.freeze({
  id: "standard-supply",
  name: "常规补给",
  preview: "原编队节奏，保留稳定的整备窗口",
  threat: "没有额外目标优先级",
  rewardTag: "recovery",
  rewardText: "清线后核心维修；满血转为一次护层",
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function uint32(value) {
  return (Number(value) >>> 0);
}

// xorshift32 只用于可复现的候选排列；不用于任何伤害或碰撞计算。
export function rogueNextSeed(seed = 1) {
  let value = uint32(seed) || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return uint32(value) || 1;
}

export function rogueRandomUnit(seed = 1) {
  const next = rogueNextSeed(seed);
  return Object.freeze({ seed: next, value: next / 0x100000000 });
}

function routeLimitFor(state, route) {
  const ship = ROGUE_STRUCTURE_LIMITS[state?.ship] ? state.ship : "standard";
  return ROGUE_STRUCTURE_LIMITS[ship][route] ?? 0;
}

function structureTierFor(state, route) {
  return Math.max(0, Math.floor(Number(state?.structure?.[route]) || 0));
}

function totalStructureChoicesFor(state) {
  return ROGUE_ROUTES.reduce((sum, route) => sum + structureTierFor(state, route), 0);
}

function cardForNextTier(state, route) {
  const tier = structureTierFor(state, route) + 1;
  if (tier <= 3) return cardFor(route, tier);
  return ROGUE_SPECIALIST_CARDS[route]?.[tier] ?? null;
}

function legalRoutesFor(state) {
  if (totalStructureChoicesFor(state) >= ROGUE_TOTAL_STRUCTURE_CHOICES) return [];
  return ROGUE_ROUTES.filter((route) => structureTierFor(state, route) < routeLimitFor(state, route));
}

function tacticByTag(tag, state, used = new Set()) {
  return ROGUE_TACTICS.filter((tactic) => tactic.tag === tag
    && !used.has(tactic.id)
    && (state?.tactics?.[tactic.id] ?? 0) < tactic.maxStacks);
}

function tacticPoolFor(state, { tag = null, used = new Set() } = {}) {
  return ROGUE_TACTICS.filter((tactic) => (!tag || tactic.tag === tag)
    && !used.has(tactic.id)
    && (state?.tactics?.[tactic.id] ?? 0) < tactic.maxStacks);
}

function pickTactic(state, seed, { tag = null, used = new Set() } = {}) {
  const pool = tacticPoolFor(state, { tag, used });
  if (!pool.length) return Object.freeze({ tactic: null, seed: rogueNextSeed(seed) });
  const random = rogueRandomUnit(seed);
  const tactic = pool[Math.floor(random.value * pool.length) % pool.length];
  return Object.freeze({ tactic, seed: random.seed });
}

function calibrationTactic(route) {
  const name = { crit: "机枪", missile: "导弹", swarm: "僚机" }[route];
  return Object.freeze({ id: `calibration-${route}`, calibration: route, name: `${name}校准`, category: "持续成长", trigger: "选取立即生效", benefit: `${name}伤害系数增加 1 个百分点`, stat: `${name}伤害 +1% · 可累加`, maxStacks: Infinity });
}

function offeredTactic(state, seed, options = {}) {
  const result = pickTactic(state, seed, options);
  if (result.tactic || state.rules !== "v5") return result;
  const route = { energy: "missile", escort: "swarm", focus: "crit" }[options.tag]
    ?? ROGUE_ROUTES.find(route => !options.used?.has(`calibration-${route}`));
  return { seed: result.seed, tactic: route ? calibrationTactic(route) : null };
}

function cardDisplayName(baseCard, tactic) {
  return `${baseCard.name} · ${tactic.name}`;
}

// 每张卡的“本层数字”文案，唯一来源。卡池、卡片详情与旧升级弹窗都从这里取，
// 不允许任何调用方再维护第二份触发表。
export const ROGUE_TACTIC_LEVEL_TEXT = Object.freeze({
  'tracer-guidance':Object.freeze(['机枪挂标记 2.1秒 · 主导弹 +42%']),
  'mark-relay':Object.freeze(['僚机标记 2秒 · 主击 +15%','僚机标记 2秒 · 主击 +25%']),
  'core-hunt':Object.freeze(['导弹命中 · 机枪 +28% / 2.2秒','导弹命中 · 机枪 +40% / 2.2秒']),
  'full-fleet-window':Object.freeze(['三类命中 / 1.6秒 · 第三击 +25%','三类命中 / 1.6秒 · 第三击 +40%']),
  'energy-reclaim':Object.freeze(['超载结束 · 回能 12','超载结束 · 回能 18']),
  'sync-charge':Object.freeze(['两类连续命中 · 回能 5 / 冷却4秒','两类连续命中 · 回能 7 / 冷却4秒']),
  'hunter-capacitor':Object.freeze(['高威胁击杀 · 回能 8 / 储量16','高威胁击杀 · 回能 12 / 储量24']),
  'afterglow':Object.freeze(['超载结束 · 增伤18% / 1.8秒','超载结束 · 增伤28% / 2.2秒']),
  'transfer-cover':Object.freeze(['稳定换区 · 护层10 / 冷却7秒','稳定换区 · 护层14 / 冷却7秒']),
  'crisis-escort':Object.freeze(['核心跌至35 · 护层18 / 每局一次']),
  'intercept-repair':Object.freeze(['近核击杀 · 修复4 / 冷却3秒','近核击杀 · 修复6 / 冷却3秒']),
  'rally-defense':Object.freeze(['三类参与击杀 · 下次减伤35%','三类参与击杀 · 下次减伤45%']),
});

/** 取某张卡第 level 层的展示文案；越界回落到战术自身的 stat。 */
export function rogueTacticLevelText(tacticId, level = 1) {
  const index = Math.max(1, Math.floor(Number(level) || 1)) - 1;
  return ROGUE_TACTIC_LEVEL_TEXT[tacticId]?.[index] ?? ROGUE_TACTIC_BY_ID[tacticId]?.stat ?? "";
}

function displayTactic(state,tactic) {
  if(state.rules!=="v5"||tactic.calibration)return tactic;
  const next=(state.tactics[tactic.id]??0)+1;
  return {...tactic,name:`${tactic.name} ${next}/${tactic.maxStacks}`,stat:rogueTacticLevelText(tactic.id,next)};
}

function cardForOffer(state, route, tactic, index) {
  tactic = tactic && displayTactic(state,tactic);
  const baseCard = cardForNextTier(state, route);
  if (!baseCard || !tactic) return null;
  return Object.freeze({
    id: `rogue-${baseCard.id}-${tactic.id}-${index}`,
    rogue: true,
    baseCardId: baseCard.id,
    baseCard,
    route,
    tier: baseCard.tier,
    tacticId: tactic.id,
    tactic,
    name: cardDisplayName(baseCard, tactic),
    behavior: baseCard.behavior,
    shortDetail: `${baseCard.shortDetail}；${tactic.benefit}`,
    detail: `${baseCard.detail}。附带战术：${tactic.trigger} → ${tactic.benefit}`,
    stat: `${baseCard.stat} · ${tactic.stat}`,
    category: `${baseCard.category ?? "路线强化"} · ${tactic.category}`,
    icon: baseCard.icon,
    offerIndex: index,
  });
}

function structureCardForOffer(state, route, index) {
  const baseCard = cardForNextTier(state, route);
  if (!baseCard) return null;
  return Object.freeze({
    id: `rogue-structure-${baseCard.id}-${index}`,
    rogue: true,
    structureOnly: true,
    baseCardId: baseCard.id,
    baseCard,
    route,
    tier: baseCard.tier,
    tacticId: null,
    tactic: null,
    name: baseCard.name,
    behavior: baseCard.behavior,
    shortDetail: baseCard.shortDetail,
    detail: baseCard.detail,
    stat: baseCard.stat,
    category: baseCard.category ?? "武器强化",
    icon: baseCard.icon,
    offerIndex: index,
  });
}

/**
 * 创建本局状态。build 是战斗层可直接消费的快照；structure / tactics 是
 * 选卡层的独立计数，避免把附带效果误算成武器等级。
 */
export function createRogueRunState({ seed = 1, ship = "standard", runId = null, rules = "v3" } = {}) {
  const safeShip = ROGUE_STRUCTURE_LIMITS[ship] ? ship : "standard";
  const build = createBuildState();
  build.missileCount = ROGUE_BASE_LOADOUT.missileCount;
  build.drones = ROGUE_BASE_LOADOUT.drones;
  build.droneDamageScale = ROGUE_BASE_LOADOUT.droneDamageScale;
  build.baseWeapons = [...ROGUE_BASE_LOADOUT.baseWeapons];
  return {
    version: ROGUE_RUN_VERSION,
    rules,
    runId: runId ?? `rogue-${uint32(seed) || 1}`,
    seed: uint32(seed) || 1,
    ship: safeShip,
    build,
    structure: { crit: 0, missile: 0, swarm: 0 },
    tactics: Object.fromEntries(ROGUE_TACTICS.map((tactic) => [tactic.id, 0])),
    structureChoices: 0,
    mainRoute: safeShip === "machinegun" ? "crit" : safeShip === "missile" ? "missile" : safeShip === "swarm" ? "swarm" : null,
    extraAttributeUnlocked: false,
    extraAttributeAt: null,
    pendingRouteReward: null,
    pendingEncounterRouteId: null,
    routeIndex: 0,
    routeHistory: [],
    encounterHistory: [],
    cardHistory: [],
    lastOffer: [],
  };
}

export function rogueRunSnapshot(state) {
  if (!state) return null;
  const snapshotBuild = cloneBuildState(state.build ?? createBuildState());
  return Object.freeze({
    version: state.version,
    runId: state.runId,
    seed: state.seed,
    ship: state.ship,
    structure: { ...state.structure },
    tactics: { ...state.tactics },
    structureChoices: state.structureChoices,
    mainRoute: state.mainRoute,
    extraAttributeUnlocked: Boolean(state.extraAttributeUnlocked),
    extraAttributeAt: state.extraAttributeAt,
    pendingRouteReward: state.pendingRouteReward ? { ...state.pendingRouteReward } : null,
    pendingEncounterRouteId: state.pendingEncounterRouteId ?? null,
    routeIndex: state.routeIndex,
    routeHistory: state.routeHistory.map((route) => ({ ...route })),
    encounterHistory: (state.encounterHistory ?? []).map((encounter) => ({ ...encounter })),
    cardHistory: state.cardHistory.map((card) => ({ id: card.id, baseCardId: card.baseCardId, route: card.route, tier: card.tier, tacticId: card.tacticId })),
    build: snapshotBuild,
  });
}

/**
 * 生成一次整备的三张卡：先保底合法结构路线，再用独立随机效果制造
 * 差异。固定 seed + 相同状态会得到完全相同候选；换 seed 会换附带效果。
 */
export function rogueUpgradeOptions(state, { seed = state?.seed ?? 1 } = {}) {
  const legalRoutes = legalRoutesFor(state);
  if (!legalRoutes.length) {
    state.lastOffer = [];
    return [];
  }
  const offer = [];
  const usedTactics = new Set();
  let cursor = uint32(seed) || 1;
  const forcedTag = state?.pendingRouteReward?.type === "guaranteed-tactic-tag"
    ? state.pendingRouteReward.tag
    : null;
  const guaranteedRoutes = legalRoutes.length >= 3 ? legalRoutes.slice(0, 3) : legalRoutes.slice();
  for (const route of guaranteedRoutes) {
    const selected = offeredTactic(state, cursor, { tag: forcedTag && !usedTactics.size ? forcedTag : null, used: usedTactics });
    cursor = selected.seed;
    if (selected.tactic) {
      usedTactics.add(selected.tactic.id);
      offer.push(cardForOffer(state, route, selected.tactic, offer.length));
    }
  }
  // 两条或一条路线仍保持三选一：剩余槽位换成同一合法路线的不同
  // 附带效果，不能用重复空卡填充。
  while (offer.length < Math.min(3, legalRoutes.length ? 3 : 0)) {
    const route = legalRoutes[offer.length % legalRoutes.length];
    const selected = offeredTactic(state, cursor, { used: usedTactics });
    cursor = selected.seed;
    if (!selected.tactic) break;
    usedTactics.add(selected.tactic.id);
    offer.push(cardForOffer(state, route, selected.tactic, offer.length));
  }
  const result = offer.filter(Boolean);
  state.lastOffer = result;
  return result;
}

/** 战役结构强化专用：只推进武器结构，不夹带随机战术。 */
export function rogueStructureOptions(state) {
  const legalRoutes = legalRoutesFor(state);
  const result = legalRoutes.slice(0, 3).map((route, index) => structureCardForOffer(state, route, index)).filter(Boolean);
  state.lastOffer = result;
  return result;
}

function applyRogueTactic(state, tactic) {
  if (state.rules === "v5" && ROGUE_ROUTES.includes(tactic?.calibration)) {
    state.build.rogueCalibration ??= {};
    state.build.rogueCalibration[tactic.calibration] = (state.build.rogueCalibration[tactic.calibration] ?? 0) + 1;
    return true;
  }
  if (!tactic || !ROGUE_TACTIC_BY_ID[tactic.id]) return false;
  const current = Number(state.tactics[tactic.id] ?? 0);
  if (current >= tactic.maxStacks) return false;
  state.tactics[tactic.id] = current + 1;
  state.build.rogueTactics ??= {};
  state.build.rogueTactics[tactic.id] = state.tactics[tactic.id];
  if (tactic.id === "energy-reclaim") state.build.rogueEnergyReclaim = state.tactics[tactic.id];
  if (tactic.id === "sync-charge") state.build.rogueSyncCharge = state.tactics[tactic.id];
  if (tactic.id === "hunter-capacitor") state.build.rogueHunterCapacitor = state.tactics[tactic.id];
  if (tactic.id === "afterglow") state.build.rogueAfterglow = state.tactics[tactic.id];
  if (tactic.tag === "focus") state.build.rogueFocusTactics = (state.build.rogueFocusTactics ?? 0) + 1;
  if (tactic.tag === "energy") state.build.rogueEnergyTactics = (state.build.rogueEnergyTactics ?? 0) + 1;
  if (tactic.tag === "escort") state.build.rogueEscortTactics = (state.build.rogueEscortTactics ?? 0) + 1;
  return true;
}

/** 选择一张生成过的卡，只推进一条结构路线并应用一个战术效果。 */
export function applyRogueUpgrade(state, card, now = 0) {
  // V6.3 06：候选战役的随机奖励是“纯战术卡”，只加战术、不推进结构路线。
  // 结构九次仍由结构卡单独承担，两者互不重复计数。
  if (state && card?.rogue && card.tacticOnly && card.tactic) {
    if (!applyRogueTactic(state, card.tactic)) return false;
    state.cardHistory.push({ id: card.id, baseCardId: null, route: null, tier: null, tacticId: card.tacticId, randomReward: true, at: now });
    return true;
  }
  if (!state || !card?.rogue || !card.baseCard || (!card.structureOnly && !card.tactic)) return false;
  const legal = legalRoutesFor(state);
  if (!legal.includes(card.route)) return false;
  if (card.tier !== structureTierFor(state, card.route) + 1) return false;
  if (!card.structureOnly && !applyRogueTactic(state, card.tactic)) return false;
  if (card.baseCard.tier <= 3) {
    applyBuildCard(state.build, card.baseCard);
    // 标准舰开局已有一架基础僚机；首张僚机结构卡只增加第二架，
    // 不用把单架伤害砍半来伪造升级收益。旧入口仍保留原 build 行为。
    if (card.baseCard.id === "swarm-1") {
      state.build.drones = Math.max(2, state.build.drones ?? 0);
      state.build.droneDamageScale = 1;
    }
  } else {
    state.build.cards.push(card.baseCard.id);
    state.build.routes[card.route] = (state.build.routes[card.route] ?? 0) + 1;
    if (card.baseCard.id === "crit-4-specialist") state.build.rogueCritSpecialist = (state.build.rogueCritSpecialist ?? 0) + 1;
    if (card.baseCard.id === "crit-5-specialist") state.build.rogueCritSpecialist = (state.build.rogueCritSpecialist ?? 0) + 1;
    if (card.baseCard.id === "missile-4-specialist") state.build.blastRadiusMultiplier = Math.max(1.2, state.build.blastRadiusMultiplier ?? 1);
    if (card.baseCard.id === "missile-5-specialist") state.build.missileCount = Math.max(7, (state.build.missileCount ?? 3) + 2);
    if (card.baseCard.id === "swarm-4-specialist") state.build.droneAttackSpeedMultiplier = Math.max(1.2, state.build.droneAttackSpeedMultiplier ?? 1);
    if (card.baseCard.id === "swarm-5-specialist") state.build.drones = Math.max(4, state.build.drones ?? 1);
  }
  state.structure[card.route] = structureTierFor(state, card.route) + 1;
  state.structureChoices = totalStructureChoicesFor(state);
  state.cardHistory.push({ id: card.id, baseCardId: card.baseCardId, route: card.route, tier: card.tier, tacticId: card.tacticId ?? null, structureOnly: Boolean(card.structureOnly), at: now });
  if (!card.structureOnly && state.pendingRouteReward?.type === "guaranteed-tactic-tag" && (state.rules === "v5" || state.pendingRouteReward.tag === card.tactic.tag)) {
    state.pendingRouteReward = null;
  }
  // 三路结构完成后仍是九次成长；特异舰的“主路线第六阶”按本次
  // 推荐解释为九次完成后的自动额外属性，不占第十次卡位。
  const mainRoute = state.mainRoute;
  if (!state.extraAttributeUnlocked && state.structureChoices >= ROGUE_TOTAL_STRUCTURE_CHOICES
    && mainRoute && state.structure[mainRoute] >= 5) {
    state.extraAttributeUnlocked = true;
    state.extraAttributeAt = now;
  }
  state.lastOffer = [];
  return true;
}

function routeRewardFor(route, state) {
  if (route.id === ROGUE_NORMAL_ROUTE.id) {
    return Object.freeze({ type: "recovery", tag: "recovery", amount: 1, text: route.rewardText });
  }
  const tagCount = ROGUE_TACTICS.filter((tactic) => tactic.tag === route.rewardTag && (state?.tactics?.[tactic.id] ?? 0) < tactic.maxStacks).length;
  return Object.freeze({ type: "guaranteed-tactic-tag", tag: route.rewardTag, amount: tagCount > 0 ? 1 : 0, text: route.rewardText });
}

export function rogueRouteOptions(state, { seed = state?.seed ?? 1 } = {}) {
  const random = rogueRandomUnit(uint32(seed) + Math.max(0, Number(state?.routeIndex) || 0));
  const risk = ROGUE_RISK_ROUTES[Math.floor(random.value * ROGUE_RISK_ROUTES.length) % ROGUE_RISK_ROUTES.length];
  return Object.freeze([
    Object.freeze({ ...ROGUE_NORMAL_ROUTE, kind: "normal", reward: routeRewardFor(ROGUE_NORMAL_ROUTE, state) }),
    Object.freeze({ ...risk, kind: "risk", reward: routeRewardFor(risk, state) }),
  ]);
}

export function applyRogueRoute(state, routeId, now = 0) {
  if (!state) return false;
  const route = [ROGUE_NORMAL_ROUTE, ...ROGUE_RISK_ROUTES].find((candidate) => candidate.id === routeId);
  if (!route) return false;
  const reward = routeRewardFor(route, state);
  state.pendingRouteReward = { ...reward, routeId: route.id };
  // 航路决定下一段遭遇；只消费一次，避免玩家选完一条风险路后整局
  // 都被同一主题覆盖。奖励与遭遇分别记录，便于结算复盘。
  state.pendingEncounterRouteId = route.id;
  state.routeHistory.push({ id: route.id, kind: route.id === ROGUE_NORMAL_ROUTE.id ? "normal" : "risk", rewardTag: reward.tag, at: now });
  state.routeIndex = Math.max(0, Number(state.routeIndex) || 0) + 1;
  return true;
}

/**
 * 取出下一段遭遇的航路主题。它是一次性消费的运行时合同，和“下一张
 * 卡的定向奖励”分开，避免刷新卡片时意外重放敌群主题。
 */
export function consumeRogueEncounterRoute(state, { at = 0 } = {}) {
  const routeId = state?.pendingEncounterRouteId ?? ROGUE_NORMAL_ROUTE.id;
  if (state) {
    state.pendingEncounterRouteId = null;
    state.encounterHistory ??= [];
    state.encounterHistory.push({ routeId, at });
  }
  return routeId;
}

function routeUnit(unit, overrides = {}) {
  return { ...unit, ...overrides };
}

/**
 * 把已生成的无尽旗帜套上航路主题。只重排／替换现有敌舰，不改变血量
 * 或碰撞合同；这样风险路线能改变玩家的处理顺序，同时不会偷偷削掉
 * 三武器的既得火力。
 */
export function rogueEncounterForFlag(flag, routeId = ROGUE_NORMAL_ROUTE.id) {
  if (!flag || !routeId || routeId === ROGUE_NORMAL_ROUTE.id) return flag;
  const sourceSubwaves = flag.subwaves ?? [];
  const subwaves = sourceSubwaves.map((subwave, subwaveIndex) => {
    let units = (subwave.units ?? []).map((unit) => ({ ...unit }));
    if (!units.length) return Object.freeze({ ...subwave, routeId, units: Object.freeze(units) });
    if (routeId === "relay-intercept" && subwaveIndex === 0) {
      const relayIndex = units.findIndex((unit) => unit.type === "relay");
      if (relayIndex < 0) {
        const targetIndex = Math.min(units.length - 1, 1);
        units[targetIndex] = routeUnit(units[targetIndex], { type: "relay", routeObjective: "relay" });
      } else {
        units[relayIndex] = routeUnit(units[relayIndex], { routeObjective: "relay" });
      }
    }
    if (routeId === "dual-wing-assault" && subwaveIndex === 0) {
      // 将先到的两个目标明确放在左右翼，保留其余单位的相对顺序。
      units[0] = routeUnit(units[0], { sector: 0, routeObjective: "left-wing" });
      if (units.length > 1) units[1] = routeUnit(units[1], { sector: 2, routeObjective: "right-wing" });
      units = units.map((unit, index) => index > 1 ? routeUnit(unit, { sector: index % 2 ? 2 : 0 }) : unit);
    }
    if (routeId === "shield-escort" && subwaveIndex === 0) {
      const shieldIndex = units.findIndex((unit) => unit.type === "shield");
      const protectedIndex = units.findIndex((unit, index) => index !== shieldIndex && ["frigate", "striker", "splitter"].includes(unit.type));
      const escortSector = units[shieldIndex >= 0 ? shieldIndex : 0]?.sector ?? 1;
      if (shieldIndex < 0) units[0] = routeUnit(units[0], { type: "shield", sector: escortSector, routeObjective: "escort-shield" });
      else units[shieldIndex] = routeUnit(units[shieldIndex], { sector: escortSector, routeObjective: "escort-shield" });
      if (protectedIndex >= 0) units[protectedIndex] = routeUnit(units[protectedIndex], { sector: escortSector, routeObjective: "protected-target" });
    }
    units = units.map((unit, index) => ({ ...unit, index, formationIndex: subwaveIndex }));
    const routeLabel = routeId === "relay-intercept" ? "中继截击" : routeId === "dual-wing-assault" ? "双翼突袭" : "护盾护送";
    return Object.freeze({
      ...subwave,
      routeId,
      label: `${subwave.label ?? `第 ${subwaveIndex + 1} 子波`} · ${routeLabel}`,
      units: Object.freeze(units),
    });
  });
  const units = subwaves.flatMap((subwave) => subwave.units.map((unit) => ({ ...unit, flag: flag.flag, subwaveIndex: subwave.subwaveIndex })));
  const routeLabel = routeId === "relay-intercept" ? "中继截击" : routeId === "dual-wing-assault" ? "双翼突袭" : "护盾护送";
  return Object.freeze({ ...flag, routeId, label: `${flag.label} · ${routeLabel}`, subwaves: Object.freeze(subwaves), units: Object.freeze(units) });
}

export function consumeRogueRouteReward(state, { tacticId = null } = {}) {
  const pending = state?.pendingRouteReward;
  if (!pending) return null;
  if (pending.type === "guaranteed-tactic-tag") {
    const tactic = tacticId ? ROGUE_TACTIC_BY_ID[tacticId] : null;
    if (!tactic || tactic.tag !== pending.tag || (state.tactics[tactic.id] ?? 0) >= tactic.maxStacks) return null;
    state.pendingRouteReward = null;
    return tactic;
  }
  state.pendingRouteReward = null;
  return { ...pending };
}

export function rogueLateOptions(state, { seed = state?.seed ?? 1 } = {}) {
  const available = tacticPoolFor(state);
  if (!available.length && state.rules !== "v5") return [];
  const offer = [];
  const used = new Set();
  let cursor = uint32(seed) || 1;
  while (offer.length < 3 && (state.rules === "v5" || used.size < available.length)) {
    const selected = { ...offeredTactic(state, cursor, { used, tag: !offer.length && state.rules === "v5" ? state.pendingRouteReward?.tag : null }) };
    cursor = selected.seed;
    if (!selected.tactic) break;
    selected.tactic=displayTactic(state,selected.tactic);
    used.add(selected.tactic.id);
    offer.push(Object.freeze({
      id: `rogue-late-${selected.tactic.id}-${offer.length}`,
      rogue: true,
      late: true,
      tacticId: selected.tactic.id,
      tactic: selected.tactic,
      route: "all",
      tier: 4,
      name: selected.tactic.name,
      behavior: selected.tactic.benefit,
      shortDetail: selected.tactic.trigger,
      detail: selected.tactic.benefit,
      stat: selected.tactic.stat,
      category: `后期战术 · ${selected.tactic.category}`,
      icon: "all",
      offerIndex: offer.length,
    }));
  }
  return offer;
}

export function applyRogueLateOption(state, card, now = 0) {
  if (!state || !card?.rogue || !card.late || !card.tactic) return false;
  if (!applyRogueTactic(state, card.tactic)) return false;
  if(state.rules === "v5") state.pendingRouteReward=null;
  state.cardHistory.push({ id: card.id, baseCardId: null, route: "all", tier: 4, tacticId: card.tacticId, at: now, late: true });
  return true;
}

export function rogueBuildSummary(state) {
  const structure = Object.fromEntries(ROGUE_ROUTES.map((route) => [route, structureTierFor(state, route)]));
  const tactics = Object.entries(state?.tactics ?? {}).filter(([, count]) => count > 0).map(([id, count]) => ({ id, count, name: ROGUE_TACTIC_BY_ID[id]?.name ?? id }));
  return Object.freeze({
    ship: state?.ship ?? "standard",
    baseWeapons: [...ROGUE_BASE_LOADOUT.baseWeapons],
    structure,
    structureChoices: totalStructureChoicesFor(state),
    limits: { ...(ROGUE_STRUCTURE_LIMITS[state?.ship] ?? ROGUE_STRUCTURE_LIMITS.standard) },
    tactics,
    extraAttributeUnlocked: Boolean(state?.extraAttributeUnlocked),
  });
}

export { legalRoutesFor, routeLimitFor, structureTierFor, totalStructureChoicesFor };

// V5 event rules; only the route-command candidate calls these functions.
export const nativeWeapon = source => ({auto:'crit',crit:'crit',missile:'missile',drone:'swarm'})[source] ?? null;
const routes=['crit','missile','swarm'];
const level=(s,id)=>s.rogueTacticLevel(id);
const tier=(s,id,a,b)=>level(s,id)>1?b:a;
const now=s=>s.combatClock??0;
const active=s=>s.isOverloadActive() || s.isOverloadFinisherActive();
function event(s,id,data={}) { s.recordRogueTacticEvent(id,data); }
export function addGuard(s,amount,until,tag='tactic') {
  s.v5Guards=(s.v5Guards??[]).filter(g=>g.until>now(s)&&g.amount>0);
  const gained=Math.max(0,Math.min(amount,24-s.v5Guards.reduce((sum,g)=>sum+g.amount,0)));
  if(gained) s.v5Guards.push({amount:gained,until,tag});
  return gained;
}
export function absorbGuard(s,damage) {
  addGuard(s,0,0);
  s.v5Guards.sort((a,b)=>a.until-b.until);
  let remaining=damage;
  for(const guard of s.v5Guards) {const used=Math.min(guard.amount,remaining);guard.amount-=used;remaining-=used;}
  if(damage>remaining) event(s,'guard-absorb',{absorbed:damage-remaining});
  return remaining;
}
function energy(s,amount,storage=false,settling=false) {
  const gained=active(s)&&!settling?0:Math.min(amount,Math.max(0,100-s.overloadEnergy));
  s.overloadEnergy+=gained;
  const cap=tier(s,'hunter-capacitor',16,24);
  const stored=storage?Math.min(amount-gained,cap-(s.v5Capacitor??0)):0;
  s.v5Capacitor=(s.v5Capacitor??0)+stored;
  return {gained,stored};
}
export function bonusFor(s,e,source) {
  const kind=nativeWeapon(source),t=now(s),plan={};
  let bonus=0;
  if(level(s,'afterglow')&&t<(s.rogueAfterglowUntil??0)) bonus+=tier(s,'afterglow',.18,.28);
  if(kind==='crit'&&level(s,'core-hunt')&&t<(e.rogueCoreHuntUntil??0)) bonus+=tier(s,'core-hunt',.28,.40);
  if(['crit','missile'].includes(kind)&&t<(e.rogueRelayUntil??0)) {bonus+=tier(s,'mark-relay',.15,.25);plan.relay=true;}
  if(kind==='missile'&&t<(e.rogueTracerUntil??0)) {bonus+=.42;plan.tracer=true;}
  if(kind&&level(s,'full-fleet-window')&&t-(s.v5FleetAt??-Infinity)>=6000
    &&routes.every(r=>r===kind||t-(e.v5Hits?.[r]??-Infinity)<=1600)) {
    bonus+=tier(s,'full-fleet-window',.25,.4);plan.fleet=true;
  }
  const origin=kind??({'hunter':'crit','missile-split':'missile','missile-blast':'missile','guided-micro':'swarm','intercept':'swarm','drone-converge':'swarm'})[source];
  bonus+=(s.build.rogueCalibration?.[origin]??0)*.01;
  e.v5BonusPlan=plan;
  return bonus;
}
export function afterHit(s,e,source,damage) {
  if(!(damage>0)) return;
  const t=now(s),kind=nativeWeapon(source),plan=e.v5BonusPlan??{};
  if(plan.relay){e.rogueRelayUntil=0;event(s,'mark-relay-consume',{targetId:e.id});}
  if(plan.tracer){e.rogueTracerUntil=0;event(s,'tracer-guidance-consume',{targetId:e.id});}
  if(plan.fleet){s.v5FleetAt=t;event(s,'full-fleet-window',{targetId:e.id,source});}
  e.v5BonusPlan=null;
  if(!kind) return;
  e.v5Hits??={};e.v5Hits[kind]=t;
  if(kind==='crit'&&level(s,'tracer-guidance')) e.rogueTracerUntil=t+2100;
  if(kind==='missile'&&level(s,'core-hunt')) e.rogueCoreHuntUntil=t+2200;
  if(kind==='swarm'&&level(s,'mark-relay')) {e.rogueRelayUntil=t+2000;e.v5RelayTransferred=false;}
  if(level(s,'sync-charge')&&s.rogueLastWeaponKind&&s.rogueLastWeaponKind!==kind&&t-s.rogueLastWeaponAt<=900&&t-(s.rogueLastSyncAt??-Infinity)>=4000) {
    s.rogueLastSyncAt=t;const gain=energy(s,tier(s,'sync-charge',5,7));
    if(gain.gained) event(s,'sync-charge',gain);
  }
  s.rogueLastWeaponKind=kind;s.rogueLastWeaponAt=t;
}
export function onKill(s,e,isEmergency) {
  const t=now(s);
  if(level(s,'mark-relay')&&e.rogueRelayUntil>t&&!e.v5RelayTransferred) {
    const next=s.getCombatTargets().filter(c=>!c.dead&&c.id!==e.id&&Math.hypot(c.x-e.x,c.y-e.y)<=180)
      .sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
    if(next&&(next.rogueRelayUntil??0)<e.rogueRelayUntil){next.rogueRelayUntil=e.rogueRelayUntil;next.v5RelayTransferred=true;event(s,'mark-relay-transfer',{fromId:e.id,targetId:next.id});}
  }
  if(level(s,'hunter-capacitor')&&['striker','frigate','shield','relay','splitter'].includes(e.type)) {
    const gain=energy(s,tier(s,'hunter-capacitor',8,12),true);if(gain.gained||gain.stored)event(s,'hunter-capacitor',gain);
  }
  if(level(s,'intercept-repair')&&isEmergency&&t-(s.v5RepairAt??-Infinity)>=3000) {
    s.v5RepairAt=t;const amount=tier(s,'intercept-repair',4,6),restored=Math.min(amount,100-s.coreHealth);s.coreHealth+=restored;
    const guard=addGuard(s,restored===0?tier(s,'intercept-repair',8,12):amount-restored,t+4000);
    if(restored||guard)event(s,'intercept-repair',{restored,guard});
  }
  if(level(s,'rally-defense')&&routes.every(r=>t-(e.v5Hits?.[r]??-Infinity)<=2000)&&!s.rogueDefenseCharges){s.rogueDefenseCharges=1;event(s,'rally-defense');}
}
export function incomingDamage(s,damage) {
  if(s.rogueDefenseCharges){damage*=1-tier(s,'rally-defense',.35,.45);s.rogueDefenseCharges=0;event(s,'rally-defense-absorb');}
  return absorbGuard(s,damage);
}
export function afterCoreDamage(s,before) {
  if(level(s,'crisis-escort')&&!s.rogueCrisisUsed&&before>35&&s.coreHealth<=35&&s.coreHealth>0){s.rogueCrisisUsed=true;const guard=addGuard(s,18,now(s)+4000);if(guard)event(s,'crisis-escort',{guard});}
}
export function endOverload(s) {
  if(s.coreHealth<=0)return;
  if(level(s,'energy-reclaim')){const gain=energy(s,tier(s,'energy-reclaim',12,18),false,true);if(gain.gained)event(s,'energy-reclaim',gain);}
  if(s.v5Capacitor){const saved=s.v5Capacitor;s.v5Capacitor=0;const gain=energy(s,saved,false,true);if(gain.gained)event(s,'hunter-capacitor-reclaim',gain);}
  if(level(s,'afterglow')){s.rogueAfterglowUntil=now(s)+tier(s,'afterglow',1800,2200);event(s,'afterglow');}
}
export function updateTransfer(s) {
  const p=s.v5Transfer;if(!p)return;
  if(p.to!==s.currentSector){s.v5Transfer=null;return;}
  if(now(s)-p.at<350)return;
  s.v5Transfer=null;
  if(level(s,'transfer-cover')&&now(s)-(s.v5TransferAt??-Infinity)>=7000){s.v5TransferAt=now(s);const guard=addGuard(s,tier(s,'transfer-cover',10,14),now(s)+2500);if(guard)event(s,'transfer-cover',{guard});}
}
