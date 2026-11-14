# Road to Mars — Reference Architecture

This document records the inspected source behavior and the authoritative contract implemented by `server.js`.

## Source inventory

| Repository | Remote | Commit inspected |
| --- | --- | --- |
| `among-us-web` | `https://github.com/i250882-os/among-us.git` | `066e5c8` |
| `among-us-godot` | `https://github.com/bitmammoth/AmongUsRemake.git` | `d92d907` |
| `among-us-unity` | `https://github.com/KBFSantos/AmongUs-FanMade-remake.git` | `7d2bf1393b131a786830e5c48e64b0b6ddabad63` |
| `Road to Mars` | Local workspace | `index.html` at the time of inspection |

The local `among-us-unity` clone was incomplete. Its Unity scripts and README were inspected through the GitHub API/raw files at the commit above.

The Godot repository contains movement but no vision or shadow code. The Unity repository contains task interactions but no voting or multiplayer code. Those gaps are called out explicitly, and equivalent math/state-machine references are supplied from `among-us-web` and the existing Road to Mars page.

---

## 1. among-us-web Socket.io contract

The backend is an ESM Node.js application using Express 5, Socket.io 4.8, and in-memory managers. The server trusts client identity, positions, kills, and votes.

### 1.1 Client to server events

| Event | Payload | Backend behavior |
| --- | --- | --- |
| `log` | any | `console.log(data)` |
| `player:register` | `{ id, name, color }` | Creates a global player with default state `{x:560,y:150,d:"left",moving:false}`; replies `player:registered` |
| `player:unregister` | `{ playerId }` | Deletes the global player; replies `player:unregistered`; does not remove them from a room |
| `player:disconnect` | `{ playerId }` | Removes the player from their room, emits `player:left`, checks win, possibly emits `room:deleted` |
| `room:create` | `{ hostId, roomId }` | Creates room with host; broadcasts `room:created` to all sockets; immediately joins host |
| `room:join` | `{ playerId, roomId }` | Rejects missing/started rooms; adds player, joins Socket.io room, sends `room:joined`, broadcasts `player:joined` |
| `room:leave` | `{ playerId }` | Removes player, resets player state, emits `player:left`, may emit `room:deleted` and `game:ended` |
| `game:start` | `{ roomId }` | Rejects rooms with one or fewer players; assigns one random imposter; emits `game:started` |
| `room:send:message` | `{ roomId, playerId, message }` | Emits `room:message` to the room |
| `player:move` | `{ roomId, id, playerId, x, y, d, moving }` | Writes `{x,y,d}` into the room player and `{x,y,d,moving}` into the global player; emits `player:moved` |
| `player:animation` | arbitrary | Emits `player:animation` to the room |
| `player:kill` | `{ playerId, killerId, roomId, x, y, color }` | Marks `room.players[playerId].isAlive=false`; emits `player:killed`; checks win |
| `meeting:start` | `{ roomId, callerId }` | Creates meeting and emits `meeting:started` |
| `meeting:vote` | `{ roomId, callerId, votedForId }` | Stores one vote per caller; emits `meeting:voted`; ends meeting when vote count equals alive count |
| `meeting:end` | `{ roomId }` | Resolves meeting, emits `meeting:ended`, checks win |
| `disconnect` | Socket.io built-in | Removes the mapped player from their room and global registry |

### 1.2 Server to client events

| Event | Payload | Meaning |
| --- | --- | --- |
| `player:registered` | `{ playerId }` | Registration complete |
| `player:unregistered` | none | Player registry entry deleted |
| `room:created` | `{ roomId, room }` | Global room-list broadcast; includes the full room object |
| `room:deleted` | `{ roomId }` | Global room-list broadcast |
| `room:joined` | `{ roomId, room, player, started }` | Joiner receives the full room, player, and started flag |
| `room:join:error` | `{ message }` | Join rejected |
| `player:joined` | `{ player, roomId }` | Existing room members see the new player |
| `player:left` | `{ playerId }` | Room member left |
| `game:started` | `{ roomId }` | Clients then fetch role separately over HTTP |
| `game:notif` | `{ message }` | UI notification |
| `game:ended` | `{ roomId, isImposter }` | `isImposter` is actually the win side: `true` means imposters won, `false` means crew won |
| `room:message` | `{ playerId, message }` | Chat |
| `player:moved` | original `player:move` payload | Position/direction/animation state |
| `player:animation` | original payload | Animation passthrough |
| `player:killed` | original `player:kill` payload | Victim/killer/position |
| `meeting:started` | `{ roomId, callerId }` | Meeting begins |
| `meeting:voted` | `{ roomId, callerId, votedForId }` | Vote broadcast to the room |
| `meeting:ended` | `{ roomId, results }` | `results = { ejectedId, tie, counts, votes }` |

### 1.3 State shapes

```js
PlayerState = { x: number, y: number, d: "left" | "right" | string, moving: boolean }

Player = {
  id: string,
  name: string,
  roomId: string | null,
  state: PlayerState,
  color: string,
  isImposter: boolean,
  isAlive: boolean
}

MeetingState = {
  isActive: boolean,
  callerId: string,
  votes: Record<voterId, votedForId | null>,
  endTime: number
}

GameRoom = {
  id: string,
  started: boolean,
  imposter: string | null,
  host: Player,
  players: Record<playerId, Player>,
  currentMeeting: MeetingState | null
}
```

### 1.4 Win check

`RoomsManager.checkWin(roomId)` returns `true` for an imposter win, `false` for a crew win, and `null` while the game continues.

```text
aliveImposters >= aliveCrewmates AND aliveCrewmates > 0  -> true  (imposters win)
aliveCrewmates === 0                                    -> true  (imposters win)
aliveImposters === 0                                    -> false (crew wins)
otherwise                                               -> null
```

### 1.5 Meeting resolution in the web backend

- Only non-null votes are counted.
- Highest count wins; equal highest counts produce `tie=true` and no ejection.
- A unique highest vote sets `ejectedId` and marks that room player `isAlive=false`.
- The meeting timeout is created as 60 seconds, but `endTime` is set to 10 seconds; the two values disagree.
- `meeting:voted` broadcasts the actual target.
- A vote can overwrite the same caller's earlier vote.
- Any client can call `meeting:end`.

### 1.6 Web backend HTTP endpoints

| Method | Route | Response |
| --- | --- | --- |
| `GET` | `/status` | `OK` |
| `GET` | `/rooms` | All rooms |
| `GET` | `/rooms/:roomId` | One room |
| `GET` | `/player/room/:playerId` | `{ room, player }` |
| `GET` | `/isImposter/?playerId=&roomId=` | `{ isImposter: boolean }` |

### 1.7 Known web-reference weaknesses

- Client-generated player IDs are trusted.
- Movement is not validated, clamped, rate-limited, or made server-authoritative.
- Kills are trusted: no role, range, cooldown, or alive-target validation.
- The imposter is present in `room:created` and `room:joined` payloads.
- Roles are fetched over HTTP after `game:started`, creating a race and leaking through `/rooms`.
- Chat has no validation or rate limit.
- Disconnect cleanup can run twice through `player:disconnect` and the built-in `disconnect`.
- `player:unregister` does not remove the player from the room.
- There is no task system, bot system, telemetry, pilot seat, or Moon state.

---

## 2. among-us-godot 2D movement, vision, and shadow

### 2.1 Movement math that exists in the repository

`AmongUsRemake/src/actors/Player.gd`:

```gdscript
move_vector.x = Input.get_action_strength("right") - Input.get_action_strength("left")
move_vector.y = Input.get_action_strength("down") - Input.get_action_strength("up")
return move_vector * speed
```

- `speed = Vector2(200, 200)` in `Player.tscn`.
- The input basis is unnormalized, so diagonal movement is faster by `sqrt(2)`.
- `velocity = get_movement_vector()` then `move_and_slide(velocity)`; there is no multiplication by `delta`, so movement is frame-rate dependent.
- `AnimatedSprite.flip_h` is set to `true` when `move_vector.x < 0` and `false` when `move_vector.x > 0`.
- Walking animation plays when the input vector is non-zero; otherwise idle.
- The scene uses a `KinematicBody2D` with `collision_mask = 2` (walls) and player collision extents `Vector2(400, 510)` before the `0.07` scene scale.
- `Skeld.tscn` only instantiates the player at `(415.494, 264.337)`; there is no tilemap, wall geometry, or vision node.

### 2.2 Vision and shadow status in the Godot repository

There is no vision, fog-of-war, shadow, light, raycast, or visibility code in the Godot repository. Only the player sprite frames and the movement script exist.

The following equivalent math is used by the web/Phaser reference and is the recommended 2D implementation for Road to Mars.

### 2.3 Web/Phaser vision shader math

The vision pipeline converts texture UV coordinates into world coordinates:

```text
worldPos = uTextureOrigin + (uv * uTextureSize)
dist = distance(worldPos, uPlayerPosition)
falloffStart = uVisionRadius * 0.6
falloffEnd = uVisionRadius
visibility = 1.0 - smoothstep(falloffStart, falloffEnd, dist)
gray = dot(rgb, vec3(0.299, 0.587, 0.114))
finalColor = mix(gray * 0.3, rgb, visibility)
```

- The web game uses `VISION_RADIUS = 100`.
- Remote players and dead bodies are hidden when `distance(player, entity) > VISION_RADIUS`.
- Meetings disable the vision pipeline and show the whole scene.
- The web color-swap shader maps blue body pixels to `uColor * 0.5`, which produces the darker crewmate shadow color.

### 2.4 Road to Mars radial fog math

`Road to Mars/index.html` uses a screen-space radial gradient centered on the local player:

```text
innerRadius = visionRadius * 0.45
outerRadius = visionRadius
gradient: transparent at innerRadius -> rgba(0, 0, 0, 0.92) at outerRadius
```

- Normal vision radius: `370`.
- Low-oxygen vision radius: `190` when `o2 < 35`.
- Ghosts see everything: the fog is not drawn.
- The web shader is world-space; the Road to Mars gradient is screen-space. Both use the same radial falloff concept.

### 2.5 Recommended server/client split

- The server owns positions, ghost state, starvation, and scene (`ship` or `moon`).
- The client computes fog, local occlusion, and sprite visibility from authoritative positions.
- The server does not need to know line-of-sight geometry; it only needs to prevent impossible movement and cross-scene kills.
- Ghost movement is allowed at full speed and is expected to ignore client-side walls.
- Living crew movement is capped by the server; starvation reduces the allowed speed by 40%.

---

## 3. among-us-unity task and voting state machines

### 3.1 Task interaction state machine that exists in the repository

`Assets/Scripts/InteractableObject.cs`:

| Flag/state | Meaning |
| --- | --- |
| `CanInteract` | Task is still usable |
| `InArea` | Player is inside the trigger |
| `Using` | Player is currently in the task UI |
| `ActionButton.interactable` | UI affordance state |
| `PlayerEnt.enabled` | Player movement is enabled or disabled |

Transitions:

```text
OnTriggerEnter2D(Player)
  if !CanInteract: ignore
  add Interact listener
  swap action sprite
  ActionButton.interactable = true
  InArea = true

E while InArea and not Using
  PlayerEnt.enabled = false
  Using = true

Interact() from the action button
  if !CanInteract: ignore
  PlayerEnt.enabled = false
  Using = true
  ActionButton.interactable = false

Escape while Using
  ExitAction()
  Using = false
  PlayerEnt.enabled = true
  ActionButton.interactable = true

OnTriggerExit2D(Player)
  ExitArea()
  reset action sprite
  Using = false
  ActionButton.interactable = false
  InArea = false
  remove listeners

SetCanInteract(false)
  if InArea: ExitArea()
```

Subclasses override `Interact`, `ExitAction`, and `Update` to show/hide their Canvas and to complete the task.

### 3.2 Task progress math

`Assets/Scripts/ProgressTasks.cs`:

```text
TaskCount = number of task objects that called TaskSetup()
MaxProgress = player UI slider max value
DistributedValue = MaxProgress / TaskCount
Progress += DistributedValue on task completion
```

- `TaskSetup()` is called from each minigame's `Awake()`.
- Completion disables the task with `SetCanInteract(false)`.
- State is static and is not reset between scenes or game restarts.
- `DownloadMinigame`: while using, `slider.value += 0.065 * Time.deltaTime`; completes at max.
- `CardSwapTask`: completes when the slider reaches max.
- `CCTVSystem`: only toggles a camera UI; no progress.

### 3.3 Player role and movement in Unity

- `Player.Team` is an enum with `Impostor` and `Crew`.
- Movement uses `Input.GetAxis("Horizontal")`, `Input.GetAxis("Vertical")`, and `Rigidbody2D.MovePosition(position + movement * Speed * fixedDeltaTime)`.
- The camera follows the player's X/Y position.
- There is no networking, kill, voting, room, or meeting implementation.

### 3.4 Adopted voting state machine

The Unity repository has no voting code, so the authoritative server uses the following state machine derived from the web meeting flow and the Road to Mars tablet/ejection flow.

```text
Idle
  -> MeetingCalled: meeting:start from a living player while playing, after cooldown
  -> Voting: meeting record created, movement frozen, pilot seat released, 60s deadline
  -> Resolving: all living players voted, timer expired, or host force-ended
  -> Ejection: unique plurality for a player
  -> NoEjection: tie, skip plurality, or zero votes
  -> Resume: no win condition
  -> Ended: win condition detected
```

Rules adopted by `server.js`:

- Only living players may call or vote.
- Dead players and ghosts cannot vote.
- A vote is `targetId` or `null` for skip.
- A living player may change their vote until the meeting resolves.
- The meeting resolves early when every living player has voted.
- Skip is counted as a candidate for plurality.
- A unique player plurality ejects that player.
- A tie or a skip plurality ejects nobody.
- Ejected players become ghosts with `mass = 0`.
- A meeting cooldown of 15 seconds starts when the meeting ends.
- The 60-second timer is authoritative; the web reference's 10-second `endTime` mismatch was not copied.
- The server checks win conditions after ejection and on every subsequent authoritative action.
- The meeting freezes survival draining; cargo jettison still applies immediately.

### 3.5 Adopted task state machine

The server keeps the useful Unity interaction concepts but makes them repeatable and authoritative:

```text
Available
  -> InRange (client-side)
  -> Activating (client-side task UI)
  -> Completed: task:complete accepted by server
  -> Cooldown: per-player, per-task 8s
  -> Available again
```

The server validates phase, alive state, task ID, and cooldown. Task progress advances on every accepted completion, capped at 100, but task progress is no longer a victory condition. The mission is won by reaching Mars or by elimination logic.

---

## 4. Road to Mars authoritative server

### 4.1 Files and scope

- `server.js` is the authoritative in-memory game server.
- `package.json` declares Express, Socket.io, CORS, and a Socket.io client dev dependency.
- The server does not serve static files and does not touch `public/` or `index.html`.

### 4.2 Rooms, slots, and bots

- Every room has six total slots, humans and bots combined.
- A room supports one to six human players.
- The host can add or remove bots in the lobby with `room:add-bot` and `room:remove-bot`.
- `game:start` auto-fills empty slots with bots unless `{ fillBots: false }` is supplied.
- Games require at least two actors after optional filling.
- Exactly one actor, human or bot, is chosen as the imposter at launch.
- Bots can be imposters, move on the server, complete tasks, kill nearby crew, and vote.
- The room is deleted when its last human leaves.
- Host is reassigned to the next human when the host leaves.

### 4.3 Authoritative telemetry

`room.telemetry` contains:

| Field | Meaning |
| --- | --- |
| `maxMass` | Launcher limit: electron `900`, falcon9 `1080`, sls `1280` |
| `dryMass` | `270` |
| `payloadMass` | Science payload mass: light `70`, medium `190`, heavy `340` |
| `foodMass` | Food cargo mass |
| `o2Mass` | Oxygen cargo mass |
| `o2` | Oxygen percentage `0..100` |
| `food` | Food percentage `0..100` |
| `fuel` | Fuel percentage `0..100` |
| `science` | Science points |
| `marsProgress` | Mission progress `0..100` |
| `starving` | `food <= 0` |
| `totalMass` | Recomputed total |
| `crewMass` | `aliveCount * 80` |
| `aliveCount` | Living humans plus living bots |
| `ghostCount` | Dead/ejected actors |
| `overloaded` | `totalMass > maxMass` |
| `massPenalty` | `totalMass > maxMass ? totalMass / maxMass : 1` |

Crew mass rule:

```text
totalMass = dryMass + payloadMass + foodMass + o2Mass + (aliveCount * 80)
```

- Each living human or bot contributes `80 kg`.
- A killed or ejected actor becomes a ghost with `ghost: true` and `mass: 0`.
- Ghosts do not contribute crew mass and no longer increase O2/food drain.
- Disconnected actors are removed and also stop contributing.

### 4.4 1 Hz telemetry tick

While the room is in the `playing` phase:

```text
penalty = max(1, totalMass / maxMass)
massFactor = max(0.5, totalMass / maxMass)
moonFactor = 1 while in orbit
             0.15 while not in orbit and now < progressDelayUntil
             0.35 otherwise while not in orbit
progressDelayUntil = landing start + 15s, reset to landing completion + 15s

o2   -= 0.14 * aliveCount
food -= 0.12 * aliveCount
fuel -= 0.55 * penalty
marsProgress += (1.4 / penalty) * moonFactor
```

- Overload accelerates fuel burn and slows Mars progress through `massPenalty`.
- Descent and ascent also reduce progress through the non-orbit `moonFactor`.
- Deaths immediately lower the O2/food drain rate because `aliveCount` drops.
- Food at or below zero sets `starving`.
- Mission failure occurs if `o2 <= 0` or `fuel <= 0`.
- Mars arrival occurs at `marsProgress >= 100`.

Pilot thrust adds to the same tick:

```text
headingFactor = max(0, cos(headingDegrees * PI / 180))
fuel -= throttle * 0.9 * massFactor
marsProgress += (throttle * 1.6 * headingFactor) / massFactor
```

### 4.5 Starvation and speed

- `starving = food <= 0`.
- Living human maximum speed is `320 px/s`; starvation reduces it by 40 percent to `192 px/s`.
- Living bots use a base speed of `170 px/s`; starvation reduces that by 40 percent to `102 px/s`.
- Ghosts keep the full `320 px/s` and may ignore walls on the client.
- The server clamps every movement delta to the allowed speed and world bounds.
- Movement is ignored during meetings, in the lobby, and after game end.

### 4.6 Mission configuration

Client event:

```js
socket.emit("mission:configure", {
  rocket: "electron" | "falcon9" | "sls",
  sciencePayload: "light" | "medium" | "heavy",
  foodMass: 0..500,
  o2Mass: 0..500
});
```

- Allowed only in the `lobby` phase.
- Any player in the room may configure the mission.
- Applying a payload resets science points to that payload's starting value.
- `maxMass` comes from the selected launcher.
- `food` and `o2` start at 100 percent when their respective mass is greater than zero.
- The server replies with `mission:configured` and a full telemetry update.

### 4.7 Pilot seat and thrust

- There is one seat: `seatId: "pilot"`.
- `pilot:seat:claim` takes the seat and locks it to the claimant.
- `pilot:seat:release` releases it; the occupant or host may release.
- `pilot:seat:lock` lets the occupant toggle the lock flag.
- The seat is released automatically on kill, ejection, disconnect, meeting start, and game end.
- `pilot:thrust { throttle, heading }` is accepted only from the living seated pilot, during `playing`, while the Moon state is `orbit`.
- Throttle is `0..1`; heading is normalized to `-180..180`.
- Thrust is applied on the next 1 Hz tick and on each subsequent tick until replaced, set to throttle `0`, or cleared by landing, release, death, meeting start, or game end.
- Thrust never awards progress instantly; it trades fuel for Mars progress on the tick.

### 4.8 Moon landing and samples

Moon state machine:

```text
orbit
  -> descending (5 seconds, costs 10 fuel and 12 O2)
  -> landed (spawns 7 Lunar Romy Cheese nodes + 3 Moon rock nodes)
  -> ascending (5 seconds)
  -> orbit
```

- `moon:land` may be initiated by a living seated pilot or a living host.
- `moon:depart` may be initiated by a living seated pilot or a living host.
- A meeting that starts during descent/ascent cancels the sequence and returns the ship to orbit.
- Landing sets `scene = "moon"` for all actors and starts a mission-time delay that slows `marsProgress`.
- Cheese collection uses `moon:collect-cheese { nodeId }`.
  - Requires `landed`, a living player, an uncollected cheese node, and distance `<= 110`.
  - `food += 18`, `science += 15`, `foodMass += 25`.
  - The 25 kg gain increases `totalMass` immediately.
- Rock collection uses `moon:collect-sample { nodeId }`.
  - Requires the same conditions.
  - `science += 20`.
- Nodes are server-owned; a node can be collected once.

### 4.9 Cargo jettison during meetings

Client event:

```js
socket.emit("cargo:jettison", { type: "food" | "payload" });
```

- Allowed only during an active meeting by a living player.
- Each type may be jettisoned once per meeting.
- Food jettison removes `75 kg` from `foodMass`, sets `food = 0`, and immediately sets `starving = true`.
- Payload jettison removes `75 kg` from `payloadMass`.
- Both update mass, telemetry, and the room snapshot immediately.
- This is a survival trade-off separate from voting to eject a crewmate.

### 4.10 Repeatable ship tasks

| Task | Server effect |
| --- | --- |
| `wires` | `fuel += 8` |
| `o2_filter` | `o2 += 12` |
| `nav` | `marsProgress += 3` |
| `cargo` | `payloadMass -= 15`, minimum 0 |
| `science` | `science += 25` |

- Every accepted task also adds `20` to `tasks.progress`, capped at 100, and increments `tasks.completions` and `tasks.byTask`.
- Each player has an independent 8-second cooldown per task.
- Tasks are repeatable; task progress is a scoreboard, not a win condition.
- Only living players may complete tasks.
- Bots complete tasks on their own schedule.

### 4.11 Kills and ghosts

- `player:kill { targetId }` is resolved from the socket identity; the client cannot choose the killer.
- The killer must be a living imposter, the target must be a living crewmate, and the distance must be `<= 80`.
- A 20-second cooldown applies to each imposter, including a 20-second grace period after game start.
- The victim becomes `ghost: true`, `isAlive: false`, `mass: 0`.
- The victim's pilot seat is released.
- Telemetry, room state, and win conditions update immediately.

### 4.12 Win conditions

Checked in this order:

```text
o2 <= 0 OR fuel <= 0                 -> imposters win, reason "life-support-failure"
no living imposters                 -> crew wins, reason "imposters-eliminated"
no living crew                      -> imposters win, reason "crew-eliminated"
living imposters >= living crew     -> imposters win, reason "imposter-parity"
marsProgress >= 100                 -> crew wins, reason "mars-arrival"
```

`game:ended` keeps the legacy `isImposter` boolean and adds `winner`, `reason`, telemetry, revealed player roles, tasks, Moon state, and timestamps.

### 4.13 Client to server Socket.io contract

| Event | Payload |
| --- | --- |
| `player:register` | `{ name, color }`; server assigns `playerId` |
| `player:unregister` | none |
| `player:disconnect` | none |
| `room:create` | `{ roomId? }` |
| `room:join` | `{ roomId }` |
| `room:leave` | none |
| `room:add-bot` | none |
| `room:remove-bot` | `{ botId }` |
| `mission:configure` | `{ rocket, sciencePayload, foodMass, o2Mass }` |
| `game:start` | `{ fillBots?: boolean }` |
| `player:move` | `{ x, y, d, direction, moving, seq }` |
| `player:animation` | `{ state }` |
| `player:kill` | `{ targetId }` |
| `task:complete` | `{ taskId }` |
| `pilot:seat:claim` | none |
| `pilot:seat:release` | none |
| `pilot:seat:lock` | `{ locked }` |
| `pilot:thrust` | `{ throttle, heading }` |
| `moon:land` | none |
| `moon:depart` | none |
| `moon:collect-cheese` | `{ nodeId }` |
| `moon:collect-sample` | `{ nodeId }` |
| `meeting:start` | none |
| `meeting:vote` | `{ targetId: string \| null }` |
| `meeting:end` | none; host only |
| `cargo:jettison` | `{ type: "food" \| "payload" }` |
| `room:send:message` | `{ message }` |
| `state:request` | none |
| `disconnect` | Socket.io built-in |

### 4.14 Server to client Socket.io contract

| Event | Payload |
| --- | --- |
| `server:ready` | `{ socketId, maxSlots, serverTime }` |
| `player:registered` | `{ playerId, name, color, serverTime }` |
| `player:unregistered` | none |
| `room:created` | `{ roomId, room, serverTime }` |
| `room:joined` | `{ roomId, room, player, started, you, serverTime }` |
| `room:join:error` | `{ code, message, serverTime }` |
| `room:deleted` | `{ roomId }` |
| `rooms:updated` | sanitized room summaries |
| `player:joined` | `{ roomId, player, serverTime }` |
| `player:left` | `{ roomId, playerId, reason, serverTime }` |
| `room:updated` | full room snapshot |
| `role:assigned` | `{ roomId, isImposter, imposterIds, serverTime }`; private |
| `game:started` | room, players, telemetry, tasks, Moon, pilot seat, settings |
| `game:notif` | `{ message }` |
| `game:ended` | winner, reason, telemetry, revealed players, tasks, Moon |
| `game:error` | `{ code, message, serverTime }` |
| `room:left` | `{ serverTime }` |
| `mission:configured` | settings, telemetry, configured-by |
| `telemetry:updated` | `{ roomId, telemetry, serverTime }` |
| `player:moved` | `{ roomId, id, playerId, x, y, d, direction, moving, ghost, scene, seq, serverTime }` |
| `player:animation` | `{ roomId, id, playerId, state, serverTime }` |
| `player:killed` | victim, killer, position, color, ghost/mass, serverTime |
| `player:ejected` | `{ roomId, playerId, ghost, mass, serverTime }` |
| `task:updated` | task ID, player, progress, completions, telemetry |
| `pilot:seat:locked` | seat, occupant, locked, by |
| `pilot:seat:unlocked` | seat, occupant null, locked false, reason |
| `pilot:seat:updated` | seat object |
| `pilot:thrust` | player, throttle, normalized heading |
| `moon:state` | Moon state, scene, nodes, telemetry |
| `moon:nodes` | spawned node list |
| `moon:node-collected` | node, collector, telemetry |
| `meeting:started` | meeting ID, caller, deadline, votes required, players |
| `meeting:voted` | voter, target, byBot, votes cast/required |
| `meeting:ended` | results and telemetry |
| `cargo:jettisoned` | type, amount, player, telemetry |
| `room:message` | player, name, message |
| `state:snapshot` | `{ roomId, room }` |

### 4.15 Meeting result shape

```js
{
  ejectedId: string | null,
  ejectedPlayer: PublicPlayer | null,
  tie: boolean,
  skipped: boolean,
  noVotes: boolean,
  counts: Record<playerId, number>,
  skipCount: number,
  votes: Record<voterId, targetId | null>,
  forcedBy: string | null
}
```

### 4.16 Snapshot shape

```js
{
  id, hostId, phase, scene, slots,
  settings: { rocket, sciencePayload, foodMass, o2Mass },
  players: Record<playerId, PublicPlayer>,
  playerList: PublicPlayer[],
  telemetry: Telemetry,
  tasks: { progress, completions, byTask },
  pilotSeat: { seatId, occupantId, locked, updatedAt, updatedBy },
  pilotThrust: { playerId, throttle, heading, updatedAt },
  moon: { state, site, startedAt, landedAt, endsAt, progressDelayUntil, nodes },
  meeting: null | { id, callerId, startedAt, endsAt, votesCast, votesRequired, jettisons },
  createdAt, startedAt, endedAt, lastMeetingEndAt
}
```

Roles are omitted from public snapshots until the game has ended. `role:assigned` is sent privately to each human socket.

### 4.17 REST and configuration

| Method | Route | Response |
| --- | --- | --- |
| `GET` | `/status` | `OK` |
| `GET` | `/health` | room/player counts and server time |
| `GET` | `/rooms` | sanitized room summaries |
| `GET` | `/rooms/:roomId` | sanitized room snapshot |

- `PORT` defaults to `3000`.
- `ALLOWED_ORIGIN` defaults to `*`.
- CORS is applied to Express and Socket.io.
- The server is API-only and does not serve `public/` or `index.html`.

### 4.18 Smoke verification

The `/tmp/road-to-mars-smoke.cjs` test starts the server on a temporary port, connects two Socket.io clients, and verifies:

- room creation, joining, and six-slot bot filling
- launcher, payload, food, and O2 telemetry configuration
- `totalMass = 1400` for electron/heavy with six crew and overload penalty
- pilot seat claim, lock, and thrust fuel/progress trade-off
- Moon descent costs, landing nodes, cheese `foodMass += 25`, `science += 15`, `food += 18`
- meeting cargo jettison, starvation, ejection, and `ghost: true` with `mass: 0`
- crew mass removal from `totalMass` after ejection
- task resource restoration for all five tasks
- 40 percent starving movement cap
