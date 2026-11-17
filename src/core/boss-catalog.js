// 四 Boss 的共同运行合同。首章只实现封锁巡洋舰；其余三项是后续制作包
// 的冻结设计数据，避免候选入口误把空壳奖励当成已完成内容。

export const BOSS_CATALOG_VERSION = "boss-catalog-v5";

export function createBlockadeCycle(now = 0) {
  return { nextAt:now+1200, entryUntil:now+1200, serial:0, pending:[], exposedUntil:0, lastSectors:[] };
}

export function stepBlockadeCycle(state, { now, cannons, coreAlive = true, warnMs = 1200, secondWarnMs = 1400, gapMs = 800, roundMs = 4000 }) {
  if (!coreAlive) { state.pending=[]; return []; }
  const alive=new Set(cannons.filter(p=>!p.dead).map(p=>p.id));
  const events=[];
  state.pending=state.pending.filter(attack=>{
    if(attack.source!=="core"&&!alive.has(attack.source)) return false;
    if(now>=attack.fireAt){events.push({...attack,type:"fire"});return false;}
    return true;
  });
  if(now<state.nextAt) return events;
  const weapons=cannons.filter(p=>!p.dead);
  const sector=(state.serial+1)%3;
  const source=weapons.length?weapons[state.serial%weapons.length].id:"core";
  // warnMs / secondWarnMs / gapMs / roundMs 是可选战役配置。
  // 旧调用不传时逐字保持原有排程：1200 预警、1400 第二段预警、800 间隔、4000 一轮。
  const warn = Math.max(200, Number(warnMs) || 1200);
  const secondWarn = Math.max(200, Number(secondWarnMs) || 1400);
  const gap = Math.max(0, Number(gapMs) ?? 800);
  const secondStartsAt = now + secondWarn + gap;
  const attacks=weapons.length
    ? [{source,sector,fireAt:now+warn,damage:12}]
    : [{source,sector,fireAt:now+secondWarn,damage:16},{source,sector:(sector+1)%3,fireAt:secondStartsAt+secondWarn,damage:16,startsAt:secondStartsAt}];
  state.pending.push(...attacks);
  state.nextAt=now+Math.max(warn + 200, Number(roundMs) || 4000);
  state.serial++;
  return [...events,...attacks.map(a=>({...a,type:"warning"}))];
}

const BOSS = (data) => Object.freeze({
  chapter: data.chapter,
  id: data.id,
  name: data.name,
  silhouette: data.silhouette,
  weakpoint: data.weakpoint,
  reward: data.reward,
  status: data.status ?? "design-only",
  parts: Object.freeze(data.parts.map((part) => Object.freeze({ ...part }))),
  phases: Object.freeze(data.phases.map((phase) => Object.freeze({ ...phase }))),
});

export const BOSS_CATALOG = Object.freeze([
  BOSS({
    chapter: 1,
    id: "blockade-cruiser",
    name: "封锁巡洋舰",
    silhouette: "横向双炮舰；左右炮、中央反应堆、尾喷口独立",
    weakpoint: "任一炮毁后中央暴露 6 秒；双炮毁后持续暴露",
    reward: "下一章航路币与新路线预告",
    status: "playable-v5",
    parts: [
      { id: "left-cannon", label: "左炮", role: "cannon", hpShare: 0.25 },
      { id: "right-cannon", label: "右炮", role: "cannon", hpShare: 0.25 },
      { id: "reactor", label: "中央反应堆", role: "core", hpShare: 0.5 },
    ],
    phases: [
      { id: "cannon-cycle", trigger: "入场后", telegraphMs: 1200, intervalMs: 4000, damage: 12, safeSectors: "两区安全" },
      { id: "reactor-exposed", trigger: "任一炮毁", durationMs: 6000, damageMultiplier: 1.25 },
      { id: "sweep", trigger: "双炮毁", telegraphMs: 1400, intervalMs: 4000, damage: 16, stepGapMs: 800, safeSectors: "每步至少一区安全" },
    ],
  }),
  BOSS({
    chapter: 2,
    id: "prism-warden",
    name: "棱镜守卫",
    silhouette: "纵向棱镜装甲、移动瞄准仪、冷白散热翼",
    weakpoint: "机枪连续命中瞄准仪可打断蓄射并暴露全武器窗口",
    reward: "机枪特化战机",
    parts: [{ id: "prism-core", label: "棱镜核心", role: "core", hpShare: 1 }],
    phases: [{ id: "moving-sight", trigger: "70% / 35% 生命", telegraphMs: 1200, damage: 14 }],
  }),
  BOSS({
    chapter: 3,
    id: "armored-carrier",
    name: "重甲母舰",
    silhouette: "宽甲壳、三组相邻装甲节点、腹部弹舱",
    weakpoint: "主弹与爆破命中相邻节点使其过热，三武器获得短窗增伤",
    reward: "导弹特化战机",
    parts: [{ id: "armor-array", label: "装甲节点组", role: "armor", hpShare: 1 }],
    phases: [{ id: "bay-cycle", trigger: "70% / 35% 生命", telegraphMs: 1200, damage: 16 }],
  }),
  BOSS({
    chapter: 4,
    id: "hive-hub",
    name: "蜂巢枢纽",
    silhouette: "环形母体、三个移动中继、开合蜂巢口",
    weakpoint: "僚机火力累计命中中继使其离线，双离线暴露母体",
    reward: "僚机特化战机",
    parts: [{ id: "hive-core", label: "母体核心", role: "core", hpShare: 1 }],
    phases: [{ id: "relay-cycle", trigger: "70% / 35% 生命", telegraphMs: 1200, damage: 15 }],
  }),
]);

export function bossDefinitionFor(id = "blockade-cruiser") {
  return BOSS_CATALOG.find((boss) => boss.id === id) ?? BOSS_CATALOG[0];
}

export function bossHpBudgetFromDps(dRef, { multiplier = 40 } = {}) {
  const safeDps = Math.max(1, Number(dRef) || 1);
  const safeMultiplier = Math.max(1, Number(multiplier) || 40);
  return Math.round(safeDps * safeMultiplier);
}
