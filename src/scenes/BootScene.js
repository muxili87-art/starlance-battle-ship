import Phaser from "phaser";
import { preloadArtCatalog } from "../presentation/asset-catalog.js";
import { MatchRoom } from "../state/match-room.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    preloadArtCatalog(this);
    const room = new MatchRoom();
    this.registry.set("room", room);
    this.scene.start("MenuScene");
  }
}
