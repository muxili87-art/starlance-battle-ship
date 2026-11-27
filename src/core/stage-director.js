export const CAMPAIGN = [
  {
    name: "高空突围", boss: "boss_marshal", bossName: "拦截统帅", flagship: "medium_fortress",
    waves: [
      ["锋矢俯冲", "v", ["normal_light_fighter", "normal_scout", "normal_gunner"]],
      ["弧线突击", "arc", ["normal_interceptor", "normal_rusher", "normal_bomber"]],
      ["护盾推进", "escort", ["elite_shield", "normal_gunner", "elite_fighter"]],
      ["截获运输舰", "cargo", ["medium_transport", "normal_scout", "elite_missile"]],
      ["交叉封锁", "flank", ["elite_spread", "normal_interceptor", "normal_bomber"]],
    ],
  },
  {
    name: "钢铁防线", boss: "boss_citadel", bossName: "重装要塞", flagship: "medium_launcher",
    waves: [
      ["锋矢截击", "v", ["normal_interceptor", "normal_scout", "normal_gunner"]],
      ["电磁封锁", "arc", ["elite_jammer", "elite_spread", "normal_rusher"]],
      ["重舰护航", "escort", ["medium_gunship", "elite_shield", "normal_gunner"]],
      ["抢夺补给", "cargo", ["medium_transport", "elite_missile", "normal_scout"]],
      ["多管齐射", "cross", ["medium_launcher", "elite_spread", "normal_bomber"]],
    ],
  },
  {
    name: "主脑核心", boss: "boss_overmind", bossName: "核心主脑", flagship: "medium_fortress",
    waves: [
      ["无人机猎群", "v", ["normal_light_fighter", "normal_scout", "normal_bomber"]],
      ["电磁夹击", "flank", ["elite_jammer", "elite_missile", "normal_interceptor"]],
      ["核心防卫", "escort", ["medium_launcher", "elite_shield", "medium_gunship"]],
      ["末路补给", "cargo", ["medium_transport", "elite_spread", "normal_scout"]],
      ["最后防线", "cross", ["medium_fortress", "elite_fighter", "normal_bomber", "elite_jammer", "elite_missile"]],
    ],
  },
];

export const WAVE_COUNT = CAMPAIGN[0].waves.length;
export const WAVE_MS = 9000;
export const BOSS_ARRIVAL_MS = 48750;
export const MAX_ACTIVE_ENEMIES = 60;
const ACES = ["aegis", "splitter", "sniper"];

// Direction-B sprites have very different source dimensions. SoloCombat derives the
// exact NEAREST scale from the manifest and these target on-screen spans.
export const DISPLAY_TARGETS = Object.freeze({ fighter: 80, normal: 52, elite: 72, medium: 96, boss: 238 });

// Reducing these cooldowns to 84% raises the sustained fire rate by about 19%.
const NORMAL = { hp: 33, speed: 142, radius: 25, damage: 12, interval: 2520 };
const ELITE = { hp: 104, speed: 93, radius: 36, damage: 16, interval: 2218 };
const MEDIUM = { hp: 183, speed: 80, radius: 44, damage: 20, interval: 2428 };

export const ENEMY_PROFILES = {
  normal_light_fighter: { ...NORMAL, flight: "dive", attack: "aimed" },
  normal_scout: { ...NORMAL, hp: 25, flight: "weave", attack: "aimed", interval: 3150 },
  normal_gunner: { ...NORMAL, flight: "line", attack: "twin" },
  normal_interceptor: { ...NORMAL, flight: "cross", attack: "slant", speed: 155 },
  normal_rusher: { ...NORMAL, hp: 26, flight: "rush", attack: null, speed: 189 },
  normal_bomber: { ...NORMAL, hp: 44, flight: "bomber", attack: null, speed: 136 },
  elite_fighter: { ...ELITE, flight: "weave", attack: "burst" },
  elite_shield: { ...ELITE, hp: 134, flight: "line", attack: "twin", shielded: true },
  elite_missile: { ...ELITE, flight: "line", attack: "missile", interval: 2822 },
  elite_spread: { ...ELITE, flight: "weave", attack: "fan" },
  elite_jammer: { ...ELITE, flight: "line", attack: "jam", interval: 2982 },
  medium_transport: { ...MEDIUM, hp: 215, flight: "line", attack: null, speed: 76 },
  medium_gunship: { ...MEDIUM, flight: "weave", attack: "broadside" },
  medium_fortress: { ...MEDIUM, hp: 240, flight: "line", attack: "fortress", speed: 71 },
  medium_launcher: { ...MEDIUM, flight: "line", attack: "launcher", interval: 2848 },
  boss_marshal: { hp: 2100, speed: 145, radius: 52, damage: 22, interval: 1110, flight: "boss" },
  boss_citadel: { hp: 3800, speed: 131, radius: 55, damage: 24, flight: "boss" },
  boss_overmind: { hp: 5800, speed: 147, radius: 54, damage: 26, flight: "boss" },
};

const ELITES = Object.keys(ENEMY_PROFILES).filter((id) => id.startsWith("elite_"));

const LAYOUTS = {
  v: [[0, 0], [-62, 42], [62, 42], [-124, 84], [124, 84], [-180, 126], [180, 126]],
  cross: [[-147, 0], [147, 18], [-196, 69], [196, 89], [-244, 138], [244, 158]],
  escort: [[0, 0], [-67, 65], [67, 65], [-132, 145], [132, 145], [0, 183]],
  cargo: [[0, 92], [-76, 0], [76, 0], [-134, 67], [134, 67], [-135, 146], [135, 146]],
  arc: [[-54, 0], [54, 0], [-110, 36], [110, 36], [-167, 72], [167, 72], [-210, 110], [210, 110]],
  flank: [[-204, 0], [204, 0], [-244, 47], [244, 47], [-275, 95], [275, 95], [-170, 140], [170, 140]],
};

export class StageDirector {
  constructor(random) {
    this.random = random;
    this.sector = 0;
  }

  update(session, spawn, events, fieldClear = false, activeCount = 0) {
    const sector = session.stage;
    const map = CAMPAIGN[session.sector - 1];
    const now = session.elapsedMs - session.stageStartedAt;
    if (this.sector !== sector) {
      this.sector = sector;
      this.wave = -1;
      this.bossArrived = false;
      this.flagshipArrived = false;
    }
    if (now >= BOSS_ARRIVAL_MS) {
      if (this.bossArrived) return null;
      this.bossArrived = true;
      session.warpDashMs = 1500;
      events.push({ type: "boss", id: map.boss, label: map.bossName, stage: sector });
      // The existing wave banner accepts labels for every sector and boss.
      if (sector > 1) events.push({ type: "wave", label: `${map.bossName}接近中` });
      if (session.mode === "endless" && session.loop >= 3) {
        spawn("elite_fighter", 170, -60, { flagship: true, summoned: true });
        spawn("elite_fighter", 550, -60, { flagship: true, summoned: true });
      }
      return spawn(map.boss, 360, -106);
    }
    if (now >= WAVE_COUNT * WAVE_MS) return null;
    const wave = Math.floor(now / WAVE_MS);
    const [label, layout, roster] = map.waves[wave];
    if (wave !== this.wave) {
      this.wave = wave;
      this.group = 0;
      this.next = wave * WAVE_MS + (wave > 0 && wave % 2 === 0 ? 1500 : 480);
      session.wave = wave + 1;
      if (wave > 0 && wave % 2 === 0) {
        session.warpDashMs = 1500;
        events.push({ type: "warp", stage: sector });
      }
      events.push({ type: "wave", label: wave === 0 ? `${map.name} · ${label}` : label });
    }

    if (!this.flagshipArrived && now >= 2 * WAVE_MS + 1500) {
      this.flagshipArrived = true;
      if (session.mode === "endless" && session.loop >= 2) {
        spawn(map.flagship, 220, -62, { flagship: true });
        spawn(map.flagship, 500, -62, { flagship: true });
      } else {
        spawn(map.flagship, 360, -62, { flagship: true });
      }
      events.push({ type: "wave", label: "中段精英旗舰接近中" });
    }
    if (now % WAVE_MS > 7530) return null;
    if (fieldClear && this.group > 0 && this.next - now > 320) this.next = now + 320;
    if (now < this.next) return null;
    if (activeCount >= MAX_ACTIVE_ENEMIES) {
      this.next = now + 400;
      return null;
    }

    const formation = wave === 4 && this.group % 2 === 1 ? (layout === "flank" ? "cross" : "flank") : layout;
    const offsets = LAYOUTS[formation];
    const center = this.group === 0 ? 360 : 360 + (this.random() - 0.5) * (["cross", "flank"].includes(layout) ? 66 : 194);
    const length = Math.min(offsets.length, wave === 4 ? 8 : 6 + Number(session.sector > 1), MAX_ACTIVE_ENEMIES - activeCount);
    const loop = session.loop;
    const endlessHorde = session.mode === "endless" && loop >= 2;
    const eliteChance = endlessHorde ? (loop === 2 ? 0.35 : 0.5) : 0;
    const aceChance = (endlessHorde || (session.hardcore && wave >= 2)) ? 0.22 : 0;

    for (let index = 0; index < length; index++) {
      const [dx, dy] = offsets[index];
      const x = Math.max(40, Math.min(680, center + dx));
      const bounty = layout === "cargo" && index === 0 && this.group === 0;
      const lead = index === 0 && (layout === "escort" || bounty);
      let id = roster[lead ? 0 : (index + this.group) % roster.length];
      if (!lead && id === "medium_transport") id = roster[1];
      if (!lead && !bounty && endlessHorde && this.random() < eliteChance) {
        id = ELITES[Math.floor(this.random() * ELITES.length)];
      }
      const isHeavy = !id.startsWith("normal_") && id !== "medium_transport";
      const ace = !bounty && isHeavy && this.random() < aceChance ? ACES[Math.floor(this.random() * ACES.length)] : null;
      spawn(id, x, -40 - dy, { side: Math.sign(dx), formation, bounty, opening: wave === 0, ace });
      if (bounty) events.push({ type: "bounty-start", durationMs: 8000 });
    }
    if (endlessHorde) {
      const flankOffsets = LAYOUTS[formation === "flank" ? "cross" : "flank"];
      const extraCount = Math.min(loop === 2 ? 5 : 8, flankOffsets.length, Math.max(0, MAX_ACTIVE_ENEMIES - activeCount - length));
      for (let i = 0; i < extraCount; i++) {
        const [dx, dy] = flankOffsets[i];
        const x = Math.max(40, Math.min(680, 360 + dx));
        const id = this.random() < eliteChance
          ? ELITES[Math.floor(this.random() * ELITES.length)]
          : roster[(i + this.group + 1) % roster.length];
        const safeId = id === "medium_transport" ? roster[1] : id;
        const isHeavy = !safeId.startsWith("normal_");
        const ace = isHeavy && this.random() < aceChance ? ACES[Math.floor(this.random() * ACES.length)] : null;
        spawn(safeId, x, -120 - dy, { side: Math.sign(dx), formation: "flank", ace });
      }
    }
    if (this.group === 0 && session.mutator?.id === "elite-swarm") {
      const elite = ELITES[Math.floor(this.random() * ELITES.length)];
      spawn(elite, 360, -210, { formation });
    }
    this.group++;
    const baseInterval = (layout === "cargo" ? 2360 : wave === 4 ? 1420 : 1840) - (session.sector - 1) * 80;
    const intervalScale = endlessHorde ? (loop === 2 ? 0.76 : Math.max(0.55, 0.72 - (loop - 3) * 0.05)) : 1;
    this.next = now + Math.max(720, Math.round(baseInterval * intervalScale));
    return null;
  }
}

// Pixel anchors measured on each Direction B source sprite.
export const BOSS_HARDPOINTS = {
  boss_marshal: [
    { id: "left", label: "左翼炮", x: 37, y: 50, radius: 25, hp: 240, cut: [26, 46] },
    { id: "right", label: "右翼炮", x: 112, y: 50, radius: 25, hp: 240, cut: [26, 46] },
    { id: "core", label: "中央核心", x: 74, y: 49, radius: 36 },
  ],
  boss_citadel: [
    { id: "left", label: "左肩重炮", x: 36, y: 31, radius: 27, hp: 340, cut: [30, 54] },
    { id: "right", label: "右肩重炮", x: 109, y: 31, radius: 27, hp: 340, cut: [30, 54] },
    { id: "core", label: "要塞能源核心", x: 72, y: 58, radius: 36 },
  ],
  boss_overmind: [
    { id: "left", label: "左孵化舱", x: 37, y: 47, radius: 25, hp: 460, cut: [39, 48] },
    { id: "right", label: "右孵化舱", x: 126, y: 47, radius: 25, hp: 460, cut: [39, 48] },
    { id: "core", label: "主脑核心", x: 81, y: 46, radius: 39 },
  ],
};

export function createBossParts({ id, width, height }, scale, coreHp, hpScale = 1) {
  return BOSS_HARDPOINTS[id].map(({ x, y, hp, cut, ...part }) => {
    const maxHp = hp === undefined ? coreHp : Math.round(hp * hpScale);
    return { ...part, dx: (x - width / 2) * scale, dy: (y - height / 2) * scale, hp: maxHp, maxHp };
  });
}
