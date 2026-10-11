import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { GardenWorld } from '../dist/world.js';
import { makeStoryTree, makeStoryCottage, decorateStoryGarden, addStoryProps } from '../dist/art-direction.js';
import { createBunny } from '../dist/pet.js';

function fakeWorld() {
  const world = Object.create(GardenWorld.prototype);
  world.environment = new THREE.Group();
  world.materials = new Map();
  world.geometries = {
    sphere: new THREE.SphereGeometry(1, 12, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 12),
  };
  world.targets = [];
  world.treeTops = [];
  return world;
}

test('direção de arte: árvores têm ramos e copas sem capturar toque', () => {
  const world = fakeWorld();
  const tree = makeStoryTree(world, THREE, -3.65, -4.3, 1);
  assert.equal(tree.name, 'Arvore de conto');
  assert.ok(tree.children.length > 70, 'árvore contém modelagem de copa, galhos e frutos');
  assert.equal(world.targets.length, 0, 'ornamentos não interferem no toque');
  tree.updateMatrixWorld(true);
  tree.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
});

test('direção de arte: casinha tem janela noturna e alvo de toque único', () => {
  const world = fakeWorld();
  const cottage = makeStoryCottage(world, THREE, 2.28, -3.48);
  assert.equal(cottage.name, 'Casa do Pipo');
  assert.ok(cottage.children.length > 80, 'telhas e detalhes foram modelados');
  assert.ok(world.windowLight?.material?.color, 'janela iluminada no modo sono');
  assert.equal(world.targets.length, 1, 'geometrias não multiplicam o raycast');
  assert.equal(world.targets[0].userData.action, 'sleep');
  cottage.updateMatrixWorld(true);
  cottage.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
});

test('direção de arte: chão tem trilha orgânica e flores sem alvos falsos', () => {
  const world = fakeWorld();
  decorateStoryGarden(world, THREE);
  const path = world.environment.children.find(node => node.geometry?.getAttribute?.('color'));
  assert.ok(path, 'caminho usa geometria esculpida com cores próprias');
  assert.equal(path.geometry.getAttribute('position').count, 106);
  assert.equal(world.targets.length, 0);
  assert.ok(world.environment.children.length > 80);
});

test('Pipo: as novas camadas de pelo não interrompem roupas ou reações', () => {
  const pipo = createBunny(THREE);
  const count = [];
  for (const outfit of ['none', 'overalls', 'shirt', 'pajamas', 'chef']) {
    pipo.setOutfit(outfit, 'coral');
    pipo.react('dance');
    for (let i = 0; i < 10; i++) pipo.update(0.05, i * 0.05);
    const box = new THREE.Box3().setFromObject(pipo.root);
    assert.ok(box.max.y < 4 && box.min.y >= -0.15);
    count.push(pipo.root.children.length);
  }
  assert.ok(count.every(c => c === count[0]), 'não anexa novos objetos a cada troca');
});

test('os adereços do jardim são detalhados e nunca roubam toques das atividades', () => {
  const world = fakeWorld();
  const props = addStoryProps(world, THREE);
  assert.equal(props.name, 'Cantinhos do livro');
  assert.equal(props.children.length, 2);
  assert.equal(props.getObjectByName('Casa de passarinhos')?.children.length > 5, true);
  assert.equal(props.getObjectByName('Regador do Pipo')?.children.length > 5, true);
  assert.equal(world.targets.length, 0, 'elementos de decoração não criam hitboxes');
  props.updateMatrixWorld(true);
  props.traverse(node => {
    assert.ok(node.matrixWorld.elements.every(Number.isFinite));
    if (node.isMesh) {
      assert.equal(node.userData.action, undefined);
      assert.ok(node.geometry.boundingSphere === null || node.geometry.boundingSphere.radius >= 0);
    }
  });
});
