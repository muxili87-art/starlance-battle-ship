import Phaser from "phaser";
import { BOSS_HARDPOINTS } from "../core/stage-director.js";

const ASSET_BASE = import.meta.env.BASE_URL;
const MANIFEST_KEY = "solo-assets";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.json(MANIFEST_KEY, ASSET_BASE + "assets/manifest.json");
  }

  create() {
    const manifest = this.cache.json.get(MANIFEST_KEY);
    if (!manifest) {
      this.#showError();
      return;
    }

    const entries = [...manifest.fighters, ...manifest.enemies, ...manifest.bosses];
    const backgrounds = manifest.backgrounds ?? [];
    for (const entry of entries) this.load.image(entry.id, ASSET_BASE + entry.path);
    for (const bg of backgrounds) this.load.image(bg.id, ASSET_BASE + bg.path);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (entries.some(({ id }) => !this.textures.exists(id))) {
        this.#showError();
        return;
      }

      for (const bg of backgrounds) {
        if (this.textures.exists(bg.id)) {
          this.textures.get(bg.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      }

      for (const { id, category } of entries) {
        const texture = this.textures.get(id);
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (this.game.renderer.type === Phaser.CANVAS) {
          this.#canvasTints(id, texture.getSourceImage(), category !== "fighter");
        }
        if (category === "boss") this.#bossDamageTextures(id, texture.getSourceImage());
      }
      this.registry.set("solo-assets", manifest);
      this.registry.set("fighter-id", manifest.fighters[0].id);
      this.registry.set("game-mode", "campaign");
      this.registry.set("game-difficulty", "standard");
      this.scene.start("MenuScene");
    });
    this.load.start();
  }

  #derived(key, source, draw) {
    const texture = this.textures.createCanvas(key, source.width, source.height);
    const context = texture.getContext();
    context.drawImage(source, 0, 0);
    draw(context, source.width, source.height);
    texture.refresh();
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return texture.getSourceImage();
  }

  #canvasTints(id, source, enemy) {
    const fill = (key, color) => this.#derived(id + "-" + key, source, (ctx, w, h) => {
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    });
    fill("shadow", "#02060e");
    if (!enemy) return;
    fill("white", "#fff");
    this.#derived(id + "-ice", source, (ctx, w, h) => {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "#64caff99";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    });
  }

  #bossDamageTextures(id, original) {
    for (let mask = 1; mask <= 3; mask++) {
      const key = id + "-damage-" + mask;
      const damage = this.#derived(key, original, (ctx) => {
        for (const [index, part] of BOSS_HARDPOINTS[id].slice(0, 2).entries()) {
          if (!(mask & (1 << index))) continue;
          const { x, y, cut: [width, height] } = part;
          const top = y - height / 2;
          ctx.globalCompositeOperation = "destination-out";
          for (const [row, span] of [0.58, 0.84, 1, 0.75].entries()) {
            const size = Math.round(width * span);
            ctx.fillRect(Math.round(x - size / 2), Math.round(top + row * height / 4), size, Math.ceil(height / 4));
          }
          ctx.globalCompositeOperation = "source-atop";
          ctx.fillStyle = "#44252a9e";
          ctx.fillRect(Math.round(x - width / 2 - 4), Math.round(top - 4), width + 8, height + 8);
          ctx.globalCompositeOperation = "source-over";
        }
      });
      if (this.game.renderer.type === Phaser.CANVAS) this.#canvasTints(key, damage, true);
    }
  }

  #showError() {
    document.querySelector("#solo-ui").textContent = "素材载入失败，请刷新后重试。";
  }
}
