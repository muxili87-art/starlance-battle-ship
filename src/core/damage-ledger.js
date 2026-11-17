// 有效伤害账本：只记录目标真实减少的生命，供 A 包的 DPS 面板与结算复用。
// 该模块保持 Phaser 无关，方便用固定事件验证边界，不改变战斗数值。

export const DAMAGE_WEAPON_KINDS = Object.freeze(["machinegun", "missile", "drone", "coordination"]);

const SOURCE_KIND = Object.freeze({
  auto: "machinegun",
  crit: "machinegun",
  hunter: "machinegun",
  missile: "missile",
  "missile-split": "missile",
  "missile-blast": "missile",
  "guided-micro": "missile",
  intercept: "drone",
  drone: "drone",
  "drone-converge": "drone",
  "full-fleet": "coordination",
  "overload-global": "coordination",
  "boss-counter": null,
});

export function damageWeaponKindForSource(source = "") {
  const normalized = String(source ?? "").trim().toLowerCase();
  return Object.hasOwn(SOURCE_KIND, normalized) ? SOURCE_KIND[normalized] : "coordination";
}

export function createDamageLedger({
  nodeId = "battle:unknown",
  nodeStartedAt = 0,
  windowMs = 5000,
  maxEvents = 512,
} = {}) {
  return {
    version: 1,
    nodeId: String(nodeId),
    nodeStartedAt: Math.max(0, Number(nodeStartedAt) || 0),
    windowMs: Math.max(250, Number(windowMs) || 5000),
    maxEvents: Math.max(32, Math.floor(Number(maxEvents) || 512)),
    events: [],
    currentTotals: { machinegun: 0, missile: 0, drone: 0, coordination: 0 },
    nodeTotals: { machinegun: 0, missile: 0, drone: 0, coordination: 0 },
    nodePilotTotals: emptyPilotTotals(),
    pilotDurationsMs: emptyPilotTotals(),
    pilot: "manual",
    pilotSince: Math.max(0, Number(nodeStartedAt) || 0),
  };
}

function safeAt(value, fallback = 0) {
  return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback);
}

function emptyTotals() {
  return { machinegun: 0, missile: 0, drone: 0, coordination: 0 };
}

function emptyPilotTotals() {
  return { manual: 0, ai: 0 };
}

function normalizePilot(pilot = "manual") {
  return pilot === "ai" ? "ai" : "manual";
}

function addTotal(totals, kind, amount) {
  if (!Object.hasOwn(totals, kind)) totals.coordination += amount;
  else totals[kind] += amount;
}

export function recordDamageEvent(ledger, {
  at = 0,
  amount = 0,
  source = "auto",
  targetType = "enemy",
  targetId = null,
  pilot = "manual",
  nodeId = ledger?.nodeId ?? "battle:unknown",
  parentId = null,
  countable = true,
} = {}) {
  if (!ledger || !countable) return null;
  const safeAmount = Math.max(0, Number(amount) || 0);
  if (!safeAmount) return null;
  const kind = damageWeaponKindForSource(source);
  const event = Object.freeze({
    at: safeAt(at),
    amount: safeAmount,
    source: String(source ?? "auto"),
    weapon: kind,
    targetType: String(targetType ?? "enemy"),
    targetId: targetId === undefined ? null : targetId,
    pilot: normalizePilot(pilot),
    nodeId: String(nodeId ?? ledger.nodeId),
    parentId: parentId === undefined ? null : parentId,
  });
  ledger.events.push(event);
  const cutoff = event.at - ledger.windowMs;
  // 时间窗口已经限制了内存；不要再按事件数量截掉高射速武器的有效命中。
  // maxEvents 保留为调用方的预算提示和兼容字段，不能改变统计结果。
  ledger.events = ledger.events.filter((item) => item.at >= cutoff);
  addTotal(ledger.currentTotals, kind, safeAmount);
  if (event.nodeId === ledger.nodeId) {
    addTotal(ledger.nodeTotals, kind, safeAmount);
    ledger.nodePilotTotals[event.pilot] += safeAmount;
  }
  return event;
}

export function advanceDamageLedgerPilot(ledger, { at = 0, pilot = "manual" } = {}) {
  if (!ledger) return null;
  const safeNow = safeAt(at, ledger.nodeStartedAt);
  const previousAt = safeAt(ledger.pilotSince, ledger.nodeStartedAt);
  const elapsed = Math.max(0, safeNow - previousAt);
  ledger.pilotDurationsMs[normalizePilot(ledger.pilot)] += elapsed;
  ledger.pilot = normalizePilot(pilot);
  ledger.pilotSince = safeNow;
  return Object.freeze({ ...ledger.pilotDurationsMs });
}

export function beginDamageNode(ledger, { nodeId, at = 0, pilot = "manual" } = {}) {
  if (!ledger) return false;
  ledger.nodeId = String(nodeId ?? ledger.nodeId);
  ledger.nodeStartedAt = safeAt(at, ledger.nodeStartedAt);
  ledger.nodeTotals = emptyTotals();
  ledger.nodePilotTotals = emptyPilotTotals();
  ledger.pilotDurationsMs = emptyPilotTotals();
  ledger.pilot = normalizePilot(pilot);
  ledger.pilotSince = ledger.nodeStartedAt;
  return true;
}

export function finishDamageNode(ledger, { at = 0, pilot = ledger?.pilot } = {}) {
  if (!ledger) return null;
  advanceDamageLedgerPilot(ledger, { at, pilot });
  const total = Object.values(ledger.nodeTotals).reduce((sum, value) => sum + value, 0);
  const finished = Object.freeze({
    nodeId: ledger.nodeId,
    startedAt: ledger.nodeStartedAt,
    endedAt: safeAt(at, ledger.nodeStartedAt),
    durationMs: Math.max(0, safeAt(at, ledger.nodeStartedAt) - ledger.nodeStartedAt),
    total,
    totals: Object.freeze({ ...ledger.nodeTotals }),
    pilotTotals: Object.freeze({ ...ledger.nodePilotTotals }),
    pilotDurationsMs: Object.freeze({ ...ledger.pilotDurationsMs }),
  });
  return finished;
}

export function rollingDamageSnapshot(ledger, {
  now = 0,
  windowMs = ledger?.windowMs ?? 5000,
  nodeId = ledger?.nodeId ?? null,
} = {}) {
  if (!ledger) return Object.freeze({ total: 0, dps: 0, elapsedMs: 0, totals: Object.freeze(emptyTotals()), events: 0, pilotTotals: Object.freeze(emptyPilotTotals()) });
  const safeNow = safeAt(now);
  const safeWindow = Math.max(250, Number(windowMs) || ledger.windowMs || 5000);
  const cutoff = safeNow - safeWindow;
  const events = ledger.events.filter((event) => event.at >= cutoff && event.at <= safeNow && (nodeId === null || event.nodeId === nodeId));
  const totals = emptyTotals();
  const pilotTotals = emptyPilotTotals();
  for (const event of events) {
    const amount = Math.max(0, Number(event.amount) || 0);
    addTotal(totals, event.weapon, amount);
    pilotTotals[normalizePilot(event.pilot)] += amount;
  }
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const nodeElapsedMs = Math.max(0, safeNow - safeAt(ledger.nodeStartedAt));
  const elapsedMs = Math.min(safeWindow, nodeElapsedMs);
  // 分母从节点有效战斗开始计算；不能用首击时刻制造虚高 DPS。
  const denominator = Math.max(0.25, elapsedMs / 1000);
  return Object.freeze({
    total,
    dps: total / denominator,
    elapsedMs,
    totals: Object.freeze(totals),
    pilotTotals: Object.freeze(pilotTotals),
    events: events.length,
  });
}

export function damageLedgerNodeSnapshot(ledger, { at = 0 } = {}) {
  if (!ledger) return Object.freeze({ nodeId: null, durationMs: 0, total: 0, dps: 0, totals: Object.freeze(emptyTotals()), pilotTotals: Object.freeze(emptyPilotTotals()), pilotDurationsMs: Object.freeze(emptyPilotTotals()) });
  advanceDamageLedgerPilot(ledger, { at, pilot: ledger.pilot });
  const totals = { ...ledger.nodeTotals };
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const durationMs = Math.max(0, safeAt(at) - ledger.nodeStartedAt);
  return Object.freeze({
    nodeId: ledger.nodeId,
    durationMs,
    total,
    dps: total / Math.max(0.25, durationMs / 1000),
    totals: Object.freeze(totals),
    pilotTotals: Object.freeze({ ...ledger.nodePilotTotals }),
    pilotDurationsMs: Object.freeze({ ...ledger.pilotDurationsMs }),
  });
}
