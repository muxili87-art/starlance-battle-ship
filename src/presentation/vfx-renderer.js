import Phaser from "phaser";

/**
 * Steam-Grade Pixel VFX & Additive Glow Renderer:
 * - Additive-blended glow halos around projectiles & explosions
 * - High-contrast pulsing enemy bullets (crimson outer + bright white core)
 * - 16-particle explosive shrapnel + fading pixel smoke puffs
 */
export class VfxRenderer {
  constructor(scene) {
    this.scene = scene;
    this.glowGraphics = scene.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    this.projGraphics = scene.add.graphics().setDepth(22);
    this.fxGraphics = scene.add.graphics().setDepth(24);
    this.bursts = [];
    this.splats = []; // Gaussian-splatting style additive pixel bloom puffs
    this.chains = [];
    this.debris = [];
    this.smoke = [];
    this.popups = [];
    this.pulseMs = 0;
  }

  consumeEvents(events) {
    for (const ev of events) {
      if (ev.type === "muzzle") {
        const color = ev.kind === "heavy" ? 0xff8c3a : ev.kind === "magnet" ? 0xb07cff : 0xf4f8ff;
        this.bursts.push({ x: ev.x, y: ev.y, size: ev.kind === "heavy" ? 22 : 12, color, lifeMs: 90, maxLifeMs: 90 });
      } else if (ev.type === "skill-cast") {
        this.bursts.push({ x: ev.x, y: ev.y - 20, size: 120, color: ev.color, lifeMs: 280, maxLifeMs: 280 });
      } else if (ev.type === "hit") {
        const color = ev.kind === "heavy" ? 0xff8c3a : ev.kind === "magnet" ? 0xb07cff : 0x43cff4;
        this.bursts.push({ x: ev.x, y: ev.y, size: ev.kind === "heavy" ? 24 : 14, color, lifeMs: 120, maxLifeMs: 120 });
        for (let i = 0; i < 4; i += 1) {
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
          const spd = 90 + Math.random() * 140;
          this.debris.push({ x: ev.x, y: ev.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, color, size: 3, lifeMs: 150, maxLifeMs: 150 });
        }
      } else if (ev.type === "reaction" || ev.type === "pod-install") {
        this.bursts.push({ x: ev.x, y: ev.y + 18, size: 76, color: ev.color, lifeMs: 300, maxLifeMs: 300 });
        const text = this.scene.add
          .text(Math.round(ev.x), Math.round(ev.y), ev.label, {
            fontSize: "17px",
            color: `#${ev.color.toString(16).padStart(6, "0")}`,
            fontStyle: "bold",
            stroke: "#060b14",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(35);
        this.popups.push({ text, lifeMs: 620, maxLifeMs: 620 });
      } else if (ev.type === "graze") {
        this.bursts.push({ x: ev.x, y: ev.y, size: 28, color: 0x43cff4, lifeMs: 160, maxLifeMs: 160 });
      } else if (ev.type === "chain") {
        this.chains.push({ x1: ev.x1, y1: ev.y1, x2: ev.x2, y2: ev.y2, color: ev.color, lifeMs: 260, maxLifeMs: 260 });
      } else if (ev.type === "mega-beam") {
        this.chains.push({ x1: ev.x - 22, y1: ev.y, x2: ev.x - 48, y2: 340, color: ev.color, lifeMs: 520, maxLifeMs: 520 });
        this.chains.push({ x1: ev.x + 22, y1: ev.y, x2: ev.x + 48, y2: 340, color: ev.color, lifeMs: 520, maxLifeMs: 520 });
        this.chains.push({ x1: ev.x, y1: ev.y - 10, x2: ev.x, y2: 340, color: 0xeef6ff, lifeMs: 420, maxLifeMs: 420 });
        this.bursts.push({ x: ev.x, y: ev.y - 160, size: 120, kind: "star", color: ev.color, lifeMs: 360, maxLifeMs: 360 });
      } else if (ev.type === "mega-blast") {
        for (let k = 0; k < 3; k += 1) {
          this.bursts.push({ x: ev.x, y: ev.y - k * 140, size: 130 - k * 18, kind: "chevron", color: k === 1 ? 0xffd166 : ev.color, lifeMs: 460 + k * 90, maxLifeMs: 460 + k * 90 });
        }
      } else if (ev.type === "singularity") {
        this.bursts.push({ x: ev.x, y: ev.y, size: 165, kind: "prism", color: ev.color, lifeMs: 650, maxLifeMs: 650 });
        this.bursts.push({ x: ev.x, y: ev.y, size: 95, kind: "star", color: 0x43cff4, lifeMs: 480, maxLifeMs: 480 });
      } else if (ev.type === "kill") {
        this.bursts.push({ x: ev.enemy.x, y: ev.enemy.y, size: 46, kind: "star", color: 0xffb454, lifeMs: 250, maxLifeMs: 250 });
        for (let i = 0; i < 16; i += 1) {
          const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.35;
          const speed = 110 + Math.random() * 220;
          this.debris.push({
            x: ev.enemy.x,
            y: ev.enemy.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 35,
            color: i % 3 === 0 ? 0xff8c3a : i % 3 === 1 ? 0xffd166 : 0x9bb4cc,
            size: i % 4 === 0 ? 6 : 4,
            lifeMs: 340,
            maxLifeMs: 340,
          });
        }
        for (let i = 0; i < 4; i += 1) {
          this.smoke.push({
            x: ev.enemy.x + (Math.random() - 0.5) * 24,
            y: ev.enemy.y + (Math.random() - 0.5) * 20,
            size: 10 + i * 3,
            lifeMs: 360,
            maxLifeMs: 360,
          });
        }
      } else if (ev.type === "core-hit") {
        this.bursts.push({ x: ev.x, y: ev.y, size: 46, color: 0xff4b5c, lifeMs: 240, maxLifeMs: 240 });
      } else if (ev.type === "overload-start") {
        this.bursts.push({ x: 360, y: 1160, size: 220, color: 0xff8c3a, lifeMs: 360, maxLifeMs: 360 });
      } else if (ev.type === "overload-end") {
        // Cascading pixel-art bombing chevrons + vertical plasma strike pillars + dense shrapnel (NO giant circles!)
        const bx = ev.x || 360;
        for (let k = 0; k < 5; k += 1) {
          const ex = bx + (k % 2 === 0 ? -36 : 36);
          const ey = 920 - k * 120;
          this.bursts.push({
            x: ex,
            y: ey,
            size: 105 - k * 8,
            kind: "chevron",
            color: k % 2 === 0 ? 0xffd166 : 0xff8c3a,
            lifeMs: 460 + k * 80,
            maxLifeMs: 460 + k * 80,
          });
          this.chains.push({
            x1: ex,
            y1: ey + 70,
            x2: ex,
            y2: ey - 90,
            color: 0xffd166,
            lifeMs: 340 + k * 60,
            maxLifeMs: 340 + k * 60,
          });
          for (let i = 0; i < 10; i += 1) {
            const ang = (Math.PI * 2 * i) / 10 + k * 0.4;
            const spd = 140 + Math.random() * 220;
            this.debris.push({
              x: ex,
              y: ey,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 60,
              color: i % 2 === 0 ? 0xffd166 : 0xff8c3a,
              size: i % 3 === 0 ? 6 : 4,
              lifeMs: 380,
              maxLifeMs: 380,
            });
          }
        }
      }
    }
  }

  render(session, dtMs) {
    const dtSec = dtMs / 1000;
    this.pulseMs += dtMs;
    this.glowGraphics.clear();
    this.projGraphics.clear();

    // Player projectiles rendered in unified world X/Y space (matches enemy.x 1:1 on all 3 lanes!)
    const vpY = 355;
    for (const p of session.projectiles) {
      const py = Math.max(vpY, Math.round(p.y));
      const depthT = Math.max(0, Math.min(1, (py - vpY) / 665));
      const dScale = 0.34 + depthT * 0.68;
      const sx = Math.round(p.x);
      // Tracer tail aligned along actual velocity vector (p.vx, p.vy) so hits match 1:1 visually
      const tailLen = p.kind === "pulse" ? 26 * dScale : p.kind === "heavy" ? 18 * dScale : 14 * dScale;
      const vx = p.vx || 0;
      const vy = p.vy || -900;
      const speed = Math.max(1, Math.hypot(vx, vy));
      const tx = Math.round(sx - (vx / speed) * tailLen);
      const ty = Math.round(py - (vy / speed) * tailLen);

      if (p.kind === "pulse") {
        const w = Math.max(3, Math.round(9 * dScale));
        this.glowGraphics.lineStyle(w * 2, 0x43cff4, 0.26);
        this.glowGraphics.lineBetween(sx, py, tx, ty);
        this.projGraphics.lineStyle(w, 0x43cff4, 0.95);
        this.projGraphics.lineBetween(sx, py, tx, ty);
        this.projGraphics.lineStyle(Math.max(2, Math.round(w * 0.45)), 0xf4f8ff, 1);
        this.projGraphics.lineBetween(sx, py, Math.round((sx + tx) * 0.5), Math.round((py + ty) * 0.5));
      } else if (p.kind === "heavy") {
        const s = Math.max(5, Math.round(16 * dScale));
        this.glowGraphics.lineStyle(s, 0xff8c3a, 0.25);
        this.glowGraphics.lineBetween(sx, py, tx, ty);
        this.glowGraphics.fillStyle(0xff8c3a, 0.32);
        this.glowGraphics.fillRect(sx - s, py - s, s * 2, s * 2);
        this.projGraphics.fillStyle(0xff8c3a, 1);
        this.projGraphics.fillRect(sx - Math.round(s / 2), py - Math.round(s * 0.6), s, Math.round(s * 1.2));
        this.projGraphics.fillStyle(0xffd166, 1);
        this.projGraphics.fillRect(sx - Math.round(s * 0.25), py - Math.round(s * 0.3), Math.round(s * 0.5), Math.round(s * 0.6));
      } else {
        const s = Math.max(4, Math.round(10 * dScale));
        this.glowGraphics.lineStyle(s, 0xb07cff, 0.22);
        this.glowGraphics.lineBetween(sx, py, tx, ty);
        this.glowGraphics.fillStyle(0xb07cff, 0.32);
        this.glowGraphics.fillRect(sx - s, py - s, s * 2, s * 2);
        this.projGraphics.fillStyle(0xb07cff, 1);
        this.projGraphics.fillRect(sx - Math.round(s / 2), py - Math.round(s / 2), s, s);
        this.projGraphics.fillStyle(0xf4f8ff, 1);
        this.projGraphics.fillRect(sx - 1, py - 1, Math.max(2, Math.round(s * 0.4)), Math.max(2, Math.round(s * 0.4)));
      }
    }

    // High-contrast pulsing enemy bullets (Boss Homing Missiles, Vulcan Needles, & Standard Orbs)
    const blink = Math.floor(this.pulseMs / 90) % 2 === 0;
    for (const eb of session.enemyBullets || []) {
      const bx = Math.round(eb.x);
      const by = Math.round(eb.y);
      if (eb.kind === "boss-missile") {
        // Destructible winged homing missile + exhaust flame + mini HP bar
        this.glowGraphics.fillStyle(0xff8c3a, 0.35);
        this.glowGraphics.fillCircle(bx, by, 14);
        this.projGraphics.fillStyle(0xff4b5c, 1);
        this.projGraphics.fillTriangle(bx, by + 12, bx - 7, by - 6, bx + 7, by - 6);
        this.projGraphics.fillStyle(blink ? 0xffd166 : 0xff8c3a, 1);
        this.projGraphics.fillRect(bx - 3, by - 13, 6, 8);
        if ((eb.hp || 0) < (eb.maxHp || 24)) {
          const r = Math.max(0, eb.hp / Math.max(1, eb.maxHp));
          this.projGraphics.fillStyle(0x050a14, 0.9);
          this.projGraphics.fillRect(bx - 10, by - 18, 20, 3);
          this.projGraphics.fillStyle(0xff8c3a, 1);
          this.projGraphics.fillRect(bx - 10, by - 18, Math.round(20 * r), 3);
        }
      } else if (eb.kind === "vulcan") {
        // High-speed Boss Vulcan needle burst
        this.glowGraphics.fillStyle(0xff4b5c, 0.38);
        this.glowGraphics.fillRect(bx - 4, by - 12, 8, 24);
        this.projGraphics.fillStyle(blink ? 0xff4b5c : 0xffd166, 1);
        this.projGraphics.fillRect(bx - 2, by - 9, 4, 18);
        this.projGraphics.fillStyle(0xffffff, 1);
        this.projGraphics.fillRect(bx - 1, by - 5, 2, 10);
      } else {
        this.glowGraphics.fillStyle(0xff3b6b, 0.35);
        this.glowGraphics.fillRect(bx - 10, by - 10, 20, 20);
        this.projGraphics.fillStyle(blink ? 0xff3b6b : 0xff8fa3, 1);
        this.projGraphics.fillRect(bx - 6, by - 6, 12, 12);
        this.projGraphics.fillStyle(0xffffff, 1);
        this.projGraphics.fillRect(bx - 3, by - 3, 6, 6);
      }
    }

    this.fxGraphics.clear();
    for (const s of this.smoke) {
      s.lifeMs -= dtMs;
      if (s.lifeMs <= 0) continue;
      const alpha = (s.lifeMs / s.maxLifeMs) * 0.38;
      const r = Math.max(3, Math.round(s.size * 0.5 * (1.4 - (s.lifeMs / s.maxLifeMs) * 0.4)));
      this.fxGraphics.fillStyle(0x2b3e55, alpha);
      this.fxGraphics.fillCircle(Math.round(s.x), Math.round(s.y), r);
    }
    this.smoke = this.smoke.filter((s) => s.lifeMs > 0);

    for (const c of this.chains) {
      c.lifeMs -= dtMs;
      if (c.lifeMs <= 0) continue;
      this.glowGraphics.lineStyle(6, c.color, (c.lifeMs / c.maxLifeMs) * 0.5);
      this.glowGraphics.lineBetween(Math.round(c.x1), Math.round(c.y1), Math.round(c.x2), Math.round(c.y2));
      this.fxGraphics.lineStyle(2, 0xffffff, c.lifeMs / c.maxLifeMs);
      this.fxGraphics.lineBetween(Math.round(c.x1), Math.round(c.y1), Math.round(c.x2), Math.round(c.y2));
    }
    this.chains = this.chains.filter((c) => c.lifeMs > 0);

    for (const b of this.bursts) {
      b.lifeMs -= dtMs;
      if (b.lifeMs <= 0) continue;
      const t = 1 - b.lifeMs / b.maxLifeMs;
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      const radius = Math.max(6, Math.round(b.size * (0.25 + t * 0.65)));
      const fade = 1 - t;

      if (b.kind === "chevron") {
        // Directional upward blast chevrons (^^^), never a plain giant circle!
        this.fxGraphics.lineStyle(Math.max(2, 4 * fade), b.color, fade);
        this.fxGraphics.lineBetween(bx - radius, by + Math.round(radius * 0.35), bx, by - Math.round(radius * 0.45));
        this.fxGraphics.lineBetween(bx, by - Math.round(radius * 0.45), bx + radius, by + Math.round(radius * 0.35));
      } else if (b.kind === "prism") {
        // Rotating 6-point star prism vortex for Magnet Singularity (no giant circle!)
        const rot = t * Math.PI * 1.5;
        for (let k = 0; k < 6; k += 1) {
          const a0 = rot + (k * Math.PI) / 3;
          const a1 = a0 + Math.PI / 3;
          const rOuter = radius;
          const rInner = Math.round(radius * 0.42);
          this.fxGraphics.lineStyle(2.5, k % 2 === 0 ? b.color : 0x43cff4, fade);
          this.fxGraphics.lineBetween(
            Math.round(bx + Math.cos(a0) * rOuter),
            Math.round(by + Math.sin(a0) * rOuter),
            Math.round(bx + Math.cos(a1) * rInner),
            Math.round(by + Math.sin(a1) * rInner)
          );
        }
      } else {
        // Crisp 8-ray radial pixel star sparks (replaces plain circles on hits & explosions)
        this.glowGraphics.fillStyle(b.color, fade * 0.22);
        this.glowGraphics.fillCircle(bx, by, Math.round(radius * 0.5));
        for (let k = 0; k < 8; k += 1) {
          const ang = (k / 8) * Math.PI * 2 + t * 0.9;
          const r0 = Math.round(radius * 0.35);
          const r1 = radius;
          this.fxGraphics.lineStyle(Math.max(1.5, 3 * fade), k % 2 === 0 ? b.color : 0xffd166, fade);
          this.fxGraphics.lineBetween(
            Math.round(bx + Math.cos(ang) * r0),
            Math.round(by + Math.sin(ang) * r0),
            Math.round(bx + Math.cos(ang) * r1),
            Math.round(by + Math.sin(ang) * r1)
          );
        }
      }
    }
    this.bursts = this.bursts.filter((b) => b.lifeMs > 0);

    // Gaussian-splatting style multi-ring additive pixel bloom puffs
    for (const sp of this.splats) {
      sp.lifeMs -= dtMs;
      if (sp.lifeMs <= 0) continue;
      sp.x += sp.vx * dtSec;
      sp.y += sp.vy * dtSec;
      sp.vx *= 0.94;
      sp.vy *= 0.94;
      const t = 1 - sp.lifeMs / sp.maxLifeMs;
      const fade = 1 - t;
      const rx = Math.round(sp.x);
      const ry = Math.round(sp.y);
      const rad = Math.max(4, Math.round(sp.r * (0.7 + t * 0.85)));
      this.glowGraphics.fillStyle(sp.color, fade * 0.14);
      this.glowGraphics.fillCircle(rx, ry, rad);
      this.glowGraphics.fillStyle(sp.color, fade * 0.24);
      this.glowGraphics.fillCircle(rx, ry, Math.round(rad * 0.58));
      this.glowGraphics.fillStyle(0xfff4d6, fade * 0.32);
      this.glowGraphics.fillCircle(rx, ry, Math.max(2, Math.round(rad * 0.24)));
    }
    this.splats = this.splats.filter((sp) => sp.lifeMs > 0);

    for (const d of this.debris) {
      d.lifeMs -= dtMs;
      if (d.lifeMs <= 0) continue;
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      d.vx *= 0.93;
      d.vy *= 0.93;
      this.fxGraphics.fillStyle(d.color, Math.max(0.25, d.lifeMs / d.maxLifeMs));
      this.fxGraphics.fillRect(Math.round(d.x), Math.round(d.y), d.size, d.size);
    }
    this.debris = this.debris.filter((d) => d.lifeMs > 0);

    for (const p of this.popups) {
      p.lifeMs -= dtMs;
      if (p.lifeMs <= 0) {
        p.text.destroy();
        continue;
      }
      p.text.y -= dtSec * 38;
      p.text.setAlpha(Math.min(1, p.lifeMs / 240));
    }
    this.popups = this.popups.filter((p) => p.lifeMs > 0);
  }

  destroy() {
    this.glowGraphics.destroy();
    this.projGraphics.destroy();
    this.fxGraphics.destroy();
    for (const p of this.popups) p.text.destroy();
    this.bursts = [];
    this.splats = []; // Gaussian-splatting style additive pixel bloom puffs
    this.chains = [];
    this.debris = [];
    this.smoke = [];
    this.popups = [];
  }
}
