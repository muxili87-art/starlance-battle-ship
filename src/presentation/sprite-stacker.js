import { PIXEL_PALETTE } from "./pixel-sprites.js";

/**
 * 6-Layer 32x32 Sprite Stacking Renderer (per AgentBase pixel-sprite-stacking.md).
 * - Layers 0..3: Shared base interceptor hull (belly -> wings -> fuselage -> cockpit)
 * - Layers 4..5: Swappable Form Armor slices ("pulse" / "heavy" / "magnet")
 * Renders bottom-to-top with vertical layer offset & yaw/roll tilt for genuine 2.5D volume.
 */

const CHASSIS_SLICES = {
  viper: [
    // Layer 0: Sharp delta arrowhead underbelly & twin thruster pods
    [
      "...............kk...............",
      "..............kllk..............",
      ".............kddddk.............",
      "............kddddddk............",
      "...........kddddddddk...........",
      "..........kddddddddddk..........",
      ".........kddddddddddddk.........",
      "........kddddddddddddddk........",
      ".......kddddddddddddddddk.......",
      "......kddddddddddddddddddk......",
      ".....kddddddddddddddddddddk.....",
      "....kddddddddddddddddddddddk....",
      "...kddddddddddddddddddddddddk...",
      "..kddddddddddddddddddddddddddk..",
      ".kddddddddddddddddddddddddddddk.",
      "..kdddddk.kddddddddddk.kdddddk..",
      "...kdddk...kddddddddk...kdddk...",
      "....kdk....kdd....ddk....kdk....",
      "...........kaa....aak...........",
      "...........kcc....cck...........",
      "............kk....kk............",
      "................................",
    ],
    // Layer 1: Razor delta arrowhead leading edge + swept main wings
    [
      "...............kk...............",
      "..............kwwk..............",
      ".............klwwlk.............",
      "............kdlmmldk............",
      "...........kdmmddmmdk...........",
      "..........kdmmddddmmdk..........",
      ".........kdlmddddddmlmk.........",
      "........kdlmddddddddmlmk........",
      ".......kdlmddddddddddmlmk.......",
      "......kdmmddddddddddddmmmk......",
      ".....kdmmddddddddddddddmmmk.....",
      "....kdlmddddddddddddddddmlmk....",
      "...kdlmddddddddddddddddddmlmk...",
      "..kdlmddddddddddddddddddddmlmk..",
      ".kodmdddddkdddmddddmdddkddddmdok",
      ".kdmdddk..kdddmddddmdddk..kddmdk",
      ".kdddk.....kdd.kddk.ddk.....kddk",
      "..kk.......kdd..kk..ddk.......kk",
      "...........kaa......aak.........",
      "...........kww......wwk.........",
      "............kk......kk..........",
      "................................",
    ],
    // Layer 2: Needle arrowhead dorsal ridge & central fuselage spine
    [
      "................................",
      "...............kk...............",
      "..............kwwk..............",
      ".............klwwlk.............",
      "............kdlllldk............",
      "............kdmllmdk............",
      "...........kodmllmdok...........",
      "..........kodmmddmmdok..........",
      ".........kddmmddddmmddk.........",
      "........kddmddddddddmddk........",
      "........kddmddddddddmddk........",
      ".........kddmddddddmddk.........",
      "..........kddmddddmddk..........",
      "...........kddmddmddk...........",
      "............kddmmddk............",
      ".............kddddk.............",
      "..............kcck..............",
      "...............kk...............",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 3: Recessed needle glass canopy behind the sharp arrowhead nose
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "...............kk...............",
      "..............kCCk..............",
      ".............kCcwcCk............",
      ".............kCcccCk............",
      ".............kCcccCk............",
      "..............kCCCk.............",
      "..............kCCk..............",
      "...............kk...............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
  r9: [
    // Layer 0: Broad armored gunship hull & heavy twin engine blocks (R-Type R-9 style)
    [
      "................................",
      "............kkkkkkkk............",
      "...........kddddddddk...........",
      "..........kddddddddddk..........",
      ".........kddddddddddddk.........",
      "........kddddddddddddddk........",
      ".......kddddddddddddddddk.......",
      "......kddddddddddddddddddk......",
      ".....kddddddddddddddddddddk.....",
      "....kddddddddddddddddddddddk....",
      "...kddddddddddddddddddddddddk...",
      "...kddddddddddddddddddddddddk...",
      "...kddddddddddddddddddddddddk...",
      "....kddddddddddddddddddddddk....",
      ".....kddddddddddddddddddddk.....",
      "......kddddddddddddddddddk......",
      ".......kdddddk....kdddddk.......",
      ".......kddddk......kddddk.......",
      ".......kaaaak......kaaaak.......",
      ".......kcccck......kcccck.......",
      "........kkkk........kkkk........",
      "................................",
    ],
    // Layer 1: Wide industrial trapezoidal gunship wings + shoulder hardpoints
    [
      "............kkkkkkkk............",
      "...........kllllllllk...........",
      "..........kdlmmmmmmldk..........",
      ".........kdmmddddddmmdk.........",
      ".......kkdmmddddddddmmdkk.......",
      "......kaadmddddddddddmdaaak.....",
      ".....kdmddddddddddddddddmdk.....",
      "....kdlmddddddddddddddddmlk.....",
      "...kdlmddddddddddddddddddmlk....",
      "..kdlmddddddddddddddddddddmlk...",
      ".kdlmddddddddddddddddddddddmlk..",
      ".kdmdddddkdddmddddmdddkddddmdk..",
      ".koddddk.kdddmddddmdddk.kdddok..",
      "..kdddk..kdddmddddmdddk..kddk...",
      "...kkk....kdd.kddk.ddk....kk....",
      "..........kdd..kk..ddk..........",
      "..........kww......wwk..........",
      "...........kk......kk...........",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 2: Heavy armored dorsal spine & shoulder intake vents
    [
      "................................",
      ".............kkkkkk.............",
      "............kllllllk............",
      "...........kdlwwwwldk...........",
      "..........kodmllllmdok..........",
      ".........kodmmllllmmdok.........",
      "........kodmmddddddmmdok........",
      "........kddmddddddddmddk........",
      "........kddmddddddddmddk........",
      "........kddmddddddddmddk........",
      ".........kddmddddddmddk.........",
      "..........kddmddddmddk..........",
      "...........kddmddmddk...........",
      "............kddddddk............",
      ".............kddddk.............",
      "..............kcck..............",
      "...............kk...............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 3: Prominent bulbous armored R-9 glass dome canopy
    [
      "................................",
      "................................",
      "..............kkkk..............",
      ".............kCCCCk.............",
      "............kCcwwcCk............",
      "...........kCcwwwccCk...........",
      "...........kCccccccCk...........",
      "...........kCccccccCk...........",
      "............kCCCCCCk............",
      ".............kCCCCk.............",
      "..............kkkk..............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
  aegis: [
    // Layer 0: Twin-hull heavy gunship underbelly & dual main thrusters
    [
      ".......kk..............kk.......",
      "......kddk............kddk......",
      ".....kddddk..........kddddk.....",
      "....kddddddk........kddddddk....",
      "....kdddddddk......kdddddddk....",
      "...kdddddddddkkkkkkdddddddddk...",
      "...kddddddddddddddddddddddddk...",
      "..kddddddddddddddddddddddddddk..",
      "..kddddddddddddddddddddddddddk..",
      ".kddddddddddddddddddddddddddddk.",
      ".kddddddddddddddddddddddddddddk.",
      ".kddddddddddddddddddddddddddddk.",
      "..kdddddkkdddddddddddkkddddddk..",
      "...kdddk..kdddddddddk..kdddk....",
      "....kdk...kdddddddddk...kdk.....",
      "..........kdd.....ddk...........",
      "..........kaa.....aak...........",
      "..........kcc.....cck...........",
      "...........kk.....kk............",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 1: Twin-prong armored prows + broad gunship wings
    [
      ".......kk..............kk.......",
      "......kwwk............kwwk......",
      ".....klmmlk..........klmmlk.....",
      "....kdlmmlkd........kdlmmlkd....",
      "....kdmddmdk........kdmddmdk....",
      "...kdmmddmmdkkkkkkkkdmmddmmdk...",
      "...kdlmddddddddddddddddddmlmk...",
      "..kdlmddddddddddddddddddddmlmk..",
      "..kdmmddddddddddddddddddddmmmk..",
      ".kodmdddddkddmddddmddkddddmdok..",
      ".kdmdddk..kddmddddmddk..kddmdk..",
      ".kdddk....kddmddddmddk....kddk..",
      "..kk......kdd.kddk.ddk......kk..",
      "..........kaa......aak..........",
      "..........kww......wwk..........",
      "...........kk......kk...........",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 2: Central armored dorsal bridge & twin wing sponsons
    [
      "................................",
      "......kook............kook......",
      ".....kdmmdk..........kdmmdk.....",
      ".....kdmmdk..........kdmmdk.....",
      "......kddk...kkkkkk...kddk......",
      "......kddk..kdlmmlkd..kddk......",
      ".......kk..kdmddddmdk..kk.......",
      "..........kodmmddmmdok..........",
      "..........kddmmddmmddk..........",
      "..........kddmddddmddk..........",
      "...........kddmddmddk...........",
      "...........kddddddddk...........",
      "............kddddddk............",
      ".............kcccck.............",
      "..............kkkk..............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 3: Wide armored gunship tactical visor
    [
      "................................",
      "................................",
      "................................",
      "................................",
      ".............kkkkkk.............",
      "............kCCCCCCk............",
      "...........kCCwwwCCCk...........",
      "...........kCccccccCk...........",
      "............kCCCCCCk............",
      ".............kkkkkk.............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
};

const FORM_ARMOR_SLICES = {
  pulse: [
    // Layer 4: Cyan forward light-blade winglets
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "........kk............kk........",
      ".......kcck..........kcck.......",
      "......kcwwck........kcwwck......",
      ".....kcwccwck......kcwccwck.....",
      "....kcck..kcck....kcck..kcck....",
      "...kcck....kcck..kcck....kcck...",
      "..kcck......kkkkkk......kcck....",
      ".kcck....................kcck...",
      "kcck......................kcck..",
      "kkk........................kkk..",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 5: Dorsal pulse fin
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "..............kcck..............",
      ".............kcwwck.............",
      ".............kcccck.............",
      "..............kcck..............",
      "..............kcck..............",
      "...............kk...............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
  heavy: [
    // Layer 4: Twin armored shoulder cannon pods (mounted directly on main wings y=10..17)
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".....kkkk..............kkkk.....",
      "....kaaaak............kaaaak....",
      "....kddddk............kddddk....",
      "....kmmmmk............kmmmmk....",
      "....kawwak............kawwak....",
      "....kddddk............kddddk....",
      "....kaaaak............kaaaak....",
      ".....kkkk..............kkkk.....",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 5: Heavy forward cannon barrels & dorsal ram plate
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".....kwwk..............kwwk.....",
      ".....kaak..............kaak.....",
      ".....kaak..............kaak.....",
      ".....kddk..............kddk.....",
      ".....kddk....kkkkkk....kddk.....",
      "............kaaaaaak............",
      "............kddddddk............",
      ".............kkkkkk.............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
  magnet: [
    // Layer 4: Outer wingtip twin arc-coil pylons (completely distinct silhouette from pulse blades)
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".kkkk......................kkkk.",
      "kpwwpk....................kpwwpk",
      "kpddpk....................kpddpk",
      "kppppk....................kppppk",
      "kpwwpk....................kpwwpk",
      "kppppk....................kppppk",
      ".kppk......................kppk.",
      "..kk........................kk..",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
    // Layer 5: Rear dorsal Tesla ring mounted behind cockpit (y=11..16, clear of canopy)
    [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      ".............kkkkkk.............",
      "............kpwwwwpk............",
      "...........kpwddddwpk...........",
      "...........kppddddppk...........",
      "............kppppppk............",
      ".............kkkkkk.............",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
    ],
  ],
};

function ensureSliceTexture(scene, key, grid) {
  if (scene.textures.exists(key)) return key;
  const h = grid.length;
  const w = grid[0]?.length || 32;
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

export class SpriteStackedFighter {
  constructor(scene, initialChassis = "viper") {
    this.scene = scene;
    this.chassisKeys = {};
    for (const [chassisId, slices] of Object.entries(CHASSIS_SLICES)) {
      this.chassisKeys[chassisId] = slices.map((grid, i) => ensureSliceTexture(scene, `px-stack-${chassisId}-${i}`, grid));
    }
    this.formKeys = {};
    for (const [formId, slices] of Object.entries(FORM_ARMOR_SLICES)) {
      this.formKeys[formId] = slices.map((grid, i) => ensureSliceTexture(scene, `px-stack-${formId}-${i}`, grid));
    }

    this.chassisId = this.chassisKeys[initialChassis] ? initialChassis : "viper";
    const startBase = this.chassisKeys[this.chassisId];
    this.layers = Array.from({ length: 6 }, (_, i) =>
      scene.add.image(360, 1040, i < 4 ? startBase[i] : this.formKeys.pulse[i - 4]).setScale(3.5).setDepth(20 + i * 0.1)
    );
    this.lastForm = "pulse";
    this.morphAnimMs = 0;
    this.hoverMs = 0;
    this.barrelRollMs = 0;
    this.diveFinisherMs = 0;
  }

  setChassis(chassisId) {
    const next = this.chassisKeys[chassisId] ? chassisId : "viper";
    if (next === this.chassisId) return;
    this.chassisId = next;
    const base = this.chassisKeys[next];
    for (let i = 0; i < 4; i += 1) {
      this.layers[i].setTexture(base[i]);
    }
    this.morphAnimMs = 200;
  }

  triggerBarrelRoll() {
    this.barrelRollMs = 360;
  }

  triggerDiveFinisher() {
    this.diveFinisherMs = 1050;
  }

  render(ship, activeForm, dtMs, recoilOffset = 0, chassisId = this.chassisId, evoTier = 1) {
    if (!ship || !ship.visible) {
      for (const l of this.layers) l.setVisible(false);
      return;
    }

    if (chassisId && chassisId !== this.chassisId) {
      this.setChassis(chassisId);
    }

    this.hoverMs += dtMs;
    if (this.barrelRollMs > 0) this.barrelRollMs = Math.max(0, this.barrelRollMs - dtMs);
    if (this.diveFinisherMs > 0) this.diveFinisherMs = Math.max(0, this.diveFinisherMs - dtMs);

    if (activeForm !== this.lastForm) {
      this.lastForm = activeForm;
      this.morphAnimMs = 240;
      const armor = this.formKeys[activeForm] || this.formKeys.pulse;
      this.layers[4].setTexture(armor[0]);
      this.layers[5].setTexture(armor[1]);
    }
    if (this.morphAnimMs > 0) {
      this.morphAnimMs = Math.max(0, this.morphAnimMs - dtMs);
    }

    // Post-overload 3rd-person barrel-roll dive-bombing trajectory (close flyby -> deep swoop -> return)!
    const diveProgress = this.diveFinisherMs > 0 ? 1 - this.diveFinisherMs / 1050 : 0;
    const diveArc = this.diveFinisherMs > 0 ? Math.sin(diveProgress * Math.PI) : 0;
    const diveYOffset = Math.round(-610 * diveArc);
    const flybyBoost = this.diveFinisherMs > 0 && diveProgress < 0.25 ? 0.38 * (1 - diveProgress / 0.25) : 0;
    const diveScaleFactor = 1 + flybyBoost - 0.42 * diveArc;

    const hoverBob = Math.round(Math.sin(this.hoverMs * 0.006) * 3);
    const bankDip = Math.round(Math.min(8, Math.abs(ship.vx || 0) * 0.006));
    const rx = Math.round(ship.x);
    const ry = Math.round(ship.y + recoilOffset + hoverBob + bankDip + diveYOffset);

    // Slanted flight heading: center flies straight, left/right lanes angle inward toward vanishing point!
    const laneLean = ((360 - ship.x) / 360) * 0.18;
    const steerYaw = Math.max(-0.24, Math.min(0.24, (ship.vx || 0) * 0.0002));
    const yaw = laneLean + steerYaw;

    // 360° Barrel Roll or 720° Dive Finisher Roll compresses X-scale smoothly like a 3D roll
    const rollPhase =
      this.diveFinisherMs > 0
        ? diveProgress * Math.PI * 4
        : (this.barrelRollMs / 360) * Math.PI * 2;
    const rollCos = this.diveFinisherMs > 0 || this.barrelRollMs > 0 ? Math.cos(rollPhase) : 1;
    const morphProgress = this.morphAnimMs / 240;

    const evoScale = evoTier >= 3 ? 1.16 : evoTier === 2 ? 1.08 : 1.0;
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];
      const popOffset = i >= 4 ? Math.round(morphProgress * -22) : 0;
      const lateralShift = Math.round(yaw * i * 5);
      const baseScale = (i >= 4 ? 3.5 + morphProgress * 0.7 : 3.5) * diveScaleFactor * evoScale;
      layer
        .setVisible(true)
        .setPosition(rx + lateralShift, ry - i * 4 * diveScaleFactor + popOffset)
        .setRotation(yaw * 0.75 + (this.diveFinisherMs > 0 ? Math.sin(rollPhase) * 0.25 : 0))
        .setScale(baseScale * Math.max(0.2, Math.abs(rollCos)), baseScale);
    }
  }

  destroy() {
    for (const l of this.layers) l.destroy();
  }
}
