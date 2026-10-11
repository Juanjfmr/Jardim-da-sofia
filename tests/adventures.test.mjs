import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVENTURES, findAdventure, sanitizeAdventure, sanitizeFinishedAdventures,
  startAdventure, adventureProgress, recordAdventureActivity,
} from '../src/adventures.js';
import { initialState, sanitizeState } from '../src/state.js';

test('três histórias com etapas educativas existentes e sem pressão de tempo', () => {
  assert.equal(ADVENTURES.length, 3);
  assert.equal(new Set(ADVENTURES.map(s => s.id)).size, 3);
  for (const story of ADVENTURES) {
    assert.equal(story.steps.length, 3);
    assert.ok(story.title && story.intro && story.ending);
    assert.ok(story.steps.every(s => ['letters','count','colors','shapes','music','garden'].includes(s.activity)));
    assert.equal('deadline' in story, false);
  }
  assert.equal(findAdventure('desconhecido'), null);
});

test('iniciar e avançar só quando a atividade correta termina', () => {
  const original = initialState();
  let state = startAdventure(original, 'picnic');
  assert.equal(original.adventure, null);
  assert.equal(adventureProgress(state).step.activity, 'count');
  const ignored = recordAdventureActivity(state, 'letters');
  assert.equal(ignored.advanced, false);
  assert.equal(ignored.state, state);
  let result = recordAdventureActivity(state, 'count');
  assert.equal(result.advanced, true);
  assert.equal(result.nextActivity, 'colors');
  state = result.state;
  assert.equal(adventureProgress(state).index, 1);
  assert.equal(recordAdventureActivity(state, 'count').advanced, false, 'repetir capítulo não avança');
});

test('concluir a história salva lembrança, permite repetir e não duplica distintivo', () => {
  let state = startAdventure(initialState(), 'picnic');
  for (const action of ['count', 'colors', 'music']) {
    const result = recordAdventureActivity(state, action);
    assert.equal(result.advanced, true);
    state = result.state;
    if (action === 'music') assert.equal(result.finished, true);
  }
  assert.equal(adventureProgress(state), null);
  assert.deepEqual(state.finishedAdventures, ['picnic']);
  assert.equal(recordAdventureActivity(state, 'music').advanced, false);
  state = startAdventure(state, 'picnic');
  for (const action of ['count', 'colors', 'music']) state = recordAdventureActivity(state, action).state;
  assert.deepEqual(state.finishedAdventures, ['picnic']);
});

test('o progresso sobrevive ao salvamento e um save antigo permanece válido', () => {
  const active = recordAdventureActivity(startAdventure(initialState(), 'magic-garden'), 'garden').state;
  const restored = sanitizeState(JSON.parse(JSON.stringify(active)));
  assert.deepEqual(restored, active);
  assert.equal(adventureProgress(restored).step.activity, 'colors');
  assert.equal(sanitizeState({ version: 1, rewards: 4 }).adventure, null);
  assert.deepEqual(sanitizeState({ version: 1 }).finishedAdventures, []);
});

test('salvamentos adulterados não injetam histórias ou etapas inválidas', () => {
  assert.equal(sanitizeAdventure({id:'picnic',step:-1}), null);
  assert.equal(sanitizeAdventure({id:'picnic',step:99}), null);
  assert.equal(sanitizeAdventure({id:'picnic',step:'1'}), null);
  assert.equal(sanitizeAdventure({id:'unknown',step:0}), null);
  assert.deepEqual(sanitizeFinishedAdventures(['picnic','picnic','unknown',42]), ['picnic']);
  const bad = sanitizeState({ adventure: { id: 'picnic', step: 999 }, finishedAdventures: ['unknown'] });
  assert.equal(bad.adventure, null);
  assert.deepEqual(bad.finishedAdventures, []);
  assert.equal(startAdventure(bad, 'bad-id'), bad);
});
