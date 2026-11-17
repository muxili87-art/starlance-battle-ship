import { FORM_ORDER, WEAPON_FORMS } from "../core/weapon-forms.js";
import { GAME_PHASES } from "../state/game-session.js";
import { ensurePixelIcon, ensurePixelPanel } from "../presentation/pixel-ui.js";

/**
 * Pixel-Art Stepped-Bezel Driver HUD:
 * - Authentic NEAREST-filtered pixel-art beveled metal tabs with corner rivets & scanlines
 * - Embedded 12x12 pixel weapon/action icons in every tab
 * - Zero flat vector boxes
 */
export class BattleHud {
  constructor(scene, { onPauseClick, onOverloadClick, onSelectWatch, onReturnLocal, onLeaveMatch, onSwitchForm, onCastSkill }) {
    this.scene = scene;
    this.onSelectWatch = onSelectWatch;

    this.topBg = scene.add.rectangle(360, 68, 720, 136, 0x050a14, 0.94).setDepth(48);
    this.topLine = scene.add.rectangle(360, 135, 720, 2, 0x20354e, 0.9).setDepth(49);

    this.slotCards = [];
    const shipIconKey = ensurePixelIcon(scene, "ship");
    for (let i = 0; i < 4; i += 1) {
      const x = 94 + i * 176;
      const y = 44;
      const panelKey = ensurePixelPanel(scene, "hud-slot", 166, 66, { fill: "#0b1320", border: "#2c3e52", active: false });
      const bg = scene.add
        .image(x, y, panelKey)
        .setScale(2)
        .setDepth(49)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          if (this.slotCards[i]?.slotId) this.onSelectWatch?.(this.slotCards[i].slotId);
        });
      const icon = scene.add.image(x - 67, y - 16, shipIconKey).setScale(1.6).setDepth(50);
      const title = scene.add.text(x - 54, y - 24, `P${i + 1}`, { fontSize: "12px", color: "#eef6ff", fontStyle: "bold" }).setDepth(50);
      const hpLabel = scene.add.text(x + 73, y - 24, "100%", { fontSize: "12px", color: "#43cff4", fontStyle: "bold" }).setOrigin(1, 0).setDepth(50);
      const info = scene.add.text(x - 71, y - 4, "W1 · 0杀", { fontSize: "11px", color: "#93a7bd" }).setDepth(50);
      const barBg = scene.add.rectangle(x, y + 20, 144, 8, 0x050910).setStrokeStyle(1, 0x1d2e42).setDepth(50);
      const barFill = scene.add.rectangle(x - 72, y + 20, 4, 8, 0x43cff4).setOrigin(0, 0.5).setDepth(51);
      const barTip = scene.add.rectangle(x - 68, y + 20, 3, 10, 0xeef6ff).setOrigin(0.5, 0.5).setDepth(52);

      this.slotCards.push({ slotId: `P${i + 1}`, x, y, bg, icon, title, hpLabel, info, barBg, barFill, barTip });
    }

    this.timerText = scene.add
      .text(360, 98, "00:00", { fontSize: "20px", color: "#eef6ff", fontStyle: "bold" })
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    this.paceText = scene.add
      .text(20, 98, "W1 (0/10)", { fontSize: "13px", color: "#ffd166", fontStyle: "bold" })
      .setOrigin(0, 0.5)
      .setDepth(50);

    const pauseKey = ensurePixelPanel(scene, "hud-pause", 92, 30, { fill: "#121e30", border: "#43cff4", active: false });
    this.pauseBg = scene.add
      .image(654, 98, pauseKey)
      .setScale(2)
      .setDepth(49)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onPauseClick?.());
    this.pauseBtn = scene.add
      .text(654, 98, "⏸ 暂停", { fontSize: "13px", color: "#d9e5f2", fontStyle: "bold" })
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    this.bossDpsText = scene.add
      .text(360, 174, "", {
        fontSize: "12px",
        color: "#ffd166",
        fontStyle: "bold",
        backgroundColor: "#0a1220cc",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(51)
      .setVisible(false);

    // Navigation GPS Route Milestone Rail (y=138, 4-wave rolling sector map)
    this.navGfx = scene.add.graphics().setDepth(50);
    this.navMilestones = [0, 1, 2, 3, 4].map(() =>
      scene.add
        .text(0, 146, "", { fontSize: "10px", color: "#93a7bd", fontStyle: "bold" })
        .setOrigin(0.5, 0)
        .setDepth(51)
    );
    this.navPins = [0, 1, 2, 3].map(() =>
      scene.add
        .text(0, 126, "", {
          fontSize: "10px",
          color: "#eef6ff",
          fontStyle: "bold",
          stroke: "#050a14",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(52)
    );

    this.spectateBanner = scene.add
      .rectangle(360, 162, 680, 40, 0x261a10, 0.94)
      .setStrokeStyle(2, 0xff8c3a)
      .setDepth(52)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onReturnLocal?.());
    this.spectateText = scene.add
      .text(320, 162, "", { fontSize: "13px", color: "#ffd166", fontStyle: "bold" })
      .setOrigin(0.5, 0.5)
      .setDepth(53)
      .setVisible(false);
    this.leaveSpectateBtn = scene.add
      .text(632, 162, "[离开对局]", {
        fontSize: "12px",
        color: "#ff8c3a",
        fontStyle: "bold",
        backgroundColor: "#0e1a2b",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(54)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onLeaveMatch?.());

    // Integrated Bottom Command Deck Backdrop
    this.bottomBg = scene.add.rectangle(360, 1205, 720, 150, 0x050a14, 0.95).setDepth(48);
    this.bottomLine = scene.add.rectangle(360, 1131, 720, 2, 0x20354e, 0.9).setDepth(49);

    // Pixel-Art 3-slot Form Switch Tabs with embedded 12x12 icons
    this.formButtons = FORM_ORDER.map((formId, idx) => {
      const form = WEAPON_FORMS[formId];
      const bx = 92 + idx * 140;
      const by = 1212;
      const baseKey = ensurePixelPanel(scene, `hud-form-${formId}`, 132, 68, { fill: "#0b1320", border: "#2c3e52", active: false });
      const bg = scene.add
        .image(bx, by, baseKey)
        .setScale(2)
        .setDepth(49)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => onSwitchForm?.(formId));
      const icon = scene.add.image(bx - 42, by - 12, ensurePixelIcon(scene, formId)).setScale(2).setDepth(51);
      const title = scene.add
        .text(bx + 12, by - 14, `[${form.keyLabel}] ${form.name}`, { fontSize: "12px", color: form.hex, fontStyle: "bold" })
        .setOrigin(0.5)
        .setDepth(51);
      const cdText = scene.add
        .text(bx + 4, by + 15, `${form.skillName} 25能`, { fontSize: "11px", color: "#d9e5f2" })
        .setOrigin(0.5)
        .setDepth(51);
      // 4-pip weapon strength tier indicator (Lv.0..4)
      const pips = [0, 1, 2, 3].map((p) =>
        scene.add.rectangle(bx - 16 + p * 12, by + 28, 9, 3, 0x1e2d40).setDepth(51)
      );
      return { formId, bx, by, bg, icon, title, cdText, pips };
    });

    // Pixel-Art [Space] Skill Tab + [F] Overload Tab
    const skillBaseKey = ensurePixelPanel(scene, "hud-skill", 110, 68, { fill: "#0d1524", border: "#2c3e52", active: false });
    this.skillBg = scene.add
      .image(540, 1212, skillBaseKey)
      .setScale(2)
      .setDepth(49)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onCastSkill?.());
    this.skillIcon = scene.add.image(508, 1200, ensurePixelIcon(scene, "skill")).setScale(1.8).setDepth(51);
    this.skillBtnText = scene.add
      .text(548, 1212, "[Space]\n技能", { fontSize: "12px", color: "#ffd166", fontStyle: "bold", align: "center" })
      .setOrigin(0.5)
      .setDepth(51);

    const ovBaseKey = ensurePixelPanel(scene, "hud-ov", 102, 68, { fill: "#0d1524", border: "#2c3e52", active: false });
    this.overloadBg = scene.add
      .image(656, 1212, ovBaseKey)
      .setScale(2)
      .setDepth(49)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onOverloadClick?.());
    this.overloadIcon = scene.add.image(624, 1200, ensurePixelIcon(scene, "overload")).setScale(1.8).setDepth(51);
    this.overloadBtnText = scene.add
      .text(666, 1212, "[F]\n蓄能", { fontSize: "12px", color: "#6c7f94", fontStyle: "bold", align: "center" })
      .setOrigin(0.5)
      .setDepth(51);

    this.coreText = scene.add
      .text(360, 1152, "耐久 100%  ·  能源 0%  ·  改装 0件", { fontSize: "14px", color: "#cfe0f2", fontStyle: "bold" })
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    this.overloadHint = scene.add
      .text(360, 1024, "★ 能源满载：点击核心或按 [F] 第一视角俯冲过载 ★", { fontSize: "14px", color: "#ff8c3a", fontStyle: "bold" })
      .setOrigin(0.5, 0.5)
      .setDepth(50)
      .setVisible(false);

    this.coreHitZone = scene.add
      .circle(360, 1085, 52, 0x000000, 0)
      .setDepth(49)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => onOverloadClick?.());
  }

  sync(room) {
    const watched = room.getWatchedSlot();
    const local = room.getLocalSlot();
    if (!watched || !local) return;

    const session = watched.session;
    const board = room.getProgressBoard();

    board.forEach((row, idx) => {
      const card = this.slotCards[idx];
      if (!card) return;
      card.slotId = row.id;
      const accentNum = row.accentColor ?? 0x43cff4;
      const accentHex = `#${accentNum.toString(16).padStart(6, "0")}`;
      const border = row.isWatched ? "#ffd166" : accentHex;
      const fill = row.isWatched ? "#132236" : row.isLocal ? "#0f1d30" : "#0b1320";
      const key = ensurePixelPanel(this.scene, "hud-slot", 166, 66, { fill, border, active: row.isWatched || row.isLocal });
      card.bg.setTexture(key);
      card.icon.setTint(accentNum);

      const crown = idx === 0 ? "★" : `#${idx + 1}`;
      const shortName = String(row.name || row.id).slice(0, 7);
      card.title.setText(`${crown} ${shortName}${row.isLocal ? "(你)" : ""}`);
      card.title.setColor(row.isLocal ? "#eef6ff" : accentHex);
      card.hpLabel.setText(`${row.hpPct}%`);
      card.hpLabel.setColor(row.hpPct <= 35 ? "#ff4b5c" : accentHex);
      card.info.setText(`${row.nodeLabel} · ${row.kills}杀`);

      const fillW = Math.max(6, Math.round(144 * row.progressRatio));
      card.barFill.setDisplaySize(fillW, 8);
      card.barFill.setFillStyle(row.ended ? 0x4f6781 : accentNum);
      card.barTip.setPosition(card.x - 72 + fillW, card.y + 20);
      card.barTip.setVisible(!row.ended);
    });

    const w = local.session.endless?.wave || 1;
    const wk = local.session.endless?.waveKills || 0;
    const wt = local.session.endless?.waveTargetKills || 10;
    const leaderRow = board[0];
    const localIdx = board.findIndex((r) => r.isLocal);
    const localRow = board[localIdx];
    let gapTag = local.session.pace?.label || "";
    if (leaderRow && localRow) {
      if (localIdx === 0 && board[1]) {
        const leadKills = Math.max(0, localRow.kills - board[1].kills);
        gapTag = `领先第2名 +${leadKills}杀`;
      } else if (localIdx > 0) {
        const waveDiff = Math.max(0, leaderRow.wave - localRow.wave);
        const killDiff = Math.max(0, leaderRow.kills - localRow.kills);
        gapTag = waveDiff > 0 ? `落后第1名 ${waveDiff}波 (-${killDiff}杀)` : `距第1名 -${killDiff}杀`;
      }
    }
    this.paceText.setText(`W${w} (${wk}/${wt}) · ${gapTag}`);
    this.paceText.setColor(localIdx === 0 ? "#43cff4" : "#ffd166");

    const totalSec = Math.floor(local.session.elapsedMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    this.timerText.setText(`${mm}:${ss}`);

    this.#renderNavRoute(room, board);

    if (session.boss) {
      const dpsBoard = room.getBossDpsBoard();
      const fmt = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`);
      const line = dpsBoard
        .map((r, i) => `#${i + 1} ${String(r.name).slice(0, 6)}${r.isLocal ? "(你)" : ""} ${fmt(r.dps)}`)
        .join("  |  ");
      this.bossDpsText.setText(`BOSS DPS  ${line}`).setVisible(true);
    } else {
      this.bossDpsText.setVisible(false);
    }

    const spectating = room.isSpectating();
    const localEliminated = local.session.phase === GAME_PHASES.ENDED;
    this.spectateBanner.setVisible(spectating);
    this.spectateText.setVisible(spectating);
    if (this.leaveSpectateBtn) this.leaveSpectateBtn.setVisible(spectating && localEliminated);
    if (spectating) {
      this.spectateText.setText(
        localEliminated
          ? `[观战模式] 已淘汰 · 正在观战 ${watched.name}  [点击切换存活目标]`
          : `正在观战 ${watched.name} · 我方智驾中(90%伤害) · 点击返回己方`
      );
    }

    const hasEnergy = session.core.overloadActive || session.core.energy >= 25;
    for (const btn of this.formButtons) {
      const form = WEAPON_FORMS[btn.formId];
      const active = session.activeForm === btn.formId;
      const cdMs = session.formCooldowns?.[btn.formId] || 0;
      const key = ensurePixelPanel(this.scene, `hud-form-${btn.formId}`, 132, 68, {
        fill: active ? "#162942" : "#0b1320",
        border: active ? form.hex : "#2c3e52",
        active,
      });
      btn.bg.setTexture(key);
      btn.cdText.setText(cdMs > 0 ? `CD ${(cdMs / 1000).toFixed(1)}s` : `${form.skillName} 25能`);
      btn.cdText.setColor(cdMs > 0 ? "#7a8da3" : hasEnergy ? "#eaf4ff" : "#93a7bd");
      const routeKey = btn.formId === "heavy" ? "missile" : btn.formId === "magnet" ? "swarm" : "crit";
      const tier = session.build?.routes?.[routeKey] || 0;
      for (let p = 0; p < btn.pips.length; p += 1) {
        btn.pips[p].setFillStyle(p < tier ? form.color : 0x1c2b3d);
      }
    }

    const activeCd = session.formCooldowns?.[session.activeForm] || 0;
    const skillReady = !spectating && activeCd <= 0 && hasEnergy;
    const skillKey = ensurePixelPanel(this.scene, "hud-skill", 110, 68, {
      fill: skillReady ? "#29200e" : "#0d1524",
      border: skillReady ? "#ffd166" : "#2c3e52",
      active: skillReady,
    });
    this.skillBg.setTexture(skillKey);
    this.skillBtnText.setColor(skillReady ? "#ffd166" : "#6c7f94");

    const overloadReady = !spectating && local.session.canTriggerOverload();
    const overloadOn = Boolean(session.core.overloadActive);
    const pulseReady = overloadReady && Math.floor(local.session.elapsedMs / 180) % 2 === 0;
    const ovKey = ensurePixelPanel(this.scene, "hud-ov", 102, 68, {
      fill: overloadOn ? "#36160a" : pulseReady ? "#40210b" : overloadReady ? "#2b170c" : "#0d1524",
      border: overloadOn ? "#ff4b5c" : pulseReady ? "#ffd166" : overloadReady ? "#ff8c3a" : "#2c3e52",
      active: overloadOn || overloadReady,
    });
    this.overloadBg.setTexture(ovKey);
    this.overloadBtnText.setText(overloadOn ? "[F]\n⚡突击!" : overloadReady ? "[F]\n⚡过载!" : "[F]\n蓄能");
    this.overloadBtnText.setColor(overloadOn ? "#ff4b5c" : pulseReady ? "#ffd166" : overloadReady ? "#ff8c3a" : "#6c7f94");

    const hpPct = Math.round((session.core.hp / Math.max(1, session.core.maxHp)) * 100);
    const energyPct = Math.round((session.core.energy / Math.max(1, session.core.maxEnergy)) * 100);
    const modCount = session.installedModules?.length || 0;
    const scrap = session.economy?.scrap || 0;
    const combo = session.economy?.combo || 0;
    const repairCost = 30 + (session.economy?.repairCount || 0) * 35;
    const ocCost = 80 + (session.economy?.overclockCount || 0) * 65;
    const comboTag = combo >= 2 ? ` · x${combo}连击` : "";
    const nebulaTag = session.inIonNebula ? " · ⚡星云×1.8" : "";
    const spendHint = scrap >= ocCost ? ` [Q]超频(${ocCost})` : scrap >= repairCost && hpPct < 100 ? ` [E]修(${repairCost})` : "";
    if (session.core.overloadActive) {
      const rem = (session.core.overloadRemainingMs / 1000).toFixed(1);
      this.coreText.setText(`⚡ 第一视角过载突击中 ${rem}s · 星屑 ${scrap}${comboTag}`).setColor("#ff8c3a");
    } else {
      this.coreText.setText(`耐久 ${hpPct}% · 能源 ${energyPct}% · 星屑 ${scrap}${spendHint} · 改装 ${modCount}${comboTag}${nebulaTag}`).setColor(session.inIonNebula ? "#b07cff" : "#cfe0f2");
    }

    this.overloadHint.setVisible(overloadReady);
  }

  #renderNavRoute(room, board) {
    this.navGfx.clear();
    const x0 = 54;
    const x1 = 666;
    const y = 148;
    const span = x1 - x0;

    const leaderWave = board[0]?.wave || 1;
    const baseWave = Math.max(1, Math.floor((leaderWave - 1) / 4) * 4 + 1);

    // Sleek GPS highway backdrop rail
    this.navGfx.fillStyle(0x0b1626, 0.88);
    this.navGfx.fillRect(x0 - 12, y - 4, span + 24, 8);
    this.navGfx.lineStyle(2, 0x263f5c, 0.9);
    this.navGfx.lineBetween(x0, y, x1, y);

    // 5 Wave Milestone Waypoints (baseWave .. baseWave + 4)
    for (let i = 0; i < 5; i += 1) {
      const wNum = baseWave + i;
      const mx = Math.round(x0 + (span * i) / 4);
      const isBoss = wNum % 4 === 0;
      const isSupply = wNum % 2 === 0 && !isBoss;
      const col = isBoss ? 0xff4b5c : isSupply ? 0xffd166 : 0x43cff4;
      this.navGfx.fillStyle(col, 1);
      this.navGfx.fillRect(mx - 4, y - 4, 8, 8);
      const tag = isBoss ? `W${wNum}☠BOSS` : isSupply ? `W${wNum}⚡空投` : `W${wNum}`;
      this.navMilestones[i]
        .setText(tag)
        .setColor(isBoss ? "#ff4b5c" : isSupply ? "#ffd166" : "#93a7bd")
        .setPosition(mx, y + 7);
    }

    // Plot all 4 players along the rolling navigation route with anti-overlap label spacing!
    const pins = room.slots.map((slot, idx) => {
      const s = slot.session;
      const w = s.endless?.wave || 1;
      const wk = s.endless?.waveKills || 0;
      const wt = Math.max(1, s.endless?.waveTargetKills || 10);
      const contWave = w + Math.min(0.98, wk / wt);
      const ratio = Math.max(0, Math.min(1, (contWave - baseWave) / 4));
      return {
        idx,
        px: Math.round(x0 + ratio * span),
        col: slot.accentColor ?? 0x43cff4,
        isLocal: slot.id === room.localSlotId,
        ended: s.phase === GAME_PHASES.ENDED,
        short: String(slot.name || slot.id).slice(0, 4),
      };
    });

    // Sort left-to-right to enforce minimum 58px horizontal separation between callsign badges
    const sortedPins = [...pins].sort((a, b) => a.px - b.px);
    let lastLabelX = -999;
    for (const p of sortedPins) {
      p.labelX = Math.max(46, Math.min(674, Math.max(p.px, lastLabelX + 58)));
      lastLabelX = p.labelX;
    }

    for (const p of pins) {
      const colHex = `#${p.col.toString(16).padStart(6, "0")}`;
      if (p.isLocal) {
        this.navGfx.lineStyle(3, p.col, 0.9);
        this.navGfx.lineBetween(x0, y, p.px, y);
      }
      // Crisp pixel-art square/stepped diamond marker on the track (no triangles)
      this.navGfx.fillStyle(p.ended ? 0x4f6781 : p.col, 1);
      this.navGfx.fillRect(p.px - 4, y - 4, 8, 8);
      this.navGfx.fillStyle(0xf4f8ff, p.ended ? 0.3 : 0.9);
      this.navGfx.fillRect(p.px - 1, y - 1, 2, 2);

      // Thin 1px stem connecting exact track position to anti-overlap callsign badge
      this.navGfx.lineStyle(1, p.ended ? 0x4f6781 : p.col, 0.6);
      this.navGfx.lineBetween(p.px, y - 5, p.labelX, y - 13);

      this.navPins[p.idx]
        .setText(p.ended ? `✕${p.short}` : `${p.isLocal ? "★" : ""}${p.short}`)
        .setColor(p.ended ? "#6a7b8c" : colHex)
        .setPosition(p.labelX, y - 14);
    }
  }

  destroy() {
    this.topBg.destroy();
    this.topLine.destroy();
    this.navGfx.destroy();
    for (const m of this.navMilestones) m.destroy();
    for (const p of this.navPins) p.destroy();
    this.bossDpsText.destroy();
    this.leaveSpectateBtn.destroy();
    this.pauseBg.destroy();
    this.bottomBg.destroy();
    this.bottomLine.destroy();
    for (const c of this.slotCards) {
      c.bg.destroy();
      c.icon.destroy();
      c.title.destroy();
      c.hpLabel.destroy();
      c.info.destroy();
      c.barBg.destroy();
      c.barFill.destroy();
      c.barTip.destroy();
    }
    for (const b of this.formButtons) {
      b.bg.destroy();
      b.icon.destroy();
      b.title.destroy();
      b.cdText.destroy();
      for (const p of b.pips) p.destroy();
    }
    this.skillBg.destroy();
    this.skillIcon.destroy();
    this.skillBtnText.destroy();
    this.overloadBg.destroy();
    this.overloadIcon.destroy();
    this.overloadBtnText.destroy();
    this.coreText.destroy();
    this.timerText.destroy();
    this.paceText.destroy();
    this.pauseBtn.destroy();
    this.spectateBanner.destroy();
    this.spectateText.destroy();
    this.overloadHint.destroy();
    this.coreHitZone.destroy();
  }
}
