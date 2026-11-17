import Phaser from "phaser";
import { LanClient } from "../net/lan-client.js";
import { CHASSIS_CATALOG } from "../state/match-room.js";
import { SpriteStackedFighter } from "../presentation/sprite-stacker.js";
import { ensurePixelIcon, ensurePixelPanel, ensurePixelPlanet } from "../presentation/pixel-ui.js";
import { WEAPON_FORMS } from "../core/weapon-forms.js";

/**
 * High-Craft Pixel-Art Hangar Launch Screen:
 * - Crisp 72x48 pixel-dithered ringed gas giant + orbiting moon + 3D radial warp starfield
 * - Animated holographic rotating projector pad + live thruster plumes & wingtip ion trails
 * - Zero jarring crossing lines behind UI buttons
 * - Authentic NEAREST-filtered beveled metallic pixel buttons with unclipped typography
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const room = this.registry.get("room");
    room.setChassis("viper");
    this.timeMs = 0;

    this.bgGfx = this.add.graphics().setDepth(0);
    this.padGfx = this.add.graphics().setDepth(6);
    this.trailGfx = this.add.graphics().setDepth(18);
    this.uiGfx = this.add.graphics().setDepth(28);

    // 4-frame animated pixel-dithered ringed gas giant + small moon
    this.planetFrames = [0, 1, 2, 3].map((f) => ensurePixelPlanet(this, "px-gas-giant", f));
    this.planet = this.add.image(585, 290, this.planetFrames[0]).setScale(2.6).setDepth(3);
    this.stars = Array.from({ length: 72 }, (_, i) => ({
      x: Math.random() * 720,
      y: Math.random() * 1280,
      speed: 45 + (i % 5) * 40,
      size: i % 6 === 0 ? 3 : 2,
      alpha: 0.22 + (i % 4) * 0.16,
    }));
    this.warpStreaks = Array.from({ length: 34 }, () => this.#spawnWarp(true));

    // Single Hero Fighter (A-Type Arrowhead Interceptor)
    this.heroFighter = new SpriteStackedFighter(this, "viper");
    this.heroForms = ["pulse", "heavy", "magnet"];
    this.trailPoints = [];

    // Open-canvas layered title typography (padded to prevent CJK ascender clipping)
    const titleStyle = {
      fontSize: "58px",
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontStyle: "bold",
      padding: { x: 8, y: 10 },
    };
    this.add.text(364, 152, "星 穹 矢 刃", { ...titleStyle, color: "#0b2436" }).setOrigin(0.5).setDepth(29);
    this.add.text(360, 148, "星 穹 矢 刃", { ...titleStyle, color: "#eef6ff" }).setOrigin(0.5).setDepth(30);
    this.add
      .text(360, 206, "STARLANCE // ZERO  ·  A型 尖锐矢刃战机", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#43cff4",
        fontStyle: "bold",
        letterSpacing: 2,
        padding: { x: 6, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    // Subtle open-canvas divider chevron under title
    this.uiGfx.lineStyle(2, 0x43cff4, 0.55);
    this.uiGfx.lineBetween(150, 228, 330, 228);
    this.uiGfx.lineBetween(390, 228, 570, 228);
    this.uiGfx.fillStyle(0xffd166, 0.9);
    this.uiGfx.fillCircle(360, 228, 3);

    // Live weapon-form telemetry pill below the hero fighter
    this.formLabel = this.add
      .text(360, 562, "", {
        fontSize: "14px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#43cff4",
        fontStyle: "bold",
        padding: { x: 6, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    // Live pilot callsign & multi-fighter chassis selector pills
    this.callsignBtn = this.add
      .text(196, 614, `呼号: ${room.localCallsign} [改名]`, {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ffd166",
        fontStyle: "bold",
        backgroundColor: "#0e1a2b",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const next = window.prompt("输入你的飞行员英文/中文呼号（最多12字）：", room.localCallsign);
        if (next && next.trim()) {
          room.setLocalCallsign(next);
          this.callsignBtn.setText(`呼号: ${room.localCallsign} [改名]`);
        }
      });

    const curChassis = CHASSIS_CATALOG[room.selectedChassis] || CHASSIS_CATALOG.viper;
    this.chassisBtn = this.add
      .text(490, 614, `战机: ${curChassis.name} [切换]`, {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: `#${curChassis.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
        backgroundColor: "#0e1a2b",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const info = room.cycleChassis();
        this.chassisBtn.setText(`战机: ${info.name} [切换]`).setColor(`#${info.color.toString(16).padStart(6, "0")}`);
        this.chassisTraitText.setText(`战机特性：${info.desc}`).setColor(`#${info.color.toString(16).padStart(6, "0")}`);
        room.lanClient?.selectChassis(info.id);
      });

    this.chassisTraitText = this.add
      .text(360, 646, `战机特性：${curChassis.desc}`, {
        fontSize: "12px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: `#${curChassis.color.toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    // Pixel-art beveled launch buttons (clean space below with zero crossing lines)
    this.#makePixelButton(360, 708, 480, 74, "▶  立即出击 · 4人竞速", "1 玩家  +  3 领航AI  ·  同屏抢怪", 0x43cff4, 0x0d2136, () => {
      room.setupSoloWithBots("endless");
      this.scene.start("BattleScene");
    });

    this.#makePixelButton(360, 808, 440, 64, "◈  局域网联机 · 创建 / 加入房间", "LAN 4390 · 选机准备 · 房主开局", 0xb07cff, 0x15132b, async () => {
      await this.#openLanLobby(room);
    });

    this.lanStatus = this.add
      .text(360, 856, "", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#93a7bd",
        padding: { x: 6, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    // Clean borderless bottom keybind legend
    this.add
      .text(360, 1085, "[A / D] 航道机动    [1 / 2 / 3] 武装变形    [Space] 释放技能", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#b7cce0",
        padding: { x: 6, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.add
      .text(360, 1116, "[F] 第一视角俯冲过载    [Shift] 360° 战术翻滚", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ffd166",
        padding: { x: 6, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(30);
  }

  #spawnWarp(randomAge = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomAge ? 40 + Math.random() * 480 : 30 + Math.random() * 30;
    return { angle, dist, speed: 150 + Math.random() * 220 };
  }

  update(_time, delta) {
    const dtMs = Math.min(50, delta);
    const dtSec = dtMs / 1000;
    this.timeMs += dtMs;

    this.bgGfx.clear();
    this.bgGfx.fillStyle(0x04070e, 1);
    this.bgGfx.fillRect(0, 0, 720, 1280);

    // Subtle upper-space diagonal pixel nebula glow (no flat 2D circle sticker!)
    for (let i = 0; i < 6; i += 1) {
      this.bgGfx.fillStyle(0x122640, 0.16 - i * 0.02);
      this.bgGfx.fillEllipse(360, 488, 420 - i * 44, 110 - i * 12);
    }

    // 4-frame animated gas giant + 3D depth-scaled orbiting moon
    const pFrame = Math.floor(this.timeMs / 420) % this.planetFrames.length;
    this.planet.setTexture(this.planetFrames[pFrame]);
    const orbitAng = this.timeMs * 0.0008;
    const moonX = Math.round(585 + Math.cos(orbitAng) * 96);
    const moonY = Math.round(290 + Math.sin(orbitAng) * 20);
    const moonScale = 1 + Math.sin(orbitAng) * 0.28;
    this.planet.setDepth(moonY > 290 ? 2 : 4);
    this.bgGfx.fillStyle(0x7c97b5, 1);
    this.bgGfx.fillCircle(moonX, moonY, Math.round(6 * moonScale));
    this.bgGfx.fillStyle(0x2b3e55, 1);
    this.bgGfx.fillCircle(moonX + 2, moonY + 2, Math.round(4 * moonScale));

    // Twinkling vertical starfield + radial warp dust
    for (const st of this.stars) {
      st.y += st.speed * dtSec;
      if (st.y > 1285) {
        st.y = -5;
        st.x = Math.random() * 720;
      }
      this.bgGfx.fillStyle(0xcce2f7, st.alpha);
      this.bgGfx.fillRect(Math.round(st.x), Math.round(st.y), st.size, st.size);
    }

    for (const ws of this.warpStreaks) {
      ws.dist += ws.speed * dtSec;
      if (ws.dist > 620) Object.assign(ws, this.#spawnWarp(false));
      const x1 = 360 + Math.cos(ws.angle) * ws.dist;
      const y1 = 415 + Math.sin(ws.angle) * ws.dist * 0.85;
      const x2 = x1 - Math.cos(ws.angle) * 14;
      const y2 = y1 - Math.sin(ws.angle) * 14 * 0.85;
      const alpha = Math.min(0.65, ws.dist / 260);
      this.bgGfx.lineStyle(1.5, 0x9bb4cc, alpha * 0.45);
      this.bgGfx.lineBetween(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));
    }

    const form = this.heroForms[Math.floor(this.timeMs / 2100) % this.heroForms.length];
    const formDef = WEAPON_FORMS[form];
    this.formLabel.setText(`当前展示构型：[${formDef.keyLabel}] ${formDef.name} · ${formDef.skillName}`).setColor(formDef.hex);

    // 3D Volumetric Hangar Spotlight Cones + Perspective Runway Floor + Shadow
    const swayOffset = Math.sin(this.timeMs * 0.0024) * 34;
    const swayVx = Math.cos(this.timeMs * 0.0024) * 260;
    const shipX = 360 + swayOffset;
    const shipY = 408;

    this.padGfx.clear();
    const rot = this.timeMs * 0.0018;
    const pulse = 0.5 + 0.5 * Math.sin(this.timeMs * 0.006);

    // Volumetric 3D spotlight cones shining from upper hangar gantries onto the 3D pad
    this.padGfx.fillStyle(formDef.color, 0.055);
    this.padGfx.fillTriangle(180, 232, shipX - 88, 488, shipX + 42, 488);
    this.padGfx.fillTriangle(540, 232, shipX - 42, 488, shipX + 88, 488);
    this.padGfx.fillStyle(0xeef6ff, 0.04);
    this.padGfx.fillTriangle(360, 235, shipX - 54, 484, shipX + 54, 484);

    // Grounded 3D elliptical shadow directly beneath hovering fighter
    this.padGfx.fillStyle(0x02050a, 0.58);
    this.padGfx.fillEllipse(Math.round(shipX + 8), 478, 96, 22);

    // Scrolling 3D runway chevrons beneath the holographic pad (fades out cleanly above buttons!)
    const chevScroll = (this.timeMs * 0.045) % 36;
    for (let row = 0; row < 4; row += 1) {
      const cy = 442 + row * 36 + chevScroll;
      if (cy > 575) continue;
      const t = (cy - 442) / 135;
      const cw = 32 + t * 44;
      this.padGfx.lineStyle(1.5, formDef.color, (1 - t) * 0.35);
      this.padGfx.lineBetween(Math.round(360 - cw), Math.round(cy + 8), 360, Math.round(cy));
      this.padGfx.lineBetween(360, Math.round(cy), Math.round(360 + cw), Math.round(cy + 8));
    }
    // Segmented outer rotating projector ring
    const drawEllipseArc = (cx, cy, rx, ry, a0, a1, steps = 12) => {
      this.padGfx.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const a = a0 + ((a1 - a0) * i) / steps;
        const px = cx + Math.cos(a) * rx;
        const py = cy + Math.sin(a) * ry;
        if (i === 0) this.padGfx.moveTo(px, py);
        else this.padGfx.lineTo(px, py);
      }
      this.padGfx.strokePath();
    };
    for (let s = 0; s < 4; s += 1) {
      const a0 = rot + (s * Math.PI) / 2 + 0.15;
      const a1 = a0 + Math.PI / 2 - 0.3;
      this.padGfx.lineStyle(2.5, formDef.color, 0.45 + pulse * 0.35);
      drawEllipseArc(360, 476, 152, 38, a0, a1);
    }
    // Inner counter-rotating ring
    for (let s = 0; s < 3; s += 1) {
      const a0 = -rot * 1.4 + (s * Math.PI * 2) / 3 + 0.2;
      const a1 = a0 + (Math.PI * 2) / 3 - 0.45;
      this.padGfx.lineStyle(1.5, 0xeef6ff, 0.32);
      drawEllipseArc(360, 476, 102, 24, a0, a1);
    }

    // Live twin thruster plumes & subtle wingtip ion ribbons
    this.trailGfx.clear();
    const flameLen = 18 + Math.round(Math.sin(this.timeMs * 0.04) * 6);
    for (const dx of [-13, 13]) {
      this.trailGfx.fillStyle(formDef.color, 0.85);
      this.trailGfx.fillRect(Math.round(shipX + dx - 3), shipY + 42, 6, flameLen);
      this.trailGfx.fillStyle(0xf4f8ff, 0.95);
      this.trailGfx.fillRect(Math.round(shipX + dx - 1), shipY + 42, 2, Math.round(flameLen * 0.55));
    }

    const room = this.registry.get("room");
    this.heroFighter.render({ visible: true, x: shipX, y: shipY, vx: swayVx }, form, dtMs, 0, room?.selectedChassis || "viper");
    for (const layer of this.heroFighter.layers) {
      layer.setScale(layer.scaleX * 1.25, layer.scaleY * 1.25);
    }
  }

  async #openLanLobby(room) {
    if (this.lobbyGroup) {
      this.lobbyGroup.destroy(true);
      this.lobbyGroup = null;
    }
    const group = this.add.group();
    this.lobbyGroup = group;
    const uiFont = '"PingFang SC", "Microsoft YaHei", sans-serif';

    const backdrop = this.add.rectangle(360, 640, 720, 1280, 0x04070e, 0.86).setDepth(70).setInteractive();
    const panelKey = ensurePixelPanel(this, "lan-lobby", 620, 740, { fill: "#0a1220", border: "#b07cff", active: true });
    const panel = this.add.image(360, 640, panelKey).setScale(2).setDepth(71);
    const title = this.add.text(360, 316, "◈  局域网联机大厅 (LAN 4390)", { fontSize: "24px", fontFamily: uiFont, color: "#eef6ff", fontStyle: "bold" }).setOrigin(0.5).setDepth(72);
    const statusTxt = this.add.text(360, 354, "正在连接本地 LAN 服务...", { fontSize: "13px", fontFamily: uiFont, color: "#ffd166" }).setOrigin(0.5).setDepth(72);
    const seatsTxt = this.add.text(90, 442, "尚未加入房间", { fontSize: "13px", fontFamily: uiFont, color: "#cfe0f2", lineSpacing: 7 }).setDepth(72);
    const curSpec = CHASSIS_CATALOG[room.selectedChassis] || CHASSIS_CATALOG.viper;
    const chassisSpecTxt = this.add.text(90, 540, `当前出战特性：${curSpec.name} — ${curSpec.tag}`, { fontSize: "12px", fontFamily: uiFont, color: `#${curSpec.color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setDepth(72);
    const roomsTxt = this.add.text(90, 574, "已有房间：点击「刷新房间」查看", { fontSize: "13px", fontFamily: uiFont, color: "#93a7bd", lineSpacing: 6 }).setDepth(72);
    const chatHeader = this.add.text(90, 646, "── 房间聊天 ──", { fontSize: "12px", fontFamily: uiFont, color: "#43cff4", fontStyle: "bold" }).setDepth(72);
    const chatTxt = this.add.text(90, 670, "（加入或创建房间后可发送消息）", { fontSize: "13px", fontFamily: uiFont, color: "#b7cce0", lineSpacing: 6, wordWrap: { width: 540 } }).setDepth(72);

    const chatLines = [];
    const makeBtn = (x, y, label, bg, col, cb) => {
      const b = this.add
        .text(x, y, label, { fontSize: "14px", fontFamily: uiFont, color: col, fontStyle: "bold", backgroundColor: bg, padding: { x: 12, y: 8 } })
        .setOrigin(0.5)
        .setDepth(73)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", cb);
      group.add(b);
      return b;
    };

    group.addMultiple([backdrop, panel, title, statusTxt, seatsTxt, chassisSpecTxt, roomsTxt, chatHeader, chatTxt]);

    const closeLobby = () => {
      group.destroy(true);
      this.lobbyGroup = null;
    };

    const client = room.lanClient || new LanClient();
    room.lanClient = client;

    let isHost = false;
    let localReady = false;
    const readyBtn = makeBtn(170, 916, "○ 准备就绪", "#182838", "#ffd166", () => {
      localReady = !localReady;
      client.toggleReady(localReady);
    });
    const startBtn = makeBtn(380, 916, "▶ 房主开始", "#143026", "#58e69a", () => {
      if (isHost) client.startMatch();
    });
    startBtn.setVisible(false);

    makeBtn(160, 404, "+ 创建房间", "#15283d", "#43cff4", () => {
      client.createRoom(room.localCallsign || "NOVA", "endless", room.selectedChassis);
    });
    makeBtn(340, 404, "→ 输入房号加入", "#231a3d", "#b07cff", () => {
      const code = window.prompt("输入 4 位房间号（例如 A1B2）：", "");
      if (code && code.trim()) {
        client.joinRoom(code.trim().toUpperCase(), room.localCallsign || "NOVA", room.selectedChassis);
      }
    });
    makeBtn(525, 404, "↻ 刷新房间", "#142030", "#ffd166", () => {
      client.listRooms();
    });
    makeBtn(210, 842, "💬 发送聊天", "#132236", "#43cff4", () => {
      const msg = window.prompt("输入房间聊天内容：", "");
      if (msg && msg.trim()) client.sendChat(msg.trim());
    });
    makeBtn(450, 842, "✈ 切换出战战机", "#1c1830", "#ffd166", () => {
      const info = room.cycleChassis();
      this.chassisBtn.setText(`战机: ${info.name} [切换]`).setColor(`#${info.color.toString(16).padStart(6, "0")}`);
      this.chassisTraitText.setText(`战机特性：${info.desc}`).setColor(`#${info.color.toString(16).padStart(6, "0")}`);
      chassisSpecTxt.setText(`当前出战特性：${info.name} — ${info.tag}`).setColor(`#${info.color.toString(16).padStart(6, "0")}`);
      client.selectChassis(info.id);
    });
    makeBtn(555, 916, "✕ 关闭", "#26141a", "#ff8c3a", closeLobby);

    const renderLobby = (msg) => {
      isHost = client.slotId === "P1";
      const me = msg.players.find((p) => p.id === client.slotId);
      localReady = Boolean(me?.ready);
      readyBtn.setText(localReady ? "✓ 已准备 (点击取消)" : "○ 准备就绪");
      readyBtn.setColor(localReady ? "#58e69a" : "#ffd166");

      const readyCount = msg.players.filter((p) => p.ready).length;
      statusTxt.setText(`房间号: ${msg.roomId}  ·  你是 ${client.slotId}${isHost ? " (房主)" : ""}  ·  人数 ${msg.players.length}/4`);
      const lines = msg.players.map((p) => {
        const ch = CHASSIS_CATALOG[p.chassis]?.name || p.chassis || "Viper";
        const rTag = p.ready ? "✓已准备" : "未准备";
        return `${p.id === "P1" ? "★" : "•"} ${p.id}  ${p.name}   [${ch}]   ${rTag}`;
      });
      seatsTxt.setText(lines.join("\n"));
      startBtn.setText(`▶ 房主开始 (${readyCount}/${msg.players.length})`);
      startBtn.setVisible(isHost);
    };

    client.on("joined", (msg) => {
      renderLobby(msg);
      client.listRooms();
    });
    client.on("lobby_state", (msg) => renderLobby(msg));
    client.on("room_list", (msg) => {
      if (!msg.rooms || msg.rooms.length === 0) {
        roomsTxt.setText("当前暂无其他房间，点击「+ 创建房间」即可开房");
      } else {
        roomsTxt.setText(
          "已有房间: " +
            msg.rooms.slice(0, 4).map((r) => `[${r.roomId} ${r.hostName} ${r.playerCount}/${r.maxPlayers}${r.started ? " 已开局" : ""}]`).join("  ")
        );
      }
    });
    client.on("chat_message", (msg) => {
      chatLines.push(`[${msg.slotId} ${msg.name}]: ${msg.text}`);
      if (chatLines.length > 5) chatLines.shift();
      chatTxt.setText(chatLines.join("\n"));
    });
    client.on("error", (msg) => statusTxt.setText(`⚠ ${msg.message || "连接错误"}`).setColor("#ff4b5c"));
    client.on("match_start", (msg) => {
      room.setupFromLobby(msg.players, client.slotId, msg.mode || "endless");
      closeLobby();
      this.scene.start("BattleScene");
    });

    try {
      await client.connect();
      statusTxt.setText("已连接 LAN 服务 · 可创建房间或刷新加入已有房间").setColor("#58e69a");
      client.listRooms();
    } catch {
      statusTxt.setText("未检测到本地 LAN 服务 (请先运行 npm run lan-server)").setColor("#ff4b5c");
    }
  }

  #makePixelButton(x, y, w, h, title, subtitle, accentColor, fillColor, onClick) {
    const borderHex = `#${accentColor.toString(16).padStart(6, "0")}`;
    const fillHex = `#${fillColor.toString(16).padStart(6, "0")}`;
    const baseKey = ensurePixelPanel(this, `menu-btn-${w}`, w, h, { fill: fillHex, border: borderHex, active: false });
    const hoverKey = ensurePixelPanel(this, `menu-btn-${w}`, w, h, { fill: fillHex, border: borderHex, active: true });

    const bg = this.add.image(x, y, baseKey).setScale(2).setDepth(29).setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setTexture(hoverKey));
    bg.on("pointerout", () => bg.setTexture(baseKey));
    bg.on("pointerdown", onClick);

    const iconId = accentColor === 0x43cff4 ? "pulse" : accentColor === 0xb07cff ? "magnet" : "overload";
    this.add.image(x - w / 2 + 34, y, ensurePixelIcon(this, iconId)).setScale(2.2).setDepth(31);

    const titleY = subtitle ? y - 12 : y;
    const uiFont = '"PingFang SC", "Microsoft YaHei", sans-serif';
    this.add
      .text(x + 10, titleY, title, {
        fontSize: "18px",
        fontFamily: uiFont,
        color: "#eef6ff",
        fontStyle: "bold",
        padding: { x: 6, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(31);
    if (subtitle) {
      this.add
        .text(x + 10, y + 14, subtitle, {
          fontSize: "12px",
          fontFamily: uiFont,
          color: "#9db4cc",
          padding: { x: 6, y: 5 },
        })
        .setOrigin(0.5)
        .setDepth(31);
    }
  }
}
