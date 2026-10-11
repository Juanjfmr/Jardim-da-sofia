import * as THREE from './vendor/three.module.js';
import { createBunny } from './pet.js';
import { makeStoryTree, makeStoryCottage, decorateStoryGarden } from './art-direction.js';

// Poses da câmera. A ortográfica dá o ar de "diorama" e o enquadramento é calculado
// para caber exatamente no espaço livre entre o balão de fala e os botões.
export const POSES = {
  home: { pos: new THREE.Vector3(3.1, 9.6, 14.5), look: new THREE.Vector3(0, 0.6, 0.2) },
  close: { pos: new THREE.Vector3(1.4, 5.2, 11), look: new THREE.Vector3(0, 1.4, 0.6) },
};

const PET_HOME = new THREE.Vector3(0, 0, 0.45);

// As seis estações do jardim e onde fica a etiqueta de cada uma.
export const STATIONS = [
  { action: 'letters', name: 'Letras', icon: 'letters', point: [-2.67, 1.25, 2.72] },
  { action: 'count', name: 'Contar', icon: 'count', point: [-2.45, 0.95, -0.75] },
  { action: 'shapes', name: 'Formas', icon: 'shapes', point: [-2.6, 1.65, -3.35] },
  { action: 'colors', name: 'Cores', icon: 'colors', point: [2.7, 1.95, 0.4] },
  { action: 'music', name: 'Música', icon: 'music', point: [2.36, 1.1, 3.75] },
  { action: 'garden', name: 'Plantar', icon: 'garden', point: [-1.62, 1.0, 4.65] },
];

// Pontos que precisam aparecer em cada modo (o resto do jardim pode sangrar nas bordas).
export const FRAME_POINTS = {
  home: [
    ...STATIONS.map(s => s.point),
    [0, 3.75, 0.45], [0, 0, 1.2], [2.28, 2.9, -3.48], [-2.4, 0.1, 5.2], [2.6, 0.1, 4.6],
  ],
  close: [[-1.25, 0, 1.3], [1.25, 0, 1.3], [-1.25, 3.85, 0.4], [1.25, 3.85, 0.4], [0, -0.1, 1.6]],
};

// O jardim inteiro (cantos, árvores e telhado), usado quando a tela tem espaço para ele.
export const GARDEN_POINTS = [
  ...FRAME_POINTS.home,
  [-4.75, 0.2, -5.5], [4.75, 0.2, -5.5], [-4.75, 0.2, 5.5], [4.75, 0.2, 5.5],
  [-3.65, 4.2, -4.3], [4, 3.7, -1.75], [2.28, 3.05, -3.48],
];

const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Calcula left/right/top/bottom de uma câmera ortográfica para que `points` caibam no
// retângulo livre da tela (descontando insets e uma margem). Com `context`, telas mais
// "quadradas" (tablet em pé) mostram o jardim inteiro em vez de só as estações.
// Exportado para os testes.
export function fitFrustum(camera, pose, points, width, height, insets = {}, pad = 28, context = null) {
  camera.position.copy(pose.pos);
  camera.lookAt(pose.look);
  camera.updateMatrixWorld(true);
  const inv = camera.matrixWorldInverse;
  const x0 = (insets.left || 0) + pad, x1 = width - (insets.right || 0) - pad;
  const y0 = (insets.top || 0) + pad, y1 = height - (insets.bottom || 0) - pad;
  const freeW = Math.max(60, x1 - x0), freeH = Math.max(60, y1 - y0);
  const v = new THREE.Vector3();
  const fit = pts => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      v.set(p[0], p[1], p[2]).applyMatrix4(inv);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    return { s: Math.max((maxX - minX) / freeW, (maxY - minY) / freeH, 0.004), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  };
  let f = fit(points);
  if (context) {
    const aspect = freeW / freeH;
    // Só em telas largas (tablet): no celular as estações e o Pipo ficam grandes.
    const t = smoothstep(0.55, 0.78, aspect) * (1 - smoothstep(1.3, 1.7, aspect)) * smoothstep(420, 600, freeW);
    if (t > 0) {
      const g = fit(context);
      f = { s: f.s + (g.s - f.s) * t, cx: f.cx + (g.cx - f.cx) * t, cy: f.cy + (g.cy - f.cy) * t };
    }
  }
  const left = f.cx - ((x0 + x1) / 2) * f.s;
  const top = f.cy + ((y0 + y1) / 2) * f.s;
  return { left, right: left + width * f.s, top, bottom: top - height * f.s };
}

export class GardenWorld {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.time = 0;
    this.mode = 'home';
    this.targets = [];
    this.particles = [];
    this.foods = [];
    this.bubbles = [];
    this.labels = [];
    this.butterflies = [];
    this.flowers = [];
    this.treeTops = [];
    this.clouds = [];
    this.fireflies = [];
    this.foam = [];
    this.materials = new Map();
    this.onInteract = () => {};
    this.onRub = () => {};
    this.onBubble = () => {};
    this.onFrame = null;
    this.width = 1;
    this.height = 1;
    this.insets = { top: 0, bottom: 0, left: 0, right: 0 };
    this.pointerDown = null;
    this.petTarget = PET_HOME.clone();
    this.paused = false;
    this.lastPointer = -10;
    this.nextIdle = 6;
    this.bubbleRespawn = [];

    this.geometries = {
      sphere: new THREE.SphereGeometry(1, 18, 14),
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
      cone: new THREE.ConeGeometry(1, 1, 14),
    };
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.quality = 2;
    this.frameSamples = [];
    this.applyQuality();

    this.camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 100);
    this.pose = { pos: POSES.home.pos.clone(), look: POSES.home.look.clone() };
    this.frustum = null;

    this.ambient = new THREE.HemisphereLight('#fffaf1', '#7fae72', 2.5);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#ffe9c8', 3.4);
    this.sun.position.set(-5, 11, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
    this.sun.shadow.normalBias = 0.05;
    this.sun.shadow.bias = -0.0003;
    this.scene.add(this.sun);

    this.environment = new THREE.Group();
    this.scene.add(this.environment);
    this.buildGarden(state);
    decorateStoryGarden(this, THREE);
    this.batchDecorations();
    this.buildSky();
    this.pet = createBunny(THREE);
    this.pet.root.position.copy(this.petTarget);
    this.pet.root.rotation.y = 0.18;
    this.scene.add(this.pet.root);
    this.register(this.pet.root, 'pet');
    this.addContactShadow();
    this.setState(state);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindPointers();
    this.resize();
    this.lastFrame = 0;
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // ---------- Construção do cenário ----------
  mat(color) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }));
    return this.materials.get(color);
  }
  mesh(type, color, x, y, z, sx = 1, sy = 1, sz = 1, parent = this.environment) {
    const m = new THREE.Mesh(this.geometries[type], this.mat(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  register(root, action) {
    root.traverse(m => { if (m.isMesh) { m.userData.action = action; this.targets.push(m); } });
  }
  // Junta decorações repetidas em InstancedMesh: menos chamadas de desenho no celular.
  batchDecorations() {
    this.scene.updateMatrixWorld(true);
    const batches = new Map();
    this.environment.traverse(m => {
      if (!m.isMesh || m.userData.action || Array.isArray(m.material)) return;
      const key = m.geometry.uuid + ':' + m.material.uuid;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(m);
    });
    for (const meshes of batches.values()) {
      if (meshes.length < 3) continue;
      const batch = new THREE.InstancedMesh(meshes[0].geometry, meshes[0].material, meshes.length);
      meshes.forEach((m, i) => { batch.setMatrixAt(i, m.matrixWorld); m.parent.remove(m); });
      batch.castShadow = meshes.some(m => m.castShadow);
      batch.receiveShadow = true;
      batch.instanceMatrix.needsUpdate = true;
      this.environment.add(batch);
    }
    this.flowers = this.flowers.filter(f => f.children.length);
  }
  addLabel(action, name, icon, x, y, z) { this.labels.push({ action, name, icon, point: new THREE.Vector3(x, y, z) }); }

  buildGarden(state) {
    const s = new THREE.Shape();
    const w = 9.5, d = 11, r = 0.85;
    s.moveTo(-w / 2 + r, -d / 2); s.lineTo(w / 2 - r, -d / 2); s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    s.lineTo(w / 2, d / 2 - r); s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2); s.lineTo(-w / 2 + r, d / 2);
    s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r); s.lineTo(-w / 2, -d / 2 + r); s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.12, bevelThickness: 0.12, curveSegments: 10 });
    const grass = new THREE.Mesh(geo, this.mat('#a3d184'));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.34;
    grass.receiveShadow = true;
    this.environment.add(grass);
    this.mesh('box', '#d9b98c', 0, -0.62, 0, 9.2, 0.5, 10.6); // terra por baixo da grama

    // Uma trilha de pedrinhas entre as estações.
    for (let i = 0; i < 11; i++) {
      const z = -4.7 + i * 0.86;
      const x = Math.sin(i * 0.75) * 0.5;
      const stone = this.mesh('sphere', i % 2 ? '#f1e4c4' : '#ead9b4', x, 0.03, z, 0.45, 0.065, 0.27);
      stone.rotation.y = i * 0.8;
      stone.castShadow = false;
    }
    for (let i = 0; i < 15; i++) this.fencePost(-4.35 + i * 0.62, -5.1);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) this.fencePost(side * 4.45, -4.7 + i * 0.64);
      this.mesh('box', '#efd3a9', side * 4.45, 0.45, -2.4, 0.12, 0.12, 5.1);
      this.mesh('box', '#efd3a9', side * 4.45, 0.87, -2.4, 0.12, 0.12, 5.1);
    }
    this.mesh('box', '#ecce9f', 0, 0.45, -5.1, 9, 0.12, 0.12);
    this.mesh('box', '#ecce9f', 0, 0.87, -5.1, 9, 0.12, 0.12);

    this.makeTree(-3.65, -4.3, 1);
    this.makeTree(4, -1.75, 0.82);
    this.makeHouse(2.28, -3.48);
    this.makeCarrotBed(-2.45, -0.94);
    this.makeLetters(-2.62, 2.01);
    this.makeShapes(-2.58, -3.39);
    this.makeMusic(2.4, 3.36);
    this.makeColorFlowers(2.75, 0.39);
    this.makePlantPlots(-1.68, 4.19, state.plants);
    this.makeBath(3.45, -1.91);

    for (const st of STATIONS) this.addLabel(st.action, st.name, st.icon, ...st.point);

    const positions = [[-4.02, 3.06], [-4.02, 4.52], [4.06, 4.62], [4.07, 2.54], [1.3, -4.8], [-1.23, -4.72], [-4.1, -2.06]];
    for (let i = 0; i < positions.length; i++) {
      const [x, z] = positions[i];
      for (let n = 0; n < 3; n++) this.environment.add(this.flower(x + (n - 1) * 0.21, z + Math.sin(n) * 0.18, ['#f7a8b8', '#ffe79a', '#a9bdf2'][i % 3], 0.45));
    }
    for (let i = 0; i < 25; i++) {
      const x = Math.sin(i * 3.42) * 4.2, z = Math.cos(i * 2.31) * 4.8;
      if (Math.abs(x) < 1.1) continue;
      const blade = this.mesh('cone', '#7fb86a', x, 0.16, z, 0.05, 0.3, 0.05);
      blade.rotation.z = Math.sin(i) * 0.2;
      blade.castShadow = false;
    }
    for (let i = 0; i < 3; i++) this.makeButterfly(i);
  }

  // Céu: nuvens que passeiam de dia; lua, estrelas e vaga-lumes de noite.
  buildSky() {
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.35 });
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const puffs = [[0, 0, 0, 0.9], [0.8, -0.1, 0.1, 0.65], [-0.8, -0.15, 0, 0.6], [0.3, 0.35, -0.1, 0.6]];
      for (const [x, y, z, r] of puffs) {
        const m = new THREE.Mesh(this.geometries.sphere, cloudMat);
        m.position.set(x, y, z);
        m.scale.set(r, r * 0.78, r * 0.8);
        g.add(m);
      }
      g.position.set(-9 + i * 5.2, 6.2 + (i % 2) * 0.9, -9 - (i % 3) * 1.2);
      g.scale.setScalar(0.9 + (i % 3) * 0.25);
      g.userData.speed = 0.18 + (i % 3) * 0.07;
      this.scene.add(g);
      this.clouds.push(g);
    }
    this.starGroup = new THREE.Group();
    this.starGroup.visible = false;
    const starMat = new THREE.MeshBasicMaterial({ color: '#fff5c9' });
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(this.geometries.sphere, starMat);
      m.position.set(Math.sin(i * 5.4) * 7, 4 + (i % 6) * 0.55, -6 - Math.cos(i * 1.7) * 3);
      m.scale.setScalar(0.035 + (i % 3) * 0.015);
      this.starGroup.add(m);
    }
    const moon = new THREE.Mesh(this.geometries.sphere, new THREE.MeshBasicMaterial({ color: '#fff1b8' }));
    moon.position.set(1.2, 3.4, -6);
    moon.scale.setScalar(0.42);
    this.starGroup.add(moon);
    this.scene.add(this.starGroup);
    const fireMat = new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(this.geometries.sphere, fireMat);
      m.scale.setScalar(0.055);
      m.visible = false;
      m.userData.phase = i * 1.7;
      m.userData.base = new THREE.Vector3(Math.sin(i * 2.1) * 3.6, 0.6 + (i % 4) * 0.35, Math.cos(i * 1.3) * 4.2);
      this.scene.add(m);
      this.fireflies.push(m);
    }
  }

  fencePost(x, z) {
    this.mesh('box', '#f3dcb9', x, 0.56, z, 0.21, 1.03, 0.2);
    this.mesh('sphere', '#f3dcb9', x, 1.08, z, 0.105, 0.13, 0.1);
  }
  makeTree(x, z, scale) { return makeStoryTree(this, THREE, x, z, scale); }
  makeHouse(x, z) { return makeStoryCottage(this, THREE, x, z); }
  carrot(parent, x = 0, y = 0, z = 0, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    const root = this.mesh('cone', '#f6a04c', 0, 0.3, 0, 0.18, 0.6, 0.18, g);
    root.rotation.z = Math.PI;
    for (let i = 0; i < 3; i++) {
      const leaf = this.mesh('sphere', '#78b46c', (i - 1) * 0.07, 0.74, 0, 0.072, 0.21, 0.045, g);
      leaf.rotation.z = (i - 1) * 0.47;
    }
    return g;
  }
  makeCarrotBed(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    this.mesh('box', '#c29b78', 0, 0.17, 0, 2.3, 0.32, 1.68, g);
    this.mesh('box', '#8e6f55', 0, 0.35, 0, 2.1, 0.07, 1.48, g);
    for (const sign of [-1, 1]) {
      this.mesh('box', '#ebca97', sign * 1.12, 0.38, 0, 0.13, 0.35, 1.76, g);
      this.mesh('box', '#ebca97', 0, 0.38, sign * 0.82, 2.3, 0.35, 0.13, g);
    }
    for (let i = 0; i < 6; i++) this.carrot(g, (i % 3 - 1) * 0.55, 0.36, Math.floor(i / 3) * 0.66 - 0.34, 0.57);
    this.mesh('box', '#ecc48c', 0.7, 0.28, 1.1, 0.75, 0.45, 0.5, g);
    this.mesh('box', '#f7e0b5', 0.7, 0.53, 1.1, 0.83, 0.09, 0.58, g);
    this.register(g, 'count');
  }
  letterTexture(letter, color = '#fffaf0') {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#6d5a4e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 180px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText(letter, 128, 140);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  makeLetters(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    this.mesh('box', '#efd0a8', 0, 0.51, 0, 2.39, 0.16, 1.18, g);
    for (const side of [-1, 1]) this.mesh('box', '#d6ae84', side * 0.94, 0.25, 0, 0.18, 0.5, 0.84, g);
    const colors = ['#f2a5b6', '#a8d496', '#f5cf7c', '#bba9e6', '#a6d2ea'];
    this.letterFaces = [];
    for (let i = 0; i < 5; i++) {
      const m = this.mesh('box', colors[i], (i - 2) * 0.43, 0.85, 0.11, 0.37, 0.5, 0.4, g);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.42), new THREE.MeshStandardMaterial({ map: this.letterTexture('ABCDE'[i], colors[i]), roughness: 1 }));
      face.position.set((i - 2) * 0.43, 0.85, 0.315);
      g.add(face);
      this.letterFaces.push({ face, color: colors[i] });
      m.rotation.y = (i - 2) * 0.025;
    }
    this.register(g, 'letters');
  }
  // Os cubinhos mostram as letras do nome da criança (ou ABCDE).
  setLetterBlocks(word) {
    if (!this.letterFaces) return;
    const letters = (word || 'ABCDE').toLocaleUpperCase('pt-BR').padEnd(5, ' ').slice(0, 5);
    this.letterFaces.forEach(({ face, color }, i) => {
      face.material.map?.dispose();
      face.material.map = this.letterTexture(letters[i].trim() || '★', color);
      face.material.needsUpdate = true;
    });
  }
  makeShapes(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    this.mesh('box', '#f0d0a4', 0, 0.32, 0, 2.2, 0.23, 1.1, g);
    this.mesh('cylinder', '#ef9aab', -0.66, 0.55, 0, 0.29, 0.22, 0.29, g);
    this.mesh('box', '#8ac0de', 0.67, 0.53, 0, 0.51, 0.26, 0.51, g);
    const t = this.mesh('cone', '#f0c35a', 0, 0.54, 0, 0.37, 0.27, 0.37, g);
    t.geometry = new THREE.CylinderGeometry(0.36, 0.36, 0.27, 3);
    this.register(g, 'shapes');
  }
  makeMusic(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    this.mesh('box', '#e8c08e', 0, 0.26, 0, 2.14, 0.25, 1.2, g);
    this.musicBars = [];
    for (let i = 0; i < 5; i++) {
      this.musicBars.push(this.mesh('box', ['#f297a8', '#f3c463', '#9fd17d', '#7fc4e2', '#b9a4e3'][i], (i - 2) * 0.38, 0.47, 0, 0.33, 0.14, 1.15 - i * 0.13, g));
    }
    this.mesh('sphere', '#efb0aa', -0.77, 0.5, 0.8, 0.12, 0.12, 0.12, g);
    const stick = this.mesh('cylinder', '#ecd0ab', -0.47, 0.48, 0.8, 0.035, 0.63, 0.035, g);
    stick.rotation.z = Math.PI / 2;
    this.register(g, 'music');
  }
  flower(x, z, color = '#efa7bb', scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    this.mesh('cylinder', '#76ad6a', 0, 0.62, 0, 0.03, 1.1, 0.03, g);
    for (const side of [-1, 1]) {
      const l = this.mesh('sphere', '#86b97a', side * 0.15, 0.51, 0.005, 0.2, 0.075, 0.03, g);
      l.rotation.z = side * 0.35;
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      this.mesh('sphere', color, Math.sin(a) * 0.17, 1.17 + Math.cos(a) * 0.17, 0.017, 0.15, 0.15, 0.058, g);
    }
    this.mesh('sphere', '#f7d27c', 0, 1.17, 0.072, 0.13, 0.13, 0.055, g);
    this.flowers.push(g);
    return g;
  }
  makeColorFlowers(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    for (let i = 0; i < 3; i++) {
      const px = (i - 1) * 0.66;
      const pot = this.mesh('cylinder', ['#e58f9d', '#ecc274', '#7fbadb'][i], px, 0.23, 0, 0.245, 0.45, 0.245, g);
      pot.geometry = new THREE.CylinderGeometry(0.27, 0.2, 0.45, 16);
      const f = this.flower(px, 0, ['#f0626b', '#ffc94d', '#5aaeea'][i], 0.79);
      f.position.y = 0.37;
      g.add(f);
    }
    this.register(g, 'colors');
  }
  makePlantPlots(x, z, plants) {
    this.plantGroup = new THREE.Group();
    this.plantGroup.position.set(x, 0, z);
    this.environment.add(this.plantGroup);
    this.plantObjects = [];
    for (let i = 0; i < 4; i++) {
      const px = (i % 2 - 0.5) * 0.71, pz = (Math.floor(i / 2) - 0.5) * 0.63;
      this.mesh('box', '#b98f6d', px, 0.12, pz, 0.63, 0.22, 0.55, this.plantGroup);
      const sprout = this.flower(px, pz, ['#f08fb5', '#f5b768', '#b39fe2', '#86bfe6'][i], 0.42);
      sprout.visible = false;
      this.plantGroup.add(sprout);
      this.plantObjects.push(sprout);
    }
    this.register(this.plantGroup, 'garden');
    this.updatePlants(plants);
  }
  updatePlants(plants) {
    if (!this.plantObjects) return;
    plants.forEach((stage, i) => {
      const f = this.plantObjects[i];
      f.visible = stage > 0;
      f.scale.setScalar([0, 0.15, 0.25, 0.46][stage]);
    });
  }
  makeBath(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    this.environment.add(g);
    this.mesh('cylinder', '#e6c7a0', 0, 0.29, 0, 0.6, 0.54, 0.48, g);
    this.mesh('cylinder', '#a6dbe6', 0, 0.57, 0, 0.53, 0.05, 0.41, g);
    for (let i = 0; i < 6; i++) this.mesh('sphere', '#f1faf8', Math.sin(i * 2) * 0.3, 0.65 + (i % 2) * 0.08, Math.cos(i * 2) * 0.2, 0.13, 0.13, 0.13, g);
    this.register(g, 'bath');
  }
  makeButterfly(i) {
    const g = new THREE.Group();
    const color = ['#f0a2c0', '#f7d073', '#b9a5e6'][i];
    const left = this.mesh('sphere', color, -0.15, 0, 0, 0.2, 0.08, 0.19, g);
    const right = this.mesh('sphere', color, 0.15, 0, 0, 0.2, 0.08, 0.19, g);
    this.mesh('sphere', '#8e7563', 0, 0, 0, 0.036, 0.08, 0.13, g);
    this.environment.add(g);
    this.register(g, 'butterfly');
    this.butterflies.push({ g, left, right, phase: i * 2.2 });
  }
  addContactShadow() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    grad.addColorStop(0, 'rgba(60,74,41,.28)');
    grad.addColorStop(1, 'rgba(60,74,41,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.set(0, 0.017, 0.45);
    this.scene.add(this.shadow);
  }

  // ---------- Estado, câmera e qualidade ----------
  setState(s) {
    this.pet.setSleeping(s.sleeping);
    this.pet.setDirty((100 - s.clean) / 100);
    this.pet.setAccessory(s.accessory);
    this.pet.setOutfit(s.outfit, s.outfitColor);
    this.updatePlants(s.plants);
    this.setNight(s.sleeping);
  }
  setNight(sleeping) {
    this.night = !!sleeping;
    this.starGroup.visible = this.night;
    for (const f of this.fireflies) f.visible = this.night;
    for (const c of this.clouds) c.visible = !this.night;
    this.sun.intensity = this.night ? 0.5 : 3.4;
    this.ambient.intensity = this.night ? 1.4 : 2.5;
    this.ambient.color.set(this.night ? '#c9d2f0' : '#fffaf1');
    this.windowLight.material.color.set(this.night ? '#ffd77a' : '#cfe3ee');
  }
  applyQuality() {
    const dpr = window.devicePixelRatio || 1;
    const caps = [1, 1.5, 2];
    this.renderer.setPixelRatio(Math.min(dpr, caps[this.quality]));
    this.renderer.shadowMap.enabled = this.quality > 0;
    if (this.sun) this.sun.castShadow = this.quality > 0;
    if (this.width > 1) this.renderer.setSize(this.width, this.height, false);
  }
  // Se o aparelho não acompanha, baixa a resolução e depois as sombras.
  watchPerformance(dt) {
    if (this.quality === 0 || this.paused) return;
    this.frameSamples.push(dt);
    if (this.frameSamples.length < 90) return;
    const avg = this.frameSamples.reduce((a, b) => a + b, 0) / this.frameSamples.length;
    this.frameSamples = [];
    if (avg > 0.026) { this.quality--; this.applyQuality(); }
  }
  setInsets(insets) {
    this.insets = { top: 0, bottom: 0, left: 0, right: 0, ...insets };
    this.updateFrameTarget();
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.updateFrameTarget();
    if (!this.frustum) this.frustum = { ...this.targetFrustum };
    this.applyCamera(1);
  }
  updateFrameTarget() {
    const key = this.mode === 'home' ? 'home' : 'close';
    const probe = new THREE.OrthographicCamera();
    const pad = key === 'home' ? 34 : 18;
    this.targetPose = POSES[key];
    this.targetFrustum = fitFrustum(probe, POSES[key], FRAME_POINTS[key], this.width, this.height, this.insets, pad, key === 'home' ? GARDEN_POINTS : null);
  }
  applyCamera(k) {
    if (!this.targetFrustum) return;
    this.pose.pos.lerp(this.targetPose.pos, k);
    this.pose.look.lerp(this.targetPose.look, k);
    for (const side of ['left', 'right', 'top', 'bottom']) this.frustum[side] += (this.targetFrustum[side] - this.frustum[side]) * k;
    this.camera.position.copy(this.pose.pos);
    this.camera.lookAt(this.pose.look);
    Object.assign(this.camera, this.frustum);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }
  project(point) {
    const p = point.clone().project(this.camera);
    return { x: (p.x + 1) / 2 * this.width, y: (1 - p.y) / 2 * this.height, visible: p.x > -0.97 && p.x < 0.97 && p.y > -0.97 && p.y < 0.97 };
  }
  // Ponto acima da cabeça do Pipo, para o balãozinho do que ele precisa.
  petAnchor() {
    const p = this.pet.root.position;
    return this.project(new THREE.Vector3(p.x + 0.95, 3.55, p.z));
  }
  petScreenBox() {
    const box = new THREE.Box3().setFromObject(this.pet.root);
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(this.project(new THREE.Vector3(x, y, z)));
    return { left: Math.min(...pts.map(p => p.x)), right: Math.max(...pts.map(p => p.x)), top: Math.min(...pts.map(p => p.y)), bottom: Math.max(...pts.map(p => p.y)) };
  }
  setMode(mode) {
    this.mode = mode;
    this.petTarget.copy(PET_HOME);
    this.updateFrameTarget();
    this.clearBubbles();
    if (mode === 'play') this.createPlayBubbles();
    if (mode !== 'bath') this.clearFoam();
  }
  setPaused(paused) { this.paused = !!paused; }

  // ---------- Toque ----------
  rayAt(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set((clientX - r.left) / r.width * 2 - 1, 1 - (clientY - r.top) / r.height * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return r;
  }
  hit(e) {
    this.rayAt(e.clientX, e.clientY);
    const list = this.targets.filter(m => { let p = m; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
    return this.raycaster.intersectObjects(list, false)[0];
  }
  // Dedos pequenos erram por pouco: bolhas e o Pipo têm uma área de toque generosa.
  pick(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bestD = 52;
    for (const b of this.bubbles) {
      const p = this.project(b.position);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { best = b; bestD = d; }
    }
    if (best) return { object: best, point: best.position.clone() };
    const hit = this.hit(e);
    if (hit) return hit;
    if (this.isPetAt(e.clientX, e.clientY, 14)) {
      const head = new THREE.Vector3();
      this.pet.head.getWorldPosition(head);
      return { object: { userData: { action: 'pet' } }, point: head };
    }
    return null;
  }
  isPetAt(clientX, clientY, pad = 24) {
    const r = this.canvas.getBoundingClientRect();
    const b = this.petScreenBox();
    const x = clientX - r.left, y = clientY - r.top;
    return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad;
  }
  // O Pipo acompanha o dedo com o olhar.
  lookAtClient(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const head = new THREE.Vector3();
    this.pet.head.getWorldPosition(head);
    const h = this.project(head);
    const dx = (clientX - r.left - h.x) / Math.max(200, this.width);
    const dy = (h.y - (clientY - r.top)) / Math.max(200, this.height);
    this.pet.setLook(dx * 1.6 - 0.12, dy * 1.4);
    this.lastPointer = this.time;
  }
  bindPointers() {
    this.canvas.addEventListener('pointerdown', e => {
      this.pointerDown = { x: e.clientX, y: e.clientY, time: this.time };
      this.lookAtClient(e.clientX, e.clientY);
      if (this.mode === 'bath') {
        this.canvas.setPointerCapture?.(e.pointerId);
        const hit = this.hit(e);
        if (hit?.object.userData.action === 'pet') this.onRub(e, hit.point);
      }
    });
    this.canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' || this.pointerDown) this.lookAtClient(e.clientX, e.clientY);
      if (this.pointerDown && this.mode === 'bath') {
        const hit = this.hit(e);
        if (hit?.object.userData.action === 'pet') this.onRub(e, hit.point);
      }
    });
    this.canvas.addEventListener('pointerup', e => {
      if (!this.pointerDown) return;
      const moved = Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y);
      this.pointerDown = null;
      if (moved > 16) return; // foi um arraste, não um toque
      const hit = this.pick(e);
      if (!hit) return;
      const action = hit.object.userData.action;
      if (action === 'bubble') { this.popBubble(hit.object); return; }
      this.onInteract(action, e, hit.point);
    });
    this.canvas.addEventListener('pointercancel', () => { this.pointerDown = null; });
  }

  // ---------- Cuidados ----------
  clientToWorld(clientX, clientY, y = 1.6) {
    this.rayAt(clientX, clientY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, out) ? out : new THREE.Vector3(-1.7, y, 2.7);
  }
  mouthPoint() {
    const p = new THREE.Vector3(0, -0.33, 0.78);
    this.pet.root.updateMatrixWorld(true);
    return this.pet.head.localToWorld(p);
  }
  makeFood(fruit) {
    if (fruit === 'carrot') return this.carrot(this.scene, 0, 0, 0, 0.62);
    const g = new THREE.Group();
    this.scene.add(g);
    if (fruit === 'apple') {
      this.mesh('sphere', '#ee5f68', 0, 0, 0, 0.26, 0.25, 0.26, g);
      this.mesh('cylinder', '#8a6447', 0, 0.27, 0, 0.025, 0.12, 0.025, g);
      const leaf = this.mesh('sphere', '#78b46c', 0.08, 0.3, 0, 0.09, 0.04, 0.05, g);
      leaf.rotation.z = -0.5;
    } else {
      const berry = this.mesh('cone', '#f2556a', 0, 0, 0, 0.22, 0.36, 0.22, g);
      berry.rotation.z = Math.PI;
      for (let i = 0; i < 5; i++) {
        const leaf = this.mesh('sphere', '#6fb262', Math.cos(i * 1.26) * 0.1, 0.18, Math.sin(i * 1.26) * 0.1, 0.09, 0.03, 0.05, g);
        leaf.rotation.y = -i * 1.26;
      }
    }
    return g;
  }
  // A comida voa até a boca; o Pipo abre a boca antes e mastiga ao receber.
  feed(fruit, from) {
    const g = this.makeFood(fruit);
    const start = from ? this.clientToWorld(from.x, from.y) : new THREE.Vector3(-1.7, 1.1, 2.7);
    g.position.copy(start);
    this.foods.push({ g, start, life: 0 });
    this.pet.setMouth(1);
  }
  emit(point, color = '#f0b6c5', count = 12, speed = 1) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const m = new THREE.Mesh(this.geometries.sphere, material);
      m.scale.setScalar(0.035 + Math.random() * 0.04);
      m.position.copy(point);
      this.scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2 * speed, (1.2 + Math.random()) * speed, (Math.random() - 0.5) * 1.5 * speed), life: 0, duration: 0.8 + Math.random() * 0.4 });
    }
  }
  // A espuma gruda no pelo do Pipo até o enxágue.
  soap(point) {
    if (this.foam.length > 46) return;
    const material = new THREE.MeshStandardMaterial({ color: '#f4fbfb', transparent: true, opacity: 0.92, roughness: 0.35 });
    const m = new THREE.Mesh(this.geometries.sphere, material);
    m.scale.setScalar(0.001);
    m.userData.size = 0.06 + Math.random() * 0.07;
    point = point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, 0.04));
    m.userData.age = 0;
    this.pet.root.updateMatrixWorld(true);
    m.position.copy(this.pet.root.worldToLocal(point.clone()));
    this.pet.root.add(m);
    this.foam.push(m);
  }
  clearFoam() {
    for (const m of this.foam) { m.parent?.remove(m); m.material.dispose(); }
    this.foam = [];
  }
  shower() {
    for (let i = 0; i < 34; i++) {
      const m = new THREE.Mesh(this.geometries.sphere, new THREE.MeshBasicMaterial({ color: '#8fd3ea', transparent: true, opacity: 0.85 }));
      m.scale.set(0.03, 0.13, 0.03);
      m.position.set((Math.random() - 0.5) * 1.6, 3.6 + Math.random() * 1.8, 0.5 + (Math.random() - 0.5) * 1);
      this.scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3(0, -4.2, 0), life: 0, duration: 0.9 + Math.random() * 0.3 });
    }
    this.foam.forEach((m, i) => { m.userData.rinse = 0.25 + i * 0.02; });
    this.pet.react('bath');
    setTimeout(() => this.emit(new THREE.Vector3(0, 2.6, 0.9), '#fff7b0', 14), 1100);
  }
  createPlayBubbles() {
    for (let i = 0; i < 6; i++) this.spawnBubble(i, 0.9 + (i % 3) * 0.95);
  }
  spawnBubble(i, y = 0.5) {
    const tint = ['#9fdcf3', '#f5b8d4', '#f9dc8e'][i % 3];
    const m = new THREE.Mesh(this.geometries.sphere, new THREE.MeshPhongMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, transparent: true, opacity: 0.7, shininess: 120, specular: '#ffffff', depthWrite: false }));
    const shine = new THREE.Mesh(this.geometries.sphere, this.bubbleShine || (this.bubbleShine = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })));
    shine.position.set(-0.38, 0.4, 0.55);
    shine.scale.set(0.2, 0.13, 0.1);
    shine.rotation.z = 0.7;
    m.add(shine);
    const size = 0.32 + (i % 3) * 0.04;
    m.scale.setScalar(size);
    const x = Math.sin(i * 1.7 + this.time) * this.bubbleSpread();
    m.position.set(x, y, 1.6 + Math.cos(i * 1.3) * 0.7);
    m.userData = { action: 'bubble', phase: i * 1.5, speed: 0.22 + (i % 4) * 0.05, baseX: x, size, born: this.time };
    this.scene.add(m);
    this.targets.push(m);
    this.bubbles.push(m);
    return m;
  }
  // Metade da largura visível (em unidades do mundo), para as bolhas nascerem sempre na tela.
  bubbleSpread() {
    const f = this.targetFrustum;
    if (!f) return 1.3;
    return Math.max(0.8, Math.min(2.2, (f.right - f.left) / 2 * 0.7));
  }
  popBubble(mesh) {
    if (!this.bubbles.includes(mesh)) return;
    this.emit(mesh.position, '#cfe8ff', 12, 1.2);
    this.scene.remove(mesh);
    this.targets = this.targets.filter(m => m !== mesh);
    this.bubbles = this.bubbles.filter(m => m !== mesh);
    mesh.material.dispose();
    this.bubbleRespawn.push((this.time || 0) + 0.9);
    this.pet?.react('hop');
    this.onBubble();
  }
  clearBubbles() {
    for (const b of this.bubbles) {
      this.scene.remove(b);
      b.material.dispose();
      this.targets = this.targets.filter(m => m !== b);
    }
    this.bubbles = [];
    this.bubbleRespawn = [];
  }

  // ---------- Animação ----------
  idle() {
    if (this.time < this.nextIdle) return;
    this.nextIdle = this.time + 5 + Math.random() * 6;
    if (this.mode !== 'home' || this.night || this.time - this.lastPointer < 3) return;
    const r = Math.random();
    if (r < 0.45) this.pet.setLook((Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.4);
    else if (r < 0.6) this.pet.react('happy');
    else this.pet.setLook(0, 0);
  }
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (document.hidden) { this.lastFrame = now; return; }
    const elapsed = now - this.lastFrame;
    // Pausado (atrás de uma janela de atividade): desenha raramente, só para manter vida.
    if (this.paused && elapsed < 250) return;
    const dt = Math.min(elapsed / 1000, 0.05);
    this.lastFrame = now;
    if (!this.paused) this.watchPerformance(elapsed / 1000);
    this.time += dt;
    this.applyCamera(1 - Math.exp(-dt * 5));
    if (this.time - this.lastPointer > 2.5) this.pet.setLook(0, 0);
    this.idle();
    this.pet.update(dt, this.time);
    this.pet.root.position.lerp(this.petTarget, 0.05);
    this.shadow.position.x = this.pet.root.position.x;
    this.shadow.position.z = this.pet.root.position.z;
    this.pet.root.rotation.y = 0.18 + Math.sin(this.time * 0.22) * 0.07;

    for (const b of this.butterflies) {
      b.g.position.set(Math.sin(this.time * 0.24 + b.phase) * 3.5, 1.8 + Math.sin(this.time * 0.6 + b.phase) * 0.6, Math.cos(this.time * 0.22 + b.phase) * 3.5);
      b.left.rotation.z = Math.sin(this.time * 11 + b.phase) * 0.6;
      b.right.rotation.z = -b.left.rotation.z;
    }
    for (const f of this.flowers) f.rotation.z = Math.sin(this.time * 1.3 + f.position.x) * 0.025;
    for (const t of this.treeTops) t.rotation.z = Math.sin(this.time * 0.5 + t.position.x) * 0.015;
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 11) c.position.x = -11;
    }
    if (this.night) {
      for (const f of this.fireflies) {
        const ph = f.userData.phase, base = f.userData.base;
        f.position.set(base.x + Math.sin(this.time * 0.5 + ph) * 0.6, base.y + Math.sin(this.time * 0.9 + ph) * 0.3, base.z + Math.cos(this.time * 0.4 + ph) * 0.6);
        f.material.opacity = 0.35 + Math.max(0, Math.sin(this.time * 2 + ph)) * 0.6;
      }
    }
    for (const b of this.bubbles) {
      b.position.y += b.userData.speed * dt;
      b.position.x = b.userData.baseX + Math.sin(this.time * 1.1 + b.userData.phase) * 0.22;
      const grow = Math.min(1, (this.time - b.userData.born) * 3);
      b.scale.setScalar(b.userData.size * (0.3 + grow * 0.7) * (1 + Math.sin(this.time * 3 + b.userData.phase) * 0.03));
      if (b.position.y > 4.2) { b.position.y = 0.9; b.userData.baseX = Math.sin(this.time + b.userData.phase) * this.bubbleSpread(); b.userData.born = this.time; }
    }
    if (this.mode === 'play') {
      for (let i = this.bubbleRespawn.length - 1; i >= 0; i--) {
        if (this.time >= this.bubbleRespawn[i]) { this.bubbleRespawn.splice(i, 1); this.spawnBubble(Math.floor(Math.random() * 6), 0.9); }
      }
    }
    for (let i = this.foam.length - 1; i >= 0; i--) {
      const m = this.foam[i];
      m.userData.age += dt;
      if (m.userData.rinse !== undefined) {
        m.userData.rinse -= dt;
        if (m.userData.rinse <= 0) {
          m.position.y -= dt * 2.5;
          m.material.opacity -= dt * 2.2;
          if (m.material.opacity <= 0) { m.parent?.remove(m); m.material.dispose(); this.foam.splice(i, 1); continue; }
        }
      }
      const s = m.userData.size * Math.min(1, m.userData.age * 6) * (1 + Math.sin(this.time * 4 + i) * 0.04);
      m.scale.setScalar(Math.max(0.001, s));
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.m.position.addScaledVector(p.v, dt);
      p.v.y -= dt * 0.5;
      p.m.material.opacity = Math.max(0, 1 - p.life / p.duration) * 0.8;
      if (p.life >= p.duration) { this.scene.remove(p.m); p.m.material.dispose(); this.particles.splice(i, 1); }
    }
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      f.life += dt;
      const t = Math.min(1, f.life / 0.6);
      const mouth = this.mouthPoint();
      f.g.position.lerpVectors(f.start, mouth, t);
      f.g.position.y += Math.sin(t * Math.PI) * 0.9;
      f.g.rotation.z = t * 0.8;
      f.g.scale.setScalar(t > 0.85 ? Math.max(0.05, (1 - t) / 0.15) : 1);
      if (t === 1) {
        this.scene.remove(f.g);
        this.foods.splice(i, 1);
        this.pet.setMouth(0);
        this.pet.react('eat');
        this.emit(mouth, '#f8ce8a', 8);
      }
    }
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame();
  }
}
