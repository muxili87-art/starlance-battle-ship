import { prototypeXpForRewardType } from "./xp-config.js";
import { campaignXpValueForEncounter } from "./campaign-director.js";
import {
  firstSegmentCategoryKeyFromReceiptId,
  isFirstSegmentCategoryReceiptNamespace,
} from "./campaign-categories.js";

export const REWARD_RESULT_CAUSE = Object.freeze({
  PLAYER_FIRE_KILL: "player-fire-kill",
  CORE_IMPACT: "core-impact",
  CAPACITY_CLEANUP: "capacity-cleanup",
  SCRIPT_CLEANUP: "script-cleanup",
  SPLIT_FRAGMENT: "split-fragment",
  CONDITIONAL_REINFORCEMENT: "conditional-reinforcement",
  CONDITIONAL_SUMMON: "conditional-summon",
  BOSS_PART: "boss-part",
  BOSS_ATTACK: "boss-attack",
  NON_PLAYER_DAMAGE: "non-player-damage",
});

// These are the concrete damageEnemy source values produced by player-owned
// weapons and effects in core-mode.js. Keep reward attribution fail-closed:
// new/system sources must be reviewed before they can grant XP.
export const PLAYER_FIRE_SOURCES = Object.freeze([
  "auto",
  "crit",
  "missile",
  "intercept",
  "missile-split",
  "guided-micro",
  "full-fleet",
  "missile-blast",
  "drone",
  "drone-converge",
  "overload-global",
  "hunter",
]);
const PLAYER_FIRE_SOURCE_SET = new Set(PLAYER_FIRE_SOURCES);

const EXCLUDED_SPAWN_ORIGINS = new Set([
  "split-fragment",
  "conditional-reinforcement",
  "conditional-summon",
  "boss-part",
  "boss-attack",
]);

function normalizedId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function rewardEventIdFor(runId, encounterId, entityInstanceId) {
  if (!runId || !encounterId || !entityInstanceId) return "";
  try {
    return `xp:${encodeURIComponent(runId)}:${encodeURIComponent(encounterId)}:${encodeURIComponent(entityInstanceId)}`;
  } catch {
    return "";
  }
}

export function rewardResultCauseForDefeat({ enemy, source } = {}) {
  if (enemy?.isBossAttack) return REWARD_RESULT_CAUSE.BOSS_ATTACK;
  if (enemy?.isBoss) return REWARD_RESULT_CAUSE.BOSS_PART;
  if (enemy?.isFragment || enemy?.type === "shard" || enemy?.spawnOrigin === "split-fragment") {
    return REWARD_RESULT_CAUSE.SPLIT_FRAGMENT;
  }
  if (enemy?.bossEscort || ["conditional-reinforcement", "conditional-summon"].includes(enemy?.spawnOrigin)) {
    return enemy?.spawnOrigin === "conditional-reinforcement"
      ? REWARD_RESULT_CAUSE.CONDITIONAL_REINFORCEMENT
      : REWARD_RESULT_CAUSE.CONDITIONAL_SUMMON;
  }
  return PLAYER_FIRE_SOURCE_SET.has(source)
    ? REWARD_RESULT_CAUSE.PLAYER_FIRE_KILL
    : REWARD_RESULT_CAUSE.NON_PLAYER_DAMAGE;
}

function rewardTypeForDefeat(enemy, resultCause) {
  if ([REWARD_RESULT_CAUSE.BOSS_PART, REWARD_RESULT_CAUSE.BOSS_ATTACK].includes(resultCause)) return "boss";
  if ([REWARD_RESULT_CAUSE.CONDITIONAL_REINFORCEMENT, REWARD_RESULT_CAUSE.CONDITIONAL_SUMMON].includes(resultCause)) return "conditional-summon";
  if (resultCause === REWARD_RESULT_CAUSE.SPLIT_FRAGMENT) return "shard";
  return typeof enemy?.type === "string" ? enemy.type : "unknown";
}

function campaignEncounterKeyFromReceiptId(encounterId) {
  const normalized = normalizedId(encounterId);
  if (isFirstSegmentCategoryReceiptNamespace(normalized)) {
    return firstSegmentCategoryKeyFromReceiptId(normalized);
  }
  const match = /^campaign:campaign:segment-(\d+):(normal|risk):node-(\d+)(?::run-[a-zA-Z0-9_-]+)?$/.exec(normalized);
  return match ? `${match[1]}:${match[2]}:${match[3]}` : null;
}

function configuredEligibleXp(event) {
  if (!event || event.resultCause !== REWARD_RESULT_CAUSE.PLAYER_FIRE_KILL) return 0;
  if (!PLAYER_FIRE_SOURCE_SET.has(event.source)) return 0;
  if (event.isBoss || event.isBossAttack || event.isFragment) return 0;
  if (EXCLUDED_SPAWN_ORIGINS.has(event.spawnOrigin)) return 0;

  const hasCampaignEncounterKey = Object.prototype.hasOwnProperty.call(event, "campaignEncounterKey");
  const hasCampaignXpValue = Object.prototype.hasOwnProperty.call(event, "campaignXpValue");
  const normalizedEncounterId = normalizedId(event.encounterId);
  const isCategoryReceipt = isFirstSegmentCategoryReceiptNamespace(normalizedEncounterId);
  const receiptEncounterKey = campaignEncounterKeyFromReceiptId(normalizedEncounterId);
  // Campaign-origin events and the reserved campaign receipt prefix must use
  // a recognized route ID. Otherwise malformed IDs could fall through to the
  // generic prototype XP table.
  const hasReservedCampaignPrefix = /^campaign:campaign:/i.test(normalizedEncounterId);
  if ((event.spawnOrigin === "campaign-encounter" || hasReservedCampaignPrefix) && receiptEncounterKey === null) return 0;
  const requiresCampaignOverride = ["1:normal:1", "1:normal:2", "1:normal:3"].includes(receiptEncounterKey);
  if (requiresCampaignOverride || isCategoryReceipt || hasCampaignEncounterKey || hasCampaignXpValue) {
    if (!hasCampaignEncounterKey || !hasCampaignXpValue) return 0;
    if (event.spawnOrigin !== "campaign-encounter" || event.rewardType !== event.enemyType) return 0;
    if (receiptEncounterKey !== event.campaignEncounterKey) return 0;
    if (!Number.isSafeInteger(event.campaignXpValue) || event.campaignXpValue <= 0) return 0;

    const configuredCampaignXp = campaignXpValueForEncounter({
      key: event.campaignEncounterKey,
      type: event.enemyType,
    });
    if (!Number.isSafeInteger(configuredCampaignXp) || configuredCampaignXp <= 0) return 0;
    if (event.campaignXpValue !== configuredCampaignXp || event.xpValue !== configuredCampaignXp) return 0;
    return configuredCampaignXp;
  }

  const configuredXp = prototypeXpForRewardType(event.rewardType);
  if (configuredXp === null || configuredXp <= 0 || event.xpValue !== configuredXp) return 0;
  return configuredXp;
}

export function createEligibleRewardEvent({
  runId = "",
  encounterId = "",
  entityInstanceId = "",
  enemy = null,
  source = "",
  resultCause = rewardResultCauseForDefeat({ enemy, source }),
} = {}) {
  const safeRunId = normalizedId(runId);
  const safeEncounterId = normalizedId(encounterId);
  const safeEntityInstanceId = normalizedId(entityInstanceId);
  const spawnOrigin = enemy?.spawnOrigin
    ?? (enemy?.isBossAttack ? "boss-attack"
      : enemy?.isBoss ? "boss-part"
        : enemy?.isFragment || enemy?.type === "shard" ? "split-fragment"
          : enemy?.bossEscort ? "conditional-summon" : "configured-encounter");
  const rewardType = rewardTypeForDefeat(enemy, resultCause);
  const hasCampaignEncounterKey = enemy != null && Object.prototype.hasOwnProperty.call(enemy, "campaignEncounterKey");
  const hasCampaignXpValue = enemy != null && Object.prototype.hasOwnProperty.call(enemy, "campaignXpValue");
  const hasCampaignXpOverride = hasCampaignEncounterKey || hasCampaignXpValue;
  const event = {
    rewardEventId: rewardEventIdFor(safeRunId, safeEncounterId, safeEntityInstanceId),
    runId: safeRunId,
    encounterId: safeEncounterId,
    entityInstanceId: safeEntityInstanceId,
    resultCause,
    rewardType,
    xpValue: hasCampaignXpOverride
      ? (hasCampaignXpValue ? enemy.campaignXpValue : 0)
      : prototypeXpForRewardType(rewardType) ?? 0,
    source: typeof source === "string" ? source : "",
    spawnOrigin,
    enemyType: typeof enemy?.type === "string" ? enemy.type : "unknown",
    isBoss: Boolean(enemy?.isBoss),
    isBossAttack: Boolean(enemy?.isBossAttack),
    isFragment: Boolean(enemy?.isFragment),
  };
  if (hasCampaignEncounterKey) event.campaignEncounterKey = enemy.campaignEncounterKey;
  if (hasCampaignXpValue) event.campaignXpValue = enemy.campaignXpValue;
  if (configuredEligibleXp(event) === 0) event.xpValue = 0;
  return Object.freeze(event);
}

export function isEligibleRewardEvent(event) {
  return configuredEligibleXp(event) > 0;
}

export function createXpReceiptLedger(runId = "") {
  return {
    runId: normalizedId(runId),
    awardedXp: 0,
    consumedRewardEventIds: new Set(),
    receipts: [],
  };
}

function receiptResult(ledger, { rewardEventId = "", firstReceipt = false, awardedXp = 0, reason = "ineligible" } = {}) {
  return Object.freeze({
    rewardEventId,
    firstReceipt,
    accepted: firstReceipt,
    awardedXp,
    totalAwardedXp: Math.max(0, Number(ledger?.awardedXp) || 0),
    reason,
  });
}

export function receiveEligibleRewardEvent(ledger, event) {
  const rewardEventId = normalizedId(event?.rewardEventId);
  const runId = normalizedId(event?.runId);
  const encounterId = normalizedId(event?.encounterId);
  const entityInstanceId = normalizedId(event?.entityInstanceId);
  const expectedRewardEventId = rewardEventIdFor(runId, encounterId, entityInstanceId);
  if (!ledger || !ledger.consumedRewardEventIds || !rewardEventId || !expectedRewardEventId || rewardEventId !== expectedRewardEventId) {
    return receiptResult(ledger, { rewardEventId, reason: "invalid-receipt" });
  }
  if (runId !== ledger.runId) {
    return receiptResult(ledger, { rewardEventId, reason: "run-mismatch" });
  }
  if (ledger.consumedRewardEventIds.has(rewardEventId)) {
    return receiptResult(ledger, { rewardEventId, reason: "duplicate" });
  }

  const awardedXp = configuredEligibleXp(event);
  ledger.consumedRewardEventIds.add(rewardEventId);
  if (awardedXp > 0) ledger.awardedXp += awardedXp;
  const receipt = Object.freeze({
    rewardEventId,
    runId,
    encounterId,
    entityInstanceId,
    resultCause: event.resultCause,
    rewardType: event.rewardType,
    awardedXp,
  });
  ledger.receipts.push(receipt);
  return receiptResult(ledger, {
    rewardEventId,
    firstReceipt: true,
    awardedXp,
    reason: awardedXp > 0 ? "accepted" : "ineligible",
  });
}
