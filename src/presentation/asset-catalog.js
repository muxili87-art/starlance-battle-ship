import { registerAllPixelSprites } from "./pixel-sprites.js";

/**
 * Pixel-art asset registry (4x integer scale on 720x1280 logical canvas).
 * Legacy F-series assets have been completely removed.
 */
export const ART_CATALOG = Object.freeze({
  "player.flat": { key: "px-player-flat", scale: 4 },
  "player.bankL": { key: "px-player-bank-l", scale: 4 },
  "player.bankR": { key: "px-player-bank-r", scale: 4 },
  "drone.escort": { key: "px-drone", scale: 4 },
  "core.shell": { key: "px-core-shell", scale: 4 },

  "enemy.scout": { key: "px-enemy-scout", scale: 4 },
  "enemy.striker": { key: "px-enemy-striker", scale: 4 },
  "enemy.frigate": { key: "px-enemy-frigate", scale: 4 },
  "enemy.shield": { key: "px-enemy-shield", scale: 4 },
  "enemy.relay": { key: "px-enemy-relay", scale: 4 },
  "enemy.splitter": { key: "px-enemy-splitter", scale: 4 },
  "enemy.shard": { key: "px-enemy-shard", scale: 4 },
});

export function preloadArtCatalog(scene) {
  registerAllPixelSprites(scene);
}

export function getAssetSpec(id) {
  return ART_CATALOG[id] || null;
}
