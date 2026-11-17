import {
  BATTLE_LAYOUT,
  OVERLOAD_DURATION,
  OVERLOAD_MAX_ENERGY,
  SHIP_SECTOR_CENTERS,
  shipSectorForX,
} from "../core/combat-rules.js";
import { createBuildState } from "../core/build-system.js";
import { createPrimaryWeaponState } from "../core/primary-weapon.js";
import { createDamageLedger } from "../core/damage-ledger.js";
import { campaignEncounterFor } from "../core/campaign-director.js";
import { bossDefinitionFor, createBlockadeCycle } from "../core/boss-catalog.js";
import { WEAPON_FORMS } from "../core/weapon-forms.js";

export const GAME_PHASES = Object.freeze({
  MENU: "menu",
  ROUTE: "route",
  PLAYING: "playing",
  PAUSED: "paused",
  UPGRADE: "upgrade",
  ENDED: "ended",
});

/**
 * Single authoritative runtime state for a run.
 * Pure JS (no Phaser dependency) so rules, overlays, and renderers read one source of truth.
 */
export class GameSession {
  constructor() {
    this.reset();
  }

  reset(mode = "campaign") {
    this.mode = mode;
    this.phase = GAME_PHASES.MENU;
    this.phaseBeforePause = null;
    this.elapsedMs = 0;
    this.result = null; // "victory" | "defeat" | null

    this.ship = {
      x: SHIP_SECTOR_CENTERS[1],
      targetX: SHIP_SECTOR_CENTERS[1],
      y: BATTLE_LAYOUT.shipY,
      sector: 1,
      vx: 0,
      visible: true,
      autopilot: false,
    };

    this.core = {
      hp: 100,
      maxHp: 100,
      energy: 0,
      maxEnergy: OVERLOAD_MAX_ENERGY,
      overloadActive: false,
      overloadRemainingMs: 0,
      overloadDurationMs: OVERLOAD_DURATION * 1000,
      overloadCount: 0,
    };

    this.activeForm = "pulse";
    this.formCooldowns = { pulse: 0, heavy: 0, magnet: 0 };
    this.activeSkillBuff = null; // { formId, remainingMs, volleyTimerMs, volleysLeft }
    this.weapons = {
      primary: createPrimaryWeaponState(),
      fireCooldownMs: 0,
      machinegunCooldownMs: 0,
      missileCooldownMs: 0,
      droneCooldownsMs: [0, 0, 0, 0],
    };

    this.build = createBuildState();
    this.ledger = createDamageLedger();

    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.drops = [];
    this.supplyPods = [];
    this.nebulaZones = [];
    this.inIonNebula = false;
    this.installedModules = [];
    this.economy = {
      scrap: 0,
      combo: 0,
      comboTimerMs: 0,
      repairCount: 0,
      overclockCount: 0,
    };
    this.lockedTargetId = null;
    this.boss = null;
    this.bossWarnings = [];
    this.nextEntityId = 1;

    this.campaign = {
      segment: 1,
      position: 1,
      branch: "normal",
      seed: 12,
      encounter: null,
      groups: [],
      groupIndex: 0,
      groupTimerMs: 0,
      nodeCleared: false,
    };

    this.endless = {
      wave: 1,
      waveKills: 0,
      waveTargetKills: 10,
      spawnTimerMs: 600,
      nextUpgradeAtMs: 30000,
      pendingInterference: 0,
    };

    this.stats = {
      kills: 0,
      damageDealt: 0,
      coreHits: 0,
    };

    this.pace = {
      rank: 1,
      label: "均衡",
      enemyHpScale: 1.0,
      overloadChargeScale: 1.0,
      unlockComebackCard: false,
    };
  }

  startRun(mode = "campaign") {
    this.reset(mode);
    if (mode === "campaign") {
      this.phase = GAME_PHASES.ROUTE;
    } else {
      this.phase = GAME_PHASES.PLAYING;
    }
  }

  selectCampaignBranch(branch = "normal") {
    const enc = campaignEncounterFor({
      segment: this.campaign.segment,
      branch,
      position: this.campaign.position,
      seed: this.campaign.seed + this.campaign.segment * 7 + this.campaign.position,
      mode: "campaign",
    });
    this.campaign.branch = branch;
    this.campaign.encounter = enc;
    this.campaign.groups = enc.pressureProfile?.groups
      ? enc.pressureProfile.groups.map((g) => [...g.units])
      : [[{ type: "scout", sector: 0 }, { type: "striker", sector: 1 }, { type: "scout", sector: 2 }]];
    this.campaign.groupIndex = 0;
    this.campaign.groupTimerMs = 300;
    this.campaign.nodeCleared = false;
    this.enemies = [];
    this.projectiles = [];
    this.phase = GAME_PHASES.PLAYING;
  }

  advanceCampaignNode() {
    if (this.campaign.position < 3) {
      this.campaign.position += 1;
    } else if (this.campaign.segment < 3) {
      this.campaign.segment += 1;
      this.campaign.position = 1;
    }
    this.phase = GAME_PHASES.ROUTE;
  }

  isFinalCampaignNode() {
    return this.mode === "campaign" && this.campaign.segment === 3 && this.campaign.position === 3;
  }

  spawnCampaignBoss() {
    const def = bossDefinitionFor("blockade-cruiser");
    const totalHp = 1800;
    this.boss = {
      id: def.id,
      name: def.name,
      x: 360,
      y: 250,
      hp: totalHp,
      maxHp: totalHp,
      cycle: createBlockadeCycle(this.elapsedMs),
      parts: [
        { id: "left-cannon", label: "左炮", x: 165, y: 270, hp: 450, maxHp: 450, dead: false },
        { id: "right-cannon", label: "右炮", x: 555, y: 270, hp: 450, maxHp: 450, dead: false },
        { id: "reactor", label: "中央反应堆", x: 360, y: 235, hp: 900, maxHp: 900, dead: false },
      ],
    };
  }

  setPhase(nextPhase) {
    if (this.phase === nextPhase) return;
    this.phase = nextPhase;
  }

  pause() {
    if (this.phase === GAME_PHASES.PAUSED || this.phase === GAME_PHASES.ENDED) return;
    this.phaseBeforePause = this.phase;
    this.phase = GAME_PHASES.PAUSED;
  }

  resume() {
    if (this.phase !== GAME_PHASES.PAUSED) return;
    this.phase = this.phaseBeforePause || GAME_PHASES.PLAYING;
    this.phaseBeforePause = null;
  }

  setShipTargetX(x) {
    const clamped = Math.max(68, Math.min(652, x));
    this.ship.targetX = clamped;
    this.ship.sector = shipSectorForX(clamped);
  }

  setShipVisible(visible) {
    this.ship.visible = Boolean(visible);
  }

  canTriggerOverload() {
    return (
      this.phase === GAME_PHASES.PLAYING &&
      !this.core.overloadActive &&
      this.core.energy >= this.core.maxEnergy
    );
  }

  triggerOverload() {
    if (!this.canTriggerOverload()) return false;
    this.core.energy = 0;
    this.core.overloadActive = true;
    this.core.overloadRemainingMs = this.core.overloadDurationMs;
    this.core.overloadCount += 1;
    return true;
  }

  switchForm(formId) {
    if (!WEAPON_FORMS[formId] || this.activeForm === formId) return false;
    this.activeForm = formId;
    this.weapons.fireCooldownMs = Math.min(this.weapons.fireCooldownMs, 60);
    return true;
  }

  canTriggerFormSkill(formId = this.activeForm) {
    return this.phase === GAME_PHASES.PLAYING && (this.formCooldowns[formId] || 0) <= 0;
  }

  allocateId() {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }
}
