import { BUILD_CARDS, cardRarityForTier } from "./build-system.js";

/**
 * Shared competitive prize pool across all 4 players in a match.
 * Faster players reach milestone tiers first and claim limited high-value cards
 * and speed-rank bonuses before slower opponents.
 */
export class SharedPrizePool {
  constructor() {
    this.tiers = new Map();
    this.clearOrders = new Map();
  }

  ensureTier(tierKey) {
    if (this.tiers.has(tierKey)) return this.tiers.get(tierKey);

    // Rotate through BUILD_CARDS based on milestone wave/tier index so every 2 waves offers fresh upgrades
    const numMatch = String(tierKey).match(/(\d+)/g);
    const stepIdx = numMatch ? Number(numMatch[numMatch.length - 1]) : 0;
    const offset = Math.max(0, Math.floor((stepIdx - 1) / 2) * 3) % BUILD_CARDS.length;
    const rotated = [];
    for (let i = 0; i < 4; i += 1) {
      rotated.push(BUILD_CARDS[(offset + i) % BUILD_CARDS.length]);
    }

    const pool = rotated.map((card, idx) => ({
      cardId: card.id,
      card,
      rarity: idx === 0 ? "epic" : idx === 1 ? "rare" : cardRarityForTier(card.tier || 1),
      maxStock: idx === 0 ? 1 : idx === 1 ? 1 : 2,
      remaining: idx === 0 ? 1 : idx === 1 ? 1 : 2,
      claimedBy: [],
    }));

    this.tiers.set(tierKey, pool);
    this.clearOrders.set(tierKey, []);
    return pool;
  }

  recordMilestoneClear(tierKey, playerId) {
    this.ensureTier(tierKey);
    const order = this.clearOrders.get(tierKey);
    if (!order.includes(playerId)) {
      order.push(playerId);
    }
    const rank = order.indexOf(playerId) + 1;
    const bonusMultiplier = rank === 1 ? 1.2 : rank === 2 ? 1.1 : rank === 3 ? 1.05 : 1.0;
    return { rank, bonusMultiplier };
  }

  getAvailableEntries(tierKey) {
    const pool = this.ensureTier(tierKey);
    return pool.filter((entry) => entry.remaining > 0);
  }

  claimCard(tierKey, playerId, cardId) {
    const pool = this.ensureTier(tierKey);
    const entry = pool.find((e) => e.cardId === cardId && e.remaining > 0);
    if (!entry) return null;
    entry.remaining -= 1;
    entry.claimedBy.push(playerId);
    return entry;
  }

  getSnapshot(tierKey) {
    const pool = this.ensureTier(tierKey);
    return {
      tierKey,
      clearOrder: [...(this.clearOrders.get(tierKey) || [])],
      entries: pool.map((e) => ({
        cardId: e.cardId,
        rarity: e.rarity,
        remaining: e.remaining,
        maxStock: e.maxStock,
        claimedBy: [...e.claimedBy],
      })),
    };
  }
}
