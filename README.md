# 🚀 Road to Mars (2026 NASA Space Apps Challenge)

> **Space Mission Design Game & Multiplayer Survival Simulation**  
> *A hybrid 2D top-down spaceship management & real-time 3D orbital space flight simulator.*

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.x-black.svg)](https://socket.io/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-blue.svg)](https://threejs.org/)
[![Spacekit.js](https://img.shields.io/badge/Spacekit.js-1.x-orange.svg)](https://typpo.github.io/spacekit/)
[![NASA Space Apps](https://img.shields.io/badge/NASA_Space_Apps-2026_Challenge-blueviolet.svg)](https://www.spaceappschallenge.org/)

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Game Architecture](#-core-game-architecture)
3. [The Two Perspectives](#-the-two-perspectives)
   - [Inside the Spacecraft (2D Top-Down Simulation)](#1-inside-the-spacecraft-2d-top-down-simulation)
   - [At the Pilot Console (3D Space Flight Simulator)](#2-at-the-pilot-console-3d-space-flight-simulator)
4. [The Lunar Detour & Trade-off Mechanics](#-the-lunar-detour--trade-off-mechanics)
5. [The 10 Ship Compartments](#-the-10-ship-compartments)
6. [Interactive Controls & Keybindings](#-interactive-controls--keybindings)
7. [System Requirements & Installation](#-system-requirements--installation)
8. [Module & File Structure](#-module--file-structure)
9. [Telemetry, Networking & Protocols](#-telemetry-networking--protocols)
10. [Credits & References](#-credits--references)

---

## 🌟 Project Overview

**"Road to Mars"** is an authoritative browser-based multiplayer survival and space mission design game built for the **2026 NASA Space Apps Challenge**. 

Designed for **1 to 6 crewmates** (human players joined over WebSockets, with autonomous AI Bots seamlessly filling empty slots), players work together to maintain a spacecraft en route from Earth to Mars. The crew must balance finite resources: **Delta-V ($\Delta v$) Fuel**, **Oxygen ($O_2$)**, **Food Supplies**, **Ship Mass ($kg$)**, and **Hull Integrity**. 

When engineering failures, asteroid impacts, or critical supply shortages strike, the crew must call **Emergency Meetings** to debate, vote, and—if necessary—eject mass or crewmates through the airlock to ensure the survival of the mission.

---

## 🏗️ Core Game Architecture

```mermaid
graph TD
    Client[Browser Client] <-->|Socket.io WebSockets| Server[Authoritative Node.js Server]
    
    subgraph Client Architecture
        Client --> Renderer2D[2D Canvas Viewport: 3200x2000 World]
        Client --> Cockpit3D[Three.js + Spacekit 3D Cockpit Simulator]
        Client --> NetModule[Net State Synchronizer & Interpolation]
        Client --> HUD[Interactive HUD & Minimap Overlay]
        Client --> AudioSynth[Web Audio Procedural Sound Engine]
    end

    subgraph Server Architecture
        Server --> RoomManager[Lobby & Room State Machine]
        Server --> BotDirector[Autonomous AI Bot Controller]
        Server --> OrbitalPhysics[Orbital Mechanics & Telemetry Loop]
        Server --> LifeSupport[O2, Food, Fuel & Mass Simulation]
        Server --> MeetingManager[Emergency Deliberation & Voting]
    end
```

The game is structured as an authoritative server architecture with zero client-side trust for game state:
- **Authoritative Node.js / Express 5 backend**: Runs high-rate physics and resource simulation loops, calculates orbital transfer burns, checks collision geometry, manages AI crewmates, and handles voting outcomes.
- **Client-side HTML5 Canvas 2D engine**: Renders an authentic top-down cartoon aesthetic with dynamic camera damping, Y-sort depth ordering, raycasted line-of-sight visibility, and interactive mini-tasks.
- **Three.js + Spacekit.js 3D Flight Simulator**: Renders real-time 3D celestial bodies (Sun, Earth, Moon, Mars), procedural asteroid fields, and high-detail GLTF spacecraft models.

---

## 🕹️ The Two Perspectives

### 1. Inside the Spacecraft (2D Top-Down Simulation)
Inside the ship, players control authentic crewmate beans walking through a massive **3200x2000** interconnected spaceship hull inspired by *The Skeld*:
- **Proximity-Based Task Consoles**: Approach consoles to perform mission-critical engineering tasks (O2 scrubber calibration, reactor alignment, circuit breaker rewiring, communications dish targeting).
- **Physical Collision & Y-Sort**: Crewmates, consoles, tables, and machinery are dynamically Y-sorted so characters naturally walk behind or in front of ship equipment.
- **Close Follow Camera (`1.35x` zoom)**: The viewport tracks your crewmate closely, revealing corridors and rooms organically as you navigate the ship.
- **Minimap Overlay (`M` key)**: Displays a full architectural blueprint of all 10 compartments, task alerts (`!`), and live crewmate positioning.

### 2. At the Pilot Console (3D Space Flight Simulator)
Any crewmate who walks into the Navigation Room can press **`PILOT 3D`** (or hotkey **`P`**) to claim the pilot seat and transition seamlessly into a full **3D Space Flight & Orbital Cockpit Simulator**:
- **Real 3D GLTF Spacecraft**: Renders the spacecraft (`craft_cargoA.glb`) with animated glowing engine thruster plumes.
- **Dual Camera Flight Modes (`C` key)**:
  - **3rd-Person Chase Cam**: Trailing camera with smooth positional lag, dynamic banking, and pitch roll response during flight maneuvers.
  - **1st-Person Cockpit POV**: Inside-the-windshield view featuring holographic HUD reticles, target lock boxes on Mars and the Moon, and real-time distance/speed readouts.
- **Active 3D Flight Controls**:
  - `W` / `S`: Throttle adjustments and pitch trim.
  - `A` / `D`: Yaw and bank steering.
  - `SPACE` / `SHIFT`: Afterburner boost with intense particle plumes.
  - `L`: 5-second automated lunar descent maneuver.
  - `ESC`: Instantly release the pilot controls and return to walking in 2D.

---

## 🌕 The Lunar Detour & Trade-off Mechanics

```
                 Direct Hohmann Path (Low Fuel, High Starvation Risk)
       Earth --------------------------------------------------------> Mars
         \                                                            ^
          \-- [Moon Detour] -----------------------------------------/
              - Extra Mission Time (+30 Days)
              - Extra Fuel Burn (Δv: -850 m/s)
              - Heavy Oxygen Consumption (O2: -25%)
              + Harvest Lunar Romy Cheese (جبنة رومي) (Food: +100%)
              + Collect Lunar Scientific Samples (+500 Science Points)
              - Adds Significant Cargo Mass (kg)
```

The pilot faces a critical strategic decision: **Stay on the direct Hohmann transfer** to Mars, or **steer toward the Moon for a lunar landing detour**:
1. **The Risk**: Departing for the Moon expends massive $\Delta v$, burns additional Oxygen, and extends mission flight time.
2. **The Reward**: Landing on the Moon allows crewmates to disembark onto the 2D Lunar surface to harvest high-calorie **Lunar Romy Cheese (جبنة رومي)** and collect valuable Moon Rocks.
3. **The Penalty**: Collecting cheese and rocks adds raw **Mass ($kg$)** to the ship. A heavier ship requires significantly more $\Delta v$ for the final Mars orbital capture burn, forcing the crew to reconsider what cargo—or who—stays onboard!

---

## 🚪 The 10 Ship Compartments

The ship layout spans **`3200 x 2000`** coordinate units with fully modeled bulkheads, metallic gratings, and room-specific machinery:

| # | Room | Coordinates $(X, Y)$ | Primary Function & Consoles |
|---|------|---------------------|-----------------------------|
| 1 | **Cafeteria** | `(1400, 800)` | Primary spawn point, Central Emergency Meeting Table, Food Ration Dispenser. |
| 2 | **Navigation / Cockpit** | `(2750, 950)` | Pilot Console (triggers 3D Flight Simulator), Orbital Trajectory Plotter. |
| 3 | **O2 & Hydroponics** | `(2250, 450)` | CO2 Scrubbing System, Hydroponic Greenhouse, Oxygen Canister Pressure Valves. |
| 4 | **Weapons & Shielding** | `(2350, 1450)` | Meteor Deflection Laser Console, Radiation Shield Calibrator. |
| 5 | **Storage & Cargo Airlock**| `(1500, 1450)` | Cargo Mass Scale, Emergency Ejection Airlock chute. |
| 6 | **Electrical Grid** | `(850, 1350)` | Power Distribution Grid, Wire Repair Panels, Circuit Breakers. |
| 7 | **Science & MedBay** | `(850, 450)` | Lunar Romy Cheese Quality Scanner, Lunar Rock Mass Spectrometer. |
| 8 | **Upper Reactor** | `(300, 600)` | Sub-light Fusion Reactor, Plasma Injector Manifold. |
| 9 | **Lower Reactor** | `(300, 1300)` | Thermal Coolant Regulation, Main Thruster Fuel Feed. |
| 10 | **Security & Comms** | `(600, 950)` | Deep Space Communications Array, Long-Range Telemetry Monitor. |

---

## 🎮 Interactive Controls & Keybindings

### 2D Ship Interior Controls
- **`W`, `A`, `S`, `D` / Arrow Keys**: Move crewmate.
- **`E` / Space / `USE` Button**: Interact with nearby task console, food dispenser, or pilot chair.
- **`P` / `PILOT 3D` Button**: Instantly claim the pilot console and launch the 3D Flight Simulator.
- **`M` / `MAP` Button**: Toggle the Ship Blueprint Minimap overlay.
- **`R` / `REPORT` Button**: Report a body or trigger a crisis notification.
- **`EMERGENCY`**: Call an Emergency Meeting at the Cafeteria table.

### 3D Cockpit Flight Controls
- **`W` / `S`**: Adjust engine throttle (`0%` to `100%`) and pitch control.
- **`A` / `D`**: Yaw and bank steering (`-180°` to `+180°`).
- **`SPACE` / `SHIFT`**: Fire afterburner thrusters (boosts acceleration with particle plumes).
- **`C`**: Toggle Camera: **3rd-Person Chase Cam** ⇄ **1st-Person Cockpit POV**.
- **`L` / `LAND ON MOON`**: Execute 5-second lunar landing sequence.
- **`ESC` / `LEAVE CONTROLS`**: Release pilot seat and return to the 2D interior.

---

## ⚙️ System Requirements & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher (tested on Node.js `v22.x`)
- **NPM**: `v9.0.0` or higher
- **Modern Web Browser**: Chrome, Brave, Firefox, Edge, or Safari with WebGL 2.0 support.

### Quick Start Guide

1. **Navigate to the Project Directory**:
   ```bash
   cd "Road to Mars"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Launch the Game Server**:
   ```bash
   npm start
   ```
   *(For active development with auto-reloading, run `npm run dev`)*

4. **Play the Game**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
   - Enter your **Crewmate Name** and select your **Suit Color**.
   - Create a new room or join an existing room.
   - If playing solo, click **Start Game** and autonomous AI Bots will automatically populate the crew!

---

## 📂 Module & File Structure

```
Road to Mars/
├── package.json              # Project dependencies (Express 5, Socket.io 4.8, CORS)
├── server.js                 # Authoritative Node.js simulation & WebSocket server
├── public/
│   ├── index.html            # Main HTML5 entry point & canvas mounts
│   ├── favicon.png           # Crewmate astronaut icon
│   ├── css/
│   │   └── style.css         # Retro sci-fi HUD, minimap & meeting UI styles
│   ├── js/
│   │   ├── main.js           # Client orchestration & lifecycle coordinator
│   │   ├── net.js            # Socket.io networking, client lerping & packet dispatcher
│   │   ├── renderer.js       # 2D top-down canvas engine, minimap & sprite renderer
│   │   ├── cockpit.js        # Three.js 3D space flight simulator & orbital viewer
│   │   ├── hud.js            # HUD status bars, action buttons & pilot triggers
│   │   ├── ship.js           # 2D player state, proximity interaction & collision logic
│   │   ├── moon.js           # Lunar detour surface exploration & cheese harvesting
│   │   ├── tasks.js          # Interactive engineering mini-game dialogs
│   │   ├── meeting.js        # Emergency meeting voting UI & airlock ejection cutscene
│   │   ├── lobby.js          # Room creation, player color picker & lobby screen
│   │   ├── audio.js          # Web Audio API procedural sound synthesizer
│   │   └── debrief.js        # Mission outcome summary & NASA scoring report
│   └── assets/               # Local sprites, 3D models, planet textures & sound effects
```

---

## 📡 Telemetry, Networking & Protocols

### Key Socket.io Events
- `player:register` / `player:registered`: Authenticates client and assigns initial spawn coordinate.
- `room:create` / `room:join`: Manages lobby formation and peer sync.
- `game:start`: Transitions room to active mission, spawns bots, and starts orbital tick.
- `player:move`: High-frequency client-predicted coordinate broadcast with authoritative server bounds validation.
- `pilot:seat:claim` / `pilot:seat:locked` / `pilot:seat:release`: Authoritative lock ensuring only one pilot controls the 3D ship at any time.
- `moon:land` / `moon:surface:enter`: Synchronizes the lunar landing sequence across all crewmates.
- `resource:update`: Authoritative broadcast of $O_2$, Fuel, Food, Mass, and Hull values.
- `meeting:start` / `meeting:vote` / `meeting:ended`: Deliberation protocol and airlock ejection vote tallying.

---

## 🏆 Credits & References

- **NASA Space Apps Challenge 2026**: Space Mission Design Game category.
- **Three.js**: 3D WebGL rendering engine.
- **Spacekit.js**: Accurate Keplerian orbital trajectory calculations.
- **Kenney.nl**: Space-Kit 3D GLTF models, Planet textures, and Isometric 2D sprite kits.
- **Innersloth**: Inspiration from *Among Us* for social deduction and spacecraft survival mechanics.

---
*Built with ❤️ for the 2026 NASA Space Apps Challenge.*
