import Phaser from "phaser";

const STAGE_BG_KEYS = {
  1: "stage1_carrier",
  2: "stage2_asteroid",
  3: "stage3_overmind",
};

export class Mode7Ground {
  constructor(scene) {
    this.scene = scene;
    this.stage = 1;
    this.sprite = null;
    this.veil = scene.add.rectangle(360, 640, 720, 1280, 0x070a18, 0.28).setDepth(1.1);
    this.#bindTexture(1);
  }

  #ensureSeamlessTexture(key) {
    const seamlessKey = `${key}-seamless`;
    if (this.scene.textures.exists(seamlessKey)) return seamlessKey;
    const src = this.scene.textures.get(key).getSourceImage();
    const w = src.width;
    const h = src.height;
    const tex = this.scene.textures.createCanvas(seamlessKey, w, h * 2);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    ctx.save();
    ctx.translate(0, h * 2);
    ctx.scale(1, -1);
    ctx.drawImage(src, 0, 0);
    ctx.restore();
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return seamlessKey;
  }

  #bindTexture(stage) {
    const key = STAGE_BG_KEYS[stage] ?? STAGE_BG_KEYS[1];
    if (!this.scene.textures.exists(key)) return;
    const src = this.scene.textures.get(key).getSourceImage();
    const scale = 720 / src.width;
    const seamlessKey = this.#ensureSeamlessTexture(key);
    if (!this.sprite) {
      this.sprite = this.scene.add.tileSprite(360, 640, 720, 1280, seamlessKey)
        .setTileScale(scale, scale)
        .setDepth(0.5);
    } else if (this.sprite.texture.key !== seamlessKey) {
      this.sprite.setTexture(seamlessKey).setTileScale(scale, scale);
    }
  }

  render({ ship, overload, warpDashMs, stage = 1 }, dtMs) {
    if (this.stage !== stage) {
      this.stage = stage;
      this.#bindTexture(stage);
    }
    if (!this.sprite) return;
    const boost = warpDashMs > 0 ? 5.2 : overload ? 2.1 : 1;
    const pxPerMs = (0.085 * boost) / this.sprite.tileScaleY;
    this.sprite.tilePositionY -= dtMs * pxPerMs;
    this.sprite.tilePositionX = ((ship.x - 360) * 0.05) / this.sprite.tileScaleX;
    this.veil.setFillStyle(overload ? 0x0b0618 : 0x070a18, overload ? 0.42 : 0.28);
  }

  destroy() {
    this.sprite?.destroy();
    this.veil.destroy();
  }
}
