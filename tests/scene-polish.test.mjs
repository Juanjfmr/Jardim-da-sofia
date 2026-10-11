import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { GardenWorld } from '../dist/world.js';
import { MAX_PETALS, petalPose, createPetalField, updatePetalField, atmosphereStep } from '../dist/scene-polish.js';

test('as pétalas ocupam as bordas do jardim e têm poses estáveis e finitas', () => {
  for (let i = 0; i < MAX_PETALS; i++) {
    for (const time of [0, 3, 10, 60]) {
      const pose = petalPose(i, time);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(Math.abs(pose.x) >= 2.45, 'livre o centro onde a criança toca no Pipo');
      assert.ok(pose.y > 0.65 && pose.y < 3);
      assert.ok(Math.abs(pose.z) < 5);
    }
  }
  assert.deepEqual(petalPose(4, 8), petalPose(4, 8));
});

test('as pétalas usam um único InstancedMesh e não entram no raycast', () => {
  const scene = new THREE.Scene();
  const petals = createPetalField(THREE, scene, 200);
  assert.equal(petals.total, MAX_PETALS, 'quantidade limitada para celular');
  assert.equal(scene.children.length, 1);
  assert.equal(scene.children[0], petals.mesh);
  assert.equal(petals.mesh.isInstancedMesh, true);
  assert.equal(petals.mesh.userData.action, undefined);
  assert.equal(petals.mesh.userData.decorative, true);
  assert.equal(petals.mesh.castShadow, false);
  const before = new THREE.Matrix4();
  const after = new THREE.Matrix4();
  petals.mesh.getMatrixAt(2, before);
  updatePetalField(petals, 10);
  petals.mesh.getMatrixAt(2, after);
  assert.notDeepEqual(after.elements, before.elements);
  updatePetalField(petals, 22, true);
  petals.mesh.getMatrixAt(2, before);
  updatePetalField(petals, 50, true);
  petals.mesh.getMatrixAt(2, after);
  assert.deepEqual(after.elements, before.elements, 'movimento reduzido congela a animação');
  petals.mesh.geometry.dispose();
  petals.mesh.material.dispose();
});

test('atmosfera transita sem saltos e respeita movimento reduzido', () => {
  assert.equal(atmosphereStep(0, false, 0.05), 0);
  assert.equal(atmosphereStep(0.3, true, 0.01, true), 1);
  assert.equal(atmosphereStep(0.9, false, 0.01, true), 0);
  let shade = 0;
  for (let i = 0; i < 10; i++) {
    const next = atmosphereStep(shade, true, 0.05);
    assert.ok(next >= shade && next < 1);
    shade = next;
  }
  assert.ok(shade > 0.45);
  const day = atmosphereStep(shade, false, 0.05);
  assert.ok(day < shade && day > 0);
  assert.equal(atmosphereStep(NaN, true, 0), 1);
});

test('mudança de dia para noite suaviza luz, céu, janela e decorações', () => {
  const w = Object.create(GardenWorld.prototype);
  w.reducedMotion = false;
  w.night = false;
  w.nightBlend = 0;
  w.daySkyColor = new THREE.Color('#fffaf1');
  w.nightSkyColor = new THREE.Color('#c9d2f0');
  w.dayWindowColor = new THREE.Color('#cfe3ee');
  w.nightWindowColor = new THREE.Color('#ffd77a');
  w.sun = { intensity: 0 };
  w.ambient = { intensity: 0, color: new THREE.Color() };
  w.windowLight = { material: { color: new THREE.Color() } };
  w.starGroup = { visible: false };
  w.starMaterial = { opacity: 0 };
  w.moonMaterial = { opacity: 0 };
  w.fireflies = Array.from({length: 5}, () => ({ visible: false }));
  w.clouds = [{ visible: true }];
  w.petals = { mesh: { visible: true } };
  w.quality = 2;
  w.updateAtmosphere(0);
  assert.equal(w.sun.intensity, 3.4);
  w.setNight(true);
  w.updateAtmosphere(0.05);
  assert.ok(w.sun.intensity < 3.4 && w.sun.intensity > 0.5);
  for (let i = 0; i < 35; i++) w.updateAtmosphere(0.1);
  assert.ok(w.nightBlend > 0.98);
  assert.equal(w.petals.mesh.visible, false);
  assert.equal(w.clouds[0].visible, false);
  assert.ok(w.fireflies.every(f => f.visible));
  assert.ok(w.starMaterial.opacity > 0.8);
  assert.equal(w.starMaterial.opacity, w.moonMaterial.opacity);
  w.setNight(false);
  for (let i = 0; i < 40; i++) w.updateAtmosphere(0.1);
  assert.ok(w.nightBlend < 0.01);
  assert.ok(w.petals.mesh.visible);
  assert.equal(w.clouds[0].visible, true);
  w.quality = 0;
  w.updateAtmosphere(0);
  assert.equal(w.petals.mesh.visible, false, 'efeito desativado na qualidade mínima');
});

test('acabamento visual está incluído no HTML, funciona offline e respeita acessibilidade', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../dist/visual-polish.css', import.meta.url), 'utf8');
  assert.match(html, /href="\.\/visual-polish\.css"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\.game-card/);
  assert.match(css, /\.dock-btn\.games/);
  assert.doesNotMatch(css, /https?:\/\//);
});
