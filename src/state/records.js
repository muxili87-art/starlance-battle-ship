const KEY = "starlance-records-v2";
const RANK_ORDER = { S: 4, A: 3, B: 2, C: 1 };

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadRecords() {
  const store = safeStorage();
  if (!store) return {};
  try {
    return JSON.parse(store.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function computeRunRank(s) {
  const hpRatio = s.maxHp > 0 ? s.hp / s.maxHp : 0;
  const combatScore = s.combatScore ?? (s.kills * 120 + s.grazes * 90);
  const points = combatScore + s.bestCombo * 180 + s.parts * 25 +
    (s.phase === "victory" ? 12000 * (s.stage ?? 1) + hpRatio * 6000 : 0);
  const score = Math.round(points * (s.difficulty === "hardcore" ? 1.5 : 1));
  let rank = "C";
  if (s.phase === "victory") {
    if (hpRatio >= 0.72 && s.bestCombo >= 15) rank = "S";
    else if (hpRatio >= 0.38 || s.bestCombo >= 10) rank = "A";
    else rank = "B";
  } else if (s.kills >= 120) {
    rank = "B";
  }
  return { rank, score };
}

export function recordRunResult(s) {
  const { rank, score } = computeRunRank(s);
  const all = loadRecords();
  const prev = all[s.fighterId] ?? { bestRank: null, bestScore: 0, bestCombo: 0, clears: 0, bestEndlessStage: 0, bestEndlessScore: 0 };
  const betterRank = !prev.bestRank || (RANK_ORDER[rank] ?? 0) > (RANK_ORDER[prev.bestRank] ?? 0);
  const next = {
    bestRank: betterRank ? rank : prev.bestRank,
    bestScore: Math.max(prev.bestScore, score),
    bestCombo: Math.max(prev.bestCombo, s.bestCombo),
    clears: prev.clears + (s.phase === "victory" ? 1 : 0),
    bestEndlessStage: Math.max(prev.bestEndlessStage ?? 0, s.mode === "endless" ? (s.stage ?? 1) : 0),
    bestEndlessScore: Math.max(prev.bestEndlessScore ?? 0, s.mode === "endless" ? score : 0),
  };
  all[s.fighterId] = next;
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(KEY, JSON.stringify(all));
    } catch {
      // Ignore quota errors in private browsing.
    }
  }
  return { rank, score, record: next };
}
