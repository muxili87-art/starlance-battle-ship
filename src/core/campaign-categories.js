// First-segment category identity and trusted configuration mapping.
// This module is deliberately data-only: it must not import Core, campaign-route,
// or reward validation modules.

export const FIRST_SEGMENT_CATEGORY_IDS = Object.freeze([
  "dense",
  "concentrated",
  "crossfire",
]);

export const FIRST_SEGMENT_CATEGORY_LABELS = Object.freeze({
  dense: "密集编队",
  concentrated: "集中压制",
  crossfire: "交叉火线",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const ENCOUNTER_ROWS = deepFreeze([
  { key: "c1:s1:dense:1", categoryId: "dense", position: 1, sourceTemplateKey: "1:normal:1", xpTableKey: "1:normal:1", title: "密集编队 · 首战", preview: "共同开场，第二旗保持多区编队" },
  { key: "c1:s1:dense:2", categoryId: "dense", position: 2, sourceTemplateKey: "1:risk:2", xpTableKey: "1:risk:2", title: "密集编队 · 次战", preview: "多区编组连续接敌" },
  { key: "c1:s1:dense:3", categoryId: "dense", position: 3, sourceTemplateKey: "1:risk:3", xpTableKey: "1:risk:3", title: "密集编队 · 终战", preview: "三地区护航编队推进" },
  { key: "c1:s1:concentrated:1", categoryId: "concentrated", position: 1, sourceTemplateKey: "1:normal:1", xpTableKey: "1:normal:1", title: "集中压制 · 首战", preview: "共同开场，第二旗集中中区" },
  { key: "c1:s1:concentrated:2", categoryId: "concentrated", position: 2, sourceTemplateKey: "1:normal:2", xpTableKey: "1:normal:2", title: "集中压制 · 次战", preview: "全组调入左区，保留编组偏移" },
  { key: "c1:s1:concentrated:3", categoryId: "concentrated", position: 3, sourceTemplateKey: "1:normal:3", xpTableKey: "1:normal:3", title: "集中压制 · 终战", preview: "全组调入右区，保留编组偏移" },
  { key: "c1:s1:crossfire:1", categoryId: "crossfire", position: 1, sourceTemplateKey: "1:normal:1", xpTableKey: "1:normal:1", title: "交叉火线 · 首战", preview: "共同开场，第二旗按组左右交替" },
  { key: "c1:s1:crossfire:2", categoryId: "crossfire", position: 2, sourceTemplateKey: "1:normal:2", xpTableKey: "1:normal:2", title: "交叉火线 · 次战", preview: "完整编组按左、右顺序接入" },
  { key: "c1:s1:crossfire:3", categoryId: "crossfire", position: 3, sourceTemplateKey: "1:risk:3", xpTableKey: "1:risk:3", title: "交叉火线 · 终战", preview: "完整编组按右、左顺序接入" },
]);

const ENTRY_BY_KEY = new Map(ENCOUNTER_ROWS.map((entry) => [entry.key, entry]));
const ENTRIES_BY_CATEGORY = new Map(FIRST_SEGMENT_CATEGORY_IDS.map((categoryId) => [
  categoryId,
  ENCOUNTER_ROWS.filter((entry) => entry.categoryId === categoryId),
]));

// The entry carries only approved group-sector/cap/overlap changes. Unit kind,
// role, flags, scale multipliers, and lateral offsets remain sourced by the
// existing campaign encounter builder.
const PROFILE_ADJUSTMENTS = deepFreeze({
  "c1:s1:dense:1": {},
  "c1:s1:dense:2": {},
  "c1:s1:dense:3": {},
  "c1:s1:concentrated:1": {
    flagOverrides: { 1: { overlapRatio: 0.55, groupSectorTargets: [1, 1, 1] } },
  },
  "c1:s1:concentrated:2": { maxActive: 20, overlapRatio: 0.6, groupSectorTargets: [0, 0, 0, 0] },
  "c1:s1:concentrated:3": { maxActive: 21, overlapRatio: 0.6, groupSectorTargets: [2, 2, 2, 2] },
  "c1:s1:crossfire:1": {
    flagOverrides: { 1: { overlapRatio: 0.45, groupSectorTargets: [0, 2, 0] } },
  },
  "c1:s1:crossfire:2": { maxActive: 18, overlapRatio: 0.5, groupSectorTargets: [0, 2, 0, 2] },
  "c1:s1:crossfire:3": { maxActive: 21, overlapRatio: 0.5, groupSectorTargets: [2, 0, 2, 0] },
});

export const FIRST_SEGMENT_CATEGORY_ENCOUNTERS = Object.freeze(ENCOUNTER_ROWS);

export function firstSegmentCategoryEncounterKey(categoryId, position) {
  if (!FIRST_SEGMENT_CATEGORY_IDS.includes(categoryId)) return null;
  const nodePosition = Number(position);
  if (!Number.isInteger(nodePosition) || nodePosition < 1 || nodePosition > 3) return null;
  return `c1:s1:${categoryId}:${nodePosition}`;
}

export function firstSegmentCategoryEncounterForKey(key) {
  return typeof key === "string" ? ENTRY_BY_KEY.get(key) ?? null : null;
}

export function firstSegmentCategoryXpTableKey(actualEncounterKey) {
  return firstSegmentCategoryEncounterForKey(actualEncounterKey)?.xpTableKey ?? null;
}

export function firstSegmentCategoryProfileAdjustments(actualEncounterKey) {
  return firstSegmentCategoryEncounterForKey(actualEncounterKey)
    ? PROFILE_ADJUSTMENTS[actualEncounterKey]
    : null;
}

export function firstSegmentCategoryOption(categoryId, offerId) {
  const entries = ENTRIES_BY_CATEGORY.get(categoryId);
  if (!entries || typeof offerId !== "string" || !offerId) return null;
  return Object.freeze({
    choiceId: `${offerId}:category-${categoryId}`,
    categoryId,
    encounterKeys: Object.freeze(entries.map((entry) => entry.key)),
  });
}

function safeSeed(seed) {
  const value = Number(seed) >>> 0;
  return value || 1;
}

function categoryPrng(seed) {
  let state = safeSeed(seed);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    if (state === 0) state = 1;
    return state;
  };
}

function uniformIndex(nextUint32, bound) {
  const range = 0x100000000;
  const limit = range - (range % bound);
  let value;
  do { value = nextUint32(); } while (value >= limit);
  return value % bound;
}

function safeRunId(runId) {
  if (runId === null || runId === undefined || runId === "") return null;
  return String(runId).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createFirstSegmentCategoryOffer({ seed = 1, runId = null } = {}) {
  const normalizedSeed = safeSeed(seed);
  const normalizedRunId = safeRunId(runId);
  const offerId = normalizedRunId
    ? `campaign:segment-1:offer:run-${normalizedRunId}`
    : `campaign:segment-1:offer:seed-${normalizedSeed}`;
  const shuffled = [...FIRST_SEGMENT_CATEGORY_IDS];
  const nextUint32 = categoryPrng(normalizedSeed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = uniformIndex(nextUint32, index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const options = Object.freeze(shuffled.slice(0, 2).map((categoryId) =>
    firstSegmentCategoryOption(categoryId, offerId)));
  return {
    offerId,
    segmentIndex: 1,
    options,
    selectedChoiceId: null,
  };
}

const CATEGORY_RECEIPT_ID = /^campaign:campaign:segment-1:category-(dense|concentrated|crossfire):node-([1-3])(?::run-[a-zA-Z0-9_-]+)?$/;
// Classify category-shaped IDs before parsing their full grammar. Keeping this
// marker broad makes malformed segment/category tokens fail closed instead of
// slipping into prototype XP when the exact parser returns null.
const CATEGORY_RECEIPT_NAMESPACE = /^campaign:campaign:segment-[^:]*:category/i;

export function firstSegmentCategoryKeyFromReceiptId(encounterId) {
  if (typeof encounterId !== "string") return null;
  const match = CATEGORY_RECEIPT_ID.exec(encounterId.trim());
  return match ? firstSegmentCategoryEncounterKey(match[1], Number(match[2])) : null;
}

export function isFirstSegmentCategoryReceiptNamespace(encounterId) {
  return typeof encounterId === "string" && CATEGORY_RECEIPT_NAMESPACE.test(encounterId.trim());
}
