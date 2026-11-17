/**
 * Deep-Space 3D Perspective Star-Depth & Dithered Nebula Backdrop:
 * - Zero jagged road/track cones or flat solid stripes
 * - Pixel-dithered cosmic nebula ribbon + subtle 3D depth star-waypoints
 */
export class Mode7Ground {
  constructor(scene) {
    this.scene = scene;
    this.w = 180;
    this.h = 260;
    this.horizonY = 26;
    this.scrollZ = 0;

    if (!scene.textures.exists("mode7-ground")) {
      this.tex = scene.textures.createCanvas("mode7-ground", this.w, this.h);
      this.tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.tex = scene.textures.get("mode7-ground");
    }

    this.sprite = scene.add
      .image(360, 760, "mode7-ground")
      .setDisplaySize(720, 1040)
      .setDepth(1);
  }

  render(session, dtMs) {
    const dtSec = dtMs / 1000;
    const speedFactor = session.activeForm === "pulse" ? 1.45 : session.activeForm === "heavy" ? 1.0 : 1.2;
    const overloadBoost = session.core.overloadActive ? 2.8 : 1.0;
    const dashBoost = (session.warpDashMs || 0) > 0 ? 3.8 : 1.0;
    this.scrollZ += dtSec * 4.8 * speedFactor * overloadBoost * dashBoost;

    const ctx = this.tex.getContext();
    const w = this.w;
    const h = this.h;
    const cx = w * 0.5;
    const focal = 68;
    const camHeight = 28;
    const overloadScale = session.core.overloadActive ? 2.6 : 1.0;
    const camTiltX = ((session.ship.x - 360) / 360) * 2.4 * overloadScale;

    const formAccent =
      session.core.overloadActive
        ? [255, 140, 58]
        : session.activeForm === "heavy"
          ? [255, 140, 58]
          : session.activeForm === "magnet"
            ? [176, 124, 255]
            : [67, 207, 244];

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Deep-space cosmic void with diagonal pixel-dithered nebula ribbon (no giant flat circles!)
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const diag = (x * 0.65 + y * 0.9 - 120) / 68;
        const ribbon = Math.max(0, 1 - Math.abs(diag) * 0.85);
        // 2x2 Bayer-style pixel dither for crisp retro pixel nebula texture
        const dither = ((x & 1) ^ (y & 1)) * 0.18 + ((x & 2) ? 0.08 : 0);
        const neb = Math.max(0, ribbon - dither) * 0.55;

        const idx = (y * w + x) * 4;
        data[idx] = Math.round(4 + neb * formAccent[0] * 0.14);
        data[idx + 1] = Math.round(7 + neb * (formAccent[1] * 0.12 + 8));
        data[idx + 2] = Math.round(14 + neb * (formAccent[2] * 0.16 + 18));
        data[idx + 3] = 255;
      }
    }

    // Subtle 3D perspective tactical waypoint dots (replaces jagged road lines & cone wedges)
    for (let y = this.horizonY + 4; y < h; y += 1) {
      const row = y + 0.5 - this.horizonY;
      const depth = (camHeight * focal) / row;
      const gz = depth * 0.24 + this.scrollZ;
      const zCell = gz - Math.floor(gz);
      if (zCell > 0.09) continue;

      const fog = Math.max(0.1, Math.min(0.85, 1 - depth / 190));
      for (const latTarget of [-21.5, -7.2, 7.2, 21.5]) {
        const screenXf = cx + ((latTarget - camTiltX) * focal) / depth;
        const sx = Math.round(screenXf);
        if (sx < 1 || sx >= w - 1) continue;
        const idx = (y * w + sx) * 4;
        data[idx] = Math.min(255, Math.round(data[idx] + formAccent[0] * 0.42 * fog));
        data[idx + 1] = Math.min(255, Math.round(data[idx + 1] + formAccent[1] * 0.42 * fog));
        data[idx + 2] = Math.min(255, Math.round(data[idx + 2] + formAccent[2] * 0.42 * fog));
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this.tex.refresh();
  }

  destroy() {
    this.sprite.destroy();
  }
}
