// Temporary reward values for the core-loop prototype. Unknown reward types
// deliberately resolve to null so they can never earn XP by falling through.
export const PROTOTYPE_XP_BY_REWARD_TYPE = Object.freeze({
  scout: 10,
  striker: 14,
  frigate: 18,
  shield: 20,
  relay: 20,
  splitter: 20,
  shard: 0,
  "conditional-summon": 0,
  boss: 0,
});

// Cumulative Run XP thresholds calibrated for this prototype. Keep these
// values centralized so growth logic never derives or invents later levels.
export const PROTOTYPE_LEVEL_XP_THRESHOLDS = Object.freeze({
  2: 30,
  3: 80,
  4: 150,
  5: 240,
  6: 350,
  7: 475,
  8: 620,
  9: 800,
  10: 1010,
});

export const PROTOTYPE_MAX_LEVEL = Math.max(...Object.keys(PROTOTYPE_LEVEL_XP_THRESHOLDS).map(Number));

export function prototypeXpForRewardType(rewardType) {
  if (!Object.prototype.hasOwnProperty.call(PROTOTYPE_XP_BY_REWARD_TYPE, rewardType)) return null;
  return PROTOTYPE_XP_BY_REWARD_TYPE[rewardType];
}
