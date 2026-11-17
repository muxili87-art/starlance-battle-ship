import { PIXEL_PALETTE } from "./pixel-sprites.js";

/**
 * Shared-Origin ("敌我同源") Multi-Layer Sprite-Stacked Enemy Definitions.
 * Uses the exact same slate-armor palette as the player's interceptor,
 * flipped downward with inverted crimson/amber cores and matching 3-phase tech:
 * - scout (3 layers): Pulse-wing weaver
 * - striker (4 layers): Heavy-prong rusher
 * - frigate (5 layers): Twin-deck gunship (fires enemy bullets)
 * - shield (4 layers): Phase-barrier carrier
 * - relay (4 layers): Magnet-ring buffer (explodes in chain on death)
 */

const ENEMY_STACK_DEFS = {
  scout: [
    // Layer 0: under-chassis
    [
      "................",
      "......kkkk......",
      ".....kddddk.....",
      "....kddddddk....",
      "...kddddddddk...",
      "....kddddddk....",
      ".....kddddk.....",
      "......kddk......",
      ".......kk.......",
      "................",
    ],
    // Layer 1: swept pulse wings (cyan accents shared with player pulse form)
    [
      "..kk........kk..",
      ".kcck......kcck.",
      ".kdcck....kccdk.",
      "kddmmk....kmmddk",
      "kdmllmk..kmllmdk",
      ".kdmllmmmmllmdk.",
      "..kdmddddddmdk..",
      "...kddRRRRddk...",
      "....kddRRddk....",
      ".....kkRRkk.....",
    ],
    // Layer 2: dorsal spine & crimson sensor
    [
      "................",
      "................",
      "................",
      "......kkkk......",
      ".....kdlllk.....",
      ".....kdlwlk.....",
      "......kRRk......",
      "......kRRk......",
      ".......kk.......",
      "................",
    ],
  ],
  striker: [
    // Layer 0: base frame
    [
      "....kk....kk....",
      "...kddk..kddk...",
      "...kddkkkkddk...",
      "..kddddddddddk..",
      "..kddddddddddk..",
      "...kddddddddk...",
      "....kddddddk....",
      ".....kddddk.....",
      "......kkkk......",
      "................",
    ],
    // Layer 1: armored main hull + orange heavy tech accents
    [
      "..kk........kk..",
      ".kaak......kaak.",
      ".kdmkk....kkmdk.",
      "kddmmkddddkmmddk",
      "kdmllmdRRdmllmdk",
      ".kdmmddRRddmmdk.",
      "..kddmmmmmmddk..",
      "...kddRRRRddk...",
      "....kkdRRdkk....",
      "......kkkk......",
    ],
    // Layer 2: heavy forward prongs
    [
      ".kwwk......kwwk.",
      ".kaak......kaak.",
      ".kddk......kddk.",
      "................",
      ".....kllllk.....",
      ".....kdwwdk.....",
      "......kRRk......",
      "................",
      "................",
      "................",
    ],
  ],
  frigate: [
    // Layer 0: wide lower hull
    [
      "....kkkkkkkkkkkk....",
      "..kkddddddddddddkk..",
      ".kddddddddddddddddk.",
      "kddddddddddddddddddk",
      "kddddddddddddddddddk",
      ".kddddddddddddddddk.",
      "..kkddddddddddddkk..",
      "....kkkkkkkkkkkk....",
      "....................",
      "....................",
    ],
    // Layer 1: main armored deck with orange side thrusters
    [
      "....kkkkkkkkkkkk....",
      "..kdmllllllllllmdk..",
      ".kdmllmmmmmmmmllmdk.",
      "kaamdddddRRdddddmaak",
      "kaamdddddRRdddddmaak",
      ".kdmddddddddddddmdk.",
      "..kddmmmmmmmmmmddk..",
      "....kkddRRRRddkk....",
      ".......kkRRkk.......",
      "....................",
    ],
    // Layer 2: upper citadel & twin cannon mounts
    [
      "....................",
      ".....kkkkkkkkkk.....",
      "....kdmllllllmdk....",
      "....kdmdRRRRdmdk....",
      "....kdmdRwwRdmdk....",
      "....kddmddddmddk....",
      ".....kkddddddkk.....",
      ".......kddddk.......",
      "........kRRk........",
      "........kkkk........",
    ],
    // Layer 3: dorsal turret cap
    [
      "....................",
      "....................",
      ".......kkkkkk.......",
      "......kllwwllk......",
      "......kddRRddk......",
      ".......kkkkkk.......",
      "....................",
      "....................",
      "....................",
      "....................",
    ],
  ],
  shield: [
    // Layer 0: chassis
    [
      "....kkkkkkkk....",
      "..kkddddddddkk..",
      ".kddddddddddddk.",
      ".kddddddddddddk.",
      "..kddddddddddk..",
      "...kddddddddk...",
      "....kkkkkkkk....",
      "................",
    ],
    // Layer 1: upper armor + cyan phase emitters
    [
      "...kdmllllmdk...",
      "..kdmllssllmdk..",
      ".kssddddddddssk.",
      ".kssdddRRdddssk.",
      "..kddddRRddddk..",
      "...kkddddddkk...",
      ".....kk..kk.....",
      "................",
    ],
    // Layer 2: front phase barrier projection
    [
      "................",
      "................",
      "................",
      "................",
      "................",
      "..ssssssssssss..",
      ".ss..wwwwww..ss.",
      "s..............s",
    ],
  ],
  relay: [
    // Layer 0: core pod
    [
      ".....kkkkkk.....",
      "...kkddddddkk...",
      "..kddddddddddk..",
      "..kddddddddddk..",
      "...kkddddddkk...",
      ".....kkkkkk.....",
      "................",
      "................",
    ],
    // Layer 1: purple magnet ring (shared with player magnet form!)
    [
      "....kkkkkkkk....",
      "..kkppppppppkk..",
      ".kppddddddddppk.",
      ".kpddRRwwRRddpk.",
      ".kppddddddddppk.",
      "..kkppppppppkk..",
      "....kkkkkkkk....",
      "................",
    ],
    // Layer 2: dorsal spire
    [
      "................",
      "......kkkk......",
      ".....kpwwpk.....",
      ".....kpRRpk.....",
      "......kppk......",
      ".......kk.......",
      "................",
      "................",
    ],
  ],
};

function ensureEnemySliceTex(scene, key, grid) {
  if (scene.textures.exists(key)) return key;
  const h = grid.length;
  const w = grid[0]?.length || 16;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y += 1) {
    const row = grid[y];
    for (let x = 0; x < w; x += 1) {
      const color = PIXEL_PALETTE[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

const ENEMY_SIZE_SCALE = Object.freeze({
  scout: 0.78,
  striker: 1.0,
  relay: 1.24,
  shield: 1.32,
  frigate: 1.62,
});

export class EnemyStacker {
  constructor(scene) {
    this.scene = scene;
    this.sliceKeys = {};
    for (const [type, layers] of Object.entries(ENEMY_STACK_DEFS)) {
      this.sliceKeys[type] = layers.map((grid, idx) =>
        ensureEnemySliceTex(scene, `px-estack-${type}-${idx}`, grid)
      );
    }
    this.instances = new Map(); // enemyId -> Image[]
  }

  sync(enemies, depthScaleFn) {
    const aliveIds = new Set(enemies.map((e) => e.id));
    for (const [id, imgs] of this.instances.entries()) {
      if (!aliveIds.has(id)) {
        for (const img of imgs) img.destroy();
        this.instances.delete(id);
      }
    }

    for (const e of enemies) {
      const keys = this.sliceKeys[e.type] || this.sliceKeys.scout;
      let imgs = this.instances.get(e.id);
      if (!imgs) {
        imgs = keys.map((k, idx) =>
          this.scene.add.image(e.x, e.y, k).setDepth(15 + idx * 0.1)
        );
        this.instances.set(e.id, imgs);
      }

      const scale = depthScaleFn(e.y) * (ENEMY_SIZE_SCALE[e.type] || 1.0);
      const layerGap = Math.max(1.5, scale * 1.15);
      const rx = Math.round(e.x);
      const ry = Math.round(e.y);
      const roll = Math.max(-0.22, Math.min(0.22, (e.vx || 0) * 0.0015));

      for (let i = 0; i < imgs.length; i += 1) {
        const img = imgs[i];
        img
          .setPosition(rx + Math.round(roll * i * 4), Math.round(ry - i * layerGap))
          .setScale(scale)
          .setRotation(roll * 0.6);
        if (e.hitFlashMs > 0) img.setTintFill(0xf4f8ff);
        else img.clearTint();
      }
    }
  }

  destroy() {
    for (const imgs of this.instances.values()) {
      for (const img of imgs) img.destroy();
    }
    this.instances.clear();
  }
}
