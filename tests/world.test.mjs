import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { GardenWorld, fitFrustum, POSES, FRAME_POINTS, GARDEN_POINTS, STATIONS } from '../dist/world.js';
import { createBunny } from '../dist/pet.js';

function bareWorld() {
  const world = Object.create(GardenWorld.prototype);
  Object.assign(world, {
    scene: new THREE.Scene(), geometries: { sphere: new THREE.SphereGeometry(1, 8, 6) }, bubbles: [], targets: [], particles: [],
    foam: [], bubbleRespawn: [], pinwheels: [], time: 0, petTarget: new THREE.Vector3(), updateFrameTarget: () => {}, onBubble: () => {},
  });
  return world;
}

test('bolhas: estourar, repor e reiniciar continuam permitindo terminar', () => {
  const world = bareWorld();
  let pops = 0;
  world.onBubble = () => pops++;
  world.setMode('play');
  assert.equal(world.bubbles.length, 6);
  world.popBubble(world.bubbles[0]);
  world.popBubble(world.bubbles[0]);
  assert.equal(pops, 2);
  assert.equal(world.bubbles.length, 4);
  assert.equal(world.bubbleRespawn.length, 2, 'bolhas novas são agendadas');
  world.popBubble(new THREE.Mesh());
  assert.equal(pops, 2, 'objeto que não é bolha é ignorado');
  world.setMode('play');
  assert.equal(world.bubbles.length, 6);
  world.setMode('home');
  assert.equal(world.bubbles.length, 0);
  assert.equal(world.targets.length, 0);
  assert.equal(world.bubbleRespawn.length, 0);
});

test('batching preserva animação de árvores e flores em primeiro plano', () => {
  const world = bareWorld();
  world.environment = new THREE.Group();
  world.scene.add(world.environment);
  world.treeTops = [];
  world.flowers = [];
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const material = new THREE.MeshStandardMaterial({ color: '#82bd77' });
  const decorate = count => {
    const group = new THREE.Group();
    world.environment.add(group);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = i * 0.2;
      group.add(mesh);
    }
    return group;
  };
  const tree = decorate(3);
  const flower = decorate(3);
  const pinwheel = decorate(5);
  const staticPlant = decorate(4);
  world.treeTops.push(tree);
  world.flowers.push(flower);
  world.pinwheels.push(pinwheel);
  world.batchDecorations();
  assert.equal(tree.children.length, 3, 'a copa continua ligada à árvore para balançar');
  assert.equal(flower.children.length, 3, 'a flor em primeiro plano continua animável');
  assert.equal(pinwheel.children.length, 5, 'as hélices permanecem ligadas ao rotor animado');
  assert.equal(staticPlant.children.length, 0, 'as plantas estáticas foram agrupadas');
  assert.ok(world.environment.children.some(child => child.isInstancedMesh),
    'o agrupamento estático continua funcionando');
});

test('o coelhinho mantém geometria válida em todas as reações, olhares e enfeites', () => {
  const pet = createBunny(THREE);
  const kinds = ['happy', 'pet', 'eat', 'bath', 'dance', 'sleep', 'wake', 'hop', 'giggle', 'wave', 'no', 'yawn', 'spin'];
  for (const accessory of ['none', 'flower', 'bow', 'crown', 'hat', 'glasses']) {
    pet.setAccessory(accessory);
    for (const kind of kinds) {
      pet.react(kind);
      pet.setLook(Math.sin(kinds.indexOf(kind)), 0.2);
      pet.setMouth(kind === 'eat' ? 1 : 0);
      for (let i = 0; i < 20; i++) pet.update(0.04, i * 0.04);
      pet.root.updateMatrixWorld(true);
      pet.root.traverse(m => assert.ok(m.matrixWorld.elements.every(Number.isFinite), kind + ' / ' + accessory));
    }
    const box = new THREE.Box3().setFromObject(pet.root);
    assert.ok(box.max.y > 2.4 && box.max.y < 4, 'altura com ' + accessory + ': ' + box.max.y);
    assert.ok(box.max.x - box.min.x < 3);
  }
  pet.setSleeping(true);
  pet.update(0.1, 4);
  pet.setSleeping(false);
  pet.setDirty(1);
  pet.setLook(NaN, Infinity);
  pet.update(0.1, 5);
  const box = new THREE.Box3().setFromObject(pet.root);
  assert.ok(box.min.y >= -0.15);
});

test('olhar acompanha o dedo sem deslocar o olho e sombra acompanha o pulo', () => {
  const pet = createBunny(THREE);
  const left = pet.root.getObjectByName('pipo-pupil-left');
  const right = pet.root.getObjectByName('pipo-pupil-right');
  assert.ok(left && right, 'pupilas independentes presentes no rig');
  const initial = left.position.x;
  pet.setLook(0.6, -0.25);
  for (let i = 0; i < 60; i++) pet.update(1 / 60, i / 60);
  assert.ok(left.position.x > initial + 0.012, 'pupilas acompanham o olhar horizontal');
  assert.ok(left.position.y > 0.005, 'pupilas acompanham o olhar vertical');
  assert.ok(Math.abs(left.position.x - right.position.x) < 0.0001, 'pupilas continuam sincronizadas');
  pet.react('hop');
  let maxElevation = 0;
  for (let i = 0; i < 100; i++) {
    pet.update(1 / 60, 1 + i / 60);
    maxElevation = Math.max(maxElevation, pet.getElevation());
  }
  assert.ok(maxElevation > 0.15, 'Pipo salta o suficiente para alterar a sombra');
  assert.equal(pet.getElevation(), 0, 'Pipo aterrissa sem deixar sombra deslocada');
});

test('enquadramento: as seis estações cabem entre o balão de fala e os botões em vários aparelhos', () => {
  const camera = new THREE.OrthographicCamera();
  const screens = [
    ['iPhone SE', 375, 520, { top: 84, bottom: 84 }], ['celular comum', 390, 684, { top: 84, bottom: 84 }], ['celular grande', 430, 760, { top: 84, bottom: 84 }],
    ['celular deitado', 844, 300, { left: 360, bottom: 72 }], ['tablet em pé', 768, 900, { top: 96, bottom: 84 }], ['tablet em pé grande', 820, 1000, { top: 96, bottom: 84 }],
    ['tablet deitado', 1180, 640, { top: 96, bottom: 84 }],
    ['computador', 1280, 600, { top: 90, bottom: 84 }],
  ];
  const label = 29; // metade da etiqueta redonda
  for (const [name, width, height, insets] of screens) {
    Object.assign(camera, fitFrustum(camera, POSES.home, FRAME_POINTS.home, width, height, insets, 34, GARDEN_POINTS));
    camera.updateProjectionMatrix();
    for (const st of STATIONS) {
      const v = new THREE.Vector3(...st.point).project(camera);
      const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height;
      assert.ok(x - label >= (insets.left || 0) - 6 && x + label <= width, st.name + ' cabe na largura em ' + name + ' (' + Math.round(x) + ')');
      assert.ok(y - label >= (insets.top || 0) - 6 && y + label <= height - (insets.bottom || 0), st.name + ' fica entre o balão e os atalhos do Pipo em ' + name + ' (' + Math.round(y) + ')');
    }
  }
});

test('enquadramento de perto: o Pipo inteiro aparece acima das ferramentas', () => {
  const camera = new THREE.OrthographicCamera();
  const pet = createBunny(THREE);
  pet.root.position.set(0, 0, 0.45);
  pet.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pet.root);
  for (const [width, height, insets] of [[390, 684, { top: 84, bottom: 110 }], [844, 300, { top: 20, bottom: 80 }], [768, 900, { top: 96, bottom: 120 }]]) {
    Object.assign(camera, fitFrustum(camera, POSES.close, FRAME_POINTS.close, width, height, insets, 18));
    camera.updateProjectionMatrix();
    for (const corner of [[box.min.x, box.min.y, box.max.z], [box.max.x, box.max.y, box.max.z], [box.min.x, box.max.y, box.min.z]]) {
      const v = new THREE.Vector3(...corner).project(camera);
      const y = (1 - v.y) / 2 * height;
      assert.ok(Math.abs(v.x) <= 1.001, 'largura ' + width + '×' + height);
      assert.ok(y >= insets.top - 20 && y <= height - insets.bottom + 20, 'altura ' + width + '×' + height + ': ' + Math.round(y));
    }
  }
});

test('bolhas nascem dentro da tela no modo de perto (celular em pé, pequeno e deitado)', () => {
  for (const [width, height, insets] of [[390, 684, { top: 84, bottom: 110 }], [375, 520, { top: 84, bottom: 100 }], [844, 300, { top: 20, bottom: 80 }]]) {
    const world = bareWorld();
    const camera = new THREE.OrthographicCamera();
    world.targetFrustum = fitFrustum(camera, POSES.close, FRAME_POINTS.close, width, height, insets, 18);
    Object.assign(camera, world.targetFrustum);
    camera.updateProjectionMatrix();
    for (let t = 0; t < 40; t += 0.7) {
      world.time = t;
      world.clearBubbles();
      world.createPlayBubbles();
      for (const b of world.bubbles) {
        for (const wobble of [-0.22, 0.22]) {
          const p = b.position.clone().add(new THREE.Vector3(wobble, 0, 0)).project(camera);
          const x = (p.x + 1) / 2 * width;
          assert.ok(x > 10 && x < width - 10, 'bolha fora da tela em ' + width + '×' + height + ': x=' + Math.round(x));
        }
      }
    }
  }
});
