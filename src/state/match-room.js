import { GameSession, GAME_PHASES } from "./game-session.js";
import { CombatLoop } from "../core/combat-loop.js";
import { SharedPrizePool } from "../core/shared-prize-pool.js";
import { pickBotPrizeCard, stepAutopilot } from "../core/bot-pilot.js";
import { computeSlotPaceModifiers } from "../core/comeback-system.js";
import { applyBuildCard } from "../core/build-system.js";

export const AUTOPILOT_DAMAGE_SCALE = 0.9;
export const MAX_ROOM_PLAYERS = 4;
export const SQUADRON_COLORS = Object.freeze([0x43cff4, 0xff8c3a, 0xb07cff, 0x58e69a]);
export const CHASSIS_CATALOG = Object.freeze({
  viper: {
    id: "viper",
    name: "A型 尖锐矢刃",
    tag: "伤害+12% · 脉冲穿透+1 · 航速+15%",
    desc: "高机动突击型：全域伤害+12%，脉冲额外穿透1个目标，横移速度+15%",
    color: 0x43cff4,
  },
  r9: {
    id: "r9",
    name: "R-9 经典掠夺",
    tag: "攻速+18% · 星屑+30% · 冷却-15%",
    desc: "速射狂潮型：全域射速+18%，击破掉落星屑+30%，技能冷却缩短15%",
    color: 0xff8c3a,
  },
  aegis: {
    id: "aegis",
    name: "AEGIS 重装盾卫",
    tag: "减伤30% · 每波回盾+6% · 受击清弹反震",
    desc: "铁壁反击型：常驻减伤30%，每波自动回盾+6%，受击释放反震波清除周围弹幕",
    color: 0xb07cff,
  },
});
const ACE_BOT_CALLSIGNS = ["VIPER", "KESTREL", "FALCON", "SPECTRE", "ORION", "RAVEN", "LYNX", "COBRA", "VALKYRIE", "APEX"];

function pickRandomBotCallsigns(count = 3) {
  const pool = [...ACE_BOT_CALLSIGNS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * 4-player competitive match room.
 * - Supports 1..4 human players (local + LAN remote) and auto-fills remaining seats with Bots.
 * - Tracks each player's route/wave progress and core HP.
 * - Switching spectate view to an opponent enables local Autopilot at 90% damage.
 * - Coordinates the SharedPrizePool across all 4 slots.
 */
export class MatchRoom {
  constructor() {
    this.sharedPool = new SharedPrizePool();
    this.slots = [];
    this.localSlotId = "P1";
    this.watchedSlotId = "P1";
    this.mode = "campaign";
    this.lanClient = null;
    this.selectedChassis = "viper";
    this.localCallsign = "NOVA";
    this.snipeTimerMs = 2200;
    this.lanSyncAccumMs = 0;
  }

  setChassis(chassisId) {
    this.selectedChassis = CHASSIS_CATALOG[chassisId] ? chassisId : "viper";
    const local = this.getLocalSlot();
    if (local?.session) local.session.chassis = this.selectedChassis;
  }

  cycleChassis() {
    const order = ["viper", "r9", "aegis"];
    const next = order[(order.indexOf(this.selectedChassis) + 1) % order.length];
    this.setChassis(next);
    return CHASSIS_CATALOG[next];
  }

  setLocalCallsign(name) {
    const clean = String(name || "").trim().slice(0, 12);
    if (clean) this.localCallsign = clean;
  }

  setupSoloWithBots(mode = "campaign", localName = this.localCallsign) {
    this.mode = mode;
    this.sharedPool = new SharedPrizePool();
    this.localSlotId = "P1";
    this.watchedSlotId = "P1";
    const botNames = pickRandomBotCallsigns(3);

    const specs = [
      { id: "P1", name: localName || this.localCallsign, kind: "local", accentColor: SQUADRON_COLORS[0] },
      { id: "P2", name: botNames[0], kind: "bot", accentColor: SQUADRON_COLORS[1] },
      { id: "P3", name: botNames[1], kind: "bot", accentColor: SQUADRON_COLORS[2] },
      { id: "P4", name: botNames[2], kind: "bot", accentColor: SQUADRON_COLORS[3] },
    ];

    this.slots = specs.map((spec, idx) => this.#createSlot(spec, idx, mode));
    return this.slots;
  }

  setupFromLobby(players = [], localSlotId = "P1", mode = "campaign") {
    this.mode = mode;
    this.sharedPool = new SharedPrizePool();
    this.localSlotId = localSlotId;
    this.watchedSlotId = localSlotId;

    const botNames = pickRandomBotCallsigns(MAX_ROOM_PLAYERS);
    const filled = [];
    for (let i = 0; i < MAX_ROOM_PLAYERS; i += 1) {
      const id = `P${i + 1}`;
      const human = players.find((p) => p.id === id);
      if (human) {
        filled.push({
          id,
          name: human.name || (id === localSlotId ? this.localCallsign : id),
          kind: id === localSlotId ? "local" : "remote",
          chassis: human.chassis || (id === localSlotId ? this.selectedChassis : "viper"),
          accentColor: SQUADRON_COLORS[i % SQUADRON_COLORS.length],
        });
      } else {
        filled.push({
          id,
          name: botNames[i],
          kind: "bot",
          accentColor: SQUADRON_COLORS[i % SQUADRON_COLORS.length],
        });
      }
    }

    this.slots = filled.map((spec, idx) => this.#createSlot(spec, idx, mode));
    return this.slots;
  }

  #createSlot(spec, idx, mode) {
    const session = new GameSession();
    session.startRun(mode);
    if (spec.kind === "bot") {
      session.ship.autopilot = true;
      session.ship.damageScale = 0.92 + (idx % 3) * 0.04;
      if (mode === "campaign") {
        session.selectCampaignBranch(idx % 2 === 0 ? "normal" : "risk");
      }
    } else {
      session.ship.damageScale = 1.0;
    }

    const chassis = spec.chassis || (spec.kind === "local" ? this.selectedChassis : ["r9", "aegis", "viper"][idx % 3]);
    session.chassis = chassis;
    if (chassis === "viper") {
      session.build.damageMultiplier = Number((session.build.damageMultiplier + 0.12).toFixed(2));
    } else if (chassis === "r9") {
      session.build.attackSpeedMultiplier = Number((session.build.attackSpeedMultiplier + 0.18).toFixed(2));
    } else if (chassis === "aegis") {
      session.core.maxHp += 15;
      session.core.hp += 15;
    }

    return {
      id: spec.id,
      index: idx,
      name: spec.name,
      chassis,
      accentColor: spec.accentColor || SQUADRON_COLORS[idx % SQUADRON_COLORS.length],
      kind: spec.kind, // "local" | "remote" | "bot"
      session,
      loop: new CombatLoop(session),
      lastEvents: [],
    };
  }

  getLocalSlot() {
    return this.slots.find((s) => s.id === this.localSlotId) || this.slots[0] || null;
  }

  getWatchedSlot() {
    return this.slots.find((s) => s.id === this.watchedSlotId) || this.getLocalSlot();
  }

  isSpectating() {
    return this.watchedSlotId !== this.localSlotId;
  }

  setWatchedSlot(slotId) {
    const target = this.slots.find((s) => s.id === slotId);
    if (!target) return false;
    this.watchedSlotId = slotId;

    const local = this.getLocalSlot();
    if (local) {
      const spectating = this.isSpectating();
      local.session.ship.autopilot = spectating;
      local.session.ship.damageScale = spectating ? AUTOPILOT_DAMAGE_SCALE : 1.0;
    }
    return true;
  }

  returnToLocalView() {
    return this.setWatchedSlot(this.localSlotId);
  }

  stepAll(dtMs) {
    // Refresh competitive pace & comeback modifiers based on live rankings
    const board = this.getProgressBoard();
    const leaderNode = board[0] ? board[0].progressRatio : 0;
    board.forEach((row, idx) => {
      const slot = this.slots.find((sl) => sl.id === row.id);
      if (!slot) return;
      const rank = idx + 1;
      const gap = Math.round((leaderNode - row.progressRatio) * 9);
      slot.session.pace = { rank, ...computeSlotPaceModifiers(rank, this.slots.length, gap) };
    });

    for (const slot of this.slots) {
      if (slot.kind === "remote") continue; // remote state arrives via LAN snapshots

      const s = slot.session;
      if (s.phase === GAME_PHASES.PLAYING) {
        if (slot.kind === "bot" || s.ship.autopilot) {
          stepAutopilot(s, dtMs, slot.loop, { reactionMs: slot.kind === "bot" ? 260 : 210 });
        }
        slot.lastEvents = slot.loop.step(dtMs);
      } else {
        slot.lastEvents = [];
      }

      // When an AI bot clears a wave or triggers upgrade, immediately pressure the local player / leader!
      if (slot.kind === "bot" && slot.lastEvents?.some((ev) => ev.type === "wave-clear")) {
        const local = this.getLocalSlot();
        if (local && local.id !== slot.id && s.endless.wave > local.session.endless.wave) {
          local.session.endless.pendingInterference += 1;
          local.session.lastRivalPressure = { by: slot.name, color: slot.accentColor };
        }
      }

      // Handle Bot automatic shared-pool upgrade & route progression
      if (slot.kind === "bot" && (s.phase === GAME_PHASES.UPGRADE || s.phase === GAME_PHASES.ROUTE)) {
        this.#stepBotProgression(slot);
      }
    }

    this.#syncSameScreenWingmen(dtMs);

    const local = this.getLocalSlot();
    if (local && this.lanClient) {
      this.lanSyncAccumMs += dtMs;
      if (this.lanSyncAccumMs >= 120) {
        this.lanSyncAccumMs = 0;
        this.lanClient.sendStateSync(local.session, this.selectedChassis);
      }
    }
  }

  hasAliveOthers() {
    return this.slots.some((sl) => sl.id !== this.localSlotId && sl.session.phase !== GAME_PHASES.ENDED);
  }

  spectateNextAlive() {
    const alive = this.slots.filter((sl) => sl.id !== this.localSlotId && sl.session.phase !== GAME_PHASES.ENDED);
    if (alive.length === 0) return null;
    const curIdx = alive.findIndex((sl) => sl.id === this.watchedSlotId);
    const next = alive[(curIdx + 1) % alive.length];
    this.setWatchedSlot(next.id);
    return next;
  }

  #syncSameScreenWingmen(dtMs) {
    const watched = this.getWatchedSlot();
    if (!watched) return;
    const ws = watched.session;
    const rivals = this.slots.filter((sl) => sl.id !== watched.id);

    ws.wingmen = rivals.map((r, idx) => ({
      id: r.id,
      name: r.name,
      accentColor: r.accentColor || SQUADRON_COLORS[r.index % SQUADRON_COLORS.length],
      x: r.session.ship?.x ?? 180 + idx * 180,
      y: (r.session.ship?.y ?? 1020) - 28 - idx * 8,
      vx: r.session.ship?.vx ?? 0,
      activeForm: r.session.activeForm || "pulse",
      chassis: r.chassis || ["r9", "aegis", "viper"][idx % 3],
      ended: r.session.phase === GAME_PHASES.ENDED,
    }));

    // Same-screen mob contention: alive rival wingmen snipe on-screen enemies!
    this.snipeTimerMs -= dtMs;
    if (this.snipeTimerMs <= 0 && ws.phase === GAME_PHASES.PLAYING && ws.enemies.length > 0) {
      this.snipeTimerMs = 2100;
      const aliveRivals = rivals.filter((r) => r.session.phase !== GAME_PHASES.ENDED);
      if (aliveRivals.length === 0) return;
      const sniper = aliveRivals[Math.floor(Math.random() * aliveRivals.length)];
      const target = ws.enemies.find((e) => e.hp > 0 && e.y > 360 && e.y < 880);
      if (!target) return;
      const dmg = 38;
      target.hp -= dmg;
      target.hitFlashMs = 80;
      const wing = ws.wingmen.find((w) => w.id === sniper.id);
      const sx = wing?.x ?? sniper.session.ship.x;
      const sy = wing?.y ?? 990;
      watched.lastEvents = watched.lastEvents || [];
      watched.lastEvents.push({
        type: "chain",
        x1: sx,
        y1: sy - 20,
        x2: target.x,
        y2: target.y,
        color: sniper.accentColor || 0xff8c3a,
      });
      if (target.hp <= 0) {
        sniper.session.stats.kills += 1;
        ws.core.energy = Math.min(ws.core.maxEnergy, ws.core.energy + 3);
        watched.lastEvents.push({
          type: "kill",
          enemy: { x: target.x, y: target.y },
          kind: sniper.session.activeForm || "pulse",
        });
        watched.lastEvents.push({
          type: "reaction",
          x: target.x,
          y: target.y - 24,
          label: `⚡ ${sniper.name} 抢怪击破!`,
          color: sniper.accentColor || 0xff8c3a,
        });
        ws.enemies = ws.enemies.filter((e) => e.hp > 0);
      }
    }
  }

  #stepBotProgression(slot) {
    const s = slot.session;
    if (s.phase === GAME_PHASES.UPGRADE) {
      const tierKey = this.currentTierKey(s);
      this.sharedPool.recordMilestoneClear(tierKey, slot.id);
      const available = this.sharedPool.getAvailableEntries(tierKey);
      const picked = pickBotPrizeCard(available);
      if (picked) {
        this.sharedPool.claimCard(tierKey, slot.id, picked.cardId);
        applyBuildCard(s.build, picked.card);
      }
      if ((s.pace?.rank || 1) >= 2) {
        this.triggerComebackAirdrop(slot.id);
      }
      if (this.mode === "campaign") {
        s.advanceCampaignNode();
        s.selectCampaignBranch(slot.index % 2 === 0 ? "normal" : "risk");
      } else {
        s.setPhase(GAME_PHASES.PLAYING);
      }
    } else if (s.phase === GAME_PHASES.ROUTE) {
      s.selectCampaignBranch(slot.index % 2 === 0 ? "normal" : "risk");
    }
  }

  triggerComebackAirdrop(fromSlotId) {
    const board = this.getProgressBoard();
    const leaderRow = board[0];
    if (!leaderRow || leaderRow.id === fromSlotId) return null;
    const leaderSlot = this.slots.find((sl) => sl.id === leaderRow.id);
    const senderSlot = this.slots.find((sl) => sl.id === fromSlotId);
    if (!leaderSlot || !senderSlot) return null;

    leaderSlot.session.endless.pendingInterference += 1;
    senderSlot.session.core.energy = Math.min(
      senderSlot.session.core.maxEnergy,
      senderSlot.session.core.energy + 20
    );
    return { targetId: leaderSlot.id, targetName: leaderSlot.name };
  }

  currentTierKey(session) {
    if (this.mode === "campaign") {
      return `${session.campaign.segment}-${session.campaign.position}`;
    }
    return `endless-${session.endless.wave}`;
  }

  getProgressBoard() {
    return this.slots
      .map((slot) => {
        const s = slot.session;
        const nodeProgress =
          this.mode === "campaign"
            ? (s.campaign.segment - 1) * 3 + s.campaign.position
            : s.endless.wave;
        const totalNodes = 9;
        const waveRatio =
          this.mode === "campaign"
            ? Math.min(0.99, (nodeProgress - 1 + (s.campaign.groupIndex / Math.max(1, s.campaign.groups.length))) / totalNodes)
            : Math.min(1, (s.endless.waveKills || 0) / Math.max(1, s.endless.waveTargetKills || 10));
        return {
          id: slot.id,
          name: slot.name,
          accentColor: slot.accentColor || SQUADRON_COLORS[slot.index % SQUADRON_COLORS.length],
          kind: slot.kind,
          isLocal: slot.id === this.localSlotId,
          isWatched: slot.id === this.watchedSlotId,
          nodeLabel: this.mode === "campaign" ? `${s.campaign.segment}-${s.campaign.position}` : `W${s.endless.wave}`,
          wave: s.endless.wave || 1,
          progressRatio: waveRatio,
          hpPct: Math.round((s.core.hp / Math.max(1, s.core.maxHp)) * 100),
          kills: s.stats.kills,
          ended: s.phase === GAME_PHASES.ENDED,
          result: s.result,
        };
      })
      .sort((a, b) => b.wave - a.wave || b.kills - a.kills);
  }

  getBossDpsBoard() {
    return this.slots
      .map((slot) => {
        const s = slot.session;
        return {
          id: slot.id,
          name: slot.name,
          accentColor: slot.accentColor || SQUADRON_COLORS[slot.index % SQUADRON_COLORS.length],
          isLocal: slot.id === this.localSlotId,
          dps: Math.round(s.boss?.dpsDealt ?? s.stats.damageDealt ?? 0),
        };
      })
      .sort((a, b) => b.dps - a.dps);
  }
}
