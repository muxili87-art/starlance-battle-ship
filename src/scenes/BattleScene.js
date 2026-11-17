import Phaser from "phaser";
import { EnvironmentView } from "../presentation/environment-view.js";
import { ActorRenderer } from "../presentation/actor-renderer.js";
import { CoreRenderer } from "../presentation/core-renderer.js";
import { VfxRenderer } from "../presentation/vfx-renderer.js";
import { FirstPersonCockpit } from "../presentation/cockpit-view.js";
import { BattleHud } from "../ui/battle-hud.js";
import { GAME_PHASES } from "../state/game-session.js";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    this.room = this.registry.get("room");
    this.hitstopMs = 0;
    this.endOverlayShown = false;

    this.envView = new EnvironmentView(this);
    this.actorRenderer = new ActorRenderer(this);
    this.coreRenderer = new CoreRenderer(this);
    this.vfxRenderer = new VfxRenderer(this);
    this.cockpitView = new FirstPersonCockpit(this);
    this.hud = new BattleHud(this, {
      onPauseClick: () => this.#openOverlay("paused"),
      onOverloadClick: () => this.#triggerOverload(),
      onSelectWatch: (slotId) => this.room.setWatchedSlot(slotId),
      onReturnLocal: () => {
        const local = this.room.getLocalSlot();
        if (local?.session.phase === GAME_PHASES.ENDED) {
          this.room.spectateNextAlive();
        } else {
          this.room.returnToLocalView();
        }
      },
      onLeaveMatch: () => {
        this.room.lanClient?.close();
        this.room.lanClient = null;
        this.scene.start("MenuScene");
      },
      onSwitchForm: (formId) => this.#switchForm(formId),
      onCastSkill: () => this.#castActiveSkill(),
      onScrapAction: () => {
        if (this.room.isSpectating()) return;
        const local = this.room.getLocalSlot();
        const events = [];
        if (local?.loop.spendScrapForOverclock(events)) {
          this.vfxRenderer.consumeEvents(events);
          for (const ev of events) {
            if (ev.type === "pod-install") this.actorRenderer.triggerUpgradeInstall(ev.color, ev.label);
          }
        } else if (local?.loop.spendScrapForRepair(events)) {
          this.vfxRenderer.consumeEvents(events);
        }
      },
    });

    this.#bindInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.#cleanup());
  }

  #switchForm(formId) {
    if (this.room.isSpectating()) return;
    const local = this.room.getLocalSlot();
    if (local?.session.switchForm(formId)) {
      this.cameras.main.shake(60, 0.0025);
    }
  }

  #castActiveSkill() {
    if (this.room.isSpectating()) return;
    const local = this.room.getLocalSlot();
    if (!local) return;
    const events = [];
    if (local.loop.triggerActiveFormSkill(events)) {
      this.vfxRenderer.consumeEvents(events);
      this.cameras.main.shake(90, 0.004);
    }
  }

  #triggerOverload() {
    if (this.room.isSpectating()) return;
    const local = this.room.getLocalSlot();
    if (!local) return;
    const events = [];
    if (local.loop.triggerOverloadDive(events)) {
      this.cockpitView.triggerDiveSweep();
      this.vfxRenderer.consumeEvents(events);
      this.cameras.main.shake(220, 0.008);
    } else if (!local.session.core.overloadActive) {
      const pct = Math.round((local.session.core.energy / Math.max(1, local.session.core.maxEnergy)) * 100);
      const warn = this.add
        .text(360, 955, `⚡ 过载能源未满 (${pct}% / 100%)`, {
          fontSize: "18px",
          color: "#ff8c3a",
          fontStyle: "bold",
          stroke: "#050a14",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(60);
      this.tweens.add({
        targets: warn,
        y: 925,
        alpha: 0,
        duration: 1100,
        ease: "Cubic.easeOut",
        onComplete: () => warn.destroy(),
      });
    }
  }

  #triggerBarrelRoll() {
    if (this.room.isSpectating()) return;
    const local = this.room.getLocalSlot();
    if (!local || local.session.phase !== GAME_PHASES.PLAYING) return;
    this.actorRenderer.triggerBarrelRoll();
    const dir = local.session.ship.vx < 0 ? -1 : local.session.ship.vx > 0 ? 1 : 0;
    if (dir !== 0) {
      local.session.setShipTargetX(local.session.ship.x + dir * 130);
    }
  }

  #bindInput() {
    // Pointer/touch steering across the full playfield
    const moveToPointer = (pointer) => {
      if (this.room.isSpectating()) return;
      const local = this.room.getLocalSlot();
      if (!local || local.session.phase !== GAME_PHASES.PLAYING) return;
      if (pointer.y < 140 || pointer.y > 1090) return;
      local.session.setShipTargetX(pointer.x);
    };

    this.input.on("pointerdown", moveToPointer);
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown) moveToPointer(pointer);
    });

    // Keyboard controls: A/D or Left/Right steer, 1/2/3 switch form, Space cast skill, F overload
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      arrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
      arrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      overload: Phaser.Input.Keyboard.KeyCodes.F,
      roll: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      chassis: Phaser.Input.Keyboard.KeyCodes.V,
      repair: Phaser.Input.Keyboard.KeyCodes.E,
      overclock: Phaser.Input.Keyboard.KeyCodes.Q,
    });

    this.keys.one.on("down", () => this.#switchForm("pulse"));
    this.keys.two.on("down", () => this.#switchForm("heavy"));
    this.keys.three.on("down", () => this.#switchForm("magnet"));
    this.keys.space.on("down", () => this.#castActiveSkill());
    this.keys.overload.on("down", () => this.#triggerOverload());
    this.keys.roll.on("down", () => this.#triggerBarrelRoll());
    this.keys.repair.on("down", () => {
      if (this.room.isSpectating()) return;
      const local = this.room.getLocalSlot();
      const events = [];
      if (local?.loop.spendScrapForRepair(events)) this.vfxRenderer.consumeEvents(events);
    });
    this.keys.overclock.on("down", () => {
      if (this.room.isSpectating()) return;
      const local = this.room.getLocalSlot();
      const events = [];
      if (local?.loop.spendScrapForOverclock(events)) {
        this.vfxRenderer.consumeEvents(events);
        for (const ev of events) {
          if (ev.type === "pod-install") this.actorRenderer.triggerUpgradeInstall(ev.color, ev.label);
        }
      }
    });
    this.keys.chassis.on("down", () => {
      const info = this.room.cycleChassis();
      this.room.lanClient?.selectChassis(info.id);
      const local = this.room.getLocalSlot();
      if (local) {
        this.vfxRenderer.consumeEvents([
          { type: "reaction", x: local.session.ship.x, y: local.session.ship.y - 44, label: `切换战机 · ${info.name}`, color: info.color },
        ]);
      }
    });
  }

  update(_time, delta) {
    const dtMs = Math.min(50, delta);

    // Keyboard continuous horizontal movement all the way to edges (68..652)
    const local = this.room.getLocalSlot();
    if (local && !this.room.isSpectating() && local.session.phase === GAME_PHASES.PLAYING && this.keys) {
      const moveLeft = this.keys.left.isDown || this.keys.arrowLeft.isDown;
      const moveRight = this.keys.right.isDown || this.keys.arrowRight.isDown;
      if (moveLeft && !moveRight) {
        local.session.setShipTargetX(local.session.ship.x - 1350 * (dtMs / 1000) - 24);
      } else if (moveRight && !moveLeft) {
        local.session.setShipTargetX(local.session.ship.x + 1350 * (dtMs / 1000) + 24);
      }
    }

    let events = [];
    if (this.hitstopMs > 0) {
      this.hitstopMs = Math.max(0, this.hitstopMs - dtMs);
    } else {
      this.room.stepAll(dtMs);
      const watchedAfterStep = this.room.getWatchedSlot();
      events = watchedAfterStep?.lastEvents || [];
      if (watchedAfterStep) watchedAfterStep.lastEvents = [];
    }

    const watched = this.room.getWatchedSlot();
    if (!local || !watched) return;

    for (const ev of events) {
      if (ev.type === "muzzle") {
        this.actorRenderer.triggerRecoil(ev.kind === "heavy" ? 7 : 3);
        if (watched.session.core.overloadActive) this.cockpitView.triggerFire();
      } else if (ev.type === "kill" && ev.hitstopMs) {
        this.hitstopMs = Math.max(this.hitstopMs, ev.hitstopMs);
        this.cameras.main.shake(90, 0.004);
      } else if (ev.type === "skill-cast") {
        this.cameras.main.shake(170, 0.006);
      } else if (ev.type === "pod-install") {
        this.actorRenderer.triggerUpgradeInstall(ev.color, ev.label);
        this.cameras.main.shake(120, 0.005);
      } else if (ev.type === "interference-drop") {
        const who = watched.session.lastRivalPressure?.by || "对手";
        this.vfxRenderer.consumeEvents([{ type: "reaction", x: ev.x, y: 390, label: `⚠ ${who} 领先空投精英拦截！`, color: 0xff4b5c }]);
      } else if (ev.type === "core-hit") {
        this.cameras.main.shake(110, 0.006);
      } else if (ev.type === "overload-end") {
        this.actorRenderer.triggerDiveFinisher();
        this.cameras.main.shake(260, 0.008);
      }
    }

    if (local.session.phase === GAME_PHASES.UPGRADE && !this.scene.isActive("OverlayScene")) {
      this.#openOverlay("upgrade");
    }

    if (local.session.phase === GAME_PHASES.ENDED && !this.endOverlayShown && !this.scene.isActive("OverlayScene")) {
      this.endOverlayShown = true;
      this.room.returnToLocalView();
      this.#openOverlay("ended");
    }

    this.vfxRenderer.consumeEvents(events);
    this.envView.render(watched.session, dtMs);
    this.actorRenderer.render(watched.session, dtMs, this.room.selectedChassis);
    this.coreRenderer.render(watched.session.core, dtMs);
    this.vfxRenderer.render(watched.session, dtMs);
    this.cockpitView.render(watched.session, dtMs);
    this.hud.sync(this.room);
  }

  #openOverlay(kind) {
    const local = this.room.getLocalSlot();
    if (kind === "paused") local?.session.pause();
    if (!this.scene.isActive("OverlayScene")) {
      this.scene.launch("OverlayScene", { kind });
    }
  }

  #cleanup() {
    this.envView?.destroy();
    this.actorRenderer?.destroy();
    this.coreRenderer?.destroy();
    this.vfxRenderer?.destroy();
    this.cockpitView?.destroy();
    this.hud?.destroy();
  }
}
