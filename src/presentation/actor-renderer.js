import { SpriteStackedFighter } from "./sprite-stacker.js";
import { EnemyStacker } from "./enemy-stacker.js";
import { ensurePixelBossAssets, ensurePixelNebula, ensurePixelPodSprite } from "./pixel-ui.js";

/**
 * Shared-Origin 2.5D Pixel Actor Renderer:
 * - Projected ground shadows on Mode 7 deck for player & enemies
 * - 6-layer Sprite-Stacked player fighter + sleek wingtip ion-ribbon trails (no blocky ghost boxes)
 * - Hides 3rd-person player ship during First-Person Overload Cockpit mode
 * - 3~4 layer Sprite-Stacked enemies (depth-scaled 1.25x -> 3.8x)
 */
export class ActorRenderer {
  constructor(scene) {
    this.scene = scene;
    this.shadowsGfx = scene.add.graphics().setDepth(12);
    this.ionTrailGfx = scene.add.graphics().setDepth(18);
    this.trailPoints = [];
    this.stackedFighter = new SpriteStackedFighter(scene);
    this.drones = [
      scene.add.image(304, 1028, "px-drone").setScale(3).setDepth(20),
      scene.add.image(416, 1028, "px-drone").setScale(3).setDepth(20),
      scene.add.image(260, 1004, "px-drone").setScale(2.7).setDepth(20).setVisible(false),
      scene.add.image(460, 1004, "px-drone").setScale(2.7).setDepth(20).setVisible(false),
    ];
    this.modGfx = scene.add.graphics().setDepth(21);
    this.dronePhase = 0;
    this.enemyStacker = new EnemyStacker(scene);
    this.thrusterGfx = scene.add.graphics().setDepth(19);
    this.recoilOffset = 0;

    this.statusGfx = scene.add.graphics().setDepth(14);
    this.wingmanGfx = scene.add.graphics().setDepth(13);
    this.wingmanSprites = [0, 1, 2].map(() =>
      scene.add.image(0, 0, "px-stack-viper-1").setScale(1.85).setAlpha(0.62).setDepth(13).setVisible(false)
    );
    this.wingmanLabels = [0, 1, 2].map(() =>
      scene.add
        .text(0, 0, "", {
          fontSize: "10px",
          color: "#d9e5f2",
          fontStyle: "bold",
          stroke: "#050a14",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(14)
        .setVisible(false)
    );
    this.reticleGfx = scene.add.graphics().setDepth(21);
    this.podGfx = scene.add.graphics().setDepth(22);
    this.nebulaGfx = scene.add.graphics().setDepth(4.5);
    this.nebulaSprite = scene.add.image(0, 0, ensurePixelNebula(scene)).setScale(4).setDepth(4).setVisible(false);
    this.nebulaLabel = scene.add
      .text(0, 0, "⚡ 离子星云 · 充能×1.8", {
        fontSize: "12px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#7ee7ff",
        fontStyle: "bold",
        stroke: "#050a14",
        strokeThickness: 4,
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);
    this.installBanner = scene.add
      .text(360, 178, "", {
        fontSize: "18px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ffd166",
        fontStyle: "bold",
        stroke: "#050a14",
        strokeThickness: 5,
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(55)
      .setVisible(false);
    this.installAnimMs = 0;
    this.installColor = 0x43cff4;
    this.laneSparks = [];
    this.bossGfx = scene.add.graphics().setDepth(17);
    const bossAssets = ensurePixelBossAssets(scene);
    this.bossHullSprite = scene.add.image(360, 314, bossAssets.hullKey).setScale(5.2).setDepth(16).setVisible(false);
    this.bossTurrets = [0, 1].map(() =>
      scene.add.image(0, 0, bossAssets.turretKey).setScale(3.6).setDepth(17.5).setVisible(false)
    );
    this.bossHpText = scene.add
      .text(360, 250, "", {
        fontSize: "13px",
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        color: "#ff4b5c",
        fontStyle: "bold",
        stroke: "#050a14",
        strokeThickness: 4,
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(26)
      .setVisible(false);
    this.podSprites = [0, 1, 2].map(() =>
      scene.add.image(0, 0, ensurePixelPodSprite(scene, "crit")).setScale(3).setDepth(23).setVisible(false)
    );
    this.podLabels = [0, 1, 2].map(() =>
      scene.add
        .text(0, 0, "", {
          fontSize: "13px",
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          color: "#eef6ff",
          fontStyle: "bold",
          stroke: "#050a14",
          strokeThickness: 4,
          padding: { x: 4, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(24)
        .setVisible(false)
    );
  }

  triggerRecoil(amount = 5) {
    this.recoilOffset = Math.min(9, this.recoilOffset + amount);
  }

  triggerBarrelRoll() {
    this.stackedFighter.triggerBarrelRoll();
  }

  triggerDiveFinisher() {
    this.stackedFighter.triggerDiveFinisher();
  }

  triggerUpgradeInstall(color = 0x43cff4, label = "武装强化已实装") {
    this.installAnimMs = 850;
    this.installColor = color;
    this.installBanner.setText(`★ ${label} ★`).setColor(`#${color.toString(16).padStart(6, "0")}`).setVisible(true);
  }

  #depthScaleForY(y) {
    const t = Math.max(0, Math.min(1, (y - 260) / 780));
    return 1.65 + t * 2.75; // 1.65x -> 4.4x for crisp readable enemy details
  }

  render(session, dtMs = 16, chassisId = "viper") {
    this.recoilOffset = Math.max(0, this.recoilOffset - dtMs * 0.05);
    if (this.installAnimMs > 0) this.installAnimMs = Math.max(0, this.installAnimMs - dtMs);
    this.dronePhase += dtMs * 0.006;
    const firstPerson = Boolean(session.core?.overloadActive);

    const evoTier = Math.min(3, 1 + Math.floor((session.installedModules?.length || 0) / 2));
    this.#renderNebulaZones(session.nebulaZones || [], session);
    this.#renderGroundShadows(session, firstPerson);
    this.#renderWingmen(session.wingmen || [], firstPerson);
    this.#renderRouteBoss(session.boss, session.bossWarnings || [], firstPerson);
    if (firstPerson) {
      this.stackedFighter.render({ visible: false }, session.activeForm, dtMs, 0, chassisId, evoTier);
      for (const d of this.drones) d.setVisible(false);
      this.modGfx.clear();
      this.ionTrailGfx.clear();
      this.thrusterGfx.clear();
    } else {
      const dashSurge = (session.warpDashMs || 0) > 0 ? Math.min(28, Math.round((session.warpDashMs / 1900) * 32)) : 0;
      const renderShip = dashSurge > 0 ? { ...session.ship, y: session.ship.y - dashSurge } : session.ship;
      this.stackedFighter.render(renderShip, session.activeForm || "pulse", dtMs, this.recoilOffset, chassisId, evoTier);
      this.#renderDrones(renderShip, session.build);
      this.#renderShipUpgrades(renderShip, session.build, evoTier, chassisId);
      this.#renderWingtipIonTrails(renderShip, session.activeForm);
      this.#renderThrusters(renderShip, session.activeForm);
      this.#renderLaneSpeedSparks(renderShip, session.activeForm, dtMs);
    }

    const enemyDepthBoost = firstPerson ? 1.35 : 1.0;
    this.enemyStacker.sync(session.enemies, (y) => this.#depthScaleForY(y) * enemyDepthBoost);
    this.#renderRelayLinksAndAuras(session.enemies);
    this.#renderLockReticle(session, firstPerson);
    this.#renderSupplyPods(session.supplyPods || []);
    this.#renderInstallLaser(session.ship, firstPerson);
  }

  #renderDrones(ship, build) {
    if (!ship || !ship.visible) {
      for (const d of this.drones) d.setVisible(false);
      return;
    }
    const activeCount = Math.min(4, 2 + Math.max(0, build?.drones || 0));
    const offsets = [
      [-58, -14, 1],
      [58, -14, -1],
      [-92, 6, 0.8],
      [92, 6, -0.8],
    ];
    for (let i = 0; i < this.drones.length; i += 1) {
      if (i >= activeCount) {
        this.drones[i].setVisible(false);
        continue;
      }
      const [ox, oy, sign] = offsets[i];
      const bob = Math.round(Math.sin(this.dronePhase) * 5 * sign);
      this.drones[i].setVisible(true).setPosition(Math.round(ship.x + ox), Math.round(ship.y + oy + bob));
    }
  }

  #renderShipUpgrades(ship, build, evoTier = 1, chassisId = "viper") {
    this.modGfx.clear();
    if (!ship || !ship.visible || !build) return;
    const rx = Math.round(ship.x);
    const ry = Math.round(ship.y);
    const critTier = build.routes?.crit || 0;
    const missileTier = build.routes?.missile || 0;

    // Distinct Chassis Passive Visual Aura
    if (chassisId === "aegis") {
      const shieldAlpha = 0.45 + 0.25 * Math.sin(this.dronePhase * 2.2);
      this.modGfx.lineStyle(2.5, 0xb07cff, shieldAlpha);
      this.modGfx.beginPath();
      this.modGfx.arc(rx, ry - 4, 54, -Math.PI * 0.82, -Math.PI * 0.18, false);
      this.modGfx.strokePath();
    } else if (chassisId === "r9") {
      this.modGfx.fillStyle(0xff8c3a, 0.9);
      this.modGfx.fillRect(rx - 22, ry - 44, 4, 10);
      this.modGfx.fillRect(rx + 18, ry - 44, 4, 10);
    } else {
      this.modGfx.fillStyle(0x43cff4, 0.85);
      this.modGfx.fillRect(rx - 48, ry - 2, 3, 18);
      this.modGfx.fillRect(rx + 45, ry - 2, 3, 18);
    }

    // Mk-II Evolution: Swept outer titanium-cyan delta canards!
    if (evoTier >= 2) {
      this.modGfx.fillStyle(0x2b3e55, 0.95);
      this.modGfx.fillRect(rx - 54, ry - 4, 14, 24);
      this.modGfx.fillRect(rx + 40, ry - 4, 14, 24);
      this.modGfx.fillStyle(0x43cff4, 0.95);
      this.modGfx.fillRect(rx - 54, ry - 8, 4, 26);
      this.modGfx.fillRect(rx + 50, ry - 8, 4, 26);
    }

    // Mk-III Evolution: Apex gold-trimmed forward assault prongs + dorsal stabilizer!
    if (evoTier >= 3) {
      this.modGfx.fillStyle(0xffd166, 0.95);
      this.modGfx.fillRect(rx - 18, ry - 52, 4, 18);
      this.modGfx.fillRect(rx + 14, ry - 52, 4, 18);
      this.modGfx.fillRect(rx - 62, ry + 6, 8, 16);
      this.modGfx.fillRect(rx + 54, ry + 6, 8, 16);
    }

    // Crit route hardware: twin cyan wingtip rail-barrels
    if (critTier >= 1) {
      this.modGfx.fillStyle(0x43cff4, 0.95);
      this.modGfx.fillRect(rx - 44, ry - 30, 5, 22);
      this.modGfx.fillRect(rx + 39, ry - 30, 5, 22);
      this.modGfx.fillStyle(0xf4f8ff, 1);
      this.modGfx.fillRect(rx - 43, ry - 33, 3, 5);
      this.modGfx.fillRect(rx + 40, ry - 33, 3, 5);
    }

    // Missile route hardware: shoulder heavy orange ordnance racks
    if (missileTier >= 1) {
      this.modGfx.fillStyle(0xff8c3a, 0.95);
      this.modGfx.fillRect(rx - 28, ry - 14, 7, 16);
      this.modGfx.fillRect(rx + 21, ry - 14, 7, 16);
      this.modGfx.fillStyle(0xffd166, 1);
      this.modGfx.fillRect(rx - 26, ry - 17, 3, 4);
      this.modGfx.fillRect(rx + 23, ry - 17, 3, 4);
    }
  }

  #renderGroundShadows(session, firstPerson) {
    this.shadowsGfx.clear();
    this.shadowsGfx.fillStyle(0x02050a, 0.48);

    if (!firstPerson && session.ship?.visible) {
      const sx = Math.round(session.ship.x + 14);
      const sy = Math.round(session.ship.y + 42);
      this.shadowsGfx.fillRect(sx - 38, sy - 10, 76, 20);
    }

    for (const e of session.enemies) {
      const scale = this.#depthScaleForY(e.y) / 3.5;
      const rx = Math.round(e.x + 10 * scale);
      const ry = Math.round(e.y + 24 * scale);
      const w = Math.round(44 * scale);
      const h = Math.round(14 * scale);
      this.shadowsGfx.fillRect(rx - Math.round(w / 2), ry - Math.round(h / 2), w, h);
    }
  }

  #renderWingtipIonTrails(ship, activeForm) {
    this.ionTrailGfx.clear();
    if (!ship || !ship.visible) {
      this.trailPoints = [];
      return;
    }

    const rx = Math.round(ship.x);
    const ry = Math.round(ship.y + 18 + this.recoilOffset);
    this.trailPoints.unshift({ x: rx, y: ry });
    if (this.trailPoints.length > 7) this.trailPoints.length = 7;

    if (Math.abs(ship.vx) < 40 && this.trailPoints.length > 1) {
      this.trailPoints.pop();
    }

    const color = activeForm === "heavy" ? 0xff8c3a : activeForm === "magnet" ? 0xb07cff : 0x43cff4;
    for (let i = 0; i < this.trailPoints.length - 1; i += 1) {
      const p0 = this.trailPoints[i];
      const p1 = this.trailPoints[i + 1];
      const alpha = (1 - i / this.trailPoints.length) * 0.42;
      this.ionTrailGfx.lineStyle(2, color, alpha);
      this.ionTrailGfx.lineBetween(p0.x - 42, p0.y + i * 5, p1.x - 42, p1.y + (i + 1) * 5);
      this.ionTrailGfx.lineBetween(p0.x + 42, p0.y + i * 5, p1.x + 42, p1.y + (i + 1) * 5);
    }
  }

  #renderThrusters(ship, activeForm) {
    this.thrusterGfx.clear();
    if (!ship || !ship.visible) return;

    const rx = Math.round(ship.x);
    const ry = Math.round(ship.y + this.recoilOffset);
    const flicker = (Math.random() * 8) | 0;
    const flameLen = 18 + flicker;
    const flameColor = activeForm === "heavy" ? 0xff8c3a : activeForm === "magnet" ? 0xb07cff : 0x43cff4;

    for (const nozzleDx of [-14, 14]) {
      this.thrusterGfx.fillStyle(flameColor, 0.92);
      this.thrusterGfx.fillRect(rx + nozzleDx - 4, ry + 34, 8, flameLen);
      this.thrusterGfx.fillStyle(0xf4f8ff, 0.95);
      this.thrusterGfx.fillRect(rx + nozzleDx - 2, ry + 34, 4, Math.round(flameLen * 0.6));
    }
  }

  #renderRelayLinksAndAuras(enemies) {
    this.statusGfx.clear();
    const relays = enemies.filter((e) => e.type === "relay");

    for (const r of relays) {
      for (const ally of enemies) {
        if (ally.id !== r.id && Math.hypot(ally.x - r.x, ally.y - r.y) < 220) {
          this.statusGfx.lineStyle(2, 0xb07cff, 0.35);
          this.statusGfx.lineBetween(Math.round(r.x), Math.round(r.y), Math.round(ally.x), Math.round(ally.y));
        }
      }
    }

    for (const e of enemies) {
      if (!e.status) continue;
      const ex = Math.round(e.x);
      const ey = Math.round(e.y);
      const scale = this.#depthScaleForY(e.y) / 3.5;
      const color = e.status === "resonance" ? 0x43cff4 : e.status === "fracture" ? 0xff8c3a : 0xb07cff;
      this.statusGfx.lineStyle(2, color, 0.9);
      this.statusGfx.strokeCircle(ex, ey, Math.round((e.radius + 5) * scale));
    }
  }

  #renderLockReticle(session, firstPerson) {
    this.reticleGfx.clear();
    if (firstPerson || !session.lockedTargetId || !session.ship?.visible) return;
    const target = session.enemies.find((e) => e.id === session.lockedTargetId);
    if (!target) return;

    const tx = Math.round(target.x);
    const ty = Math.round(target.y);
    const r = Math.round((target.radius + 10) * (this.#depthScaleForY(target.y) / 3.5));
    const color = session.activeForm === "heavy" ? 0xff8c3a : session.activeForm === "magnet" ? 0xb07cff : 0x43cff4;
    this.reticleGfx.lineStyle(2, color, 0.92);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      this.reticleGfx.lineBetween(tx + sx * r, ty + sy * r, tx + sx * (r - 8), ty + sy * r);
      this.reticleGfx.lineBetween(tx + sx * r, ty + sy * r, tx + sx * r, ty + sy * (r - 8));
    }
  }

  #renderSupplyPods(pods) {
    this.podGfx.clear();
    for (let i = 0; i < this.podLabels.length; i += 1) {
      const pod = pods[i];
      const lbl = this.podLabels[i];
      const spr = this.podSprites[i];
      if (!pod) {
        lbl.setVisible(false);
        spr.setVisible(false);
        continue;
      }
      const px = Math.round(pod.x);
      const bob = Math.round(Math.sin(this.dronePhase * 1.4 + i) * 4);
      const py = Math.round(pod.y + bob);
      const depthT = Math.max(0, Math.min(1, (pod.y - 345) / 615));
      const pScale = 1.25 + depthT * 2.15; // 1.25x far -> 3.4x near for genuine 2.5D approach!
      const route = pod.card.route || "crit";
      const color = route === "missile" ? 0xff8c3a : route === "swarm" ? 0xb07cff : 0x43cff4;
      const pulse = 0.55 + 0.45 * Math.sin(this.dronePhase * 1.8 + i);

      // 2.5D perspective drop-trail & diamond target brackets around 16x16 capsule
      const br = Math.round(12 * pScale);
      this.podGfx.lineStyle(2, color, pulse);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        this.podGfx.lineBetween(px + sx * br, py + sy * br, px + sx * (br - 7), py + sy * br);
        this.podGfx.lineBetween(px + sx * br, py + sy * br, px + sx * br, py + sy * (br - 7));
      }
      if (pod.y < pod.targetY - 10) {
        this.podGfx.lineStyle(2, color, 0.45);
        this.podGfx.lineBetween(px, py, Math.round(pod.startX + (px - pod.startX) * 0.72), Math.max(340, py - 42));
      }

      spr.setTexture(ensurePixelPodSprite(this.scene, route)).setPosition(px, py).setScale(pScale).setVisible(true);
      lbl.setText(pod.card.name).setColor(`#${color.toString(16).padStart(6, "0")}`).setPosition(px, py - Math.round(16 * pScale) - 12).setVisible(true);
    }
  }

  #renderNebulaZones(zones, session) {
    this.nebulaGfx.clear();
    const neb = zones[0];
    if (!neb) {
      this.nebulaSprite.setVisible(false);
      this.nebulaLabel.setVisible(false);
      return;
    }
    const nx = Math.round(neb.x);
    const ny = Math.round(neb.y);
    const r = neb.radius || 112;
    const pulse = 0.7 + 0.3 * Math.sin(this.dronePhase * 1.5 + neb.id);
    const heat = Math.round(session?.nebulaHeat || 0);
    const hot = heat >= 65;
    this.nebulaSprite
      .setVisible(true)
      .setPosition(nx, ny)
      .setRotation(this.dronePhase * 0.08)
      .setTint(hot ? 0xff8c3a : 0xffffff)
      .setAlpha(0.88 * pulse);
    this.nebulaLabel
      .setText(session?.inIonNebula || heat > 5 ? `⚡ 离子星云 充能×1.8 | 过热 ${heat}%` : "⚡ 离子星云 · 充能×1.8 (久留过热)")
      .setColor(hot ? "#ff8c3a" : "#c89bff")
      .setPosition(nx, ny - r + 14)
      .setVisible(true);

    // Overheat decision ring around the nebula when charging heat > 0
    if (heat > 0) {
      this.nebulaGfx.lineStyle(3, hot ? 0xff4b5c : 0xffd166, 0.78);
      this.nebulaGfx.beginPath();
      const endAng = -Math.PI / 2 + (Math.PI * 2 * Math.min(100, heat)) / 100;
      this.nebulaGfx.arc(nx, ny, r - 6, -Math.PI / 2, endAng, false);
      this.nebulaGfx.strokePath();
    }

    // Jagged electric lightning arcs crackling inside the organic nebula cloud
    for (let k = 0; k < 5; k += 1) {
      const ang = this.dronePhase * 1.1 + (k * Math.PI * 2) / 5;
      const x1 = nx + Math.cos(ang) * (r * 0.25);
      const y1 = ny + Math.sin(ang) * (r * 0.25);
      const mx = nx + Math.cos(ang + 0.35) * (r * 0.55);
      const my = ny + Math.sin(ang + 0.35) * (r * 0.55);
      const x2 = nx + Math.cos(ang + 0.1) * (r * 0.82);
      const y2 = ny + Math.sin(ang + 0.1) * (r * 0.82);
      this.nebulaGfx.lineStyle(1.5, 0x7ee7ff, 0.72 * pulse);
      this.nebulaGfx.lineBetween(Math.round(x1), Math.round(y1), Math.round(mx), Math.round(my));
      this.nebulaGfx.lineBetween(Math.round(mx), Math.round(my), Math.round(x2), Math.round(y2));
    }
  }

  #renderInstallLaser(ship, firstPerson) {
    if (this.installAnimMs <= 0) {
      this.installBanner.setVisible(false);
      return;
    }
    if (firstPerson || !ship?.visible) return;
    const t = this.installAnimMs / 850;
    const rx = Math.round(ship.x);
    const ry = Math.round(ship.y);
    const spread = Math.round(t * 68);
    // Twin converging laser-welding beams + radial assembly flash
    this.modGfx.lineStyle(3.5, 0xeef6ff, t);
    this.modGfx.lineBetween(rx - 86, ry - 110, rx - spread, ry - 12);
    this.modGfx.lineBetween(rx + 86, ry - 110, rx + spread, ry - 12);
    this.modGfx.lineStyle(2.5, this.installColor, t);
    this.modGfx.strokeCircle(rx, ry, Math.round(28 + (1 - t) * 56));
  }

  #renderLaneSpeedSparks(ship, activeForm, dtMs) {
    if (!ship || !ship.visible) {
      this.laneSparks = [];
      return;
    }
    const speedMag = Math.abs(ship.vx || 0);
    const color = activeForm === "heavy" ? 0xff8c3a : activeForm === "magnet" ? 0xb07cff : 0x43cff4;
    if (speedMag > 140) {
      const dir = Math.sign(ship.vx || 1);
      // Clean symmetrical twin wingtip Mach slipstream ribbons (zero messy random scatter)
      if (!this._sparkCooldown || this._sparkCooldown <= 0) {
        this._sparkCooldown = 36;
        for (const wingSide of [-34, 34]) {
          this.laneSparks.push({
            x: ship.x + wingSide - dir * 8,
            y: ship.y + 18,
            vx: -dir * 95,
            vy: 420,
            color: wingSide < 0 ? 0xeef6ff : color,
            lifeMs: 160,
            maxLifeMs: 160,
          });
        }
        if (this.laneSparks.length > 14) this.laneSparks.splice(0, this.laneSparks.length - 14);
      } else {
        this._sparkCooldown -= dtMs;
      }
    }

    const dtSec = dtMs / 1000;
    for (const sp of this.laneSparks) {
      sp.lifeMs -= dtMs;
      if (sp.lifeMs <= 0) continue;
      sp.x += sp.vx * dtSec;
      sp.y += sp.vy * dtSec;
      const a = sp.lifeMs / sp.maxLifeMs;
      this.thrusterGfx.lineStyle(1.5, sp.color, a * 0.65);
      this.thrusterGfx.lineBetween(Math.round(sp.x), Math.round(sp.y), Math.round(sp.x - sp.vx * 0.025), Math.round(sp.y - sp.vy * 0.025));
    }
    this.laneSparks = this.laneSparks.filter((s) => s.lifeMs > 0);
  }

  #renderWingmen(wingmen, firstPerson) {
    this.wingmanGfx.clear();
    for (let i = 0; i < this.wingmanLabels.length; i += 1) {
      const w = wingmen[i];
      const lbl = this.wingmanLabels[i];
      const spr = this.wingmanSprites[i];
      if (!w || w.ended || firstPerson) {
        lbl.setVisible(false);
        spr.setVisible(false);
        continue;
      }
      const wx = Math.round(w.x);
      const wy = Math.round(w.y);
      const col = w.accentColor || 0xff8c3a;
      const tilt = Math.max(-0.22, Math.min(0.22, (w.vx || 0) * 0.0005));
      const texKey = `px-stack-${w.chassis || "viper"}-1`;
      if (this.scene.textures.exists(texKey)) spr.setTexture(texKey);
      spr.setPosition(wx, wy).setTint(col).setRotation(tilt).setVisible(true);

      // Subtle twin pixel thruster glow behind wingman sprite
      this.wingmanGfx.fillStyle(col, 0.55);
      this.wingmanGfx.fillRect(wx - 8, wy + 18, 4, 6);
      this.wingmanGfx.fillRect(wx + 4, wy + 18, 4, 6);

      lbl
        .setText(String(w.name || "").slice(0, 6))
        .setColor(`#${col.toString(16).padStart(6, "0")}`)
        .setPosition(wx, wy + 30)
        .setVisible(true);
    }
  }

  #renderRouteBoss(boss, warnings, firstPerson = false) {
    this.bossGfx.clear();
    if (!boss) {
      this.bossHullSprite.setVisible(false);
      for (const t of this.bossTurrets) t.setVisible(false);
      this.bossHpText.setVisible(false);
      return;
    }

    // Sleek Tactical Laser Corridor & Descending Lock-On Chevrons (rendered in both 3rd & 1st person)
    for (const w of warnings) {
      const wx = 140 + w.sector * 220;
      const pulse = 0.45 + 0.45 * Math.sin(this.dronePhase * 3.4);
      this.bossGfx.lineStyle(2, 0xff4b5c, pulse * 0.85);
      this.bossGfx.lineBetween(wx - 58, 340, wx - 58, 1060);
      this.bossGfx.lineBetween(wx + 58, 340, wx + 58, 1060);
      const scroll = (this.dronePhase * 48) % 120;
      for (let cy = 380 + scroll; cy < 1030; cy += 120) {
        this.bossGfx.lineStyle(2, 0xff8c3a, pulse * 0.65);
        this.bossGfx.lineBetween(wx - 24, cy - 10, wx, cy + 6);
        this.bossGfx.lineBetween(wx, cy + 6, wx + 24, cy - 10);
      }
      this.bossGfx.lineStyle(2, 0xff4b5c, 0.9);
      this.bossGfx.strokeCircle(wx, 1045, 22);
    }

    if (firstPerson) {
      // FirstPersonCockpit renders the dedicated 3D lane-parallax Boss silhouette!
      this.bossHullSprite.setVisible(false);
      for (const t of this.bossTurrets) t.setVisible(false);
      this.bossHpText.setVisible(false);
      return;
    }

    const hoverY = Math.round(Math.sin(this.dronePhase * 0.8) * 4);
    const bossX = Math.round(boss.x || 360);
    const tilt = Math.max(-0.22, Math.min(0.22, (boss.vx || 0) * 0.001));
    const isPhase2 = boss.phase === 2;
    const isInvuln = (boss.invulnMs || 0) > 0;
    this.bossHullSprite
      .setVisible(true)
      .setPosition(bossX, 314 + hoverY)
      .setRotation(tilt)
      .setTint(isInvuln ? 0xffd166 : isPhase2 ? 0xff8095 : 0xffffff);

    // Phase 2 Rage Aura or Invulnerable Shield Lock Hex Ring
    if (isInvuln) {
      const shieldPulse = 0.55 + 0.45 * Math.sin(this.dronePhase * 4.2);
      this.bossGfx.lineStyle(3, 0xffd166, shieldPulse);
      this.bossGfx.strokeCircle(bossX, 326 + hoverY, 96);
      this.bossGfx.lineStyle(2, 0xff4b5c, shieldPulse * 0.8);
      this.bossGfx.strokeCircle(bossX, 326 + hoverY, 108);
    } else if (isPhase2) {
      const ragePulse = 0.35 + 0.25 * Math.sin(this.dronePhase * 3.0);
      this.bossGfx.lineStyle(2, 0xff4b5c, ragePulse);
      this.bossGfx.strokeCircle(bossX, 326 + hoverY, 92);
    }

    let turretIdx = 0;
    for (const part of boss.parts) {
      const px = Math.round(part.x);
      const py = Math.round(part.y + hoverY);
      const isReactor = part.id === "reactor";
      const w = isReactor ? 96 : 60;

      if (!isReactor) {
        const tur = this.bossTurrets[turretIdx++];
        if (tur) {
          tur.setVisible(!part.dead).setPosition(px, py).setRotation(tilt);
        }
      }

      if (part.dead) {
        this.bossGfx.fillStyle(0x101722, 0.72);
        this.bossGfx.fillRect(px - 18, py - 14, 36, 28);
        continue;
      }

      if (isReactor) {
        const pulse = 0.7 + 0.3 * Math.sin(this.dronePhase * 2.2);
        this.bossGfx.lineStyle(2, 0xff4b5c, pulse);
        this.bossGfx.strokeRect(px - 22, py - 16, 44, 32);
      }

      // Crisp Part HP bar
      const ratio = Math.max(0, Math.min(1, part.hp / Math.max(1, part.maxHp)));
      this.bossGfx.fillStyle(0x050a14, 0.95);
      this.bossGfx.fillRect(px - w / 2, py + 28, w, 6);
      this.bossGfx.fillStyle(isReactor ? 0xff4b5c : 0xff8c3a, 1);
      this.bossGfx.fillRect(px - w / 2, py + 28, Math.round(w * ratio), 6);
    }

    const totalPct = Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100);
    const formMeta = {
      pulse: { tag: "疾风脉冲", color: "#43cff4" },
      heavy: { tag: "重装爆裂", color: "#ff8c3a" },
      magnet: { tag: "磁暴浮游", color: "#b668ff" },
    }[boss.activeForm || "pulse"] || { tag: "疾风脉冲", color: "#43cff4" };
    const phaseTag = isInvuln ? "锁血无敌" : isPhase2 ? "二阶段·狂暴" : formMeta.tag;
    this.bossHpText
      .setText(`⚠ ${boss.name} [${phaseTag}] · ${totalPct}%`)
      .setColor(isInvuln ? "#ffd166" : isPhase2 ? "#ff4b5c" : formMeta.color)
      .setPosition(bossX, 246 + hoverY)
      .setVisible(true);
  }

  destroy() {
    this.shadowsGfx.destroy();
    this.ionTrailGfx.destroy();
    this.wingmanGfx.destroy();
    for (const s of this.wingmanSprites) s.destroy();
    for (const l of this.wingmanLabels) l.destroy();
    this.stackedFighter.destroy();
    for (const d of this.drones) d.destroy();
    this.enemyStacker.destroy();
    this.thrusterGfx.destroy();
    this.statusGfx.destroy();
    this.reticleGfx.destroy();
    this.nebulaGfx.destroy();
    this.nebulaSprite.destroy();
    this.nebulaLabel.destroy();
    this.installBanner.destroy();
    this.bossGfx.destroy();
    this.bossHullSprite.destroy();
    for (const t of this.bossTurrets) t.destroy();
    this.bossHpText.destroy();
    this.podGfx.destroy();
    for (const s of this.podSprites) s.destroy();
    for (const lbl of this.podLabels) lbl.destroy();
  }
}
