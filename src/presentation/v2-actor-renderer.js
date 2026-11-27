import Phaser from "phaser";
import { FIGHTERS } from "../core/fighter-catalog.js";
import { DISPLAY_TARGETS } from "../core/stage-director.js";
import { CombatVfx, pixelRing } from "./combat-vfx.js";

const WHITE = 0xffffff;
const CYAN = 0x33ddcc;
const CRIMSON = 0xff3355;
const GOLD = 0xffd13b;
const INDIGO = 0x0d1024;
const PINK = FIGHTERS["09_fengqun"].color;
const GREEN = FIGHTERS["04_fusu"].color;
const VIOLET = FIGHTERS["06_xukong"].color;
const SHADOW = 0x060713;

export class V2ActorRenderer {
  constructor(scene, fighterId) {
    this.scene = scene;
    this.webgl = scene.game.renderer.type === Phaser.WEBGL;
    this.ground = scene.add.graphics().setDepth(5);
    this.enemies = new Map();
    const source = scene.textures.get(fighterId).getSourceImage();
    this.fighterScale = DISPLAY_TARGETS.fighter / source.height;
    this.ship = scene.add.image(360, 1030, fighterId).setScale(this.fighterScale).setDepth(12);
    this.shipShadow = this.#shadow(fighterId);
    this.fighter = FIGHTERS[fighterId];
    this.bulletGlow = scene.add.graphics().setDepth(14).setBlendMode(Phaser.BlendModes.ADD);
    this.bullets = scene.add.graphics().setDepth(15);
    this.markers = scene.add.graphics().setDepth(16);
    this.vfx = new CombatVfx(scene);
    this.bank = 0;
    this.grazeMs = 0;
    this.exhaust = [];
    this.nextExhaust = 0;
    this.trails = [];
    this.nextTrail = 0;
  }

  #shadow(key) {
    const image = this.scene.add.image(0, 0, this.webgl ? key : key + "-shadow").setDepth(4).setAlpha(0.36);
    if (this.webgl) image.setTintFill(SHADOW);
    return image;
  }

  #followShadow(shadow, image, key) {
    const texture = this.webgl ? key : key + "-shadow";
    if (shadow.texture.key !== texture) shadow.setTexture(texture);
    shadow.setPosition(image.x + 16, image.y + 22).setRotation(image.rotation).setScale(image.scaleX, image.scaleY);
  }

  render(combat, dtMs) {
    const s = combat.session;
    const { ship } = s;
    this.ground.clear();
    this.bulletGlow.clear();
    this.bullets.clear();
    this.markers.clear();

    const desired = Phaser.Math.Clamp(ship.vx / 1450, -1, 1);
    this.bank += (desired - this.bank) * (1 - Math.exp(-dtMs / 65));
    this.ship.setPosition(ship.x, ship.y)
      .setRotation(this.bank * 0.14)
      .setScale(this.fighterScale * (1 - Math.abs(this.bank) * 0.12), this.fighterScale);
    this.#followShadow(this.shipShadow, this.ship, s.fighterId);
    this.#engines(s, dtMs);
    this.#syncEnemies(combat);
    this.#drawDrones(combat.weapons.drones, s.elapsedMs);
    this.#drawFields(combat.weapons, s.elapsedMs);
    this.#drawTrails(dtMs);
    this.#drawShots(combat);
    this.#drawPickups(combat.pickups, s.elapsedMs);
    this.grazeMs = Math.max(0, this.grazeMs - dtMs);
    if (combat.events.some(({ type }) => type === "graze")) this.grazeMs = 160;
    this.#status(s);
    this.vfx.consume(combat.events);
    if (this.pendingDmg?.length) {
      this.vfx.consume(this.pendingDmg);
      this.pendingDmg.length = 0;
    }
    this.vfx.render(dtMs);
  }

  #pixel(g, x, y, w, h = w) {
    g.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  #engines(s, dtMs) {
    const g = this.ground;
    const sprite = this.ship;
    const spin = sprite.rotation;
    const cos = Math.cos(spin);
    const sin = Math.sin(spin);
    const [offset, height] = this.fighter.engine;
    const color = s.overloadMs > 0 ? s.overload.color : this.fighter.color;
    const nudge = s.elapsedMs >= this.nextExhaust;
    if (nudge) this.nextExhaust = s.elapsedMs + 25;

    this.exhaust = this.exhaust.filter((p) => {
      p.life -= dtMs;
      if (p.life <= 0) return false;
      p.x += p.vx * dtMs / 1000;
      p.y += p.vy * dtMs / 1000;
      g.fillStyle(p.color, (p.life / 205) * 0.65);
      this.#pixel(g, p.x, p.y, p.size);
      return true;
    });

    for (const side of [-1, 1]) {
      const lateral = side * offset * sprite.scaleX;
      const aft = height * sprite.scaleY;
      const x = sprite.x + lateral * cos - aft * sin;
      const y = sprite.y + lateral * sin + aft * cos;
      const stretch = 1 + (s.warpDashMs > 0 ? 0.47 : 0) + Math.sin(s.elapsedMs / 32 + side * 0.42) * 0.14;
      for (let j = 4; j >= 0; j--) {
        const span = j * 5.9 * stretch;
        const width = 15 - j * 2.8;
        g.fillStyle(color, 0.12 + (4 - j) * 0.073);
        this.#pixel(g, x - span * sin, y + span * cos, width + 5, 8 * stretch);
        g.fillStyle(j === 0 ? WHITE : color, 0.86 - j * 0.13);
        this.#pixel(g, x - span * sin, y + span * cos, width * 0.56, 7.5 * stretch);
      }
      if (nudge) {
        this.exhaust.push({ x: x - sin * 23, y: y + 23, vx: -s.ship.vx * 0.06 + (Math.random() - 0.5) * 43,
          vy: 90 + Math.random() * 105, life: 130 + Math.random() * 75, color, size: 2 + Math.random() * 2.5 });
      }
    }
  }

  #syncEnemies(combat) {
    const now = combat.session.elapsedMs;
    const live = new Set(combat.enemies);
    for (const [enemy, group] of this.enemies) {
      if (live.has(enemy)) continue;
      group.image.destroy();
      group.shadow.destroy();
      this.enemies.delete(enemy);
    }
    for (const enemy of combat.enemies) {
      const boss = enemy === combat.boss;
      let key = enemy.id;
      if (boss) {
        const bits = (enemy.parts[0].hp <= 0 ? 1 : 0) + (enemy.parts[1].hp <= 0 ? 2 : 0);
        if (bits) key += "-damage-" + bits;
      }
      let group = this.enemies.get(enemy);
      if (!group) {
        group = {
          image: this.scene.add.image(enemy.x, enemy.y, key).setScale(enemy.scale).setDepth(10),
          shadow: this.#shadow(key),
          lastHp: enemy.hp,
          dmgAcc: 0,
          dmgAt: now + 95,
        };
        this.enemies.set(enemy, group);
      }
      const hpNow = boss ? enemy.parts.reduce((sum, p) => sum + Math.max(0, p.hp), 0) : Math.max(0, enemy.hp);
      if (group.lastHp > hpNow) {
        group.dmgAcc += group.lastHp - hpNow;
      }
      group.lastHp = hpNow;
      if (group.dmgAcc >= 1 && (now >= group.dmgAt || hpNow <= 0)) {
        (this.pendingDmg ??= []).push({
          type: "dmg",
          x: enemy.x + (Math.random() - 0.5) * 24,
          y: enemy.y - (boss ? 10 : enemy.radius * 0.5),
          amount: Math.round(group.dmgAcc),
          crit: group.dmgAcc >= 65,
        });
        group.dmgAcc = 0;
        group.dmgAt = now + 95;
      }
      const { image, shadow } = group;
      const status = now < enemy.flashUntil ? "white" : enemy.frozenUntil > now ? "ice" : "";
      const texture = this.webgl || !status ? key : key + "-" + status;
      if (image.texture.key !== texture) image.setTexture(texture);
      if (this.webgl && group.status !== status) {
        if (status === "white") image.setTintFill(0xffffff);
        else if (status === "ice") image.setTint(0x79cfff);
        else image.clearTint();
      }
      group.status = status;
      image.setPosition(enemy.x, enemy.y).setRotation(boss ? 0 : enemy.turn);
      this.#followShadow(shadow, image, key);
      if (boss) this.#boss(combat, now);
      else this.#enemyMarkers(enemy, image, now);
    }
  }

  #enemyMarkers(enemy, image, now) {
    const g = this.markers;
    const { x, y } = enemy;
    if (enemy.category !== "normal") {
      const width = image.displayWidth * 0.77;
      this.#bar(x - width / 2, y - image.displayHeight / 2 - 10, width, 5, enemy.hp / enemy.maxHp, GOLD);
    }
    if (enemy.shielded) {
      const r = enemy.radius + 7;
      g.lineStyle(5, CYAN, 0.22).beginPath().arc(x, y, r + 4, 0.11, Math.PI - 0.11).strokePath();
      g.lineStyle(2, WHITE, 0.87).beginPath().arc(x, y, r, 0.22, Math.PI - 0.22).strokePath();
    }
    if (enemy.fuseUntil) {
      const danger = Math.max(0, Math.min(1, (enemy.fuseUntil - now) / 810));
      const opacity = 0.48 + Math.sin(now * (0.018 + (1 - danger) * 0.02)) * 0.34;
      this.bulletGlow.fillStyle(CRIMSON, opacity * 0.18).fillCircle(x, y, 85);
      pixelRing(g, x, y, 85, CRIMSON, opacity, 3);
      pixelRing(g, x, y, 23 + 62 * (1 - danger), GOLD, opacity, 2);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.fillStyle(i % 2 ? GOLD : CRIMSON);
        this.#pixel(g, x + Math.cos(a) * 85, y + Math.sin(a) * 85, 5, 5);
      }
    }
    if (enemy.shockedUntil > now) {
      g.lineStyle(1, GOLD, 0.8).lineBetween(x - 18, y - 14, x - 8, y - 6).lineBetween(x + 17, y + 17, x + 23, y + 7);
    }
    if (enemy.frozenUntil > now) {
      const w = image.displayWidth * 0.58;
      const h = image.displayHeight * 0.58;
      g.lineStyle(3, CYAN, 0.85).strokeRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle(WHITE, 0.92);
      for (const [dx, dy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]]) {
        this.#pixel(g, x + dx, y + dy, 7, 7);
      }
    }
  }

  #bar(x, y, w, h, ratio, fill) {
    const g = this.markers;
      g.fillStyle(INDIGO, 0.94).fillRect(x, y, w, h);
    g.fillStyle(fill, 0.9).fillRect(x, y, w * ratio, h);
  }

  #boss(combat, now) {
    const g = this.markers;
    const boss = combat.boss;
    if (combat.bossShielded && boss.y > 30) {
      const opacity = 0.5 + Math.sin(now * 0.018) * 0.23;
      const width = 338 + 10 * Math.sin(now * 0.013);
      this.bulletGlow.fillStyle(CYAN, 0.08).fillEllipse(boss.x, boss.y, width, 169);
      g.lineStyle(4, CYAN, opacity).strokeEllipse(boss.x, boss.y, width, 169);
      g.lineStyle(1, WHITE, opacity).strokeEllipse(boss.x, boss.y, width + 13, 182);
    }
    if (boss.phase === 2) {
      const radius = 47 + Math.sin(now * 0.012) * 7;
      const core = boss.parts[2];
      pixelRing(this.bulletGlow, boss.x + core.dx, boss.y + core.dy, radius, GOLD, 0.25, 12);
      pixelRing(g, boss.x + core.dx, boss.y + core.dy, radius, GOLD, 0.85, 3);
    }
    for (const { x, y, part } of combat.bossTargets(true)) {
      if (part.hp <= 0) {
        if (part.id === "core") continue;
        for (let i = 0; i < 6; i++) {
          const cycle = (now / 640 + i / 6) % 1;
          g.fillStyle(i % 3 === 0 ? (i % 2 ? 0xff7a22 : CRIMSON) : 0x050716, (1 - cycle) * (i % 3 === 0 ? 0.7 : 0.58));
          this.#pixel(g, x + Math.sin(i + now * 0.007) * 13, y - cycle * 55, 3 + 8 * cycle, 5 + 6 * cycle);
        }
        continue;
      }
      const core = part.id === "core";
      const span = core ? 35 : 23;
      const color = core ? CRIMSON : GOLD;
      g.lineStyle(2, color, 0.8);
      for (const side of [-1, 1]) {
        g.lineBetween(x + span * side, y + 19, x + span * side, y + 30);
        g.lineBetween(x + span * side, y + 30, x + (span - 7) * side, y + 30);
      }
      this.#bar(x - span, y + 36, 2 * span, 5, part.hp / part.maxHp, color);
    }
  }

  #drawDrones(drones, now = 0) {
    const g = this.markers;
    const locked = new Set();
    for (const { x, y, target } of drones) {
      this.bulletGlow.fillStyle(PINK, 0.30);
      this.#pixel(this.bulletGlow, x, y + 6, 30, 20);
      g.fillStyle(INDIGO);
      this.#pixel(g, x, y + 1, 27, 12);
      this.#pixel(g, x, y - 5, 15, 12);
      g.fillStyle(PINK);
      this.#pixel(g, x, y, 17, 12);
      this.#pixel(g, x - 10, y + 3, 6, 7);
      this.#pixel(g, x + 10, y + 3, 6, 7);
      g.fillStyle(WHITE);
      this.#pixel(g, x, y - 4, 7, 10);
      this.#pixel(g, x - 6, y + 9, 3, 4);
      this.#pixel(g, x + 6, y + 9, 3, 4);
      g.fillStyle(PINK, 0.85);
      this.#pixel(g, x - 6, y + 14, 3, 6);
      this.#pixel(g, x + 6, y + 14, 3, 6);
      if (!target || target.hp <= 0 || locked.has(target)) continue;
      locked.add(target);
      const pulse = Math.sin(now * 0.015) * 3;
      const span = target.radius + 6 + pulse;
      g.fillStyle(GOLD, 0.92);
      for (const dx of [-1, 1]) {
        for (const dy of [-1, 1]) {
          this.#pixel(g, target.x + dx * (span - 4), target.y + dy * span, 11, 2);
          this.#pixel(g, target.x + dx * span, target.y + dy * (span - 4), 2, 11);
        }
      }
    }
  }

  #emitTrail(x, y, vx, vy, color, size = 4, life = 150) {
    if (this.trails.length >= 220) this.trails.shift();
    this.trails.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  #drawTrails(dtMs) {
    const g = this.bullets;
    const glow = this.bulletGlow;
    const dt = dtMs / 1000;
    this.trails = this.trails.filter((p) => {
      p.life -= dtMs;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.life / p.maxLife;
      glow.fillStyle(p.color, t * 0.42);
      this.#pixel(glow, p.x, p.y, p.size * 2.1 * t + 2);
      g.fillStyle(t > 0.65 ? WHITE : p.color, t * 0.92);
      this.#pixel(g, p.x, p.y, Math.max(2, p.size * t));
      return true;
    });
  }

  #drawFields(weapons, now) {
    const g = this.ground;
    for (const field of weapons.fields) {
      const radius = field.radius * (0.36 + 0.48 * Math.min(1, field.age * 4));
      this.bulletGlow.fillStyle(VIOLET, 0.10).fillCircle(field.x, field.y, radius);
      g.fillStyle(0x1b1035, 0.9).fillCircle(field.x, field.y, radius * 0.31);
      pixelRing(g, field.x, field.y, radius * 0.35, VIOLET, 0.7, 2);
      for (let i = 0; i < 24; i++) {
        const progress = (field.age * 2.4 + (i % 12) / 12) % 1;
        const spin = progress * 8 - now * 0.004 + (i >= 12 ? Math.PI : 0);
        const arm = radius * (0.32 + 0.68 * (1 - progress));
        const x = field.x + Math.cos(spin) * arm;
        const y = field.y + Math.sin(spin) * arm * 0.74;
        g.fillStyle(i % 4 === 0 ? WHITE : VIOLET, 0.46 + progress * 0.37);
        this.#pixel(g, x, y, 2 + progress * 3, 2 + progress * 3);
      }
    }
    for (const blade of weapons.blades) {
      const { x, y, angle } = blade;
      g.lineStyle(8, 0x74f4b4, 0.31).beginPath().arc(x, y, 18, angle, angle + 2.5).strokePath();
      g.lineStyle(3, 0xc7ffe4, 0.91).beginPath().arc(x, y, 17, angle + 0.15, angle + 2.15).strokePath();
    }
  }

  #drawShots(combat) {
    const g = this.bullets;
    const glow = this.bulletGlow;
    const now = combat.session.elapsedMs;
    const spawnTrails = now >= this.nextTrail;
    if (spawnTrails) this.nextTrail = now + 26;
    for (const shot of combat.shots) this.#playerShot(shot, now, spawnTrails);
    for (const shot of combat.enemyShots) {
      if (shot.gone) continue;
      const { x, y, radius, age = 0, color } = shot;
      if (shot.missile) {
        const norm = Math.hypot(shot.vx, shot.vy) || 1;
        const sx = shot.vx / norm;
        const sy = shot.vy / norm;
        const flash = Math.floor(age * 16) % 2 ? 1 : 0.44;
        glow.lineStyle(13, CRIMSON, 0.26).lineBetween(x - sx * 29, y - sy * 29, x, y);
        for (let i = 3; i >= 1; i--) {
          g.fillStyle(i === 1 ? GOLD : CRIMSON, 0.89 - i * 0.2);
          this.#pixel(g, x - sx * i * 8, y - sy * i * 8, 9 - i, 7 - i);
        }
        this.#diamond(g, x, y, sx, sy, 13, 8, CRIMSON);
        g.fillStyle(GOLD, flash);
        this.#pixel(g, x + sx * 8, y + sy * 8, 7, 6);
        pixelRing(g, x, y, 15, GOLD, flash * 0.8, 2);
      } else if (shot.blade) {
        const direction = Math.atan2(shot.vy, shot.vx);
        const twist = direction + age * 7 * shot.spin;
        for (let i = 2; i >= 1; i--) {
          const a = twist - i * 0.30 * shot.spin;
          const tx = x - Math.cos(direction) * i * 13;
          const ty = y - Math.sin(direction) * i * 13;
          this.#diamond(g, tx, ty, Math.cos(a), Math.sin(a), 12, 7, GOLD, 0.52 / i);
        }
        const sx = Math.cos(twist);
        const sy = Math.sin(twist);
        glow.fillStyle(GOLD, 0.25).fillCircle(x, y, 17);
        this.#diamond(g, x, y, sx, sy, 14, 9, GOLD);
        this.#diamond(g, x, y, sx, sy, 9, 5, CRIMSON);
      } else {
        const pulse = shot.pulse ? 1 + Math.sin(age * 15) * 0.20 : 1;
        const r = radius * pulse;
        glow.fillStyle(color, 0.36).fillCircle(x, y, r + 8);
        g.fillStyle(color);
        this.#pixel(g, x, y, 2 * r, 1.38 * r);
        this.#pixel(g, x, y, 1.38 * r, 2 * r);
        g.fillStyle(shot.coreColor ?? WHITE);
        if (shot.pulse) {
          const turn = age * 4.25;
          const cos = Math.cos(turn);
          const sin = Math.sin(turn);
          for (let arm = -2; arm <= 2; arm++) {
            const offset = arm * r * 0.29;
            this.#pixel(g, x + offset * cos, y + offset * sin, 3.8);
            this.#pixel(g, x - offset * sin, y + offset * cos, 3.8);
          }
        } else {
          this.#pixel(g, x, y, Math.max(3, r * 0.86));
          g.fillStyle(WHITE, 0.95);
          this.#pixel(g, x - r * 0.28, y - r * 0.28, 2, 2);
        }
      }
    }
    this.#drawBossLaser(combat);
  }

  #diamond(g, x, y, sx, sy, length, width, color, alpha = 1) {
    const frontX = Math.round(x + sx * length);
    const frontY = Math.round(y + sy * length);
    const backX = Math.round(x - sx * length);
    const backY = Math.round(y - sy * length);
    g.fillStyle(color, alpha).fillTriangle(frontX, frontY, Math.round(x + sy * width), Math.round(y - sx * width), backX, backY)
      .fillTriangle(frontX, frontY, Math.round(x - sy * width), Math.round(y + sx * width), backX, backY);
  }

  #playerShot(shot, now, spawnTrails = false) {
    const g = this.bullets;
    const glow = this.bulletGlow;
    const { color, kind, powered } = shot;
    const x = Math.round(shot.x);
    const y = Math.round(shot.y);
    const norm = Math.hypot(shot.vx, shot.vy) || 1;
    const sx = shot.vx / norm;
    const sy = shot.vy / norm;
    const power = powered ? 1.33 : 1;
    const trailPoint = (i) => ({ x: x - sx * i * 11, y: y - sy * i * 11 });

    if (powered) {
      glow.lineStyle(18, color, 0.28).lineBetween(x - sx * 48, y - sy * 48, x, y);
      g.fillStyle(WHITE, 0.72);
      this.#pixel(g, x + sy * 10, y - sx * 10, 3, 9);
      this.#pixel(g, x - sy * 10, y + sx * 10, 3, 9);
    }

    if (kind === "lance") {
      // 76px+ Plasma Rail-Lance with 6-segment tapered ribbon, Mach shock chevrons & trailing sparks
      const length = 76 * power;
      const tipX = x + sx * 12;
      const tipY = y + sy * 12;
      glow.lineStyle(22 * power, CRIMSON, 0.34).lineBetween(x - sx * length, y - sy * length, tipX, tipY);
      glow.lineStyle(10 * power, GOLD, 0.28).lineBetween(x - sx * length * 0.45, y - sy * length * 0.45, tipX, tipY);

      for (let i = 5; i >= 0; i--) {
        const segX = tipX - sx * (i * length / 6);
        const segY = tipY - sy * (i * length / 6);
        const segW = Math.max(2, (6 - i) * 2.1 * power);
        const segAlpha = 0.95 - i * 0.13;
        g.fillStyle(i === 0 ? WHITE : i <= 2 ? CRIMSON : GOLD, segAlpha);
        this.#pixel(g, segX, segY, segW, Math.max(4, (length / 5)));
      }
      g.fillStyle(WHITE).fillTriangle(
        tipX + sx * 6, tipY + sy * 6,
        tipX - sx * 36 - sy * 4, tipY - sy * 36 + sx * 4,
        tipX - sx * 36 + sy * 4, tipY - sy * 36 - sx * 4,
      );
      // Animated Mach shock-chevrons pulsing down the shaft
      for (let ring = 0; ring < 2; ring++) {
        const phase = ((now * 0.008 + ring * 0.5) % 1);
        const rx = tipX - sx * (14 + phase * 44 * power);
        const ry = tipY - sy * (14 + phase * 44 * power);
        const wing = 8 + phase * 10 * power;
        g.lineStyle(2, ring === 0 ? GOLD : WHITE, 1 - phase * 0.75)
          .lineBetween(rx - sx * 8 + sy * wing, ry - sy * 8 - sx * wing, rx, ry)
          .lineBetween(rx, ry, rx - sx * 8 - sy * wing, ry - sy * 8 + sx * wing);
      }
      if (spawnTrails) {
        this.#emitTrail(x - sx * 36 + (Math.random() - 0.5) * 10, y - sy * 36, (Math.random() - 0.5) * 55, 65, Math.random() < 0.4 ? GOLD : CRIMSON, 4, 155);
      }
      return;
    }

    if (kind === "pulse") {
      // Hyper-velocity cyan-white ion needles with 6-segment luminous comet ribbon & electric side-ticks
      const len = 36 * power;
      glow.lineStyle(13 * power, color, 0.36).lineBetween(x - sx * len, y - sy * len, x + sx * 5, y + sy * 5);
      for (let i = 5; i >= 1; i--) {
        const p = trailPoint(i * 0.78);
        const a = (6 - i) * 0.16;
        glow.fillStyle(color, a * 0.65);
        this.#pixel(glow, p.x, p.y, 11 - i, 12 - i);
        g.fillStyle(i <= 2 ? WHITE : color, a);
        this.#pixel(g, p.x, p.y, Math.max(2, 6 - i * 0.8), Math.max(4, 9 - i));
      }
      g.fillStyle(color).fillRect(Math.round(x - 3), Math.round(y - 11), 6, 22);
      g.fillStyle(WHITE);
      this.#pixel(g, x, y + sy * 4, 4, 14);
      if (spawnTrails && Math.random() < 0.55) {
        this.#emitTrail(x - sx * 18, y - sy * 18, (Math.random() - 0.5) * 40, 40, color, 3, 110);
      }
      return;
    }

    if (kind === "ice" || kind === "shard") {
      // Cryo-Prism Crescent Glaive with frost-wake chevron & glittering diamond-dust
      const length = (kind === "ice" ? 28 : 20) * power;
      const width = 9 * power;
      glow.lineStyle(15, CYAN, 0.34).lineBetween(x - sx * length, y - sy * length, x + sx * 6, y + sy * 6);
      g.fillStyle(CYAN).fillTriangle(x + sx * 10, y + sy * 10, x + sy * width, y - sx * width, x - sx * length, y - sy * length)
        .fillTriangle(x + sx * 10, y + sy * 10, x - sy * width, y + sx * width, x - sx * length, y - sy * length);
      g.fillStyle(WHITE).fillTriangle(x + sx * 8, y + sy * 8, x + sy * (width * 0.55), y - sx * (width * 0.55), x - sx * (length * 0.65), y - sy * (length * 0.65))
        .fillTriangle(x + sx * 8, y + sy * 8, x - sy * (width * 0.55), y + sx * (width * 0.55), x - sx * (length * 0.65), y - sy * (length * 0.65));
      for (let i = 1; i <= 3; i++) {
        const p = trailPoint(i);
        g.fillStyle(i === 1 ? WHITE : CYAN, 0.85 - i * 0.2);
        const snowX = p.x + (i % 2 ? 7 : -7) + Math.sin(now * 0.015 + x) * 3;
        const snowY = p.y + i * 2;
        this.#pixel(g, snowX, snowY, 6, 2);
        this.#pixel(g, snowX, snowY, 2, 6);
      }
      if (spawnTrails) {
        this.#emitTrail(x - sx * 14, y - sy * 14, (Math.random() - 0.5) * 48, 35, WHITE, 3, 130);
      }
      return;
    }

    if (kind === "arc") {
      // Live-crackling dual-strand Tesla bolt
      const j1 = Math.sin(now * 0.04 + x * 0.2) * 5;
      const j2 = Math.cos(now * 0.05 + y * 0.2) * 5;
      const leftX = x - sx * 12 + sy * (9 * power + j1);
      const leftY = y - sy * 12 - sx * (9 * power + j1);
      const rightX = x - sx * 24 - sy * (9 * power + j2);
      const rightY = y - sy * 24 + sx * (9 * power + j2);
      glow.lineStyle(15 * power, GOLD, 0.44).lineBetween(x, y, leftX, leftY).lineBetween(leftX, leftY, rightX, rightY)
        .lineBetween(rightX, rightY, x - sx * 36, y - sy * 36);
      g.lineStyle(5 * power, GOLD, 0.96).lineBetween(x, y, leftX, leftY).lineBetween(leftX, leftY, rightX, rightY)
        .lineBetween(rightX, rightY, x - sx * 36, y - sy * 36);
      g.lineStyle(2, WHITE).lineBetween(x, y, leftX, leftY).lineBetween(leftX, leftY, rightX, rightY)
        .lineBetween(rightX, rightY, x - sx * 36, y - sy * 36);
      g.fillStyle(WHITE);
      this.#pixel(g, x, y, 6, 6);
      if (spawnTrails) this.#emitTrail(rightX, rightY, (Math.random() - 0.5) * 70, 50, GOLD, 4, 120);
      return;
    }

    if (kind === "bio") {
      // Bio-Prism Nova with DNA-helix orbiting wisps
      const width = 11 * power;
      glow.fillStyle(color, 0.36).fillCircle(x, y, width + 10);
      this.#diamond(g, x, y, 0, 1, width + 4, width + 1, color);
      this.#diamond(g, x, y, 0, 1, 7, 5, WHITE);
      for (const side of [-1, 1]) {
        const a = now * 0.02 + side * Math.PI / 2;
        const ox = x + Math.cos(a) * 17;
        const oy = y + Math.sin(a) * 12;
        glow.fillStyle(color, 0.45).fillCircle(ox, oy, 6);
        g.fillStyle(side < 0 ? WHITE : color);
        this.#pixel(g, ox, oy, 4, 4);
      }
      if (spawnTrails) this.#emitTrail(x - sx * 12, y - sy * 12, (Math.random() - 0.5) * 35, 40, color, 3, 130);
      return;
    }

    if (kind === "void") {
      // Singularity Rift Orb with counter-rotating orbital shard arcs
      const width = 13 * power + 1.8 * Math.sin(now * 0.018);
      glow.fillStyle(color, 0.42).fillCircle(x, y, width + 11);
      pixelRing(g, x, y, width + 4, color, 0.9, 2);
      this.#diamond(g, x, y, 0, 1, width + 2, width + 2, color);
      this.#diamond(g, x, y, 0, 1, width * 0.74, width * 0.74, WHITE);
      this.#diamond(g, x, y, 0, 1, width * 0.52, width * 0.52, 0x160a2c);
      for (let i = 0; i < 2; i++) {
        const a = now * 0.014 + i * Math.PI;
        g.fillStyle(WHITE, 0.95);
        this.#pixel(g, x + Math.cos(a) * (width + 6), y + Math.sin(a) * (width + 6), 4, 4);
      }
      if (spawnTrails) this.#emitTrail(x, y + 10, (Math.random() - 0.5) * 40, 50, color, 4, 150);
      return;
    }

    if (["rocket", "bomb", "missile", "ember"].includes(kind)) {
      // Solar Plasma Rocket with roaring 5-stage animated flame wake
      glow.lineStyle(18 * power, color, 0.34).lineBetween(x - sx * 36, y - sy * 36, x, y);
      g.lineStyle(11 * power, color).lineBetween(x - sx * 16, y - sy * 16, x + sx * 6, y + sy * 6);
      g.lineStyle(5, GOLD).lineBetween(x - sx * 9, y - sy * 9, x + sx * 9, y + sy * 9);
      g.fillStyle(WHITE);
      this.#pixel(g, x + sx * 6, y + sy * 6, 5, 5);
      for (let i = 1; i <= 4; i++) {
        const flicker = Math.sin(now * 0.05 + i * 2 + shot.x * 0.1) * 3;
        g.fillStyle(i % 2 ? GOLD : color, 1 - i * 0.18);
        const length = 16 + i * 8 + flicker;
        this.#pixel(g, x - sx * length, y - sy * length, Math.max(3, 11 - i * 2), Math.max(3, 7 - i));
      }
      if (spawnTrails) this.#emitTrail(x - sx * 24, y - sy * 24, (Math.random() - 0.5) * 50, 90, GOLD, 4, 160);
      return;
    }

    if (kind === "guard") {
      // Aegis Crescent Wave with crackling outer serrations & trailing echo
      const width = shot.width ?? 24;
      glow.lineStyle(16, GOLD, 0.32).beginPath().arc(x, y + 13, width + 8, 3.62, 5.80).strokePath();
      g.lineStyle(6, GOLD, 0.96).beginPath().arc(x, y + 13, width + 3, 3.68, 5.74).strokePath();
      g.lineStyle(3, WHITE).beginPath().arc(x, y + 13, width - 3, 3.74, 5.68).strokePath();
      g.lineStyle(2, GOLD, 0.48).beginPath().arc(x, y + 25, width * 0.85, 3.85, 5.57).strokePath();
      for (const side of [-1, 0, 1]) {
        g.fillStyle(WHITE);
        this.#pixel(g, x + side * width * 0.72, y + 13 - width + Math.abs(side) * 7, 7, 4);
      }
      return;
    }

    // Default / drone / needle / overload: Hot laser darts with long tapered comet wakes
    const length = (kind === "drone" || kind === "needle" ? 36 : kind === "overload" ? 42 : 24) * power;
    const width = (kind === "overload" ? 10 : 5) * power;
    glow.lineStyle(width + 11, color, 0.35).lineBetween(x - sx * length, y - sy * length, x + sx * 4, y + sy * 4);
    for (let i = 4; i >= 1; i--) {
      const p = trailPoint(i * 0.85);
      g.fillStyle(i === 1 ? WHITE : color, 0.9 - i * 0.16);
      this.#pixel(g, p.x, p.y, Math.max(2, width - i * 0.7), 6);
    }
    g.lineStyle(width, color, 0.98).lineBetween(x - sx * length * 0.68, y - sy * length * 0.68, x + sx * 3, y + sy * 3);
    g.lineStyle(2, WHITE).lineBetween(x - sx * length * 0.45, y - sy * length * 0.45, x + sx * 4, y + sy * 4);
  }

  #drawBossLaser(combat) {
    const laser = combat.boss?.laser;
    if (!laser) return;
    const { x, y, ex, ey } = laser;
    const sx = (ex - x) / 1500;
    const sy = (ey - y) / 1500;
    if (laser.phase === "charge") {
      const flash = Math.floor(combat.session.elapsedMs / 70) % 2 ? 1 : 0.35;
      this.bullets.lineStyle(2, GOLD, flash).lineBetween(x, y, ex, ey);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 - combat.session.elapsedMs * 0.009;
        const r = 34 - ((combat.session.elapsedMs / 18 + i * 4) % 20);
        this.bullets.fillStyle(GOLD, 0.9);
        this.#pixel(this.bullets, x + Math.cos(a) * r, y + Math.sin(a) * r, 4, 4);
      }
      return;
    }
    this.bulletGlow.lineStyle(laser.width + 22, CRIMSON, 0.35).lineBetween(x, y, ex, ey);
    this.bullets.lineStyle(laser.width, CRIMSON, 0.95).lineBetween(x, y, ex, ey);
    this.bullets.lineStyle(Math.max(8, laser.width * 0.38), WHITE, 1).lineBetween(x, y, ex, ey);
    for (let i = 1; i < 13; i++) {
      const d = i * 72 + (combat.session.elapsedMs * 0.45) % 72;
      this.bullets.fillStyle(i % 2 ? WHITE : CRIMSON, 0.8);
      this.#pixel(this.bullets, x + sx * d + sy * (i % 2 ? 9 : -9), y + sy * d - sx * (i % 2 ? 9 : -9),
        i % 2 ? 5 : 11, i % 2 ? 9 : 4);
    }
  }

  #drawPickups(pickups, now) {
    const g = this.markers;
    for (const gem of pickups) {
      const { x, y } = gem;
      const heal = gem.type === "heal";
      const color = heal ? CRIMSON : gem.type === "gold" ? GOLD : CYAN;
      const size = gem.type === "green" ? 8 : 12;
      g.fillStyle(color, 0.16 + 0.07 * Math.sin(now / 115 + x)).fillCircle(x, y, size + 7);
      if (heal) {
        g.fillStyle(INDIGO).fillRect(x - 12, y - 12, 24, 24);
        g.lineStyle(2, color).strokeRect(x - 12, y - 12, 24, 24);
        g.fillStyle(WHITE).fillRect(x - 7, y - 2, 14, 4).fillRect(x - 2, y - 7, 4, 14);
      } else {
        g.fillStyle(color).fillTriangle(x, y - size, x - size * 0.7, y, x + size * 0.7, y);
        g.fillStyle(color, 0.75).fillTriangle(x, y + size, x - size * 0.7, y, x + size * 0.7, y);
        g.fillStyle(WHITE, 0.9).fillRect(x - 1, y - size * 0.56, 2, size * 0.52);
      }
    }
  }

  #status(s) {
    const { x, y } = s.ship;
    const g = this.markers;
    const rank = s.build?.main ?? 1;
    const accent = this.fighter.color;
    if (rank >= 2) {
      const bob = Math.sin(s.elapsedMs * 0.008) * 3;
      for (const side of [-1, 1]) {
        const px = x + side * 38;
        const py = y + 8 + bob;
        this.bulletGlow.fillStyle(accent, 0.25);
        this.#pixel(this.bulletGlow, px, py, 16, 18);
        g.fillStyle(INDIGO);
        this.#pixel(g, px, py, 10, 14);
        g.fillStyle(accent);
        this.#pixel(g, px, py, 6, 10);
        g.fillStyle(WHITE);
        this.#pixel(g, px, py - 3, 3, 4);
      }
    }
    if (rank >= 3 || s.build?.synergy) {
      const auraR = 46 + Math.sin(s.elapsedMs * 0.01) * 3;
      pixelRing(this.bulletGlow, x, y, auraR, s.build?.synergy ? GOLD : accent, 0.24, 6);
      if (s.build?.synergy) {
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + s.elapsedMs * 0.004;
          g.fillStyle(GOLD, 0.9);
          this.#pixel(g, x + Math.cos(a) * auraR, y + Math.sin(a) * auraR, 4, 4);
        }
      }
    }
    if (s.guard || s.shield > 0) {
      const color = s.guard ? WHITE : CYAN;
      g.lineStyle(3, color, s.guard ? 0.67 : 0.31);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + s.elapsedMs / 1700;
        g.beginPath().arc(x, y + 1, 56, a, a + 0.97).strokePath();
      }
    }
    if (s.rageUntil > s.elapsedMs) {
      for (let i = 0; i < 8; i++) {
        const position = i * Math.PI / 4 + s.elapsedMs * 0.004;
        const bx = x + Math.cos(position) * 52;
        const by = y + Math.sin(position) * 45;
        this.bulletGlow.fillStyle(GREEN, 0.28);
        this.#pixel(this.bulletGlow, bx, by, 14, 7);
        for (let tail = 1; tail <= 3; tail++) {
          const angle = position - tail * 0.15;
          g.fillStyle(GREEN, 0.64 - tail * 0.13);
          this.#pixel(g, x + Math.cos(angle) * 52, y + Math.sin(angle) * 45, 7 - tail, 4);
        }
        g.fillStyle(i % 2 ? WHITE : GREEN, 0.95);
        g.fillTriangle(bx + Math.cos(position) * 10, by + Math.sin(position) * 10,
          bx + Math.cos(position + 2.3) * 5, by + Math.sin(position + 2.3) * 5,
          bx + Math.cos(position - 2.3) * 5, by + Math.sin(position - 2.3) * 5);
      }
    }
    if (this.grazeMs > 0 || s.invulnerableMs > 0) {
      g.lineStyle(1, this.grazeMs > 0 ? CYAN : CRIMSON, this.grazeMs > 0 ? 0.76 : 0.42).strokeCircle(x, y, 11);
    }
    g.fillStyle(CYAN, 0.42).fillCircle(x, y, 4);
    g.fillStyle(WHITE, 0.93).fillCircle(x, y, 3);
  }
}
