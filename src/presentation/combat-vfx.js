import Phaser from "phaser";
import { ensureBoomTextures } from "./vfx-atlas.js";

const WHITE = 0xffffff;
const AMBER = 0xff7a22;
const GOLD = 0xffd13b;
const RED = 0xff3355;
const CYAN = 0x33ddcc;
const INDIGO = 0x0d1024;
const RING = [[0, -1], [0.42, -0.91], [0.72, -0.72], [0.91, -0.42], [1, 0], [0.91, 0.42],
  [0.72, 0.72], [0.42, 0.91], [0, 1], [-0.42, 0.91], [-0.72, 0.72], [-0.91, 0.42],
  [-1, 0], [-0.91, -0.42], [-0.72, -0.72], [-0.42, -0.91]];

export function pixelRing(g, x, y, radius, color, alpha, width) {
  const snap = (value) => Math.round(value / 2) * 2;
  g.lineStyle(width, color, alpha).beginPath().moveTo(snap(x), snap(y - radius));
  for (let i = 1; i < RING.length; i++) {
    const [u, v] = RING[i];
    g.lineTo(snap(x + u * radius), snap(y + v * radius));
  }
  g.closePath().strokePath();
}
const LIMIT = 480;

export class CombatVfx {
  constructor(scene) {
    this.scene = scene;
    this.glow = scene.add.graphics().setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
    this.gfx = scene.add.graphics().setDepth(18);
    this.flares = [];
    this.motes = [];
    this.effects = [];
    this.labels = [];
    this.flashes = [];
    this.booms = [];
    this.boomKeys = ensureBoomTextures(scene);
    this.labelUntil = new Map();
    this.clock = 0;
  }

  consume(events) {
    for (const event of events) {
      switch (event.type) {
        case "muzzle":
        case "barrage":
          this.#effect(event, 61);
          break;
        case "impact":
          this.#impact(event);
          if (event.kind === "lance" && event.pierce > 0) this.#effect({ ...event, type: "lance-slash" }, 125);
          break;
        case "ice-shatter":
          this.#scatter(event, 12, [CYAN, WHITE], 188, 285);
          break;
        case "destroy":
        case "part-break":
          this.#destroy(event);
          break;
        case "graze":
          this.#effect({ ...event, type: "arc", points: [event, { x: event.toX, y: event.toY }] }, 150);
          this.#impact({ ...event, vx: 0, vy: -1 });
          this.#label({ x: event.x, y: event.y - 26, label: "+GRAZE", color: CYAN });
          break;
        case "dmg":
          this.#damageText(event);
          break;
        case "arc":
          this.#effect(event, 128);
          for (const point of event.points.slice(1)) this.#scatter(point, 4, [event.color, WHITE], 125, 143);
          break;
        case "boss-pulse":
          this.#effect(event, 315);
          break;
        case "boss-laser-fire":
          this.#effect(event, 215);
          this.#scatter(event, 10, [RED, WHITE], 185, 200);
          break;
        case "blast":
          this.#effect(event, event.kind === "void" ? 340 : 310);
          if (event.kind === "rocket") this.#scatter(event, 12, [AMBER, GOLD, RED], 240, 285);
          if (event.kind === "void") this.#scatter(event, 8, [WHITE, GOLD, event.color], 139, 165);
          break;
        case "hurt":
        case "guard":
        case "pickup":
          this.#effect(event, 220);
          break;
        case "reflect":
        case "evolution":
        case "overload":
        case "boss-phase":
        case "jam":
          this.#effect(event, event.type === "jam" ? 1100 : 580);
          break;
        case "mechanism":
          this.#label(event);
          break;
      }
    }
  }

  #effect(event, life) {
    this.effects.push({ ...event, life, age: 0 });
    if (this.effects.length > 180) this.effects.shift();
  }

  #particle(list, particle, limit) {
    if (list.length >= limit) list.shift();
    list.push({ age: 0, ...particle });
  }

  #impact({ x, y, vx, vy, color = AMBER }) {
    const back = Math.atan2(-vy, -vx);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index++) {
      const angle = back + (Math.random() - 0.5) * 1.9;
      const speed = 85 + Math.random() * 165;
      this.#particle(this.flares, {
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2, color: index % 2 === 0 ? WHITE : color, life: 75 + Math.random() * 108,
      }, LIMIT);
    }
  }

  #scatter({ x, y }, count, colors, maxSpeed, lifetime, maxSize = 4) {
    for (let i = 0; i < count; i++) {
      const direction = (i + Math.random()) * Math.PI * 2 / count;
      const speed = (0.3 + Math.random() * 0.7) * maxSpeed;
      this.#particle(this.flares, {
        x, y, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
        size: 2 + Math.random() * maxSize, color: colors[i % colors.length], life: lifetime * (0.6 + Math.random() * 0.9),
      }, LIMIT);
    }
  }

  #destroy(event) {
    const { x, y, heavy, id } = event;
    if (event.type === "destroy") {
      if (this.flashes.length >= 24) this.flashes.shift().image.destroy();
      const key = this.scene.game.renderer.type === 1 ? id + "-white" : id;
      const image = this.scene.add.image(x, y, key).setScale(event.scale).setRotation(event.turn).setDepth(13);
      image.setTintFill(0xffffff);
      this.flashes.push({ image, age: 0 });
    }
    this.#scatter(event, heavy ? 22 : 16, [WHITE, GOLD, AMBER, RED], heavy ? 405 : 290, 420, heavy ? 8 : 5);
    const puffs = heavy ? 4 : 2;
    for (let i = 0; i < puffs; i++) {
      const key = this.boomKeys[(i + Math.floor(Math.random() * 4)) % this.boomKeys.length];
      const ox = i === 0 ? 0 : (Math.random() - 0.5) * (heavy ? 54 : 30);
      const oy = i === 0 ? 0 : (Math.random() - 0.5) * (heavy ? 44 : 26);
      const spr = this.scene.add.image(x + ox, y + oy, key).setDepth(17.5).setScale(heavy ? 1.5 : 1.0);
      if (this.booms.length >= 28) this.booms.shift().spr.destroy();
      this.booms.push({ spr, age: 0, life: (heavy ? 360 : 260) + i * 55, baseScale: heavy ? 2.5 : 1.7 });
    }
    this.#effect({ ...event, type: "blast", color: AMBER, radius: heavy ? 81 : 47 }, 195);
  }

  #damageText({ x, y, amount, crit }) {
    if (this.labels.length >= 16) {
      this.labels.shift().label.destroy();
    }
    const label = this.scene.add.text(x, y, String(amount), {
      fontFamily: "ui-monospace, monospace",
      fontSize: crit ? "22px" : "16px",
      fontStyle: "bold",
      color: crit ? "#ffd13b" : "#ffffff",
      stroke: "#090c1e",
      strokeThickness: crit ? 5 : 3,
    }).setOrigin(0.5).setDepth(19);
    this.labels.push({ label, age: 0, ttl: crit ? 620 : 460 });
  }

  #label(event) {
    if (this.labels.length >= 8 || (this.labelUntil.get(event.label) ?? 0) > this.clock) return;
    this.labelUntil.set(event.label, this.clock + 175);
    const color = "#" + event.color.toString(16).padStart(6, "0");
    const label = this.scene.add.text(event.x, Math.max(155, event.y - 14), event.label, {
      fontFamily: "system-ui, sans-serif", fontSize: "22px", fontStyle: "bold", color, stroke: "#0d1024", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(19);
    this.labels.push({ label, age: 0 });
  }

  render(dtMs) {
    this.clock += dtMs;
    const g = this.gfx;
    const dt = dtMs / 1000;
    g.clear();
    this.glow.clear();
    this.flashes = this.flashes.filter((flash) => {
      flash.age += dtMs;
      if (flash.age >= 68) {
        flash.image.destroy();
        return false;
      }
      flash.image.setAlpha(1 - 0.52 * flash.age / 68);
      return true;
    });
    this.booms = this.booms.filter((b) => {
      b.age += dtMs;
      const t = b.age / b.life;
      if (t >= 1) {
        b.spr.destroy();
        return false;
      }
      b.spr.setScale(b.baseScale * (0.55 + t * 0.75));
      b.spr.setAlpha(t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45);
      return true;
    });
    this.motes = this.motes.filter((p) => {
      p.age += dtMs;
      const fade = p.age / p.life;
      if (fade >= 1) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const size = p.size * (0.58 + fade * 0.72);
      g.fillStyle(0x26204d, (1 - fade) * 0.45);
      this.#block(p.x - size * 0.28, p.y + size * 0.18, size * 0.72, size * 0.46);
      this.#block(p.x, p.y, size * 0.92, size * 0.62);
      g.fillStyle(0x4b3f8c, (1 - fade) * 0.28);
      this.#block(p.x - size * 0.1, p.y - size * 0.26, size * 0.5, size * 0.24);
      return true;
    });
    this.flares = this.flares.filter((p) => {
      p.age += dtMs;
      const fade = p.age / p.life;
      if (fade >= 1) return false;
      const drag = Math.exp(-dt * 3.1);
      p.vx *= drag;
      p.vy = p.vy * drag + dt * 155;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.lineStyle(Math.max(1, p.size * (1 - fade)), p.color, (1 - fade) * 0.72);
      g.lineBetween(p.x - p.vx * 0.034, p.y - p.vy * 0.034, p.x, p.y);
      g.fillStyle(p.color, 1 - fade * 0.9);
      this.#block(p.x, p.y, p.size * (1 - fade * 0.6));
      return true;
    });
    this.effects = this.effects.filter((effect) => {
      effect.age += dtMs;
      if (effect.age >= effect.life) return false;
      this.#draw(effect, effect.age / effect.life);
      return true;
    });
    this.labels = this.labels.filter((entry) => {
      entry.age += dtMs;
      const ttl = entry.ttl ?? 680;
      if (entry.age >= ttl) {
        entry.label.destroy();
        return false;
      }
      entry.label.y -= dtMs * 0.085;
      entry.label.setAlpha(Math.min(1, (ttl - entry.age) / 220));
      return true;
    });
  }

  #block(x, y, w, h = w) {
    this.gfx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  #draw(effect, fraction) {
    const g = this.gfx;
    const { x, y, type, color = WHITE } = effect;
    const alpha = 1 - fraction;
    const glow = this.glow;
    if (type === "lance-slash") {
      const size = 14 + fraction * 28;
      pixelRing(glow, x, y, size * 0.78, RED, alpha * 0.55, 8);
      glow.lineStyle(12, RED, alpha * 0.72).lineBetween(x - size, y - size, x + size, y + size)
        .lineBetween(x - size, y + size, x + size, y - size);
      g.lineStyle(4, GOLD, alpha * 0.9).lineBetween(x - size * 0.85, y - size * 0.85, x + size * 0.85, y + size * 0.85)
        .lineBetween(x - size * 0.85, y + size * 0.85, x + size * 0.85, y - size * 0.85);
      g.lineStyle(2, WHITE, alpha).lineBetween(x - size, y - size, x + size, y + size)
        .lineBetween(x - size, y + size, x + size, y - size);
      return;
    }
    if (type === "boss-laser-fire") {
      const r = 12 + 21 * fraction;
      glow.fillStyle(RED, 0.44 * alpha).fillCircle(x, y, r + 11);
      pixelRing(g, x, y, r, RED, alpha, 5);
      g.fillStyle(WHITE, alpha);
      this.#block(x, y, 18 * alpha, 22 * alpha);
      return;
    }
    if (type === "boss-pulse" || type === "boss-phase" || type === "reflect") {
      const reach = type === "boss-phase"
        ? Math.hypot(Math.max(x, 720 - x), Math.max(y, 1280 - y)) + 14
        : effect.radius;
      const radius = Math.max(5, reach * fraction);
      const accent = type === "boss-phase" ? GOLD : type === "boss-pulse" ? color : WHITE;
      pixelRing(glow, x, y, radius, color, alpha * 0.39, 16);
      pixelRing(g, x, y, radius, accent, alpha * 0.87, type === "boss-phase" ? 6 : 3);
      pixelRing(g, x, y, Math.max(1, radius - 12), type === "boss-phase" ? RED : WHITE, alpha * 0.61, 2);
      if (type === "boss-phase") glow.fillStyle(RED, alpha * alpha * 0.20).fillRect(0, 0, 720, 1280);
      return;
    }
    if (type === "muzzle" || type === "barrage") {
      if (effect.charged) {
        pixelRing(g, x, y, 8 + fraction * 17, GOLD, alpha, 3);
        pixelRing(glow, x, y, 9 + fraction * 17, GOLD, alpha * 0.5, 6);
      }
      const size = (type === "barrage" || effect.heavy ? 20 : 14) * alpha;
      glow.fillStyle(color, alpha * 0.45).fillCircle(x, y, size * 1.4);
      g.fillStyle(color, alpha * 0.72);
      this.#block(x, y, size * 2.1, Math.max(2, size * 0.65));
      this.#block(x, y, Math.max(2, size * 0.65), size * 2.5);
      g.fillStyle(WHITE, alpha);
      this.#block(x, y, size * 0.85);
      return;
    }
    if (type === "arc") {
      for (let index = 1; index < effect.points.length; index++) {
        const a = effect.points[index - 1];
        const b = effect.points[index];
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const steps = Math.max(3, Math.min(14, Math.round(length / 16)));
        let x0 = a.x;
        let y0 = a.y;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const twist = i === steps ? 0 : Math.sin(i * 11.7 + index) * Math.min(13, length * 0.24);
          const x1 = a.x + (b.x - a.x) * t + (b.y - a.y) / length * twist;
          const y1 = a.y + (b.y - a.y) * t - (b.x - a.x) / length * twist;
          glow.lineStyle(9, color, alpha * 0.36).lineBetween(x0, y0, x1, y1);
          g.lineStyle(3, color, alpha).lineBetween(x0, y0, x1, y1);
          g.lineStyle(1, WHITE, alpha).lineBetween(x0, y0, x1, y1);
          x0 = x1;
          y0 = y1;
        }
      }
      return;
    }
    if (type === "blast" && effect.kind === "void") {
      const radius = Math.max(3, effect.radius * (0.71 - fraction * 0.67));
      pixelRing(glow, x, y, radius, color, alpha * 0.45, 14);
      pixelRing(g, x, y, radius, color, alpha, 4);
      pixelRing(g, x, y, radius * 0.78, GOLD, alpha * 0.85, 2);
      g.fillStyle(WHITE, alpha * alpha * 0.94);
      this.#block(x, y, 30 * alpha, 50 * alpha);
      this.#block(x, y, 50 * alpha, 25 * alpha);
      return;
    }
    if (type === "blast" && (effect.kind === "rocket" || effect.hostile)) {
      const radius = Math.max(3, effect.radius * fraction);
      pixelRing(glow, x, y, radius, color, alpha * 0.42, 12);
      pixelRing(g, x, y, radius, color, alpha, 4);
      pixelRing(g, x, y, radius * 0.72, GOLD, alpha * 0.84, 3);
      g.fillStyle(WHITE, alpha * alpha * 0.88);
      this.#block(x, y, 22 * alpha, 15 * alpha);
      return;
    }
    if (type === "blast") {
      const radius = effect.radius * (0.34 + fraction * 0.68);
      pixelRing(glow, x, y, radius, color, alpha * 0.44, 10);
      pixelRing(g, x, y, radius, GOLD, alpha * 0.86, 3);
      for (let i = 0; i < 8; i++) {
        const theta = i * Math.PI / 4 + fraction * 0.35;
        const px = x + Math.cos(theta) * radius * 0.68;
        const py = y + Math.sin(theta) * radius * 0.68;
        g.fillStyle(i % 2 ? GOLD : color, alpha * 0.78);
        this.#block(px, py, Math.max(4, radius * 0.28), Math.max(4, radius * 0.28));
      }
      g.fillStyle(WHITE, alpha * alpha * 0.94);
      this.#block(x, y, radius * 0.52, radius * 0.52);
      return;
    }
    if (type === "hurt" || type === "pickup" || type === "guard") {
      const tint = type === "pickup" ? (effect.pickup === "gold" ? 0xffdb7e : effect.pickup === "heal" ? 0xff95b6 : 0x7dffa6) : color;
      const radius = 9 + fraction * 25;
      g.lineStyle(2, tint, alpha).strokeCircle(x, y, radius);
      if (type === "hurt") {
        g.lineStyle(12, RED, alpha * 0.65).strokeRect(6, 6, 708, 1268);
      }
      return;
    }
    if (type === "overload") {
      const radius = (effect.radius ?? 920) * (0.08 + fraction * 0.92);
      g.fillStyle(0x050712, alpha * alpha * 0.42).fillRect(0, 0, 720, 1280);
      glow.fillStyle(color, alpha * 0.16).fillRect(0, 0, 720, 1280);
      pixelRing(glow, x, y, radius, color, alpha * 0.65, 18);
      pixelRing(g, x, y, radius, WHITE, alpha * 0.9, 4);
      const kind = effect.kind;
      if (kind === "lance" || kind === "pulse") {
        const w = (kind === "lance" ? 96 : 64) * alpha;
        glow.fillStyle(color, alpha * 0.55).fillRect(x - w, 0, w * 2, y);
        g.fillStyle(WHITE, alpha * 0.95).fillRect(x - w * 0.35, 0, w * 0.7, y);
      } else if (kind === "arc") {
        for (let i = 1; i <= 6; i++) {
          const bx = i * 105 + Math.sin(fraction * 25 + i) * 18;
          glow.lineStyle(18, GOLD, alpha * 0.55).lineBetween(bx, 0, bx + 16, 1280);
          g.lineStyle(4, WHITE, alpha * 0.95).lineBetween(bx, 0, bx + 16, 1280);
        }
      } else if (kind === "void") {
        g.fillStyle(0x110724, alpha * 0.85).fillCircle(x, y, 110 * alpha);
        pixelRing(g, x, y, 125 * (1 - fraction * 0.6), color, alpha, 5);
        g.fillStyle(WHITE, alpha).fillRect(x - 160 * alpha, y - 4, 320 * alpha, 8);
        g.fillStyle(WHITE, alpha).fillRect(x - 4, y - 160 * alpha, 8, 320 * alpha);
      } else {
        for (let i = 0; i < 12; i++) {
          const a = i * Math.PI / 6 + fraction * 0.8;
          const len = 140 + fraction * 580;
          glow.lineStyle(10, color, alpha * 0.5).lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
          g.lineStyle(3, WHITE, alpha * 0.85).lineBetween(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
        }
      }
      return;
    }
    const radius = type === "jam" ? effect.radius * fraction : (effect.radius ?? 245) * (0.07 + fraction * 0.93);
    g.lineStyle(5 * alpha + 1, color, alpha * 0.8).strokeCircle(x, y, radius);
    g.lineStyle(2, WHITE, alpha * 0.36).strokeCircle(x, y, Math.max(1, radius - 8));
  }
}
