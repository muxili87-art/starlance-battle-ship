const svg = (body) =>
  `<svg class="solo-px-svg" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;

const r = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

const UPGRADE_ICONS = {
  // 追踪导弹: twin-fin warhead + thruster flame
  missile: svg(
    r(10, 2, 3, 3, "#060912") +
      r(8, 3, 4, 4, "#060912") +
      r(6, 5, 5, 5, "#060912") +
      r(4, 7, 5, 5, "#060912") +
      r(11, 2, 2, 2, "#ff3552") +
      r(10, 3, 2, 2, "#ffd447") +
      r(8, 4, 3, 3, "#e4ecf7") +
      r(6, 6, 3, 3, "#c4d2e8") +
      r(9, 4, 1, 2, "#ffffff") +
      r(4, 5, 3, 2, "#38e4d4") +
      r(9, 10, 2, 3, "#38e4d4") +
      r(3, 10, 3, 3, "#ff8b2c") +
      r(2, 12, 2, 2, "#ffd447")
  ),
  // 环绕光刃: curved plasma crescent blade
  blade: svg(
    r(7, 1, 6, 3, "#060912") +
      r(10, 3, 4, 6, "#060912") +
      r(7, 8, 6, 4, "#060912") +
      r(4, 10, 5, 4, "#060912") +
      r(8, 2, 4, 2, "#38e4d4") +
      r(11, 4, 2, 5, "#38e4d4") +
      r(8, 9, 4, 2, "#38e4d4") +
      r(5, 11, 3, 2, "#7ea3d6") +
      r(9, 3, 2, 1, "#ffffff") +
      r(11, 5, 1, 4, "#ffffff") +
      r(3, 12, 2, 2, "#ffd447") +
      r(2, 13, 1, 1, "#ffffff")
  ),
  // 连锁电弧: jagged Tesla bolt + sparks
  relay: svg(
    r(7, 1, 5, 5, "#060912") +
      r(4, 5, 8, 4, "#060912") +
      r(5, 8, 6, 7, "#060912") +
      r(8, 2, 3, 2, "#ffd447") +
      r(7, 4, 3, 2, "#ffd447") +
      r(5, 6, 6, 2, "#fff2b2") +
      r(7, 8, 3, 3, "#ffd447") +
      r(6, 11, 2, 3, "#ff8b2c") +
      r(2, 4, 2, 2, "#38e4d4") +
      r(12, 9, 2, 2, "#38e4d4") +
      r(3, 10, 1, 1, "#ffffff")
  ),
  // 爆破副炮: ribbed ordnance shell + warhead tip
  bomb: svg(
    r(5, 1, 6, 14, "#060912") +
      r(3, 5, 10, 8, "#060912") +
      r(7, 2, 2, 2, "#ffd447") +
      r(6, 4, 4, 2, "#ff3552") +
      r(5, 6, 6, 5, "#7ea3d6") +
      r(6, 6, 2, 5, "#c4d2e8") +
      r(5, 8, 6, 1, "#384b6b") +
      r(4, 10, 2, 3, "#ff8b2c") +
      r(10, 10, 2, 3, "#ff8b2c") +
      r(6, 12, 4, 2, "#ff8b2c") +
      r(7, 13, 2, 2, "#ffd447")
  ),
  // 辅助机枪: twin-barrel rotary cannon + muzzle flash
  gun: svg(
    r(3, 5, 4, 10, "#060912") +
      r(9, 5, 4, 10, "#060912") +
      r(4, 6, 2, 7, "#7ea3d6") +
      r(10, 6, 2, 7, "#7ea3d6") +
      r(4, 6, 1, 7, "#e4ecf7") +
      r(10, 6, 1, 7, "#e4ecf7") +
      r(3, 11, 10, 3, "#384b6b") +
      r(4, 12, 8, 1, "#c4d2e8") +
      r(4, 2, 2, 3, "#ffd447") +
      r(10, 2, 2, 3, "#ffd447") +
      r(4, 1, 2, 1, "#ffffff") +
      r(10, 1, 2, 1, "#ffffff")
  ),
  // 擦弹反击飞弹: radar lock reticle + twin micro-missiles
  "擦弹反击飞弹": svg(
    r(2, 2, 12, 12, "#060912") +
      r(3, 3, 3, 1, "#38e4d4") +
      r(3, 3, 1, 3, "#38e4d4") +
      r(10, 3, 3, 1, "#38e4d4") +
      r(12, 3, 1, 3, "#38e4d4") +
      r(3, 12, 3, 1, "#38e4d4") +
      r(3, 10, 1, 3, "#38e4d4") +
      r(10, 12, 3, 1, "#38e4d4") +
      r(12, 10, 1, 3, "#38e4d4") +
      r(5, 5, 2, 5, "#e4ecf7") +
      r(9, 5, 2, 5, "#e4ecf7") +
      r(5, 4, 2, 1, "#ff3552") +
      r(9, 4, 2, 1, "#ff3552") +
      r(5, 10, 2, 2, "#ffd447") +
      r(9, 10, 2, 2, "#ffd447")
  ),
  // 棱镜分裂: crystalline prism splitting 1 beam into 3 rays
  "棱镜分裂": svg(
    r(5, 4, 6, 8, "#060912") +
      r(7, 5, 2, 6, "#38e4d4") +
      r(6, 6, 4, 4, "#9ef7ff") +
      r(7, 7, 2, 2, "#ffffff") +
      r(1, 7, 4, 2, "#ffd447") +
      r(11, 3, 4, 2, "#38e4d4") +
      r(11, 7, 4, 2, "#ffffff") +
      r(11, 11, 4, 2, "#ff5ce1")
  ),
  // 狂热连杀: blazing overdrive double chevron flame
  "狂热连杀": svg(
    r(3, 2, 10, 12, "#060912") +
      r(7, 2, 2, 3, "#ffd447") +
      r(5, 4, 6, 3, "#ff8b2c") +
      r(4, 7, 8, 4, "#ff3552") +
      r(6, 6, 4, 4, "#ffd447") +
      r(7, 8, 2, 3, "#ffffff") +
      r(3, 11, 3, 2, "#ff8b2c") +
      r(10, 11, 3, 2, "#ff8b2c") +
      r(6, 12, 4, 2, "#ffd447")
  ),
  // 应急电容: armored energy shield + capacitor core
  "应急电容": svg(
    r(2, 2, 12, 12, "#060912") +
      r(3, 3, 10, 7, "#3aa8ff") +
      r(4, 10, 8, 2, "#3aa8ff") +
      r(6, 12, 4, 2, "#1e73cc") +
      r(4, 4, 8, 5, "#152544") +
      r(7, 4, 2, 2, "#ffd447") +
      r(6, 6, 4, 1, "#fff2b2") +
      r(7, 7, 2, 3, "#ffd447") +
      r(3, 3, 2, 2, "#9de2ff")
  ),
  // 磁力超频: U-shaped magnet + cyan flux arcs
  "磁力超频": svg(
    r(3, 4, 10, 10, "#060912") +
      r(4, 5, 2, 3, "#c4d2e8") +
      r(10, 5, 2, 3, "#c4d2e8") +
      r(4, 8, 2, 4, "#ff3552") +
      r(10, 8, 2, 4, "#ff3552") +
      r(5, 11, 6, 2, "#ff3552") +
      r(6, 10, 4, 1, "#ffd447") +
      r(4, 2, 2, 2, "#38e4d4") +
      r(10, 2, 2, 2, "#38e4d4") +
      r(7, 1, 2, 2, "#9ef7ff")
  ),
};

const FALLBACK_UPGRADE_ICON = svg(
  r(3, 3, 10, 10, "#060912") +
    r(7, 2, 2, 12, "#ffd447") +
    r(2, 7, 12, 2, "#ffd447") +
    r(5, 5, 6, 6, "#38e4d4") +
    r(7, 7, 2, 2, "#ffffff")
);

const ACTION_ICONS = {
  resume: svg(
    r(4, 2, 2, 12, "currentColor") +
      r(6, 3, 2, 10, "currentColor") +
      r(8, 4, 2, 8, "currentColor") +
      r(10, 6, 2, 4, "currentColor") +
      r(12, 7, 1, 2, "currentColor")
  ),
  "sound-on": svg(
    r(2, 6, 3, 4, "currentColor") +
      r(5, 4, 2, 8, "currentColor") +
      r(7, 2, 2, 12, "currentColor") +
      r(11, 5, 1, 6, "#38e4d4") +
      r(13, 3, 1, 10, "#ffd447")
  ),
  "sound-off": svg(
    r(2, 6, 3, 4, "currentColor") +
      r(5, 4, 2, 8, "currentColor") +
      r(7, 2, 2, 12, "currentColor") +
      r(11, 5, 1, 1, "#ff3552") +
      r(14, 5, 1, 1, "#ff3552") +
      r(12, 6, 2, 4, "#ff3552") +
      r(11, 10, 1, 1, "#ff3552") +
      r(14, 10, 1, 1, "#ff3552")
  ),
  retry: svg(
    r(5, 2, 6, 2, "currentColor") +
      r(3, 4, 2, 6, "currentColor") +
      r(5, 10, 6, 2, "currentColor") +
      r(11, 6, 2, 4, "currentColor") +
      r(10, 2, 3, 3, "#ffd447") +
      r(12, 4, 2, 1, "#ffd447")
  ),
  hangar: svg(
    r(7, 2, 2, 2, "#38e4d4") +
      r(5, 4, 6, 2, "currentColor") +
      r(3, 6, 10, 2, "currentColor") +
      r(4, 8, 8, 5, "currentColor") +
      r(6, 10, 4, 3, "#060912")
  ),
  trophy: svg(
    r(4, 2, 8, 2, "#ffd447") +
      r(2, 3, 2, 4, "#ff8b2c") +
      r(12, 3, 2, 4, "#ff8b2c") +
      r(4, 4, 8, 4, "#ffd447") +
      r(5, 4, 2, 3, "#fff2b2") +
      r(6, 8, 4, 2, "#ff8b2c") +
      r(7, 10, 2, 2, "#ffd447") +
      r(4, 12, 8, 2, "#c4d2e8")
  ),
  lock: svg(
    r(5, 2, 6, 2, "currentColor") +
      r(4, 4, 2, 3, "currentColor") +
      r(10, 4, 2, 3, "currentColor") +
      r(3, 7, 10, 7, "currentColor") +
      r(7, 9, 2, 3, "#060912")
  ),
};

export function getUpgradeIconSvg(cardId) {
  return UPGRADE_ICONS[cardId] ?? FALLBACK_UPGRADE_ICON;
}

export function getActionIconSvg(name) {
  return ACTION_ICONS[name] ?? "";
}
