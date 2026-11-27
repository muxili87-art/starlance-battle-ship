import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { BattleScene } from "./scenes/BattleScene.js";
import "./ui/styles.css";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 720,
  height: 1280,
  backgroundColor: "#0d1024",
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  render: { pixelArt: true, antialias: false, roundPixels: true, powerPreference: "high-performance" },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [BootScene, MenuScene, BattleScene],
};

window.__BATTLE_SHIP_GAME__ = new Phaser.Game(config);
