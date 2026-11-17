/**
 * High-craft 32x32 pixel-art fighter (flat / bankL / bankR) & 16x16-24x24 enemy sprites.
 * Follows AgentBase pixel-techniques.md:
 * - Controlled diagonal step lengths (1, 2, 2, 2)
 * - Lit vs shadowed outline colors
 * - Polished metal bevel highlights & specular glass cockpit
 * - Distinct primary silhouettes per enemy class
 */

export const PIXEL_PALETTE = Object.freeze({
  ".": null,
  "k": "#101722", // deep shadow outline
  "o": "#1d2b3d", // mid shadow outline
  "d": "#2b3e55", // dark slate armor
  "m": "#4e6985", // mid slate armor
  "l": "#9bb4cc", // light bevel armor
  "w": "#eef6ff", // specular white highlight
  "c": "#43cff4", // cyan cockpit / energy
  "C": "#1c7a9c", // dark cyan cockpit shade
  "a": "#ff8c3a", // orange wing accent
  "r": "#a8293b", // enemy dark crimson
  "R": "#eb4b62", // enemy bright crimson
  "y": "#ffd166", // amber core / sensor
  "p": "#b07cff", // drone purple
  "s": "#62e6ff", // shield energy
});

// 32x32 Player Interceptor (symmetric, sharp nose, swept wings, twin engine pods, beveled armor)
const PLAYER_FLAT_32 = [
  "...............kk...............",
  "..............kllk..............",
  "..............klwk..............",
  ".............kdlwdk.............",
  ".............kdmwdk.............",
  "............kodmmldk............",
  "............kodCCldk............",
  "...........kddCcclddk...........",
  "...........kdmcwwcmdk...........",
  "..........kodmccccmdok..........",
  "..........kddmCCCCmddk..........",
  ".........kdddmllllmdddk.........",
  "........kodddmddddmdddok........",
  ".......kodlmddddddddmldok.......",
  "......kodllmdmddddmdmlldok......",
  ".....kodlwmddmdwwdmddmwldok.....",
  "....kodlwmdddmdllmdmddmwldok....",
  "...kodlwmddddmddddmddddmwldok...",
  "..kdaamddddddmddddmddddddmaadk..",
  ".kdaamdddkdddmddddmdddkdddmaddk.",
  ".kddmdddk.kddmddddmddk.kddmdddk.",
  "kodmdddk..kodmddddmdok..kddmddok",
  "kdmdddk...kddmddddmddk...kddmddk",
  "kddddk....kdd.kddk.ddk....kddddk",
  "kdddk.....kod.kddk.dok.....kdddk",
  "kodk......kdd..kk..ddk......kdok",
  ".kk.......kaa......aak.......kk.",
  "..........kww......wwk..........",
  "..........kcc......cck..........",
  "...........kk......kk...........",
  "................................",
  "................................",
];

// Bank Left (compressed left wing, exposed right armor bevel)
const PLAYER_BANK_L_32 = [
  "...............kk...............",
  "..............kllk..............",
  "..............klwk..............",
  ".............kdlwdk.............",
  ".............kdmwdk.............",
  "............kodmldk.............",
  "............kodCCldk............",
  "...........kddCccldk............",
  "...........kdmcwwcmdk...........",
  "..........kodmccccmdk...........",
  "..........kddmCCCCmddk..........",
  ".........kdddmllllmddk..........",
  "........kodddmddddmdddok........",
  ".......kodlmddddddddmldok.......",
  "......kodllmdmddddmdmlldok......",
  ".....kodlwmddmdwwdmddmwldok.....",
  "....kodlwmdddmdllmdmddmwldok....",
  "...kodlwmddddmddddmddddmwldk....",
  "..kdaamddddddmddddmdddddmadk....",
  ".kdaamddk.kddmddddmdddkddmadk...",
  ".kddmddk..kddmddddmddk.kddmdk...",
  "kodmddk...kodmddddmdok..kddmok..",
  "kdmddk....kddmddddmddk...kddmk..",
  "kdddk.....kdd.kddk.ddk....kddk..",
  "kodk......kod.kddk.dok.....kdk..",
  ".kk.......kdd..kk..ddk......kk..",
  "..........kaa......aak..........",
  "..........kww......wwk..........",
  "..........kcc......cck..........",
  "...........kk......kk...........",
  "................................",
  "................................",
];

const PLAYER_BANK_R_32 = PLAYER_BANK_L_32.map((row) => row.split("").reverse().join(""));

const ENEMY_GRIDS = {
  // 16x16 Scout: sharp needle interceptor
  "enemy.scout": [
    ".......kk.......",
    "......kRRk......",
    "......krRk......",
    ".....kdrRdk.....",
    ".....kdrrdk.....",
    "....kddRRddk....",
    "...kRddrrddRk...",
    "..kRRddyyddRRk..",
    ".kRddddrrddddRk.",
    ".kddddddddddddk.",
    "..kkdkkkkkkdkk..",
    "....k......k....",
    "................",
    "................",
    "................",
    "................",
  ],
  // 16x16 Striker: twin-prong assault craft
  "enemy.striker": [
    "..kk........kk..",
    ".kRRk......kRRk.",
    ".krrk......krrk.",
    ".kdrdk....kdrdk.",
    ".kdrrdk..kdrrdk.",
    "..kdrRdkkdRrrdk.",
    "..kddRRRRRRddk..",
    "...kdddyydddk...",
    "...kdddRRdddk...",
    "....kddddddk....",
    "....kk.kk.kk....",
    "......kRRk......",
    "......kkkk......",
    "................",
    "................",
    "................",
  ],
  // 20x16 Frigate: broad armored heavy cruiser
  "enemy.frigate": [
    ".....kkkkkkkkkk.....",
    "...kkdmmmmmmmmddkk..",
    "..kdmllllllllllmdk..",
    ".kddmdddRRRRdddmdkk.",
    "kdddmddrrRRrrddmdddk",
    "kRRdmddrrwwrrddmdRRk",
    "kdddmddddyyddddmdddk",
    ".kddmddddddddddmddk.",
    "..kkddddddddddddkk..",
    "....kk.kddddk.kk....",
    ".......kdRRdk.......",
    ".......kkkkkk.......",
  ],
  // 16x14 Shield: front arc barrier carrier
  "enemy.shield": [
    "..ssssssssssss..",
    ".ss..........ss.",
    "s...kkkkkkkk...s",
    "...kdmmmmmmdd...",
    "..kdmssssssmdk..",
    "..kdmrrrrrrmdk..",
    "..kdddRRRRdddk..",
    "...kkddddddkk...",
    ".....k.kk.k.....",
    "................",
  ],
  // 16x14 Relay: ring antenna elite carrier (drops hot-swap modules!)
  "enemy.relay": [
    ".....kkkkkk.....",
    "..kkkyyyyyykkk..",
    ".kyyyddddddyyyk.",
    ".kyddrRRRRrddyk.",
    ".kyddRccwwRddyk.",
    ".kyddrRRRRrddyk.",
    "..kkkddddddkkk..",
    ".....kk..kk.....",
    "................",
  ],
};

const DRONE_GRID = [
  "......kk......",
  ".....kllk.....",
  "....kdmmdk....",
  "...kdpwwpdk...",
  "..kdpccccpdk..",
  ".kdpccccccpdk.",
  "kddpddddddpddk",
  "kpdk.kddk.kdpk",
  "kk...kppk...kk",
  ".....kwwk.....",
  "......kk......",
];

const CORE_SHELL_GRID = [
  "......kkkkkkkkkkkk......",
  "....kkddddddddddddkk....",
  "...kdmmmmmmmmmmmmmmdd...",
  "..kdmllllllllllllllmdk..",
  ".kdmlddddddddddddddlmdk.",
  ".kdmldd..........ddlmdk.",
  "kdmldd............ddlmdd",
  "kdmld..............dlmdd",
  "kdmld..............dlmdd",
  "kdmld..............dlmdd",
  "kdmld..............dlmdd",
  "kdmld..............dlmdd",
  "kdmld..............dlmdd",
  "kdmldd............ddlmdd",
  ".kdmldd..........ddlmdk.",
  ".kdmlddddddddddddddlmdk.",
  "..kdmllllllllllllllmdk..",
  "...kdmmmmmmmmmmmmmmdd...",
  "....kkddddddddddddkk....",
  "......kkkkkkkkkkkk......",
];

function createCanvasTexture(scene, key, grid) {
  if (scene.textures.exists(key)) return;
  const h = grid.length;
  const w = grid[0]?.length || 1;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < h; y += 1) {
    const row = grid[y];
    for (let x = 0; x < w; x += 1) {
      const ch = row[x];
      const color = PIXEL_PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function registerAllPixelSprites(scene) {
  createCanvasTexture(scene, "px-player-flat", PLAYER_FLAT_32);
  createCanvasTexture(scene, "px-player-bank-l", PLAYER_BANK_L_32);
  createCanvasTexture(scene, "px-player-bank-r", PLAYER_BANK_R_32);
  createCanvasTexture(scene, "px-drone", DRONE_GRID);
  createCanvasTexture(scene, "px-core-shell", CORE_SHELL_GRID);

  for (const [id, grid] of Object.entries(ENEMY_GRIDS)) {
    const key = `px-${id.replace(".", "-")}`;
    createCanvasTexture(scene, key, grid);
  }
}
