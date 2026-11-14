# Road to Mars: Catalog of 3D Models, Photographs, and Game Assets

This catalog documents all authentic NASA 3D models, historical space photographs, and game assets utilized in "Road to Mars" (2026 NASA Space Apps Challenge).

All assets are bundled directly within the `Road to Mars` project folder under `public/nasa-models/` and `public/assets/`, making the game fully self-contained and portable.

---

## 1. Authentic NASA 3D Models (`public/nasa-models/`)

### A. Celestial Bodies, Asteroids, and Landing Sites (STL Format)

1. **Asteroid 101955 Bennu**
   - File Path: `public/nasa-models/Asteroid 101955 Bennu.stl`
   - File Size: 2.4 MB
   - Mission: NASA OSIRIS-REx Sample Return Mission
   - In-Game Role: Encounter obstacle in the 3D Cockpit Asteroid Defense simulator; target for laser cannon scanning (+10 Science).
   - Scientific Background: Carbonaceous B-type rubble-pile asteroid with surface regolith mapped and sampled by OSIRIS-REx in October 2020 and returned to Earth in September 2023.

2. **Asteroid 4179 Toutatis**
   - File Path: `public/nasa-models/Asteroid 4179 Toutatis.stl`
   - File Size: 625 KB
   - Mission: NASA Goldstone Deep Space Communications Complex & Arecibo Radar Astrometry
   - In-Game Role: Chaotic tumbler obstacle in deep space transit flight.
   - Scientific Background: Contact-binary near-Earth asteroid composed of two lobes connected by a narrow neck, exhibiting non-principal axis rotation.

3. **Asteroid 1620 Geographos**
   - File Path: `public/nasa-models/Asteroid 1620 Geographos.stl`
   - File Size: 800 KB
   - Mission: NASA Deep Space Network Radar Observations
   - In-Game Role: Elongated tumbling asteroid hazard in the Mars transfer corridor.
   - Scientific Background: Extreme elongated aspect ratio (> 4:1) siliceous S-type Mars-crosser asteroid.

4. **Asteroid 216 Kleopatra**
   - File Path: `public/nasa-models/Asteroid 216 Kleopatra.stl`
   - File Size: 200 KB
   - Mission: Arecibo Radar & European Southern Observatory (VLT/SPHERE)
   - In-Game Role: Metallic dog-bone obstacle in the orbital corridor.
   - Scientific Background: Main-belt metallic asteroid with two natural orbiting shepherd moons (Alexhelios and Cleoselene).

5. **Asteroid 25143 Itokawa**
   - File Path: `public/nasa-models/Asteroid 25143 Itokawa.stl`
   - File Size: 9.6 MB
   - Mission: JAXA Hayabusa Sample Return Mission
   - In-Game Role: High-mass rubble-pile hazard encountered during emergency telemetry alert waves.
   - Scientific Background: Contact-binary rubble pile with distinct gravel lowlands (Muses Sea) and high boulder density.

6. **Martian Meteorite: Block Island**
   - File Path: `public/nasa-models/Block Island.stl`
   - File Size: 6.9 MB
   - Mission: NASA Mars Exploration Rover Opportunity (MER-B)
   - In-Game Role: Dense iron meteorite hazard in orbital space and collectible science artifact on Martian descent.
   - Scientific Background: Largest iron-nickel meteorite found on Mars, discovered by rover Opportunity in Meridiani Planum in July 2009.

7. **Apollo 14 Lunar Landing Site**
   - File Path: `public/nasa-models/Apollo 14 - Landing Site.stl`
   - File Size: 6.7 MB
   - Mission: NASA Apollo 14 Lunar Surface Mission (February 1971)
   - In-Game Role: 3D terrain elevation mesh used for Lunar detour approaches and interactive archive inspection.
   - Scientific Background: Digital Elevation Model (DEM) of Fra Mauro crater highlands and the Cone Crater ridge.

8. **Curiosity Rover Landing Site (Bradbury Landing / Gale Crater)**
   - File Path: `public/nasa-models/Curiosity Landing Site.stl`
   - File Size: 2.7 MB
   - Mission: NASA Mars Science Laboratory (MSL)
   - In-Game Role: 3D landing site model of Gale Crater and Mount Sharp for Martian orbital insertion.
   - Scientific Background: 3D topographical scan of Bradbury Landing within Gale Crater, exploring ancient fluvial sediments.

---

### B. Spacesuits and Astronauts (GLB Format)

9. **NASA Astronaut (EVA Spacewalk)**
   - File Path: `public/nasa-models/Astronaut.glb`
   - File Size: 746 KB
   - In-Game Role: Rendered in 3D orbit outside the spacecraft performing extravehicular maintenance, standing on the Lunar landing surface, and available in the NASA Archive 3D viewer.
   - Scientific Background: Full Extravehicular Mobility Unit configuration with Primary Life Support System (PLSS) backpack.

10. **Extravehicular Mobility Unit (EMU)**
    - File Path: `public/nasa-models/Extravehicular Mobility Unit.glb`
    - File Size: 3.3 MB
    - In-Game Role: Microgravity spacewalking suit model available in the NASA Archive 3D viewer.
    - Scientific Background: Anthropomorphic pressure suit used aboard the Space Shuttle and International Space Station for EVA operations.

11. **Advanced Crew Escape Suit (ACES)**
    - File Path: `public/nasa-models/Advanced Crew Escape Suit.glb`
    - File Size: 839 KB
    - In-Game Role: Launch and re-entry pressure suit model in the NASA Archive viewer.
    - Scientific Background: High-visibility orange full-pressure flight suit worn by Space Shuttle crews from STS-64 onward.

12. **NASA Z2 Prototype Mars Exploration Spacesuit**
    - File Path: `public/nasa-models/Z2 Spacesuit.glb`
    - File Size: 17.0 MB
    - In-Game Role: Surface exploration spacesuit model on the Lunar/Martian surface and in the NASA Archive viewer.
    - Scientific Background: Next-generation planetary exploration suit featuring a rigid composite torso and rear-entry suitport hatch for Mars exploration.

---

## 2. Authentic NASA Space Photographs (`public/nasa-models/`)

13. **Apollo 11 - View of the Moon**
    - File Path: `public/nasa-models/Apollo 11 - View of the Moon.jpg`
    - File Size: 2.9 MB
    - Resolution: High-definition 70mm Hasselblad capture
    - In-Game Role: Applied directly as the standard spherical texture map on the 3D Moon (`moonMesh`) in `cockpit.js`; viewable in the NASA Archive photo viewer.
    - Historical Context: Authentic color photograph of the Moon taken by Neil Armstrong, Buzz Aldrin, and Michael Collins during the Apollo 11 mission in July 1969.

14. **Earth from Space (Earth B)**
    - File Path: `public/nasa-models/Earth (B).jpg`
    - File Size: 2.4 MB
    - Resolution: High-definition orbital satellite composite
    - In-Game Role: Applied directly as the standard spherical texture map on planet Earth (`earthMesh`) in `cockpit.js`; viewable in the NASA Archive photo viewer.
    - Historical Context: True-color NASA satellite orbital photograph showing continental formations, atmospheric cloud spirals, and oceans.

---

## 3. Kenney 3D Spacecraft and Environment Models (`public/assets/kenney_space-kit/Models/GLTF format/`)

- `craft_cargoA.glb`: Primary 3D Crewed Spacecraft hull (The Skeld equivalent).
- `craft_speederA.glb`: High-speed exploration spacecraft mesh.
- `satelliteDish_detailed.glb`: Deep Space Network (DSN) communications antenna satellite.
- `rover.glb`: Unmanned autonomous lunar exploration rover.
- `meteor_detailed.glb`: Fragmented orbital space meteor.
- `rock_largeA.glb`: Large silicate asteroid block.

---

## 4. 2D Ship Interior Sprites and Isometric Equipment (`public/assets/kenney_space-kit/Isometric/`)

- Consoles and Computers: `desk_computerScreen_SE.png`, `desk_computerCorner_SE.png`, `desk_computer_SE.png`.
- Power and Life Support: `machine_generatorLarge_SE.png`, `machine_barrelLarge_SE.png`, `machine_wireless_SE.png`.
- Antennas and Science: `satelliteDish_detailed_SE.png`, `barrels_rail_SE.png`.
- Cockpit and Seating: `desk_chair_SE.png`, `desk_chairArms_SE.png`.
- Lunar Surface: `rover_SE.png`, `craterLarge_SE.png`, `crater_SE.png`, `rock_crystalsLargeA_SE.png`, `astronautA_SE.png`.

---

## 5. UI and Audio Assets (`public/assets/icons/`, `public/assets/sounds/`)

- Action Buttons: `use.png`, `report.png`, `kill.png`.
- Sound Effects: `alert.ogg` (Klaxon alarm), `overg.ogg` (Hull stress), `pullup.ogg` (Collision warning), `bang.ogg` (Laser cannon hit / explosion), `lockondone.ogg` (Radar lock), `voice_start_a.ogg` (Mission start chime).

---

## 6. How to Access the In-Game NASA 3D Archive Viewer

1. Launch the game at `http://localhost:3000`.
2. In the Hangar Bay lobby, click the button labeled `NASA 3D ARCHIVE`.
3. Use the filter tabs (`ALL`, `3D MODELS`, `PHOTOS`) to browse all 14 assets.
4. For 3D models:
   - Click and drag with the left mouse button to rotate in 3D.
   - Use the mouse scroll wheel to zoom in and out.
   - Click `WIREFRAME` to inspect geometry polygon topology.
   - Click `AUTO-ROTATE` to pause or resume orbital rotation.
   - Click `RESET VIEW` to re-center the camera.
5. For photographs:
   - View high-resolution Apollo 11 and Earth satellite imagery along with mission camera data and metadata.
