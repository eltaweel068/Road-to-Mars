import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_SLOTS = 6;
const CREW_MASS = 80;
const MAX_SPEED = 320;
const BOT_SPEED = 170;
const MOVE_LIMIT_PER_SECOND = 60;
const KILL_RADIUS = 80;
const KILL_COOLDOWN_MS = 20000;
const MEETING_DURATION_MS = 60000;
const MEETING_COOLDOWN_MS = 15000;
const MOON_SEQUENCE_MS = 5000;
const MOON_FUEL_COST = 10;
const MOON_O2_COST = 12;
const MOON_PROGRESS_DELAY_MS = 15000;
const TASK_COOLDOWN_MS = 8000;
const BOT_TICK_MS = 250;
const TELEMETRY_TICK_MS = 1000;
const MAX_NAME_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 200;
const DEFAULT_FUEL_MASS = 250;
const FUEL_MASS_MIN = 50;
const FUEL_MASS_MAX = 400;
const CREW_SPECIALTIES = new Set([
  "pilot",
  "o2",
  "chef",
  "propulsion",
  "scientist",
  "electrical",
]);
const WORLD = { minX: 0, maxX: 3200, minY: 0, maxY: 2000 };
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SPAWNS = [
  { x: 1350, y: 700 },
  { x: 1300, y: 760 },
  { x: 1500, y: 760 },
  { x: 1300, y: 850 },
  { x: 1500, y: 850 },
  { x: 1400, y: 920 },
];

const COLORS = [
  "#c51111",
  "#132ed1",
  "#117f2d",
  "#ed54ba",
  "#ef7d0d",
  "#f5f557",
  "#3f474e",
  "#d6e0f0",
  "#71491e",
  "#38fedc",
  "#6b2fbb",
  "#50ef39",
];

const BOT_NAMES = [
  "Mido",
  "Hamou",
  "Zeeko",
  "Sara",
  "Baqlaz",
  "Romy",
  "Nova",
  "Rover",
  "Comet",
  "Astra",
];

const LAUNCHERS = Object.freeze({
  electron: 1200,
  falcon9: 1600,
  sls: 2200,
});

const SCIENCE_PAYLOADS = Object.freeze({
  light: { mass: 70, science: 90 },
  medium: { mass: 190, science: 200 },
  heavy: { mass: 340, science: 380 },
});

const TASK_IDS = Object.freeze([
  "wires",
  "o2_filter",
  "nav",
  "cargo",
  "science",
  "cheese_grill",
  "reactor_cool",
  "shields_prime",
  "engine_align",
  "medbay_scan",
]);
const TASK_ID_SET = new Set(TASK_IDS);

const MOON_CHEESE_NODES = [
  { x: 550, y: 550 },
  { x: 1100, y: 550 },
  { x: 1650, y: 550 },
  { x: 2200, y: 550 },
  { x: 2750, y: 550 },
  { x: 800, y: 1250 },
  { x: 1600, y: 1250 },
  { x: 2400, y: 1250 },
];

const MOON_ROCK_NODES = [
  { x: 600, y: 1650 },
  { x: 1600, y: 1650 },
  { x: 2600, y: 1650 },
  { x: 2750, y: 900 },
];

const app = express();
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: ALLOWED_ORIGIN !== "*",
  }),
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));
app.use("/nasa-models", express.static(path.join(__dirname, "public", "nasa-models")));
app.use("/nasa-models", express.static(path.join(__dirname, "..", "nasa models")));
app.use("/skyfall-assets", express.static(path.join(__dirname, "..", "skyfall", "public", "assets")));
app.use("/3D-Airforce-Simulator", express.static(path.join(__dirname, "..", "3D-Airforce-Simulator")));
app.use("/space-3d", express.static(path.join(__dirname, "..", "space-3d")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: ALLOWED_ORIGIN !== "*",
  },
});

const rooms = new Map();

const now = () => Date.now();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const randomInt = (min, max) => crypto.randomInt(min, max + 1);
const pick = (items) => items[randomInt(0, items.length - 1)];
const hasHumans = (room) =>
  [...room.players.values()].some((player) => !player.isBot);

function sanitizeName(value) {
  return String(value ?? "")
    .replace(/[<>&]/g, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function sanitizeColor(value) {
  const text = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : null;
}

function normalizeRoomId(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function newRoomCode() {
  let code = "";
  do {
    code = Array.from(
      { length: 6 },
      () => ROOM_CODE_CHARS[randomInt(0, ROOM_CODE_CHARS.length - 1)],
    ).join("");
  } while (rooms.has(code));
  return code;
}

function rateLimit(socket, key, limit, windowMs = 1000) {
  const current = now();
  let bucket = socket.data.buckets.get(key);
  if (!bucket || current - bucket.startedAt >= windowMs) {
    bucket = { startedAt: current, count: 0 };
    socket.data.buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function sendError(socket, code, message) {
  socket.emit("game:error", { code, message, serverTime: now() });
}

function sendJoinError(socket, code, message) {
  socket.emit("room:join:error", { code, message, serverTime: now() });
}

function createTelemetry(
  launcher = "falcon9",
  sciencePayload = "medium",
  foodMass = 160,
  o2Mass = 150,
  fuelMass = DEFAULT_FUEL_MASS,
) {
  const payload = SCIENCE_PAYLOADS[sciencePayload] ?? SCIENCE_PAYLOADS.medium;
  return {
    launcher,
    maxMass: LAUNCHERS[launcher] ?? LAUNCHERS.falcon9,
    dryMass: 270,
    payloadMass: payload.mass,
    foodMass,
    o2Mass,
    fuelMass,
    o2: o2Mass > 0 ? 100 : 0,
    food: foodMass > 0 ? 100 : 0,
    fuel: 100,
    science: payload.science,
    marsProgress: 0,
    starving: false,
    overloaded: false,
    totalMass: 0,
    crewMass: 0,
    aliveCount: 0,
    ghostCount: 0,
    massPenalty: 1,
    hull: 100,
    autopilot: true,
    emergencyMode: null,
  };
}

function createMoon() {
  return {
    state: "orbit",
    site: "moon",
    startedAt: null,
    landedAt: null,
    endsAt: null,
    progressDelayUntil: 0,
    nodes: [],
  };
}

function createPilotSeat() {
  return {
    seatId: "pilot",
    occupantId: null,
    locked: false,
    updatedAt: now(),
    updatedBy: null,
  };
}

function createRoom(hostPlayer, roomId) {
  return {
    id: roomId,
    hostId: hostPlayer.id,
    phase: "lobby",
    scene: "ship",
    createdAt: now(),
    startedAt: null,
    endedAt: null,
    lastMeetingEndAt: 0,
    settings: {
      rocket: "falcon9",
      sciencePayload: "medium",
      foodMass: 160,
      o2Mass: 150,
      fuelMass: DEFAULT_FUEL_MASS,
    },
    telemetry: createTelemetry(),
    taskState: { progress: 0, completions: 0, byTask: {} },
    imposterIds: [],
    meeting: null,
    pilotSeat: createPilotSeat(),
    pilotThrust: { playerId: null, throttle: 0, heading: 0, updatedAt: 0 },
    moon: createMoon(),
    players: new Map(),
    order: [],
    timers: {
      meeting: null,
      landing: null,
      telemetry: null,
      bots: null,
    },
  };
}

function createPlayer(room, profile, isBot, socket) {
  const usedColors = new Set(
    [...room.players.values()].map((player) => player.color),
  );
  const available = COLORS.filter((color) => !usedColors.has(color));
  const color =
    profile.color && !usedColors.has(profile.color)
      ? profile.color
      : pick(available.length > 0 ? available : COLORS);
  const spawnIndex = room.order.length % SPAWNS.length;
  const spawn = SPAWNS[spawnIndex];
  const id = isBot
    ? `bot_${crypto.randomBytes(4).toString("hex")}`
    : socket.id;
  return {
    id,
    socketId: isBot ? null : socket.id,
    name: profile.name,
    color,
    isBot,
    isHost: false,
    isAlive: true,
    ghost: false,
    mass: CREW_MASS,
    isImposter: false,
    isPilot: false,
    x: spawn.x,
    y: spawn.y,
    direction: "right",
    d: "right",
    moving: false,
    scene: "ship",
    specialty: "crew",
    spawnIndex,
    lastMoveAt: 0,
    lastKillAt: 0,
    taskCooldowns: new Map(),
    nextTaskAt: 0,
    botWaypoint: null,
  };
}

function addPlayerToRoom(room, profile, isBot, socket) {
  const player = createPlayer(room, profile, isBot, socket);
  room.players.set(player.id, player);
  room.order.push(player.id);
  if (!room.hostId) room.hostId = player.id;
  player.isHost = room.hostId === player.id;
  recomputeTelemetry(room);
  return player;
}

function addBotToRoom(room) {
  const usedNames = new Set(
    [...room.players.values()].map((player) => player.name),
  );
  const availableNames = BOT_NAMES.filter((name) => !usedNames.has(name));
  const name =
    availableNames.length > 0
      ? pick(availableNames)
      : `Bot-${randomInt(10, 99)}`;
  return addPlayerToRoom(
    room,
    { name, color: pick(COLORS) },
    true,
    null,
  );
}

function recomputeTelemetry(room) {
  const players = [...room.players.values()];
  const alive = players.filter((player) => player.isAlive);
  const telemetry = room.telemetry;
  const totalMass =
    telemetry.dryMass +
    telemetry.payloadMass +
    telemetry.foodMass +
    telemetry.o2Mass +
    (telemetry.fuelMass ?? DEFAULT_FUEL_MASS) +
    alive.length * CREW_MASS;
  telemetry.totalMass = round(totalMass);
  telemetry.crewMass = alive.length * CREW_MASS;
  telemetry.aliveCount = alive.length;
  telemetry.ghostCount = players.length - alive.length;
  telemetry.overloaded = totalMass > telemetry.maxMass;
  telemetry.massPenalty = round(
    totalMass > telemetry.maxMass ? totalMass / telemetry.maxMass : 1,
    3,
  );
  telemetry.starving = telemetry.food <= 0;
  return telemetry;
}

function telemetryPayload(room) {
  return {
    roomId: room.id,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  };
}

function emitTelemetry(room) {
  io.to(room.id).emit("telemetry:updated", telemetryPayload(room));
}

function publicPlayer(player, revealRoles = false) {
  const result = {
    id: player.id,
    name: player.name,
    color: player.color,
    isBot: player.isBot,
    isHost: player.isHost,
    isAlive: player.isAlive,
    ghost: player.ghost,
    mass: player.ghost || !player.isAlive ? 0 : CREW_MASS,
    isPilot: player.isPilot,
    x: round(player.x),
    y: round(player.y),
    d: player.direction,
    direction: player.direction,
    moving: player.moving,
    scene: player.scene,
    specialty: player.specialty || "crew",
  };
  if (revealRoles) result.isImposter = player.isImposter;
  return result;
}

function publicRoom(room) {
  const revealRoles = room.phase === "ended";
  const players = {};
  for (const [id, player] of room.players.entries()) {
    players[id] = publicPlayer(player, revealRoles);
  }
  const meeting = room.meeting
    ? {
        id: room.meeting.id,
        callerId: room.meeting.callerId,
        startedAt: room.meeting.startedAt,
        endsAt: room.meeting.endsAt,
        votesCast: room.meeting.votes.size,
        votesRequired: [...room.players.values()].filter(
          (player) => player.isAlive,
        ).length,
        jettisons: [...room.meeting.jettisons],
      }
    : null;
  return {
    id: room.id,
    hostId: room.hostId,
    phase: room.phase,
    scene: room.scene,
    slots: MAX_SLOTS,
    settings: { ...room.settings },
    players,
    playerList: Object.values(players),
    telemetry: { ...room.telemetry },
    tasks: {
      progress: room.taskState.progress,
      completions: room.taskState.completions,
      byTask: { ...room.taskState.byTask },
    },
    pilotSeat: { ...room.pilotSeat },
    pilotThrust: { ...room.pilotThrust },
    moon: {
      ...room.moon,
      nodes: room.moon.nodes.map((node) => ({ ...node })),
    },
    meeting,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    lastMeetingEndAt: room.lastMeetingEndAt,
  };
}

function snapshots(room) {
  return {
    roomId: room.id,
    room: publicRoom(room),
  };
}

function roomSummary(room) {
  const players = [...room.players.values()];
  const humans = players.filter((player) => !player.isBot);
  return {
    id: room.id,
    hostId: room.hostId,
    hostName: room.players.get(room.hostId)?.name ?? "Unknown",
    humans: humans.length,
    bots: players.length - humans.length,
    players: players.length,
    slots: MAX_SLOTS,
    phase: room.phase,
    started: room.phase !== "lobby",
  };
}

function broadcastRooms() {
  io.emit("rooms:updated", [...rooms.values()].map(roomSummary));
}

function roomBroadcast(room) {
  io.to(room.id).emit("room:updated", publicRoom(room));
}

function stopRoomTimers(room) {
  if (room.timers.meeting) {
    clearTimeout(room.timers.meeting);
    room.timers.meeting = null;
  }
  if (room.timers.landing) {
    clearTimeout(room.timers.landing);
    room.timers.landing = null;
  }
  if (room.timers.telemetry) {
    clearInterval(room.timers.telemetry);
    room.timers.telemetry = null;
  }
  if (room.timers.bots) {
    clearInterval(room.timers.bots);
    room.timers.bots = null;
  }
  if (room.meeting) {
    for (const timer of room.meeting.botTimers) clearTimeout(timer);
    room.meeting.botTimers.clear();
  }
}

function deleteRoom(room) {
  stopRoomTimers(room);
  rooms.delete(room.id);
  io.emit("room:deleted", { roomId: room.id });
  broadcastRooms();
}

function assignHost(room) {
  const nextId = room.order.find((id) => {
    const player = room.players.get(id);
    return player && !player.isBot;
  });
  room.hostId = nextId ?? null;
  for (const player of room.players.values()) {
    player.isHost = player.id === room.hostId;
  }
}

function releasePilotSeat(room, actorId, reason, broadcast = true) {
  const seat = room.pilotSeat;
  if (!seat.occupantId && !seat.locked) return;
  const occupant = room.players.get(seat.occupantId);
  if (occupant) occupant.isPilot = false;
  room.pilotSeat = {
    seatId: seat.seatId,
    occupantId: null,
    locked: false,
    updatedAt: now(),
    updatedBy: actorId,
  };
  room.pilotThrust = {
    playerId: null,
    throttle: 0,
    heading: 0,
    updatedAt: now(),
  };
  if (broadcast) {
    io.to(room.id).emit("pilot:seat:unlocked", {
      roomId: room.id,
      seatId: seat.seatId,
      occupantId: null,
      locked: false,
      reason,
      by: actorId,
      serverTime: now(),
    });
  }
}

function leaveRoom(socket, reason = "leave") {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  const player = room?.players.get(socket.id);
  socket.data.roomId = null;
  if (room) socket.leave(room.id);
  if (!room || !player) return;
  room.players.delete(player.id);
  room.order = room.order.filter((id) => id !== player.id);
  if (player.isPilot) {
    releasePilotSeat(room, player.id, "left", false);
  }
  if (room.meeting) room.meeting.votes.delete(player.id);
  if (room.hostId === player.id) assignHost(room);
  recomputeTelemetry(room);
  io.to(room.id).emit("player:left", {
    roomId: room.id,
    playerId: player.id,
    reason,
    serverTime: now(),
  });
  if (!hasHumans(room)) {
    deleteRoom(room);
    return;
  }
  roomBroadcast(room);
  emitTelemetry(room);
  broadcastRooms();
  if (room.phase === "playing") {
    const win = computeWin(room);
    if (win) endGame(room, win.winner, win.reason);
  } else if (room.phase === "meeting") {
    maybeResolveMeeting(room);
  }
}

function endGame(room, winner, reason) {
  if (room.phase === "ended") return;
  room.phase = "ended";
  room.endedAt = now();
  stopRoomTimers(room);
  room.meeting = null;
  releasePilotSeat(room, "system", "game-end", false);
  recomputeTelemetry(room);
  io.to(room.id).emit("game:ended", {
    roomId: room.id,
    winner,
    isImposter: winner === "imposters",
    reason,
    telemetry: { ...room.telemetry },
    players: publicRoom(room).players,
    tasks: {
      progress: room.taskState.progress,
      completions: room.taskState.completions,
      byTask: { ...room.taskState.byTask },
    },
    moon: {
      ...room.moon,
      nodes: room.moon.nodes.map((node) => ({ ...node })),
    },
    endedAt: room.endedAt,
    serverTime: now(),
  });
  roomBroadcast(room);
  broadcastRooms();
}

function checkEmergencyState(room) {
  const telemetry = room.telemetry;
  const current = now();

  // Identify any zeroed out resource
  let emergencyType = null;
  if (telemetry.o2 <= 0) emergencyType = "o2";
  else if (telemetry.fuel <= 0) emergencyType = "fuel";
  else if (telemetry.hull <= 0) emergencyType = "hull";

  if (emergencyType) {
    if (!telemetry.emergencyMode) {
      // ENTER EMERGENCY RESERVE MODE!
      telemetry.emergencyMode = {
        type: emergencyType,
        startedAt: current,
        endsAt: current + 60000, // 60 seconds grace period
        duration: 60,
      };

      io.to(room.id).emit("emergency:started", {
        roomId: room.id,
        type: emergencyType,
        endsAt: telemetry.emergencyMode.endsAt,
        duration: 60,
        serverTime: current,
      });

      io.to(room.id).emit("game:notif", {
        message: `⚠️ EMERGENCY RESERVE ENGAGED: 60s TO RESTORE ${emergencyType.toUpperCase()}!`,
        level: "critical",
      });
    } else {
      // Check if 60s grace countdown has expired
      if (current >= telemetry.emergencyMode.endsAt) {
        return { winner: "lost", reason: `emergency-${emergencyType}-depleted` };
      }
    }
  } else {
    // If the resource was restored above 0, CANCEL EMERGENCY MODE!
    if (telemetry.emergencyMode) {
      const recoveredType = telemetry.emergencyMode.type;
      telemetry.emergencyMode = null;

      io.to(room.id).emit("emergency:cleared", {
        roomId: room.id,
        recoveredType: recoveredType,
        serverTime: current,
      });

      io.to(room.id).emit("game:notif", {
        message: `🎉 CLUTCH SAVE! ${recoveredType.toUpperCase()} RESTORED TO SAFE LEVELS!`,
        level: "success",
      });
    }
  }
  return null;
}

function computeWin(room) {
  if (!room.startedAt || room.phase === "ended") return null;
  const alive = [...room.players.values()].filter((player) => player.isAlive);

  // Check emergency reserve expiry
  const emergencyLoss = checkEmergencyState(room);
  if (emergencyLoss) return emergencyLoss;

  // Pure co-op: No imposters! Only check if all crew perished
  if (alive.length === 0) {
    return { winner: "lost", reason: "all-crew-lost" };
  }
  return null;
}

function applyTask(room, player, taskId, byBot = false) {
  if (room.phase !== "playing") return false;
  if (!player || !player.isAlive || !TASK_ID_SET.has(taskId)) return false;
  const current = now();
  const last = player.taskCooldowns.get(taskId) ?? 0;
  if (current - last < TASK_COOLDOWN_MS) return false;
  player.taskCooldowns.set(taskId, current);
  const telemetry = room.telemetry;
  if (taskId === "wires") {
    telemetry.fuel = clamp(telemetry.fuel + 15, 0, 100);
  } else if (taskId === "o2_filter") {
    telemetry.o2 = clamp(telemetry.o2 + 20, 0, 100);
  } else if (taskId === "nav") {
    telemetry.marsProgress = clamp(telemetry.marsProgress + 8, 0, 100);
    telemetry.autopilot = true;
  } else if (taskId === "cargo") {
    telemetry.hull = clamp((telemetry.hull ?? 100) + 20, 0, 100);
    telemetry.payloadMass = Math.max(0, telemetry.payloadMass - 15);
  } else if (taskId === "science") {
    telemetry.science += 30;
  } else if (taskId === "cheese_grill") {
    telemetry.food = clamp(telemetry.food + 18, 0, 100);
    telemetry.starving = false;
  } else if (taskId === "reactor_cool") {
    telemetry.fuel = clamp(telemetry.fuel + 18, 0, 100);
  } else if (taskId === "shields_prime") {
    telemetry.hull = clamp((telemetry.hull ?? 100) + 22, 0, 100);
  } else if (taskId === "engine_align") {
    telemetry.marsProgress = clamp(telemetry.marsProgress + 10, 0, 100);
    telemetry.fuel = clamp(telemetry.fuel + 6, 0, 100);
  } else if (taskId === "medbay_scan") {
    telemetry.o2 = clamp(telemetry.o2 + 15, 0, 100);
    telemetry.science += 25;
  }
  room.taskState.progress = Math.min(100, room.taskState.progress + 10);
  room.taskState.completions += 1;
  room.taskState.byTask[taskId] = (room.taskState.byTask[taskId] ?? 0) + 1;
  recomputeTelemetry(room);
  io.to(room.id).emit("task:updated", {
    roomId: room.id,
    taskId,
    playerId: player.id,
    byBot,
    tasks: {
      progress: room.taskState.progress,
      completions: room.taskState.completions,
      byTask: { ...room.taskState.byTask },
    },
    telemetry: { ...room.telemetry },
    serverTime: current,
  });
  emitTelemetry(room);
  const win = computeWin(room);
  if (win) endGame(room, win.winner, win.reason);
  return true;
}

function killPlayer(room, killer, target, byBot = false) {
  if (room.phase !== "playing") return false;
  if (!killer || !target || !killer.isAlive || !target.isAlive) return false;
  if (!killer.isImposter || target.isImposter) return false;
  if (killer.id === target.id) return false;
  if (killer.scene !== target.scene) return false;
  const distance = Math.hypot(killer.x - target.x, killer.y - target.y);
  if (distance > KILL_RADIUS) return false;
  const current = now();
  if (current - (killer.lastKillAt ?? 0) < KILL_COOLDOWN_MS) return false;
  killer.lastKillAt = current;
  target.isAlive = false;
  target.ghost = true;
  target.mass = 0;
  if (target.isPilot) releasePilotSeat(room, target.id, "killed", false);
  recomputeTelemetry(room);
  io.to(room.id).emit("player:killed", {
    roomId: room.id,
    playerId: target.id,
    killerId: killer.id,
    x: round(target.x),
    y: round(target.y),
    color: target.color,
    ghost: true,
    mass: 0,
    byBot,
    serverTime: current,
  });
  emitTelemetry(room);
  roomBroadcast(room);
  const win = computeWin(room);
  if (win) endGame(room, win.winner, win.reason);
  return true;
}

function teleportToSpawns(room) {
  for (const player of room.players.values()) {
    const spawn = SPAWNS[player.spawnIndex % SPAWNS.length];
    player.x = spawn.x;
    player.y = spawn.y;
    player.direction = "right";
    player.d = "right";
    player.moving = false;
    player.scene = room.scene;
    player.lastMoveAt = now();
    io.to(room.id).emit("player:moved", {
      roomId: room.id,
      id: player.id,
      playerId: player.id,
      x: player.x,
      y: player.y,
      d: player.direction,
      direction: player.direction,
      moving: false,
      ghost: player.ghost,
      scene: room.scene,
      seq: 0,
      serverTime: now(),
    });
  }
}

function telemetryTick(room) {
  if (room.phase !== "playing") return;
  const telemetry = room.telemetry;
  recomputeTelemetry(room);
  const aliveCount = Math.max(0, telemetry.aliveCount);
  const penalty = Math.max(1, telemetry.massPenalty);
  const massFactor = Math.max(0.5, telemetry.totalMass / telemetry.maxMass);
  const moonFactor =
    room.moon.state === "orbit"
      ? 1
      : now() < room.moon.progressDelayUntil
        ? 0.15
        : 0.35;
  const o2Drain = 0.015 * aliveCount;
  const foodDrain = 0.015 * aliveCount;
  const fuelDrain = 0.08 * penalty;

  telemetry.o2 = clamp(telemetry.o2 - o2Drain, 0, 100);
  telemetry.food = clamp(telemetry.food - foodDrain, 0, 100);
  telemetry.fuel = clamp(telemetry.fuel - fuelDrain, 0, 100);
  telemetry.starving = telemetry.food <= 0;

  // Progressive Hull Wear if unmaintained or overloaded
  if (telemetry.overloaded) {
    telemetry.hull = clamp(telemetry.hull - 0.05 * penalty, 0, 100);
  }

  // Asteroid Field Encounter cycle: every ~75-85 seconds
  if (!room.nextAsteroidWaveAt) {
    room.nextAsteroidWaveAt = now() + 75000;
  }
  if (now() >= room.nextAsteroidWaveAt && telemetry.autopilot && room.moon.state === "orbit") {
    telemetry.autopilot = false;
    room.nextAsteroidWaveAt = now() + 85000;
    io.to(room.id).emit("cockpit:asteroid:alert", {
      roomId: room.id,
      serverTime: now(),
    });
    io.to(room.id).emit("game:notif", {
      message: "⚠️ ASTEROID FIELD DETECTED! AUTOPILOT OFFLINE — PILOT TO COCKPIT (PRESS P)!",
      level: "critical",
    });
  }

  // If autopilot is disengaged and no one is piloting, asteroids damage hull every 4s
  if (!telemetry.autopilot && !room.pilotSeat.occupantId) {
    if (!room.lastAsteroidDamageAt || now() - room.lastAsteroidDamageAt > 4000) {
      room.lastAsteroidDamageAt = now();
      telemetry.hull = Math.max(0, telemetry.hull - 5);
      io.to(room.id).emit("game:notif", {
        message: "💥 UNPILOTED SHIP STRUCK BY ASTEROIDS! -5% HULL!",
        level: "critical",
      });
    }
  }
  let progressGain = (1.4 / penalty) * moonFactor;
  const thrust = room.pilotThrust;
  const pilotId = room.pilotSeat.occupantId;
  const pilot = pilotId ? room.players.get(pilotId) : null;
  if (
    thrust &&
    pilot &&
    pilot.isAlive &&
    pilot.isPilot &&
    thrust.playerId === pilot.id &&
    thrust.throttle > 0 &&
    room.moon.state === "orbit"
  ) {
    const headingFactor = Math.max(
      0,
      Math.cos((thrust.heading * Math.PI) / 180),
    );
    const burn = thrust.throttle * 0.9 * massFactor;
    telemetry.fuel = clamp(telemetry.fuel - burn, 0, 100);
    progressGain += (thrust.throttle * 1.6 * headingFactor) / massFactor;
  }
  telemetry.marsProgress = clamp(
    telemetry.marsProgress + progressGain,
    0,
    100,
  );
  if (telemetry.marsProgress >= 100 && !room.marsArrived) {
    room.marsArrived = true;
    telemetry.marsArrived = true;
    io.to(room.id).emit("mars:arrived", {
      message: "🪐 The spacecraft has arrived safely in Mars orbit! You can continue tasks and free flight!",
      telemetry: room.telemetry,
    });
  }
  recomputeTelemetry(room);
  emitTelemetry(room);
  const win = computeWin(room);
  if (win) endGame(room, win.winner, win.reason);
}

function botsTick(room) {
  if (room.phase !== "playing") return;
  const current = now();
  const delta = BOT_TICK_MS / 1000;
  for (const bot of [...room.players.values()]) {
    if (!bot.isBot) continue;
    if (room.phase !== "playing") return;
    const speed = bot.ghost
      ? MAX_SPEED
      : room.telemetry.starving
        ? BOT_SPEED * 0.6
        : BOT_SPEED;
    if (
      !bot.botWaypoint ||
      current > bot.botWaypoint.until ||
      Math.hypot(bot.botWaypoint.x - bot.x, bot.botWaypoint.y - bot.y) < 20
    ) {
      bot.botWaypoint = {
        x: randomInt(350, 2850),
        y: randomInt(350, 1650),
        until: current + randomInt(3000, 8000),
      };
    }
    const dx = bot.botWaypoint.x - bot.x;
    const dy = bot.botWaypoint.y - bot.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 1) {
      const step = Math.min(distance, speed * delta);
      bot.x = clamp(bot.x + (dx / distance) * step, WORLD.minX, WORLD.maxX);
      bot.y = clamp(bot.y + (dy / distance) * step, WORLD.minY, WORLD.maxY);
      bot.direction = dx < 0 ? "left" : "right";
      bot.d = bot.direction;
      bot.moving = true;
      bot.scene = room.scene;
      bot.lastMoveAt = current;
      io.to(room.id).emit("player:moved", {
        roomId: room.id,
        id: bot.id,
        playerId: bot.id,
        x: round(bot.x),
        y: round(bot.y),
        d: bot.direction,
        direction: bot.direction,
        moving: true,
        ghost: bot.ghost,
        scene: room.scene,
        seq: 0,
        serverTime: current,
      });
    } else {
      bot.moving = false;
    }
    if (bot.isAlive && current >= bot.nextTaskAt) {
      applyTask(room, bot, pick(TASK_IDS), true);
      bot.nextTaskAt = current + randomInt(8000, 18000);
      if (room.phase !== "playing") return;
    }
    if (bot.isAlive && bot.isImposter) {
      let target = null;
      let best = KILL_RADIUS;
      for (const player of room.players.values()) {
        if (
          player.id === bot.id ||
          !player.isAlive ||
          player.isImposter ||
          player.scene !== bot.scene
        ) {
          continue;
        }
        const distanceToTarget = Math.hypot(
          bot.x - player.x,
          bot.y - player.y,
        );
        if (distanceToTarget <= best) {
          best = distanceToTarget;
          target = player;
        }
      }
      if (target && current - (bot.lastKillAt ?? 0) >= KILL_COOLDOWN_MS) {
        killPlayer(room, bot, target, true);
        if (room.phase !== "playing") return;
      }
    }
  }
}

function startRoomTimers(room) {
  stopRoomTimers(room);
  room.timers.telemetry = setInterval(
    () => telemetryTick(room),
    TELEMETRY_TICK_MS,
  );
  room.timers.bots = setInterval(() => botsTick(room), BOT_TICK_MS);
}

function scheduleBotVotes(room, meeting) {
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.isAlive) continue;
    const delay = randomInt(1200, 4500);
    const timer = setTimeout(() => {
      if (
        room.phase !== "meeting" ||
        room.meeting !== meeting ||
        meeting.resolved ||
        !bot.isAlive
      ) {
        return;
      }
      const alive = [...room.players.values()].filter(
        (player) => player.isAlive,
      );
      let targetId = null;
      if (Math.random() > 0.2) {
        const candidates = bot.isImposter
          ? alive.filter((player) => !player.isImposter)
          : alive.filter((player) => player.id !== bot.id);
        if (candidates.length > 0) targetId = pick(candidates).id;
      }
      castVote(room, bot, targetId, true);
    }, delay);
    meeting.botTimers.add(timer);
  }
}

function castVote(room, voter, targetId, byBot = false) {
  const meeting = room.meeting;
  if (room.phase !== "meeting" || !meeting || meeting.resolved) return false;
  if (!voter || !voter.isAlive) return false;
  let normalizedTarget = null;
  if (targetId !== null && targetId !== undefined && targetId !== "") {
    const target = room.players.get(String(targetId));
    if (!target || !target.isAlive) return false;
    normalizedTarget = target.id;
  }
  meeting.votes.set(voter.id, normalizedTarget);
  const alive = [...room.players.values()].filter((player) => player.isAlive);
  const votesCast = alive.filter((player) =>
    meeting.votes.has(player.id),
  ).length;
  io.to(room.id).emit("meeting:voted", {
    roomId: room.id,
    meetingId: meeting.id,
    callerId: voter.id,
    voterId: voter.id,
    votedForId: normalizedTarget,
    targetId: normalizedTarget,
    byBot,
    votesCast,
    votesRequired: alive.length,
    serverTime: now(),
  });
  if (votesCast >= alive.length) resolveMeeting(room, "all-voted");
  return true;
}

function maybeResolveMeeting(room) {
  if (room.phase !== "meeting" || !room.meeting || room.meeting.resolved) {
    return;
  }
  const meeting = room.meeting;
  const alive = [...room.players.values()].filter((player) => player.isAlive);
  if (alive.every((player) => meeting.votes.has(player.id))) {
    resolveMeeting(room, "all-voted");
  }
}

function resolveMeeting(room, forcedBy = null) {
  const meeting = room.meeting;
  if (!meeting || meeting.resolved) return;
  meeting.resolved = true;
  if (room.timers.meeting) {
    clearTimeout(room.timers.meeting);
    room.timers.meeting = null;
  }
  for (const timer of meeting.botTimers) clearTimeout(timer);
  meeting.botTimers.clear();
  const counts = {};
  let skipCount = 0;
  let validVotes = 0;
  for (const [voterId, targetId] of meeting.votes.entries()) {
    const voter = room.players.get(voterId);
    if (!voter || !voter.isAlive) continue;
    validVotes += 1;
    if (targetId === null) {
      skipCount += 1;
    } else {
      const target = room.players.get(targetId);
      if (target && target.isAlive) {
        counts[targetId] = (counts[targetId] ?? 0) + 1;
      } else {
        skipCount += 1;
      }
    }
  }
  let max = 0;
  for (const count of Object.values(counts)) {
    if (count > max) max = count;
  }
  if (skipCount > max) max = skipCount;
  const winners = [];
  for (const [playerId, count] of Object.entries(counts)) {
    if (count === max && max > 0) winners.push(playerId);
  }
  if (skipCount === max && max > 0) winners.push("skip");
  let ejectedId = null;
  let tie = false;
  let skipped = false;
  if (winners.length === 1) {
    if (winners[0] === "skip") {
      skipped = true;
    } else {
      ejectedId = winners[0];
    }
  } else if (winners.length > 1) {
    tie = true;
  } else {
    skipped = true;
  }
  let ejectedPlayer = null;
  if (ejectedId) {
    ejectedPlayer = room.players.get(ejectedId) ?? null;
    if (ejectedPlayer) {
      ejectedPlayer.isAlive = false;
      ejectedPlayer.ghost = true;
      ejectedPlayer.mass = 0;
      if (ejectedPlayer.isPilot) {
        releasePilotSeat(room, ejectedPlayer.id, "ejected", false);
      }
      io.to(room.id).emit("player:ejected", {
        roomId: room.id,
        playerId: ejectedPlayer.id,
        ghost: true,
        mass: 0,
        serverTime: now(),
      });
    }
  }
  const results = {
    ejectedId,
    ejectedPlayer: ejectedPlayer
      ? publicPlayer(ejectedPlayer, true)
      : null,
    tie,
    skipped,
    noVotes: validVotes === 0,
    counts,
    skipCount,
    votes: Object.fromEntries(meeting.votes),
    forcedBy,
  };
  room.meeting = null;
  room.phase = "playing";
  room.lastMeetingEndAt = now();
  recomputeTelemetry(room);
  io.to(room.id).emit("meeting:ended", {
    roomId: room.id,
    meetingId: meeting.id,
    results,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  });
  const win = computeWin(room);
  if (win) {
    endGame(room, win.winner, win.reason);
    return;
  }
  teleportToSpawns(room);
  roomBroadcast(room);
  emitTelemetry(room);
}

function cancelLandingForMeeting(room) {
  if (room.moon.state !== "descending" && room.moon.state !== "ascending") {
    return;
  }
  if (room.timers.landing) {
    clearTimeout(room.timers.landing);
    room.timers.landing = null;
  }
  room.moon.state = "orbit";
  room.moon.startedAt = null;
  room.moon.endsAt = null;
  room.scene = "ship";
  io.to(room.id).emit("moon:state", {
    roomId: room.id,
    moon: { ...room.moon },
    scene: room.scene,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  });
}

function createMoonNodes() {
  const nodes = [];
  MOON_CHEESE_NODES.forEach((node, index) => {
    nodes.push({
      id: `cheese-${index + 1}`,
      type: "cheese",
      x: node.x,
      y: node.y,
      collected: false,
      collectedBy: null,
      collectedAt: null,
    });
  });
  MOON_ROCK_NODES.forEach((node, index) => {
    nodes.push({
      id: `rock-${index + 1}`,
      type: "rock",
      x: node.x,
      y: node.y,
      collected: false,
      collectedBy: null,
      collectedAt: null,
    });
  });
  return nodes;
}

function finishMoonLanding(room) {
  if (room.phase !== "playing" || room.moon.state !== "descending") return;
  room.moon.state = "landed";
  room.moon.landedAt = now();
  room.moon.endsAt = null;
  room.moon.progressDelayUntil = now() + MOON_PROGRESS_DELAY_MS;
  room.scene = "moon";
  room.moon.nodes = createMoonNodes();
  for (const player of room.players.values()) player.scene = "moon";
  recomputeTelemetry(room);
  io.to(room.id).emit("moon:state", {
    roomId: room.id,
    moon: { ...room.moon, nodes: room.moon.nodes.map((node) => ({ ...node })) },
    scene: room.scene,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  });
  io.to(room.id).emit("moon:nodes", {
    roomId: room.id,
    nodes: room.moon.nodes.map((node) => ({ ...node })),
    serverTime: now(),
  });
  emitTelemetry(room);
  roomBroadcast(room);
}

function finishMoonDepart(room) {
  if (room.phase !== "playing" || room.moon.state !== "ascending") return;
  room.moon.state = "orbit";
  room.moon.startedAt = null;
  room.moon.endsAt = null;
  room.scene = "ship";
  for (const player of room.players.values()) player.scene = "ship";
  io.to(room.id).emit("moon:state", {
    roomId: room.id,
    moon: { ...room.moon, nodes: room.moon.nodes.map((node) => ({ ...node })) },
    scene: room.scene,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  });
  roomBroadcast(room);
}

function moonPayload(room) {
  return {
    roomId: room.id,
    moon: {
      ...room.moon,
      nodes: room.moon.nodes.map((node) => ({ ...node })),
    },
    scene: room.scene,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  };
}

function applyCargoJettison(room, player, type) {
  if (room.phase !== "meeting" || !room.meeting) return false;
  if (!player || !player.isAlive) return false;
  if (type !== "food" && type !== "payload") return false;
  if (room.meeting.jettisons.has(type)) return false;
  room.meeting.jettisons.add(type);
  const telemetry = room.telemetry;
  if (type === "food") {
    telemetry.foodMass = Math.max(0, telemetry.foodMass - 75);
    telemetry.food = 0;
    telemetry.starving = true;
  } else {
    telemetry.payloadMass = Math.max(0, telemetry.payloadMass - 75);
  }
  recomputeTelemetry(room);
  io.to(room.id).emit("cargo:jettisoned", {
    roomId: room.id,
    playerId: player.id,
    type,
    amount: 75,
    telemetry: { ...room.telemetry },
    serverTime: now(),
  });
  emitTelemetry(room);
  roomBroadcast(room);
  return true;
}

function connectSocket(socket) {
  socket.data.buckets = new Map();
  socket.data.roomId = null;
  socket.emit("server:ready", {
    socketId: socket.id,
    maxSlots: MAX_SLOTS,
    serverTime: now(),
  });

  const handle = (event, callback) => {
    socket.on(event, (...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Socket event failed: ${event}`, error);
        sendError(socket, "internal_error", "The server could not process that action.");
      }
    });
  };

  handle("player:register", (data) => {
    if (!rateLimit(socket, "register", 10)) return;
    const name = sanitizeName(data?.name);
    if (!name) {
      sendError(socket, "invalid_name", "A player name is required.");
      return;
    }
    const color = sanitizeColor(data?.color) ?? pick(COLORS);
    socket.data.profile = { id: socket.id, name, color };
    if (socket.data.roomId) {
      const room = rooms.get(socket.data.roomId);
      const player = room?.players.get(socket.id);
      if (room && player) {
        player.name = name;
        player.color = color;
        roomBroadcast(room);
      }
    }
    socket.emit("player:registered", {
      playerId: socket.id,
      name,
      color,
      serverTime: now(),
    });
  });

  handle("player:unregister", () => {
    leaveRoom(socket, "unregister");
    socket.data.profile = null;
    socket.emit("player:unregistered");
  });

  handle("player:specialty", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "lobby") {
      sendError(socket, "invalid_phase", "Specialties can only be changed before launch.");
      return;
    }
    const specialty = String(data?.specialty ?? "");
    if (!CREW_SPECIALTIES.has(specialty)) {
      sendError(socket, "invalid_specialty", "Unknown crew specialty.");
      return;
    }
    player.specialty = specialty;
    io.to(room.id).emit("player:specialty", {
      roomId: room.id,
      playerId: player.id,
      player: publicPlayer(player),
      specialty,
      serverTime: now(),
    });
    roomBroadcast(room);
  });

  handle("player:disconnect", () => {
    leaveRoom(socket, "player-disconnect");
  });

  handle("room:create", (data) => {
    const profile = socket.data.profile;
    if (!profile) {
      sendError(socket, "not_registered", "Register before creating a room.");
      return;
    }
    if (!rateLimit(socket, "room-create", 5)) return;
    leaveRoom(socket, "create-room");
    const requested = normalizeRoomId(data?.roomId);
    const roomId =
      requested.length >= 4 && requested.length <= 8
        ? requested
        : newRoomCode();
    if (rooms.has(roomId)) {
      sendError(socket, "room_exists", "That room code is already in use.");
      return;
    }
    const room = createRoom({ id: socket.id }, roomId);
    rooms.set(room.id, room);
    const player = addPlayerToRoom(room, profile, false, socket);
    room.hostId = player.id;
    player.isHost = true;
    socket.data.roomId = room.id;
    socket.join(room.id);
    recomputeTelemetry(room);
    io.emit("room:created", {
      roomId: room.id,
      room: publicRoom(room),
      serverTime: now(),
    });
    socket.emit("room:joined", {
      roomId: room.id,
      room: publicRoom(room),
      player: publicPlayer(player),
      started: false,
      you: player.id,
      serverTime: now(),
    });
    socket.emit("state:snapshot", snapshots(room));
    broadcastRooms();
  });

  handle("room:join", (data) => {
    const profile = socket.data.profile;
    if (!profile) {
      sendJoinError(socket, "not_registered", "Register before joining a room.");
      return;
    }
    if (!rateLimit(socket, "room-join", 10)) return;
    const roomId = normalizeRoomId(data?.roomId);
    const room = rooms.get(roomId);
    if (!room) {
      sendJoinError(socket, "room_not_found", "Room not found.");
      return;
    }
    if (socket.data.roomId === roomId) {
      const player = room.players.get(socket.id);
      socket.emit("room:joined", {
        roomId,
        room: publicRoom(room),
        player: player ? publicPlayer(player) : null,
        started: room.phase !== "lobby",
        you: socket.id,
        serverTime: now(),
      });
      return;
    }
    if (room.phase !== "lobby") {
      sendJoinError(socket, "game_started", "That game has already started.");
      return;
    }
    if (room.players.size >= MAX_SLOTS) {
      sendJoinError(socket, "room_full", "That room is full.");
      return;
    }
    leaveRoom(socket, "join-room");
    const player = addPlayerToRoom(room, profile, false, socket);
    socket.data.roomId = room.id;
    socket.join(room.id);
    socket.emit("room:joined", {
      roomId: room.id,
      room: publicRoom(room),
      player: publicPlayer(player),
      started: false,
      you: player.id,
      serverTime: now(),
    });
    socket.to(room.id).emit("player:joined", {
      roomId: room.id,
      player: publicPlayer(player),
      serverTime: now(),
    });
    socket.emit("state:snapshot", snapshots(room));
    roomBroadcast(room);
    emitTelemetry(room);
    broadcastRooms();
  });

  handle("room:leave", () => {
    leaveRoom(socket, "leave-room");
    socket.emit("room:left", { serverTime: now() });
  });

  handle("room:add-bot", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "lobby") {
      sendError(socket, "invalid_phase", "Bots can only be added in the lobby.");
      return;
    }
    if (room.hostId !== socket.id) {
      sendError(socket, "not_host", "Only the host can add bots.");
      return;
    }
    if (room.players.size >= MAX_SLOTS) {
      sendError(socket, "room_full", "The room already has six slots filled.");
      return;
    }
    const bot = addBotToRoom(room);
    io.to(room.id).emit("player:joined", {
      roomId: room.id,
      player: publicPlayer(bot),
      serverTime: now(),
    });
    roomBroadcast(room);
    emitTelemetry(room);
    broadcastRooms();
  });

  handle("room:remove-bot", (data) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "lobby") {
      sendError(socket, "invalid_phase", "Bots can only be removed in the lobby.");
      return;
    }
    if (room.hostId !== socket.id) {
      sendError(socket, "not_host", "Only the host can remove bots.");
      return;
    }
    const botId = String(data?.botId ?? data?.playerId ?? "");
    const bot = room.players.get(botId);
    if (!bot || !bot.isBot) {
      sendError(socket, "bot_not_found", "That bot is not in this room.");
      return;
    }
    room.players.delete(bot.id);
    room.order = room.order.filter((id) => id !== bot.id);
    recomputeTelemetry(room);
    io.to(room.id).emit("player:left", {
      roomId: room.id,
      playerId: bot.id,
      reason: "bot-removed",
      serverTime: now(),
    });
    roomBroadcast(room);
    emitTelemetry(room);
    broadcastRooms();
  });

  handle("mission:configure", (data) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const player = room.players.get(socket.id);
    if (!player) {
      sendError(socket, "not_in_room", "You are not in this room.");
      return;
    }
    if (room.phase !== "lobby") {
      sendError(socket, "invalid_phase", "The mission can only be configured before launch.");
      return;
    }
    const rocket = String(data?.rocket ?? data?.launcher ?? room.settings.rocket);
    const sciencePayload = String(
      data?.sciencePayload ?? room.settings.sciencePayload,
    );
    const foodMass = Number(data?.foodMass ?? room.settings.foodMass);
    const o2Mass = Number(data?.o2Mass ?? room.settings.o2Mass);
    const fuelMass = Number(data?.fuelMass ?? room.settings.fuelMass);
    if (!Object.hasOwn(LAUNCHERS, rocket)) {
      sendError(socket, "invalid_rocket", "Unknown launcher.");
      return;
    }
    if (!Object.hasOwn(SCIENCE_PAYLOADS, sciencePayload)) {
      sendError(socket, "invalid_payload", "Unknown science payload.");
      return;
    }
    if (!Number.isFinite(foodMass) || foodMass < 0 || foodMass > 500) {
      sendError(socket, "invalid_food_mass", "Food mass must be between 0 and 500 kg.");
      return;
    }
    if (!Number.isFinite(o2Mass) || o2Mass < 0 || o2Mass > 500) {
      sendError(socket, "invalid_o2_mass", "O2 mass must be between 0 and 500 kg.");
      return;
    }
    if (!Number.isFinite(fuelMass) || fuelMass < FUEL_MASS_MIN || fuelMass > FUEL_MASS_MAX) {
      sendError(
        socket,
        "invalid_fuel_mass",
        `Fuel reserve must be between ${FUEL_MASS_MIN} and ${FUEL_MASS_MAX} kg.`,
      );
      return;
    }
    room.settings.rocket = rocket;
    room.settings.sciencePayload = sciencePayload;
    room.settings.foodMass = foodMass;
    room.settings.o2Mass = o2Mass;
    room.settings.fuelMass = fuelMass;
    const payload = SCIENCE_PAYLOADS[sciencePayload];
    room.telemetry.launcher = rocket;
    room.telemetry.maxMass = LAUNCHERS[rocket];
    room.telemetry.payloadMass = payload.mass;
    room.telemetry.foodMass = foodMass;
    room.telemetry.o2Mass = o2Mass;
    room.telemetry.fuelMass = fuelMass;
    room.telemetry.food = foodMass > 0 ? 100 : 0;
    room.telemetry.o2 = o2Mass > 0 ? 100 : 0;
    room.telemetry.science = payload.science;
    recomputeTelemetry(room);
    io.to(room.id).emit("mission:configured", {
      roomId: room.id,
      settings: { ...room.settings },
      telemetry: { ...room.telemetry },
      by: player.id,
      byName: player.name,
      serverTime: now(),
    });
    emitTelemetry(room);
    roomBroadcast(room);
    broadcastRooms();
  });

  handle("game:start", (data) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.hostId !== socket.id) {
      sendError(socket, "not_host", "Only the host can start the game.");
      return;
    }
    if (room.phase !== "lobby") {
      sendError(socket, "invalid_phase", "The game has already started.");
      return;
    }
    if (data?.fillBots === true) {
      while (room.players.size < MAX_SLOTS) addBotToRoom(room);
    }
    if (room.players.size < 1) {
      sendError(socket, "not_enough_players", "At least one player is required.");
      return;
    }
    const startedAt = now();
    room.phase = "playing";
    room.startedAt = startedAt;
    room.endedAt = null;
    room.lastMeetingEndAt = 0;
    room.meeting = null;
    room.scene = "ship";
    room.moon = createMoon();
    room.pilotSeat = createPilotSeat();
    room.pilotThrust = {
      playerId: null,
      throttle: 0,
      heading: 0,
      updatedAt: startedAt,
    };
    room.taskState = { progress: 0, completions: 0, byTask: {} };
    for (const player of room.players.values()) {
      const spawn = SPAWNS[player.spawnIndex % SPAWNS.length];
      player.isAlive = true;
      player.ghost = false;
      player.mass = CREW_MASS;
      player.isImposter = false;
      player.role = "crewmate";
      player.isPilot = false;
      player.isHost = player.id === room.hostId;
      player.x = spawn.x;
      player.y = spawn.y;
      player.direction = "right";
      player.d = "right";
      player.moving = false;
      player.scene = "ship";
      player.lastMoveAt = startedAt;
      player.lastKillAt = startedAt;
      player.taskCooldowns.clear();
      player.nextTaskAt = startedAt + randomInt(8000, 18000);
      player.botWaypoint = null;
    }
    const payload = SCIENCE_PAYLOADS[room.settings.sciencePayload];
    room.telemetry.payloadMass = payload.mass;
    room.telemetry.foodMass = room.settings.foodMass;
    room.telemetry.o2Mass = room.settings.o2Mass;
    room.telemetry.fuelMass = room.settings.fuelMass;
    room.telemetry.o2 = room.telemetry.o2Mass > 0 ? 100 : 0;
    room.telemetry.food = room.telemetry.foodMass > 0 ? 100 : 0;
    room.telemetry.fuel = 100;
    room.telemetry.science = payload.science;
    room.telemetry.marsProgress = 0;
    room.telemetry.starving = room.telemetry.food <= 0;
    recomputeTelemetry(room);
    // Pure co-op: NO IMPOSTOR! Everyone is a Crewmate / Astronaut
    room.imposterIds = [];
    for (const player of room.players.values()) {
      if (!player.isBot) {
        io.to(player.id).emit("role:assigned", {
          roomId: room.id,
          isImposter: false,
          role: "crewmate",
          imposterIds: [],
          serverTime: now(),
        });
      }
    }
    io.to(room.id).emit("game:started", {
      roomId: room.id,
      ...snapshots(room),
      players: publicRoom(room).players,
      playerList: publicRoom(room).playerList,
      telemetry: { ...room.telemetry },
      tasks: { ...room.taskState },
      moon: { ...room.moon },
      pilotSeat: { ...room.pilotSeat },
      settings: { ...room.settings },
      startedAt,
      serverTime: now(),
    });
    startRoomTimers(room);
    emitTelemetry(room);
    broadcastRooms();
  });

  handle("player:move", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.phase !== "playing") return;
    if (!rateLimit(socket, "move", MOVE_LIMIT_PER_SECOND)) return;
    const targetX = Number(data?.x);
    const targetY = Number(data?.y);
    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
    const current = now();
    const previous = player.lastMoveAt || current - 100;
    const delta = clamp((current - previous) / 1000, 0.01, 0.5);
    player.lastMoveAt = current;
    const maxSpeed = player.ghost
      ? MAX_SPEED
      : room.telemetry.starving
        ? MAX_SPEED * 0.6
        : MAX_SPEED;
    const oldX = player.x;
    const oldY = player.y;
    let x = targetX;
    let y = targetY;
    const dx = x - oldX;
    const dy = y - oldY;
    const distance = Math.hypot(dx, dy);
    const maxStep = maxSpeed * delta;
    if (distance > maxStep && distance > 0) {
      const scale = maxStep / distance;
      x = oldX + dx * scale;
      y = oldY + dy * scale;
    }
    x = clamp(x, WORLD.minX, WORLD.maxX);
    y = clamp(y, WORLD.minY, WORLD.maxY);
    player.x = x;
    player.y = y;
    if (Math.abs(x - oldX) > 0.5) {
      player.direction = x < oldX ? "left" : "right";
    } else if (data?.d === "left" || data?.d === "right") {
      player.direction = data.d;
    } else if (data?.direction === "left" || data?.direction === "right") {
      player.direction = data.direction;
    }
    player.d = player.direction;
    const moved = Math.hypot(x - oldX, y - oldY) > 0.01;
    player.moving = Boolean(data?.moving) && moved;
    player.scene = room.scene;
    io.to(room.id).emit("player:moved", {
      roomId: room.id,
      id: player.id,
      playerId: player.id,
      x: round(x),
      y: round(y),
      d: player.direction,
      direction: player.direction,
      moving: player.moving,
      ghost: player.ghost,
      scene: room.scene,
      seq: Number(data?.seq) || 0,
      serverTime: current,
    });
  });

  handle("player:animation", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) return;
    io.to(room.id).emit("player:animation", {
      roomId: room.id,
      id: player.id,
      playerId: player.id,
      state: data?.state ?? data?.animation ?? null,
      serverTime: now(),
    });
  });

  handle("player:kill", (data) => {
    const room = rooms.get(socket.data.roomId);
    const killer = room?.players.get(socket.id);
    if (!room || !killer) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const targetId = String(data?.targetId ?? data?.playerId ?? "");
    const target = room.players.get(targetId);
    if (!target) {
      sendError(socket, "target_not_found", "That player is not in this room.");
      return;
    }
    if (!killPlayer(room, killer, target, false)) {
      sendError(socket, "invalid_kill", "That kill is not valid right now.");
    }
  });

  handle("task:complete", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const taskId = String(data?.taskId ?? "");
    if (!applyTask(room, player, taskId, false)) {
      sendError(socket, "invalid_task", "That task cannot be completed right now.");
    }
  });

  handle("pilot:seat:claim", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing") {
      sendError(socket, "invalid_phase", "The pilot seat is only available during flight.");
      return;
    }
    if (!player.isAlive) {
      sendError(socket, "dead_player", "Ghosts cannot take the pilot seat.");
      return;
    }
    const seat = room.pilotSeat;
    if (seat.occupantId && seat.occupantId !== player.id) {
      sendError(socket, "seat_occupied", "The pilot seat is already occupied.");
      return;
    }
    seat.occupantId = player.id;
    seat.locked = true;
    seat.updatedAt = now();
    seat.updatedBy = player.id;
    player.isPilot = true;
    room.pilotThrust = {
      playerId: player.id,
      throttle: 0,
      heading: 0,
      updatedAt: now(),
    };
    io.to(room.id).emit("pilot:seat:locked", {
      roomId: room.id,
      seatId: seat.seatId,
      occupantId: player.id,
      locked: true,
      by: player.id,
      serverTime: now(),
    });
    io.to(room.id).emit("pilot:seat:updated", {
      roomId: room.id,
      seat: { ...seat },
      serverTime: now(),
    });
    roomBroadcast(room);
  });

  handle("pilot:seat:release", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const seat = room.pilotSeat;
    if (seat.occupantId !== player.id && room.hostId !== player.id) {
      sendError(socket, "not_pilot", "Only the pilot or host can release the seat.");
      return;
    }
    releasePilotSeat(room, player.id, "released", true);
    roomBroadcast(room);
  });

  handle("pilot:seat:lock", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const seat = room.pilotSeat;
    if (seat.occupantId !== player.id) {
      sendError(socket, "not_pilot", "Only the pilot can change the seat lock.");
      return;
    }
    seat.locked = Boolean(data?.locked);
    seat.updatedAt = now();
    seat.updatedBy = player.id;
    io.to(room.id).emit("pilot:seat:updated", {
      roomId: room.id,
      seat: { ...seat },
      serverTime: now(),
    });
    roomBroadcast(room);
  });

  handle("pilot:thrust", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing") {
      sendError(socket, "invalid_phase", "Thrust is only available during flight.");
      return;
    }
    if (room.moon.state !== "orbit") {
      sendError(socket, "not_in_orbit", "Thrust is only available while orbiting.");
      return;
    }
    if (!player.isAlive || room.pilotSeat.occupantId !== player.id) {
      sendError(socket, "not_pilot", "Only the seated pilot can thrust.");
      return;
    }
    const throttle = Number(data?.throttle);
    const heading = Number(data?.heading);
    if (!Number.isFinite(throttle) || throttle < 0 || throttle > 1) {
      sendError(socket, "invalid_throttle", "Throttle must be between 0 and 1.");
      return;
    }
    if (!Number.isFinite(heading)) {
      sendError(socket, "invalid_heading", "Heading must be a number.");
      return;
    }
    const normalizedHeading = ((heading + 180) % 360 + 360) % 360 - 180;
    room.pilotThrust = {
      playerId: player.id,
      throttle,
      heading: normalizedHeading,
      updatedAt: now(),
    };
    io.to(room.id).emit("pilot:thrust", {
      roomId: room.id,
      playerId: player.id,
      throttle,
      heading: normalizedHeading,
      serverTime: now(),
    });
    roomBroadcast(room);
  });

  handle("cockpit:obstacle:hit", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.phase !== "playing") return;
    room.telemetry.hull = clamp((room.telemetry.hull ?? 100) - 5, 0, 100);
    recomputeTelemetry(room);
    emitTelemetry(room);
    const win = computeWin(room);
    if (win) endGame(room, win.winner, win.reason);
  });

  handle("cockpit:obstacle:cleared", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.phase !== "playing") return;
    room.telemetry.science += 10;
    room.telemetry.marsProgress = clamp(room.telemetry.marsProgress + 2, 0, 100);
    recomputeTelemetry(room);
    emitTelemetry(room);
  });

  handle("cockpit:wave:cleared", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.phase !== "playing") return;
    room.telemetry.autopilot = true;
    room.telemetry.marsProgress = clamp(room.telemetry.marsProgress + 10, 0, 100);
    recomputeTelemetry(room);
    emitTelemetry(room);
  });

  handle("moon:land", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing") {
      sendError(socket, "invalid_phase", "Landing is only available during flight.");
      return;
    }
    if (room.moon.state !== "orbit") {
      sendError(socket, "not_in_orbit", "The ship is not in orbit.");
      return;
    }
    if (!player.isAlive) {
      sendError(socket, "dead_player", "Ghosts cannot land the ship.");
      return;
    }
    if (room.pilotSeat.occupantId !== player.id && room.hostId !== player.id) {
      sendError(socket, "not_pilot", "Only the seated pilot or host can land.");
      return;
    }
    room.telemetry.fuel = clamp(room.telemetry.fuel - MOON_FUEL_COST, 0, 100);
    room.telemetry.o2 = clamp(room.telemetry.o2 - MOON_O2_COST, 0, 100);
    room.moon.state = "descending";
    room.moon.startedAt = now();
    room.moon.endsAt = now() + MOON_SEQUENCE_MS;
    room.moon.progressDelayUntil = now() + MOON_PROGRESS_DELAY_MS;
    room.moon.nodes = [];
    room.pilotThrust = {
      playerId: null,
      throttle: 0,
      heading: 0,
      updatedAt: now(),
    };
    if (room.timers.landing) clearTimeout(room.timers.landing);
    room.timers.landing = setTimeout(
      () => finishMoonLanding(room),
      MOON_SEQUENCE_MS,
    );
    recomputeTelemetry(room);
    io.to(room.id).emit("moon:state", moonPayload(room));
    emitTelemetry(room);
    roomBroadcast(room);
    const win = computeWin(room);
    if (win) endGame(room, win.winner, win.reason);
  });

  handle("moon:depart", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing" || room.moon.state !== "landed") {
      sendError(socket, "not_landed", "The ship is not landed.");
      return;
    }
    if (!player.isAlive) {
      sendError(socket, "dead_player", "Ghosts cannot depart the Moon.");
      return;
    }
    if (room.pilotSeat.occupantId !== player.id && room.hostId !== player.id) {
      sendError(socket, "not_pilot", "Only the seated pilot or host can depart.");
      return;
    }
    room.moon.state = "ascending";
    room.moon.startedAt = now();
    room.moon.endsAt = now() + MOON_SEQUENCE_MS;
    if (room.timers.landing) clearTimeout(room.timers.landing);
    room.timers.landing = setTimeout(
      () => finishMoonDepart(room),
      MOON_SEQUENCE_MS,
    );
    io.to(room.id).emit("moon:state", moonPayload(room));
    roomBroadcast(room);
  });

  const collectMoonNode = (socket, data, expectedType) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing" || room.moon.state !== "landed") {
      sendError(socket, "not_landed", "Nothing can be collected right now.");
      return;
    }
    if (!player.isAlive) {
      sendError(socket, "dead_player", "Ghosts cannot collect samples.");
      return;
    }
    const nodeId = String(data?.nodeId ?? "");
    const node = room.moon.nodes.find((entry) => entry.id === nodeId);
    if (!node || node.type !== expectedType || node.collected) {
      sendError(socket, "node_not_found", "That sample is not available.");
      return;
    }
    const distance = Math.hypot(player.x - node.x, player.y - node.y);
    if (distance > 110) {
      sendError(socket, "too_far", "Move closer to the sample.");
      return;
    }
    node.collected = true;
    node.collectedBy = player.id;
    node.collectedAt = now();
    if (node.type === "cheese") {
      room.telemetry.food = clamp(room.telemetry.food + 18, 0, 100);
      room.telemetry.science += 15;
      room.telemetry.foodMass += 25;
      room.telemetry.starving = room.telemetry.food <= 0;
    } else {
      room.telemetry.science += 20;
    }
    recomputeTelemetry(room);
    io.to(room.id).emit("moon:node-collected", {
      roomId: room.id,
      playerId: player.id,
      node: { ...node },
      telemetry: { ...room.telemetry },
      serverTime: now(),
    });
    emitTelemetry(room);
    roomBroadcast(room);
  };

  handle("moon:collect-cheese", (data) => collectMoonNode(socket, data, "cheese"));
  handle("moon:collect-sample", (data) => collectMoonNode(socket, data, "rock"));

  handle("meeting:start", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "playing") {
      sendError(socket, "invalid_phase", "A meeting cannot start right now.");
      return;
    }
    if (!player.isAlive) {
      sendError(socket, "dead_player", "Ghosts cannot call meetings.");
      return;
    }
    if (now() - room.lastMeetingEndAt < MEETING_COOLDOWN_MS) {
      sendError(socket, "meeting_cooldown", "The meeting cooldown is still active.");
      return;
    }
    cancelLandingForMeeting(room);
    releasePilotSeat(room, player.id, "meeting-start", true);
    const meeting = {
      id: `meeting_${crypto.randomBytes(3).toString("hex")}`,
      callerId: player.id,
      startedAt: now(),
      endsAt: now() + MEETING_DURATION_MS,
      votes: new Map(),
      jettisons: new Set(),
      botTimers: new Set(),
      resolved: false,
    };
    room.meeting = meeting;
    room.phase = "meeting";
    teleportToSpawns(room);
    room.timers.meeting = setTimeout(
      () => resolveMeeting(room, "timeout"),
      MEETING_DURATION_MS,
    );
    scheduleBotVotes(room, meeting);
    io.to(room.id).emit("meeting:started", {
      roomId: room.id,
      meetingId: meeting.id,
      callerId: player.id,
      startedAt: meeting.startedAt,
      endsAt: meeting.endsAt,
      votesRequired: [...room.players.values()].filter(
        (entry) => entry.isAlive,
      ).length,
      players: publicRoom(room).players,
      telemetry: { ...room.telemetry },
      serverTime: now(),
    });
    roomBroadcast(room);
  });

  handle("meeting:vote", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "meeting" || !room.meeting) {
      sendError(socket, "no_meeting", "There is no active meeting.");
      return;
    }
    const raw = data?.targetId ?? data?.votedForId;
    const targetId = raw === null || raw === undefined || raw === "" ? null : String(raw);
    if (!castVote(room, player, targetId, false)) {
      sendError(socket, "invalid_vote", "That vote is not valid.");
    }
  });

  handle("meeting:end", () => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (room.phase !== "meeting" || !room.meeting) {
      sendError(socket, "no_meeting", "There is no active meeting.");
      return;
    }
    if (room.hostId !== player.id) {
      sendError(socket, "not_host", "Only the host can force the meeting to end.");
      return;
    }
    resolveMeeting(room, player.id);
  });

  handle("cargo:jettison", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    const type = String(data?.type ?? "");
    if (!applyCargoJettison(room, player, type)) {
      sendError(socket, "invalid_jettison", "That cargo cannot be jettisoned right now.");
    }
  });

  handle("room:send:message", (data) => {
    const room = rooms.get(socket.data.roomId);
    const player = room?.players.get(socket.id);
    if (!room || !player) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    if (!rateLimit(socket, "chat", 5)) return;
    const message = String(data?.message ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);
    if (!message) return;
    io.to(room.id).emit("room:message", {
      roomId: room.id,
      playerId: player.id,
      name: player.name,
      message,
      serverTime: now(),
    });
  });

  handle("state:request", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) {
      sendError(socket, "no_room", "Join a room first.");
      return;
    }
    socket.emit("state:snapshot", snapshots(room));
  });

  socket.on("disconnect", () => {
    leaveRoom(socket, "disconnect");
    socket.data.profile = null;
  });
}

io.on("connection", connectSocket);

app.get("/status", (req, res) => {
  res.type("text/plain").send("OK");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    rooms: rooms.size,
    players: [...rooms.values()].reduce(
      (total, room) => total + room.players.size,
      0,
    ),
    serverTime: now(),
  });
});

app.get("/rooms", (req, res) => {
  res.json([...rooms.values()].map(roomSummary));
});

app.get("/rooms/:roomId", (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = rooms.get(roomId);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(publicRoom(room));
});

app.get("/api/nasa-files", (req, res) => {
  try {
    const nasaDir = path.join(__dirname, "..", "nasa models");
    if (!fs.existsSync(nasaDir)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(nasaDir);
    const validExts = new Set([".stl", ".glb", ".gltf", ".obj", ".jpg", ".png"]);
    const nasaFiles = files
      .filter((file) => validExts.has(path.extname(file).toLowerCase()))
      .map((file) => {
        const stats = fs.statSync(path.join(nasaDir, file));
        return {
          filename: file,
          name: path.parse(file).name,
          ext: path.extname(file).toLowerCase().replace(".", ""),
          size: stats.size,
          path: `/nasa-models/${encodeURIComponent(file)}`,
        };
      });
    res.json({ files: nasaFiles });
  } catch (err) {
    res.status(500).json({ error: err.message, files: [] });
  }
});

server.listen(PORT, () => {
  console.log(`Road to Mars server listening on port ${PORT}`);
});

function shutdown() {
  for (const room of rooms.values()) stopRoomTimers(room);
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
