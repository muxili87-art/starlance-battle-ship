// V6.3 首章整合 · 04 主攻切换（纯模块）
//
// 只做纯计算：不依赖 Phaser / DOM / 存储 / 随机数 / 真实时钟。
// 唯一新增战斗增益是「选中原生武器 +20%」，由场景在发射时冻结快照、
// 在 damageEnemy 结算一次。本模块不持有任何战斗状态。
//
// 冻结参数（首测值，不代表已验证平衡）：冷却 3000ms、加成 0.20。

export const PRIMARY_WEAPON_VERSION = 1;
export const PRIMARY_WEAPON_COOLDOWN_MS = 3000;
export const PRIMARY_WEAPON_BONUS = 0.2;
export const PRIMARY_WEAPONS = Object.freeze(["machinegun", "missile", "drone"]);
export const MAX_EQUIPPED_WEAPONS = 3;
export const DEFAULT_EQUIPPED_WEAPONS = PRIMARY_WEAPONS;
export const WEAPON_RAIL_SIDES = Object.freeze(["left", "right"]);
export const WEAPON_RAIL_STORAGE_KEY = "battle-ship-next-weapon-rail-side-v1";

// 装配层与战斗层分开：当前仍默认三武器全装，但 HUD 不再把三项写死。
// 未来加入新武器时只需传入可用 ID 与装配清单，显示层最多消费三个合法槽位。
export function normalizeEquippedWeapons(equipped = DEFAULT_EQUIPPED_WEAPONS, available = PRIMARY_WEAPONS) {
  const legal = new Set(Array.isArray(available) ? available : PRIMARY_WEAPONS);
  const source = Array.isArray(equipped) ? equipped : DEFAULT_EQUIPPED_WEAPONS;
  const result = [];
  for (const weapon of source) {
    if (!legal.has(weapon) || result.includes(weapon)) continue;
    result.push(weapon);
    if (result.length >= MAX_EQUIPPED_WEAPONS) break;
  }
  if (!result.length) return [...DEFAULT_EQUIPPED_WEAPONS].filter((weapon) => legal.has(weapon)).slice(0, MAX_EQUIPPED_WEAPONS);
  return result;
}

export function normalizeWeaponRailSide(value) {
  return WEAPON_RAIL_SIDES.includes(value) ? value : "left";
}

export function readWeaponRailSide(storage) {
  try { return normalizeWeaponRailSide(storage?.getItem?.(WEAPON_RAIL_STORAGE_KEY)); }
  catch { return "left"; }
}

export function writeWeaponRailSide(storage, value) {
  const side = normalizeWeaponRailSide(value);
  try { storage?.setItem?.(WEAPON_RAIL_STORAGE_KEY, side); } catch { /* memory-only fallback */ }
  return side;
}

// 主攻 → 升级路线（crit 是机枪的路线，不是第四种主攻）。
export const PRIMARY_ROUTE = Object.freeze({
  machinegun: "crit",
  missile: "missile",
  drone: "swarm",
});

// 原生来源 → 主攻归属。与 combat-damage-ledger.js 的 SOURCE_KIND 对齐；
// 未列出的来源（协同/全屏终结/Boss 反制/未知）一律不享受主攻增益。
export const PRIMARY_SOURCE_OWNER = Object.freeze({
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
});

export function isPrimaryWeapon(weapon) {
  return PRIMARY_WEAPONS.includes(weapon);
}

export function primaryRouteFor(weapon) {
  return PRIMARY_ROUTE[weapon] ?? null;
}

export function primaryOwnerForSource(source) {
  return PRIMARY_SOURCE_OWNER[String(source ?? "")] ?? null;
}

export function createPrimaryWeaponState() {
  return Object.freeze({ selected: "machinegun", readyAt: 0 });
}

function normalizeState(state) {
  if (!state || !isPrimaryWeapon(state.selected)) return createPrimaryWeaponState();
  const readyAt = Number(state.readyAt);
  return Object.freeze({ selected: state.selected, readyAt: Number.isFinite(readyAt) && readyAt > 0 ? readyAt : 0 });
}

/**
 * 请求切换主攻。纯函数：返回新状态，不改入参、不产生副作用。
 * reason: switched / current / cooldown / blocked / invalid
 * - 点击当前选中项：current，不刷新也不消费冷却
 * - 冷却中点击其他项：cooldown，不排队
 * - 非法武器或非法 now（非有限/负数）：invalid
 * - 入口关闭或当前不接受输入：blocked
 */
export function requestPrimaryWeaponSwitch(state, { weapon, now, enabled = true, inputAllowed = true } = {}) {
  const current = normalizeState(state);
  if (!isPrimaryWeapon(weapon)) return { state: current, changed: false, reason: "invalid" };
  const at = Number(now);
  if (!Number.isFinite(at) || at < 0) return { state: current, changed: false, reason: "invalid" };
  if (!enabled) return { state: current, changed: false, reason: "blocked" };
  if (!inputAllowed) return { state: current, changed: false, reason: "blocked" };
  if (weapon === current.selected) return { state: current, changed: false, reason: "current" };
  if (at < current.readyAt) return { state: current, changed: false, reason: "cooldown" };
  return {
    state: Object.freeze({ selected: weapon, readyAt: at + PRIMARY_WEAPON_COOLDOWN_MS }),
    changed: true,
    reason: "switched",
  };
}

/**
 * 发射时冻结的主攻快照。非法输入返回 null——不猜值、不补默认。
 */
export function capturePrimaryAttack({ selected, pilot, pilotScale } = {}) {
  if (!isPrimaryWeapon(selected)) return null;
  const pilotName = pilot === "ai" ? "ai" : pilot === "manual" ? "manual" : null;
  if (!pilotName) return null;
  const scale = Number(pilotScale);
  if (!Number.isFinite(scale) || scale < 0) return null;
  return Object.freeze({ version: PRIMARY_WEAPON_VERSION, selected, pilot: pilotName, pilotScale: scale });
}

/**
 * 主攻加成：只有快照合法、来源有明确归属、且归属等于快照主攻时才是 0.20。
 * 没有快照返回 0——不从「当前主攻」补猜历史状态。
 */
export function primaryBonusForSource(source, snapshot) {
  if (!snapshot || snapshot.version !== PRIMARY_WEAPON_VERSION) return 0;
  if (!isPrimaryWeapon(snapshot.selected)) return 0;
  const owner = primaryOwnerForSource(source);
  if (!owner) return 0;
  return owner === snapshot.selected ? PRIMARY_WEAPON_BONUS : 0;
}

/**
 * 快照是否可用于覆盖驾驶系数：合法快照 + 来源属于三武器链。
 * 协同/Boss 反制/未知来源继续沿用原有倍率。
 */
export function primarySnapshotApplies(source, snapshot) {
  if (!snapshot || snapshot.version !== PRIMARY_WEAPON_VERSION) return false;
  if (!isPrimaryWeapon(snapshot.selected)) return false;
  if (!Number.isFinite(snapshot.pilotScale) || snapshot.pilotScale < 0) return false;
  return primaryOwnerForSource(source) !== null;
}
