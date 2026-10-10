import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { createKitchen, kitchenRound, kitchenAction, KITCHEN_RECIPES } from '../src/kitchen.js';

function kitchen(t) {
  const original = {
    window: globalThis.window, document: globalThis.document,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, now: Date.now,
  };
  const { window } = parseHTML('<html><body><main id="kitchen"></main></body></html>');
  globalThis.window = window;
  globalThis.document = window.document;
  const pending = new Map();
  let serial = 0;
  let now = 10000;
  globalThis.setTimeout = (fn, delay) => {
    const id = ++serial;
    pending.set(id, { fn, at: now + delay });
    return id;
  };
  globalThis.clearTimeout = id => pending.delete(id);
  Date.now = () => now;
  t.after(() => {
    globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout;
    Date.now = original.now;
    for (const key of ['window', 'document']) {
      if (original[key] === undefined) delete globalThis[key];
      else globalThis[key] = original[key];
    }
  });
  const body = document.getElementById('kitchen');
  const speech = [];
  const served = [];
  const reactions = [];
  const ctx = {
    body,
    state: () => ({ food: 100, outfit: 'shirt', outfitColor: 'blue', accessory: 'none' }),
    audio: { pop() {}, good() {}, haptic() {} },
    say: words => speech.push(words),
    serve: dish => served.push(dish),
    react: mood => reactions.push(mood),
    touch() {}, burst() {},
  };
  let app = createKitchen(ctx);
  const q = selector => body.querySelector(selector);
  const click = selector => {
    const node = typeof selector === 'string' ? q(selector) : selector;
    assert.ok(node, 'controle disponível: ' + selector);
    node.click();
  };
  const advance = delay => {
    const until = now + delay;
    let count = 0;
    while (pending.size) {
      const [id, next] = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (next.at > until) break;
      assert.ok(count++ < 50, 'a espera termina sem loop');
      now = next.at;
      pending.delete(id);
      next.fn();
    }
    now = until;
  };
  const drag = (node, target) => {
    document.elementsFromPoint = () => [target];
    for (const [type, x, y] of [['pointerdown', 10, 10], ['pointermove', 100, 100], ['pointerup', 100, 100]]) {
      const event = new window.Event(type, { bubbles: true });
      Object.assign(event, { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
      node.dispatchEvent(event);
    }
  };
  return {
    body, q, click, advance, drag, speech, served, reactions,
    stage: () => q('.kitchen-room').dataset.stage,
    destroy: () => app.destroy(),
    reopen: () => { app.destroy(); app = createKitchen(ctx); },
    callbacks: () => [...pending.values()].map(timer => timer.fn),
    timers: () => pending.size,
  };
}

test('cozinha: combinações livres preservam a receita e têm limite sem consumir ingredientes', () => {
  let round = kitchenRound('banana-cake');
  for (let i = 0; i < 5; i++) round = kitchenAction(round, 'add', 'cheese');
  assert.equal(round.recipe, 'banana-cake');
  assert.equal(round.ingredients.length, 5, 'até ingredientes fora da sugestão podem entrar');
  assert.equal(kitchenAction(round, 'add', 'tomato'), round, 'o limite mantém o prato atual');
  assert.equal(kitchenAction(round, 'add', 'missing'), round, 'dados desconhecidos não entram');
  assert.equal(kitchenAction(round, 'serve'), round, 'comida crua não pode ser servida');
  round = kitchenAction(round, 'undo');
  assert.equal(round.ingredients.length, 4);
  round = kitchenAction(round, 'bake');
  assert.equal(kitchenAction(round, 'add', 'milk'), round, 'a composição permanece durante o forno');
  assert.equal(kitchenAction(round, 'serve'), round);
  round = kitchenAction(round, 'ready');
  round = kitchenAction(round, 'serve');
  assert.equal(kitchenAction(round, 'serve'), round, 'o mesmo prato tem uma única entrega');
});

for (const recipe of KITCHEN_RECIPES) {
  test('cozinha: ' + recipe.name + ' pode ser preparada, assada e servida mesmo com Pipo cheio', t => {
    const k = kitchen(t);
    k.click('[data-recipe="' + recipe.id + '"]');
    k.click('[data-ingredient="cheese"]');
    k.click('[data-ingredient="carrot"]');
    assert.equal(k.q('.kitchen-toppings').children.length, 2);
    const raw = k.q('.kitchen-plate-drawing').innerHTML;
    k.click('.kitchen-oven');
    assert.equal(k.stage(), 'baking');
    assert.ok(k.q('[data-ingredient="banana"]').disabled);
    k.advance(3999);
    assert.equal(k.stage(), 'baking', 'o prato ainda está no forno');
    assert.equal(k.served.length, 0);
    k.advance(1);
    assert.equal(k.stage(), 'ready');
    assert.notEqual(k.q('.kitchen-plate-drawing').innerHTML, raw, 'a comida assada muda de aparência');
    k.click('.kitchen-plate');
    k.click('.kitchen-chef');
    k.click('.kitchen-plate');
    assert.equal(k.stage(), 'served');
    assert.equal(k.served.length, 1, 'toques repetidos não alimentam de novo');
    assert.equal(k.q('.pipo-portrait').dataset.mood, 'eat', 'Pipo reage comendo o prato');
    k.advance(850);
    assert.equal(k.q('.pipo-portrait').dataset.mood, 'happy');
    assert.deepEqual(k.served[0], { recipe: recipe.id, name: recipe.name, emoji: recipe.emoji, ingredients: ['cheese', 'carrot'] });
    assert.equal(k.q('.kitchen-toppings').children.length, 0, 'Pipo comeu os ingredientes');
    k.click('.kitchen-clear');
    assert.equal(k.stage(), 'preparing');
    assert.equal(k.q('.kitchen-plate').disabled, true, 'outro prato começa vazio');
    assert.equal(k.q('[data-ingredient="banana"]').disabled, false);
  });
}

test('cozinha: ingredientes, forno e prato pronto podem ser arrastados só ao destino correspondente', t => {
  const k = kitchen(t);
  const carrot = k.q('[data-ingredient="carrot"]');
  const plate = k.q('.kitchen-plate');
  const oven = k.q('.kitchen-oven');
  const chef = k.q('.kitchen-chef');
  k.drag(carrot, chef);
  assert.equal(k.q('.kitchen-toppings').children.length, 0, 'ingrediente cru não é servido diretamente');
  k.drag(carrot, plate);
  assert.equal(k.q('.kitchen-toppings').children.length, 1);
  k.drag(plate, chef);
  assert.equal(k.stage(), 'preparing', 'arrastar prato cru ao Pipo não pula o forno');
  k.drag(plate, oven);
  assert.equal(k.stage(), 'baking');
  k.advance(4000);
  k.drag(plate, oven);
  assert.equal(k.stage(), 'ready', 'a comida pronta aguarda o Pipo');
  k.drag(plate, chef);
  assert.equal(k.stage(), 'served');
  assert.equal(k.served.length, 1);
});

test('cozinha: tirar, limpar e trocar de receita permitem refazer sem recompensas nem callbacks antigos', t => {
  const k = kitchen(t);
  k.click('[data-ingredient="tomato"]');
  k.click('[data-ingredient="milk"]');
  k.click('.kitchen-undo');
  assert.equal(k.q('.kitchen-toppings').textContent, '🍅');
  k.click('.kitchen-clear');
  assert.equal(k.q('.kitchen-toppings').children.length, 0);
  k.click('[data-ingredient="banana"]');
  k.click('.kitchen-oven');
  const oldCallbacks = k.callbacks();
  k.click('[data-recipe="roast-vegetables"]');
  assert.equal(k.stage(), 'preparing');
  assert.equal(k.timers(), 0, 'trocar a receita cancela a espera');
  const html = k.body.innerHTML;
  const speech = k.speech.length;
  oldCallbacks.forEach(callback => callback());
  assert.equal(k.body.innerHTML, html, 'o forno anterior não marca a nova receita como pronta');
  assert.equal(k.speech.length, speech);
  assert.equal(k.served.length, 0);
  k.click('[data-ingredient="carrot"]');
  k.click('.kitchen-oven');
  const clearedCallbacks = k.callbacks();
  k.click('.kitchen-clear');
  assert.equal(k.timers(), 0, 'limpar também pode cancelar um prato no forno');
  clearedCallbacks.forEach(callback => callback());
  assert.equal(k.stage(), 'preparing');
  assert.equal(k.q('.kitchen-toppings').children.length, 0);
  assert.equal(k.served.length, 0);
});

test('cozinha: fechar durante o forno cancela os timers e deixa callbacks e botões antigos inertes', t => {
  const k = kitchen(t);
  k.click('[data-ingredient="tomato"]');
  k.click('.kitchen-oven');
  const callbacks = k.callbacks();
  const oldChef = k.q('.kitchen-chef');
  const oldIngredient = k.q('[data-ingredient="banana"]');
  k.reopen();
  assert.equal(k.timers(), 0);
  const html = k.body.innerHTML;
  const speech = k.speech.length;
  callbacks.forEach(callback => callback());
  oldChef.click();
  oldIngredient.click();
  assert.equal(k.body.innerHTML, html);
  assert.equal(k.speech.length, speech, 'Pipo só fala pela cozinha atual');
  assert.equal(k.served.length, 0);
  assert.equal(k.stage(), 'preparing');
  k.click('[data-ingredient="banana"]');
  k.click('.kitchen-oven');
  k.advance(4000);
  k.click('.kitchen-chef');
  assert.equal(k.served.length, 1, 'a nova cozinha continua funcionando');
});

test('cozinha: ouvir o passo repete a instrução sem avançar nem consumir ingredientes', t => {
  const k = kitchen(t);
  k.click('[data-ingredient="milk"]');
  const html = k.body.innerHTML;
  k.click('.kitchen-listen');
  assert.equal(k.speech.at(-1), k.q('.kitchen-instruction').textContent);
  assert.equal(k.body.innerHTML, html);
  assert.equal(k.stage(), 'preparing');
  assert.equal(k.served.length, 0);
});
