import Phaser from "phaser";
import { applyBuildCard, cardDisplayFor } from "../core/build-system.js";
import { campaignEncounterFor } from "../core/campaign-director.js";
import { COMEBACK_CARDS } from "../core/comeback-system.js";
import { GAME_PHASES } from "../state/game-session.js";
import { ensurePixelIcon, ensurePixelPanel } from "../presentation/pixel-ui.js";

export class OverlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "OverlayScene" });
  }

  create(data) {
    const room = this.registry.get("room");
    const local = room.getLocalSlot();
    const kind = data?.kind || "paused";

    this.add.rectangle(360, 640, 720, 1280, 0x05090b, 0.84);

    this.upgradeCards = [];
    this.upgradeContext = null;
    this.terminalAnimGfx = this.add.graphics().setDepth(20);
    this.terminalAnimMs = 0;

    if (kind === "route") {
      this.#renderRouteSelect(room, local.session);
    } else if (kind === "upgrade") {
      this.#renderUpgradeSelect(room, local);
    } else {
      this.#renderPauseOrEnd(room, local.session, kind);
    }
  }

  update(_time, delta) {
    this.terminalAnimMs += Math.min(50, delta || 16);
    if (this.terminalAnimGfx && !this.upgradeContext) {
      this.terminalAnimGfx.clear();
      const scanY = 265 + ((this.terminalAnimMs * 0.14) % 580);
      this.terminalAnimGfx.lineStyle(2, 0x43cff4, 0.22);
      this.terminalAnimGfx.lineBetween(62, scanY, 658, scanY);
      const blink = Math.floor(this.terminalAnimMs / 350) % 2 === 0;
      this.terminalAnimGfx.fillStyle(blink ? 0x58e69a : 0x1b3a30, 0.9);
      this.terminalAnimGfx.fillCircle(82, 278, 4);
    }
    if (!this.upgradeContext || this.upgradeCards.length === 0) return;
    const { room, tierKey } = this.upgradeContext;
    const snapshot = room.sharedPool.getSnapshot(tierKey);
    for (const item of this.upgradeCards) {
      const entry = snapshot.entries.find((e) => e.cardId === item.cardId);
      if (!entry) continue;
      const disabled = entry.remaining <= 0;
      const claimedTag = entry.claimedBy.length > 0 ? ` · ${entry.claimedBy.join(",")}已抢` : "";
      const stockTag = disabled ? `已抢空${claimedTag}` : `剩 ${entry.remaining}/${entry.maxStock}${claimedTag}`;
      const nextTitle = `${item.cardName}  [${stockTag}]`;
      if (item.titleText.text !== nextTitle) {
        item.titleText.setText(nextTitle);
      }
      if (disabled && !item.disabled) {
        item.disabled = true;
        item.bg.disableInteractive();
        const dimKey = ensurePixelPanel(this, "ov-card-0", 580, 146, {
          fill: "#09101a",
          border: "#3b536b",
          active: false,
        });
        item.bg.setTexture(dimKey);
        item.icon.setAlpha(0.35);
        item.titleText.setColor("#5a6c80");
        item.subText.setColor("#475769");
      }
    }
  }

  #renderRouteSelect(room, session) {
    session.setShipVisible(false);
    const seg = session.campaign.segment;
    const pos = session.campaign.position;
    this.add.text(360, 220, `第 ${seg} 航段 · 节点 ${pos}/3`, { fontSize: "34px", color: "#eaf4ff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(360, 272, "选择航路推进策略（高危更快抢占共享奖池）", { fontSize: "17px", color: "#93a7bd" }).setOrigin(0.5);

    const normal = campaignEncounterFor({ segment: seg, branch: "normal", position: pos, seed: session.campaign.seed });
    const risk = campaignEncounterFor({ segment: seg, branch: "risk", position: pos, seed: session.campaign.seed });

    this.#card(360, 480, `稳健航路 · ${normal.title}`, `${normal.rewardTag} · 标准压力`, 0x43cff4, false, () => {
      session.setShipVisible(true);
      session.selectCampaignBranch("normal");
      this.scene.stop();
    });

    this.#card(360, 720, `高危航路 · ${risk.title}`, `${risk.rewardTag} · 高压高充能回报`, 0xff8c3a, false, () => {
      session.setShipVisible(true);
      session.selectCampaignBranch("risk");
      this.scene.stop();
    });
  }

  #renderUpgradeSelect(room, local) {
    const session = local.session;
    const tierKey = room.currentTierKey(session);
    const clearInfo = room.sharedPool.recordMilestoneClear(tierKey, local.id);
    const snapshot = room.sharedPool.getSnapshot(tierKey);

    this.add.text(360, 145, `第 ${Math.max(2, session.endless.wave - 1)} 波战备补给 · 第 ${clearInfo.rank} 名抵达`, { fontSize: "28px", color: "#eaf4ff", fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(360, 190, "共享奖池先到先得 · 装备将实时改装 A型战机外甲", { fontSize: "15px", color: "#93a7bd" }).setOrigin(0.5);

    const isTrailing = clearInfo.rank >= 2 || (session.pace?.rank || 1) >= 2;
    if (isTrailing) {
      this.add
        .text(360, 224, "⚡ 落后者逆流加成：选卡将对第1名空投精英干扰机并 +20% 能源", { fontSize: "14px", color: "#ffd166" })
        .setOrigin(0.5);
    }

    this.upgradeContext = { room, tierKey };

    snapshot.entries.slice(0, 3).forEach((entry, idx) => {
      const poolItem = room.sharedPool.ensureTier(tierKey).find((e) => e.cardId === entry.cardId);
      const display = cardDisplayFor(session.build, poolItem.card);
      const y = 355 + idx * 180;
      const disabled = entry.remaining <= 0;
      const color = disabled ? 0x3b536b : poolItem.card.route === "missile" ? 0xff8c3a : poolItem.card.route === "swarm" ? 0xb07cff : 0x43cff4;
      const claimedTag = entry.claimedBy.length > 0 ? ` · ${entry.claimedBy.join(",")}已抢` : "";
      const stockTag = disabled ? `已抢空${claimedTag}` : `剩 ${entry.remaining}/${entry.maxStock}${claimedTag}`;
      const cardRef = this.#card(
        360,
        y,
        `${poolItem.card.name}  [${stockTag}]`,
        `${display.behavior}  ·  ${display.stat}`,
        color,
        disabled,
        () => {
          const claimed = room.sharedPool.claimCard(tierKey, local.id, entry.cardId);
          if (!claimed) {
            this.add
              .text(360, 260, "⚡ 手慢一步！该卡刚被对手抢走，请另选其他卡", {
                fontSize: "15px",
                color: "#ff4b5c",
                fontStyle: "bold",
              })
              .setOrigin(0.5);
            return;
          }
          room.lanClient?.claimPrize(tierKey, entry.cardId, entry.maxStock);
          applyBuildCard(session.build, poolItem.card);
          session.installedModules.push(poolItem.card.id);
          if (isTrailing) room.triggerComebackAirdrop(local.id);
          this.#finishUpgrade(room, session);
        }
      );
      this.upgradeCards.push({ cardId: entry.cardId, cardName: poolItem.card.name, disabled, ...cardRef });
    });

    // Comeback card unlocked for trailing players (Rank 3-4)
    if (session.pace?.unlockComebackCard) {
      const comeback = COMEBACK_CARDS[(session.campaign.position + session.endless.wave) % COMEBACK_CARDS.length];
      this.#card(360, 915, `逆境奇兵 · ${comeback.title}`, `${comeback.description}（附带逆流空投）`, 0xffd166, false, () => {
        comeback.apply(session);
        session.installedModules.push(comeback.id);
        room.triggerComebackAirdrop(local.id);
        this.#finishUpgrade(room, session);
      });
    }
  }

  #finishUpgrade(room, session) {
    if (room.mode === "campaign") {
      session.advanceCampaignNode();
    } else {
      session.setPhase(GAME_PHASES.PLAYING);
    }
    this.scene.stop();
  }

  #renderPauseOrEnd(room, session, kind) {
    const isEnded = kind === "ended";
    const isVictory = session.result === "victory";
    const accentNum = isEnded ? (isVictory ? 0x58e69a : 0xff4b5c) : 0x43cff4;
    const accentHex = `#${accentNum.toString(16).padStart(6, "0")}`;
    const uiFont = '"PingFang SC", "Microsoft YaHei", sans-serif';

    const title = isEnded
      ? isVictory
        ? "空 域 肃 清"
        : "战 机 信 号 中 断"
      : "战 术 挂 起";
    const subTag = isEnded
      ? isVictory
        ? "SECTOR SECURED  //  MISSION COMPLETE"
        : "SIGNAL LOST  //  FLIGHT DEBRIEF TERMINAL"
      : "TACTICAL PAUSE  //  SYSTEM STANDBY";

    // Outer pixel-art mission debrief terminal console
    const shellKey = ensurePixelPanel(this, "ov-debrief", 620, 620, { fill: "#08101c", border: accentHex, active: true });
    this.add.image(360, 560, shellKey).setScale(2);

    this.add
      .text(360, 312, title, {
        fontSize: "36px",
        fontFamily: uiFont,
        color: "#eef6ff",
        fontStyle: "bold",
        padding: { x: 8, y: 8 },
      })
      .setOrigin(0.5);
    this.add
      .text(360, 354, subTag, {
        fontSize: "12px",
        fontFamily: uiFont,
        color: accentHex,
        fontStyle: "bold",
        letterSpacing: 2,
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5);

    const board = room.getProgressBoard();
    const shipIconKey = ensurePixelIcon(this, "ship");
    board.forEach((row, idx) => {
      const ry = 422 + idx * 66;
      const rowColor = row.accentColor ?? 0x43cff4;
      const rowHex = `#${rowColor.toString(16).padStart(6, "0")}`;
      const rowKey = ensurePixelPanel(this, `ov-row-${idx}`, 540, 54, {
        fill: row.isLocal ? "#102136" : "#0b1422",
        border: row.isLocal ? rowHex : "#26394f",
        active: row.isLocal || idx === 0,
      });
      this.add.image(360, ry, rowKey).setScale(2);
      this.add.image(122, ry, shipIconKey).setScale(2.1).setTint(rowColor);

      const rankBadge = idx === 0 ? "★ #1" : `#${idx + 1}`;
      this.add
        .text(146, ry, `${rankBadge}  ${row.name}${row.isLocal ? " (你)" : ""}`, {
          fontSize: "16px",
          fontFamily: uiFont,
          color: row.isLocal ? "#eef6ff" : rowHex,
          fontStyle: "bold",
          padding: { x: 4, y: 4 },
        })
        .setOrigin(0, 0.5);

      this.add
        .text(448, ry, `${row.nodeLabel} · ${row.kills}杀`, {
          fontSize: "14px",
          fontFamily: uiFont,
          color: "#cfe0f2",
          padding: { x: 4, y: 4 },
        })
        .setOrigin(1, 0.5);

      this.add
        .text(598, ry, `HP ${row.hpPct}%`, {
          fontSize: "14px",
          fontFamily: uiFont,
          color: row.hpPct <= 0 ? "#ff4b5c" : "#58e69a",
          fontStyle: "bold",
          padding: { x: 4, y: 4 },
        })
        .setOrigin(1, 0.5);
    });

    // Personal flight telemetry summary strip
    const scrap = session.economy?.scrap || 0;
    const mods = session.installedModules?.length || 0;
    this.add
      .text(360, 686, `本机战果：波次 W${session.endless?.wave || 1}  ·  击破 ${session.stats?.kills || 0}  ·  星屑 ${scrap}  ·  改装 ${mods}件`, {
        fontSize: "13px",
        fontFamily: uiFont,
        color: "#ffd166",
        fontStyle: "bold",
        padding: { x: 6, y: 5 },
      })
      .setOrigin(0.5);

    if (kind === "paused") {
      this.#button(360, 756, "▶  继续作战", 0x43cff4, () => {
        session.resume();
        this.scene.stop();
      });
      this.#button(360, 838, "◈  返回机库", 0x5c7694, () => {
        this.scene.stop("BattleScene");
        this.scene.start("MenuScene");
        this.scene.stop();
      });
    } else if (!isVictory && room.hasAliveOthers()) {
      this.#button(360, 738, "▶  观战存活玩家", 0xffd166, () => {
        room.spectateNextAlive();
        this.scene.stop();
      });
      this.#button(360, 808, "▶  再次出击", 0x43cff4, () => {
        room.setupSoloWithBots(room.mode);
        this.scene.stop("BattleScene");
        this.scene.start("BattleScene");
        this.scene.stop();
      });
      this.#button(360, 878, "◈  离开对局 / 返回机库", 0x5c7694, () => {
        room.lanClient?.close();
        room.lanClient = null;
        this.scene.stop("BattleScene");
        this.scene.start("MenuScene");
        this.scene.stop();
      });
    } else {
      this.#button(360, 756, "▶  再次出击", 0x43cff4, () => {
        room.setupSoloWithBots(room.mode);
        this.scene.stop("BattleScene");
        this.scene.start("BattleScene");
        this.scene.stop();
      });
      this.#button(360, 838, "◈  返回机库", 0x5c7694, () => {
        room.lanClient?.close();
        room.lanClient = null;
        this.scene.stop("BattleScene");
        this.scene.start("MenuScene");
        this.scene.stop();
      });
    }
  }

  #card(x, y, title, subtitle, strokeColor, disabled, onClick) {
    const borderHex = `#${strokeColor.toString(16).padStart(6, "0")}`;
    const fillHex = disabled ? "#09101a" : "#0f1c2e";
    const key = ensurePixelPanel(this, `ov-card-${disabled ? 0 : 1}`, 580, 146, {
      fill: fillHex,
      border: borderHex,
      active: !disabled,
    });
    const bg = this.add.image(x, y, key).setScale(2);
    if (!disabled) bg.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);

    const iconId =
      strokeColor === 0xff8c3a ? "heavy" : strokeColor === 0xb07cff ? "magnet" : strokeColor === 0xffd166 ? "overload" : "pulse";
    const icon = this.add.image(x - 246, y - 24, ensurePixelIcon(this, iconId)).setScale(2.4).setAlpha(disabled ? 0.35 : 1);

    const titleText = this.add
      .text(x - 210, y - 34, title, { fontSize: "20px", color: disabled ? "#5a6c80" : "#eef6ff", fontStyle: "bold" })
      .setOrigin(0, 0.5);
    const subText = this.add
      .text(x - 210, y + 18, subtitle || "", { fontSize: "15px", color: disabled ? "#475769" : "#9db4cc", wordWrap: { width: 470 } })
      .setOrigin(0, 0.5);
    return { bg, icon, titleText, subText };
  }

  #button(x, y, label, strokeColor, onClick) {
    const borderHex = `#${strokeColor.toString(16).padStart(6, "0")}`;
    const key = ensurePixelPanel(this, "ov-btn", 340, 62, { fill: "#101f33", border: borderHex, active: true });
    const bg = this.add.image(x, y, key).setScale(2).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontSize: "20px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#eef6ff",
        fontStyle: "bold",
        padding: { x: 6, y: 6 },
      })
      .setOrigin(0.5);
    bg.on("pointerdown", onClick);
  }
}
