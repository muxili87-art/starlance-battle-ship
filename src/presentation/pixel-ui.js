import { PIXEL_PALETTE } from "./pixel-sprites.js";

/**
 * Authentic Pixel-Art UI Frame & Icon Generator (NEAREST-filtered native pixel grids).
 * Replaces flat vector boxes with stepped-corner metallic pixel bezels, corner rivets,
 * scanline inner screens, and 12x12 pixel weapon/action icons.
 */

const ICON_GRIDS = {
  pulse: [
    ".....cc.....",
    "....cwwc....",
    "...ccwwcc...",
    "..cc....cc..",
    ".cc..ww..cc.",
    ".c..cwwc..c.",
    "....cwwc....",
    "...cc..cc...",
    "..cc....cc..",
    ".cc......cc.",
    ".c........c.",
    "............",
  ],
  heavy: [
    ".....kk.....",
    "....kaak....",
    "....kaak....",
    "...kwwwwk...",
    "...kaaaak...",
    "..kddddddk..",
    "..kdaaaadk..",
    "..kdaaaadk..",
    ".kkddddddkk.",
    ".kaa....aak.",
    "..kk....kk..",
    "............",
  ],
  magnet: [
    "...pppppp...",
    "..ppwwwwpp..",
    ".pp......pp.",
    ".p...ww...p.",
    ".p..pwwp..p.",
    ".p..pppp..p.",
    ".p...pp...p.",
    ".pp......pp.",
    "..pp....pp..",
    "...p....p...",
    "..pp....pp..",
    "............",
  ],
  skill: [
    "......yy....",
    ".....ywwy...",
    "....ywwy....",
    "...ywwy.....",
    "..ywwwwyy...",
    ".yyyywwy....",
    "....ywwy....",
    "...ywwy.....",
    "..ywwy......",
    ".ywwy.......",
    ".yy.........",
    "............",
  ],
  overload: [
    "....kkkk....",
    "...kwwwwk...",
    "..kwaaaawk..",
    "..kaaaaaak..",
    ".kawwaawwak.",
    ".kaaaaaaaak.",
    "..kaaaaaak..",
    "..kdaaaadk..",
    "...kdaaadk..",
    "....kaak....",
    "....kwwk....",
    ".....kk.....",
  ],
  ship: [
    "....kk....",
    "...kwwk...",
    "..kdlllk..",
    ".kdlccclk.",
    "kddmddmddk",
    "kdk.kk.kdk",
    ".k..aa..k.",
    "..........",
  ],
};

export function ensurePixelIcon(scene, id) {
  const key = `px-ui-icon-${id}`;
  if (scene.textures.exists(key)) return key;
  const grid = ICON_GRIDS[id] || ICON_GRIDS.pulse;
  const h = grid.length;
  const w = grid[0].length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const col = PIXEL_PALETTE[grid[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/**
 * Generates a crisp 2px-stepped pixel-art beveled metal panel texture.
 * Rendered at half resolution (w/2 x h/2) and scaled 2x with NEAREST for authentic 2px pixels!
 */
export function ensurePixelPanel(scene, key, w, h, { fill = "#0b1320", border = "#43cff4", lit = "#9bb4cc", shadow = "#070b12", active = false }) {
  const fullKey = `${key}-${fill}-${border}-${active ? 1 : 0}`;
  if (scene.textures.exists(fullKey)) return fullKey;

  const pw = Math.max(16, Math.round(w / 2));
  const ph = Math.max(12, Math.round(h / 2));
  const tex = scene.textures.createCanvas(fullKey, pw, ph);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  // Fill recessed screen area with stepped pixel corners (cut 2px)
  ctx.fillStyle = shadow;
  ctx.fillRect(2, 0, pw - 4, ph);
  ctx.fillRect(0, 2, pw, ph - 4);

  ctx.fillStyle = fill;
  ctx.fillRect(2, 1, pw - 4, ph - 2);
  ctx.fillRect(1, 2, pw - 2, ph - 4);

  // Subtle pixel scanlines inside panel
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let y = 3; y < ph - 3; y += 2) {
    ctx.fillRect(2, y, pw - 4, 1);
  }

  // Pixel-stepped metallic outer border + top/left bevel highlight
  ctx.fillStyle = border;
  ctx.fillRect(2, 0, pw - 4, 1); // top
  ctx.fillRect(2, ph - 1, pw - 4, 1); // bottom
  ctx.fillRect(0, 2, 1, ph - 4); // left
  ctx.fillRect(pw - 1, 2, 1, ph - 4); // right
  // Corner pixels
  ctx.fillRect(1, 1, 1, 1);
  ctx.fillRect(pw - 2, 1, 1, 1);
  ctx.fillRect(1, ph - 2, 1, 1);
  ctx.fillRect(pw - 2, ph - 2, 1, 1);

  // Top inner bevel glint & corner pixel rivets
  ctx.fillStyle = active ? "#eef6ff" : lit;
  ctx.fillRect(3, 1, pw - 6, 1);
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(pw - 3, 2, 1, 1);
  ctx.fillRect(2, ph - 3, 1, 1);
  ctx.fillRect(pw - 3, ph - 3, 1, 1);

  // Active left LED indicator strip
  if (active) {
    ctx.fillStyle = border;
    ctx.fillRect(1, 4, 2, ph - 8);
  }

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return fullKey;
}

/**
 * Generates a crisp 72x48 pixel-art shaded ringed gas giant with dithered cloud bands,
 * terminator shadow, and front/back planetary rings.
 */
export function ensurePixelPlanet(scene, key = "px-gas-giant", frameIdx = 0) {
  const fullKey = frameIdx ? `${key}-f${frameIdx}` : key;
  if (scene.textures.exists(fullKey)) return fullKey;
  const w = 72;
  const h = 48;
  const cx = 36;
  const cy = 24;
  const r = 16;
  const tex = scene.textures.createCanvas(fullKey, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  // Back ring half (behind planet)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const rx = (x - cx) / 31;
      const ry = (y - (cy + 1)) / 6.5;
      const d = Math.hypot(rx, ry);
      if (d >= 0.72 && d <= 1.0 && y <= cy) {
        const glint = ((x + frameIdx * 5) % 13 === 0) ? "#eef6ff" : null;
        const ringTone = glint || (d > 0.88 ? "#43cff4" : d > 0.8 ? "#285a7a" : "#7ee7ff");
        ctx.fillStyle = ringTone;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Planet sphere with scrolling pixel-dithered atmospheric bands + upper-left lighting
  for (let y = cy - r; y <= cy + r; y += 1) {
    for (let x = cx - r; x <= cx + r; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r * r) continue;

      const light = (-dx * 0.65 - dy * 0.65) / r; // +1 upper-left, -1 bottom-right
      const dither = ((x & 1) ^ (y & 1)) * 0.22;
      const band = Math.sin((y - cy) * 0.55 + (x + frameIdx * 4) * 0.14) * 0.17;
      const lum = light + band - dither;

      if (lum > 0.55) ctx.fillStyle = "#9be8ff";
      else if (lum > 0.2) ctx.fillStyle = "#43a4d4";
      else if (lum > -0.15) ctx.fillStyle = "#245785";
      else if (lum > -0.5) ctx.fillStyle = "#152f4d";
      else ctx.fillStyle = "#0b1626";
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Front ring half (in front of planet)
  for (let y = cy + 1; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const rx = (x - cx) / 31;
      const ry = (y - (cy + 1)) / 6.5;
      const d = Math.hypot(rx, ry);
      if (d >= 0.72 && d <= 1.0) {
        const glint = ((x - frameIdx * 5 + 72) % 13 === 0) ? "#eef6ff" : null;
        const ringTone = glint || (d > 0.88 ? "#43cff4" : d > 0.8 ? "#2d6f96" : "#9be8ff");
        ctx.fillStyle = ringTone;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return fullKey;
}


const POD_GRIDS = {
  crit: [
    "......kkkk......",
    ".....kcwwck.....",
    "....kccwwcck....",
    "...kdlccccdk....",
    "..kdllwwwwlldk..",
    ".kdlccwwwwccldk.",
    "kdlccwccccwccldk",
    "kdmccwccccwccmdk",
    "kdmddccccccddmdk",
    ".kddddccccddddk.",
    "..kddddccddddk..",
    "...kddkcckddk...",
    "....kk.cc.kk....",
    ".......ww.......",
    "................",
    "................",
  ],
  missile: [
    "......kkkk......",
    ".....kawwak.....",
    "....kaaaaaak....",
    "...kddwwwwddk...",
    "..kdlmaaaamldk..",
    ".kdlmawwwwamldk.",
    "kddmawaaaawamddk",
    "kddmaaaaaaaamddk",
    "kddmddaaaaddmddk",
    ".kddddaaaaddddk.",
    "..kdddaaaadddk..",
    "...kddkddkddk...",
    "....kk.aa.kk....",
    ".......yy.......",
    "................",
    "................",
  ],
  swarm: [
    "....kkkkkkkk....",
    "...kppppppppk...",
    "..kpwwppppwwpk..",
    ".kpwddppppddwpk.",
    "kpddppwwwwppddpk",
    "kpddpwccccwpddpk",
    "kpmmpwccccwpmmpk",
    "kpmmppwwwwppmmpk",
    ".kdmppppppppmdk.",
    "..kdmppppppmdk..",
    "...kddddddddk...",
    "....kddppddk....",
    ".....kkppkk.....",
    ".......ww.......",
    "................",
    "................",
  ],
};

export function ensurePixelPodSprite(scene, route = "crit") {
  const id = POD_GRIDS[route] ? route : "crit";
  const key = `px-pod-${id}`;
  if (scene.textures.exists(key)) return key;
  const grid = POD_GRIDS[id];
  const h = grid.length;
  const w = grid[0].length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const col = PIXEL_PALETTE[grid[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/**
 * Organic 64x64 pixel-dithered Ion Nebula Storm cloud (swirling irregular silhouette, zero plain circle).
 */
export function ensurePixelNebula(scene, key = "px-ion-nebula") {
  if (scene.textures.exists(key)) return key;
  const size = 64;
  const cx = 32;
  const cy = 32;
  const tex = scene.textures.createCanvas(key, size, size);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const ang = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      // Swirling multi-lobe organic cloud boundary
      const swirl = Math.sin(ang * 3 + dist * 0.18) * 5 + Math.cos(ang * 2 - dist * 0.12) * 4;
      const norm = (dist + swirl) / 28;
      if (norm > 1.0) continue;

      const dither = ((x & 1) ^ (y & 1)) * 0.22 + ((x & 2) ? 0.08 : 0);
      const density = 1 - norm - dither;
      if (density < 0.04) continue;

      if (density > 0.62) ctx.fillStyle = "rgba(126, 231, 255, 0.45)";
      else if (density > 0.36) ctx.fillStyle = "rgba(176, 124, 255, 0.38)";
      else ctx.fillStyle = "rgba(92, 54, 158, 0.28)";
      ctx.fillRect(x, y, 1, 1);
    }
  }

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

/**
 * 20x20 pixel-dithered cratered moon.
 */
export function ensurePixelMoon(scene, key = "px-moon") {
  if (scene.textures.exists(key)) return key;
  const s = 20;
  const c = 10;
  const r = 8;
  const tex = scene.textures.createCanvas(key, s, s);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const dx = x - c;
      const dy = y - c;
      if (dx * dx + dy * dy > r * r) continue;
      const light = (-dx * 0.7 - dy * 0.7) / r;
      const dither = ((x & 1) ^ (y & 1)) * 0.18;
      const lum = light - dither;
      if (lum > 0.45) ctx.fillStyle = "#c9dcf0";
      else if (lum > 0.05) ctx.fillStyle = "#7c97b5";
      else if (lum > -0.35) ctx.fillStyle = "#455e7a";
      else ctx.fillStyle = "#1d2b3d";
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Craters
  ctx.fillStyle = "#2b3e55";
  ctx.fillRect(7, 7, 3, 2);
  ctx.fillRect(12, 11, 2, 2);

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

const BOSS_HULL_GRID = [
  "...........................kkkkkkkk...........................",
  "..........................krrrrrrrrk..........................",
  ".........................krRRRRRRRRrk.........................",
  "........................krRRwwwwwwRRrk........................",
  ".......................kddRRRRRRRRRRddk.......................",
  "......................kddmddddddddddmddk......................",
  "....kkkk.............kddmddddRRRRddddmddk.............kkkk....",
  "...kRRRRk...........kdmdddrrRRRRRRrrdddmmdk..........kRRRRk...",
  "..krRRRRrk.........kdmdddrRRwwwwwwRRrdddmdk.........krRRRRrk..",
  ".kddRRRRddk.......kdmddddrRRRRRRRRRRrddddmdk.......kddRRRRddk.",
  "kdmddRRddmdk.....kdlmddddddddRRRRddddddddmlmk.....kdmddRRddmdk",
  "kdmmdddddmmdkkkkkdlmddddddddddddddddddddddmlmkkkkkdmmdddddmmdk",
  "kdlmmddddddddmmmmmmddddddddddddddddddddddddmmmmmmddddddddmmlmk",
  ".kdlmddddddmddddddddddddddddddddddddddddddddddddddmddddddmlmk.",
  "..kddmdddddmddddddddkddddddddddddddddddddkddddddddmddddddmdk..",
  "...kdddddddddkdddddk..kddddddddddddddddk..kdddddkdddddddddk...",
  "....kdddddddk..kkk.....kdddkddddddkdddk.....kkk..kdddddddk....",
  ".....kdddddk............kdk..kkkk..kdk............kdddddk.....",
  "......kaaaak..................kk..................kaaaak......",
  "......kwwwwk......................................kwwwwk......",
  ".......kkkk........................................kkkk.......",
];

const BOSS_TURRET_GRID = [
  "....kkkkkk....",
  "...kllllllk...",
  "..kdmmwwmmdk..",
  ".kdmdRRRRdmdk.",
  ".kdmdRyyRdmdk.",
  ".kddddddddddk.",
  "..kddmmmmddk..",
  "...kdaaaadk...",
  "...kdawwadk...",
  "...kdaaaadk...",
  "....ka..ak....",
  "....ky..yk....",
  "....kk..kk....",
  "..............",
];

export function ensurePixelBossAssets(scene) {
  const hullKey = "px-boss-hull";
  if (!scene.textures.exists(hullKey)) {
    const h = BOSS_HULL_GRID.length;
    const w = BOSS_HULL_GRID[0].length;
    const tex = scene.textures.createCanvas(hullKey, w, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y += 1) {
      const row = BOSS_HULL_GRID[y];
      for (let x = 0; x < w; x += 1) {
        const col = PIXEL_PALETTE[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  const turretKey = "px-boss-turret";
  if (!scene.textures.exists(turretKey)) {
    const h = BOSS_TURRET_GRID.length;
    const w = BOSS_TURRET_GRID[0].length;
    const tex = scene.textures.createCanvas(turretKey, w, h);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y += 1) {
      const row = BOSS_TURRET_GRID[y];
      for (let x = 0; x < w; x += 1) {
        const col = PIXEL_PALETTE[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return { hullKey, turretKey };
}

/**
 * High-detail 96x44 Pixel-Art Frontal/3D Starfighter Boss for First-Person Cockpit View
 * (No flat giant triangles — stepped armored wings, twin intakes, dorsal fin, & wingtip pods)
 */
export function ensurePixelFpBossSprite(scene) {
  const key = "px-fp-boss";
  if (scene.textures.exists(key)) return key;
  const w = 96;
  const h = 44;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;

  const px = (x, y, rw, rh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));
  };

  // Dorsal twin stabilizer fins
  px(44, 2, 8, 12, "#1c273a");
  px(46, 3, 4, 10, "#47607d");
  px(47, 1, 2, 4, "#ff4b5c");

  // Stepped armored swept wings (left & right mirrored)
  for (let i = 0; i < 16; i += 1) {
    const wy = 14 + Math.floor(i * 0.7);
    const span = 12 + i * 2;
    const thick = Math.max(4, 10 - Math.floor(i / 3));
    px(48 - span, wy, 4, thick, "#090f18");
    px(48 - span + 1, wy + 1, 3, thick - 2, i > 11 ? "#ff4b5c" : "#25354d");
    px(48 + span - 4, wy, 4, thick, "#090f18");
    px(48 + span - 4, wy + 1, 3, thick - 2, i > 11 ? "#ff4b5c" : "#25354d");
  }
  // Inner wing armor plates & panel bevels
  px(14, 18, 68, 9, "#162133");
  px(18, 19, 60, 6, "#2c3f59");
  px(22, 20, 52, 2, "#6c87a6");

  // Wingtip heavy weapon pods (x=6..14 and x=82..90)
  for (const wx of [6, 82]) {
    px(wx, 17, 8, 16, "#090f18");
    px(wx + 1, 18, 6, 14, "#2b3e55");
    px(wx + 2, 19, 4, 4, "#ff8c3a");
    px(wx + 2, 28, 4, 5, "#ff4b5c");
  }

  // Twin armored engine intakes flanking central hull
  for (const ix of [30, 58]) {
    px(ix, 14, 8, 16, "#0b111c");
    px(ix + 1, 15, 6, 14, "#314661");
    px(ix + 2, 18, 4, 8, "#ff4b5c");
    px(ix + 3, 20, 2, 4, "#ffd166");
  }

  // Central armored fuselage & forward arrowhead nosecone
  px(38, 11, 20, 22, "#0b111c");
  px(39, 12, 18, 20, "#23344a");
  px(41, 13, 14, 4, "#8aa6c4");
  // Stepped lower prow
  px(42, 31, 12, 6, "#182436");
  px(44, 35, 8, 4, "#47607d");
  px(46, 38, 4, 3, "#ff4b5c");

  // Central glowing reactor housing
  px(43, 18, 10, 10, "#090f18");
  px(44, 19, 8, 8, "#ff4b5c");
  px(46, 21, 4, 4, "#ffffff");

  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
