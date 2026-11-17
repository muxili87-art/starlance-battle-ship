/**
 * 3-Form Weapon System with Independent Skill CDs & 6 Ordered Pair Reactions (X -> Y).
 * No forced "correct" combo: every pair order (AB, BA, AC, CA, BC, CB) creates a distinct
 * tactical effect so players freely choose their own sequence based on battlefield state.
 */

export const WEAPON_FORMS = Object.freeze({
  pulse: {
    id: "pulse",
    slot: 1,
    keyLabel: "1",
    name: "疾风脉冲",
    color: 0x43cff4,
    hex: "#43cff4",
    status: "resonance",
    statusLabel: "共振",
    skillName: "扇形光刃",
    skillCooldownMs: 4500,
    fireIntervalMs: 190,
  },
  heavy: {
    id: "heavy",
    slot: 2,
    keyLabel: "2",
    name: "重装爆裂",
    color: 0xff8c3a,
    hex: "#ff8c3a",
    status: "fracture",
    statusLabel: "裂甲",
    skillName: "震波重炮",
    skillCooldownMs: 6000,
    fireIntervalMs: 540,
  },
  magnet: {
    id: "magnet",
    slot: 3,
    keyLabel: "3",
    name: "磁暴浮游",
    color: 0xb07cff,
    hex: "#b07cff",
    status: "magnet",
    statusLabel: "磁化",
    skillName: "引力奇点",
    skillCooldownMs: 6500,
    fireIntervalMs: 360,
  },
});

export const FORM_ORDER = ["pulse", "heavy", "magnet"];

/**
 * 6 Ordered Reactions: key = `${prevStatus}->${triggerFormId}`
 */
export const ORDERED_REACTIONS = Object.freeze({
  // A -> B: 共振 + 重炮 = 超导震爆 (大范围冲击波)
  "resonance->heavy": {
    id: "super-blast",
    label: "超导震爆",
    color: 0xffb454,
    bonusDamage: 68,
    aoeRadius: 145,
    knockbackVy: -220,
  },
  // B -> A: 裂甲 + 脉冲 = 碎甲穿刺 (高速破甲弹片溅射)
  "fracture->pulse": {
    id: "shrapnel-pierce",
    label: "碎甲穿刺",
    color: 0x7ce8ff,
    bonusDamage: 46,
    aoeRadius: 95,
    knockbackVy: -70,
  },
  // A -> C: 共振 + 磁暴 = 全域跳电 (跨区连锁电弧)
  "resonance->magnet": {
    id: "arc-chain",
    label: "全域跳电",
    color: 0xd0a8ff,
    bonusDamage: 52,
    chainCount: 4,
    knockbackVy: -40,
  },
  // C -> A: 磁化 + 脉冲 = 聚能过载 (高暴击连击)
  "magnet->pulse": {
    id: "flux-crit",
    label: "聚能感电",
    color: 0x43cff4,
    bonusDamage: 58,
    aoeRadius: 85,
    knockbackVy: -90,
  },
  // B -> C: 裂甲 + 磁暴 = 引力落雷 (定身+落雷)
  "fracture->magnet": {
    id: "thunder-lock",
    label: "引力落雷",
    color: 0xff5c72,
    bonusDamage: 64,
    aoeRadius: 110,
    knockbackVy: -120,
  },
  // C -> B: 磁化 + 重炮 = 多米诺撞碎 (强力击飞引发连环碰撞)
  "magnet->heavy": {
    id: "domino-slam",
    label: "磁力撞碎",
    color: 0xff8c3a,
    bonusDamage: 74,
    aoeRadius: 120,
    knockbackVy: -380,
  },
});

export function resolveOrderedReaction(existingStatus, triggerFormId) {
  if (!existingStatus) return null;
  return ORDERED_REACTIONS[`${existingStatus}->${triggerFormId}`] || null;
}
