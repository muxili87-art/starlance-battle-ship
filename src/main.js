import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { BattleScene } from "./scenes/BattleScene.js";
import { OverlayScene } from "./scenes/OverlayScene.js";
import "./ui/styles.css";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 720,
  height: 1280,
  backgroundColor: "#060b14",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: { pixelArt: true, antialias: false, roundPixels: true, powerPreference: "high-performance" },
  input: { activePointers: 2 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [BootScene, MenuScene, BattleScene, OverlayScene],
};

window.__BATTLE_SHIP_GAME__ = new Phaser.Game(config);
