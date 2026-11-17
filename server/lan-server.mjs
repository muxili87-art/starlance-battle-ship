import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.LAN_PORT || 4390);
const MAX_PLAYERS = 4;

const rooms = new Map(); // roomId -> { id, mode, started, players: Map<slotId, { id, name, ws }>, poolClaims: {} }

function sendWs(ws, payload) {
  if (!ws || ws.destroyed) return;
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, "utf8");
  const header =
    data.length < 126
      ? Buffer.from([0x81, data.length])
      : data.length < 65536
        ? Buffer.from([0x81, 126, (data.length >> 8) & 0xff, data.length & 0xff])
        : null;
  if (!header) return;
  ws.write(Buffer.concat([header, data]));
}

function broadcastRoom(room, payload, exceptWs = null) {
  for (const p of room.players.values()) {
    if (p.ws && p.ws !== exceptWs) sendWs(p.ws, payload);
  }
}

function lobbySnapshot(room) {
  return {
    type: "lobby_state",
    roomId: room.id,
    mode: room.mode,
    started: room.started,
    hostId: "P1",
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      chassis: p.chassis || "viper",
      ready: Boolean(p.ready),
    })),
  };
}

function sendRoomList(ws) {
  const list = [];
  for (const room of rooms.values()) {
    const host = room.players.get("P1");
    list.push({
      roomId: room.id,
      hostName: host?.name || "房主",
      playerCount: room.players.size,
      maxPlayers: MAX_PLAYERS,
      mode: room.mode,
      started: room.started,
    });
  }
  sendWs(ws, { type: "room_list", rooms: list });
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (msg.type === "list_rooms") {
    sendRoomList(ws);
    return;
  }

  if (msg.type === "create_room") {
    const roomId = String(msg.roomId || Math.random().toString(36).slice(2, 6).toUpperCase());
    const room = { id: roomId, mode: msg.mode || "endless", started: false, players: new Map(), claims: {} };
    room.players.set("P1", { id: "P1", name: msg.name || "房主 P1", chassis: msg.chassis || "viper", ready: true, ws });
    rooms.set(roomId, room);
    ws._roomId = roomId;
    ws._slotId = "P1";
    sendWs(ws, { type: "joined", roomId, slotId: "P1", ...lobbySnapshot(room) });
    return;
  }

  if (msg.type === "join_room") {
    const room = rooms.get(String(msg.roomId || "").toUpperCase());
    if (!room || room.started || room.players.size >= MAX_PLAYERS) {
      sendWs(ws, { type: "error", message: "房间不存在、已开始或已满" });
      return;
    }
    let slotId = null;
    for (let i = 1; i <= MAX_PLAYERS; i += 1) {
      if (!room.players.has(`P${i}`)) {
        slotId = `P${i}`;
        break;
      }
    }
    room.players.set(slotId, { id: slotId, name: msg.name || `玩家 ${slotId}`, chassis: msg.chassis || "viper", ready: false, ws });
    ws._roomId = room.id;
    ws._slotId = slotId;
    sendWs(ws, { type: "joined", roomId: room.id, slotId, ...lobbySnapshot(room) });
    broadcastRoom(room, lobbySnapshot(room), ws);
    return;
  }

  const room = rooms.get(ws._roomId);
  if (!room) return;

  if (msg.type === "select_chassis") {
    const p = room.players.get(ws._slotId);
    if (p) {
      p.chassis = msg.chassis || "viper";
      broadcastRoom(room, lobbySnapshot(room));
    }
    return;
  }

  if (msg.type === "toggle_ready") {
    const p = room.players.get(ws._slotId);
    if (p) {
      p.ready = typeof msg.ready === "boolean" ? msg.ready : !p.ready;
      broadcastRoom(room, lobbySnapshot(room));
    }
    return;
  }

  if (msg.type === "chat_message") {
    const p = room.players.get(ws._slotId);
    const text = String(msg.text || "").trim().slice(0, 80);
    if (p && text) {
      broadcastRoom(room, {
        type: "chat_message",
        slotId: p.id,
        name: p.name,
        text,
        ts: Date.now(),
      });
    }
    return;
  }

  if (msg.type === "start_match" && ws._slotId === "P1") {
    room.started = true;
    broadcastRoom(room, {
      type: "match_start",
      mode: room.mode,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        chassis: p.chassis || "viper",
      })),
    });
    return;
  }

  if (msg.type === "state_sync") {
    broadcastRoom(room, { type: "remote_state", slotId: ws._slotId, snapshot: msg.snapshot }, ws);
    return;
  }

  if (msg.type === "claim_prize") {
    const key = `${msg.tierKey}:${msg.cardId}`;
    const current = room.claims[key] || [];
    const maxStock = Number(msg.maxStock || 1);
    if (current.length < maxStock) {
      current.push(ws._slotId);
      room.claims[key] = current;
      broadcastRoom(room, { type: "prize_claimed", tierKey: msg.tierKey, cardId: msg.cardId, playerId: ws._slotId });
    }
  }
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n")
  );

  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      if (opcode === 0x8) return socket.destroy();
      const masked = (buffer[1] & 0x80) !== 0;
      let len = buffer[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buffer.length < 4) return;
        len = buffer.readUInt16BE(2);
        offset = 4;
      }
      const total = offset + (masked ? 4 : 0) + len;
      if (buffer.length < total) return;
      const mask = masked ? buffer.subarray(offset, offset + 4) : null;
      const payload = Buffer.from(buffer.subarray(offset + (masked ? 4 : 0), total));
      if (mask) {
        for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
      }
      buffer = buffer.subarray(total);
      if (opcode === 0x1) handleMessage(socket, payload.toString("utf8"));
    }
  });

  socket.on("close", () => {
    const room = rooms.get(socket._roomId);
    if (!room) return;
    room.players.delete(socket._slotId);
    if (room.players.size === 0) rooms.delete(room.id);
    else broadcastRoom(room, lobbySnapshot(room));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LAN Match Server listening on ws://0.0.0.0:${PORT}`);
});
