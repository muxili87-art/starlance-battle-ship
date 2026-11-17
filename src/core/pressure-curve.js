/**
 * Interest & Pressure Curve (Pacing Wave Director):
 * Alternates warm-up -> swarm peak -> breather -> gunship barrage peak -> escalating waves
 * so gameplay tension rises and releases in memorable beats rather than flat 1-by-1 spawns.
 */

export function getPressurePhase(elapsedMs) {
  const sec = elapsedMs / 1000;
  const cycleSec = sec < 45 ? sec : 15 + ((sec - 45) % 40);

  if (sec < 12) {
    return {
      name: "热身接触",
      spawnIntervalMs: 1100,
      batchSize: 2,
      maxEnemies: 10,
      weights: ["scout", "scout", "striker"],
    };
  }
  if (cycleSec < 28) {
    return {
      name: "蜂群压境",
      spawnIntervalMs: 950,
      batchSize: 3,
      maxEnemies: 18,
      weights: ["scout", "striker", "shield", "relay"],
    };
  }
  if (cycleSec < 36) {
    return {
      name: "喘息整备",
      spawnIntervalMs: 1800,
      batchSize: 1,
      maxEnemies: 8,
      weights: ["frigate", "relay"],
    };
  }
  return {
    name: "舰队总攻",
    spawnIntervalMs: 1050,
    batchSize: 4,
    maxEnemies: 22,
    weights: ["striker", "frigate", "shield", "relay", "scout"],
  };
}
