import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createBunny } from '../dist/pet.js';
import { GardenWorld } from '../dist/world.js';
import { initialState, sanitizeState } from '../src/state.js';
import {
  PIPO_MOODS, moodFromNeeds, touchZone, responseToTouch, chooseIdleMoment,
} from '../src/pipo-behaviors.js';

test('Pipo tem humores contextuais, sem penalidade ou estado persistente', () => {
  const base = initialState();
  assert.equal(moodFromNeeds(base), 'calm');
  assert.equal(moodFromNeeds({ ...base, sleeping: true }), 'asleep');
  assert.equal(moodFromNeeds({ ...base, food: 30 }), 'hungry');
  assert.equal(moodFromNeeds({ ...base, energy: 22 }), 'sleepy');
  assert.equal(moodFromNeeds({ ...base, clean: 28 }), 'messy');
  assert.equal(moodFromNeeds({ ...base, joy: 31 }), 'playful');
  assert.equal(moodFromNeeds({ ...base, food: 32, energy: 25 }), 'sleepy');
  assert.ok(PIPO_MOODS.includes(moodFromNeeds(base)));
  assert.equal('mood' in sanitizeState(base), false, 'humor deriva dos cuidados, não exige migração do save');
});

test('toque por região escolhe reações distintas e toques repetidos preservam surpresa', () => {
  assert.equal(touchZone(3.2), 'ears');
  assert.equal(touchZone(2.1), 'head');
  assert.equal(touchZone(1), 'tummy');
  assert.equal(touchZone(0.3), 'feet');
  assert.equal(touchZone(NaN), 'head');
  assert.equal(responseToTouch('ears', 1), 'curious');
  assert.equal(responseToTouch('head', 1), 'nuzzle');
  assert.equal(responseToTouch('tummy', 1), 'giggle');
  assert.equal(responseToTouch('feet', 1), 'hop');
  assert.equal(responseToTouch('head', 3), 'giggle');
  assert.equal(responseToTouch('ears', 6), 'spin');
});

test('nenhuma ação espontânea durante sono, janela de jogo ou interação recente', () => {
  assert.equal(chooseIdleMoment({ paused: true, sinceTouch: 99 }, 0), null);
  assert.equal(chooseIdleMoment({ mode: 'bath', sinceTouch: 99 }, 0), null);
  assert.equal(chooseIdleMoment({ sleeping: true, sinceTouch: 99 }, 0), null);
  assert.equal(chooseIdleMoment({ sinceTouch: 3 }, 0), null);
  assert.equal(chooseIdleMoment({ mood: 'sleepy', sinceTouch: 20 }, 0), 'yawn');
  assert.equal(chooseIdleMoment({ mood: 'hungry', sinceTouch: 20 }, 0), 'sniff');
  assert.equal(chooseIdleMoment({ mood: 'playful', sinceTouch: 20 }, 0), 'hop');
  assert.equal(chooseIdleMoment({ mood: 'calm', sinceTouch: 20 }, 1), 'look');
  assert.equal(chooseIdleMoment({ mood: 'calm', sinceTouch: 20 }, NaN), 'sniff');
});

test('rig do coelho executa novas expressões sem perder roupas ou produzir valores inválidos', () => {
  const pipo = createBunny(THREE);
  pipo.setOutfit('overalls', 'mint');
  pipo.setMood('playful');
  assert.equal(typeof pipo.setMood, 'function');
  assert.equal(pipo.root.name, 'SofiaBunny');
  pipo.react('curious');
  for (let i = 1; i <= 10; i++) pipo.update(0.07, i * 0.07);
  assert.ok(Math.abs(pipo.head.rotation.z) > 0.04, 'cabecinha inclina com curiosidade');
  pipo.react('nuzzle');
  for (let i = 11; i <= 20; i++) pipo.update(0.07, i * 0.07);
  assert.ok(pipo.head.rotation.z > 0.04, 'inclinação ao receber carinho');
  pipo.react('stretch');
  for (let i = 21; i <= 35; i++) pipo.update(0.07, i * 0.07);
  pipo.react('sniff');
  for (let i = 36; i <= 50; i++) pipo.update(0.07, i * 0.07);
  pipo.react('shake');
  for (let i = 51; i <= 65; i++) pipo.update(0.07, i * 0.07);
  pipo.setSleeping(true);
  pipo.setMood('asleep');
  for (let i = 66; i <= 83; i++) pipo.update(0.07, i * 0.07);
  pipo.root.updateMatrixWorld(true);
  pipo.root.traverse(node => {
    assert.ok(node.matrix.elements.every(Number.isFinite), 'matriz local válida: ' + node.name);
    assert.ok(node.matrixWorld.elements.every(Number.isFinite), 'matriz global válida: ' + node.name);
  });
  assert.equal(pipo.root.getObjectByName('outfit-overalls')?.visible, true, 'roupa acompanha os movimentos');
});

test('toque convertido em espaço local acompanha a posição e rotação do Pipo', () => {
  const world = Object.create(GardenWorld.prototype);
  world.pet = createBunny(THREE);
  world.pet.root.position.set(2.1, 0, -1.3);
  world.pet.root.rotation.y = 0.65;
  world.pet.root.updateMatrixWorld(true);
  const part = y => world.pet.root.localToWorld(new THREE.Vector3(0, y, 0));
  assert.equal(world.petTouchZone(part(2.9)), 'ears');
  assert.equal(world.petTouchZone(part(1.1)), 'tummy');
  assert.equal(world.petTouchZone(part(0.15)), 'feet');
  assert.equal(world.petTouchZone(null), 'head');
});
