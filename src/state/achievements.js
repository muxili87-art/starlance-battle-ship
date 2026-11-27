const KEY = "starlance-achievements-v1";

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const ACHIEVEMENTS = [
  { id: "first_evo", title: "超武觉醒", desc: "首次触发任意战机超武共振", tier: "cyan", check: (s) => Boolean(s.build?.synergy) },
  { id: "gold_rain", title: "金雨洗礼", desc: "单次消弹转化不少于 40 颗黄金星晶", tier: "gold", check: (s) => (s.maxBulletCancel ?? 0) >= 40 },
  { id: "combo_60", title: "战神降临", desc: "单局达成 60 连击（SS 阶超频）", tier: "cyan", check: (s) => (s.bestCombo ?? 0) >= 60 },
  { id: "combo_100", title: "不灭连斩", desc: "单局达成 100 连击", tier: "gold", check: (s) => (s.bestCombo ?? 0) >= 100 },
  { id: "graze_60", title: "刀尖起舞", desc: "单局累计触发 60 次擦弹", tier: "cyan", check: (s) => (s.grazes ?? 0) >= 60 },
  { id: "flawless_boss", title: "完美处决", desc: "无损伤生命值击破任意关底 Boss", tier: "gold", check: (s) => (s.flawlessBosses ?? 0) >= 1 },
  { id: "endless_s4", title: "深空破局者", desc: "无尽模式突破第 4 星域（Loop 2）", tier: "cyan", check: (s) => s.mode === "endless" && s.stage >= 4 },
  { id: "endless_s7", title: "星域收割者", desc: "无尽模式突破第 7 星域（Loop 3）", tier: "gold", check: (s) => s.mode === "endless" && s.stage >= 7 },
  { id: "endless_s10", title: "永夜传说", desc: "无尽模式突破第 10 星域（Loop 4）", tier: "crimson", check: (s) => s.mode === "endless" && s.stage >= 10 },
  { id: "kills_300", title: "百战铁翼", desc: "单局累计击破 300 架敌机", tier: "cyan", check: (s) => (s.kills ?? 0) >= 300 },
  { id: "kills_600", title: "星海清道夫", desc: "单局累计击破 600 架敌机", tier: "gold", check: (s) => (s.kills ?? 0) >= 600 },
  { id: "hardcore_s4", title: "弹幕炼狱行者", desc: "硬核难度突破第 4 星域", tier: "crimson", check: (s) => s.difficulty === "hardcore" && s.stage >= 4 },
];

export function loadAchievements() {
  const store = safeStorage();
  if (!store) return {};
  try {
    return JSON.parse(store.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveAchievements(map) {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors.
  }
}

export function checkAchievements(session, unlockedSet = null) {
  const persisted = unlockedSet ? null : loadAchievements();
  const newly = [];
  for (const ach of ACHIEVEMENTS) {
    if (session.unlockedInRun?.includes(ach.id)) continue;
    if (unlockedSet ? unlockedSet.has(ach.id) : Boolean(persisted[ach.id])) continue;
    if (!ach.check(session)) continue;
    session.unlockedInRun?.push(ach.id);
    if (unlockedSet) unlockedSet.add(ach.id);
    else persisted[ach.id] = Date.now();
    newly.push(ach);
  }
  if (!unlockedSet && newly.length > 0) saveAchievements(persisted);
  return newly;
}
