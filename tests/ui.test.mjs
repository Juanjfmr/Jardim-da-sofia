import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

// Jornada completa sem WebGL (o jogo cai no modo simples): começar, cuidar, brincar
// das seis atividades, enfeitar o Pipo, ajustar o cantinho da família e salvar.
test('jornada completa: começar, cuidar, brincar, enfeitar, ajustar e salvar', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const { window } = parseHTML(html);
  globalThis.window = window;
  globalThis.document = window.document;
  const saved = new Map();
  globalThis.localStorage = { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) };
  const intervals = [];
  const originalInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, t) => { const id = originalInterval(fn, t); intervals.push(id); id.unref(); return id; };
  const oldRandom = Math.random;
  Math.random = () => 0.25;
  const oldWarn = console.warn, oldError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    await import('../dist/game.js');
    const $ = id => document.getElementById(id);
    const game = window.jardimSofia;
    const click = q => { const e = typeof q === 'string' ? document.querySelector(q) : q; assert.ok(e, 'Botão encontrado: ' + q); e.click(); };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const openGame = id => { click('.dock-btn.games'); assert.equal($('games-sheet').hidden, false); click('.game-card[data-activity="' + id + '"]'); assert.equal($('games-sheet').hidden, true); assert.equal(game.getActivity(), id); };

    assert.equal(game.is3D(), false);
    assert.equal($('welcome').hidden, false);
    assert.match($('title').textContent, /Jardim da Sofia/);
    assert.equal(document.querySelectorAll('.dock-btn').length, 5, 'só cinco botões grandes no menu');
    click('#start-btn');
    assert.equal($('welcome').hidden, true);
    assert.equal(game.getState().visits, 1);
    assert.match($('prompt-text').textContent, /Sofia/);

    // Comer: tocar na fruta alimenta; cheio, o Pipo recusa com carinho.
    click('.dock-btn.feed');
    assert.equal(game.getMode(), 'feed');
    click('[data-fruit="carrot"]');
    assert.equal(game.getState().food, 100);
    click('[data-fruit="apple"]');
    assert.match($('prompt-text').textContent, /cheinho/);
    click('#mode-tools .tool-close');
    assert.equal(game.getMode(), 'home');

    // Letras: errar não pune; acertar monta o nome.
    openGame('letters');
    const wrong = [...document.querySelectorAll('.letter-tile')].find(b => b.textContent !== 'S');
    wrong.click();
    assert.ok(wrong.classList.contains('shake'));
    assert.equal(document.querySelectorAll('.letter-slot.filled').length, 0);
    for (const l of 'SOFIA') {
      const b = [...document.querySelectorAll('.letter-tile')].find(t => t.textContent === l && !t.disabled);
      assert.ok(b, 'letra ' + l);
      b.click();
    }
    await wait(1400);
    assert.ok(document.querySelector('.celebration'));
    assert.match(document.querySelector('.celebration h3').textContent, /Muito bem, Sofia!/);
    assert.equal(game.getState().completed.letters, 1);
    assert.equal(document.querySelectorAll('#activity-footer .big-round').length, 2);
    click('.big-round.back');
    assert.equal($('activity-modal').hidden, true);
    assert.equal(game.getMode(), 'home');

    // Contar
    openGame('count');
    const target = Number(document.querySelector('.goal-number').textContent);
    assert.equal(document.querySelectorAll('.goal-dots i').length, target);
    for (let i = 0; i < target; i++) click('.carrot-tile:not(:disabled)');
    assert.equal(document.querySelectorAll('.carrot-tile:not(:disabled)').length, 0, 'depois de completar, não dá para colher mais');
    await wait(2300);
    assert.equal(game.getState().completed.count, 1);
    click('#activity-close');

    // Cores
    openGame('colors');
    for (let i = 0; i < 3; i++) {
      const name = $('activity-instruction').textContent.match(/flor (\w+)/)[1];
      const b = [...document.querySelectorAll('.flower-btn')].find(f => f.querySelector('span').textContent === name);
      assert.ok(b, 'flor ' + name);
      b.click();
      await wait(720);
    }
    assert.equal(game.getState().completed.colors, 1);
    click('#activity-close');

    // Formas
    openGame('shapes');
    for (let i = 0; i < 3; i++) {
      const instruction = $('activity-instruction').textContent;
      const b = [...document.querySelectorAll('.shape-btn')].find(s => instruction.includes(s.getAttribute('aria-label')));
      assert.ok(b, 'forma de ' + instruction);
      b.click();
      await wait(780);
    }
    assert.equal(game.getState().completed.shapes, 1);
    click('#activity-close');

    // Plantar
    openGame('garden');
    for (let i = 0; i < 4; i++) for (let n = 0; n < 3; n++) document.querySelectorAll('.plot-btn')[i].click();
    assert.deepEqual(game.getState().plants, [3, 3, 3, 3]);
    assert.equal(game.getState().completed.garden, 1);
    click('#activity-close');

    // Música: tocar livre e depois imitar o Pipo (com Math.random fixo a melodia é 1, 3).
    openGame('music');
    click('[data-key="0"]');
    click('#music-memory');
    assert.equal(document.querySelector('[data-key="1"]').disabled, true, 'teclas esperam o Pipo tocar');
    await wait(3050);
    assert.equal(document.querySelector('[data-key="1"]').disabled, false);
    click('[data-key="1"]');
    click('[data-key="3"]');
    await wait(700);
    assert.equal(game.getState().completed.music, 1);
    click('#activity-close');

    // Banho (sem 3D há um botão de espuma)
    click('.dock-btn.bath');
    assert.equal($('rinse-btn').disabled, true);
    for (let i = 0; i < 5; i++) click('#foam-btn');
    assert.equal($('rinse-btn').disabled, false);
    click('#rinse-btn');
    assert.equal(game.getState().clean, 100);
    assert.equal(game.getState().completed.bath, 1);
    click('#mode-tools .tool-close');

    // Bolhas
    click('.dock-btn.play');
    const bubbles = document.querySelectorAll('.bubble-btn');
    assert.equal(bubbles.length, 5);
    [...bubbles].slice(0, 4).forEach(b => b.click());
    assert.equal(document.querySelectorAll('#bubble-count i.on').length, 4);
    bubbles[4].click();
    assert.ok(document.querySelector('#play-again'), 'depois de cinco, aparece "mais bolhas"');
    assert.equal(game.getState().completed.play, 1);
    assert.equal(game.getState().joy, 100);
    click('#mode-tools .tool-close');

    // Dormir e acordar
    click('.dock-btn.sleep');
    assert.equal(game.getState().sleeping, true);
    assert.equal(document.querySelector('.dock-btn.sleep .dock-label').textContent, 'Acordar');
    click('.dock-btn.sleep');
    assert.equal(game.getState().sleeping, false);

    // Enfeites: com 8 flores, o laço chegou e já foi colocado.
    assert.equal(game.getState().rewards, 8);
    assert.equal(game.getState().accessory, 'bow');
    click('#flower-count');
    assert.equal($('wardrobe-sheet').hidden, false);
    const acc = document.querySelectorAll('.accessory-btn');
    assert.equal(acc.length, 6);
    acc[3].click(); // coroa ainda trancada
    assert.equal(game.getState().accessory, 'bow');
    acc[1].click();
    assert.equal(game.getState().accessory, 'flower');
    click('#wardrobe-sheet .sheet-close');
    assert.equal($('wardrobe-sheet').hidden, true);

    // Cantinho da família (teclado abre direto; no toque é preciso segurar).
    click('#parent-btn');
    assert.equal($('parent-modal').hidden, false);
    document.querySelectorAll('.difficulty-option')[2].click();
    assert.equal(game.getState().level, 3);
    $('name-setting').value = '  Ana!! ';
    $('name-setting').dispatchEvent(new window.Event('change'));
    assert.equal(game.getState().name, 'Ana');
    assert.match($('title').textContent, /Jardim da Ana/);
    $('article-setting').querySelectorAll('option').forEach(o => { if (o.value === 'de') o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    $('article-setting').dispatchEvent(new window.Event('change'));
    assert.match($('title').textContent, /Jardim de Ana/);
    click('#limit-options [data-limit="15"]');
    assert.equal(game.getState().limit, 15);
    $('music-setting').checked = false;
    $('music-setting').dispatchEvent(new window.Event('change'));
    assert.equal(game.getState().music, false);
    click('#parent-done');
    assert.equal($('parent-modal').hidden, true);

    const persisted = JSON.parse(saved.get('jardim-sofia-v1'));
    assert.equal(persisted.completed.music, 1);
    assert.equal(persisted.accessory, 'flower');
    assert.equal(persisted.rewards, 8);
    assert.equal(persisted.name, 'Ana');
    assert.equal(persisted.limit, 15);
    assert.equal(persisted.music, false);
    assert.equal(game.getMode(), 'home');
  } finally {
    intervals.forEach(clearInterval);
    globalThis.setInterval = originalInterval;
    Math.random = oldRandom;
    console.warn = oldWarn;
    console.error = oldError;
  }
});
