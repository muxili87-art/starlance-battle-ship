import { CORE_LAYOUT } from "../core/combat-rules.js";

/**
 * Pixel-art Guardian Energy Core renderer (4x integer scale shell + crisp pixel arc).
 */
export class CoreRenderer {
  constructor(scene) {
    this.scene = scene;
    this.shell = scene.add.image(360, CORE_LAYOUT.centerY, "px-core-shell").setScale(2.7).setDepth(18);
    this.graphics = scene.add.graphics().setDepth(19);
    this.pulsePhase = 0;
  }

  render(core, dtMs) {
    this.pulsePhase += dtMs * 0.006;
    this.graphics.clear();

    const cx = 360;
    const cy = CORE_LAYOUT.centerY;
    const hpRatio = Math.max(0, Math.min(1, core.hp / Math.max(1, core.maxHp)));
    const energyRatio = Math.max(0, Math.min(1, core.energy / Math.max(1, core.maxEnergy)));

    // 10-segment octagonal reactor durability frame (replaces plain simple circle!)
    const totalSegments = 8;
    const litSegments = Math.ceil(hpRatio * totalSegments);
    const r = CORE_LAYOUT.integrityRadius - 6;
    for (let i = 0; i < totalSegments; i += 1) {
      const a0 = -Math.PI / 2 + (i * Math.PI * 2) / totalSegments + 0.08;
      const a1 = -Math.PI / 2 + ((i + 1) * Math.PI * 2) / totalSegments - 0.08;
      const active = i < litSegments;
      this.graphics.lineStyle(3.5, active ? 0x9be8ff : 0x24364a, active ? 0.95 : 0.45);
      this.graphics.lineBetween(
        Math.round(cx + Math.cos(a0) * r),
        Math.round(cy + Math.sin(a0) * r),
        Math.round(cx + Math.cos(a1) * r),
        Math.round(cy + Math.sin(a1) * r)
      );
    }

    // 4-state octagonal / diamond pixel energy core
    if (core.overloadActive) {
      const pulse = 0.72 + 0.28 * Math.sin(this.pulsePhase * 2.5);
      const dR = Math.round(42 + pulse * 4);
      this.graphics.lineStyle(2.5, 0xff8c3a, 0.9 * pulse);
      for (const [sx, sy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        this.graphics.lineBetween(cx + sx * dR, cy + sy * dR, cx + sy * dR, cy - sx * dR);
      }
      this.graphics.fillStyle(0xff8c3a, 0.24 * pulse);
      this.graphics.fillCircle(cx, cy, 26);
      this.graphics.fillStyle(0xffd166, 1);
      this.graphics.fillRect(cx - 8, cy - 8, 16, 16);
    } else if (energyRatio >= 1) {
      const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase * 2.2);
      const dr = Math.round(42 + pulse * 5);
      // Rotating diamond-octagonal overload readiness frame
      this.graphics.lineStyle(2.5, 0xff8c3a, 0.95);
      for (let k = 0; k < 4; k += 1) {
        const a0 = this.pulsePhase * 0.6 + (k * Math.PI) / 2;
        const a1 = a0 + Math.PI / 2;
        this.graphics.lineBetween(
          Math.round(cx + Math.cos(a0) * dr),
          Math.round(cy + Math.sin(a0) * dr),
          Math.round(cx + Math.cos(a1) * dr),
          Math.round(cy + Math.sin(a1) * dr)
        );
      }
      // Corner lock chevrons
      this.graphics.lineStyle(2, 0x43cff4, 0.9);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        this.graphics.lineBetween(cx + sx * 34, cy + sy * 34, cx + sx * 24, cy + sy * 34);
        this.graphics.lineBetween(cx + sx * 34, cy + sy * 34, cx + sx * 34, cy + sy * 24);
      }
      this.graphics.fillStyle(0x43cff4, 0.95);
      this.graphics.fillRect(cx - 10, cy - 10, 20, 20);
    } else {
      const s = Math.max(5, Math.round(11 * (0.4 + energyRatio * 0.6)));
      this.graphics.fillStyle(0x43cff4, 0.35 + energyRatio * 0.6);
      this.graphics.fillRect(cx - s, cy - s, s * 2, s * 2);
      if (energyRatio > 0.05) {
        this.graphics.lineStyle(2, 0x43cff4, 0.75);
        this.graphics.beginPath();
        this.graphics.arc(cx, cy, r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * energyRatio, false);
        this.graphics.strokePath();
      }
    }
  }

  destroy() {
    this.shell.destroy();
    this.graphics.destroy();
  }
}
