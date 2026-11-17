import { ENDLESS_LATE_BALANCE } from "./endless-director.js";

export const BUILD_ROUTES = Object.freeze({
  // 三条前期火力路线是战术差异，不是强弱稀有度。色彩只做低面积
  // 路线识别，亮度接近且不复用白 / 绿 / 蓝 / 紫 / 橙稀有度语义。
  crit: { name: "机枪压制", short: "机枪", category: "机枪强化", color: 0x55dce8 },
  missile: { name: "导弹轰炸", short: "导弹", category: "导弹强化", color: 0xe6b866 },
  swarm: { name: "僚机支援", short: "僚机", category: "僚机强化", color: 0xa6b7e8 },
});

export const CARD_RARITIES = Object.freeze({
  1: { id: "common", name: "普通", color: 0xe7f7fa, stars: "◇" },
  2: { id: "uncommon", name: "优秀", color: 0x63e58a, stars: "◇◇" },
  3: { id: "rare", name: "稀有", color: 0x5ca9ff, stars: "◇◇◇" },
  4: { id: "epic", name: "史诗", color: 0x9e8cff, stars: "◇◇◇◇" },
  5: { id: "legendary", name: "传说", color: 0xff9b4a, stars: "◇◇◇◇◇" },
});

export const BUILD_SYNERGIES = Object.freeze({
  critMissile: { id: "crit-missile", name: "弱点引爆", routes: ["crit", "missile"], color: 0xffbc63 },
  critSwarm: { id: "crit-swarm", name: "猎杀接力", routes: ["crit", "swarm"], color: 0xffd85b },
  missileSwarm: { id: "missile-swarm", name: "蜂群制导", routes: ["missile", "swarm"], color: 0xb49dff },
  fullFleet: { id: "full-fleet", name: "全舰协同", routes: ["crit", "missile", "swarm"], color: 0x65e7f5 },
});

// The guide is intentionally short and action-first. It tells a new player
// what the second route contributes without turning the upgrade screen into a
// glossary or asking them to remember hidden rules.
export const BUILD_COMBO_GUIDE = Object.freeze([
  { id: "crit-missile", routes: ["crit", "missile"], title: "弱点引爆", role: "单体爆发", trigger: "机枪形成弱点或暴击命中", benefit: "标记 2.1 秒；下一枚主导弹伤害 ×1.42，并消耗标记", stat: "标记 2.1s · 导弹 ×1.42", color: 0xffbc63 },
  { id: "crit-swarm", routes: ["crit", "swarm"], title: "猎杀接力", role: "连续清场", trigger: "僚机将目标压至 28% 生命", benefit: "机枪对该目标下一次命中必定暴击；紧急转火后仍可收尾", stat: "处决线 28% · 下一击必暴", color: 0xffd85b },
  { id: "missile-swarm", routes: ["missile", "swarm"], title: "蜂群制导", role: "多目标覆盖", trigger: "每轮主导弹齐射", benefit: "两架僚机各追加 1 枚微型制导弹，每枚为主弹 35% 伤害", stat: "追加 2 弹 · 每枚 35%", color: 0xb49dff },
  { id: "full-fleet", routes: ["crit", "missile", "swarm"], title: "全舰协同", role: "稳定终局", trigger: "每 13 秒自动启动", benefit: "标记 → 70 点主炮重击 → 2 枚协同导弹（38 × 1.08）", stat: "周期 13s · 三段协同", color: 0x65e7f5 },
]);

export const BUILD_CARDS = Object.freeze([
  { id: "crit-1", route: "crit", tier: 1, name: "双炮闩", behavior: "单管 → 双管交替", shortDetail: "连续弹链压住当前区域", detail: "机枪展开双炮闩，交替弹链让当前目标持续承压", stat: "双管交替 · 暴击率 +18%", icon: "machinegun" },
  { id: "missile-1", route: "missile", tier: 1, name: "五联弹巢", behavior: "导弹 3 → 5", shortDetail: "五枚导弹错峰出舱", detail: "每轮由 3 枚增加到 5 枚，保留锁定与飞行延迟", stat: "齐射数量 +2", icon: "missile" },
  { id: "swarm-1", route: "swarm", tier: 1, name: "双僚机", behavior: "僚机 0 → 2", shortDetail: "两架交叉射击", detail: "增加 2 架僚机，持续交叉射击", stat: "僚机数量 +2", icon: "drones" },
  { id: "crit-2", route: "crit", tier: 2, name: "弱点压制", behavior: "连续命中 → 装甲暴露", shortDetail: "锁住同一目标叠加弱点", detail: "连续有效命中累积弱点，转火会损失部分压制进度", stat: "6 轮命中 · 弱点暴露", icon: "machinegun" },
  { id: "missile-2", route: "missile", tier: 2, name: "多目标弹仓", behavior: "集中齐射 → 有效分配", shortDetail: "优先覆盖多个存活目标", detail: "同轮导弹按剩余生命与威胁分配，减少对残血目标的过量伤害", stat: "多目标分配 · 保留高爆", icon: "missile" },
  { id: "swarm-2", route: "swarm", tier: 2, name: "护航分工", behavior: "提前预备 → 跨区补漏", shortDetail: "一架随舰，一架提前支援告急区", detail: "僚机先锁定预备态近核目标，进入拦截态后强化响应，并允许一架跨区支援相邻告急区", stat: "纯僚机独立截击", icon: "drones" },
  { id: "crit-3", route: "crit", tier: 3, name: "裂甲处决", behavior: "弱点暴露 → 处决追射", shortDetail: "打穿当前目标并接力转火", detail: "满弱点或低生命目标触发处决，剩余追射转向同区下一目标；Boss 转为模块压制", stat: "处决线 25% · 追射 1 轮", icon: "machinegun" },
  { id: "missile-3", route: "missile", tier: 3, name: "集束终爆", behavior: "主弹命中 → 二层追击", shortDetail: "子弹头追击仍存活目标", detail: "主弹终端展开集束弹头，优先追击仍存活的有效目标", stat: "每枚 +3 集束弹头", icon: "missile" },
  { id: "swarm-3", route: "swarm", tier: 3, name: "蜂群汇聚", behavior: "主动救场 → 短时扩编", shortDetail: "切入告急区后汇聚高威胁", detail: "玩家切入告急区并完成有效拦截后短时扩编；过载立即进入汇聚态", stat: "救场汇聚 3 秒", icon: "drones" },
]);

// 卡片只提供本次行为和一个关键数值。保留这个纯函数给 QA 与旧调用方，
// 但不再返回未解锁路线、缺少卡片或触发公式，避免把组合教学塞回选卡层。
export function cardDisplayFor(state, card) {
  if (card?.formEvolution) {
    return {
      behavior: card.behavior ?? card.name ?? "舰队强化",
      shortDetail: card.shortDetail ?? card.detail ?? "立即生效",
      stat: card.stat ?? "获得舰队强化",
      currentTier: Math.max(0, Number(card.evolutionLevel ?? 1) - 1),
      nextTier: Number(card.evolutionLevel ?? 1),
    };
  }
  if (card?.rogue) {
    return {
      behavior: card.behavior ?? card.baseCard?.behavior ?? card.name ?? "随机战术强化",
      shortDetail: card.shortDetail ?? card.tactic?.benefit ?? "立即生效",
      stat: card.stat ?? card.tactic?.stat ?? card.baseCard?.stat ?? "获得战术强化",
      currentTier: Math.max(0, Number(card.tier ?? card.baseCard?.tier ?? 1) - 1),
      nextTier: Number(card.tier ?? card.baseCard?.tier ?? 1),
    };
  }
  const current = routeTierFor(state, card?.route) ?? 0;
  const lateLayer = Number(state?.lateUpgrades?.[card?.id] ?? 0);
  const isLateCard = typeof card?.id === "string" && (card.id.startsWith("late-") || card.id.startsWith("resonance-"));
  if (isLateCard) {
    const layerLabel = `第 ${lateLayer + 1} 层`;
    return {
      behavior: `${card?.behavior ?? card?.name ?? "后期强化"} · ${layerLabel}`,
      shortDetail: card?.shortDetail ?? card?.detail ?? "立即生效",
      stat: card?.stat ?? "获得后期强化",
      currentTier: lateLayer,
      nextTier: lateLayer + 1,
      layer: lateLayer + 1,
    };
  }
  return {
    behavior: card?.behavior ?? card?.name ?? "新火力行为",
    shortDetail: card?.shortDetail ?? card?.detail ?? "立即生效",
    stat: card?.stat ?? "获得新火力",
    currentTier: current,
    nextTier: card?.tier ?? current + 1,
  };
}

export function cardPreviewFor(state, card) {
  const display = cardDisplayFor(state, card);
  const synergyPreview = cardSynergyPreviewFor(state, card);
  return {
    before: `当前 Lv${display.currentTier}`,
    after: display.behavior,
    synergyHint: synergyPreview?.text ?? "",
    synergyPreview,
    ...display,
  };
}

// 选卡层的几何契约：卡片只在固定安全区内排布，所有长文案都必须
// 进入卡片的四层结构（身份 / 行为 / 数值芯片 / 联动槽位），不再用
// 内容长度反过来撑高面板。这个纯函数同时给浏览器 QA 和单元测试使用。
export function upgradeCardLayoutFor({ cardCount = 3, profile = "legacy" } = {}) {
  const count = Math.max(1, Math.min(3, Math.round(Number(cardCount) || 3)));
  if (profile === "art-refresh") {
    const cardHeight = count === 3 ? 174 : count === 2 ? 188 : 204;
    const cardGap = count === 3 ? 14 : 18;
    const startY = count === 3 ? 392 : count === 2 ? 494 : 620;
    const cardYs = Array.from({ length: count }, (_, index) => startY + index * (cardHeight + cardGap));
    return Object.freeze({
      count,
      profile,
      startY,
      cardHeight,
      cardGap,
      cardYs: Object.freeze(cardYs),
      safeBottom: cardYs[cardYs.length - 1] + cardHeight / 2,
      contentBottom: cardYs[cardYs.length - 1] + 76,
    });
  }
  if (profile === "release-candidate") {
    const cardHeight = count === 3 ? 202 : count === 2 ? 218 : 232;
    const cardGap = count === 3 ? 14 : 18;
    const startY = count === 3 ? 398 : count === 2 ? 500 : 630;
    const cardYs = Array.from({ length: count }, (_, index) => startY + index * (cardHeight + cardGap));
    return Object.freeze({
      count,
      profile,
      startY,
      cardHeight,
      cardGap,
      cardYs: Object.freeze(cardYs),
      safeBottom: cardYs[cardYs.length - 1] + cardHeight / 2,
      contentBottom: cardYs[cardYs.length - 1] + 93,
    });
  }
  const cardHeight = count === 3 ? 190 : 208;
  const cardGap = count === 3 ? 16 : 18;
  const startY = count === 3 ? 402 : count === 2 ? 478 : 584;
  const cardYs = Array.from({ length: count }, (_, index) => startY + index * (cardHeight + cardGap));
  return Object.freeze({
    count,
    startY,
    cardHeight,
    cardGap,
    cardYs: Object.freeze(cardYs),
    safeBottom: cardYs[cardYs.length - 1] + cardHeight / 2,
    contentBottom: cardYs[cardYs.length - 1] + 86,
  });
}

function routeNamesFor(routes = []) {
  return routes.map((route) => BUILD_ROUTES[route]?.short ?? route).join(" + ");
}

// 选卡前只回答两个问题：这张卡会不会组成新联动？如果不会，下一条
// 最接近的联动还缺哪条路线？它不展示触发公式，把公式留给解锁后的教学层。
export function cardSynergyPreviewFor(state = {}, card = null) {
  if (card?.formEvolution) {
    return Object.freeze({
      kind: "preview",
      ids: Object.freeze([`form-${card.route}`]),
      names: Object.freeze([`${BUILD_ROUTES[card.route]?.short ?? card.route}强化`]),
      routes: Object.freeze([card.route]),
      missing: Object.freeze([]),
      text: `${BUILD_ROUTES[card.route]?.short ?? card.route} · 本次强化立即生效`,
    });
  }
  if (card?.rogue) {
    return Object.freeze({
      kind: "tactic",
      ids: Object.freeze([card.tacticId]),
      names: Object.freeze([card.tactic?.name ?? "随机战术"]),
      routes: Object.freeze([card.route]),
      missing: Object.freeze([]),
      text: `${card.tactic?.category ?? "随机战术"} · ${card.tactic?.name ?? "附带效果"}`,
    });
  }
  if (!card || card.id?.startsWith("late-") || card.id?.startsWith("resonance-")) return null;
  const preview = cloneBuildState(state);
  applyBuildCard(preview, card);
  const unlocked = newlyUnlockedSynergies(state, preview);
  if (unlocked.length) {
    return Object.freeze({
      kind: "unlock",
      ids: Object.freeze(unlocked.map((synergy) => synergy.id)),
      names: Object.freeze(unlocked.map((synergy) => synergy.name)),
      routes: Object.freeze(unlocked[0].routes),
      text: `新联动 · ${unlocked.map((synergy) => synergy.name).join("、")}`,
    });
  }
  const activeIds = new Set(getBuildSynergies(state).map((synergy) => synergy.id));
  const candidates = BUILD_COMBO_GUIDE.filter((guide) => !activeIds.has(guide.id));
  const candidate = candidates.find((guide) => guide.routes.includes(card.route) && guide.routes.some((route) => hasBuildRoute(state, route)))
    ?? candidates.find((guide) => guide.routes.includes(card.route))
    ?? candidates[0];
  if (!candidate) return null;
  const missing = candidate.routes.filter((route) => !hasBuildRoute(preview, route));
  return Object.freeze({
    kind: "preview",
    ids: Object.freeze([candidate.id]),
    names: Object.freeze([candidate.title]),
    routes: Object.freeze(candidate.routes),
    missing: Object.freeze(missing),
    text: `下一联动 · ${candidate.title}${missing.length ? ` · 还差 ${routeNamesFor(missing)}` : ""}`,
  });
}

// 仅用于旧测试/外部 QA 的兼容接口；正式 UI 不调用它来预告组合。
export function comboPreviewFor(state, card) {
  const preview = cardPreviewFor(state, card);
  return {
    ...preview,
    comboId: preview.synergyPreview?.ids?.[0] ?? null,
    comboName: preview.synergyPreview?.names?.[0] ?? "",
    comboRole: preview.synergyPreview?.kind === "unlock" ? "新联动" : "下一联动",
    comboHint: preview.synergyHint ?? "",
  };
}

export const CAMPAIGN_WAVES = Object.freeze([
  { at: 0.5, label: "接敌校准 · 三路侦察 / 双翼快攻", units: [["scout", 140, 188], ["scout", 360, 220], ["scout", 580, 188], ["striker", 92, 168], ["striker", 628, 168]] },
  { at: 4.2, label: "第一次抉择 · 左翼快攻 / 右翼舰群", units: [["striker", 92, 176], ["striker", 188, 224], ["frigate", 580, 166], ["scout", 520, 238], ["scout", 640, 248]] },
  { at: 8.1, label: "反向抉择 · 左翼积压 / 右翼快攻", units: [["frigate", 140, 172], ["scout", 82, 230], ["scout", 140, 248], ["scout", 202, 236], ["striker", 552, 176], ["striker", 628, 226]] },
  { at: 12.8, label: "第一压力峰 · 中枢快攻 / 右翼重群", units: [["striker", 322, 172], ["striker", 398, 224], ["frigate", 580, 164], ["scout", 514, 228], ["scout", 580, 248], ["scout", 646, 236]] },
  { at: 21.2, label: "护送抉择 · 左翼护盾 / 右翼突破", units: [["shield", 108, 174], ["frigate", 178, 222], ["scout", 88, 244], ["striker", 548, 176], ["striker", 624, 226], ["scout", 580, 246]] },
  { at: 28.6, label: "源头抉择 · 左翼增殖 / 右翼快攻", units: [["relay", 104, 184], ["splitter", 176, 232], ["frigate", 360, 172], ["scout", 360, 244], ["striker", 548, 176], ["striker", 624, 226]] },
  { at: 36.4, label: "重装抉择 · 左翼护送 / 右翼双突击", units: [["shield", 94, 176], ["frigate", 178, 222], ["scout", 132, 244], ["frigate", 360, 170], ["striker", 546, 176], ["striker", 624, 226], ["scout", 584, 246]] },
  { at: 44.1, label: "三线裁决 · 增幅 / 分裂 / 快攻", units: [["relay", 104, 178], ["scout", 174, 232], ["splitter", 360, 170], ["scout", 326, 232], ["scout", 398, 246], ["striker", 548, 178], ["striker", 624, 230]] },
  { at: 51.8, label: "双源抉择 · 左翼护送 / 右翼增幅", units: [["shield", 104, 174], ["frigate", 176, 220], ["striker", 92, 244], ["relay", 548, 184], ["striker", 624, 226], ["scout", 580, 246]] },
  { at: 58.4, label: "终局前夜 · 双翼快攻 / 中枢重群", units: [["striker", 92, 176], ["striker", 184, 226], ["frigate", 360, 166], ["scout", 320, 232], ["scout", 400, 246], ["striker", 536, 226], ["striker", 628, 176]] },
]);

export const BOSS_PARTS = Object.freeze([
  { id: "boss-left", type: "bossWeapon", name: "左指挥模块", commandType: "escort", x: 132, sector: 0, hp: 480, maxHp: 480, damage: 14 },
  { id: "boss-core", type: "bossCore", name: "中央主核心", x: 360, sector: 1, hp: 900, maxHp: 900, damage: 0 },
  { id: "boss-right", type: "bossWeapon", name: "右指挥模块", commandType: "swarm", x: 588, sector: 2, hp: 480, maxHp: 480, damage: 14 },
]);

export function cardFor(route, tier) {
  return BUILD_CARDS.find((card) => card.route === route && card.tier === tier) ?? null;
}

export function cardRarityForTier(tier) {
  return CARD_RARITIES[Math.min(5, Math.max(1, Math.round(tier)))] ?? CARD_RARITIES[1];
}

export function cardsForTier(tier) {
  return BUILD_CARDS.filter((card) => card.tier === tier);
}

export function routeTierFor(state, route) {
  return Math.min(3, Math.max(0, state?.routes?.[route] ?? 0));
}

export function nextRouteTier(state, route) {
  const current = routeTierFor(state, route);
  return current >= 3 ? null : current + 1;
}

export function cardsForBuild(state) {
  return Object.keys(BUILD_ROUTES)
    .map((route) => {
      const tier = nextRouteTier(state, route);
      return tier ? cardFor(route, tier) : null;
    })
    .filter(Boolean);
}

export function createBuildState() {
  return {
    cards: [],
    routes: { crit: 0, missile: 0, swarm: 0 },
    critChance: 0,
    machinegunWeakpoint: false,
    execute: false,
    hunterLoop: false,
    missileCount: 3,
    missileBlast: false,
    missileMultiTarget: false,
    missileSplit: false,
    clusterBurst: false,
    drones: 0,
    droneDamageScale: 1,
    droneAttackSpeedMultiplier: 1,
    droneIntercept: false,
    droneEscort: false,
    swarmProtocol: false,
    rescueConvergence: false,
    damageMultiplier: 1,
    lateDamageBonus: 0,
    attackSpeedMultiplier: 1,
    critDamageMultiplier: 1,
    blastRadiusMultiplier: 1,
    overloadGainMultiplier: 1,
    overloadDurationBonus: 0,
    armorPenetration: 0,
    executeThresholdBonus: 0,
    blastDamageMultiplier: 1,
    crossSectorSupportBonus: 0,
    routeResonance: { crit: 0, missile: 0, swarm: 0 },
    lateUpgrades: {},
    critCapReached: false,
    synergyStats: {
      weakpointDetonations: 0,
      hunterRelays: 0,
      guidedSalvos: 0,
      guidedMicroShots: 0,
      fullFleetCycles: 0,
    },
  };
}

// 构筑快照只复制战斗中会被卡片规则修改的嵌套字段。首次过载的
// 9/9 演算依赖这份纯数据副本，不能把临时卡片写回真实构筑。
export function cloneBuildState(state = {}) {
  return {
    ...state,
    cards: [...(state.cards ?? [])],
    routes: { crit: 0, missile: 0, swarm: 0, ...(state.routes ?? {}) },
    routeResonance: { crit: 0, missile: 0, swarm: 0, ...(state.routeResonance ?? {}) },
    lateUpgrades: { ...(state.lateUpgrades ?? {}) },
    synergyStats: { ...(state.synergyStats ?? {}) },
    rogueTactics: { ...(state.rogueTactics ?? {}) },
    rogueCalibration: { ...(state.rogueCalibration ?? {}) },
  };
}

export function applyBuildCard(state, card) {
  if (!card) return state;
  state.cards.push(card.id);
  state.routes[card.route] += 1;
  if (card.id === "crit-1") state.critChance += 0.18;
  if (card.id === "crit-2") { state.critChance += 0.14; state.machinegunWeakpoint = true; }
  if (card.id === "crit-3") { state.critChance += 0.18; state.execute = true; state.hunterLoop = true; }
  if (card.id === "missile-1") state.missileCount = 5;
  if (card.id === "missile-2") { state.missileBlast = true; state.missileMultiTarget = true; }
  if (card.id === "missile-3") { state.missileSplit = true; state.clusterBurst = true; }
  if (card.id === "swarm-1") { state.drones = Math.max(state.drones, 2); state.droneDamageScale = 0.5; }
  if (card.id === "swarm-2") { state.drones = Math.max(state.drones, 2); state.droneIntercept = true; state.droneEscort = true; }
  if (card.id === "swarm-3") { state.swarmProtocol = true; state.rescueConvergence = true; }
  return state;
}

export function applyEndlessUpgrade(state, card) {
  if (!state || !card) return state;
  state.lateUpgrades ??= {};
  const nextLayer = (state.lateUpgrades[card.id] ?? 0) + 1;
  state.lateUpgrades[card.id] = nextLayer;
  if (card.id === "late-damage") {
    const step = nextLayer <= ENDLESS_LATE_BALANCE.damage.earlyLayers
      ? ENDLESS_LATE_BALANCE.damage.earlyStep
      : ENDLESS_LATE_BALANCE.damage.lateStep;
    state.lateDamageBonus = Math.min(ENDLESS_LATE_BALANCE.damage.maxBonus, (state.lateDamageBonus ?? Math.max(0, (state.damageMultiplier ?? 1) - 1)) + step);
    state.damageMultiplier = Math.max(1, 1 + state.lateDamageBonus);
  }
  if (card.id === "late-haste") {
    state.attackSpeedMultiplier = Math.min(1 + ENDLESS_LATE_BALANCE.haste.maxBonus, (state.attackSpeedMultiplier ?? 1) + ENDLESS_LATE_BALANCE.haste.step);
  }
  if (card.id === "late-overload") {
    if ((state.overloadGainMultiplier ?? 1) < 1 + ENDLESS_LATE_BALANCE.overload.maxGainBonus - 0.0001) {
      state.overloadGainMultiplier = Math.min(1 + ENDLESS_LATE_BALANCE.overload.maxGainBonus, (state.overloadGainMultiplier ?? 1) + ENDLESS_LATE_BALANCE.overload.gainStep);
    } else {
      state.overloadDurationBonus = Math.min(ENDLESS_LATE_BALANCE.overload.maxDuration, (state.overloadDurationBonus ?? 0) + ENDLESS_LATE_BALANCE.overload.durationStep);
    }
  }
  if (card.id === "late-crit") {
    if ((state.critChance ?? 0) < 0.7) state.critChance = Math.min(0.7, (state.critChance ?? 0) + 0.04);
    else {
      state.critCapReached = true;
      state.critDamageMultiplier = (state.critDamageMultiplier ?? 1) * 1.12;
    }
  }
  if (card.route && Object.hasOwn(state.routeResonance ?? {}, card.route)) state.routeResonance[card.route] += 1;
  if (card.id === "resonance-crit") {
    state.armorPenetration = Math.min(ENDLESS_LATE_BALANCE.resonance.critArmorMax, (state.armorPenetration ?? 0) + ENDLESS_LATE_BALANCE.resonance.critArmorStep);
    state.executeThresholdBonus = Math.min(ENDLESS_LATE_BALANCE.resonance.critExecuteMax, (state.executeThresholdBonus ?? 0) + ENDLESS_LATE_BALANCE.resonance.critExecuteStep);
  }
  if (card.id === "resonance-missile") {
    state.blastRadiusMultiplier = Math.min(1 + ENDLESS_LATE_BALANCE.resonance.missileRadiusMax, (state.blastRadiusMultiplier ?? 1) + ENDLESS_LATE_BALANCE.resonance.missileRadiusStep);
    state.blastDamageMultiplier = Math.min(1 + ENDLESS_LATE_BALANCE.resonance.missileDamageMax, (state.blastDamageMultiplier ?? 1) + ENDLESS_LATE_BALANCE.resonance.missileDamageStep);
  }
  if (card.id === "resonance-swarm") {
    state.droneAttackSpeedMultiplier = Math.min(1 + ENDLESS_LATE_BALANCE.resonance.swarmCycleMax, (state.droneAttackSpeedMultiplier ?? 1) + ENDLESS_LATE_BALANCE.resonance.swarmCycleStep);
    state.crossSectorSupportBonus = Math.min(ENDLESS_LATE_BALANCE.resonance.swarmSupportMax, (state.crossSectorSupportBonus ?? 0) + ENDLESS_LATE_BALANCE.resonance.swarmSupportStep);
  }
  return state;
}

export function fullBuildProjectionFor(state = {}) {
  const projection = cloneBuildState(state);
  const existingCards = new Set(projection.cards);
  for (const card of BUILD_CARDS) {
    if (existingCards.has(card.id)) continue;
    applyBuildCard(projection, card);
  }
  return projection;
}

export function buildStateFingerprint(state = {}) {
  const snapshot = cloneBuildState(state);
  return JSON.stringify({
    cards: snapshot.cards,
    routes: snapshot.routes,
    critChance: snapshot.critChance,
    machinegunWeakpoint: snapshot.machinegunWeakpoint,
    execute: snapshot.execute,
    hunterLoop: snapshot.hunterLoop,
    missileCount: snapshot.missileCount,
    missileBlast: snapshot.missileBlast,
    missileMultiTarget: snapshot.missileMultiTarget,
    missileSplit: snapshot.missileSplit,
    clusterBurst: snapshot.clusterBurst,
    drones: snapshot.drones,
    droneDamageScale: snapshot.droneDamageScale,
    droneAttackSpeedMultiplier: snapshot.droneAttackSpeedMultiplier,
    droneIntercept: snapshot.droneIntercept,
    droneEscort: snapshot.droneEscort,
    swarmProtocol: snapshot.swarmProtocol,
    rescueConvergence: snapshot.rescueConvergence,
    damageMultiplier: snapshot.damageMultiplier,
    lateDamageBonus: snapshot.lateDamageBonus,
    attackSpeedMultiplier: snapshot.attackSpeedMultiplier,
    critDamageMultiplier: snapshot.critDamageMultiplier,
    blastRadiusMultiplier: snapshot.blastRadiusMultiplier,
    overloadGainMultiplier: snapshot.overloadGainMultiplier,
    overloadDurationBonus: snapshot.overloadDurationBonus,
    armorPenetration: snapshot.armorPenetration,
    executeThresholdBonus: snapshot.executeThresholdBonus,
    blastDamageMultiplier: snapshot.blastDamageMultiplier,
    crossSectorSupportBonus: snapshot.crossSectorSupportBonus,
    routeResonance: snapshot.routeResonance,
    lateUpgrades: snapshot.lateUpgrades,
  });
}

export function buildStatsFor(state = {}) {
  const routes = { crit: routeTierFor(state, "crit"), missile: routeTierFor(state, "missile"), swarm: routeTierFor(state, "swarm") };
  return Object.freeze({
    damageMultiplier: Number(state.damageMultiplier ?? 1),
    lateDamageBonus: Number(state.lateDamageBonus ?? Math.max(0, Number(state.damageMultiplier ?? 1) - 1)),
    attackSpeedMultiplier: Number(state.attackSpeedMultiplier ?? 1),
    droneAttackSpeedMultiplier: Number(state.droneAttackSpeedMultiplier ?? 1),
    critChance: Number(state.critChance ?? 0),
    critDamageMultiplier: 2 * Number(state.critDamageMultiplier ?? 1),
    machinegunBarrels: routes.crit >= 1 ? 2 : 1,
    machinegunTier: routes.crit,
    missileCount: Math.max(0, Math.round(state.missileCount ?? 3)),
    blastRadiusMultiplier: Number(state.blastRadiusMultiplier ?? 1),
    drones: Math.max(0, Math.round(state.drones ?? 0)),
    droneDamageScale: Number(state.droneDamageScale ?? 1),
    overloadGainMultiplier: Number(state.overloadGainMultiplier ?? 1),
    overloadDurationBonus: Number(state.overloadDurationBonus ?? 0),
    armorPenetration: Number(state.armorPenetration ?? 0),
    executeThresholdBonus: Number(state.executeThresholdBonus ?? 0),
    blastDamageMultiplier: Number(state.blastDamageMultiplier ?? 1),
    crossSectorSupportBonus: Number(state.crossSectorSupportBonus ?? 0),
    missileBlast: Boolean(state.missileBlast),
    missileMultiTarget: Boolean(state.missileMultiTarget),
    missileSplit: Boolean(state.missileSplit),
    clusterBurst: Boolean(state.clusterBurst),
    droneIntercept: Boolean(state.droneIntercept),
    droneEscort: Boolean(state.droneEscort),
    swarmProtocol: Boolean(state.swarmProtocol),
    rescueConvergence: Boolean(state.rescueConvergence),
    machinegunWeakpoint: Boolean(state.machinegunWeakpoint),
    execute: Boolean(state.execute),
    hunterLoop: Boolean(state.hunterLoop),
    routes,
  });
}

const statFormatters = Object.freeze({
  damageMultiplier: { label: "伤害", format: (value) => `×${Number(value).toFixed(2)}` },
  lateDamageBonus: { label: "校准伤害", format: (value) => `+${Math.round(Number(value) * 100)}%` },
  attackSpeedMultiplier: { label: "循环", format: (value) => `${Math.round(Number(value) * 100)}%` },
  droneAttackSpeedMultiplier: { label: "僚机循环", format: (value) => `${Math.round(Number(value) * 100)}%` },
  critChance: { label: "暴击率", format: (value) => `${Math.round(Number(value) * 100)}%` },
  critDamageMultiplier: { label: "暴伤", format: (value) => `×${Number(value).toFixed(2)}` },
  machinegunBarrels: { label: "机枪", format: (value) => `${value}管` },
  machinegunTier: { label: "穿甲层", format: (value) => `Lv${value}` },
  missileCount: { label: "导弹", format: (value) => `${value}枚` },
  blastRadiusMultiplier: { label: "爆炸范围", format: (value) => `×${Number(value).toFixed(2)}` },
  drones: { label: "僚机", format: (value) => `${value}架` },
  droneDamageScale: { label: "僚机效率", format: (value) => `${Math.round(Number(value) * 100)}%` },
  overloadGainMultiplier: { label: "过载充能", format: (value) => `${Math.round(Number(value) * 100)}%` },
  overloadDurationBonus: { label: "过载持续", format: (value) => `+${Number(value).toFixed(1)}s` },
  armorPenetration: { label: "穿甲效率", format: (value) => `${Math.round(Number(value) * 100)}%` },
  executeThresholdBonus: { label: "处决线", format: (value) => `${Math.round((0.25 + Number(value)) * 100)}%` },
  blastDamageMultiplier: { label: "爆心伤害", format: (value) => `×${Number(value).toFixed(2)}` },
  crossSectorSupportBonus: { label: "跨区支援", format: (value) => `+${Math.round(Number(value) * 100)}%` },
  missileBlast: { label: "范围爆炸", format: (value) => value ? "已解锁" : "未解锁" },
  missileSplit: { label: "分裂弹头", format: (value) => value ? "已解锁" : "未解锁" },
  machinegunWeakpoint: { label: "弱点压制", format: (value) => value ? "已解锁" : "未解锁" },
  missileMultiTarget: { label: "多目标弹仓", format: (value) => value ? "已解锁" : "未解锁" },
  clusterBurst: { label: "集束终爆", format: (value) => value ? "已解锁" : "未解锁" },
  droneIntercept: { label: "僚机截击", format: (value) => value ? "已解锁" : "未解锁" },
  droneEscort: { label: "护航分工", format: (value) => value ? "已解锁" : "未解锁" },
  swarmProtocol: { label: "蜂群汇聚", format: (value) => value ? "已解锁" : "未解锁" },
  rescueConvergence: { label: "救场汇聚", format: (value) => value ? "已解锁" : "未解锁" },
  execute: { label: "裂甲处决", format: (value) => value ? "已解锁" : "未解锁" },
  hunterLoop: { label: "处决追射", format: (value) => value ? "已解锁" : "未解锁" },
});

export function buildSummaryLinesFor(state = {}) {
  const stats = buildStatsFor(state);
  return [
    `${statFormatters.damageMultiplier.label} ${statFormatters.damageMultiplier.format(stats.damageMultiplier)}`,
    `${statFormatters.attackSpeedMultiplier.label} ${statFormatters.attackSpeedMultiplier.format(stats.attackSpeedMultiplier)}`,
    `${statFormatters.critChance.label} ${statFormatters.critChance.format(stats.critChance)} · ${statFormatters.critDamageMultiplier.label} ${statFormatters.critDamageMultiplier.format(stats.critDamageMultiplier)}`,
    `${statFormatters.machinegunBarrels.label} ${statFormatters.machinegunBarrels.format(stats.machinegunBarrels)} · 穿甲 ${statFormatters.machinegunTier.format(stats.machinegunTier)}`,
    `${statFormatters.missileCount.label} ${statFormatters.missileCount.format(stats.missileCount)} · 范围 ${statFormatters.blastRadiusMultiplier.format(stats.blastRadiusMultiplier)}`,
    `${statFormatters.drones.label} ${statFormatters.drones.format(stats.drones)} · 效率 ${statFormatters.droneDamageScale.format(stats.droneDamageScale)} · 循环 ${statFormatters.droneAttackSpeedMultiplier.format(stats.droneAttackSpeedMultiplier)}`,
    `${statFormatters.overloadGainMultiplier.label} ${statFormatters.overloadGainMultiplier.format(stats.overloadGainMultiplier)} · ${statFormatters.overloadDurationBonus.format(stats.overloadDurationBonus)}`,
  ];
}

export function buildStatChangesFor(state = {}, card = null, { late = false } = {}) {
  if (card?.formEvolution) {
    return Object.freeze({ before: buildStatsFor(state), after: buildStatsFor(state), changes: Object.freeze([card.stat ?? "舰队强化立即生效"]) });
  }
  if (card?.rogue) {
    return Object.freeze({
      before: buildStatsFor(state),
      after: buildStatsFor(state),
      changes: Object.freeze([card.baseCard?.stat ?? card.stat ?? "结构强化", card.tactic?.stat ?? "战术效果立即生效"]),
    });
  }
  const before = buildStatsFor(state);
  const preview = cloneBuildState(state);
  if (late) applyEndlessUpgrade(preview, card);
  else applyBuildCard(preview, card);
  const after = buildStatsFor(preview);
  const keys = [
    "damageMultiplier", "attackSpeedMultiplier", "droneAttackSpeedMultiplier", "critChance", "critDamageMultiplier",
    "machinegunBarrels", "machinegunTier", "missileCount", "blastRadiusMultiplier",
    "drones", "droneDamageScale", "overloadGainMultiplier", "missileBlast", "missileSplit",
    "overloadDurationBonus", "armorPenetration", "executeThresholdBonus", "blastDamageMultiplier",
    "crossSectorSupportBonus", "machinegunWeakpoint", "missileMultiTarget", "clusterBurst",
    "droneIntercept", "droneEscort", "swarmProtocol", "rescueConvergence", "execute", "hunterLoop",
  ];
  const changes = keys
    .filter((key) => before[key] !== after[key])
    .map((key) => {
      const meta = statFormatters[key];
      return `${meta.label} ${meta.format(before[key])} → ${meta.format(after[key])}`;
    });
  return Object.freeze({ before, after, changes: Object.freeze(changes) });
}

export function buildRouteLabel(state) {
  const entries = Object.entries(state.routes).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "基础战斗舰";
  if (entries.length === 3 && entries.every(([, count]) => count === entries[0][1])) return "全舰协同";
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return `${BUILD_ROUTES[entries[0][0]].short} × ${BUILD_ROUTES[entries[1][0]].short}`;
  return BUILD_ROUTES[entries[0][0]].name;
}

export function buildAccentColor(state, fallback = 0x5be5f5) {
  const counts = state?.routes ?? {};
  const highest = Math.max(0, ...Object.keys(BUILD_ROUTES).map((route) => Number(counts[route]) || 0));
  if (!highest) return fallback;
  const tied = Object.keys(BUILD_ROUTES).filter((route) => (Number(counts[route]) || 0) === highest);
  const latestCard = [...(state?.cards ?? [])].reverse()
    .map((id) => BUILD_CARDS.find((card) => card.id === id))
    .find((card) => card && tied.includes(card.route));
  return BUILD_ROUTES[latestCard?.route ?? tied[0]]?.color ?? fallback;
}

export function buildIdentityFor(state) {
  const latestCard = [...(state?.cards ?? [])].reverse()
    .map((id) => BUILD_CARDS.find((card) => card.id === id))
    .find(Boolean);
  if (!latestCard) {
    return { name: "基础舰队", behavior: "机枪巡防 + 导弹齐射", color: 0x5be5f5 };
  }
  return {
    name: buildRouteLabel(state),
    behavior: latestCard.shortDetail,
    color: buildAccentColor(state),
  };
}

export function hasBuildRoute(state, route) {
  return Boolean(state?.routes?.[route]);
}

export function getBuildSynergies(state) {
  const active = [];
  if (hasBuildRoute(state, "crit") && hasBuildRoute(state, "missile")) active.push(BUILD_SYNERGIES.critMissile);
  if (hasBuildRoute(state, "crit") && hasBuildRoute(state, "swarm")) active.push(BUILD_SYNERGIES.critSwarm);
  if (hasBuildRoute(state, "missile") && hasBuildRoute(state, "swarm")) active.push(BUILD_SYNERGIES.missileSwarm);
  if (hasBuildRoute(state, "crit") && hasBuildRoute(state, "missile") && hasBuildRoute(state, "swarm")) active.push(BUILD_SYNERGIES.fullFleet);
  return active;
}

export function getBuildSynergy(state, id) {
  return getBuildSynergies(state).find((synergy) => synergy.id === id) ?? null;
}

export function newlyUnlockedSynergies(beforeState, afterState) {
  const beforeIds = new Set(getBuildSynergies(beforeState).map((synergy) => synergy.id));
  return getBuildSynergies(afterState).filter((synergy) => !beforeIds.has(synergy.id));
}

export function newlyUnlockedPairSynergies(beforeState, afterState) {
  return newlyUnlockedSynergies(beforeState, afterState).filter((synergy) => synergy.routes.length === 2);
}

export function buildSynergyLabel(state) {
  const synergies = getBuildSynergies(state);
  if (!synergies.length) return "";
  return synergies.map((synergy) => synergy.name).join(" · ");
}

export function routeCounts(state) {
  return Object.fromEntries(Object.keys(BUILD_ROUTES).map((route) => [route, state?.routes?.[route] ?? 0]));
}

export function buildDamageProfile(state) {
  return {
    machinegun: (1 + state.critChance * 0.8 * (state.critDamageMultiplier ?? 1)) * (state.damageMultiplier ?? 1),
    missiles: state.missileCount / 3 * (state.missileBlast ? 1.32 : 1) * (state.missileSplit ? 1.24 : 1) * (state.damageMultiplier ?? 1),
    drones: state.drones * 0.42 * (state.droneDamageScale ?? 1) * (state.swarmProtocol ? 1.38 : 1) * (state.damageMultiplier ?? 1),
  };
}

export const OVERLOAD_ROUTE_PROFILES = Object.freeze({
  crit: { name: "精准红线", rateScale: 0.58, damageScale: 1.25, critBonus: 0.30, targetMultiplier: 2.1 },
  missile: { name: "弹舱超频", reloadScale: 0.55, overloadSalvoInterval: 900, damageScale: 1.20, radiusScale: 1.20, targetMultiplier: 2.1 },
  swarm: { name: "蜂群合体", droneCount: 4, fireRateScale: 0.77, damageScale: 0.72, convergeDamage: 14, targetMultiplier: 2.1 },
});

export function overloadProtocolFor(state) {
  const routes = Object.keys(BUILD_ROUTES).filter((route) => Number(state?.routes?.[route]) > 0);
  if (!routes.length) return { short: "基础超频", label: "基础火力超频", color: 0x5be5f5 };
  const names = routes.map((route) => OVERLOAD_ROUTE_PROFILES[route].name);
  return {
    short: routes.length === 3 ? "全舰协同" : names.join(" + "),
    label: names.join(" + "),
    color: buildAccentColor(state),
  };
}

export function overloadRouteProfile(route) {
  return OVERLOAD_ROUTE_PROFILES[route] ?? null;
}
