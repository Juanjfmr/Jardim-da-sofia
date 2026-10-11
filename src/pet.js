import { OUTFITS, OUTFIT_COLORS } from './state.js';

/**
 * A small, expressive, texture-free virtual bunny.
 * Front is +Z. Animate the supplied root freely; this rig only moves its children.
 */
export function createBunny(THREE) {
  const root = new THREE.Group();
  root.name = 'SofiaBunny';
  const rig = new THREE.Group();
  root.add(rig);

  // Superfícies mais suaves com a mesma geometria compartilhada entre as peças.
  // Sem texturas ou carregamentos extras: continua leve para celulares.
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const smallSphere = new THREE.SphereGeometry(1, 20, 16);
  const material = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0,
  });
  // Pêlo com contraste quente e olhos com camadas em vez de pontos planos.
  const cream = material('#f8e9d2', 0.96);
  const ivory = material('#fff9ed', 0.92);
  const pink = material('#e99da9', 0.92);
  const innerEarLight = material('#f5bdc5', 0.95);
  const blush = material('#f4aeb3', 0.92);
  const nosePink = material('#d98091', 0.46);
  const ink = material('#302d37', 0.25);
  const iris = material('#825b53', 0.32);
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const yellow = material('#ffc954');
  const coral = material('#ee8ba5');
  const mint = material('#85bc91');
  const dirtMaterial = new THREE.MeshStandardMaterial({
    color: '#ad8566', roughness: 1, transparent: true, opacity: 0,
    depthWrite: false,
  });

  function ellipsoid(parent, mat, x, y, z, sx, sy, sz, small = false) {
    const mesh = new THREE.Mesh(small ? smallSphere : sphere, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function stroke(parent, points, radius, mat = ink) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, radius, 5, false), mat);
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }

  const torso = new THREE.Group();
  torso.position.y = 0.93;
  rig.add(torso);
  ellipsoid(torso, cream, 0, 0, 0, 0.71, 0.79, 0.55);
  ellipsoid(torso, ivory, 0, -0.01, 0.455, 0.49, 0.57, 0.13);
  ellipsoid(torso, ivory, 0, -0.19, -0.53, 0.27, 0.27, 0.25);

  const feet = [-1, 1].map(side => {
    const foot = new THREE.Group();
    foot.position.set(side * 0.39, 0.235, 0.20);
    rig.add(foot);
    ellipsoid(foot, cream, 0, 0, 0, 0.34, 0.235, 0.43);
    ellipsoid(foot, pink, 0, 0.085, 0.363, 0.135, 0.095, 0.026, true);
    // Dedinhos sutis, legíveis mesmo com o Pipo pequeno na tela.
    for (const x of [-0.18, 0, 0.18]) {
      ellipsoid(foot, ivory, x, 0.15, 0.337, 0.077, 0.056, 0.083, true);
    }
    return foot;
  });

  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.60, 0.32, 0.07);
    torso.add(arm);
    ellipsoid(arm, cream, side * 0.035, -0.25, 0.15, 0.225, 0.37, 0.25);
    ellipsoid(arm, pink, side * 0.035, -0.40, 0.37, 0.091, 0.10, 0.022, true);
    return arm;
  });

  const head = new THREE.Group();
  head.position.set(0, 1.98, 0.035);
  rig.add(head);
  ellipsoid(head, cream, 0, 0, 0, 0.86, 0.72, 0.645);
  // Bochechas com volume próprio quebram o aspecto de esfera perfeita.
  for (const side of [-1, 1]) {
    const tuft = ellipsoid(head, cream, side * 0.70, -0.245, 0.345, 0.23, 0.18, 0.24, true);
    tuft.rotation.z = side * 0.19;
  }

  const ears = [-1, 1].map(side => {
    const ear = new THREE.Group();
    ear.position.set(side * 0.47, 0.52, -0.055);
    head.add(ear);
    ellipsoid(ear, cream, 0, 0.47, 0, 0.205, 0.66, 0.17);
    ellipsoid(ear, pink, 0, 0.47, 0.153, 0.126, 0.505, 0.047);
    ellipsoid(ear, innerEarLight, -0.022, 0.58, 0.195, 0.055, 0.275, 0.013, true);
    return ear;
  });

  const muzzle = new THREE.Group();
  head.add(muzzle);
  ellipsoid(muzzle, ivory, -0.225, -0.235, 0.568, 0.295, 0.228, 0.165);
  ellipsoid(muzzle, ivory, 0.225, -0.235, 0.568, 0.295, 0.228, 0.165);
  ellipsoid(head, blush, -0.52, -0.14, 0.506, 0.155, 0.095, 0.024, true);
  ellipsoid(head, blush, 0.52, -0.14, 0.506, 0.155, 0.095, 0.024, true);
  ellipsoid(muzzle, nosePink, 0, -0.155, 0.748, 0.083, 0.055, 0.038, true);
  // Boca que abre para comer e bocejar (fechada fica invisível).
  const mouth = new THREE.Group();
  mouth.position.set(0, -0.335, 0.705);
  muzzle.add(mouth);
  ellipsoid(mouth, ink, 0, 0, 0, 0.105, 0.085, 0.05, true);
  ellipsoid(mouth, pink, 0, -0.035, 0.02, 0.07, 0.04, 0.04, true);
  mouth.scale.set(1, 0.001, 1);
  mouth.visible = false;
  stroke(muzzle, [[0, -0.192, 0.740], [0, -0.245, 0.746], [0, -0.280, 0.739]], 0.012);
  stroke(muzzle, [
    [-0.142, -0.288, 0.716], [-0.085, -0.336, 0.736],
    [0, -0.286, 0.742], [0.085, -0.336, 0.736], [0.142, -0.288, 0.716],
  ], 0.014);

  const eyes = [-1, 1].map(side => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.282, 0.13, 0.585);
    head.add(eye);
    // Íris quente, pupila mais profunda e dois pontos de luz que não
    // escurecem durante a noite: expressão consistente com poucas malhas.
    ellipsoid(eye, ink, 0, 0, 0, 0.116, 0.163, 0.061);
    ellipsoid(eye, iris, 0, -0.015, 0.057, 0.078, 0.122, 0.023, true);
    ellipsoid(eye, ink, 0, -0.019, 0.077, 0.048, 0.097, 0.015, true);
    ellipsoid(eye, glint, -0.034, 0.059, 0.084, 0.027, 0.033, 0.009, true);
    ellipsoid(eye, glint, 0.038, -0.053, 0.083, 0.012, 0.017, 0.006, true);
    return eye;
  });
  const closedEyes = [-1, 1].map(side => {
    const x = side * 0.282;
    const closed = stroke(head, [
      [x - 0.098, 0.115, 0.621], [x - 0.04, 0.076, 0.635],
      [x + 0.04, 0.076, 0.635], [x + 0.098, 0.115, 0.621],
    ], 0.018);
    closed.visible = false;
    return closed;
  });

  const dirt = [
    ellipsoid(torso, dirtMaterial, -0.25, 0.13, 0.565, 0.14, 0.11, 0.018, true),
    ellipsoid(torso, dirtMaterial, 0.24, -0.23, 0.57, 0.10, 0.12, 0.018, true),
    ellipsoid(torso, dirtMaterial, -0.09, -0.42, 0.532, 0.065, 0.055, 0.017, true),
    ellipsoid(head, dirtMaterial, -0.61, -0.22, 0.477, 0.10, 0.075, 0.015, true),
    ellipsoid(head, dirtMaterial, 0.43, 0.41, 0.454, 0.085, 0.065, 0.018, true),
  ];
  dirt.forEach(mesh => { mesh.visible = false; mesh.castShadow = false; });

  // Roupas ficam no torso e as mangas nos braços: acompanham todas as reações.
  // Cada modelo é montado uma única vez e permanece no rig. O sync frequente do
  // estado apenas alterna a visibilidade ou recolore o tecido compartilhado.
  const clothing = new THREE.Group();
  clothing.name = 'pipoClothes';
  torso.add(clothing);
  const fabric = material(OUTFIT_COLORS[0].hex);
  const stitching = material('#fff7e6');
  const buttonMaterial = material('#f8da85', 0.55);
  const outfitGroups = new Map();
  let outfitKind = 'none', outfitColor = 'mint';

  function clothShell(parent, mat, top, bottom, frontOnly = false) {
    const geometry = new THREE.SphereGeometry(1, 24, 18, 0,
      frontOnly ? Math.PI : Math.PI * 2, top, bottom - top);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.scale.set(0.726, 0.802, 0.624);
    mesh.position.z = 0.008;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function makeOutfit(kind) {
    const group = new THREE.Group();
    group.name = 'outfit-' + kind;
    clothing.add(group);
    const sleeves = [];
    if (kind === 'shirt' || kind === 'pajamas') {
      clothShell(group, fabric, 0.91, kind === 'pajamas' ? 2.83 : 1.88);
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Group();
        sleeve.name = kind + '-sleeve';
        arms[side === -1 ? 0 : 1].add(sleeve);
        ellipsoid(sleeve, fabric, side * 0.022, -0.095, 0.145, 0.231, 0.207, 0.267);
        sleeves.push(sleeve);
      }
      // Um bolso e botões visíveis identificam a roupa de frente.
      if (kind === 'shirt') {
        ellipsoid(group, stitching, 0.255, 0.095, 0.568, 0.116, 0.126, 0.063, true);
        ellipsoid(group, fabric, 0.255, 0.12, 0.608, 0.092, 0.064, 0.029, true);
      } else {
        for (const y of [0.30, 0.08, -0.14]) ellipsoid(group, buttonMaterial, 0, y, 0.638, 0.036, 0.036, 0.021, true);
        for (const [x, y] of [[-0.3, 0.04], [0.28, -0.22], [-0.18, -0.39]]) {
          // Pequenos bordados de lua, feitos com geometrias já compartilhadas.
          ellipsoid(group, stitching, x, y, 0.59, 0.062, 0.076, 0.03, true);
          ellipsoid(group, fabric, x + 0.026, y + 0.024, 0.616, 0.048, 0.058, 0.013, true);
        }
      }
    } else if (kind === 'overalls') {
      clothShell(group, fabric, 1.54, 2.79);
      ellipsoid(group, fabric, 0, 0.015, 0.563, 0.445, 0.397, 0.105);
      for (const side of [-1, 1]) {
        const strap = ellipsoid(group, fabric, side * 0.265, 0.335, 0.498, 0.081, 0.233, 0.09, true);
        strap.rotation.x = -0.17;
        ellipsoid(group, buttonMaterial, side * 0.265, 0.17, 0.645, 0.052, 0.052, 0.025, true);
      }
      ellipsoid(group, stitching, 0, -0.075, 0.669, 0.175, 0.143, 0.03, true);
      ellipsoid(group, fabric, 0, -0.035, 0.69, 0.145, 0.088, 0.02, true);
    } else if (kind === 'chef') {
      clothShell(group, stitching, 1.13, 2.61, true);
      // Avental claro, tiras e bolso na cor escolhida.
      const neckLoop = ellipsoid(group, fabric, 0, 0.47, 0.40, 0.31, 0.081, 0.088, true);
      neckLoop.rotation.x = -0.10;
      for (const side of [-1, 1]) {
        const tie = ellipsoid(group, fabric, side * 0.62, -0.015, 0.05, 0.084, 0.06, 0.31, true);
        tie.rotation.y = side * 0.35;
      }
      ellipsoid(group, fabric, 0, -0.095, 0.648, 0.214, 0.167, 0.034, true);
      ellipsoid(group, stitching, 0, -0.042, 0.676, 0.177, 0.039, 0.012, true);
      ellipsoid(group, buttonMaterial, 0, 0.253, 0.621, 0.068, 0.065, 0.018, true);
    }
    const entry = { group, sleeves };
    outfitGroups.set(kind, entry);
    return entry;
  }
  function setOutfit(kind = 'none', color = 'mint') {
    kind = OUTFITS.some(o => o.id === kind) ? kind : 'none';
    color = OUTFIT_COLORS.some(c => c.id === color) ? color : 'mint';
    if (kind === outfitKind && color === outfitColor) return;
    if (color !== outfitColor) fabric.color.set(OUTFIT_COLORS.find(c => c.id === color).hex);
    outfitColor = color;
    if (kind !== 'none' && !outfitGroups.has(kind)) makeOutfit(kind);
    for (const [id, entry] of outfitGroups) {
      entry.group.visible = id === kind;
      entry.sleeves.forEach(sleeve => { sleeve.visible = id === kind; });
    }
    outfitKind = kind;
  }

  let accessory = null;
  let accessoryKind = 'none';
  function setAccessory(kind = 'none') {
    kind = ['flower', 'bow', 'crown', 'hat', 'glasses'].includes(kind) ? kind : 'none';
    if (kind === accessoryKind) return;
    if (accessory) {
      head.remove(accessory);
      // The crown owns its geometry; all ellipsoids share our cached geometry.
      accessory.traverse(node => {
        if (node.isMesh && node.geometry !== sphere && node.geometry !== smallSphere) node.geometry.dispose();
      });
    }
    accessoryKind = kind;
    accessory = null;
    if (kind === 'none') return;
    accessory = new THREE.Group();
    accessory.name = `${kind}Accessory`;
    head.add(accessory);
    if (kind === 'flower') {
      accessory.position.set(-0.59, 0.49, 0.42);
      accessory.rotation.z = -0.23;
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const petal = ellipsoid(accessory, coral, Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0, 0.107, 0.069, 0.037, true);
        petal.rotation.z = a;
      }
      const leaf = ellipsoid(accessory, mint, 0.12, -0.19, -0.019, 0.067, 0.14, 0.027, true);
      leaf.rotation.z = -0.72;
      ellipsoid(accessory, yellow, 0, 0, 0.038, 0.087, 0.087, 0.039, true);
    } else if (kind === 'bow') {
      accessory.position.set(0.48, 0.51, 0.43);
      accessory.rotation.z = 0.16;
      const left = ellipsoid(accessory, coral, -0.115, 0, 0, 0.145, 0.108, 0.050, true);
      const right = ellipsoid(accessory, coral, 0.115, 0, 0, 0.145, 0.108, 0.050, true);
      left.rotation.z = -0.22;
      right.rotation.z = 0.22;
      ellipsoid(accessory, nosePink, 0, 0, 0.045, 0.066, 0.076, 0.041, true);
    } else if (kind === 'hat') {
      accessory.position.set(0.05, 0.66, 0.08);
      accessory.rotation.z = -0.12;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.62, 24), coral);
      cone.position.y = 0.3;
      cone.castShadow = true;
      accessory.add(cone);
      for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.205 - i * 0.065, 0.024, 8, 24), i % 2 ? mint : yellow);
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.12 + i * 0.16;
        accessory.add(band);
      }
      ellipsoid(accessory, yellow, 0, 0.64, 0, 0.085, 0.085, 0.085, true);
    } else if (kind === 'glasses') {
      accessory.position.set(0, 0.13, 0.66);
      const frame = material('#3b3f52', 0.35);
      const lens = new THREE.MeshStandardMaterial({ color: '#7cc6e2', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 });
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 10, 28), frame);
        ring.position.set(side * 0.285, 0, 0);
        accessory.add(ring);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), lens);
        glass.position.set(side * 0.285, 0, -0.005);
        accessory.add(glass);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), frame);
        arm.rotation.x = Math.PI / 2;
        arm.position.set(side * 0.44, 0.02, -0.2);
        accessory.add(arm);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16, Math.PI), frame);
      bridge.position.set(0, 0.02, 0);
      accessory.add(bridge);
    } else {
      accessory.position.set(0, 0.48, 0.31);
      accessory.rotation.x = -0.15;
      const shape = new THREE.Shape();
      shape.moveTo(-0.46, 0);
      shape.lineTo(-0.48, 0.31);
      shape.lineTo(-0.23, 0.15);
      shape.lineTo(0, 0.38);
      shape.lineTo(0.23, 0.15);
      shape.lineTo(0.48, 0.31);
      shape.lineTo(0.46, 0);
      shape.closePath();
      const crown = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
        depth: 0.055, bevelEnabled: true, bevelSize: 0.026,
        bevelThickness: 0.022, bevelSegments: 2, steps: 1,
      }), yellow);
      crown.castShadow = true;
      accessory.add(crown);
      for (let i = -1; i <= 1; i++) {
        ellipsoid(accessory, i === 0 ? coral : mint, i * 0.25, 0.08, 0.077, 0.035, 0.045, 0.017, true);
      }
    }
  }

  let sleeping = false;
  let dirtyAmount = 0;
  let reaction = 'idle';
  let reactionAge = 0;
  let reactionDuration = 0;
  let clock = 0;
  let nextBlink = 2.8;
  let blinkAge = -1;
  let sleepBlend = 0;
  const durations = {
    happy: 1.5, pet: 1.8, eat: 1.9, bath: 1.6, dance: 4, sleep: 1.4, wake: 1.2, hop: 0.85,
    giggle: 1.2, wave: 1.9, no: 1.1, yawn: 2.0, spin: 1.1,
  };
  let lookYaw = 0, lookPitch = 0, lookYawTarget = 0, lookPitchTarget = 0;
  let mouthWanted = 0, mouthBlend = 0;
  let squashAge = 9;

  // Para onde o Pipo olha (radianos relativos à frente); null volta ao centro.
  function setLook(yaw, pitch) {
    lookYawTarget = Number.isFinite(yaw) ? Math.max(-0.6, Math.min(0.6, yaw)) : 0;
    lookPitchTarget = Number.isFinite(pitch) ? Math.max(-0.3, Math.min(0.35, pitch)) : 0;
  }
  // Abrir a boca antes de a comida chegar (antecipação).
  function setMouth(amount) { mouthWanted = Math.max(0, Math.min(1, Number(amount) || 0)); }

  function setSleeping(value) {
    sleeping = Boolean(value);
    if (!sleeping && reaction === 'sleep') reaction = 'idle';
  }
  function setDirty(amount) {
    dirtyAmount = Math.max(0, Math.min(1, Number(amount) || 0));
    dirtMaterial.opacity = dirtyAmount * 0.50;
    dirt.forEach(mesh => { mesh.visible = dirtyAmount > 0.015; });
  }
  function react(kind = 'happy') {
    if (!(kind in durations)) kind = 'happy';
    if (kind === 'sleep') setSleeping(true);
    if (kind === 'wake') setSleeping(false);
    reaction = kind;
    reactionAge = 0;
    reactionDuration = durations[kind];
    if (['pet', 'happy', 'hop', 'giggle', 'eat'].includes(kind)) squashAge = 0;
  }

  function update(dt = 1 / 60, time) {
    dt = Math.max(0, Math.min(0.08, Number(dt) || 0));
    clock = Number.isFinite(time) ? time : clock + dt;
    reactionAge += dt;
    if (reactionAge >= reactionDuration) reaction = 'idle';
    const progress = reactionDuration ? Math.min(1, reactionAge / reactionDuration) : 1;
    const envelope = reaction === 'idle' ? 0 : Math.sin(Math.PI * progress);
    const happy = reaction === 'happy' || reaction === 'wake' ? envelope : 0;
    const pet = reaction === 'pet' ? envelope : 0;
    const eat = reaction === 'eat' ? envelope : 0;
    const bath = reaction === 'bath' ? envelope : 0;
    const dance = reaction === 'dance' ? envelope : 0;
    const hop = reaction === 'hop' ? envelope : 0;
    const giggle = reaction === 'giggle' ? envelope : 0;
    const wave = reaction === 'wave' ? envelope : 0;
    const no = reaction === 'no' ? envelope : 0;
    const yawn = reaction === 'yawn' ? envelope : 0;
    const spinT = reaction === 'spin' ? progress : 0;
    squashAge += dt;
    const squash = Math.exp(-squashAge * 5.5) * Math.sin(squashAge * 17) * 0.11;
    lookYaw += (lookYawTarget - lookYaw) * (1 - Math.exp(-dt * 6));
    lookPitch += (lookPitchTarget - lookPitch) * (1 - Math.exp(-dt * 6));
    const wobble = Math.sin(clock * 2.1);
    const bounce = Math.abs(Math.sin(reactionAge * 7));

    sleepBlend += ((sleeping ? 1 : 0) - sleepBlend) * (1 - Math.exp(-dt * 5));
    const breath = Math.sin(clock * (sleeping ? 1.7 : 2.6)) * 0.013;
    // Movimento imperceptível isoladamente, mas tira a rigidez da pose parada.
    const idleNod = (1 - sleepBlend) * Math.sin(clock * 0.82) * 0.018;
    const jump = hop * 0.44 + happy * bounce * 0.14 + dance * bounce * 0.19;
    rig.position.y = jump - sleepBlend * 0.075;
    rig.rotation.x = bath * Math.sin(reactionAge * 16) * 0.035;
    rig.rotation.z = sleepBlend * 0.035 + dance * Math.sin(reactionAge * 8) * 0.115 + giggle * Math.sin(reactionAge * 30) * 0.05;
    const ease = spinT < 0.5 ? 2 * spinT * spinT : 1 - Math.pow(-2 * spinT + 2, 2) / 2;
    rig.rotation.y = ease * Math.PI * 2;
    rig.scale.set(1 + squash * 0.55, 1 - squash, 1 + squash * 0.55);
    torso.scale.set(1 + breath * 0.32 + pet * 0.035, 1 + breath - sleepBlend * 0.045 - pet * 0.025, 1 + breath * 0.35);
    torso.position.y = 0.93 - sleepBlend * 0.07;
    head.position.y = 1.98 - sleepBlend * 0.18 - pet * 0.045;
    const awake = 1 - sleepBlend;
    head.rotation.x = sleepBlend * 0.18 + eat * Math.sin(reactionAge * 11) * 0.045 - happy * 0.05 - yawn * 0.22 - lookPitch * awake + idleNod;
    head.rotation.y = wobble * 0.035 + bath * Math.sin(reactionAge * 24) * 0.18 + no * Math.sin(reactionAge * 15) * 0.32 + lookYaw * awake;
    head.rotation.z = sleepBlend * 0.06 + pet * 0.075 + dance * Math.sin(reactionAge * 7) * 0.14 + wobble * 0.012 + giggle * Math.sin(reactionAge * 24) * 0.09;
    muzzle.scale.set(1 + eat * Math.sin(reactionAge * 16) * 0.035, 1 - eat * Math.sin(reactionAge * 16) * 0.045, 1);
    const chew = eat > 0 ? Math.max(0, Math.sin(reactionAge * 13)) * 0.8 * Math.min(1, eat * 3) : 0;
    const mouthTarget = Math.max(mouthWanted, chew, yawn, giggle * 0.6, happy * 0.35) * awake;
    mouthBlend += (mouthTarget - mouthBlend) * (1 - Math.exp(-dt * 14));
    mouth.visible = mouthBlend > 0.03;
    mouth.scale.set(0.75 + mouthBlend * 0.35, Math.max(0.001, mouthBlend), 1);

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      ears[i].rotation.z = side * (-0.21 - (i === 1 ? 0.19 : 0))
        + side * sleepBlend * 0.14 + Math.sin(clock * 1.5 + i * 1.7) * 0.055
        + bath * Math.sin(reactionAge * 23 + i) * 0.12
        + happy * Math.sin(reactionAge * 10 + i) * 0.07;
      ears[i].rotation.x = -0.08 + sleepBlend * 0.15 + pet * 0.08 + dance * Math.sin(reactionAge * 7 + i) * 0.07 + giggle * Math.sin(reactionAge * 20 + i * 2) * 0.12;
      const waving = side === 1 ? wave : 0;
      const stretch = yawn * 0.9;
      arms[i].rotation.z = side * (0.12 + happy * 0.32 + dance * (0.34 + Math.sin(reactionAge * 8 + i * Math.PI) * 0.22) + stretch)
        + side * waving * (2.0 + Math.sin(reactionAge * 12) * 0.35);
      arms[i].rotation.x = -eat * 0.94 - pet * 0.10 - bath * 0.25 - sleepBlend * 0.17 - stretch * 0.3;
      feet[i].rotation.x = dance * Math.sin(reactionAge * 8 + i * Math.PI) * 0.09;
    }

    if (clock >= nextBlink && blinkAge < 0 && !sleeping) blinkAge = 0;
    if (blinkAge >= 0) {
      blinkAge += dt;
      if (blinkAge > 0.19) {
        blinkAge = -1;
        nextBlink = clock + 2.6 + (Math.sin(clock * 1.37) + 1) * 1.1;
      }
    }
    const blink = blinkAge >= 0 ? 1 - Math.sin(Math.PI * blinkAge / 0.19) * 0.94 : 1;
    const closed = sleepBlend > 0.65;
    const squint = Math.max(pet * 0.47, happy * 0.12, giggle * 0.6, yawn * 0.85);
    const eyeHeight = Math.max(0.045, blink * (1 - squint - sleepBlend * 0.80));
    for (let i = 0; i < 2; i++) {
      eyes[i].visible = !closed;
      eyes[i].scale.y = eyeHeight;
      eyes[i].position.x = (i === 0 ? -1 : 1) * 0.282 + lookYaw * 0.05 * awake;
      eyes[i].position.y = 0.13 - lookPitch * 0.04 * awake;
      closedEyes[i].visible = closed;
    }
  }

  update(0, 0);
  return { root, head, update, react, setSleeping, setDirty, setAccessory, setOutfit, setLook, setMouth };
}
