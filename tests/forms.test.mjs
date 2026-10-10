import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { createActivities } from '../src/activities.js';
import { initialState, reward } from '../src/state.js';

// Relógio virtual: as demonstrações e as transições de rodada não precisam
// esperar tempo real para conferir o que a criança pode fazer antes e depois.
function workshop(t, { level = 1, completed = 1 } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document };
  const { window } = parseHTML('<html><body><main id="activity-body"></main></body></html>');
  globalThis.window = window;
  globalThis.document = window.document;
  t.after(() => {
    for (const key of ['window', 'document']) {
      if (previous[key] === undefined) delete globalThis[key];
      else globalThis[key] = previous[key];
    }
  });
  const body = document.getElementById('activity-body');
  let state = { ...initialState(), level, completed: { shapes: completed } };
  let current = null;
  let now = 0;
  let serial = 0;
  const pending = [];
  const successes = [];
  const misses = [];
  const speech = [];
  const ctx = {
    state: () => state,
    current: () => current,
    body: () => body,
    update: update => { state = update(state); },
    instruct: (text, said = text) => speech.push(said),
    schedule: (fn, delay) => {
      const timer = { fn, at: now + delay, serial: serial++ };
      pending.push(timer);
      return timer;
    },
    coach: {
      watch() {}, clear() {}, hit() {},
      miss: () => misses.push(true),
    },
    audio: { soft() {}, good() {}, haptic() {}, say: text => speech.push(text) },
    react() {}, burst() {},
    success: (...args) => {
      successes.push(args);
      current.rewarded = true;
      state = reward(state, args[0]);
    },
  };
  const activities = createActivities(ctx);
  const open = () => {
    current = { id: 'shapes', rewarded: false, busy: false };
    activities.shapes(current);
    return current;
  };
  const flush = () => {
    let count = 0;
    while (pending.length) {
      assert.ok(count++ < 100, 'as transições da brincadeira terminam');
      pending.sort((a, b) => a.at - b.at || a.serial - b.serial);
      const next = pending.shift();
      now = next.at;
      next.fn();
    }
  };
  const detachCallbacks = () => pending.splice(0).map(timer => timer.fn);
  const slots = () => [...body.querySelectorAll('.shape-board-slots .shape-slot')];
  const filled = () => slots().filter(slot => slot.classList.contains('is-filled'));
  const activeSlot = () => body.querySelector('.shape-slot.is-current');
  const pieceFor = shape => body.querySelector('.shape-btn[data-shape="' + shape + '"]');
  const chooseCorrect = () => {
    const target = activeSlot();
    assert.ok(target, 'a criança tem um espaço indicado para continuar');
    const piece = pieceFor(target.dataset.shape);
    assert.ok(piece, 'a peça pedida aparece na bandeja');
    piece.click();
    return { target, piece };
  };
  open();
  return { window, body, open, flush, detachCallbacks, slots, filled, activeSlot, pieceFor, chooseCorrect,
    successes, misses, speech, state: () => state };
}

test('Formas: a primeira demonstração ensina sem preencher nem dar uma flor', t => {
  const w = workshop(t, { completed: 0 });
  assert.ok(w.body.querySelector('.shape-workshop.is-demonstrating'), 'Pipo demonstra na primeira brincadeira');
  w.chooseCorrect();
  assert.equal(w.filled().length, 0, 'tocar durante a demonstração não resolve a peça pela criança');
  w.flush();
  assert.equal(w.filled().length, 0);
  assert.equal(w.successes.length, 0);
  assert.equal(w.state().rewards, 0);
  assert.equal(w.state().completed.shapes, 0);
  assert.equal(w.body.querySelector('.shape-workshop.is-demonstrating'), null);
  w.chooseCorrect();
  w.flush();
  assert.equal(w.filled().length, 1, 'depois de observar, a criança pode tentar o primeiro encaixe');
});

test('Formas: repetir a demonstração preserva as peças já encaixadas', t => {
  const w = workshop(t);
  const { target, piece } = w.chooseCorrect();
  w.flush();
  const next = w.activeSlot().dataset.shape;
  const demo = w.body.querySelector('.shape-demo-btn');
  assert.ok(demo && !demo.disabled, 'a criança pode pedir outra demonstração');
  demo.click();
  w.chooseCorrect();
  assert.equal(w.filled().length, 1, 'a demonstração não consome a próxima peça');
  w.flush();
  assert.ok(w.slots().includes(target), 'o primeiro encaixe continua no brinquedo');
  assert.ok(target.classList.contains('is-filled'));
  assert.ok(piece.disabled, 'a primeira peça não volta para a bandeja');
  assert.equal(w.activeSlot().dataset.shape, next);
  assert.equal(w.state().rewards, 0);
  assert.equal(w.successes.length, 0);
  w.chooseCorrect();
  w.flush();
  assert.equal(w.filled().length, 2, 'a próxima peça ainda pode ser encaixada pela criança');
});

test('Formas: callbacks de uma demonstração fechada não alteram a nova rodada', t => {
  const w = workshop(t, { completed: 0 });
  const oldCallbacks = w.detachCallbacks();
  assert.ok(oldCallbacks.length, 'a demonstração anterior deixou callbacks agendados');
  w.open();
  w.body.querySelector('.shape-demo-btn').click();
  const newSlots = w.slots();
  const newBoard = w.body.querySelector('.shape-workshop');
  const newHtml = w.body.innerHTML;
  const spoken = w.speech.length;
  oldCallbacks.forEach(fn => fn());
  assert.equal(w.body.innerHTML, newHtml, 'a demonstração anterior não mexe na nova interface');
  assert.equal(w.speech.length, spoken, 'Pipo não fala instruções da rodada fechada');
  assert.ok(newBoard.classList.contains('is-demonstrating'), 'os callbacks antigos não encerram a nova demonstração');
  w.flush();
  assert.equal(w.body.querySelector('.shape-workshop'), newBoard);
  assert.deepEqual(w.slots(), newSlots);
  assert.equal(w.filled().length, 0);
  assert.equal(w.successes.length, 0);
  assert.equal(w.state().rewards, 0);
  w.chooseCorrect();
  w.flush();
  assert.equal(w.filled().length, 1, 'a nova rodada fica pronta para receber a criança');
});

test('Formas: errar mantém a peça disponível e permite tentar de novo', t => {
  const w = workshop(t);
  const current = w.activeSlot();
  const wrong = [...w.body.querySelectorAll('.shape-btn')].find(piece => piece.dataset.shape !== current.dataset.shape);
  wrong.click();
  w.flush();
  assert.equal(w.misses.length, 1, 'Pipo sabe quando deve ajudar');
  assert.equal(w.filled().length, 0);
  assert.equal(w.activeSlot(), current, 'o espaço pedido permanece o mesmo');
  assert.equal(wrong.disabled, false, 'errar não retira a peça');
  assert.equal(w.state().rewards, 0);
  w.chooseCorrect();
  w.flush();
  assert.equal(w.filled().length, 1);
});

test('Formas: três encaixes ficam expostos e dão uma única recompensa', t => {
  const w = workshop(t, { completed: 0 });
  w.flush();
  const originalSlots = w.slots();
  for (let i = 0; i < 3; i++) {
    const { target, piece } = w.chooseCorrect();
    piece.click(); // Um segundo toque enquanto a peça se acomoda não avança de novo.
    w.flush();
    assert.equal(w.filled().length, i + 1);
    assert.ok(target.classList.contains('is-filled'));
    assert.ok(target.querySelector('svg'), 'a peça encaixada fica visível');
    assert.equal(piece.disabled, true, 'a peça encaixada não pode ser reutilizada');
    assert.deepEqual(w.slots(), originalSlots, 'o brinquedo conserva os encaixes anteriores');
    assert.equal(w.successes.length, i === 2 ? 1 : 0);
  }
  [...w.body.querySelectorAll('.shape-btn')].forEach(piece => piece.click());
  w.flush();
  assert.equal(w.successes.length, 1);
  assert.equal(w.state().completed.shapes, 1);
  assert.equal(w.state().rewards, 1);
  assert.equal(w.successes[0][0], 'shapes');
  assert.equal(w.successes[0][3], true, 'a comemoração deve preservar o brinquedo preenchido');
});

for (const [level, total] of [[2, 4], [3, 5]]) {
  test('Formas: nível ' + level + ' só termina depois de encaixar ' + total + ' peças', t => {
    const w = workshop(t, { level });
    assert.equal(w.slots().length, total);
    assert.equal(w.body.querySelectorAll('.shape-btn').length, total);
    for (let i = 0; i < total; i++) {
      w.chooseCorrect();
      w.flush();
      assert.equal(w.filled().length, i + 1);
      assert.equal(w.successes.length, i + 1 === total ? 1 : 0);
    }
    assert.equal(w.state().rewards, 1);
  });
}

test('Formas: soltar a peça correta em outro espaço não faz o encaixe', t => {
  const w = workshop(t);
  const target = w.activeSlot();
  const other = w.slots().find(slot => slot !== target);
  const piece = w.pieceFor(target.dataset.shape);
  document.elementsFromPoint = () => [other];
  const pointer = (type, x, y) => {
    const event = new w.window.Event(type, { bubbles: true });
    Object.assign(event, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
    piece.dispatchEvent(event);
  };
  pointer('pointerdown', 20, 20);
  pointer('pointermove', 100, 100);
  pointer('pointerup', 100, 100);
  w.flush();
  assert.equal(w.filled().length, 0);
  assert.equal(w.activeSlot(), target);
  assert.equal(piece.disabled, false);
  assert.equal(w.successes.length, 0);
  document.elementsFromPoint = () => [target];
  pointer('pointerdown', 20, 20);
  pointer('pointermove', 100, 100);
  pointer('pointerup', 100, 100);
  w.flush();
  assert.equal(w.filled().length, 1, 'soltar no espaço indicado encaixa a mesma peça');
});
