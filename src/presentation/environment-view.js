import { Mode7Ground } from "./mode7-ground.js";

const HEIGHT = 1280;
const WIDTH = 720;

export class EnvironmentView {
  constructor(scene) {
    this.mode7 = new Mode7Ground(scene);
    this.stars = scene.add.graphics().setDepth(2);
    this.vignette = scene.add.graphics().setDepth(3);
    this.#drawVignette();
    this.timeMs = 0;

    const palette = [0xffffff, 0xffffff, 0xc8e4ff, 0x33ddcc, 0xffd13b];
    this.field = [28, 16, 10].flatMap((count, depth) =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        speed: 36 + depth * 32 + Math.random() * 18,
        size: depth === 2 && i % 3 === 0 ? 4 : 2 + depth,
        depth,
        color: palette[(i + depth) % palette.length],
        cross: depth === 2 && i % 4 === 0,
        phase: Math.random() * Math.PI * 2,
      })),
    );

    // Distant diagonal battlefield tracer streaks (matches Dir 1 arcade opera atmosphere)
    this.tracers = Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      len: 18 + (i % 3) * 10,
      speed: 240 + (i % 4) * 55,
      side: i % 2 === 0 ? 1 : -1,
    }));
  }

  #drawVignette() {
    const v = this.vignette;
    for (let i = 0; i < 5; i++) {
      const w = 12;
      const a = 0.28 - i * 0.05;
      v.fillStyle(0x050814, a);
      v.fillRect(i * w, 0, w, HEIGHT);
      v.fillRect(WIDTH - (i + 1) * w, 0, w, HEIGHT);
    }
  }

  render(flight, dtMs) {
    this.mode7.render(flight, dtMs);
    this.timeMs += dtMs;
    const dt = dtMs / 1000;
    const warp = flight.warpDashMs > 0;
    const boost = warp ? 5.5 : flight.overload ? 1.8 : 1;
    const g = this.stars.clear();

    for (const tr of this.tracers) {
      tr.x += tr.side * tr.speed * 0.48 * dt;
      tr.y += tr.speed * 1.15 * dt;
      if (tr.y > HEIGHT + 40 || tr.x < -40 || tr.x > WIDTH + 40) {
        tr.x = tr.side > 0 ? Math.random() * 240 : WIDTH - Math.random() * 240;
        tr.y = -20 - Math.random() * 260;
      }
      g.lineStyle(2, 0xffaa44, 0.32).lineBetween(tr.x, tr.y, tr.x - tr.side * tr.len * 0.45, tr.y - tr.len);
      g.lineStyle(1, 0xffffff, 0.45).lineBetween(tr.x, tr.y, tr.x - tr.side * tr.len * 0.22, tr.y - tr.len * 0.5);
    }

    for (const star of this.field) {
      const depth = star.depth + 1;
      star.x = (star.x - flight.ship.vx * 0.018 * depth * dt + WIDTH) % WIDTH;
      star.y = (star.y + star.speed * boost * dt) % HEIGHT;
      const x = Math.round(star.x / 2) * 2;
      const y = Math.round(star.y / 2) * 2;
      const twinkle = 0.72 + 0.28 * Math.sin(this.timeMs * 0.005 + star.phase);

      if (warp) {
        const length = 16 + depth * 14;
        const lean = Math.round((x - WIDTH / 2) * (0.016 + depth * 0.012));
        g.lineStyle(star.size + 2, 0x33ddcc, 0.28).lineBetween(x - lean, y - length, x, y);
        g.lineStyle(Math.max(1, star.size - 1), 0xffffff, (0.28 + depth * 0.14) * twinkle).lineBetween(x - lean, y - length, x, y);
      } else if (star.cross) {
        const a = (0.34 + depth * 0.1) * twinkle;
        g.fillStyle(star.color, a);
        g.fillRect(x - 4, y - 1, 8, 2);
        g.fillRect(x - 1, y - 4, 2, 8);
        g.fillStyle(0xffffff, a * 1.15);
        g.fillRect(x - 1, y - 1, 2, 2);
      } else {
        g.fillStyle(star.color, (0.16 + depth * 0.09) * twinkle);
        g.fillRect(x, y, star.size, star.size);
      }
    }
  }

  destroy() {
    this.mode7.destroy();
    this.stars.destroy();
    this.vignette.destroy();
  }
}
