import Phaser from "phaser";
import { bgm } from "../audio/bgm-synth.js";
import { sfx } from "../audio/sfx-synth.js";
import { SoloCombat } from "../core/solo-combat.js";
import { EnvironmentView } from "../presentation/environment-view.js";
import { V2ActorRenderer } from "../presentation/v2-actor-renderer.js";
import { FIELD, SoloSession } from "../state/solo-session.js";
import { SoloHud } from "../ui/solo-hud.js";

const DIRECTIONS = new Map([
  ["ArrowLeft", [-1, 0]], ["KeyA", [-1, 0]],
  ["ArrowRight", [1, 0]], ["KeyD", [1, 0]],
  ["ArrowUp", [0, -1]], ["KeyW", [0, -1]],
  ["ArrowDown", [0, 1]], ["KeyS", [0, 1]],
]);

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }

  create() {
    this.hitstopMs = 0;
    this.resultDelay = null;
    this.session = new SoloSession(this.registry.get("fighter-id"), Math.random, {
      mode: this.registry.get("game-mode") ?? "campaign",
      difficulty: this.registry.get("game-difficulty") ?? "standard",
    });
    this.combat = new SoloCombat(this.session, this.registry.get("solo-assets"));
    this.environment = new EnvironmentView(this);
    this.actors = new V2ActorRenderer(this, this.session.fighterId);
    this.hud = new SoloHud({
      onOverload: () => this.combat.triggerOverload(),
      onPause: () => this.#togglePause(),
      onUpgrade: (id) => {
        if (this.session.chooseUpgrade(id) && this.session.phase === "upgrade") {
          this.combat.events.push({ type: "level" });
        }
      },
      onRetry: () => {
        sfx.unlock();
        this.scene.restart();
      },
      onMute: () => sfx.toggleMute(),
      isMuted: () => sfx.muted,
      onMenu: () => this.scene.start("MenuScene"),
    });
    this.hud.render(this.combat);
    this.#bindInput();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bgm.setMode("off");
      this.inputScope.abort();
      this.hud.destroy();
    });
    bgm.setMode("stage");
  }

  #togglePause() {
    if (this.session.phase === "playing") {
      this.session.phase = "paused";
      this.#resetSteering();
    } else if (this.session.phase === "paused") {
      this.session.phase = "playing";
    }
  }

  #resetSteering() {
    if (this.drag) {
      const canvas = this.game.canvas;
      if (canvas.hasPointerCapture(this.drag.id)) canvas.releasePointerCapture(this.drag.id);
      this.drag = null;
    }
    this.held.clear();
    this.session.setTarget(this.session.ship.x, this.session.ship.y);
  }

  #bindInput() {
    this.held = new Set();
    this.drag = null;
    this.inputScope = new AbortController();
    const opts = { signal: this.inputScope.signal };
    const canvas = this.game.canvas;
    const toGame = (evt) => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - bounds.left) * FIELD.width / bounds.width,
        y: (evt.clientY - bounds.top) * FIELD.height / bounds.height,
      };
    };

    canvas.addEventListener("pointerdown", (evt) => {
      if (evt.button !== 0 || this.session.phase !== "playing" || this.drag) return;
      const { x, y } = toGame(evt);
      if (evt.pointerType === "mouse") {
        this.session.setTarget(x, y);
        return;
      }
      this.drag = { id: evt.pointerId, x, y };
      canvas.setPointerCapture(evt.pointerId);
    }, opts);
    canvas.addEventListener("pointermove", (evt) => {
      if (this.session.phase !== "playing" || this.held.size) return;
      if (evt.pointerType !== "mouse" && this.drag?.id !== evt.pointerId) return;
      const { x, y } = toGame(evt);
      if (evt.pointerType === "mouse") {
        this.session.setTarget(x, y);
        return;
      }
      const ship = this.session.ship;
      this.session.setTarget(ship.targetX + x - this.drag.x, ship.targetY + y - this.drag.y);
      Object.assign(this.drag, { x, y });
    }, opts);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      canvas.addEventListener(type, (evt) => {
        if (this.drag?.id === evt.pointerId) this.drag = null;
      }, opts);
    }
    window.addEventListener("keydown", (evt) => {
      if (evt.code === "Escape" && !evt.repeat) this.#togglePause();
      if (this.session.phase !== "playing") return;
      if (evt.code === "Space" && !(evt.target instanceof HTMLButtonElement)) {
        evt.preventDefault();
        if (!evt.repeat) this.combat.triggerOverload();
      }
      if (!DIRECTIONS.has(evt.code)) return;
      evt.preventDefault();
      if (!this.held.size) this.#resetSteering();
      this.held.add(evt.code);
    }, opts);
    window.addEventListener("keyup", (evt) => this.held.delete(evt.code), opts);
    window.addEventListener("blur", () => this.#resetSteering(), opts);
  }

  #steerByKeyboard(dtMs) {
    let x = 0;
    let y = 0;
    for (const key of this.held) {
      const [dx, dy] = DIRECTIONS.get(key);
      x += dx;
      y += dy;
    }
    const length = Math.hypot(x, y);
    if (!length) return;
    const step = 0.62 * (this.session.fighter.move ?? 1) * (this.session.comboTier ? 1.08 : 1) * dtMs / length;
    const { targetX, targetY } = this.session.ship;
    this.session.setTarget(targetX + x * step, targetY + y * step);
  }

  update(_time, delta) {
    const { session: s, combat } = this;
    const dt = Math.min(delta, 50);
    const before = s.phase;
    const stopped = Math.min(dt, this.hitstopMs);
    this.hitstopMs -= stopped;
    combat.advance(dt - stopped, (ms) => this.#steerByKeyboard(ms));
    if (before === "playing" && s.phase !== "playing") this.#resetSteering();

    for (const event of combat.events) {
      if (event.heavy && (event.type === "destroy" || event.type === "part-break")) {
        this.hitstopMs = Math.max(this.hitstopMs, 28);
        this.cameras.main.shake(125, event.type === "part-break" ? 0.0059 : 0.0041);
      }
      if (event.type === "boss-laser-fire") this.cameras.main.shake(175, 0.0054);
      if (event.type === "boss-phase") this.cameras.main.shake(220, 0.0062);
      if (event.type === "overload") this.cameras.main.shake(110, 0.0038);
    }
    sfx.consume(combat.events);
    if (s.phase === "playing") bgm.setMode(combat.boss ? "boss" : "stage");
    else if (s.phase === "victory" || s.phase === "defeat") bgm.setMode("off");
    if (s.phase === "victory" || s.phase === "defeat") this.resultDelay = (this.resultDelay ?? 580) - dt;
    if (before === "playing" || combat.events.length || this.resultDelay > 0) {
      this.environment.render({ ship: s.ship, overload: s.overloadMs > 0, warpDashMs: s.warpDashMs, stage: s.sector }, dt - stopped);
      this.actors.render(combat, dt);
    }
    this.hud.render(combat, this.resultDelay === null || this.resultDelay <= 0);
    combat.events.length = 0;
  }
}
