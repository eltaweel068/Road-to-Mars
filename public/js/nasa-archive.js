window.RTM = window.RTM || {};
window.RTM.NasaArchive = (function () {
  'use strict';

  var ARCHIVE_CATALOG = [
    // ── ASTEROIDS & METEORITES ──
    {
      id: 'bennu',
      title: 'Asteroid 101955 Bennu',
      category: '3d',
      format: 'STL 3D Model',
      size: '2.4 MB',
      url: '/nasa-models/Asteroid 101955 Bennu.stl',
      mission: 'NASA OSIRIS-REx Mission',
      scaleType: 'asteroid',
      scaleRatio: '1 : 250 SCALE vs. 1.8m ASTRONAUT',
      description: 'Ancient carbon-rich near-Earth rubble pile asteroid. OSIRIS-REx successfully mapped its rocky surface, collected surface regolith in 2020, and returned pristine asteroid samples to Earth in September 2023.',
      stats: { diameter: '492 m', mass: '7.329e10 kg', rotation: '4.297 hours', spectralType: 'B-type' }
    },
    {
      id: 'toutatis',
      title: 'Asteroid 4179 Toutatis',
      category: '3d',
      format: 'STL 3D Model',
      size: '625 KB',
      url: '/nasa-models/Asteroid 4179 Toutatis.stl',
      mission: 'Goldstone & Arecibo Radar Astrometry / Chang\'e 2 Flyby',
      scaleType: 'asteroid',
      scaleRatio: '1 : 2000 SCALE vs. 1.8m ASTRONAUT',
      description: 'Slow, chaotic tumbler with no fixed rotation axis. Toutatis consists of two distinct lobes connected by a narrow neck, thought to be formed from the gentle contact-binary merger of two ancient planetesimals.',
      stats: { dimensions: '4.5 x 2.4 x 1.9 km', period: '5.4 days', classification: 'Apollo / Alinda' }
    },
    {
      id: 'geographos',
      title: 'Asteroid 1620 Geographos',
      category: '3d',
      format: 'STL 3D Model',
      size: '800 KB',
      url: '/nasa-models/Asteroid 1620 Geographos.stl',
      mission: 'NASA Deep Space Network Radar Observations',
      scaleType: 'asteroid',
      scaleRatio: '1 : 2500 SCALE vs. 1.8m ASTRONAUT',
      description: 'One of the most elongated known natural celestial bodies in the Solar System, possessing an extreme length-to-width aspect ratio exceeding 4:1.',
      stats: { dimensions: '5.0 x 2.0 x 1.2 km', rotation: '5.22 hours', spectralType: 'S-type (siliceous)' }
    },
    {
      id: 'kleopatra',
      title: 'Asteroid 216 Kleopatra',
      category: '3d',
      format: 'STL 3D Model',
      size: '200 KB',
      url: '/nasa-models/Asteroid 216 Kleopatra.stl',
      mission: 'Arecibo Radar / ESO Very Large Telescope (SPHERE)',
      scaleType: 'asteroid',
      scaleRatio: '1 : 100,000 SCALE vs. 1.8m ASTRONAUT',
      description: 'Remarkable metallic dog-bone asteroid situated in the main asteroid belt with two small orbiting natural satellites: Alexhelios and Cleoselene.',
      stats: { dimensions: '217 x 94 x 81 km', composition: 'Nickel-Iron & Enstatite', moons: '2' }
    },
    {
      id: 'itokawa',
      title: 'Asteroid 25143 Itokawa',
      category: '3d',
      format: 'STL 3D Model',
      size: '9.6 MB',
      url: '/nasa-models/Asteroid 25143 Itokawa.stl',
      mission: 'JAXA Hayabusa Sample Return Mission',
      scaleType: 'asteroid',
      scaleRatio: '1 : 300 SCALE vs. 1.8m ASTRONAUT',
      description: 'Sub-kilometer peanut-shaped rubble-pile asteroid with negligible internal gravity. High-resolution 3D topography reveals boulder-strewn highlands (rough terrain) and fine-gravel lowlands (Muses Sea).',
      stats: { dimensions: '535 x 294 x 209 m', density: '1.9 g/cm³', porosity: '40% porous' }
    },
    {
      id: 'block_island',
      title: 'Martian Meteorite: Block Island',
      category: '3d',
      format: 'STL 3D Model',
      size: '6.9 MB',
      url: '/nasa-models/Block Island.stl',
      mission: 'NASA Mars Exploration Rover Opportunity (MER-B)',
      scaleType: 'life',
      scaleRatio: '1 : 1 FULL SCALE (0.6m METEORITE)',
      description: 'Largest iron meteorite ever discovered on the surface of Mars. Discovered by rover Opportunity in Meridiani Planum in July 2009. Composed predominantly of iron and nickel.',
      stats: { width: '60 cm', discovered: 'Sol 1957 (2009)', site: 'Meridiani Planum, Mars' }
    },
    {
      id: 'vesta',
      title: 'Asteroid 4 Vesta',
      category: '3d',
      format: 'GLB 3D Model',
      size: '14 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/meteor_detailed.glb',
      mission: 'NASA Dawn Orbiter Mission (2011-2012)',
      scaleType: 'asteroid',
      scaleRatio: '1 : 250,000 SCALE vs. 1.8m ASTRONAUT',
      description: 'Second-largest body in the asteroid belt. NASA Dawn confirmed Vesta is a differentiated protoplanet with a metallic iron core, basaltic crust, and the titanic Rheasilvia impact basin.',
      stats: { diameter: '525 km', mass: '2.59e20 kg', period: '5.342 hours', spectralType: 'V-type (basaltic)' }
    },
    {
      id: 'eros',
      title: 'Asteroid 433 Eros',
      category: '3d',
      format: 'GLB 3D Model',
      size: '6 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/meteor.glb',
      mission: 'NASA NEAR Shoemaker Mission (2000-2001)',
      scaleType: 'asteroid',
      scaleRatio: '1 : 15,000 SCALE vs. 1.8m ASTRONAUT',
      description: 'First near-Earth asteroid orbited and landed upon by a robotic spacecraft. Elongated S-type asteroid covered in craters, fracture troughs, and dense boulder fields.',
      stats: { dimensions: '34.4 x 11.2 x 11.2 km', rotation: '5.27 hours', spectralType: 'S-type' }
    },
    {
      id: 'mithra',
      title: 'Asteroid 4486 Mithra',
      category: '3d',
      format: 'GLB 3D Model',
      size: '13 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/rock_largeA.glb',
      mission: 'Goldstone & Arecibo Radar Astrometry',
      scaleType: 'asteroid',
      scaleRatio: '1 : 1200 SCALE vs. 1.8m ASTRONAUT',
      description: 'Highly bifurcated contact-binary asteroid featuring two large touching lobes observed by delay-Doppler radar imaging during close terrestrial flybys.',
      stats: { dimensions: '2.3 x 1.8 x 1.4 km', rotation: '67.5 hours', classification: 'Apollo Asteroid' }
    },
    {
      id: 'golevka',
      title: 'Asteroid 6489 Golevka',
      category: '3d',
      format: 'GLB 3D Model',
      size: '13 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/rock_largeB.glb',
      mission: 'International Radar Campaign (Goldstone, Evpatoria, Kashima)',
      scaleType: 'asteroid',
      scaleRatio: '1 : 300 SCALE vs. 1.8m ASTRONAUT',
      description: 'Angular, blocky near-Earth asteroid used in 2003 to make the first direct detection of the Yarkovsky effect (orbital drift driven by asymmetric thermal photon re-emission).',
      stats: { dimensions: '0.6 x 0.5 x 0.5 km', drift: '15 km over 12 yrs (Yarkovsky)', type: 'Apollo / Q-type' }
    },

    // ── LANDING SITES (DIGITAL ELEVATION MODELS) ──
    {
      id: 'apollo14_site',
      title: 'Apollo 14 Lunar Landing Site',
      category: '3d',
      format: 'STL Digital Elevation Model',
      size: '6.7 MB',
      url: '/nasa-models/Apollo 14 - Landing Site.stl',
      mission: 'NASA Apollo 14 Lunar Surface Exploration',
      isTerrain: true,
      terrainType: 'lunar',
      scaleType: 'terrain',
      scaleRatio: '1 : 1000 DEM DIGITAL ELEVATION TABLE',
      description: 'Digital Elevation Model (DEM) of the Fra Mauro lunar highlands where astronauts Alan Shepard and Edgar Mitchell landed the Lunar Module Antares in February 1971.',
      stats: { coordinates: '3.6453° S, 17.4714° W', destination: 'Cone Crater', date: 'February 5, 1971' }
    },
    {
      id: 'curiosity_site',
      title: 'Curiosity Rover Landing Site',
      category: '3d',
      format: 'STL Digital Elevation Model',
      size: '2.7 MB',
      url: '/nasa-models/Curiosity Landing Site.stl',
      mission: 'NASA Mars Science Laboratory (MSL)',
      isTerrain: true,
      terrainType: 'mars',
      scaleType: 'terrain',
      scaleRatio: '1 : 1500 DEM DIGITAL ELEVATION TABLE',
      description: '3D digital topography of the Bradbury Landing site inside Gale Crater, Mars, directly adjacent to Mount Sharp (Aeolis Mons), exploring ancient Martian habitability.',
      stats: { landingSite: 'Gale Crater, Mars', landingDate: 'August 6, 2012', vehicle: 'Curiosity Rover' }
    },

    // ── SPACESUITS & EVA GEAR ──
    {
      id: 'astronaut_eva',
      title: 'NASA Astronaut (EVA Spacewalk)',
      category: '3d',
      format: 'GLB 3D Model',
      size: '746 KB',
      url: '/nasa-models/Astronaut.glb',
      mission: 'NASA Extravehicular Activity (EVA)',
      scaleType: 'life',
      scaleRatio: '1 : 1 FULL SCALE (1.8m ASTRONAUT)',
      description: 'Full 3D model of a NASA astronaut outfitted for extravehicular operations in the vacuum of deep space and low Earth orbit, complete with PLSS life-support backpack.',
      stats: { environment: 'Vacuum / Microgravity', lifeSupport: '7+ hours O2', visor: 'Gold-coated thermal foil' }
    },
    {
      id: 'emu_suit',
      title: 'Extravehicular Mobility Unit (EMU)',
      category: '3d',
      format: 'GLB 3D Model',
      size: '3.3 MB',
      url: '/nasa-models/Extravehicular Mobility Unit.glb',
      mission: 'Space Shuttle & International Space Station',
      scaleType: 'life',
      scaleRatio: '1 : 1 FULL SCALE (EMU SPACESUIT)',
      description: 'Independent anthropomorphic space suit system providing environmental protection, mobility, life support, and communications for spacewalking astronauts.',
      stats: { suitMass: '145 kg (Earth)', operatingPressure: '4.3 psi (100% O2)', layers: '14 multi-layer fabric' }
    },
    {
      id: 'aces_suit',
      title: 'Advanced Crew Escape Suit (ACES)',
      category: '3d',
      format: 'GLB 3D Model',
      size: '839 KB',
      url: '/nasa-models/Advanced Crew Escape Suit.glb',
      mission: 'NASA Space Shuttle Program (STS-64 to STS-135)',
      scaleType: 'life',
      scaleRatio: '1 : 1 FULL SCALE (ACES FLIGHT SUIT)',
      description: 'Iconic high-visibility "pumpkin suit" full-pressure flight suit worn by Space Shuttle crews during launch and atmospheric re-entry for high-altitude emergency escape.',
      stats: { pressure: '3.5 psi', color: 'International Orange', survivalGear: 'Integrated raft & beacon' }
    },
    {
      id: 'z2_suit',
      title: 'NASA Z2 Prototype Mars Spacesuit',
      category: '3d',
      format: 'GLB 3D Model',
      size: '17 MB',
      url: '/nasa-models/Z2 Spacesuit.glb',
      mission: 'NASA Advanced Exploration Systems (Planetary Prototype)',
      scaleType: 'life',
      scaleRatio: '1 : 1 FULL SCALE (MARS SURFACE PROTOTYPE)',
      description: 'Next-generation prototype planetary surface spacesuit engineered with composite hard upper torso, rear-entry suitport compatibility, and advanced shoulder/hip mobility bearings for Mars exploration.',
      stats: { destination: 'Mars Surface Exploration', entry: 'Rear Hatch Suitport', torso: 'Carbon-fiber composite' }
    },

    // ── SPACECRAFT & ROVERS ──
    {
      id: 'mars_rover',
      title: 'Mars Exploration Rover (Spirit & Opportunity)',
      category: 'spacecraft',
      format: 'GLB 3D Model',
      size: '13 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/rover.glb',
      mission: 'NASA MER Project (Spirit & Opportunity)',
      scaleType: 'spacecraft',
      scaleRatio: '1 : 1 FULL SCALE (1.6m x 2.3m ROVER)',
      description: 'Six-wheel rocker-bogie solar-powered robotic explorer equipped with Pancam mast and robotic arm spectrometer, proving past liquid water on Mars.',
      stats: { mass: '185 kg', power: '140W Solar', topSpeed: '5 cm/s', chassis: 'Rocker-Bogie' }
    },
    {
      id: 'dsn_antenna',
      title: 'Deep Space Network 34m High-Gain Antenna',
      category: 'spacecraft',
      format: 'GLB 3D Model',
      size: '26 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/satelliteDish_detailed.glb',
      mission: 'NASA Deep Space Network (DSN Goldstone/Madrid/Canberra)',
      scaleType: 'spacecraft',
      scaleRatio: '1 : 20 SCALE vs. 1.8m ASTRONAUT',
      description: 'Beam waveguide parabolic dish antenna supporting continuous interplanetary communications, telemetry uplinks, and radio science for missions traversing the Solar System.',
      stats: { frequency: 'X-Band / Ka-Band', diameter: '34 meters', range: 'Deep Space / Interplanetary' }
    },
    {
      id: 'cargo_transport',
      title: 'Orbital Logistics Cargo Transport',
      category: 'spacecraft',
      format: 'GLB 3D Model',
      size: '19 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/craft_cargoA.glb',
      mission: 'Mars Expedition Supply Logistics System',
      scaleType: 'spacecraft',
      scaleRatio: '1 : 5 SCALE vs. 1.8m ASTRONAUT',
      description: 'Autonomous pressurized orbital transport craft engineered to haul dehydrated crew rations, oxygen filtration scrubbers, and scientific drill payloads between planetary orbits.',
      stats: { payloadCapacity: '800 kg', propulsion: 'Bipropellant Hydrazine', docking: 'NASA IDSS Standard' }
    },
    {
      id: 'space_interceptor',
      title: 'Deep Space Interceptor Escort',
      category: 'spacecraft',
      format: 'GLB 3D Model',
      size: '20 KB',
      url: '/assets/kenney_space-kit/Models/GLTF format/craft_speederA.glb',
      mission: 'Planetary Defense & Hazard Escort System',
      scaleType: 'spacecraft',
      scaleRatio: '1 : 4 SCALE vs. 1.8m ASTRONAUT',
      description: 'High-agility piloted spacecraft featuring pulsed magnetoplasma thrusters and twin forward kinetic laser arrays for active asteroid hazard deflection.',
      stats: { deltaV: '12 km/s', thrusters: 'VASIMR Plasma Engines', weapons: 'Twin Pulse Deflection Lasers' }
    },

    // ── HIGH-RES PHOTOGRAPHS ──
    {
      id: 'apollo11_moon_photo',
      title: 'Apollo 11 - View of the Moon',
      category: 'photo',
      format: 'High-Res NASA Photograph',
      size: '2.9 MB',
      url: '/nasa-models/Apollo 11 - View of the Moon.jpg',
      mission: 'NASA Apollo 11 Lunar Landing Mission (July 1969)',
      description: 'Authentic 70mm Hasselblad color photograph of the Moon captured by the Apollo 11 crew during their historic translunar coast to humanity\'s first lunar landing.',
      stats: { camera: 'Hasselblad 500EL 70mm', film: 'Kodak Ektachrome', missionDate: 'July 16-24, 1969' }
    },
    {
      id: 'earth_b_photo',
      title: 'Earth from Space (Earth B)',
      category: 'photo',
      format: 'High-Res NASA Photograph',
      size: '2.4 MB',
      url: '/nasa-models/Earth (B).jpg',
      mission: 'NASA Earth Observation System',
      description: 'High-resolution true-color satellite photograph of planet Earth from orbit, highlighting the deep blue oceans, reflective cloud patterns, and sunlit atmospheric terminator.',
      stats: { resolution: 'Ultra High-Def', origin: 'NASA Goddard Space Flight Center', target: 'Planet Earth' }
    }
  ];

  var els = {};
  var open = false;
  var currentItem = null;
  var currentFilter = 'all';

  // Three.js viewer state
  var scene = null;
  var camera = null;
  var renderer = null;
  var currentModelMesh = null;
  var currentOriginalMaterials = [];
  var astronautScaleFigure = null;
  var animFrameId = null;
  var isDragging = false;
  var prevMousePos = { x: 0, y: 0 };
  var autoRotate = true;
  var isWireframe = false;
  var isThermal = false;
  var showAstronautScale = false;
  var asteroidBumpTex = null;

  function ensureSphericalUVs(geometry) {
    if (!geometry) return geometry;
    var pos = geometry.getAttribute('position');
    if (!pos) return geometry;
    var count = pos.count;
    var uvs = new Float32Array(count * 2);
    for (var i = 0; i < count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      var z = pos.getZ(i);
      var len = Math.hypot(x, y, z) || 1.0;
      var nx = x / len;
      var ny = y / len;
      var nz = z / len;
      var u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
      var v = 0.5 - Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.uvsNeedUpdate = true;
    return geometry;
  }

  function getAsteroidBumpTexture() {
    if (!asteroidBumpTex && typeof THREE.TextureLoader !== 'undefined') {
      var loader = new THREE.TextureLoader();
      asteroidBumpTex = loader.load('/assets/kenney_planets/Parts/noise05.png');
      asteroidBumpTex.wrapS = THREE.RepeatWrapping;
      asteroidBumpTex.wrapT = THREE.RepeatWrapping;
      asteroidBumpTex.repeat.set(3, 3);
    }
    return asteroidBumpTex;
  }

  function cache() {
    els.modal = document.getElementById('nasaArchiveModal');
    els.close = document.getElementById('nasaArchiveClose');
    els.list = document.getElementById('archiveItemList');
    els.viewport3d = document.getElementById('archiveViewport3d');
    els.viewportPhoto = document.getElementById('archiveViewportPhoto');
    els.photoImg = document.getElementById('archivePhotoImg');
    els.title = document.getElementById('archiveItemTitle');
    els.metaRow = document.getElementById('archiveMetaRow');
    els.fact = document.getElementById('archiveItemFact');
    els.mission = document.getElementById('archiveItemMission');
    els.wireframeBtn = document.getElementById('archiveWireframeBtn');
    els.rotateBtn = document.getElementById('archiveRotateBtn');
    els.thermalBtn = document.getElementById('archiveThermalBtn');
    els.scaleBtn = document.getElementById('archiveScaleBtn');
    els.scaleBadge = document.getElementById('archiveScaleBadge');
    els.resetCamBtn = document.getElementById('archiveResetCamBtn');
    els.tabs = document.querySelectorAll('.archive-tab');
  }

  function initThreeViewer() {
    if (renderer || !els.viewport3d) return;

    var width = els.viewport3d.clientWidth || 540;
    var height = els.viewport3d.clientHeight || 380;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060912);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    els.viewport3d.appendChild(renderer.domElement);

    // Subtle star grid
    var gridHelper = new THREE.GridHelper(30, 30, 0x1d3557, 0x0f1d30);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // Lights
    var ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    var dirLight1 = new THREE.DirectionalLight(0xfff5e6, 1.5);
    dirLight1.position.set(20, 25, 20);
    scene.add(dirLight1);

    var dirLight2 = new THREE.DirectionalLight(0x38fedc, 0.7);
    dirLight2.position.set(-20, -10, -15);
    scene.add(dirLight2);

    // Mouse controls for 3D viewport
    var dom = renderer.domElement;
    dom.addEventListener('mousedown', function (e) {
      isDragging = true;
      prevMousePos.x = e.clientX;
      prevMousePos.y = e.clientY;
    });

    window.addEventListener('mouseup', function () {
      isDragging = false;
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging || !currentModelMesh || !open) return;
      var dx = e.clientX - prevMousePos.x;
      var dy = e.clientY - prevMousePos.y;
      prevMousePos.x = e.clientX;
      prevMousePos.y = e.clientY;

      currentModelMesh.rotation.y += dx * 0.01;
      currentModelMesh.rotation.x += dy * 0.01;
      autoRotate = false;
      if (els.rotateBtn) els.rotateBtn.classList.remove('active');
    });

    dom.addEventListener('wheel', function (e) {
      if (!open) return;
      e.preventDefault();
      camera.position.z = Math.max(4, Math.min(65, camera.position.z + e.deltaY * 0.03));
    }, { passive: false });

    startRenderLoop();
  }

  function startRenderLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    function loop() {
      if (open && renderer && scene && camera) {
        if (autoRotate && currentModelMesh) {
          currentModelMesh.rotation.y += 0.008;
        }
        renderer.render(scene, camera);
      }
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function renderCatalogList() {
    if (!els.list) return;
    els.list.innerHTML = '';

    var filtered = ARCHIVE_CATALOG.filter(function (item) {
      if (currentFilter === 'all') return true;
      return item.category === currentFilter;
    });

    filtered.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'archive-item-card' + (currentItem && currentItem.id === item.id ? ' active' : '');
      card.setAttribute('data-id', item.id);

      var badgeClass = 'badge-3d';
      var badgeText = '3D MODEL';
      if (item.category === 'photo') {
        badgeClass = 'badge-photo';
        badgeText = 'PHOTO';
      } else if (item.category === 'spacecraft') {
        badgeClass = 'badge-spacecraft';
        badgeText = 'SPACECRAFT';
      }

      card.innerHTML = [
        '<div class="card-head">',
        '  <span class="card-badge ' + badgeClass + '">' + badgeText + '</span>',
        '  <span class="card-size">' + item.size + '</span>',
        '</div>',
        '<div class="card-title">' + item.title + '</div>',
        '<small class="card-mission">' + item.mission + '</small>'
      ].join('');

      card.addEventListener('click', function () {
        selectItem(item);
      });

      els.list.appendChild(card);
    });
  }

  function selectItem(item) {
    if (!item) return;
    currentItem = item;

    // Highlight selected card in list
    var cards = els.list.querySelectorAll('.archive-item-card');
    cards.forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-id') === item.id);
    });

    // Update Details
    if (els.title) els.title.textContent = item.title;
    if (els.fact) els.fact.textContent = item.description;
    if (els.mission) {
      els.mission.innerHTML = '<strong>MISSION:</strong> ' + item.mission + ' &bull; <strong>FORMAT:</strong> ' + item.format;
    }

    // Update Meta Stats Row
    if (els.metaRow) {
      var metaHtml = '';
      if (item.stats) {
        Object.keys(item.stats).forEach(function (key) {
          var label = key.toUpperCase();
          var val = item.stats[key];
          metaHtml += '<span class="archive-stat-tag"><b>' + label + ':</b> ' + val + '</span>';
        });
      }
      els.metaRow.innerHTML = metaHtml;
    }

    // Reset thermal & scale buttons for new selection
    isThermal = false;
    if (els.thermalBtn) els.thermalBtn.classList.remove('active');
    showAstronautScale = false;
    if (els.scaleBtn) els.scaleBtn.classList.remove('active');
    if (els.scaleBadge) els.scaleBadge.style.display = 'none';

    if (item.category === 'photo') {
      // Photo viewer mode
      if (els.viewport3d) els.viewport3d.style.display = 'none';
      if (els.viewportPhoto) {
        els.viewportPhoto.style.display = 'flex';
        els.photoImg.src = item.url;
      }
      if (els.wireframeBtn) els.wireframeBtn.style.display = 'none';
      if (els.rotateBtn) els.rotateBtn.style.display = 'none';
      if (els.thermalBtn) els.thermalBtn.style.display = 'none';
      if (els.scaleBtn) els.scaleBtn.style.display = 'none';
      if (els.resetCamBtn) els.resetCamBtn.style.display = 'none';
    } else {
      // 3D model mode
      if (els.viewportPhoto) els.viewportPhoto.style.display = 'none';
      if (els.viewport3d) els.viewport3d.style.display = 'block';
      if (els.wireframeBtn) els.wireframeBtn.style.display = 'inline-block';
      if (els.rotateBtn) els.rotateBtn.style.display = 'inline-block';
      if (els.thermalBtn) els.thermalBtn.style.display = 'inline-block';
      if (els.scaleBtn) els.scaleBtn.style.display = 'inline-block';
      if (els.resetCamBtn) els.resetCamBtn.style.display = 'inline-block';

      loadModelIntoViewer(item);
    }
  }

  function applyThermalShader(mesh, active) {
    if (!mesh) return;
    mesh.traverse(function (child) {
      if (!child.isMesh) return;
      if (active) {
        var geo = child.geometry;
        if (!geo) return;
        var pos = geo.getAttribute('position');
        if (!pos) return;
        var count = pos.count;
        var colors = new Float32Array(count * 3);
        var minY = Infinity, maxY = -Infinity;
        for (var i = 0; i < count; i++) {
          var y = pos.getY(i);
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        var range = (maxY - minY) || 1.0;
        for (var j = 0; j < count; j++) {
          var t = (pos.getY(j) - minY) / range;
          // Thermal gradient: Blue (0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1.0)
          var r = Math.max(0, Math.min(1, 4 * t - 2));
          var g = Math.max(0, Math.min(1, t < 0.5 ? 4 * t : 4 * (1 - t)));
          var b = Math.max(0, Math.min(1, 2 - 4 * t));
          colors[j * 3]     = r;
          colors[j * 3 + 1] = g;
          colors[j * 3 + 2] = b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        child.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.5,
          metalness: 0.1,
          wireframe: isWireframe
        });
      } else {
        // Restore original material
        if (child.userData.origMaterial) {
          child.material = child.userData.origMaterial;
          child.material.wireframe = isWireframe;
        }
      }
    });
  }

  function buildAstronautReferenceFigure() {
    var group = new THREE.Group();
    // Body / Suit (1.8m height)
    var suitMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0.2 });
    var visorMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.1, metalness: 0.9 });
    var packMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });

    // Torso
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.75, 12), suitMat);
    torso.position.y = 0.95;
    group.add(torso);

    // Helmet
    var helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), suitMat);
    helmet.position.y = 1.48;
    group.add(helmet);

    // Gold Visor
    var visor = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), visorMat);
    visor.scale.set(0.9, 0.7, 1.1);
    visor.position.set(0, 1.48, 0.12);
    group.add(visor);

    // PLSS Backpack
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.22), packMat);
    pack.position.set(0, 1.05, -0.22);
    group.add(pack);

    // Legs
    var legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8), suitMat);
    legL.position.set(-0.16, 0.35, 0);
    var legR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8), suitMat);
    legR.position.set(0.16, 0.35, 0);
    group.add(legL);
    group.add(legR);

    // Arms
    var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6, 8), suitMat);
    armL.position.set(-0.38, 0.95, 0);
    var armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.6, 8), suitMat);
    armR.position.set(0.38, 0.95, 0);
    group.add(armL);
    group.add(armR);

    return group;
  }

  function toggleAstronautScale(active) {
    showAstronautScale = active;
    if (astronautScaleFigure && scene) {
      scene.remove(astronautScaleFigure);
      astronautScaleFigure = null;
    }
    if (!active || !currentModelMesh || !currentItem) {
      if (els.scaleBadge) els.scaleBadge.style.display = 'none';
      return;
    }

    astronautScaleFigure = buildAstronautReferenceFigure();
    // Scale figure relative to object scale
    var figScale = 1.6;
    if (currentItem.scaleType === 'asteroid') {
      figScale = 0.5;
    } else if (currentItem.scaleType === 'terrain') {
      figScale = 0.35;
    } else if (currentItem.scaleType === 'life') {
      figScale = 3.6;
    } else if (currentItem.scaleType === 'spacecraft') {
      figScale = 1.8;
    }

    astronautScaleFigure.scale.set(figScale, figScale, figScale);
    astronautScaleFigure.position.set(6.2, -4.5, 2);
    scene.add(astronautScaleFigure);

    if (els.scaleBadge) {
      els.scaleBadge.textContent = currentItem.scaleRatio || 'SCALE: 1:1 HUMAN REFERENCE';
      els.scaleBadge.style.display = 'block';
    }
  }

  function loadModelIntoViewer(item) {
    if (!scene) initThreeViewer();
    if (!scene) return;

    // Clear previous model & scale figure
    if (currentModelMesh) {
      scene.remove(currentModelMesh);
      currentModelMesh = null;
    }
    if (astronautScaleFigure) {
      scene.remove(astronautScaleFigure);
      astronautScaleFigure = null;
    }
    if (els.scaleBadge) els.scaleBadge.style.display = 'none';

    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);

    var isStl = item.url.toLowerCase().endsWith('.stl');

    if (isStl && typeof THREE.STLLoader !== 'undefined') {
      var stlLoader = new THREE.STLLoader();
      stlLoader.load(item.url, function (geometry) {
        geometry.computeVertexNormals();
        geometry.center();

        var mat;
        if (item.isTerrain) {
          // Topographic Elevation Color Ramp Shader
          var pos = geometry.getAttribute('position');
          var count = pos.count;
          var colors = new Float32Array(count * 3);
          var minY = Infinity, maxY = -Infinity;
          for (var vi = 0; vi < count; vi++) {
            var y = pos.getY(vi);
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          var hRange = (maxY - minY) || 1.0;
          var isMars = item.terrainType === 'mars';
          for (var ci = 0; ci < count; ci++) {
            var normH = (pos.getY(ci) - minY) / hRange;
            if (isMars) {
              // Mars Gale Crater: rust red -> ochre -> buff
              colors[ci * 3]     = 0.50 + normH * 0.42;
              colors[ci * 3 + 1] = 0.16 + normH * 0.44;
              colors[ci * 3 + 2] = 0.08 + normH * 0.35;
            } else {
              // Lunar Fra Mauro: basalt charcoal -> regolith gray -> Cone Crater ejecta
              var c = 0.22 + normH * 0.68;
              colors[ci * 3]     = c;
              colors[ci * 3 + 1] = c * 0.98;
              colors[ci * 3 + 2] = c * 0.96;
            }
          }
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.88,
            metalness: 0.12,
            wireframe: isWireframe
          });
        } else {
          // Asteroid STL: Generate Spherical UVs + apply noise bump map
          ensureSphericalUVs(geometry);
          var bumpTex = getAsteroidBumpTexture();
          mat = new THREE.MeshStandardMaterial({
            color: 0x929aa6,
            map: bumpTex,
            bumpMap: bumpTex,
            bumpScale: 1.8,
            roughness: 0.82,
            metalness: 0.22,
            wireframe: isWireframe
          });
        }

        var mesh = new THREE.Mesh(geometry, mat);
        mesh.userData.origMaterial = mat;

        // Normalize size to fit within radius ~6
        geometry.computeBoundingSphere();
        var radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 10;
        var scale = 7 / (radius || 1);
        mesh.scale.set(scale, scale, scale);

        if (item.isTerrain) {
          // Orient horizontally like real 3D terrain table
          mesh.rotation.x = -Math.PI / 3;
        }

        currentModelMesh = mesh;
        scene.add(mesh);
      });
    } else if (typeof THREE.GLTFLoader !== 'undefined') {
      var gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(item.url, function (gltf) {
        var group = gltf.scene || gltf.scenes[0];

        // Compute bounding box
        var box = new THREE.Box3().setFromObject(group);
        var size = new THREE.Vector3();
        box.getSize(size);
        var center = new THREE.Vector3();
        box.getCenter(center);

        group.position.sub(center);
        var maxDim = Math.max(size.x, size.y, size.z) || 1;
        var scale = 10 / maxDim;
        group.scale.set(scale, scale, scale);

        group.traverse(function (child) {
          if (child.isMesh && child.material) {
            child.userData.origMaterial = child.material.clone();
            child.material.wireframe = isWireframe;
          }
        });

        currentModelMesh = group;
        scene.add(group);
      });
    }
  }

  function openArchive(defaultId) {
    cache();
    if (!els.modal) return;
    open = true;
    els.modal.style.display = 'flex';
    document.body.classList.add('task-open');

    initThreeViewer();
    renderCatalogList();

    var targetItem = ARCHIVE_CATALOG[0];
    if (defaultId) {
      var found = ARCHIVE_CATALOG.find(function (it) { return it.id === defaultId; });
      if (found) targetItem = found;
    }
    selectItem(targetItem);
  }

  function closeArchive() {
    open = false;
    if (els.modal) els.modal.style.display = 'none';
    document.body.classList.remove('task-open');
    if (currentModelMesh && scene) {
      scene.remove(currentModelMesh);
      currentModelMesh = null;
    }
    if (astronautScaleFigure && scene) {
      scene.remove(astronautScaleFigure);
      astronautScaleFigure = null;
    }
  }

  function init() {
    cache();
    if (els.close) els.close.addEventListener('click', closeArchive);

    var openBtn = document.getElementById('btnNasaArchive');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        openArchive();
      });
    }

    if (els.tabs) {
      els.tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          els.tabs.forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          currentFilter = tab.getAttribute('data-filter') || 'all';
          renderCatalogList();
        });
      });
    }

    if (els.wireframeBtn) {
      els.wireframeBtn.addEventListener('click', function () {
        isWireframe = !isWireframe;
        els.wireframeBtn.classList.toggle('active', isWireframe);
        if (currentModelMesh) {
          currentModelMesh.traverse(function (child) {
            if (child.isMesh && child.material) {
              child.material.wireframe = isWireframe;
            }
          });
        }
      });
    }

    if (els.rotateBtn) {
      els.rotateBtn.classList.add('active');
      els.rotateBtn.addEventListener('click', function () {
        autoRotate = !autoRotate;
        els.rotateBtn.classList.toggle('active', autoRotate);
      });
    }

    if (els.thermalBtn) {
      els.thermalBtn.addEventListener('click', function () {
        isThermal = !isThermal;
        els.thermalBtn.classList.toggle('active', isThermal);
        applyThermalShader(currentModelMesh, isThermal);
      });
    }

    if (els.scaleBtn) {
      els.scaleBtn.addEventListener('click', function () {
        toggleAstronautScale(!showAstronautScale);
        els.scaleBtn.classList.toggle('active', showAstronautScale);
      });
    }

    if (els.resetCamBtn) {
      els.resetCamBtn.addEventListener('click', function () {
        if (camera) {
          camera.position.set(0, 0, 18);
          camera.lookAt(0, 0, 0);
        }
        if (currentModelMesh) {
          currentModelMesh.rotation.set(0, 0, 0);
          if (currentItem && currentItem.isTerrain) {
            currentModelMesh.rotation.x = -Math.PI / 3;
          }
        }
      });
    }

    window.addEventListener('keydown', function (e) {
      if (open && e.key === 'Escape') {
        closeArchive();
      }
    });

    // Auto-discover any new models from /api/nasa-files
    fetch('/api/nasa-files')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.files && Array.isArray(data.files)) {
          var knownUrls = new Set(ARCHIVE_CATALOG.map(function (it) { return it.url.toLowerCase(); }));
          data.files.forEach(function (f) {
            var decodedPath = decodeURIComponent(f.path).toLowerCase();
            if (!knownUrls.has(f.path.toLowerCase()) && !knownUrls.has(decodedPath)) {
              var isPhoto = f.ext === 'jpg' || f.ext === 'png';
              ARCHIVE_CATALOG.push({
                id: f.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                title: f.name,
                category: isPhoto ? 'photo' : '3d',
                format: f.ext.toUpperCase() + (isPhoto ? ' Image' : ' 3D Model'),
                size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
                url: f.path,
                mission: 'NASA Scientific Archives',
                scaleType: 'asteroid',
                scaleRatio: '1 : 250 SCALE vs. 1.8m ASTRONAUT',
                description: 'Authentic NASA exploration asset: ' + f.name + '. Discovered and mounted from workspace repository.',
                stats: { filename: f.filename, extension: f.ext.toUpperCase(), size: f.size + ' bytes' }
              });
            }
          });
          renderCatalogList();
        }
      })
      .catch(function (err) {
        console.warn('NASA files auto-scan skipped:', err);
      });
  }

  return {
    init: init,
    open: openArchive,
    close: closeArchive,
    getCatalog: function () { return ARCHIVE_CATALOG; }
  };
})();
