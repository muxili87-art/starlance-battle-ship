export const AI_ASSISTANT_EVENT_PRIORITY = Object.freeze({
  lethalCounter: 4,
  forcedTutorial: 3,
  systemExplain: 2,
  lowFrequencyReminder: 1,
});

// 自动驾驶是“保命/减负”而不是免费火力：所有由 AI 接管期间发出的
// 玩家伤害统一乘以这个系数，便于战斗逻辑、HUD 和 QA 使用同一条基线。
export const AUTOPILOT_DAMAGE_SCALE = 0.72;

// 终端机动的时间轴保持固定，方便主战机渲染、全域结算和 QA 遥测共享
// 同一套边界：锁航 160ms → 飞越 600ms → 离屏留白 140ms → 回场 220ms。
export const OVERLOAD_FINISHER_TIMING = Object.freeze({
  lockMs: 160,
  flyMs: 600,
  gapMs: 140,
  returnMs: 220,
});

// 收尾飞越只给 Boss 当前阶段总生命的一小段预算；锁血/阶段闸门仍由
// 战斗主逻辑负责，避免演出型全屏攻击绕过真正的战斗规则。
export const OVERLOAD_FINISHER_BOSS_DAMAGE_RATIO = 0.06;
export const OVERLOAD_FINISHER_COMPENSATION_SECONDS = 1.35;
export const OVERLOAD_FINISHER_BASE_HP_RATIO = 0.35;
export const OVERLOAD_FINISHER_MAX_HP_RATIO = 0.8;
export const OVERLOAD_FINISHER_EXECUTE_HP_RATIO = 0.2;

// 事件目录先只承接本轮首次过载和已有首次换区提示；BOSS、异常状态、
// 失败复盘在后续任务中复用同一字段，不在本轮扩建内容。
export const AI_ASSISTANT_EVENT_CATALOG = Object.freeze({
  firstDeployment: Object.freeze({
    id: "ai-first-deployment",
    priority: AI_ASSISTANT_EVENT_PRIORITY.systemExplain,
    onceKey: "deployment",
    subtitle: "右翼告警。把飞船部署过去，火力会自动接管。",
    action: "换到告急区",
    voice: "deployment",
    durationMs: 720,
    interruptible: true,
  }),
  overloadRequest: Object.freeze({
    id: "ai-first-overload-request",
    priority: AI_ASSISTANT_EVENT_PRIORITY.forcedTutorial,
    onceKey: "overload-v4",
    subtitle: "守护能源已满。点击核心，授权极限构筑演算。",
    action: "点击守护能源",
    voice: "overload-request",
    durationMs: 0,
    interruptible: false,
  }),
  overloadEngage: Object.freeze({
    id: "ai-overload-engage",
    priority: AI_ASSISTANT_EVENT_PRIORITY.forcedTutorial,
    onceKey: "overload-v4-engage",
    subtitle: "演算接管。九项武装协议，全部上线。",
    action: "临时权限 · 9/9",
    voice: "overload-engage",
    durationMs: 1050,
    interruptible: false,
  }),
  overloadComplete: Object.freeze({
    id: "ai-overload-complete",
    priority: AI_ASSISTANT_EVENT_PRIORITY.forcedTutorial,
    onceKey: "overload-v4-complete",
    subtitle: "演算结束。完成升级，即可永久获得这套火力。",
    action: "恢复当前实装",
    voice: "overload-complete",
    durationMs: 1400,
    interruptible: true,
  }),
  autopilotEngage: Object.freeze({
    id: "ai-autopilot-engage",
    priority: AI_ASSISTANT_EVENT_PRIORITY.systemExplain,
    onceKey: "autopilot",
    subtitle: "弦光自动驾驶接管。输出降至 72%，手动移动可立即夺回火控。",
    action: "自动驾驶中",
    voice: "autopilot-engage",
    durationMs: 920,
    interruptible: true,
  }),
  autopilotRelease: Object.freeze({
    id: "ai-autopilot-release",
    priority: AI_ASSISTANT_EVENT_PRIORITY.systemExplain,
    onceKey: "autopilot-release",
    subtitle: "手动火控已恢复。",
    action: "手动接管",
    voice: "autopilot-release",
    durationMs: 620,
    interruptible: true,
  }),
});

export function aiEventCanInterrupt(currentPriority = 0, nextPriority = 0) {
  return Number(nextPriority) >= Number(currentPriority);
}

export function aiOverloadWeaponDeltas(start = {}, end = {}) {
  return Object.freeze({
    machinegun: Math.max(0, Number(end.machinegun ?? 0) - Number(start.machinegun ?? 0)),
    missile: Math.max(0, Number(end.missile ?? 0) - Number(start.missile ?? 0)),
    swarm: Math.max(0, Number(end.swarm ?? 0) - Number(start.swarm ?? 0)),
  });
}

export function aiOverloadProjectionReady({ impact = false, weapons = {} } = {}) {
  return Boolean(impact)
    && Number(weapons.machinegun ?? 0) > 0
    && Number(weapons.missile ?? 0) > 0
    && Number(weapons.swarm ?? 0) > 0;
}

export function autopilotDamageMultiplier(active = false) {
  return active ? AUTOPILOT_DAMAGE_SCALE : 1;
}

export function autopilotAccessState({ isG1 = false } = {}) {
  return { available: !Boolean(isG1), defaultActive: false };
}

export function autopilotPulseAlpha(now = 0) {
  return 0.72 + Math.sin(Number(now) / 420) * 0.16;
}

export function overloadFinisherBossDamageCap(totalHp = 0) {
  const normalizedHp = Math.max(0, Number(totalHp) || 0);
  if (!normalizedHp) return 0;
  return Math.max(1, Math.round((normalizedHp / 3) * OVERLOAD_FINISHER_BOSS_DAMAGE_RATIO));
}

export function overloadFinisherDamagePlan(targets = [], {
  recentDps = 0,
  compensationSeconds = OVERLOAD_FINISHER_COMPENSATION_SECONDS,
  baseHpRatio = OVERLOAD_FINISHER_BASE_HP_RATIO,
  maxHpRatio = OVERLOAD_FINISHER_MAX_HP_RATIO,
  executeHpRatio = OVERLOAD_FINISHER_EXECUTE_HP_RATIO,
} = {}) {
  const unique = new Set();
  const eligible = (targets ?? []).filter((target) => {
    if (!target || target.dead || target.isBoss || target.isBossAttack || target.id === null || target.id === undefined || unique.has(target.id)) return false;
    unique.add(target.id);
    return Number(target.hp ?? target.maxHp ?? 0) > 0;
  });
  const totalWeight = eligible.reduce((sum, target) => sum + Math.max(1, Number(target.hp ?? target.maxHp ?? 1)), 0);
  const compensationPool = Math.max(0, Number(recentDps) || 0) * Math.max(0, Number(compensationSeconds) || 0);
  return Object.freeze(eligible.map((target) => {
    const maxHp = Math.max(1, Number(target.maxHp ?? target.hp ?? 1));
    const currentHp = Math.max(0, Number(target.hp ?? maxHp));
    const weight = Math.max(1, currentHp);
    const share = totalWeight > 0 ? compensationPool * weight / totalWeight : 0;
    const cap = maxHp * Math.max(0, Number(maxHpRatio) || 0);
    const requested = Math.min(currentHp, cap, maxHp * Math.max(0, Number(baseHpRatio) || 0) + share);
    const damage = Math.max(1, Math.round(requested));
    const remainingHp = Math.max(0, currentHp - damage);
    return Object.freeze({
      id: target.id,
      damage,
      execute: remainingHp > 0 && remainingHp <= maxHp * Math.max(0, Number(executeHpRatio) || 0),
      remainingHp,
    });
  }));
}

export function overloadFinisherTargetIds(targets = []) {
  const seen = new Set();
  return targets
    .filter((enemy) => {
      if (!enemy || enemy.dead || enemy.isBossAttack || enemy.id === null || enemy.id === undefined || seen.has(enemy.id)) return false;
      seen.add(enemy.id);
      return true;
    })
    .map((enemy) => enemy.id);
}

export function overloadFinisherRouteForSector(sector = 1, { width = 720, height = 1280, fieldTop = 140, coreY = 1160 } = {}) {
  const entrySector = Math.max(0, Math.min(2, Math.round(Number(sector) || 0)));
  const outsideY = height + 110;
  const exitY = fieldTop - 100;
  const midY = (outsideY + exitY) / 2;
  const routes = [
    {
      entrySector: 0,
      start: { x: -150, y: outsideY },
      control: { x: width * 0.3, y: midY + 40 },
      end: { x: width + 150, y: exitY },
      label: "左翼突入",
    },
    {
      entrySector: 1,
      start: { x: width / 2, y: outsideY },
      control: { x: width / 2, y: midY - 28 },
      end: { x: width / 2, y: exitY },
      label: "中枢直贯",
    },
    {
      entrySector: 2,
      start: { x: width + 150, y: outsideY },
      control: { x: width * 0.7, y: midY + 40 },
      end: { x: -150, y: exitY },
      label: "右翼突入",
    },
  ];
  return Object.freeze({
    ...routes[entrySector],
    width,
    height,
    fieldTop,
    coreY,
    timing: OVERLOAD_FINISHER_TIMING,
  });
}

export function battleInfoSummaryFor(targets = [], { emergencyTarget = null, coreY = 1160, sectorCount = 3 } = {}) {
  const counts = Array.from({ length: Math.max(1, sectorCount) }, () => 0);
  for (const enemy of targets ?? []) {
    if (!enemy || enemy.dead || enemy.isBoss || enemy.isBossAttack) continue;
    const sector = Math.max(0, Math.min(counts.length - 1, Math.round(Number(enemy.sector ?? enemy.combatSector ?? 0))));
    counts[sector] += 1;
  }
  const target = emergencyTarget && !emergencyTarget.dead ? emergencyTarget : null;
  const distance = target ? Math.max(0, coreY - Number(target.y ?? coreY)) : 0;
  const speed = target ? Math.max(1, Number(target.speed ?? target.baseSpeed ?? 60)) : 1;
  const eta = target ? Math.max(0, Number(target.timeToCore ?? (distance / speed))) : null;
  return Object.freeze({
    counts: Object.freeze(counts),
    urgentSector: target ? Math.max(0, Math.min(counts.length - 1, Math.round(Number(target.sector ?? target.combatSector ?? 0)))) : null,
    urgentEta: eta === null ? null : Number(eta.toFixed(1)),
    sourceTargetId: target?.id ?? null,
  });
}

// 右下角只回答“下一步做什么”。设备是否在线、僚机有几架等正常状态
// 不再抢占战场信息；异常反制、换区收益/代价和过载/AI 取舍才进入窗口。
export function battleInfoTacticalReadoutFor({
  summary = {},
  currentSector = 1,
  sectorLabels = ["左翼", "中枢", "右翼"],
  missileLockProgress = 0,
  missileInFlight = false,
  overloadReady = false,
  overloadActive = false,
  empActive = false,
  autopilotActive = false,
  autopilotAvailable = true,
  autopilotPercent = Math.round(AUTOPILOT_DAMAGE_SCALE * 100),
} = {}) {
  const counts = Array.isArray(summary.counts) ? summary.counts : [0, 0, 0];
  const safeCurrent = Math.max(0, Math.min(counts.length - 1, Math.round(Number(currentSector) || 0)));
  const urgentSector = summary.urgentSector === null || summary.urgentSector === undefined
    ? null
    : Math.max(0, Math.min(counts.length - 1, Math.round(Number(summary.urgentSector) || 0)));
  const label = (sector) => sectorLabels[sector] ?? `区域${sector + 1}`;
  const nonCurrent = counts
    .map((count, sector) => ({ count: Number(count) || 0, sector }))
    .filter(({ sector }) => sector !== safeCurrent)
    .sort((left, right) => right.count - left.count)[0];
  const needsSwitch = urgentSector !== null && urgentSector !== safeCurrent;
  const pressureSwitch = !needsSwitch && nonCurrent && nonCurrent.count >= (Number(counts[safeCurrent] ?? 0) + 2);
  const priority = empActive ? "counter" : needsSwitch || pressureSwitch ? "switch" : overloadReady ? "overload" : "hold";
  const firstLine = empActive
    ? "电磁瘫痪 · 换到相邻区解除"
    : urgentSector !== null
      ? urgentSector === safeCurrent
        ? `保持${label(safeCurrent)} · 近核 ${summary.urgentEta?.toFixed?.(1) ?? summary.urgentEta ?? "--"}s`
        : `转${label(urgentSector)} · 可救 ${counts[urgentSector] ?? 0} · ${summary.urgentEta?.toFixed?.(1) ?? summary.urgentEta ?? "--"}s`
      : pressureSwitch
        ? `建议转${label(nonCurrent.sector)} · ${nonCurrent.count} 个目标`
        : `三区可控 · 保持${label(safeCurrent)}`;
  const lock = Math.max(0, Math.min(1, Number(missileLockProgress) || 0));
  const secondLine = empActive
    ? "快速移动 · 跨相邻区接地"
    : lock > 0 && lock < 1
      ? `换区会断锁 ${Math.round(lock * 100)}%`
      : missileInFlight
        ? "导弹齐射中 · 保持火控"
        : overloadActive
          ? "过载运行 · 保持当前部署"
          : overloadReady
            ? (needsSwitch || urgentSector !== null ? "过载就绪 · 建议释放" : "过载就绪 · 建议保留")
          : autopilotActive
              ? `弦光自动驾驶中 · 输出 ${Math.max(0, Math.round(Number(autopilotPercent) || 0))}%`
              : autopilotAvailable
                ? `弦光可接管 · 输出 ${Math.max(0, Math.round(Number(autopilotPercent) || 0))}%`
                : "手动火控 · 100% 输出";
  return Object.freeze({
    priority,
    lines: Object.freeze([firstLine, secondLine]),
    needsSwitch,
    recommendedSector: needsSwitch ? urgentSector : pressureSwitch ? nonCurrent.sector : safeCurrent,
    color: priority === "counter" ? "violet" : priority === "switch" ? "orange" : priority === "overload" ? "yellow" : "steel",
  });
}
