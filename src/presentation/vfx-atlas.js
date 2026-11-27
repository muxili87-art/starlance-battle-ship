import Phaser from "phaser";

const PUFFS = [
  [[16, 16, 11], [9, 13, 6], [23, 14, 6], [14, 9, 6], [17, 23, 6]],
  [[16, 16, 10], [8, 18, 7], [24, 11, 6], [11, 9, 6], [22, 23, 6]],
  [[16, 16, 11], [10, 22, 7], [23, 18, 7], [16, 8, 7], [8, 12, 5]],
  [[16, 16, 9], [7, 15, 7], [25, 16, 7], [16, 7, 6], [16, 25, 6]],
];

export function ensureBoomTextures(scene) {
  const keys = [];
  for (let i = 0; i < PUFFS.length; i++) {
    const key = `px-boom-${i}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, 32, 32);
    const ctx = tex.getContext();
    const lobes = PUFFS[i];

    const fillLobes = (dr, color) => {
      ctx.fillStyle = color;
      for (const [cx, cy, r] of lobes) {
        const rr = Math.max(1, r + dr);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Classic 32-bit arcade fireball layering: dark outline -> crimson -> orange -> gold -> white core
    fillLobes(2, "#160710");
    fillLobes(0, "#e62e42");
    fillLobes(-2, "#ff7b1c");
    fillLobes(-4, "#ffd84d");
    fillLobes(-7, "#ffffff");

    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  return keys;
}
