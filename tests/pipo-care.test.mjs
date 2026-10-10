import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { initialState, sanitizeState, SAVE_KEY } from '../src/state.js';

test('roupas e cozinha ampliam o save antigo sem apagar as descobertas', () => {
  const old = sanitizeState({ version: 1, name: 'Lia', rewards: 9, accessory: 'bow', completed: { letters: 3 }, plants: [3, 2, 1, 0] });
  assert.equal(old.outfit, 'none');
  assert.equal(old.outfitColor, 'mint');
  assert.equal(old.name, 'Lia');
  assert.equal(old.accessory, 'bow');
  assert.deepEqual(old.plants, [3, 2, 1, 0]);
  const dressed = { ...old, outfit: 'pajamas', outfitColor: 'sky', completed: { ...old.completed, cook: 2 } };
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(dressed))), dressed);
  const invalid = sanitizeState({ ...dressed, outfit: 'unknown', outfitColor: '<script>', completed: { cook: Infinity, letters: 3 } });
  assert.equal(invalid.outfit, 'none');
  assert.equal(invalid.outfitColor, 'mint');
  assert.equal(invalid.completed.cook, undefined);
  assert.equal(invalid.completed.letters, 3);
});

// Relógio controlado: a jornada cobre o forno e a saída dele sem esperar quatro
// segundos por cenário. Também permite executar callbacks cancelados à força.
function virtualClock() {
  let now = 0, serial = 0;
  const pending = new Map();
  const intervals = [];
  const enqueue = (fn, delay, every = 0) => {
    const id = ++serial;
    pending.set(id, { fn, at: now + Number(delay || 0), every, id });
    return id;
  };
  return {
    now: () => now,
    setTimeout: (fn, delay) => enqueue(fn, delay),
    clearTimeout: id => pending.delete(id),
    setInterval: (fn, delay) => { intervals.push(fn); return enqueue(fn, delay, delay); },
    clearInterval: id => pending.delete(id),
    callbacks: () => [...pending.values()].filter(job => !job.every).map(job => job.fn),
    tickGame: () => intervals.forEach(fn => fn()),
    advance(ms) {
      const end = now + ms;
      let runs = 0;
      while (true) {
        const next = [...pending.values()].filter(job => job.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!next) break;
        assert.ok(runs++ < 10000, 'os timers do jogo terminam');
        pending.delete(next.id);
        now = next.at;
        if (next.every) pending.set(next.id, { ...next, at: now + next.every });
        next.fn();
      }
      now = end;
    },
  };
}

test('Pipo: vestir, cozinhar, sair do forno e descansar mantêm save e recompensa corretos', async t => {
  const previous = Object.fromEntries(['window', 'document', 'speechSynthesis', 'SpeechSynthesisUtterance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'].map(key => [key, globalThis[key]]));
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const oldNow = Date.now, oldWarn = console.warn, oldError = console.error;
  const clock = virtualClock();
  const baseTime = oldNow();
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const { window } = parseHTML(html);
  globalThis.window = window;
  globalThis.document = window.document;
  const spoken = [];
  const speech = { speaking: false, pending: false, getVoices: () => [], speak: utterance => spoken.push(utterance.text), cancel() {}, addEventListener() {} };
  window.speechSynthesis = speech;
  globalThis.speechSynthesis = speech;
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const saved = new Map([[SAVE_KEY, JSON.stringify({ ...initialState(), food: 35, rewards: 2, completed: { letters: 3 }, music: false })]]);
  globalThis.localStorage = { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) };
  for (const key of ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']) globalThis[key] = clock[key];
  Date.now = () => baseTime + clock.now();
  console.warn = () => {};
  console.error = () => {};
  let focused = document.body;
  Object.defineProperty(document, 'activeElement', { configurable: true, get: () => focused?.isConnected ? focused : document.body });
  window.HTMLElement.prototype.focus = function () { focused = this; };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
    Date.now = oldNow;
    console.warn = oldWarn;
    console.error = oldError;
  });
  await import('../dist/game.js');
  const $ = id => document.getElementById(id);
  const game = window.jardimSofia;
  const click = selector => {
    const node = typeof selector === 'string' ? document.querySelector(selector) : selector;
    assert.ok(node, 'controle encontrado: ' + selector);
    node.focus?.();
    node.click();
    return node;
  };
  const key = (name, shiftKey = false) => {
    const event = new window.Event('keydown', { bubbles: true, cancelable: true });
    Object.assign(event, { key: name, shiftKey });
    document.dispatchEvent(event);
    return event;
  };
  const persisted = () => JSON.parse(saved.get(SAVE_KEY));
  const stage = () => document.querySelector('.kitchen-room')?.dataset.stage;
  const beginBake = () => {
    click('#kitchen-open');
    assert.equal($('kitchen-sheet').hidden, false);
    click('[data-ingredient="carrot"]');
    click('.kitchen-oven');
    assert.equal(stage(), 'baking');
    assert.equal(document.activeElement, document.querySelector('.kitchen-chef'), 'assar transfere o foco do forno desabilitado para o Pipo');
    return clock.callbacks();
  };

  click('#start-btn');
  assert.equal($('pipo-places').hidden, false, 'as novas brincadeiras aparecem no jardim');
  const wardrobeTrigger = click('#wardrobe-open');
  assert.equal($('wardrobe-sheet').hidden, false);
  click('[data-outfit="overalls"].wardrobe-outfit');
  assert.equal(game.getState().outfit, 'overalls');
  assert.equal(document.activeElement.dataset.outfit, 'overalls', 'a troca mantém o foco no novo botão da roupa');
  click('[data-outfit-color="sky"]');
  assert.equal(game.getState().outfitColor, 'sky');
  assert.equal(document.activeElement.dataset.outfitColor, 'sky', 'a troca mantém o foco na cor escolhida');
  assert.equal(document.querySelector('.wardrobe-portrait .pipo-portrait').dataset.outfit, 'overalls', 'o espelho mostra a roupa escolhida');
  assert.equal(game.getState().rewards, 2, 'roupas e cores já estão livres e não dão flores');
  assert.equal(persisted().outfit, 'overalls');
  assert.equal(persisted().outfitColor, 'sky');
  key('Escape');
  assert.equal($('wardrobe-sheet').hidden, true);
  assert.equal(document.activeElement, wardrobeTrigger, 'Escape devolve o foco ao jardim');
  click('#wardrobe-open');
  assert.equal(document.querySelector('.wardrobe-outfit.is-selected').dataset.outfit, 'overalls', 'reabrir conserva a seleção');
  click('#wardrobe-sheet');
  assert.equal($('wardrobe-sheet').hidden, true, 'tocar o fundo fecha o guarda-roupa');

  const kitchenTrigger = click('.dock-btn.feed');
  assert.equal($('kitchen-sheet').hidden, false, 'o dock Comer abre a cozinha');
  assert.equal(document.querySelector('.kitchen-portrait .pipo-portrait').dataset.outfit, 'overalls', 'Pipo cozinha usando a roupa salva');
  $('flower-count').focus();
  assert.ok(key('Tab').defaultPrevented);
  assert.equal(document.activeElement, $('kitchen-back'), 'Tab recupera um foco que caiu fora da janela');
  $('kitchen-back').focus();
  assert.ok(key('Tab', true).defaultPrevented);
  assert.equal(document.activeElement, document.querySelector('.kitchen-clear'));
  assert.ok(key('Tab').defaultPrevented);
  assert.equal(document.activeElement, $('kitchen-back'), 'Tab circula dentro da cozinha');
  const foodBefore = game.getState().food;
  click('.kitchen-chef');
  assert.equal(game.getState().food, foodBefore, 'Pipo não recebe comida antes de assar');
  for (const id of ['tomato', 'cheese', 'banana']) click('[data-ingredient="' + id + '"]');
  assert.equal(document.querySelectorAll('.kitchen-topping').length, 3, 'misturas livres permanecem no prato');
  click('.kitchen-oven');
  assert.equal(stage(), 'baking');
  assert.equal(document.activeElement, document.querySelector('.kitchen-chef'), 'o forno não deixa o teclado preso num botão desabilitado');
  click('.kitchen-chef');
  assert.equal(game.getState().food, foodBefore, 'tocar Pipo durante o forno não serve comida crua');
  clock.advance(4000);
  assert.equal(stage(), 'ready');
  assert.equal(game.getState().completed.cook, undefined, 'assar sozinho não ganha recompensa');
  click('.kitchen-chef');
  click('.kitchen-chef');
  assert.equal(stage(), 'served');
  assert.equal(game.getState().completed.cook, 1);
  assert.equal(game.getState().rewards, 3, 'servir duas vezes dá uma única flor');
  assert.ok(game.getState().food > foodBefore, 'comida preparada alimenta o Pipo');
  assert.equal(persisted().completed.cook, 1);
  assert.equal(persisted().completed.letters, 3);
  assert.equal(persisted().outfit, 'overalls');
  key('Escape');
  assert.equal($('kitchen-sheet').hidden, true);
  assert.equal(document.activeElement, kitchenTrigger);
  click('#parent-btn');
  const speechInParents = spoken.length;
  clock.advance(2000);
  assert.equal(spoken.length, speechInParents, 'o anúncio do enfeite ganho não interrompe os ajustes da família');
  click('#parent-done');

  // Sair por cada caminho destrói a rodada; callbacks já entregues não mexem
  // no save nem na fala, mesmo se forem executados depois do cancelamento.
  for (const leave of ['escape', 'wardrobe', 'bath', 'parents', 'pagehide', 'hidden']) {
    const oldCallbacks = beginBake();
    if (leave === 'escape') key('Escape');
    if (leave === 'wardrobe') click('#wardrobe-open');
    if (leave === 'bath') click('.dock-btn.bath');
    if (leave === 'parents') click('#parent-btn');
    if (leave === 'pagehide') window.dispatchEvent(new window.Event('pagehide'));
    if (leave === 'hidden') {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new window.Event('visibilitychange'));
    }
    assert.equal($('kitchen-sheet').hidden, true, 'sair da cozinha: ' + leave);
    const stableState = game.getState(), stablePrompt = $('prompt-text').textContent, stableSpeech = spoken.length;
    oldCallbacks.forEach(fn => fn());
    assert.deepEqual(game.getState(), stableState, 'a rodada fechada não altera o estado: ' + leave);
    assert.equal($('prompt-text').textContent, stablePrompt, 'a rodada fechada não fala: ' + leave);
    assert.equal(spoken.length, stableSpeech, 'o forno fechado não dispara áudio: ' + leave);
    if (leave === 'wardrobe') click('#wardrobe-back');
    if (leave === 'bath') click('#mode-tools .tool-close');
    if (leave === 'parents') click('#parent-done');
    if (leave === 'hidden') {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new window.Event('visibilitychange'));
    }
  }
  assert.equal(game.getState().completed.cook, 1);

  // O limite diário fecha o forno antes de a criança poder servir o prato.
  click('#parent-btn');
  click('#limit-options [data-limit="15"]');
  click('#parent-done');
  const sleepingCallbacks = beginBake();
  for (let i = 0; i < 450 && $('rest-screen').hidden; i++) clock.tickGame();
  assert.equal($('rest-screen').hidden, false);
  assert.equal($('kitchen-sheet').hidden, true);
  assert.equal(document.activeElement, $('rest-unlock'), 'a tela de descanso recebe o foco quando fecha o forno');
  assert.equal(game.getState().sleeping, true);
  const rested = game.getState();
  const restedSpeech = spoken.length;
  sleepingCallbacks.forEach(fn => fn());
  assert.deepEqual(game.getState(), rested, 'callbacks do forno não atravessam a tela de descanso');
  assert.equal(spoken.length, restedSpeech, 'o forno não fala durante descanso');
  click('#kitchen-open');
  click('#wardrobe-open');
  assert.equal($('kitchen-sheet').hidden, true, 'não dá para abrir cozinha durante descanso');
  assert.equal($('wardrobe-sheet').hidden, true, 'não dá para abrir roupas durante descanso');
  assert.equal(persisted().completed.cook, 1);
});
