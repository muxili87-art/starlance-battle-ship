// V6.3 首章整合 · 06 三类卡池与受控抽取（纯函数）
//
// 职责边界（与合同一致）：
//   * 只生成候选、判合法性、发 receipt；**不**改战斗数值、不碰存档、不持有状态。
//   * 卡面数字一律取自 rogue-run-model 的同一份战术定义（name / stat / tiers /
//     maxStacks），不在这里维护第二份易失真的触发表。
//   * 同一 receipt 的 offer 由调用方缓存；本模块同输入必然同输出。
//
// 抽取规则顺序（合同 6.4）：合法性 → 类别覆盖 → 路线定向 → 稀有保底 →
// 同机制延续 → 同卡休息 → 品质加权 → 有效校准。

import { ROGUE_TACTIC_BY_ID, rogueTacticLevelText } from "./rogue-tactics.js";

export const CAMPAIGN_CARD_POOL_VERSION = "campaign-card-pool-v62";
export const CARD_QUALITIES = Object.freeze(["common", "fine", "rare"]);
export const CARD_QUALITY_WEIGHTS = Object.freeze({ common: 70, fine: 25, rare: 5 });
export const CARD_QUALITY_LABEL = Object.freeze({ common: "普通", fine: "优秀", rare: "稀有" });
export const CARD_CATEGORY_LABEL = Object.freeze({ attack: "攻击", defense: "防御", special: "特殊" });
// 第 3、5 次首区随机奖励至少一个稀有或以上。
export const CAMPAIGN_RARE_GUARANTEE_INDEXES = Object.freeze([3, 5]);
export const DECLINED_REST_THRESHOLD = 2;

// 十二张基础池。cardId 是设计 ID；tacticId 是既有实现里的唯一键，两者一对一。
export const CAMPAIGN_CARDS = Object.freeze([
  Object.freeze({ cardId: "A01", tacticId: "tracer-guidance", category: "attack", quality: "common", mechanic: "tracer" }),
  Object.freeze({ cardId: "A02", tacticId: "mark-relay", category: "attack", quality: "fine", mechanic: "mark" }),
  Object.freeze({ cardId: "A03", tacticId: "core-hunt", category: "attack", quality: "common", mechanic: "mark" }),
  Object.freeze({ cardId: "A04", tacticId: "full-fleet-window", category: "attack", quality: "rare", mechanic: "fleet" }),
  Object.freeze({ cardId: "A05", tacticId: "afterglow", category: "attack", quality: "fine", mechanic: "overload" }),
  Object.freeze({ cardId: "D01", tacticId: "transfer-cover", category: "defense", quality: "common", mechanic: "guard" }),
  Object.freeze({ cardId: "D02", tacticId: "crisis-escort", category: "defense", quality: "rare", mechanic: "guard" }),
  Object.freeze({ cardId: "D03", tacticId: "intercept-repair", category: "defense", quality: "common", mechanic: "repair" }),
  Object.freeze({ cardId: "D04", tacticId: "rally-defense", category: "defense", quality: "fine", mechanic: "guard" }),
  Object.freeze({ cardId: "S01", tacticId: "energy-reclaim", category: "special", quality: "common", mechanic: "overload" }),
  Object.freeze({ cardId: "S02", tacticId: "sync-charge", category: "special", quality: "common", mechanic: "charge" }),
  Object.freeze({ cardId: "S03", tacticId: "hunter-capacitor", category: "special", quality: "fine", mechanic: "charge" }),
]);

export const CAMPAIGN_CARD_BY_ID = Object.freeze(Object.fromEntries(CAMPAIGN_CARDS.map((card) => [card.cardId, card])));
export const CAMPAIGN_CARD_BY_TACTIC = Object.freeze(Object.fromEntries(CAMPAIGN_CARDS.map((card) => [card.tacticId, card])));

const QUALITY_RANK = Object.freeze({ common: 0, fine: 1, rare: 2 });

function safeInt(value, fallback = 0) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
}

// 与既有模型同族的确定性 PRNG；不使用 Math.random，保证同 receipt 同结果。
function xorshift(seed) {
  let value = (safeInt(seed) >>> 0) || 1;
  value ^= value << 13; value >>>= 0;
  value ^= value >>> 17;
  value ^= value << 5; value >>>= 0;
  return value || 1;
}

function drawIndex(seed, upperBound) {
  const bound = Math.max(1, safeInt(upperBound, 1));
  return { index: xorshift(seed) % bound, seed: xorshift(seed) };
}

/** 一张卡的展示数据：名字、触发、效果、本层/下一层数字全部来自真实战术定义。 */
export function campaignCardFace(cardId, level = 0) {
  const card = CAMPAIGN_CARD_BY_ID[cardId];
  if (!card) return null;
  const tactic = ROGUE_TACTIC_BY_ID[card.tacticId];
  if (!tactic) return null;
  const maxStacks = safeInt(tactic.maxStacks, 1);
  const current = Math.max(0, Math.min(maxStacks, safeInt(level)));
  const next = Math.min(maxStacks, current + 1);
  // 本层/下一层数字直接取分级文案表的唯一定义处，不在本模块另建触发表。
  const levelText = (n) => rogueTacticLevelText(card.tacticId, n);
  return Object.freeze({
    cardId: card.cardId,
    tacticId: card.tacticId,
    category: card.category,
    categoryLabel: CARD_CATEGORY_LABEL[card.category],
    quality: card.quality,
    qualityLabel: CARD_QUALITY_LABEL[card.quality],
    mechanic: card.mechanic,
    name: tactic.name,
    trigger: tactic.trigger,
    benefit: tactic.benefit,
    stat: tactic.stat,
    level: current,
    nextLevel: next,
    maxStacks,
    atMax: current >= maxStacks,
    currentText: current > 0 ? levelText(current) : null,
    nextText: current >= maxStacks ? null : levelText(current + 1),
    stacksLabel: `${current} / ${maxStacks}`,
  });
}

function legalCardsFor({ ownedLevels, history }) {
  const normalizedHistory = new Set((history ?? []).map((id) => CAMPAIGN_CARD_BY_TACTIC[id]?.cardId ?? id));
  return CAMPAIGN_CARDS.filter((card) => {
    const tactic = ROGUE_TACTIC_BY_ID[card.tacticId];
    if (!tactic) return false; // 未实装不进池
    const level = safeInt(ownedLevels?.[card.tacticId]);
    return level < safeInt(tactic.maxStacks, 1);
  }).map((card) => ({ card, strength: normalizedHistory.has(card.cardId) ? 1.5 : 1 }));
}

function pickWeighted(candidates, seed) {
  const total = candidates.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return null;
  let cursor = xorshift(seed) % total;
  for (const item of candidates) {
    cursor -= item.weight;
    if (cursor < 0) return item;
  }
  return candidates[candidates.length - 1];
}

function weightedCandidates(cards, qualityFloor, mechanicPreference, seed) {
  const pool = cards.filter((entry) => qualityFloor === null || QUALITY_RANK[entry.card.quality] >= qualityFloor);
  const usable = pool.length ? pool : cards;
  // 空品质先剔除再归一化；同品质中机制匹配权重 ×1.5。
  const weights = usable.map((entry) => {
    const base = CARD_QUALITY_WEIGHTS[entry.card.quality] ?? 1;
    const mechanicBoost = mechanicPreference && entry.card.mechanic === mechanicPreference ? 1.5 : 1;
    return { entry, weight: Math.max(1, Math.round(base * entry.strength * mechanicBoost)), seed };
  });
  return weights;
}

/**
 * 生成一次随机奖励的三张候选。
 * @returns {{ cards: ReadonlyArray, reasons: object, nextSeed: number }}
 */
export function campaignCardOffer({
  seed = 1,
  rewardIndex = 1,
  ownedLevels = {},
  history = [],
  declinedCounts = {},
  routeCategory = null,
  firstRegion = true,
} = {}) {
  const legal = legalCardsFor({ ownedLevels, history });
  const reasons = { excluded: [], coverage: null, routeDirected: null, rareGuarantee: null, continuation: null, rest: null, calibration: null };
  if (!legal.length) {
    reasons.calibration = "全部卡已满层，改为持续火力校准";
    return Object.freeze({ cards: Object.freeze([]), reasons: Object.freeze(reasons), nextSeed: seed, calibration: true });
  }

  let cursor = xorshift(safeInt(seed, 1) + safeInt(rewardIndex) * 977);
  const chosen = [];
  const used = new Set();
  const take = (entry, slotReason) => {
    chosen.push({ ...entry.card, slotReason });
    used.add(entry.card.cardId);
  };
  const remaining = () => legal.filter((entry) => !used.has(entry.card.cardId));

  // 6.4-7 同卡连续两次未选 → 休息一次随机奖励（优先级最低，冲突时先让位）
  const resting = Object.keys(declinedCounts ?? {}).filter((tacticId) => safeInt(declinedCounts[tacticId]) >= DECLINED_REST_THRESHOLD);
  const restingCards = new Set(resting.map((tacticId) => CAMPAIGN_CARD_BY_TACTIC[tacticId]?.cardId).filter(Boolean));
  const restEligible = restingCards.size > 0 && remaining().some((entry) => !restingCards.has(entry.card.cardId));
  const restPool = restEligible ? remaining().filter((entry) => !restingCards.has(entry.card.cardId)) : remaining();
  if (restEligible) reasons.rest = `以下卡休息一次：${[...restingCards].join("、")}`;

  // 6.4-2 第一个随机奖励：攻击 / 防御 / 特殊各一张
  if (safeInt(rewardIndex) === 1 && firstRegion) {
    for (const category of ["attack", "defense", "special"]) {
      const pool = restPool.filter((entry) => entry.card.category === category && !used.has(entry.card.cardId));
      if (!pool.length) continue;
      const weights = weightedCandidates(pool, null, null, cursor);
      const picked = pickWeighted(weights, cursor);
      cursor = picked.seed;
      take(picked.entry, "首个奖励三类各一");
    }
    reasons.coverage = "攻击 / 防御 / 特殊各一张";
  }

  // 6.4-5 第 3、5 次首区随机奖励：至少一个稀有或以上
  if (chosen.length < 3 && firstRegion && CAMPAIGN_RARE_GUARANTEE_INDEXES.includes(safeInt(rewardIndex))) {
    const pool = restPool.filter((entry) => QUALITY_RANK[entry.card.quality] >= QUALITY_RANK.rare && !used.has(entry.card.cardId));
    if (pool.length) {
      const picked = pickWeighted(weightedCandidates(pool, null, null, cursor), cursor);
      cursor = picked.seed;
      take(picked.entry, "第3/5次稀有保底");
      reasons.rareGuarantee = "本格保底稀有或以上";
    } else {
      reasons.rareGuarantee = "稀有已全部满层，给最高可用品质并记录原因";
    }
  }

  // 6.4-6 同机制延续：选到一张后，未来两次随机奖励内至少给一次同机制/下一层
  if (chosen.length < 3) {
    const recent = history.slice(-2);
    const mechanic = recent.map((id) => CAMPAIGN_CARD_BY_ID[CAMPAIGN_CARD_BY_TACTIC[id]?.cardId ?? id]?.mechanic).find(Boolean);
    if (mechanic) {
      const pool = restPool.filter((entry) => entry.card.mechanic === mechanic && !used.has(entry.card.cardId));
      if (pool.length) {
        const picked = pickWeighted(weightedCandidates(pool, null, mechanic, cursor), cursor);
        cursor = picked.seed;
        take(picked.entry, "同机制延续");
        reasons.continuation = `延续机制：${mechanic}`;
      }
    }
  }

  // 6.4-4 路线定向：至少一个目标类别选项
  if (chosen.length < 3 && routeCategory && CARD_CATEGORY_LABEL[routeCategory]) {
    const pool = restPool.filter((entry) => entry.card.category === routeCategory && !used.has(entry.card.cardId));
    if (pool.length) {
      const picked = pickWeighted(weightedCandidates(pool, null, null, cursor), cursor);
      cursor = picked.seed;
      take(picked.entry, "路线定向");
      reasons.routeDirected = `保证至少一张${CARD_CATEGORY_LABEL[routeCategory]}卡`;
    } else {
      reasons.routeDirected = `该类已完成，改为持续火力校准`;
    }
  }

  // 6.4-3 / 6.4-8 其余格：至少覆盖两个顶层类别 + 品质加权（70 / 25 / 5）
  while (chosen.length < 3) {
    const pool = restPool.filter((entry) => !used.has(entry.card.cardId));
    if (!pool.length) break;
    const categories = new Set(chosen.map((card) => card.category));
    const needSecondCategory = chosen.length > 0 && categories.size < 2;
    const preferred = needSecondCategory ? pool.filter((entry) => !categories.has(entry.card.category)) : pool;
    const usable = preferred.length ? preferred : pool;
    const weights = weightedCandidates(usable, null, null, cursor);
    const picked = pickWeighted(weights, cursor);
    if (!picked) break;
    cursor = picked.seed;
    take(picked.entry, needSecondCategory ? "凑齐两个顶层类别" : "品质加权");
  }

  if (chosen.length < 3) reasons.calibration = "合法卡不足三格，按有效校准收束";

  const cards = Object.freeze(chosen.slice(0, 3).map((card) => {
    const face = campaignCardFace(card.cardId, ownedLevels?.[card.tacticId] ?? 0);
    return Object.freeze({ ...face, slotReason: card.slotReason, receiptCardId: card.cardId });
  }));
  return Object.freeze({ cards, reasons: Object.freeze(reasons), nextSeed: cursor, calibration: false });
}

/**
 * 把候选面转成既有升级弹窗能渲染、applyRogueUpgrade 能消费的“纯战术卡”。
 * route 为 null：随机奖励只加战术，不推进结构路线（九次结构由结构卡单独承担）。
 */
export function campaignCardOfferCard(face, index = 0) {
  if (!face) return null;
  const tactic = ROGUE_TACTIC_BY_ID[face.tacticId];
  if (!tactic) return null;
  return Object.freeze({
    id: `campaign-random-${face.cardId}-${index}`,
    rogue: true,
    tacticOnly: true,
    route: null,
    tacticId: face.tacticId,
    tactic,
    cardCategory: face.category,
    categoryLabel: face.categoryLabel,
    quality: face.quality,
    qualityLabel: face.qualityLabel,
    mechanic: face.mechanic,
    currentLevel: face.level,
    nextLevel: face.nextLevel,
    maxStacks: face.maxStacks,
    name: `${face.name} · ${face.categoryLabel}${face.qualityLabel}`,
    behavior: face.benefit,
    shortDetail: `${face.trigger} → ${face.nextText ?? face.stat}`,
    detail: `${face.trigger} → ${face.benefit}（本层 ${face.nextLevel}/${face.maxStacks}）`,
    stat: face.nextText ?? face.stat,
    category: `${face.categoryLabel} · ${face.qualityLabel}`,
    icon: null,
    offerIndex: index,
    receiptCardId: face.cardId,
    slotReason: face.slotReason ?? null,
  });
}

/**
 * 选择一张候选。核对 receipt 与 offer 内 cardId、上限；不靠 UI 禁用按钮保证幂等。
 * @returns {{ state, applied, reason }}
 */
export function resolveCampaignCardChoice({ receipt = "", offer = [], cardId, ownedLevels = {}, consumedReceipts = [], history = [] } = {}) {
  const reject = (reason) => ({ state: { consumedReceipts: Object.freeze([...consumedReceipts]), ownedLevels }, applied: false, reason });
  if (!receipt) return reject("no-receipt");
  if ((consumedReceipts ?? []).includes(receipt)) return reject("duplicate");
  const offered = (offer ?? []).find((card) => card?.cardId === cardId);
  if (!offered) return reject("not-offered");
  const card = CAMPAIGN_CARD_BY_ID[cardId];
  if (!card) return reject("unknown-card");
  const tactic = ROGUE_TACTIC_BY_ID[card.tacticId];
  const level = safeInt(ownedLevels?.[card.tacticId]);
  if (!tactic || level >= safeInt(tactic.maxStacks, 1)) return reject("at-max");
  const nextLevels = { ...ownedLevels, [card.tacticId]: level + 1 };
  return {
    state: {
      consumedReceipts: Object.freeze([...consumedReceipts, receipt]),
      ownedLevels: Object.freeze(nextLevels),
      history: Object.freeze([...history, cardId]),
    },
    applied: true,
    reason: "applied",
    tacticId: card.tacticId,
    nextLevel: level + 1,
  };
}

// 合同 6.5：全部满层时的终局降级——每次使对应独立校准 +0.01。
export function campaignCalibrationStep(selectedWeapon) {
  if (!["machinegun", "missile", "drone"].includes(selectedWeapon)) return null;
  return Object.freeze({ weapon: selectedWeapon, step: 0.01, label: "战术已满，继续火力校准" });
}
