import { Mode7Ground } from "./mode7-ground.js";
import { ensurePixelMoon, ensurePixelPlanet } from "./pixel-ui.js";

/**
 * True Outer-Space 3D Flight Environment (Replaces Highway Poles & Flat Horizon):
 * - Full-viewport volumetric pixel nebula clouds & deep-space cosmos (no flat horizon cutoff)
 * - Shaded ringed gas giant + orbiting moon + parallax twinkling starfield
 * - 3D-projected Floating Asteroids & Space Debris rushing past in depth (z=1.0 -> 0.08)
 * - Hyperspace 3D warp star streaks across the whole viewport
 */
export class EnvironmentView {
  constructor(scene) {
    this.scene = scene;
    this.mode7 = new Mode7Ground(scene);
    this.skyGraphics = scene.add.graphics().setDepth(1.5);
    this.planetFrames = [0, 1, 2, 3].map((f) => ensurePixelPlanet(scene, "px-gas-giant", f));
    this.planetSprite = scene.add.image(560, 232, this.planetFrames[0]).setScale(2.3).setDepth(1.8);
    this.moonSprite = scene.add.image(145, 205, ensurePixelMoon(scene)).setScale(1.6).setDepth(1.8);
    this.debrisGfx = scene.add.graphics().setDepth(2.5);
    this.warpStarsGfx = scene.add.graphics().setDepth(2);
    this.overloadVeil = scene.add.rectangle(360, 640, 720, 1280, 0x05020a, 0).setDepth(3);
    this.timeMs = 0;

    this.stars = Array.from({ length: 84 }, (_, i) => ({
      x: Math.random() * 720,
      y: 136 + Math.random() * 980,
      size: i % 5 === 0 ? 3 : 2,
      speed: 6 + (i % 4) * 5,
      phase: Math.random() * Math.PI * 2,
    }));

    this.warpStars = Array.from({ length: 52 }, () => this.#spawnWarpStar(true));

    // 3D Space Asteroids & Orbital Debris drifting past on the flanks (replaces highway poles!)
    this.asteroids = Array.from({ length: 12 }, (_, i) => ({
      z: 0.1 + i * 0.085,
      side: i % 2 === 0 ? -1 : 1,
      lateralFactor: 0.72 + (i % 3) * 0.24,
      yBias: -0.35 + ((i * 37) % 10) * 0.08,
      shade: i % 2 === 0 ? 0x2b3e55 : 0x3a4f69,
    }));
  }

  #spawnWarpStar(randomAge = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomAge ? 15 + Math.random() * 540 : 8 + Math.random() * 24;
    return { angle, dist, speed: 200 + Math.random() * 310 };
  }

  render(session, dtMs) {
    const dtSec = dtMs / 1000;
    this.timeMs += dtMs;
    this.mode7.render(session, dtMs);

    const overload = session.core.overloadActive;
    const dashing = (session.warpDashMs || 0) > 0;
    const horizonGlow =
      overload || session.activeForm === "heavy" ? 0xff8c3a : session.activeForm === "magnet" ? 0xb07cff : 0x43cff4;
    const camOffsetX = ((session.ship.x - 360) / 360) * 42;

    // 1. Deep-Space Cosmos + 4-Frame Animated Pixel Gas Giant + Cratered Moon
    this.skyGraphics.clear();
    const pFrame = Math.floor(this.timeMs / 420) % this.planetFrames.length;
    this.planetSprite
      .setTexture(this.planetFrames[pFrame])
      .setPosition(Math.round(560 - camOffsetX * 0.45), 232 + Math.round(Math.sin(this.timeMs * 0.001) * 3));
    this.moonSprite.setPosition(
      Math.round(145 - camOffsetX * 0.3 + Math.cos(this.timeMs * 0.0007) * 14),
      205 + Math.round(Math.sin(this.timeMs * 0.0007) * 4)
    );

    // Full-viewport twinkling starfield
    for (const st of this.stars) {
      st.x -= (st.speed + (session.ship.vx || 0) * 0.03) * dtSec;
      if (st.x < 0) st.x += 720;
      if (st.x > 720) st.x -= 720;
      const alpha = 0.2 + 0.45 * Math.sin(this.timeMs * 0.004 + st.phase);
      this.skyGraphics.fillStyle(0xcbe2f7, Math.max(0.12, alpha));
      this.skyGraphics.fillRect(Math.round(st.x), Math.round(st.y), st.size, st.size);
    }

    // 2. 3D Space Asteroids & Orbital Wreckage rushing past in 3D depth (replaces highway poles)
    this.debrisGfx.clear();
    const zSpeed = (overload ? 1.55 : 0.65) * (dashing ? 3.4 : 1.0);
    const vx0 = 360 - camOffsetX * 1.4;
    const vy0 = 340;

    for (const ast of this.asteroids) {
      ast.z -= zSpeed * dtSec;
      if (ast.z <= 0.08) ast.z += 0.96;

      const invZ = 1 / ast.z;
      const screenY = vy0 + invZ * (78 + ast.yBias * 24);
      if (screenY > 1130 || screenY < 210) continue;

      const sx = Math.round(vx0 + ast.side * invZ * 78 * ast.lateralFactor);
      const sy = Math.round(screenY);
      const size = Math.max(4, Math.round(invZ * 4.5));
      const alpha = Math.min(0.85, Math.max(0.14, 1.1 - ast.z));

      // Pixelated beveled asteroid chunk
      this.debrisGfx.fillStyle(0x101722, alpha);
      this.debrisGfx.fillRect(sx - size, sy - Math.round(size * 0.7), size * 2, Math.round(size * 1.4));
      this.debrisGfx.fillStyle(ast.shade, alpha);
      this.debrisGfx.fillRect(sx - size + 2, sy - Math.round(size * 0.7) + 2, size * 2 - 4, Math.round(size * 1.4) - 4);
      this.debrisGfx.fillStyle(horizonGlow, alpha * 0.35);
      this.debrisGfx.fillRect(sx - size + 2, sy - Math.round(size * 0.7) + 2, Math.max(2, Math.round(size * 0.7)), 2);
    }

    // 3. 3D rushing hyperspace warp stars radiating from center vanishing point
    this.warpStarsGfx.clear();
    const warpMult = (overload ? 2.6 : 1.0) * (dashing ? 3.6 : 1.0);
    for (const ws of this.warpStars) {
      ws.dist += ws.speed * warpMult * dtSec;
      if (ws.dist > 680) {
        Object.assign(ws, this.#spawnWarpStar(false));
      }
      const x1 = vx0 + Math.cos(ws.angle) * ws.dist;
      const y1 = 330 + Math.sin(ws.angle) * ws.dist * 0.92;
      if (y1 < 138 || y1 > 1135 || x1 < -20 || x1 > 740) continue;

      const len = dashing ? 34 : overload ? 26 : 10;
      const x2 = x1 - Math.cos(ws.angle) * len;
      const y2 = y1 - Math.sin(ws.angle) * len * 0.92;
      const alpha = Math.min(0.85, ws.dist / 240);
      this.warpStarsGfx.lineStyle(dashing || overload ? 2 : 1.5, dashing ? 0x43cff4 : overload ? 0xffd166 : 0xb7d4ec, alpha * (dashing ? 0.85 : 0.6));
      this.warpStarsGfx.lineBetween(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));
    }

    this.overloadVeil.setFillStyle(0x160a22, overload ? 0.14 : 0);
  }

  destroy() {
    this.mode7.destroy();
    this.skyGraphics.destroy();
    this.planetSprite.destroy();
    this.moonSprite.destroy();
    this.debrisGfx.destroy();
    this.warpStarsGfx.destroy();
    this.overloadVeil.destroy();
  }
}
