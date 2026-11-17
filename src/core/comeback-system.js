/**
 * Dynamic Rubber-Banding & Comeback Pressure System for 4-Player Matches.
 * - Leader faces slightly higher wave pressure ("领航压制") so leads aren't auto-wins.
 * - Trailing players (Rank 3-4) gain faster Overload energy charge ("逆流充能")
 *   and unlock high-risk/high-reward "逆境奇兵" comeback cards when top prizes are claimed.
 */

export const COMEBACK_CARDS = Object.freeze([
  {
    id: "comeback-overclock",
    title: "逆境超频",
    route: "crit",
    rarity: "comeback",
    description: "立即消耗 12% 核心耐久，换取全武器伤害 +35% 与攻速 +15%",
    apply(session) {
      session.core.hp = Math.max(10, session.core.hp - 12);
      session.build.damageMultiplier = Number((session.build.damageMultiplier + 0.35).toFixed(2));
      session.build.attackSpeedMultiplier = Number((session.build.attackSpeedMultiplier + 0.15).toFixed(2));
    },
  },
  {
    id: "comeback-surge",
    title: "紧急聚能",
    route: "missile",
    rarity: "comeback",
    description: "立即填充 65% 过载能源，且导弹伤害 +25%",
    apply(session) {
      session.core.energy = Math.min(session.core.maxEnergy, session.core.energy + 65);
      session.build.damageMultiplier = Number((session.build.damageMultiplier + 0.25).toFixed(2));
    },
  },
  {
    id: "comeback-aegis",
    title: "护航反扑",
    route: "swarm",
    rarity: "comeback",
    description: "修复 18% 核心耐久，并额外增派 1 架近防僚机",
    apply(session) {
      session.core.hp = Math.min(session.core.maxHp, session.core.hp + 18);
      session.build.drones = (session.build.drones || 0) + 1;
    },
  },
]);

export function computeSlotPaceModifiers(rank, totalPlayers = 4, nodeGapFromLeader = 0) {
  if (rank === 1 && totalPlayers >= 2) {
    return {
      label: "领航悬赏 ×1.25",
      enemyHpScale: 1.12,
      overloadChargeScale: 1.25, // Tetris 99 Attacker Bonus: leader under pressure charges faster!
      bountyMultiplier: 1.25,
      unlockComebackCard: false,
    };
  }
  if (rank === 2) {
    return {
      label: "紧追态势",
      enemyHpScale: 1.0,
      overloadChargeScale: nodeGapFromLeader >= 1 ? 1.12 : 1.0,
      bountyMultiplier: 1.0,
      unlockComebackCard: false,
    };
  }
  if (rank === 3) {
    return {
      label: "逆流空投",
      enemyHpScale: 0.96,
      overloadChargeScale: 1.22,
      bountyMultiplier: 1.0,
      unlockComebackCard: true,
    };
  }
  return {
    label: "背水一战",
    enemyHpScale: 0.92,
    overloadChargeScale: 1.38,
    bountyMultiplier: 1.0,
    unlockComebackCard: true,
  };
}
