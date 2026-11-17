/**
 * Lightweight browser WebSocket client for LAN multiplayer rooms.
 * Syncs lobby seats, match start (with bot fill), shared prize claims, and spectate snapshots.
 */
export class LanClient {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.slotId = "P1";
    this.handlers = new Map();
  }

  connect(url = `ws://${window.location.hostname || "127.0.0.1"}:4390`) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => resolve(this);
      ws.onerror = (err) => reject(err);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.roomId) this.roomId = msg.roomId;
          if (msg.slotId && msg.type === "joined") this.slotId = msg.slotId;
          const fn = this.handlers.get(msg.type);
          if (fn) fn(msg);
        } catch {
          // ignore malformed frames
        }
      };
    });
  }

  on(type, handler) {
    this.handlers.set(type, handler);
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  createRoom(name = "房主", mode = "endless", chassis = "viper") {
    this.send({ type: "create_room", name, mode, chassis });
  }

  joinRoom(roomId, name = "玩家", chassis = "viper") {
    this.send({ type: "join_room", roomId: roomId.toUpperCase(), name, chassis });
  }

  listRooms() {
    this.send({ type: "list_rooms" });
  }

  selectChassis(chassis) {
    this.send({ type: "select_chassis", chassis });
  }

  toggleReady(ready) {
    this.send({ type: "toggle_ready", ready });
  }

  sendChat(text) {
    this.send({ type: "chat_message", text });
  }

  startMatch() {
    this.send({ type: "start_match" });
  }

  sendStateSync(session, chassis = "viper") {
    this.send({
      type: "state_sync",
      snapshot: {
        phase: session.phase,
        activeForm: session.activeForm,
        chassis,
        ship: session.ship,
        core: session.core,
        enemies: session.enemies.slice(0, 16),
        projectiles: session.projectiles.slice(0, 24),
        boss: session.boss ? { ...session.boss, cycle: undefined } : null,
        campaign: { segment: session.campaign.segment, position: session.campaign.position },
        endless: { wave: session.endless.wave },
        stats: session.stats,
        result: session.result,
      },
    });
  }

  claimPrize(tierKey, cardId, maxStock) {
    this.send({ type: "claim_prize", tierKey, cardId, maxStock });
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
