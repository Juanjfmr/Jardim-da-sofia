// As seis brincadeiras. Cada uma desenha no corpo da janela de atividade e conversa
// com o jogo só pelo `ctx` (estado, voz, reações do Pipo, dicas e comemoração).
import { icon } from './icons.js';
import { installDrag, makeButton } from './ui.js';
import { shapeFriendSVG } from './shape-friend.js';
import { createCreativeActivities } from './creative-activities.js';
import {
  wordsFor, letterRound, pickLetter, countingRound, pickCarrot,
  colorRounds, shapesForLevel, SHAPE_NAMES, shuffle,
} from './state.js';

export const ACTIVITY_LIST = [
  { id: 'letters', name: 'Letras', icon: 'letters', tag: 'LETRAS E PALAVRAS', title: 'Vamos montar?', color: '#fde3e8', emoji: '🔤' },
  { id: 'count', name: 'Contar', icon: 'count', tag: 'HORTA DO PIPO', title: 'Hora da colheita', color: '#fff0cf', emoji: '🥕' },
  { id: 'colors', name: 'Cores', icon: 'colors', tag: 'CORES DO JARDIM', title: 'Flores coloridas', color: '#e3f1fb', emoji: '🌸' },
  { id: 'shapes', name: 'Formas', icon: 'shapes', tag: 'FORMAS E ENCAIXES', title: 'Encaixe a peça', color: '#e9f5df', emoji: '🧩' },
  { id: 'music', name: 'Música', icon: 'music', tag: 'MÚSICA E MEMÓRIA', title: 'O Pipo quer dançar', color: '#efe7fb', emoji: '🎵' },
  { id: 'garden', name: 'Plantar', icon: 'garden', tag: 'SEMENTES E FLORES', title: 'Seu pequeno jardim', color: '#e6f3e2', emoji: '🌷' },
  { id: 'art', name: 'Ateliê', icon: 'art', tag: 'CRIE DO SEU JEITO', title: 'Ateliê do Pipo', color: '#fde7df', emoji: '🎨' },
  { id: 'explore', name: 'Explorar', icon: 'explore', tag: 'DESCUBRA A NATUREZA', title: 'Pequenos exploradores', color: '#e4f5e8', emoji: '🔎' },
];

export const NUM = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze'];
export const NUM_F = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze'];
export const LETTER_SPOKEN = {
  A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i', J: 'jota', K: 'cá', L: 'éle', M: 'ême',
  N: 'êne', O: 'ó', P: 'pê', Q: 'quê', R: 'érre', S: 'ésse', T: 'tê', U: 'u', V: 'vê', W: 'dáblio', X: 'xis', Y: 'ípsilon', Z: 'zê',
};
const spokenLetter = l => LETTER_SPOKEN[l] || l.toLocaleLowerCase('pt-BR');
const HINT_DELAY = [6000, 9000, 14000];

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

export function flowerSVG(color) {
  return '<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M50 65v38" stroke="#6fa45f" stroke-width="5" stroke-linecap="round"/>'
    + '<ellipse cx="37" cy="83" rx="13" ry="6" fill="#8cc275" transform="rotate(25 37 83)"/><ellipse cx="63" cy="76" rx="13" ry="6" fill="#7bb867" transform="rotate(-25 63 76)"/>'
    + '<g fill="' + color + '"><circle cx="50" cy="20" r="17"/><circle cx="73" cy="37" r="17"/><circle cx="65" cy="63" r="17"/><circle cx="35" cy="63" r="17"/><circle cx="27" cy="37" r="17"/></g>'
    + '<circle cx="50" cy="43" r="17" fill="#ffe08a"/><circle cx="44" cy="40" r="3" fill="#6b4b2a"/><circle cx="56" cy="40" r="3" fill="#6b4b2a"/><path d="M44 48q6 5 12 0" stroke="#6b4b2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
    + '<path d="M29 96h42l-5 22H34Z" fill="#e2a98c"/></svg>';
}

const SHAPE_PATHS = {
  circle: '<circle cx="50" cy="50" r="40"/>',
  triangle: '<path d="M50 8 93 88H7Z"/>',
  square: '<rect x="12" y="12" width="76" height="76" rx="10"/>',
  star: '<path d="M50 5 62 36l33 2-26 21 9 32-28-18-28 18 9-32L5 38l33-2Z"/>',
  heart: '<path d="M50 89 13 55C-3 39 7 11 30 11c10 0 16 6 20 13 4-7 10-13 20-13 23 0 33 28 17 44Z"/>',
};
export function shapeSVG(shape, color = '#8db5cf', outline = false) {
  const style = outline ? 'fill="#efe9d6" stroke="#b9ae8c" stroke-width="4" stroke-dasharray="9 7"' : 'fill="' + color + '" stroke="rgba(0,0,0,.08)" stroke-width="3"';
  return '<svg viewBox="0 0 100 100" aria-hidden="true" ' + style + ' stroke-linejoin="round">' + SHAPE_PATHS[shape] + '</svg>';
}
const SHAPE_COLORS = ['#f497a8', '#f5c454', '#7cbfe4', '#8ccd7a', '#b9a0e6'];

function progressDots(done, total) {
  return '<div class="round-progress" aria-label="' + done + ' de ' + total + '">'
    + Array.from({ length: total }, (_, i) => '<i class="' + (i < done ? 'done' : i === done ? 'now' : '') + '"></i>').join('') + '</div>';
}

export function createActivities(ctx) {
  const level = () => ctx.state().level;
  const alive = cur => ctx.current() === cur && !cur.rewarded;
  const watch = getTarget => ctx.coach.watch(getTarget, HINT_DELAY[level() - 1]);

  // ---------- Letras ----------
  function letters(cur) {
    const words = wordsFor(ctx.state());
    const entry = words[(ctx.state().completed.letters || 0) % words.length];
    cur.entry = entry;
    cur.round = letterRound(entry.word);
    drawLetters(cur);
    const said = entry.isName ? 'o seu nome' : entry.word.toLocaleLowerCase('pt-BR');
    ctx.instruct('Vamos montar ' + (entry.isName ? 'o seu nome' : entry.word) + '. Encontre a letra ' + entry.word[0] + '.',
      'Vamos montar ' + said + '! Encontre a letra ' + spokenLetter(entry.word[0]) + '.');
  }
  function drawLetters(cur, justFilled = -1) {
    const r = cur.round;
    const body = ctx.body();
    body.innerHTML = '';
    const top = el('div', 'word-top');
    top.appendChild(el('div', 'word-picture', cur.entry.pic));
    const slots = el('div', 'letter-slots');
    [...r.word].forEach((l, i) => {
      const filled = i < r.placed.length;
      const slot = el('div', 'letter-slot' + (filled ? ' filled' : i === r.placed.length ? ' current' : '') + (i === justFilled ? ' just-filled' : ''));
      slot.textContent = filled || level() < 3 ? l : '';
      slot.setAttribute('aria-label', 'Espaço da letra ' + l);
      slots.appendChild(slot);
    });
    top.appendChild(slots);
    body.appendChild(top);
    const tray = el('div', 'tile-tray');
    r.tiles.forEach(tile => {
      const b = makeButton('letter-tile' + (tile.used ? ' used' : ''), tile.letter, null, 'Letra ' + tile.letter);
      b.dataset.letter = tile.letter;
      b.disabled = tile.used;
      installDrag(b, {
        onTap: () => chooseLetter(cur, tile.id, b),
        onDrop: (_, x, y, under) => {
          if (!under.some(n => n.closest?.('.letter-slots'))) return false;
          return chooseLetter(cur, tile.id, b);
        },
      });
      tray.appendChild(b);
    });
    body.appendChild(tray);
    if (!r.done) watch(() => [...body.querySelectorAll('.letter-tile:not(.used)')].find(b => b.dataset.letter === r.word[r.placed.length]));
  }
  function chooseLetter(cur, id, button) {
    if (!alive(cur) || cur.busy) return false;
    const tile = cur.round.tiles.find(t => t.id === id);
    const result = pickLetter(cur.round, id);
    if (!result.accepted) {
      ctx.audio.soft();
      ctx.audio.say('Essa é a letra ' + spokenLetter(tile.letter) + '.');
      button.classList.add('shake');
      ctx.schedule(() => button.classList.remove('shake'), 450);
      ctx.coach.miss();
      return false;
    }
    ctx.coach.hit();
    cur.round = result.round;
    ctx.audio.good();
    ctx.audio.haptic(10);
    ctx.react('happy');
    const filled = result.round.placed.length - 1;
    if (result.round.done) {
      ctx.coach.clear();
      drawLetters(cur, filled);
      const word = result.round.word;
      const said = word.toLocaleLowerCase('pt-BR');
      cur.busy = true;
      ctx.audio.say(said + '! Você montou ' + (cur.entry.isName ? 'o seu nome!' : 'a palavra!'));
      ctx.schedule(() => { cur.busy = false; ctx.success('letters', word + '! Você montou ' + (cur.entry.isName ? 'o seu nome.' : 'a palavra.'), cur.entry.pic); }, 1300);
    } else {
      drawLetters(cur, filled);
      const next = result.round.word[result.round.placed.length];
      ctx.instruct('Muito bem! Agora a letra ' + next + '.', 'Isso! Agora a letra ' + spokenLetter(next) + '.');
    }
    return true;
  }

  // ---------- Contar ----------
  function count(cur) {
    cur.round = countingRound(level());
    drawCount(cur);
    const n = cur.round.target;
    ctx.instruct('Colha ' + n + ' ' + (n === 1 ? 'cenoura' : 'cenouras') + ' para o Pipo.',
      'Vamos colher ' + NUM_F[n] + ' ' + (n === 1 ? 'cenoura' : 'cenouras') + ' para o Pipo. Toque nas cenouras!');
  }
  function drawCount(cur, justPicked = -1) {
    const r = cur.round;
    const body = ctx.body();
    body.innerHTML = '';
    const goal = el('div', 'count-goal');
    goal.innerHTML = '<span class="goal-number">' + r.target + '</span><span class="goal-dots">'
      + Array.from({ length: r.target }, (_, i) => '<i class="' + (i < r.picked.length ? 'on' : '') + '"></i>').join('') + '</span>';
    body.appendChild(goal);
    const field = el('div', 'carrot-field');
    for (let i = 0; i < r.total; i++) {
      const picked = r.picked.includes(i);
      const b = makeButton('carrot-tile' + (picked ? ' picked' : ''), '<span class="carrot-top">' + icon('carrot') + '</span><span class="soil"></span>', () => collectCarrot(cur, i), 'Colher cenoura ' + (i + 1));
      b.disabled = picked || r.done;
      field.appendChild(b);
    }
    body.appendChild(field);
    const basket = el('div', 'basket');
    basket.innerHTML = '<div class="basket-items">' + (r.picked.length
      ? r.picked.map((_, i) => '<span class="' + (i === r.picked.length - 1 && justPicked >= 0 ? 'drop-in' : '') + '">' + icon('carrot') + '</span>').join('')
      : '<span class="basket-empty">🧺</span>') + '</div>';
    body.appendChild(basket);
    if (!r.done) watch(() => body.querySelector('.carrot-tile:not(:disabled)'));
  }
  function collectCarrot(cur, id) {
    if (!alive(cur)) return;
    const next = pickCarrot(cur.round, id);
    if (next === cur.round) return;
    ctx.coach.hit();
    cur.round = next;
    ctx.audio.pop();
    ctx.audio.haptic(8);
    ctx.audio.say(NUM[next.picked.length]);
    drawCount(cur, id);
    if (next.done) {
      ctx.coach.clear();
      const n = next.target;
      ctx.schedule(() => { if (alive(cur)) ctx.audio.say(NUM_F[n] + ' ' + (n === 1 ? 'cenoura' : 'cenouras') + '! O Pipo vai adorar.'); }, 700);
      ctx.feedPet();
      ctx.schedule(() => { if (alive(cur)) ctx.success('count', 'Você colheu ' + NUM_F[n] + ' ' + (n === 1 ? 'cenoura' : 'cenouras') + ' e alimentou o Pipo!', '🥕'); }, 2100);
    }
  }

  // ---------- Cores ----------
  function colors(cur) {
    const { palette, rounds } = colorRounds(level());
    cur.palette = palette;
    cur.order = rounds;
    cur.index = 0;
    drawColors(cur);
  }
  function drawColors(cur) {
    const target = cur.order[cur.index];
    ctx.instruct('Encontre a flor ' + target.name + '.', 'Encontre a flor ' + target.name + '!');
    const body = ctx.body();
    body.innerHTML = progressDots(cur.index, cur.order.length);
    const grid = el('div', 'color-choice-grid' + (cur.palette.length > 4 ? ' many' : ''));
    shuffle(cur.palette).forEach(color => {
      const b = makeButton('flower-btn', flowerSVG(color.hex) + '<span>' + color.name + '</span>', null, 'Flor ' + color.name);
      b.dataset.color = color.id;
      b.addEventListener('click', () => {
        if (!alive(cur) || cur.busy) return;
        if (color.id === target.id) {
          ctx.coach.hit();
          cur.busy = true;
          b.classList.add('chosen');
          ctx.audio.good();
          ctx.audio.haptic(10);
          ctx.react('happy');
          ctx.burst(b, '✨', 4);
          cur.index++;
          const finish = () => {
            cur.busy = false;
            if (!alive(cur)) return;
            if (cur.index === cur.order.length) ctx.success('colors', 'Você encontrou todas as cores. Que jardim bonito!', '🌸');
            else drawColors(cur);
          };
          ctx.schedule(finish, 650);
        } else {
          ctx.audio.soft();
          ctx.audio.say('Essa é a ' + color.name + '. Procure a flor ' + target.name + '.');
          b.classList.add('shake');
          ctx.schedule(() => b.classList.remove('shake'), 450);
          ctx.coach.miss();
        }
      });
      grid.appendChild(b);
    });
    body.appendChild(grid);
    watch(() => body.querySelector('[data-color="' + target.id + '"]'));
  }

  // ---------- Formas ----------
  let shapesIntroduced = false;
  function shapes(cur) {
    cur.shapes = shapesForLevel(level());
    cur.order = shuffle(cur.shapes);
    cur.index = 0;
    cur.placed = [];
    cur.demoToken = 0;
    ctx.body().innerHTML = '';
    drawShapes(cur);
    if (!shapesIntroduced && !ctx.state().completed.shapes) demonstrateShape(cur);
    shapesIntroduced = true;
  }
  const shapeLabel = shape => SHAPE_NAMES[shape].article + ' ' + SHAPE_NAMES[shape].name;
  const shapeColor = shape => SHAPE_COLORS[Object.keys(SHAPE_NAMES).indexOf(shape)];
  function shapeMood(mood) {
    const friend = ctx.body().querySelector('.shape-friend');
    if (friend) friend.dataset.mood = mood;
  }
  function finishShapeDemo(cur, token) {
    if (!alive(cur) || cur.demoToken !== token) return;
    cur.demonstrating = false;
    cur.demoToken++;
    ctx.body().querySelector('.shape-demo-piece')?.remove();
    ctx.body().querySelector('.shape-demo-hand')?.remove();
    drawShapes(cur);
  }
  function demonstrateShape(cur) {
    if (!alive(cur) || cur.busy || cur.index >= cur.order.length) return;
    if (cur.demonstrating) { finishShapeDemo(cur, cur.demoToken); return; }
    ctx.coach.clear();
    cur.demonstrating = true;
    const token = ++cur.demoToken;
    const target = cur.order[cur.index];
    const body = ctx.body();
    const workshop = body.querySelector('.shape-workshop');
    const button = body.querySelector('.shape-btn[data-shape="' + target + '"]');
    const slot = body.querySelector('.shape-slot.is-current');
    workshop.classList.add('is-demonstrating');
    body.querySelectorAll('.shape-btn').forEach(b => { b.disabled = true; });
    const demoButton = body.querySelector('.shape-demo-btn');
    demoButton.querySelector('span').textContent = 'Minha vez';
    demoButton.setAttribute('aria-label', 'Minha vez: começar a encaixar');
    body.querySelector('.shape-story-text').textContent = 'Olhe como eu faço!';
    shapeMood('demo');
    ctx.instruct('O Pipo mostra: encaixe ' + shapeLabel(target) + '.',
      'Olhe! ' + shapeLabel(target) + ' vai aqui.');
    const piece = el('div', 'shape-demo-piece', shapeSVG(target, shapeColor(target)));
    piece.setAttribute('aria-hidden', 'true');
    const from = button.getBoundingClientRect?.();
    const to = slot.getBoundingClientRect?.();
    const origin = workshop.getBoundingClientRect?.();
    if (from?.width && to?.width && origin) {
      piece.style.left = (from.left - origin.left) + 'px';
      piece.style.top = (from.top - origin.top) + 'px';
      piece.style.width = from.width + 'px';
      piece.style.height = from.height + 'px';
      piece.style.setProperty('--demo-x', (to.left + to.width / 2 - from.left - from.width / 2) + 'px');
      piece.style.setProperty('--demo-y', (to.top + to.height / 2 - from.top - from.height / 2) + 'px');
    }
    workshop.appendChild(piece);
    ctx.schedule(() => finishShapeDemo(cur, token), 2600);
  }
  function drawShapes(cur) {
    const target = cur.order[cur.index];
    const complete = !target;
    if (!complete) ctx.instruct('Encaixe ' + shapeLabel(target) + '.', 'Encaixe ' + shapeLabel(target) + '! Toque ou arraste a peça até a sombra.');
    const body = ctx.body();
    const existing = body.querySelector('.shape-workshop');
    if (existing) {
      existing.classList.remove('is-demonstrating');
      existing.classList.toggle('is-complete', complete);
      body.querySelector('.shape-story-text').textContent = complete ? 'Meu brinquedo ficou pronto!' : 'Vamos montar meu brinquedo?';
      shapeMood(complete ? 'happy' : 'idle');
      const demo = body.querySelector('.shape-demo-btn');
      demo.hidden = complete;
      demo.querySelector('span').textContent = 'Ver o Pipo';
      demo.setAttribute('aria-label', 'Ver o Pipo mostrar como encaixar');
      body.querySelector('.shape-board').setAttribute('aria-label', 'Caixa de encaixe: ' + cur.index + ' de ' + cur.order.length + ' peças colocadas');
      body.querySelectorAll('.shape-slot').forEach((slot, i) => {
        slot.classList.toggle('is-filled', i < cur.index);
        slot.classList.toggle('is-current', i === cur.index);
        slot.classList.remove('just-filled');
      });
      body.querySelectorAll('.shape-btn').forEach(b => {
        const used = cur.placed.includes(b.dataset.shape);
        b.classList.toggle('used', used);
        b.disabled = used;
      });
      body.querySelector('.shape-tray').hidden = complete;
      if (!complete) watch(() => body.querySelector('.shape-btn[data-shape="' + target + '"]'));
      return;
    }
    body.innerHTML = '';
    const workshop = el('div', 'shape-workshop' + (complete ? ' is-complete' : ''));
    const story = el('div', 'shape-story');
    const friend = el('div', 'shape-friend', shapeFriendSVG());
    friend.dataset.mood = complete ? 'happy' : 'idle';
    friend.setAttribute('aria-hidden', 'true');
    story.appendChild(friend);
    const bubble = el('div', 'shape-story-bubble');
    bubble.appendChild(el('p', 'shape-story-text', complete ? 'Meu brinquedo ficou pronto!' : 'Vamos montar meu brinquedo?'));
    const demo = makeButton('shape-demo-btn', icon('play') + '<span>Ver o Pipo</span>', () => demonstrateShape(cur), 'Ver o Pipo mostrar como encaixar');
    demo.hidden = complete;
    bubble.appendChild(demo);
    story.appendChild(bubble);
    workshop.appendChild(story);
    const board = el('div', 'shape-board');
    board.setAttribute('aria-label', 'Caixa de encaixe: ' + cur.index + ' de ' + cur.order.length + ' peças colocadas');
    board.appendChild(el('div', 'shape-board-label', 'O brinquedo do Pipo'));
    const slots = el('div', 'shape-board-slots');
    slots.dataset.count = cur.order.length;
    cur.order.forEach((shape, i) => {
      const filled = i < cur.index;
      const slot = el('div', 'shape-slot' + (filled ? ' is-filled' : i === cur.index ? ' is-current' : ''));
      slot.appendChild(el('div', 'shape-target', shapeSVG(shape, shapeColor(shape), !filled)));
      slot.dataset.shape = shape;
      slot.setAttribute('aria-label', (filled ? 'Encaixado: ' : 'Lugar d' + SHAPE_NAMES[shape].article + ' ') + SHAPE_NAMES[shape].name);
      slots.appendChild(slot);
    });
    board.appendChild(slots);
    workshop.appendChild(board);
    if (complete) { body.appendChild(workshop); return; }
    const tray = el('div', 'shape-tray');
    const choices = el('div', 'shape-choices' + (cur.shapes.length > 3 ? ' many' : ''));
    // A posição das peças fica estável enquanto o tabuleiro é preenchido.
    if (!cur.trayOrder) cur.trayOrder = shuffle(cur.shapes);
    cur.trayOrder.forEach(shape => {
      const used = cur.placed.includes(shape);
      const b = makeButton('shape-btn' + (used ? ' used' : ''), shapeSVG(shape, shapeColor(shape)), null, SHAPE_NAMES[shape].name);
      b.dataset.shape = shape;
      b.disabled = used;
      const choose = () => {
        if (!alive(cur) || cur.busy || cur.demonstrating || cur.placed.includes(shape)) return false;
        const currentTarget = cur.order[cur.index];
        if (shape === currentTarget) {
          ctx.coach.hit();
          cur.busy = true;
          const hole = body.querySelector('.shape-slot.is-current');
          hole.querySelector('.shape-target').innerHTML = b.innerHTML;
          hole.classList.add('is-filled', 'just-filled');
          hole.classList.remove('is-current');
          hole.setAttribute('aria-label', 'Encaixado: ' + SHAPE_NAMES[shape].name);
          b.classList.add('used');
          body.querySelectorAll('.shape-btn').forEach(piece => { piece.disabled = true; });
          ctx.audio.good();
          ctx.audio.haptic(12);
          ctx.react('hop');
          shapeMood('happy');
          cur.placed.push(shape);
          cur.index++;
          const finish = () => {
            if (!alive(cur)) return;
            cur.busy = false;
            drawShapes(cur);
            if (cur.index === cur.order.length) ctx.success('shapes', 'O brinquedo do Pipo está pronto!', '🧩', true);
          };
          ctx.schedule(finish, 700);
          return true;
        }
        ctx.audio.soft();
        shapeMood('thinking');
        const a = SHAPE_NAMES[shape].article;
        ctx.audio.say((a === 'a' ? 'Essa é ' : 'Esse é ') + shapeLabel(shape) + '. Procure ' + shapeLabel(currentTarget) + '.');
        b.classList.add('shake');
        ctx.schedule(() => { if (alive(cur)) { b.classList.remove('shake'); shapeMood('idle'); } }, 450);
        ctx.coach.miss();
        return false;
      };
      installDrag(b, {
        onTap: choose,
        onDrop: (_, x, y, under) => under.some(n => n.closest?.('.shape-slot.is-current')) ? choose() : false,
      });
      choices.appendChild(b);
    });
    tray.appendChild(choices);
    workshop.appendChild(tray);
    body.appendChild(workshop);
    watch(() => body.querySelector('.shape-btn[data-shape="' + target + '"]'));
  }

  // ---------- Música ----------
  const KEY_COLORS = ['#f297a8', '#f3c463', '#9fd17d', '#7fc4e2', '#b9a4e3'];
  function music(cur) {
    cur.music = { mode: 'free', sequence: [], step: 0, playing: false, notes: 0 };
    const body = ctx.body();
    body.innerHTML = '<div class="music-controls"><button type="button" id="music-free" class="active"><span>🎹</span>Tocar livre</button><button type="button" id="music-memory"><span>👂</span>Imitar o Pipo</button></div>'
      + '<div class="music-keys">' + KEY_COLORS.map((c, i) => '<button type="button" class="music-key" data-key="' + i + '" aria-label="Nota ' + (i + 1) + '" style="--key:' + c + '"><i></i></button>').join('') + '</div>'
      + '<p class="music-hint" id="music-hint">🎵</p>';
    body.querySelectorAll('.music-key').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); b.dataset.down = '1'; playKey(cur, Number(b.dataset.key)); }));
    body.querySelectorAll('.music-key').forEach(b => b.addEventListener('click', () => { if (b.dataset.down) { delete b.dataset.down; return; } playKey(cur, Number(b.dataset.key)); }));
    body.querySelector('#music-free').addEventListener('click', () => freeMode(cur));
    body.querySelector('#music-memory').addEventListener('click', () => startMelody(cur));
    ctx.instruct('Toque as teclas e faça uma música!', 'Toque as teclas para fazer uma música. O Pipo quer dançar!');
  }
  function freeMode(cur) {
    if (!alive(cur)) return;
    ctx.clearTimers();
    ctx.coach.clear();
    cur.music = { mode: 'free', sequence: [], step: 0, playing: false, notes: 0 };
    const body = ctx.body();
    body.querySelector('#music-free').classList.add('active');
    body.querySelector('#music-memory').classList.remove('active');
    body.querySelectorAll('.music-key').forEach(b => { b.disabled = false; });
    body.querySelector('#music-hint').textContent = '🎵';
    ctx.instruct('Toque as teclas e faça uma música!', 'Toque as teclas. O Pipo dança com você!');
  }
  function lightKey(index) {
    const b = ctx.body().querySelector('[data-key="' + index + '"]');
    if (!b) return;
    b.classList.remove('lit');
    void b.offsetWidth;
    b.classList.add('lit');
    ctx.schedule(() => b.classList.remove('lit'), 300);
    ctx.audio.xylo(index);
    ctx.react('dance');
  }
  function startMelody(cur) {
    if (!alive(cur)) return;
    ctx.clearTimers();
    ctx.coach.clear();
    const length = [2, 3, 4][level() - 1];
    const seq = [];
    while (seq.length < length) {
      let n = Math.floor(Math.random() * 5);
      // Notas vizinhas diferentes deixam a melodia mais fácil de acompanhar.
      if (n === seq[seq.length - 1]) n = (n + 1 + Math.floor(Math.random() * 4)) % 5;
      seq.push(n);
    }
    cur.music = { mode: 'memory', sequence: seq, step: 0, playing: true, notes: 0 };
    const body = ctx.body();
    body.querySelector('#music-free').classList.remove('active');
    body.querySelector('#music-memory').classList.add('active');
    ctx.instruct('Escute o Pipo e depois faça igual.', 'O Pipo vai tocar. Escute e depois faça igual!');
    playMelody(cur);
  }
  function playMelody(cur) {
    const m = cur.music;
    m.playing = true;
    m.step = 0;
    const body = ctx.body();
    body.querySelectorAll('.music-key').forEach(b => { b.disabled = true; });
    body.querySelector('#music-hint').textContent = '👂';
    const start = 1500;
    m.sequence.forEach((note, i) => ctx.schedule(() => { if (alive(cur)) lightKey(note); }, start + i * 700));
    ctx.schedule(() => {
      if (!alive(cur)) return;
      m.playing = false;
      body.querySelectorAll('.music-key').forEach(b => { b.disabled = false; });
      body.querySelector('#music-hint').textContent = '👆';
      ctx.instruct('Sua vez!', 'Sua vez!');
      watch(() => body.querySelector('[data-key="' + m.sequence[m.step] + '"]'));
    }, start + m.sequence.length * 700);
  }
  function playKey(cur, index) {
    if (!alive(cur)) return;
    const m = cur.music;
    if (m.playing) return;
    lightKey(index);
    if (m.mode === 'free') {
      ctx.burst(ctx.body().querySelector('[data-key="' + index + '"]'), ['🎵', '🎶', '✨'][m.notes % 3], 1);
      m.notes++;
      if (m.notes === 12) ctx.audio.say('Que música linda!');
      return;
    }
    if (m.sequence[m.step] === index) {
      ctx.coach.hit();
      m.step++;
      ctx.body().querySelector('#music-hint').textContent = '⭐'.repeat(m.step);
      if (m.step === m.sequence.length) {
        m.playing = true;
        ctx.coach.clear();
        ctx.body().querySelectorAll('.music-key').forEach(b => { b.disabled = true; });
        ctx.schedule(() => { if (alive(cur)) ctx.success('music', 'Você tocou a mesma música que o Pipo!', '🎵'); }, 600);
      } else {
        watch(() => ctx.body().querySelector('[data-key="' + m.sequence[m.step] + '"]'));
      }
    } else {
      ctx.coach.miss();
      ctx.instruct('Vamos escutar mais uma vez.', 'Quase! Vamos escutar mais uma vez.');
      ctx.coach.clear();
      playMelody(cur);
    }
  }

  // ---------- Plantar ----------
  const STAGES = [
    { plant: '', action: '🌰', label: 'Plantar semente', say: 'A semente está plantada. Vamos regar?' },
    { plant: '🌱', action: '💧', label: 'Regar o brotinho', say: 'Olha o brotinho! Mais um pouquinho de água.' },
    { plant: '🌿', action: '💧', label: 'Regar mais uma vez', say: 'Sua flor cresceu!' },
    { plant: '🌸', action: '🧺', label: 'Colher e replantar', say: 'Você colheu a flor. Vamos plantar de novo?' },
  ];
  function garden() {
    drawGarden();
    const all = ctx.state().plants.every(s => s === 3);
    ctx.instruct(all ? 'Seu jardim está florido! Colha uma flor e plante de novo.' : 'Plante e regue até as quatro flores crescerem.',
      all ? 'Seu jardim está florido! Toque numa flor para colher e plantar de novo.' : 'Toque num canteiro para plantar. Depois regue para a flor crescer!');
  }
  function drawGarden(justChanged = -1) {
    const cur = ctx.current();
    const body = ctx.body();
    body.innerHTML = '';
    const grid = el('div', 'plot-grid');
    ctx.state().plants.forEach((stage, index) => {
      const st = STAGES[stage];
      const b = makeButton('plot-btn stage-' + stage + (index === justChanged ? ' changed' : ''),
        '<span class="plant">' + (st.plant || '<i class="hole"></i>') + '</span><span class="plot-action">' + st.action + '</span>', null, st.label + ' no canteiro ' + (index + 1));
      b.dataset.stage = stage;
      b.addEventListener('click', () => {
        if (!alive(cur)) return;
        ctx.coach.hit();
        const plants = [...ctx.state().plants];
        plants[index] = (plants[index] + 1) % 4;
        ctx.update(s => ({ ...s, plants }));
        const now = plants[index];
        ctx.audio.xylo(now + 1);
        if (now === 3) { ctx.burst(b, '🌸', 3); ctx.audio.sparkle(); } else if (now !== 0) ctx.burst(b, '💧', 2);
        ctx.react('happy');
        if (plants.every(s => s === 3)) {
          ctx.coach.clear();
          drawGarden(index);
          ctx.success('garden', 'As quatro flores cresceram. Seu jardim ficou lindo!', '🌷');
        } else {
          ctx.audio.say(STAGES[(now + 3) % 4].say);
          drawGarden(index);
        }
      });
      grid.appendChild(b);
    });
    body.appendChild(grid);
    watch(() => body.querySelector('.plot-btn:not(.stage-3)') || body.querySelector('.plot-btn'));
  }

  return { letters, count, colors, shapes, music, garden, ...createCreativeActivities(ctx) };
}
