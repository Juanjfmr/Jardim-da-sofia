import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseHTML } from 'linkedom';
import { initialState, sanitizeState, reward, OUTFITS, OUTFIT_COLORS, SAVE_KEY } from '../src/state.js';
import { createBunny } from '../src/pet.js';
import { pipoPortrait, outfitIcon } from '../src/pipo-portrait.js';

test('roupas: saves anteriores mantêm progresso e recebem roupa padrão', () => {
  const before = { food: 63, rewards: 34, accessory: 'glasses', completed: { shapes: 3 }, plants: [1, 2, 3, 0], name: 'Lia' };
  const after = sanitizeState(before);
  assert.equal(SAVE_KEY, 'jardim-sofia-v1');
  assert.equal(after.outfit, 'none');
  assert.equal(after.outfitColor, 'mint');
  assert.equal(after.food, before.food);
  assert.equal(after.name, before.name);
  assert.equal(after.accessory, before.accessory);
  assert.deepEqual(after.completed, before.completed);
  assert.deepEqual(after.plants, before.plants);
});

test('roupas: todas são gratuitas, cores e cozinha sobrevivem à recarga', () => {
  assert.equal(OUTFITS.length, 5);
  assert.equal(OUTFIT_COLORS.length, 4);
  assert.ok(OUTFITS.every(o => o.need === 0));
  for (const outfit of OUTFITS) for (const color of OUTFIT_COLORS) {
    const wearing = { ...initialState(), outfit: outfit.id, outfitColor: color.id };
    const cooked = reward(wearing, 'cook');
    const reloaded = sanitizeState(JSON.parse(JSON.stringify(cooked)));
    assert.equal(reloaded.outfit, outfit.id);
    assert.equal(reloaded.outfitColor, color.id);
    assert.equal(reloaded.completed.cook, 1);
    assert.equal(reloaded.rewards, 1);
  }
  const invalid = sanitizeState({ outfit: '<img>', outfitColor: 'transparent', completed: { cook: -2, bad: 4 } });
  assert.equal(invalid.outfit, 'none');
  assert.equal(invalid.outfitColor, 'mint');
  assert.deepEqual(invalid.completed, { cook: 0 });
});

function resources(pet) {
  const geometries = new Set(), materials = new Set();
  pet.root.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    materials.add(node.material);
  });
  return { geometries, materials };
}

test('roupas 3D: o sync reutiliza modelos e tecido em trocas repetidas', () => {
  const pet = createBunny(THREE);
  for (const outfit of OUTFITS) pet.setOutfit(outfit.id);
  const cached = resources(pet);
  const groups = new Map(pet.root.getObjectByName('pipoClothes').children.map(g => [g.name, g]));
  for (let n = 0; n < 30; n++) for (const outfit of OUTFITS) for (const color of OUTFIT_COLORS) {
    pet.setOutfit(outfit.id, color.id);
    pet.setOutfit(outfit.id, color.id);
    for (const group of pet.root.getObjectByName('pipoClothes').children) {
      assert.equal(group, groups.get(group.name), 'o mesmo modelo é mantido');
      assert.equal(group.visible, group.name === 'outfit-' + outfit.id);
    }
    if (outfit.id !== 'none') {
      const colored = [];
      pet.root.getObjectByName('outfit-' + outfit.id).traverse(node => {
        if (node.isMesh && '#' + node.material.color.getHexString() === color.hex) colored.push(node);
      });
      assert.ok(colored.length, outfit.label + ' mostra a cor escolhida');
    }
  }
  assert.deepEqual(resources(pet), cached, 'não acumula materiais ou geometrias em syncs');
  pet.setOutfit('invalid', 'invalid');
  assert.ok(pet.root.getObjectByName('pipoClothes').children.every(g => !g.visible));
});

test('roupas 3D: mangas seguem os braços e roupa continua válida ao brincar', () => {
  const pet = createBunny(THREE);
  pet.setOutfit('shirt', 'sky');
  const sleeve = pet.root.getObjectByName('shirt-sleeve');
  const arm = sleeve.parent;
  assert.notEqual(arm, pet.root.getObjectByName('pipoClothes'));
  pet.react('wave');
  pet.update(0.08, 0.08);
  assert.notEqual(arm.rotation.z, 0);
  for (const outfit of OUTFITS) {
    pet.setOutfit(outfit.id, 'coral');
    for (const reaction of ['eat', 'dance', 'sleep', 'wake', 'spin', 'hop']) {
      pet.react(reaction);
      for (let n = 0; n < 12; n++) pet.update(0.06, n * 0.06);
      pet.root.updateMatrixWorld(true);
      pet.root.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite), outfit.id + ' / ' + reaction));
    }
  }
  pet.setOutfit('none');
  assert.equal(sleeve.visible, false, 'tirar roupa tira as mangas também');
});

test('retratos: mostram roupa e reação, usam gradientes únicos e filtram entradas inválidas', () => {
  for (const outfit of OUTFITS) for (const color of OUTFIT_COLORS) for (const mood of ['idle', 'happy', 'eat', 'wait']) {
    const { document } = parseHTML(pipoPortrait({ outfit: outfit.id, outfitColor: color.id, mood, accessory: 'bow' }));
    const svg = document.querySelector('svg');
    assert.equal(svg.getAttribute('data-outfit'), outfit.id);
    assert.equal(svg.getAttribute('data-mood'), mood);
    assert.ok(svg.querySelector('.pipo-portrait-head'));
    if (outfit.id !== 'none') assert.ok(svg.innerHTML.includes(color.hex));
    const item = parseHTML(outfitIcon(outfit.id, color.id)).document.querySelector('svg');
    assert.equal(item.getAttribute('data-outfit'), outfit.id);
  }
  const a = parseHTML(pipoPortrait()).document.querySelector('radialGradient').id;
  const b = parseHTML(pipoPortrait()).document.querySelector('radialGradient').id;
  assert.notEqual(a, b);
  const unsafe = pipoPortrait({ outfit: '"><script>', outfitColor: 'red" onload="bad()', accessory: '<script>', mood: '" onload="bad()' });
  assert.ok(!unsafe.includes('script') && !unsafe.includes('onload'));
  assert.ok(unsafe.includes('data-outfit="none"') && unsafe.includes('data-mood="idle"'));
});
