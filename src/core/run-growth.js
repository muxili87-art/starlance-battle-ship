import { PROTOTYPE_LEVEL_XP_THRESHOLDS, PROTOTYPE_MAX_LEVEL } from "./xp-config.js";

function normalizedId(value) {
  return typeof value === "string" ? value.trim() : "";
}

function freezeCredit(credit) {
  return Object.freeze({ ...credit });
}

function freezeGrowthState({
  runId,
  xp,
  level,
  pendingUpgradeCredits,
  consumedUpgradeCredits,
  processedRewardReceipts,
}) {
  return Object.freeze({
    runId,
    xp,
    level,
    pendingUpgradeCredits: Object.freeze(pendingUpgradeCredits.map(freezeCredit)),
    consumedUpgradeCredits: Object.freeze(consumedUpgradeCredits.map(freezeCredit)),
    processedRewardReceipts: Object.freeze([...processedRewardReceipts]),
    prototypeDiagnostics: Object.freeze({
      maxLevel: PROTOTYPE_MAX_LEVEL,
      levelCapReached: level >= PROTOTYPE_MAX_LEVEL,
    }),
  });
}

export function createRunGrowthState(runId = "") {
  return freezeGrowthState({
    runId: normalizedId(runId),
    xp: 0,
    level: 1,
    pendingUpgradeCredits: [],
    consumedUpgradeCredits: [],
    processedRewardReceipts: [],
  });
}

function summaryFor(state, {
  accepted = false,
  reason,
  xpAdded = 0,
  previousXP = state?.xp ?? 0,
  currentXP = state?.xp ?? 0,
  previousLevel = state?.level ?? 1,
  currentLevel = state?.level ?? 1,
  creditsCreated = [],
  isDuplicate = false,
} = {}) {
  return Object.freeze({
    accepted,
    reason,
    xpAdded,
    previousXP,
    currentXP,
    previousLevel,
    currentLevel,
    levelsGained: Math.max(0, currentLevel - previousLevel),
    creditsCreated: Object.freeze(creditsCreated.map(freezeCredit)),
    isDuplicate,
  });
}

function unchangedResult(state, reason, isDuplicate = false) {
  return Object.freeze({
    nextState: state,
    summary: summaryFor(state, { reason, isDuplicate }),
  });
}

function isValidState(state) {
  return Boolean(state
    && typeof state.runId === "string"
    && Number.isFinite(state.xp)
    && state.xp >= 0
    && Number.isInteger(state.level)
    && state.level >= 1
    && state.level <= PROTOTYPE_MAX_LEVEL
    && Array.isArray(state.pendingUpgradeCredits)
    && Array.isArray(state.consumedUpgradeCredits)
    && Array.isArray(state.processedRewardReceipts));
}

/** Move one pending Credit into its retained history after a successful offer commit. */
export function consumePendingUpgradeCredit(state, creditId, { consumedAt = 0, offerId = "" } = {}) {
  const normalizedCreditId = normalizedId(creditId);
  const normalizedOfferId = normalizedId(offerId);
  if (!isValidState(state)) return Object.freeze({ nextState: state, applied: false, reason: "invalid-state" });
  if (!normalizedCreditId || !normalizedOfferId) return Object.freeze({ nextState: state, applied: false, reason: "invalid-identity" });
  if (!Number.isFinite(consumedAt) || consumedAt < 0) return Object.freeze({ nextState: state, applied: false, reason: "invalid-consumed-at" });
  const index = state.pendingUpgradeCredits.findIndex((credit) => credit.creditId === normalizedCreditId && credit.status === "pending");
  if (index < 0) return Object.freeze({ nextState: state, applied: false, reason: "credit-not-pending" });

  const [pendingCredit] = state.pendingUpgradeCredits.slice(index, index + 1);
  const consumedCredit = freezeCredit({
    ...pendingCredit,
    consumedAt,
    offerId: normalizedOfferId,
    status: "consumed",
  });
  const nextState = freezeGrowthState({
    runId: state.runId,
    xp: state.xp,
    level: state.level,
    pendingUpgradeCredits: state.pendingUpgradeCredits.filter((_, creditIndex) => creditIndex !== index),
    consumedUpgradeCredits: [...state.consumedUpgradeCredits, consumedCredit],
    processedRewardReceipts: state.processedRewardReceipts,
  });
  return Object.freeze({ nextState, applied: true, reason: "consumed", credit: consumedCredit });
}

export function applyRewardReceipt(state, receipt, { runTimeMs = 0 } = {}) {
  if (!isValidState(state)) return unchangedResult(state, "invalid-state");

  const rewardEventId = normalizedId(receipt?.rewardEventId);
  const receiptRunId = normalizedId(receipt?.runId);
  if (!rewardEventId || !receiptRunId) return unchangedResult(state, "invalid-receipt");
  if (!Number.isFinite(receipt?.awardedXp) || receipt.awardedXp < 0) {
    return unchangedResult(state, "invalid-xp");
  }
  if (!state.runId || receiptRunId !== state.runId) return unchangedResult(state, "run-mismatch");
  if (state.processedRewardReceipts.includes(rewardEventId)) {
    return unchangedResult(state, "duplicate", true);
  }
  if (!Number.isFinite(runTimeMs) || runTimeMs < 0) return unchangedResult(state, "invalid-run-time");

  const previousXP = state.xp;
  const currentXP = previousXP + receipt.awardedXp;
  if (!Number.isFinite(currentXP)) return unchangedResult(state, "invalid-total-xp");

  const previousLevel = state.level;
  let currentLevel = previousLevel;
  const creditsCreated = [];
  while (currentLevel < PROTOTYPE_MAX_LEVEL) {
    const nextLevel = currentLevel + 1;
    const threshold = PROTOTYPE_LEVEL_XP_THRESHOLDS[nextLevel];
    if (!Number.isFinite(threshold) || currentXP < threshold) break;
    currentLevel = nextLevel;
    creditsCreated.push({
      creditId: `upgrade-credit:${state.runId}:level:${currentLevel}`,
      runId: state.runId,
      earnedAt: runTimeMs,
      earnedLevel: currentLevel,
      sourceRewardEventId: rewardEventId,
      status: "pending",
    });
  }

  const nextState = freezeGrowthState({
    runId: state.runId,
    xp: currentXP,
    level: currentLevel,
    pendingUpgradeCredits: [...state.pendingUpgradeCredits, ...creditsCreated],
    consumedUpgradeCredits: state.consumedUpgradeCredits,
    processedRewardReceipts: [...state.processedRewardReceipts, rewardEventId],
  });
  return Object.freeze({
    nextState,
    summary: summaryFor(nextState, {
      accepted: true,
      reason: "accepted",
      xpAdded: receipt.awardedXp,
      previousXP,
      currentXP,
      previousLevel,
      currentLevel,
      creditsCreated,
    }),
  });
}
