import { ensurePixelFpBossSprite, ensurePixelIcon } from "./pixel-ui.js";
import { WEAPON_FORMS } from "../core/weapon-forms.js";

/**
 * High-Craft First-Person Fighter Cockpit HUD (per AgentBase pixel-hud.md):
 * - Grounded cockpit canopy struts & high-contrast dark-glass HUD backing
 * - Scrolling Left Speed Tape (SPD) & Right Altitude Tape (ALT)
 * - Tilting Canopy Pitch Ladder (+10 / 0 / -10) + Weapon-Form Muzzle Pods ([1]/[2]/[3])
 * - 3-panel Instrument Console (Mach LED bars, ADI Horizon, Circular Sweep Radar)
 * - Dynamic Target Lock Telemetry Box ("LOCK · XXXm")
 */
export class FirstPersonCockpit {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(42).setVisible(false);
    this.banner = scene.add
      .text(360, 200, "◈ OVERLOAD · 第一视角突击 ◈", {
        fontSize: "14px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ffd166",
        fontStyle: "bold",
        stroke: "#05080f",
        strokeThickness: 4,
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(43)
      .setVisible(false);
    this.spdText = scene.add
      .text(64, 470, "SPD 3600", { fontSize: "11px", color: "#58e69a", fontStyle: "bold", backgroundColor: "#06111c", padding: { x: 4, y: 2 } })
      .setOrigin(0, 0.5)
      .setDepth(44)
      .setVisible(false);
    this.altText = scene.add
      .text(656, 470, "ALT 0840", { fontSize: "11px", color: "#58e69a", fontStyle: "bold", backgroundColor: "#06111c", padding: { x: 4, y: 2 } })
      .setOrigin(1, 0.5)
      .setDepth(44)
      .setVisible(false);
    this.wpnText = scene.add
      .text(28, 254, "SYS: 疾风脉冲", { fontSize: "11px", color: "#43cff4", fontStyle: "bold", backgroundColor: "#06111c", padding: { x: 5, y: 3 } })
      .setOrigin(0, 0.5)
      .setDepth(44)
      .setVisible(false);
    this.lockText = scene.add
      .text(0, 0, "", { fontSize: "11px", color: "#ffd166", fontStyle: "bold", backgroundColor: "#06111c", padding: { x: 3, y: 2 } })
      .setOrigin(0.5)
      .setDepth(44)
      .setVisible(false);
    this.machText = scene.add
      .text(148, 996, "MACH 3.6 · THRUST", { fontSize: "11px", color: "#43cff4", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(44)
      .setVisible(false);
    this.radarText = scene.add
      .text(572, 992, "TAC-RADAR", { fontSize: "10px", color: "#58e69a", fontStyle: "bold" })
      .setOrigin(0.5)
      .setDepth(44)
      .setVisible(false);
    this.hudIcon = scene.add
      .image(96, 996, ensurePixelIcon(scene, "overload"))
      .setScale(1.2)
      .setDepth(44)
      .setVisible(false);
    this.fpBossSprite = scene.add
      .image(360, 360, ensurePixelFpBossSprite(scene))
      .setScale(4.2)
      .setDepth(41)
      .setVisible(false);
    this.bossHudText = scene.add
      .text(360, 238, "", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ff4b5c",
        fontStyle: "bold",
        backgroundColor: "#06111ccc",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(44)
      .setVisible(false);
    this.dodgeAlertText = scene.add
      .text(360, 742, "", {
        fontSize: "15px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ffd166",
        fontStyle: "bold",
        backgroundColor: "#260a10dd",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);
    this.laneTexts = [0, 1, 2].map((i) =>
      scene.add
        .text(240 + i * 120, 938, "", {
          fontSize: "11px",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          color: "#93a7bd",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(45)
        .setVisible(false)
    );
    this.strafeHintText = scene.add
      .text(360, 908, "", {
        fontSize: "12px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#43cff4",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);

    this.recoil = 0;
    this.diveSweepMs = 0;
    this.radarAngle = 0;
    this.tapeScroll = 0;
  }

  triggerFire() {
    this.recoil = 10;
  }

  triggerDiveSweep() {
    this.diveSweepMs = 450;
  }

  render(session, dtMs) {
    const active = Boolean(session.core?.overloadActive);
    this.gfx.setVisible(active);
    this.banner.setVisible(active);
    this.spdText.setVisible(active);
    this.altText.setVisible(active);
    this.wpnText.setVisible(active);
    this.machText.setVisible(active);
    this.radarText.setVisible(active);
    this.hudIcon.setVisible(active);
    if (!active) {
      this.lockText.setVisible(false);
      this.fpBossSprite.setVisible(false);
      this.bossHudText.setVisible(false);
      this.dodgeAlertText.setVisible(false);
      this.strafeHintText.setVisible(false);
      for (const lt of this.laneTexts) lt.setVisible(false);
      return;
    }

    this.recoil = Math.max(0, this.recoil - dtMs * 0.08);
    if (this.diveSweepMs > 0) this.diveSweepMs = Math.max(0, this.diveSweepMs - dtMs);
    this.radarAngle = (this.radarAngle + dtMs * 0.004) % (Math.PI * 2);
    this.tapeScroll = (this.tapeScroll + dtMs * 0.09) % 28;
    this.gfx.clear();

    const laneNorm = (session.ship.x - 360) / 360;
    const shiftX = Math.round(-laneNorm * 28);
    const roll = Math.max(-0.36, Math.min(0.36, (session.ship.vx || 0) * 0.00028 + laneNorm * 0.08));
    const rOff = Math.round(this.recoil);
    const form = WEAPON_FORMS[session.activeForm || "pulse"];

    // Urgent peripheral red/amber canopy alert bars
    const urgent = session.core.overloadRemainingMs < 2500;
    const alertPulse = 0.35 + 0.55 * Math.abs(Math.sin(this.radarAngle * (urgent ? 5.5 : 2.2)));
    this.gfx.fillStyle(urgent ? 0xff4b5c : 0xff8c3a, alertPulse * 0.22);
    this.gfx.fillRect(0, 140, 10, 980);
    this.gfx.fillRect(710, 140, 10, 980);

    // 1. Armored Pixel-Art Steel Cockpit Canopy Framing (grounded gussets + top HUD visor, no thin floating lines!)
    this.gfx.fillStyle(0x0b1320, 0.96);
    // Top-left & top-right armored canopy corners
    this.gfx.fillTriangle(0, 136, 175, 136, 0, 238);
    this.gfx.fillTriangle(720, 136, 545, 136, 720, 238);
    // Bottom-left & bottom-right heavy side canopy pillars connecting cleanly into dashboard
    this.gfx.fillTriangle(0, 880, 0, 1110, 92, 1110);
    this.gfx.fillTriangle(720, 880, 720, 1110, 628, 1110);
    // Beveled metallic inner trim + corner rivets
    this.gfx.lineStyle(3, 0x2c425c, 0.95);
    this.gfx.lineBetween(175, 136, 0, 238);
    this.gfx.lineBetween(545, 136, 720, 238);
    this.gfx.lineBetween(0, 880, 92, 1110);
    this.gfx.lineBetween(720, 880, 628, 1110);
    this.gfx.lineStyle(2, form.color, 0.75);
    this.gfx.lineBetween(168, 140, 0, 232);
    this.gfx.lineBetween(552, 140, 720, 232);
    // Top overhead HUD visor glass strip
    this.gfx.fillStyle(0x0a1728, 0.72);
    this.gfx.fillRect(175, 136, 370, 28);
    this.gfx.lineStyle(1.5, form.color, 0.65);
    this.gfx.lineBetween(175, 164, 545, 164);

    // 2. Canopy Helmet HUD: Scrolling Airspeed (Left) & Altitude (Right) Tapes
    const tapeTop = 340;
    const tapeBot = 600;
    this.gfx.lineStyle(1.5, 0x58e69a, 0.55);
    this.gfx.lineBetween(54, tapeTop, 54, tapeBot);
    this.gfx.lineBetween(666, tapeTop, 666, tapeBot);
    for (let y = tapeTop + Math.round(this.tapeScroll); y < tapeBot; y += 28) {
      this.gfx.lineBetween(42, y, 54, y);
      this.gfx.lineBetween(666, y, 678, y);
    }
    const machNum = (3.4 + Math.abs(laneNorm) * 0.4 + (rOff > 0 ? 0.1 : 0)).toFixed(1);
    const spdVal = Math.round(Number(machNum) * 1020);
    const altVal = Math.max(120, Math.round(860 - Math.abs(laneNorm) * 140 + Math.sin(this.radarAngle) * 18));
    this.spdText.setText(`SPD ${spdVal}`).setPosition(62, 470);
    this.altText.setText(`ALT ${String(altVal).padStart(4, "0")}`).setPosition(658, 470);
    this.wpnText.setText(`SYS: ${form.name} · ${form.skillName}`).setColor(form.hex);

    // Integrated angled wing-mounted weapon barrels tucked cleanly into lower canopy frame
    for (const side of [-1, 1]) {
      const bx = side < 0 ? 44 + shiftX * 0.3 : 676 + shiftX * 0.3;
      const by = 992 + rOff;
      this.gfx.fillStyle(0x182638, 0.98);
      this.gfx.fillRect(bx - 22, by - 14, 44, 42);
      this.gfx.lineStyle(2, form.color, 0.9);
      this.gfx.strokeRect(bx - 22, by - 14, 44, 42);
      if (session.activeForm === "heavy") {
        this.gfx.fillStyle(0xff8c3a, 1);
        this.gfx.fillRect(bx - 10, by - 24, 20, 12);
      } else if (session.activeForm === "magnet") {
        this.gfx.fillStyle(0xb07cff, 1);
        this.gfx.fillRect(bx - 7, by - 24, 14, 10);
      } else {
        this.gfx.fillStyle(0x43cff4, 1);
        this.gfx.fillRect(bx - 3, by - 28, 6, 16);
      }
    }

    // 3. Detailed Lower Fighter Instrument Console
    const cx = 360 + shiftX;
    const cy = 1028 + Math.round(rOff * 0.35);
    const consoleLeft = cx - 294;
    const consoleTop = cy - 52;

    this.gfx.fillStyle(0x09111d, 0.96);
    this.gfx.fillRect(consoleLeft, consoleTop, 588, 104);
    this.gfx.lineStyle(3, 0x2c425c, 1);
    this.gfx.strokeRect(consoleLeft, consoleTop, 588, 104);
    this.gfx.lineStyle(2, form.color, 0.8);
    this.gfx.lineBetween(consoleLeft, consoleTop, consoleLeft + 588, consoleTop);

    // Left MFD: Segmented Afterburner Mach Bar + Overload Timer
    const lmX = consoleLeft + 16;
    const lmY = consoleTop + 10;
    this.gfx.fillStyle(0x050a12, 1);
    this.gfx.fillRect(lmX, lmY, 152, 84);
    this.gfx.lineStyle(2, 0x43cff4, 0.75);
    this.gfx.strokeRect(lmX, lmY, 152, 84);
    this.machText.setText(`MACH ${machNum} · THRUST`).setPosition(lmX + 86, lmY + 14);
    this.hudIcon.setPosition(lmX + 18, lmY + 14);

    const remRatio = Math.max(0, Math.min(1, session.core.overloadRemainingMs / Math.max(1, session.core.overloadDurationMs)));
    const litBars = Math.ceil(remRatio * 10);
    for (let b = 0; b < 10; b += 1) {
      const bx = lmX + 12 + b * 13;
      const by = lmY + 34;
      const col = b >= 7 ? 0xff4b5c : b >= 4 ? 0xff8c3a : 0x43cff4;
      this.gfx.fillStyle(b < litBars ? col : 0x152234, 1);
      this.gfx.fillRect(bx, by, 10, 22);
    }
    this.gfx.fillStyle(0x16293d, 1);
    this.gfx.fillRect(lmX + 12, lmY + 64, 128, 8);
    this.gfx.fillStyle(0xffd166, 0.9);
    this.gfx.fillRect(lmX + 12, lmY + 64, Math.round(128 * remRatio), 8);

    // Center ADI: Artificial Horizon + Bank Scale + Pitch Ladder
    const hx = cx;
    const hy = cy;
    this.gfx.fillStyle(0x050a12, 1);
    this.gfx.fillCircle(hx, hy, 44);
    this.gfx.lineStyle(2.5, 0x43cff4, 0.9);
    this.gfx.strokeCircle(hx, hy, 44);
    for (const deg of [-30, -15, 0, 15, 30]) {
      const a = -Math.PI / 2 + (deg * Math.PI) / 180;
      const r1 = deg === 0 ? 37 : 39;
      this.gfx.lineStyle(deg === 0 ? 2 : 1.5, deg === 0 ? 0xffd166 : 0x9bb4cc, 0.9);
      this.gfx.lineBetween(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, hx + Math.cos(a) * 44, hy + Math.sin(a) * 44);
    }
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    this.gfx.lineStyle(2, 0x43cff4, 0.95);
    this.gfx.lineBetween(hx - 34 * cosR, hy - 34 * sinR, hx + 34 * cosR, hy + 34 * sinR);
    this.gfx.lineStyle(1.5, 0x58e69a, 0.8);
    this.gfx.lineBetween(hx - 18 * cosR - 14 * sinR, hy - 18 * sinR + 14 * cosR, hx + 18 * cosR - 14 * sinR, hy + 18 * sinR + 14 * cosR);
    this.gfx.lineBetween(hx - 18 * cosR + 14 * sinR, hy - 18 * sinR - 14 * cosR, hx + 18 * cosR + 14 * sinR, hy + 18 * sinR - 14 * cosR);
    this.gfx.lineStyle(2.5, 0xffd166, 1);
    this.gfx.lineBetween(hx - 14, hy, hx - 5, hy);
    this.gfx.lineBetween(hx - 5, hy, hx, hy + 5);
    this.gfx.lineBetween(hx, hy + 5, hx + 5, hy);
    this.gfx.lineBetween(hx + 5, hy, hx + 14, hy);

    // Right MFD: Circular Tactical Sweep Radar
    const rmX = consoleLeft + 420;
    const rmY = consoleTop + 10;
    const radCx = rmX + 76;
    const radCy = rmY + 46;
    this.gfx.fillStyle(0x050a12, 1);
    this.gfx.fillRect(rmX, rmY, 152, 84);
    this.gfx.lineStyle(2, 0x58e69a, 0.7);
    this.gfx.strokeRect(rmX, rmY, 152, 84);
    this.radarText.setPosition(radCx, rmY + 11);
    this.gfx.lineStyle(1, 0x58e69a, 0.35);
    this.gfx.strokeCircle(radCx, radCy, 30);
    this.gfx.strokeCircle(radCx, radCy, 16);
    this.gfx.lineStyle(1.5, 0x58e69a, 0.75);
    this.gfx.lineBetween(radCx, radCy, radCx + Math.cos(this.radarAngle) * 30, radCy + Math.sin(this.radarAngle) * 30);
    for (const e of session.enemies) {
      const dx = ((e.x - session.ship.x) / 400) * 26;
      const dy = (((e.y - 240) / 800) - 0.5) * 26;
      if (Math.hypot(dx, dy) <= 28) {
        this.gfx.fillStyle(0xff4b5c, 1);
        this.gfx.fillRect(Math.round(radCx + dx) - 2, Math.round(radCy + dy) - 2, 4, 4);
      }
    }
    if (session.boss) {
      const bdx = ((session.boss.x - session.ship.x) / 400) * 24;
      this.gfx.fillStyle(0xffd166, 1);
      this.gfx.fillRect(Math.round(radCx + bdx) - 3, Math.round(radCy - 14) - 3, 6, 6);
    }

    // 4. High-Tech HUD Targeting Pipper + Canopy Pitch Ladder
    const aimX = Math.round(session.ship.x);
    const aimY = 470 - Math.round(rOff * 0.4);
    const lockTarget = session.enemies.find((e) => e.id === session.lockedTargetId) || session.enemies[0];

    // Tilting HUD pitch ladder on windshield
    this.gfx.lineStyle(1.5, 0x58e69a, 0.48);
    for (const dy of [-55, 55]) {
      this.gfx.lineBetween(aimX - 44 * cosR, aimY + dy - 44 * sinR, aimX - 18 * cosR, aimY + dy - 18 * sinR);
      this.gfx.lineBetween(aimX + 18 * cosR, aimY + dy + 18 * sinR, aimX + 44 * cosR, aimY + dy + 44 * sinR);
    }

    this.gfx.lineStyle(1.5, form.color, 0.65);
    this.gfx.lineBetween(aimX - 68, aimY - 26, aimX - 68, aimY + 26);
    this.gfx.lineBetween(aimX + 68, aimY - 26, aimX + 68, aimY + 26);
    this.gfx.lineBetween(aimX - 68, aimY - 26, aimX - 58, aimY - 26);
    this.gfx.lineBetween(aimX - 68, aimY + 26, aimX - 58, aimY + 26);
    this.gfx.lineBetween(aimX + 68, aimY - 26, aimX + 58, aimY - 26);
    this.gfx.lineBetween(aimX + 68, aimY + 26, aimX + 58, aimY + 26);

    const segRadius = 24 + Math.round(rOff * 0.5);
    for (let s = 0; s < 4; s += 1) {
      const a0 = this.radarAngle * 0.6 + (s * Math.PI) / 2 + 0.18;
      const a1 = a0 + Math.PI / 2 - 0.36;
      this.gfx.lineStyle(2.5, 0xffd166, 0.95);
      this.gfx.beginPath();
      this.gfx.arc(aimX, aimY, segRadius, a0, a1, false);
      this.gfx.strokePath();
    }
    this.gfx.fillStyle(0xff4b5c, 1);
    this.gfx.fillCircle(aimX, aimY, 3);

    // 3D Perspective Cockpit Lane Guide Rails + 3-Slot Tactical Track Indicator (L / C / R)
    this.#renderCockpitLaneTracker(session, shiftX);

    if (session.boss) {
      this.#renderFirstPersonBoss(session, aimX, aimY, shiftX, rOff);
    } else {
      this.fpBossSprite.setVisible(false);
      this.bossHudText.setVisible(false);
    }

    // Cockpit Dodge Warning for Boss Lane Lasers (Overload Shield already deflects standard bullets!)
    const inDangerLane = (session.bossWarnings || []).some((w) => w.sector === session.ship.sector);
    if (inDangerLane) {
      const blinkWarn = Math.floor(this.radarAngle * 4) % 2 === 0;
      const hintDir = session.ship.sector === 0 ? "向右 [D] 闪避 ▶" : session.ship.sector === 2 ? "◀ 向左 [A] 闪避" : "◀ [A] / [D] ▶ 闪避";
      this.dodgeAlertText
        .setText(`⚠ 激光锁定当前航道 · ${hintDir}`)
        .setColor(blinkWarn ? "#ffd166" : "#ff4b5c")
        .setVisible(true);
    } else {
      this.dodgeAlertText.setVisible(false);
    }

    if (lockTarget) {
      const lx = Math.round(lockTarget.x);
      const ly = Math.round(lockTarget.y);
      const distM = Math.max(80, Math.round((1050 - lockTarget.y) * 1.1));
      this.gfx.lineStyle(1.5, 0xff8c3a, 0.75);
      this.gfx.lineBetween(aimX, aimY, lx, ly);
      this.gfx.strokeRect(lx - 14, ly - 14, 28, 28);
      this.lockText.setText(`LOCK ${distM}m`).setPosition(lx, ly - 24).setVisible(true);
    } else {
      this.lockText.setVisible(false);
    }
  }

  #renderCockpitLaneTracker(session, shiftX) {
    const playerSector = session.ship.sector ?? 1;
    const bossSector = session.boss ? (session.boss.x < 250 ? 0 : session.boss.x > 470 ? 2 : 1) : -1;
    const warnSet = new Set((session.bossWarnings || []).map((w) => w.sector));

    // Subtle 3D perspective lane divider rails on the lower canopy glass
    for (const divX of [250, 470]) {
      const topX = Math.round(360 + (divX - 360) * 0.35 + shiftX * 0.4);
      const botX = Math.round(divX + shiftX * 0.9);
      this.gfx.lineStyle(1, 0x43cff4, 0.22);
      this.gfx.lineBetween(topX, 380, botX, 910);
    }

    // 3-Slot Cockpit Lane Bar right above the instrument console (y=938)
    const laneNames = ["◀ 左轨 [A]", "中轨 [C]", "右轨 [D] ▶"];
    for (let i = 0; i < 3; i += 1) {
      const cx = 240 + i * 120;
      const cy = 938;
      const isPlayer = playerSector === i;
      const isWarn = warnSet.has(i);
      const isBoss = bossSector === i;

      const fill = isWarn ? 0x3b0f18 : isPlayer ? 0x102a42 : 0x08111e;
      const stroke = isWarn ? 0xff4b5c : isPlayer ? 0xffd166 : isBoss ? 0xff8c3a : 0x2a425e;
      this.gfx.fillStyle(fill, 0.92);
      this.gfx.fillRect(cx - 54, cy - 14, 108, 28);
      this.gfx.lineStyle(isPlayer || isWarn ? 2 : 1.5, stroke, 0.95);
      this.gfx.strokeRect(cx - 54, cy - 14, 108, 28);

      const tag = isWarn
        ? `⚠ 危险`
        : isPlayer && isBoss
          ? `▶我方·正对☠`
          : isPlayer
            ? `▶ 我方轨道 ◀`
            : isBoss
              ? `☠ BOSS`
              : laneNames[i];
      this.laneTexts[i]
        .setText(tag)
        .setColor(isWarn ? "#ff4b5c" : isPlayer ? "#ffd166" : isBoss ? "#ff8c3a" : "#7d96b0")
        .setPosition(cx, cy)
        .setVisible(true);
    }

    // Active strafe direction feedback when moving across lanes
    const vx = session.ship.vx || 0;
    if (Math.abs(vx) > 80) {
      this.strafeHintText
        .setText(vx < 0 ? "◀◀ 正在向左切轨 [A]" : "正在向右切轨 [D] ▶▶")
        .setColor("#43cff4")
        .setVisible(true);
    } else if (warnSet.has(playerSector)) {
      const safeDir = playerSector === 0 ? "向右切轨 [D] ▶▶" : playerSector === 2 ? "◀◀ 向左切轨 [A]" : "◀ [A] / [D] ▶ 切轨";
      this.strafeHintText.setText(`⚡ 建议: ${safeDir}`).setColor("#ffd166").setVisible(true);
    } else {
      this.strafeHintText.setVisible(false);
    }
  }

  #renderFirstPersonBoss(session, aimX, aimY, shiftX, rOff) {
    const boss = session.boss;
    const relX = boss.x - session.ship.x;
    const yaw = Math.max(-0.85, Math.min(0.85, relX / 340));
    const bx = Math.round(360 + relX * 0.54 + shiftX * 0.45);
    const by = Math.round(362 + Math.sin(this.radarAngle * 1.4) * 8 - Math.abs(relX) * 0.04 + rOff * 0.25);

    const isPhase2 = boss.phase === 2;
    const isInvuln = (boss.invulnMs || 0) > 0;
    const formDef = WEAPON_FORMS[boss.activeForm || "pulse"];
    const trimCol = isPhase2 ? 0xff4b5c : formDef.color;

    // True Pixel-Art 96x44 Frontal Boss Sprite with 3D lane-foreshortening & banking
    const scaleX = 4.2 - Math.abs(yaw) * 0.85;
    const scaleY = 4.2 + (1 - Math.abs(yaw)) * 0.25;
    this.fpBossSprite
      .setVisible(true)
      .setPosition(bx, by)
      .setScale(scaleX, scaleY)
      .setRotation(yaw * 0.2)
      .setTint(isInvuln ? 0xffd166 : isPhase2 ? 0xff9eb0 : 0xffffff);

    // Form-colored wingtip weapon pod beacons & central reactor glow
    const spanX = Math.round(168 * (scaleX / 4.2));
    this.gfx.fillStyle(trimCol, 0.9);
    this.gfx.fillCircle(bx - spanX, by + Math.round(-yaw * 28), 6);
    this.gfx.fillCircle(bx + spanX, by + Math.round(yaw * 28), 6);
    this.gfx.fillStyle(isPhase2 ? 0xff4b5c : 0xff8c3a, 0.75 + 0.25 * Math.sin(this.radarAngle * 5));
    this.gfx.fillCircle(bx, by + 4, 14);

    // Invulnerable Lock Shield Dome or Phase 2 Crimson Rage Rings
    if (isInvuln) {
      const p = 0.55 + 0.45 * Math.sin(this.radarAngle * 4.5);
      this.gfx.lineStyle(3.5, 0xffd166, p);
      this.gfx.strokeCircle(bx, by, 152);
      this.gfx.lineStyle(2, 0xff4b5c, p * 0.85);
      this.gfx.strokeCircle(bx, by, 168);
    } else if (isPhase2) {
      const p2 = 0.4 + 0.3 * Math.sin(this.radarAngle * 3.2);
      this.gfx.lineStyle(2.5, 0xff4b5c, p2);
      this.gfx.strokeCircle(bx, by, 146);
    }

    // Aligned head-on weakpoint lock indicator (+25% damage!)
    const aligned = Math.abs(relX) < 135;
    if (aligned) {
      this.gfx.lineStyle(2, 0xffd166, 0.92);
      this.gfx.lineBetween(aimX, aimY, bx, by + 4);
    }

    const totalPct = Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100);
    const stateTag = isInvuln ? "锁血无敌" : isPhase2 ? "二阶段·狂暴" : formDef.name;
    const bonusTag = aligned ? " · ★弱点正对 +25%" : " · 护盾偏转中";
    this.bossHudText
      .setText(`⚠ ${boss.name} [${stateTag}] ${totalPct}%${bonusTag}`)
      .setColor(isInvuln ? "#ffd166" : aligned ? "#58e69a" : "#ff4b5c")
      .setPosition(Math.max(190, Math.min(530, bx)), Math.max(214, by - 98))
      .setVisible(true);
  }

  destroy() {
    this.gfx.destroy();
    this.fpBossSprite.destroy();
    this.banner.destroy();
    this.spdText.destroy();
    this.altText.destroy();
    this.wpnText.destroy();
    this.lockText.destroy();
    this.machText.destroy();
    this.radarText.destroy();
    this.hudIcon.destroy();
    this.bossHudText.destroy();
    this.dodgeAlertText.destroy();
    this.strafeHintText.destroy();
    for (const lt of this.laneTexts) lt.destroy();
  }
}
