window.RTM = window.RTM || {};
window.RTM.NasaArchive = (function () {
  'use strict';

  var ARCHIVE_CATALOG = [
    {
      id: 'bennu',
      title: 'Asteroid 101955 Bennu',
      category: '3d',
      format: 'STL 3D Model',
      size: '2.4 MB',
      url: '/nasa-models/Asteroid 101955 Bennu.stl',
      mission: 'NASA OSIRIS-REx Mission',
      description: 'Ancient carbon-rich near-Earth rubble pile asteroid. OSIRIS-REx successfully mapped its rocky surface, collected surface regolith in 2020, and returned pristine asteroid samples to Earth in 2023.',
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
      description: 'Largest iron meteorite ever discovered on the surface of Mars. Discovered by rover Opportunity in Meridiani Planum in July 2009. Composed predominantly of iron and nickel.',
      stats: { width: '60 cm', discovered: 'Sol 1957 (2009)', site: 'Meridiani Planum, Mars' }
    },
    {
      id: 'apollo14_site',
      title: 'Apollo 14 Lunar Landing Site',
      category: '3d',
      format: 'STL 3D Model',
      size: '6.7 MB',
      url: '/nasa-models/Apollo 14 - Landing Site.stl',
      mission: 'NASA Apollo 14 Lunar Surface Exploration',
      description: 'Digital Elevation Model (DEM) of the Fra Mauro lunar highlands where astronauts Alan Shepard and Edgar Mitchell landed the Lunar Module Antares in February 1971.',
      stats: { coordinates: '3.6453° S, 17.4714° W', destination: 'Cone Crater', date: 'February 5, 1971' }
    },
    {
      id: 'curiosity_site',
      title: 'Curiosity Rover Landing Site',
      category: '3d',
      format: 'STL 3D Model',
      size: '2.7 MB',
      url: '/nasa-models/Curiosity Landing Site.stl',
      mission: 'NASA Mars Science Laboratory (MSL)',
      description: '3D digital topography of the Bradbury Landing site inside Gale Crater, Mars, directly adjacent to Mount Sharp (Aeolis Mons), exploring ancient Martian habitability.',
      stats: { landingSite: 'Gale Crater, Mars', landingDate: 'August 6, 2012', vehicle: 'Curiosity Rover' }
    },
    {
      id: 'astronaut_eva',
      title: 'NASA Astronaut (EVA Spacewalk)',
      category: '3d',
      format: 'GLB 3D Model',
      size: '746 KB',
      url: '/nasa-models/Astronaut.glb',
      mission: 'NASA Extravehicular Activity (EVA)',
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
      mission: 'NASA Advanced Exploration Systems (Planetary Surface Prototype)',
      description: 'Next-generation prototype planetary surface spacesuit engineered with composite hard upper torso, rear-entry suitport compatibility, and advanced shoulder/hip mobility bearings for Mars exploration.',
      stats: { destination: 'Mars Surface Exploration', entry: 'Rear Hatch Suitport', torso: 'Carbon-fiber composite' }
    },
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
  var animFrameId = null;
  var isDragging = false;
  var prevMousePos = { x: 0, y: 0 };
  var autoRotate = true;
  var isWireframe = false;

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
    renderer.toneMappingExposure = 1.2;
    els.viewport3d.appendChild(renderer.domElement);

    // Subtle star grid
    var gridHelper = new THREE.GridHelper(30, 30, 0x1d3557, 0x0f1d30);
    gridHelper.position.y = -6;
    scene.add(gridHelper);

    // Lights
    var ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    var dirLight1 = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight1.position.set(20, 25, 20);
    scene.add(dirLight1);

    var dirLight2 = new THREE.DirectionalLight(0x38fedc, 0.6);
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
      camera.position.z = Math.max(4, Math.min(60, camera.position.z + e.deltaY * 0.03));
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

      var badgeClass = item.category === '3d' ? 'badge-3d' : 'badge-photo';
      var badgeText = item.category === '3d' ? '3D MODEL' : 'PHOTO';

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

    if (item.category === 'photo') {
      // Photo viewer mode
      if (els.viewport3d) els.viewport3d.style.display = 'none';
      if (els.viewportPhoto) {
        els.viewportPhoto.style.display = 'flex';
        els.photoImg.src = item.url;
      }
      if (els.wireframeBtn) els.wireframeBtn.style.display = 'none';
      if (els.rotateBtn) els.rotateBtn.style.display = 'none';
      if (els.resetCamBtn) els.resetCamBtn.style.display = 'none';
    } else {
      // 3D model mode
      if (els.viewportPhoto) els.viewportPhoto.style.display = 'none';
      if (els.viewport3d) els.viewport3d.style.display = 'block';
      if (els.wireframeBtn) els.wireframeBtn.style.display = 'inline-block';
      if (els.rotateBtn) els.rotateBtn.style.display = 'inline-block';
      if (els.resetCamBtn) els.resetCamBtn.style.display = 'inline-block';

      loadModelIntoViewer(item);
    }
  }

  function loadModelIntoViewer(item) {
    if (!scene) initThreeViewer();
    if (!scene) return;

    // Clear previous model
    if (currentModelMesh) {
      scene.remove(currentModelMesh);
      currentModelMesh = null;
    }

    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);

    var isStl = item.url.toLowerCase().endsWith('.stl');

    if (isStl && typeof THREE.STLLoader !== 'undefined') {
      var stlLoader = new THREE.STLLoader();
      stlLoader.load(item.url, function (geometry) {
        geometry.computeVertexNormals();
        geometry.center();

        var mat = new THREE.MeshStandardMaterial({
          color: 0x9099a2,
          roughness: 0.85,
          metalness: 0.15,
          wireframe: isWireframe
        });

        var mesh = new THREE.Mesh(geometry, mat);

        // Normalize size to fit within radius ~6
        geometry.computeBoundingSphere();
        var radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 10;
        var scale = 7 / (radius || 1);
        mesh.scale.set(scale, scale, scale);

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

    if (els.resetCamBtn) {
      els.resetCamBtn.addEventListener('click', function () {
        if (camera) {
          camera.position.set(0, 0, 18);
          camera.lookAt(0, 0, 0);
        }
        if (currentModelMesh) {
          currentModelMesh.rotation.set(0, 0, 0);
        }
      });
    }

    window.addEventListener('keydown', function (e) {
      if (open && e.key === 'Escape') {
        closeArchive();
      }
    });
  }

  return {
    init: init,
    open: openArchive,
    close: closeArchive,
    getCatalog: function () { return ARCHIVE_CATALOG; }
  };
})();
