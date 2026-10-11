import { GardenWorld } from './world.js';
import { GardenAudio } from './audio.js';
import { icon, pipoFace } from './icons.js';
import { $, makeButton, installDrag, particles, confetti, flyTo, holdToActivate, Coach } from './ui.js';
import { createActivities, ACTIVITY_LIST } from './activities.js';
import { ADVENTURES, adventureProgress, startAdventure, recordAdventureActivity } from './adventures.js';
import { responseToTouch } from './pipo-behaviors.js';
import { createKitchen } from './kitchen.js';
import { createWardrobe } from './wardrobe.js';
import {
  SAVE_KEY, ACCESSORIES, initialState, sanitizeState, sanitizeName, unlockedAccessories,
  care, reward, tick, currentNeed, addPlayTime, timeIsUp, todayKey,
} from './state.js';

// ---------------------------------------------------------------------------
// Estado e utilidades
// ---------------------------------------------------------------------------
let state;
try { state = sanitizeState(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { state = initialState(); }
const audio = new GardenAudio();
let world = null;
let started = false;
let mode = 'home';
let current = null;
let timers = [];
let toastTimer = null;
let saveAvailable = true;
let prompt = 'Que bom ter você aqui!';
let restoreFocus = null;
let lastRub = 0, lastScrub = 0, bathProgress = 0, bathPhase = 'soap', popped = 0;
let lastNeed = null, lastNeedSpoken = 0;
let lastInteraction = Date.now(), nudges = 0;
let petTaps = [];
let lastStrokeSpoken = 0;
let resting = false;
const roomControllers = new Map();

audio.enabled = state.sound;
audio.voice = state.voice;
audio.musicOn = state.music;

const DOCK = [
  ['feed', 'Cozinha', 'carrot'],
  ['bath', 'Banho', 'bath'],
  ['games', 'Brincar', 'games'],
  ['play', 'Bolhas', 'bubbles'],
  ['sleep', 'Dormir', 'moon'],
];
const NEED_INFO = {
  feed: { emoji: '🥕', say: 'Estou com fominha! Me dá uma comidinha?' },
  bath: { emoji: '🫧', say: 'Estou sujinho! Vamos tomar banho?' },
  play: { emoji: '🎈', say: 'Quero brincar! Vamos estourar bolhas?' },
  sleep: { emoji: '💤', say: 'Estou com soninho…' },
};
const PET_LINES = ['Que carinho gostoso!', 'Hihihi, faz cócegas!', 'Eu gosto muito de você!', 'Mais carinho, por favor!'];

// Nome da criança nas frases: nm(', ') → ", Sofia" ou "" quando não há nome.
const nm = (prefix = '', suffix = '') => state.name ? prefix + state.name + suffix : '';
const coarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { saveAvailable = false; }
}
function schedule(fn, delay) { const id = setTimeout(fn, delay); timers.push(id); return id; }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}
const floatAt = (symbol, count, node) => {
  const r = node?.getBoundingClientRect?.();
  particles($('particle-layer'), symbol, count, r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 3 } : null);
};
function touch() { lastInteraction = Date.now(); }

// ---------------------------------------------------------------------------
// Interface fixa
// ---------------------------------------------------------------------------
function renderTitle() {
  const t = $('title');
  if (state.name) {
    t.innerHTML = 'Jardim ' + state.article + ' <em></em>';
    t.querySelector('em').textContent = state.name;
  } else t.innerHTML = 'Meu <em>Jardim</em>';
  const w = $('welcome-title');
  if (state.name) { w.innerHTML = 'Oi, <em></em>'; w.querySelector('em').textContent = state.name + '!'; } else w.innerHTML = 'Oi, <em>amiguinho!</em>';
  document.title = (state.name ? 'Jardim ' + state.article + ' ' + state.name : 'Meu Jardim') + ' · Pipo e você';
  world?.setLetterBlocks(state.name && /^\p{L}{1,5}$/u.test(state.name) ? state.name : 'ABCDE');
}

function buildDock() {
  for (const [id, name, ico] of DOCK) {
    const b = makeButton('dock-btn ' + id, '<span class="dock-icon">' + icon(ico) + '</span><span class="dock-label">' + name + '</span>', () => onDock(id), name);
    b.dataset.mode = id;
    $('dock').appendChild(b);
  }
  for (const a of ACTIVITY_LIST) {
    const b = makeButton('game-card', '<span class="game-icon">' + icon(a.icon) + '</span><span>' + a.name + '</span>', () => { closeSheet('games-sheet', false); openActivity(a.id); }, a.name);
    b.style.setProperty('--tint', a.color);
    b.dataset.activity = a.id;
    $('games-grid').appendChild(b);
  }
  const faces = { 'speech-avatar': {}, 'instruction-avatar': {}, 'welcome-pipo': {}, 'rest-pipo': { sleeping: true } };
  for (const [id, opts] of Object.entries(faces)) $(id).innerHTML = pipoFace(opts);
  document.querySelector('.fallback-pipo').innerHTML = pipoFace();
  for (const [id, ico] of [['repeat-prompt', 'sound'], ['activity-voice', 'sound'], ['activity-close', 'home'], ['parent-close', 'close']]) $(id).innerHTML = icon(ico);
  $('parent-btn').insertAdjacentHTML('beforeend', icon('settings'));
  document.querySelectorAll('.sheet-close').forEach(b => { b.innerHTML = icon('close'); b.addEventListener('click', () => closeSheet(b.dataset.close)); });
  document.querySelector('.play-icon').innerHTML = icon('play');
  $('kitchen-back').innerHTML = icon('home');
  $('wardrobe-back').innerHTML = icon('home');
}

function sync() {
  audio.enabled = state.sound;
  audio.voice = state.voice;
  audio.setVoicePrefs({ uri: state.voiceURI, rate: state.voiceRate, pitch: state.voicePitch });
  audio.setMusic(state.music);
  audio.setNight(state.sleeping);
  $('flower-number').textContent = state.rewards;
  $('flower-count').setAttribute('aria-label', 'Enfeites do Pipo: ' + state.rewards + (state.rewards === 1 ? ' flor' : ' flores'));
  document.querySelectorAll('.dock-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode || (b.dataset.mode === 'games' && !!current)));
  const sleepBtn = document.querySelector('.dock-btn[data-mode="sleep"]');
  if (sleepBtn) {
    sleepBtn.querySelector('.dock-label').textContent = state.sleeping ? 'Acordar' : 'Dormir';
    sleepBtn.querySelector('.dock-icon').innerHTML = icon(state.sleeping ? 'sun' : 'moon');
    sleepBtn.setAttribute('aria-label', state.sleeping ? 'Acordar' : 'Dormir');
  }
  $('app').classList.toggle('night', state.sleeping);
  $('pipo-places').hidden = !started || mode !== 'home' || anyOverlayOpen();
  if (world) world.setState(state);
  updateNeed();
  save();
}

function say(text, speak = true) {
  prompt = text;
  $('prompt-text').textContent = text;
  $('speech').classList.remove('pop');
  void $('speech').offsetWidth;
  $('speech').classList.add('pop');
  if (speak && started) audio.say(text);
}

// O que o Pipo precisa aparece num balãozinho sobre ele.
function updateNeed() {
  const need = started && mode === 'home' && !current ? currentNeed(state) : null;
  const bubble = $('need-bubble');
  if (need) {
    bubble.textContent = NEED_INFO[need].emoji;
    bubble.dataset.need = need;
    bubble.setAttribute('aria-label', { feed: 'O Pipo está com fome', bath: 'O Pipo quer tomar banho', play: 'O Pipo quer brincar', sleep: 'O Pipo está com sono' }[need]);
  }
  bubble.hidden = !need;
  if (!world && need) Object.assign(bubble.style, { left: '64%', top: '30%' });
  if (need && need !== lastNeed && Date.now() - lastNeedSpoken > 45000 && !anyOverlayOpen()) {
    lastNeedSpoken = Date.now();
    say(NEED_INFO[need].say);
    world?.pet.react(need === 'sleep' ? 'yawn' : 'wave');
    if (need === 'sleep') audio.yawn();
  }
  lastNeed = need;
}

function anyOverlayOpen() {
  return ['activity-modal', 'parent-modal', 'games-sheet', 'adventure-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet', 'rest-screen', 'welcome'].some(id => !$(id).hidden);
}

// Espaço livre para a câmera: entre o balão de fala e as ferramentas do modo.
function updateInsets() {
  if (!world) return;
  const stage = $('stage').getBoundingClientRect();
  const speech = $('speech').getBoundingClientRect();
  const tools = $('mode-tools');
  let placesBottom = 0, placesRight = 0, toolsBottom = 0;
  if (!$('pipo-places').hidden) {
    const p = $('pipo-places').getBoundingClientRect();
    placesBottom = Math.max(0, stage.bottom - p.top);
    placesRight = Math.max(0, p.right - stage.left);
  }
  if (!tools.hidden) toolsBottom = Math.max(0, stage.bottom - tools.getBoundingClientRect().top);
  // Celular deitado: o balão e os atalhos ficam na coluna da esquerda; o jardim usa
  // toda a altura à direita deles, em vez de encolher por causa dos atalhos.
  const sideBubble = stage.width > stage.height * 1.3 && speech.width < stage.width * 0.5 && speech.left - stage.left < 60;
  if (sideBubble) world.setInsets({ top: 0, bottom: toolsBottom, left: Math.max(0, speech.right - stage.left, placesRight) });
  else world.setInsets({ top: Math.max(0, speech.bottom - stage.top), bottom: Math.max(placesBottom, toolsBottom) });
}

// ---------------------------------------------------------------------------
// Mundo 3D
// ---------------------------------------------------------------------------
let labelEls = [];
function setupWorld() {
  try {
    world = new GardenWorld($('world'), state);
  } catch (err) {
    console.warn('O jardim 3D não pôde iniciar:', err?.message);
    world = null;
    $('webgl-fallback').hidden = false;
    $('world').hidden = true;
    document.querySelector('.fallback-pipo').addEventListener('click', () => petPipo(null));
    return;
  }
  world.onInteract = (action, e, point) => {
    if (!started || anyOverlayOpen()) return;
    touch();
    if (action === 'pet') {
      if (mode === 'bath') { rub(point); return; }
      petPipo(point, e);
    } else if (action === 'butterfly') {
      world?.pet.react('curious');
      audio.pop();
      audio.sparkle();
      world.emit(point, '#f4d28e', 10);
      say('Uma borboleta! Que bonita.');
    } else if (mode === 'home') {
      if (action === 'sleep') onDock('sleep');
      else if (action === 'bath') onDock('bath');
      else openActivity(action);
    }
  };
  world.onStroke = (point, e) => {
    if (!started || anyOverlayOpen() || mode !== 'home') return;
    strokePipo(point, e);
  };
  world.onRub = (_, point) => rub(point);
  world.onBubble = () => onBubblePopped();
  labelEls = world.labels.map(l => {
    const b = makeButton('station-label', '<span class="station-inner">' + icon(l.icon) + '</span>', () => { touch(); openActivity(l.action); }, l.name);
    b.dataset.station = l.action;
    $('station-labels').appendChild(b);
    return { b, l };
  });
  world.onFrame = () => {
    const overlay = anyOverlayOpen();
    for (const { b, l } of labelEls) {
      const p = world.project(l.point);
      b.style.left = p.x + 'px';
      b.style.top = p.y + 'px';
      b.hidden = mode !== 'home' || !p.visible || overlay;
    }
    const bubble = $('need-bubble');
    if (!bubble.hidden) {
      const a = world.petAnchor();
      bubble.style.left = a.x + 'px';
      bubble.style.top = a.y + 'px';
    }
  };
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { world.resize(); updateInsets(); });
    ro.observe($('stage'));
    ro.observe($('speech'));
    ro.observe($('mode-tools'));
    ro.observe($('pipo-places'));
  } else window.addEventListener('resize', () => { world.resize(); updateInsets(); });
  renderTitle();
  updateInsets();
}

function strokePipo(point, e) {
  if (state.sleeping) return;
  touch();
  petTaps = [];
  state = care(state, 'pet');
  world?.pet.react('nuzzle');
  if (point) world?.emit(point, '#f4a8bc', 5);
  audio.xylo(2);
  audio.haptic(12);
  particles($('particle-layer'), '💛', 4, e ? { x: e.clientX, y: e.clientY } : null);
  sync();
  // Carinho contínuo não vira uma sequência de falas sobrepostas.
  const now = Date.now();
  if (now - lastStrokeSpoken > 10000) {
    lastStrokeSpoken = now;
    say('Ahhh, um carinho bem gostoso! Obrigado!');
  }
}

function petPipo(point, e) {
  if (state.sleeping) {
    say('Shhh… o Pipo está sonhando.', true);
    floatAt('💤', 3, $('stage'));
    return;
  }
  const now = Date.now();
  petTaps = petTaps.filter(t => now - t < 1400).concat(now);
  state = care(state, 'pet');
  const n = petTaps.length;
  const zone = world?.petTouchZone(point) || 'head';
  const kind = responseToTouch(zone, n);
  if (n >= 6) petTaps = [];
  world?.pet.react(kind);
  if (point) world?.emit(point, '#f3a6bd', 8);
  audio.xylo([0, 2, 4, 3, 1][n % 5]);
  audio.haptic(8);
  particles($('particle-layer'), '💛', 3, e ? { x: e.clientX, y: e.clientY } : null);
  sync();
  if (mode === 'home' && (n === 1 || n === 3 || n === 6)) {
    const lines = {
      curious: 'Minhas orelhas ouviram você!',
      nuzzle: 'Que carinho gostoso na cabecinha!',
      giggle: 'Hihihi, faz cócegas!',
      hop: 'Olha o meu pulinho!',
      spin: 'Uhuuu! Olha eu girando!',
    };
    say(lines[kind] || PET_LINES[Math.floor(Math.random() * PET_LINES.length)]);
  }
}

// ---------------------------------------------------------------------------
// Dock, modos de cuidado
// ---------------------------------------------------------------------------
function onDock(id) {
  if (!started) return;
  touch();
  audio.activate();
  audio.tap();
  if (id === 'games') { openSheet('games-sheet'); return; }
  if (id === 'feed') { openSheet('kitchen-sheet'); return; }
  setCareMode(id);
}

function wake() {
  if (!state.sleeping) return;
  state = care(state, 'wake');
  world?.pet.react('wake');
  sync();
}

function toolbar(html) {
  const tools = $('mode-tools');
  tools.innerHTML = html;
  tools.hidden = false;
  const close = tools.querySelector('.tool-close');
  if (close) { close.innerHTML = icon('home'); close.addEventListener('click', () => { audio.tap(); home(); }); }
  updateInsets();
}
const CLOSE_BTN = '<button type="button" class="tool-close" aria-label="Voltar ao jardim"></button>';

function home(speak = true) {
  ['games-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet'].forEach(id => closeSheet(id, false));
  closeActivity(false);
  mode = 'home';
  $('mode-tools').hidden = true;
  $('mode-tools').innerHTML = '';
  world?.setMode('home');
  sync();
  updateInsets();
  say(state.sleeping ? 'O Pipo está dormindo. Toque em Acordar quando quiser.' : 'Toque no Pipo para dar carinho. Do que vamos brincar?', speak);
}

function setCareMode(next) {
  if (!started) return;
  closeActivity(false);
  closeSheet('games-sheet', false);
  closeSheet('adventure-sheet', false);
  closeSheet('wardrobe-sheet', false);
  closeSheet('kitchen-sheet', false);
  if (next === 'feed') { openSheet('kitchen-sheet'); return; }
  if (next === 'sleep') {
    mode = 'home';
    world?.setMode('home');
    $('mode-tools').hidden = true;
    updateInsets();
    if (state.sleeping) {
      state = care(state, 'wake');
      world?.pet.react('wake');
      say('Bom dia' + nm(', ') + '! O Pipo acordou pronto para brincar.');
      audio.good();
    } else {
      state = care(state, 'sleep');
      world?.pet.react('sleep');
      audio.yawn();
      say('Boa noite, Pipo. Bons sonhos!');
      floatAt('💤', 5, $('stage'));
    }
    sync();
    updateInsets();
    return;
  }
  wake();
  mode = next;
  world?.setMode(next);
  if (next === 'feed') startFeed();
  if (next === 'bath') startBath();
  if (next === 'play') startBubbles();
  sync();
}

const FRUITS = [['carrot', '🥕', 'cenoura'], ['apple', '🍎', 'maçã'], ['berry', '🍓', 'morango']];
function startFeed() {
  say('Arraste uma comidinha até a boca do Pipo. Ou toque nela!');
  toolbar(FRUITS.map(([id, emoji, name]) => '<button type="button" class="fruit-btn" data-fruit="' + id + '" aria-label="Dar ' + name + '">' + emoji + '</button>').join('') + CLOSE_BTN);
  document.querySelectorAll('[data-fruit]').forEach(b => {
    installDrag(b, {
      onTap: () => giveFood(b.dataset.fruit, b, null),
      onMove: (x, y) => { if (world) { world.lookAtClient(x, y); world.pet.setMouth(world.isPetAt(x, y, 70) ? 1 : 0.25); } },
      onDrop: (_, x, y) => {
        if (world && !world.isPetAt(x, y, 46)) return false;
        return giveFood(b.dataset.fruit, b, { x, y });
      },
      onEnd: () => world?.pet.setMouth(0),
    });
  });
}
function giveFood(fruit, button, at) {
  if (mode !== 'feed') return false;
  touch();
  if (state.food >= 99) {
    world?.pet.react('no');
    audio.soft();
    say('Estou cheinho! Vamos brincar agora?');
    return false;
  }
  const r = button.getBoundingClientRect?.();
  const from = at || (r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
  state = care(state, 'eat');
  world?.feed(fruit, from);
  setTimeout(() => { audio.munch(); audio.haptic([8, 40, 8]); }, world ? 600 : 0);
  setTimeout(() => particles($('particle-layer'), '💛', 3), world ? 700 : 0);
  say(['Nham, nham! Que delícia!', 'Hummm, gostoso!', 'Obrigado' + nm(', ') + '!'][Math.floor(Math.random() * 3)]);
  sync();
  return true;
}

function startBath() {
  bathProgress = 0;
  bathPhase = 'soap';
  say('Passe o dedo no Pipo para fazer espuma!');
  toolbar('<span class="tool-icon">🧼</span><div class="bath-meter"><i id="bath-fill"></i></div><button type="button" id="rinse-btn" class="rinse-btn" disabled aria-label="Enxaguar">' + icon('shower') + '</button>' + CLOSE_BTN
    + (world ? '' : '<button type="button" id="foam-btn" aria-label="Fazer espuma">' + icon('bubbles') + '</button>'));
  $('rinse-btn').addEventListener('click', rinse);
  if (!world) $('foam-btn').addEventListener('click', () => { lastRub = 0; rub(null, 0.22); });
}
function rub(point, amount = 0.034) {
  if (mode !== 'bath' || bathPhase !== 'soap') return;
  const now = performance.now();
  if (now - lastRub < 45) return;
  lastRub = now;
  touch();
  bathProgress = Math.min(1, bathProgress + amount);
  if (point) world?.soap(point);
  if (now - lastScrub > 160) { audio.scrub(); lastScrub = now; }
  world?.pet.react('bath');
  const meter = $('bath-fill');
  if (meter) meter.style.width = Math.round(bathProgress * 100) + '%';
  if (bathProgress >= 1) {
    bathPhase = 'rinse';
    $('rinse-btn').disabled = false;
    $('rinse-btn').classList.add('ready');
    say('Quanta espuma! Agora toque no chuveiro.');
    audio.good();
  }
}
function rinse() {
  if (mode !== 'bath' || bathPhase !== 'rinse') return;
  touch();
  bathPhase = 'done';
  state = care(state, 'bath');
  world?.shower();
  audio.splash();
  careReward('bath');
  say('Limpinho e cheiroso! Obrigado' + nm(', ') + '!');
  toolbar('<button type="button" id="bath-again" class="again-btn" aria-label="Outro banho">' + icon('again') + '</button>' + CLOSE_BTN);
  $('bath-again').addEventListener('click', () => { audio.tap(); setCareMode('bath'); });
}

const bubbleDotsInner = () => Array.from({ length: 5 }, (_, i) => '<i class="' + (i < popped ? 'on' : '') + '"></i>').join('');
const bubbleDots = () => '<span class="bubble-dots" id="bubble-count">' + bubbleDotsInner() + '</span>';
function startBubbles() {
  popped = 0;
  say('Toque nas bolhas para estourar. Vamos pegar cinco?');
  toolbar(bubbleDots() + CLOSE_BTN);
  if (!world) {
    for (let i = 0; i < 5; i++) {
      const b = makeButton('fruit-btn bubble-btn', '🫧', () => { b.disabled = true; onBubblePopped(); }, 'Bolha');
      $('mode-tools').prepend(b);
    }
  }
}
function onBubblePopped() {
  if (mode !== 'play' || popped >= 5) return;
  touch();
  popped++;
  audio.pop();
  audio.haptic(10);
  audio.say(['um', 'dois', 'três', 'quatro', 'cinco'][popped - 1]);
  const count = $('bubble-count');
  if (count) count.innerHTML = bubbleDotsInner();
  if (popped === 5) {
    state = care(state, 'play');
    careReward('play');
    world?.pet.react('spin');
    say('Você pegou todas as bolhas! O Pipo adorou brincar.');
    toolbar('<button type="button" id="play-again" class="again-btn" aria-label="Mais bolhas">' + icon('again') + '</button>' + CLOSE_BTN);
    $('play-again').addEventListener('click', () => { audio.tap(); setCareMode('play'); });
  }
}

// Recompensa dos cuidados: flor no contador, sem janela de parabéns.
function careReward(type) {
  const before = unlockedAccessories(state);
  state = reward(state, type);
  const unlocked = unlockedAccessories(state).find(a => !before.includes(a));
  if (unlocked) state = { ...state, accessory: unlocked };
  audio.fanfare();
  confetti($('confetti-layer'), 26);
  world?.pet.react(type === 'bath' ? 'shake' : 'happy');
  bumpCounter();
  sync();
  if (unlocked) setTimeout(() => { if (!resting && !document.hidden && $('parent-modal').hidden) announceAccessory(unlocked); }, 1800);
}
function bumpCounter() {
  const chip = $('flower-count');
  chip.classList.remove('bump');
  void chip.offsetWidth;
  chip.classList.add('bump');
}
function announceAccessory(id) {
  const a = ACCESSORIES.find(x => x.id === id);
  toast(a.emoji + ' Presente novo para o Pipo!');
  audio.say('Você ganhou um presente: ' + a.label.toLowerCase() + ' para o Pipo!');
}

// ---------------------------------------------------------------------------
// Folhas (brincadeiras e enfeites)
// ---------------------------------------------------------------------------
function renderAdventures() {
  const grid = $('adventure-grid');
  const progress = adventureProgress(state);
  grid.replaceChildren();
  for (const story of ADVENTURES) {
    const active = progress?.story.id === story.id;
    const finished = (state.finishedAdventures || []).includes(story.id);
    const step = active ? progress.step : story.steps[0];
    const label = active ? 'Continuar · ' + (progress.index + 1) + '/' + progress.total
      : finished ? 'Reviver a história' : 'Começar história';
    const card = makeButton('adventure-card' + (active ? ' is-active' : ''),
      '<span class="adventure-emoji" aria-hidden="true">' + story.emoji + '</span>'
      + '<span class="adventure-info"><strong>' + story.title + '</strong><small>'
      + (active ? step.story : story.intro) + '</small><span class="adventure-action">' + label + '</span></span>',
      () => {
        audio.tap();
        if (!active) state = startAdventure(state, story.id);
        const next = adventureProgress(state);
        sync();
        openActivity(next.step.activity);
      }, label + ': ' + story.title);
    grid.appendChild(card);
  }
}

function openSheet(id) {
  if (!started || resting) return;
  const trigger = document.activeElement;
  closeActivity(false);
  ['games-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet'].forEach(other => closeSheet(other, false));
  wake();
  mode = 'home';
  $('mode-tools').hidden = true;
  $('mode-tools').replaceChildren();
  world?.setMode('home');
  audio.whoosh();
  restoreFocus = trigger;
  $(id).hidden = false;
  world?.setPaused(true);
  const context = {
    body: $(id).querySelector('.pipo-room-body'), state: () => state, audio,
    update: fn => { state = fn(state); sync(); },
    say: text => say(text), react: kind => world?.pet.react(kind),
    touch, burst: (node, symbol, count) => floatAt(symbol, count, node),
    serve: () => { state = care(state, 'eat'); careReward('cook'); audio.munch(); },
  };
  if (id === 'wardrobe-sheet') roomControllers.set(id, createWardrobe(context));
  if (id === 'kitchen-sheet') roomControllers.set(id, createKitchen(context));
  if (context.body) context.body.scrollTop = 0;
  sync();
  updateInsets();
  if (id === 'games-sheet') audio.say('Do que vamos brincar?');
  if (id === 'adventure-sheet') { renderAdventures(); audio.say('Escolha uma aventura para brincar comigo!'); }
  $(id).querySelector('.sheet-close, .room-back')?.focus?.();
}
function closeSheet(id, focus = true) {
  if ($(id).hidden) return;
  roomControllers.get(id)?.destroy();
  roomControllers.delete(id);
  $(id).hidden = true;
  audio.stopSpeech();
  world?.setPaused(anyOverlayOpen());
  if (focus) restoreFocus?.focus?.();
  sync();
  updateInsets();
  if (focus && id !== 'games-sheet' && !anyOverlayOpen()) say('Voltei ao jardim! Vamos cozinhar, trocar de roupa ou brincar?');
}

// ---------------------------------------------------------------------------
// Atividades
// ---------------------------------------------------------------------------
const coach = new Coach({
  hand: $('hint-hand'),
  onHint: () => { if (current?.spoken) audio.say(current.spoken); },
});
const activities = createActivities({
  body: () => $('activity-body'),
  state: () => state,
  update: fn => { state = fn(state); sync(); },
  current: () => current,
  audio,
  coach,
  schedule,
  clearTimers,
  react: kind => world?.pet.react(kind),
  burst: (node, symbol, count) => floatAt(symbol, count, node),
  feedPet: () => { state = care(state, 'eat'); world?.feed('carrot'); sync(); },
  instruct,
  success,
});

function instruct(text, spoken = text, speak = true) {
  $('activity-instruction').textContent = text;
  if (current) { current.instruction = text; current.spoken = spoken; }
  if (speak) audio.say(spoken);
}

function openActivity(type) {
  const info = ACTIVITY_LIST.find(a => a.id === type);
  if (!started || !info) return;
  audio.activate();
  audio.whoosh();
  wake();
  closeActivity(false);
  closeSheet('games-sheet', false);
  closeSheet('adventure-sheet', false);
  closeSheet('wardrobe-sheet', false);
  closeSheet('kitchen-sheet', false);
  mode = 'home';
  world?.setMode('home');
  $('mode-tools').hidden = true;
  restoreFocus = document.activeElement;
  current = { type, rewarded: false, token: Math.random() };
  const storyStep = adventureProgress(state);
  $('activity-tag').textContent = storyStep?.step.activity === type
    ? 'AVENTURA DO PIPO · ' + (storyStep.index + 1) + '/' + storyStep.total
    : info.tag;
  $('activity-title').textContent = info.title;
  $('activity-body').innerHTML = '';
  $('activity-footer').innerHTML = '';
  $('activity-modal').style.setProperty('--theme', info.color);
  $('activity-modal').dataset.activity = type;
  $('activity-modal').hidden = false;
  world?.setPaused(true);
  audio.holdMusic('xylophone', type === 'music');
  sync();
  activities[type](current);
  $('activity-close').focus?.();
}

function closeActivity(returnHome = true) {
  current?.cleanup?.();
  clearTimers();
  coach.clear();
  const wasOpen = !$('activity-modal').hidden;
  $('activity-modal').hidden = true;
  current = null;
  world?.setPaused(false);
  audio.holdMusic('xylophone', false);
  if (wasOpen) { audio.stop(); restoreFocus?.focus?.(); }
  sync();
  if (returnHome) home(false);
}

function success(type, text, picture = '💛', keepResult = false) {
  if (!current || current.type !== type || current.rewarded) return;
  current.rewarded = true;
  coach.clear();
  const before = unlockedAccessories(state);
  state = reward(state, type);
  const storyChange = recordAdventureActivity(state, type);
  state = storyChange.state;
  const unlocked = unlockedAccessories(state).find(a => !before.includes(a));
  if (unlocked) state = { ...state, accessory: unlocked };
  sync();
  audio.fanfare();
  audio.haptic([20, 60, 20]);
  confetti($('confetti-layer'));
  world?.pet.react('happy');
  const gift = unlocked ? ACCESSORIES.find(a => a.id === unlocked) : null;
  $('activity-instruction').textContent = text;
  const body = $('activity-body');
  const celebration = document.createElement('div');
  celebration.className = keepResult ? 'celebration shape-finish' : 'celebration';
  celebration.innerHTML = (keepResult ? '' : '<div class="celebration-stars">⭐ ⭐ ⭐</div><div class="celebration-emoji">' + picture + '</div>') + '<h3></h3>' + (keepResult ? '' : '<p class="celebration-text"></p>')
    + '<div class="earned-flower" id="earned-flower">🌸 +1</div>'
    + (gift ? '<div class="gift">' + gift.emoji + ' <span>Presente novo para o Pipo!</span></div>' : '');
  if (!keepResult) body.innerHTML = '';
  body.appendChild(celebration);
  if (storyChange.advanced) {
    const chapter = document.createElement('p');
    chapter.className = 'adventure-chapter';
    chapter.textContent = storyChange.finished ? storyChange.story.ending
      : 'Mais um pedacinho da aventura pronto! Vamos ver o que vem depois?';
    celebration.appendChild(chapter);
  }
  celebration.querySelector('h3').textContent = 'Muito bem' + nm(', ') + '!';
  if (!keepResult) celebration.querySelector('.celebration-text').textContent = text;
  audio.say('Muito bem' + nm(', ') + '! ' + text + (gift ? ' E você ganhou um presente para o Pipo!' : ''));
  setTimeout(() => flyTo($('earned-flower'), $('flower-count'), '🌸', bumpCounter), 700);
  const footer = $('activity-footer');
  footer.innerHTML = '';
  const again = makeButton('big-round again', icon('again') + '<span>De novo</span>', () => { audio.tap(); openActivity(type); }, 'Brincar de novo');
  const back = makeButton('big-round back', icon('home') + '<span>Jardim</span>', () => { audio.tap(); home(); }, 'Voltar ao jardim');
  footer.append(again, back);
  if (storyChange.advanced) {
    const storyButton = makeButton('big-round story-next',
      icon('games') + '<span>' + (storyChange.finished ? 'Histórias' : 'Continuar') + '</span>',
      () => {
        audio.tap();
        if (storyChange.finished) openSheet('adventure-sheet');
        else openActivity(storyChange.nextActivity);
      }, storyChange.finished ? 'Ver outras aventuras' : 'Continuar aventura do Pipo');
    footer.prepend(storyButton);
  }
}

// ---------------------------------------------------------------------------
// Cantinho da família
// ---------------------------------------------------------------------------
function openParents() {
  ['games-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet'].forEach(id => closeSheet(id, false));
  restoreFocus = document.activeElement;
  audio.stopSpeech();
  $('parent-modal').hidden = false;
  renderParents();
  $('parent-close').focus?.();
}
function renderParents() {
  const options = [['🌱', 'Descobrir', 'Dicas mais rápidas, contar até 3, três cores e três formas.'], ['🌿', 'Explorar', 'Contar até 5, quatro cores, estrela nas formas.'], ['🌸', 'Desafiar', 'Letras sem pistas, contar até 10, seis cores e cinco formas.']];
  $('difficulty-options').innerHTML = '';
  options.forEach(([symbol, name, desc], i) => {
    const b = makeButton('difficulty-option' + (state.level === i + 1 ? ' selected' : ''), '<span>' + symbol + '</span><div><strong>' + name + '</strong><small>' + desc + '</small></div>', () => { state = { ...state, level: i + 1 }; sync(); renderParents(); });
    $('difficulty-options').appendChild(b);
  });
  $('voice-setting').checked = state.voice;
  $('sound-setting').checked = state.sound;
  $('music-setting').checked = state.music;
  $('fullscreen-setting').checked = state.fullscreen;
  $('name-setting').value = state.name;
  selectValue($('article-setting'), state.article);
  $('limit-options').innerHTML = '';
  for (const [value, label] of [[0, 'Livre'], [15, '15 min'], [30, '30 min'], [45, '45 min']]) {
    const b = makeButton(state.limit === value ? 'selected' : '', label, () => { state = { ...state, limit: value }; sync(); renderParents(); });
    b.dataset.limit = value;
    $('limit-options').appendChild(b);
  }
  renderVoicePicker();
  if (!saveAvailable) $('parent-note').textContent = 'Este navegador não permitiu salvar o jardim. Nesta sessão dá para brincar normalmente.';
}
function selectValue(select, value) {
  for (const o of select.querySelectorAll('option')) {
    if (o.value === value) o.setAttribute('selected', ''); else o.removeAttribute('selected');
  }
  try { select.value = value; } catch { /* DOM simplificado sem esse setter */ }
}
// ---- Voz do Pipo: escolher entre as vozes do aparelho, com velocidade e tom ----
const voiceSample = () => 'Oi' + nm(', ') + '! Eu sou o Pipo. Vamos contar? Um, dois, três!';
const VOICE_HELP = {
  ios: ['<strong>iPhone e iPad</strong>', '<ol><li>Abra <b>Ajustes › Acessibilidade › Conteúdo Falado › Vozes</b>.</li><li>Toque em <b>Português (Brasil)</b> e depois em <b>Luciana</b>.</li><li>Baixe a versão <b>Aprimorada</b> (ou <b>Premium</b>, se aparecer).</li><li>Feche o jogo por completo, abra de novo e escolha a nova voz aqui.</li></ol>'],
  android: ['<strong>Android</strong>', '<ol><li>Abra <b>Configurações</b> e procure por <b>texto em voz</b> (Conversão de texto em voz).</li><li>Em <b>Mecanismo preferido</b>, escolha <b>Serviços de fala do Google</b>. Nos Samsung, trocar o mecanismo da Samsung pelo do Google costuma deixar a voz mais natural.</li><li>Toque na engrenagem ⚙️ › <b>Instalar dados de voz</b> › <b>Português (Brasil)</b> e baixe uma voz.</li><li>Feche o jogo por completo, abra de novo e escolha a nova voz aqui.</li></ol>'],
  desktop: ['<strong>Computador</strong>', '<p>No Microsoft Edge, as vozes <b>Natural</b> (Francisca, Antonio) soam bem naturais. No Chrome, escolha <b>Google português do Brasil</b>.</p>'],
};
function deviceKind() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
function renderVoicePicker() {
  const list = audio.listVoices();
  const box = $('voice-list');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<p class="voice-empty">Este aparelho ainda não tem voz em português. Veja abaixo como instalar uma.</p>';
    $('voice-help').open = true;
  } else {
    const current = list.some(d => d.uri === state.voiceURI) ? state.voiceURI : '';
    const rows = [{ uri: '', title: 'Automática', sub: 'A melhor deste aparelho: ' + list[0].name },
      ...list.map(d => ({ uri: d.uri, title: d.name, sub: d.region + (d.premium ? ' · alta qualidade' : '') }))];
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'voice-row' + (r.uri === current ? ' selected' : '');
      const pick = makeButton('voice-pick', '<span class="voice-radio"></span><span class="voice-text"><strong></strong><small></small></span>', () => {
        state = { ...state, voiceURI: r.uri };
        sync();
        renderVoicePicker();
        audio.preview(voiceSample());
      });
      pick.querySelector('strong').textContent = r.title;
      pick.querySelector('small').textContent = r.sub;
      pick.setAttribute('role', 'radio');
      pick.setAttribute('aria-checked', String(r.uri === current));
      pick.dataset.voice = r.uri;
      const hear = makeButton('round-btn voice-hear', icon('sound'), () => audio.preview(voiceSample(), { uri: r.uri }), 'Ouvir ' + r.title);
      row.append(pick, hear);
      box.appendChild(row);
    }
  }
  const presets = (id, key, options) => {
    $(id).innerHTML = '';
    for (const [value, label] of options) {
      const b = makeButton(state[key] === value ? 'selected' : '', label, () => {
        state = { ...state, [key]: value };
        sync();
        renderVoicePicker();
        audio.preview(voiceSample());
      });
      b.dataset.value = value;
      $(id).appendChild(b);
    }
  };
  presets('rate-options', 'voiceRate', [['slow', 'Devagar'], ['normal', 'Normal'], ['fast', 'Rápida']]);
  presets('pitch-options', 'voicePitch', [['normal', 'Natural'], ['high', 'Mais fino'], ['higher', 'Bem fino']]);
  const kind = deviceKind();
  $('voice-help-body').innerHTML = [kind, ...['ios', 'android', 'desktop'].filter(k => k !== kind)].map(k => '<div class="voice-help-item">' + VOICE_HELP[k].join('') + '</div>').join('');
}
audio.onVoicesChanged = () => { if (!$('parent-modal').hidden) renderVoicePicker(); };

function closeParents() {
  commitName();
  $('parent-modal').hidden = true;
  restoreFocus?.focus?.();
}
function commitName() {
  const name = sanitizeName($('name-setting').value);
  if (name !== state.name) { state = { ...state, name }; renderTitle(); sync(); }
}

// ---------------------------------------------------------------------------
// Tempo de tela
// ---------------------------------------------------------------------------
function showRest() {
  if (resting) return;
  resting = true;
  closeActivity(false);
  ['games-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet'].forEach(id => closeSheet(id, false));
  $('rest-text').textContent = 'O Pipo ficou com soninho' + nm(', ') + '. Vamos brincar de novo amanhã?';
  $('rest-screen').hidden = false;
  if (!state.sleeping) { state = care(state, 'sleep'); world?.pet.react('sleep'); }
  sync();
  $('rest-unlock').focus?.();
  audio.say('O Pipo ficou com soninho. Vamos brincar de novo amanhã? Tchau, tchau!');
}
function endRest() {
  resting = false;
  state = { ...state, playSeconds: 0 };
  $('rest-screen').hidden = true;
  wake();
  sync();
  home();
}

// ---------------------------------------------------------------------------
// Início e eventos globais
// ---------------------------------------------------------------------------
function start() {
  if (started) return;
  started = true;
  $('welcome').hidden = true;
  audio.activate();
  if (state.fullscreen && coarse() && !window.matchMedia?.('(display-mode: standalone)').matches) {
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.catch?.(() => {}); } catch { /* sem tela cheia */ }
  }
  state = { ...state, visits: state.visits + 1 };
  touch();
  if (timeIsUp(state, todayKey())) { sync(); showRest(); return; }
  const wasSleeping = state.sleeping;
  wake();
  world?.pet.react('wave');
  sync();
  say(state.visits > 1 && !wasSleeping
    ? 'Que bom que você voltou' + nm(', ') + '! Vamos brincar no jardim?'
    : 'Oi' + nm(', ') + '! Eu sou o Pipo. Vamos brincar no nosso jardim?');
  updateInsets();
  $('repeat-prompt').focus?.();
}

buildDock();
setupWorld();
renderTitle();

$('start-btn').addEventListener('click', start);
$('adventure-launch').addEventListener('click', () => { touch(); openSheet('adventure-sheet'); });
$('repeat-prompt').addEventListener('click', () => { touch(); audio.activate(); audio.say(prompt); world?.pet.react('wave'); });
$('need-bubble').addEventListener('click', () => {
  touch();
  const need = $('need-bubble').dataset.need;
  audio.tap();
  if (need === 'play') setCareMode('play');
  else if (need) setCareMode(need);
});
$('flower-count').addEventListener('click', () => { touch(); audio.tap(); openSheet('wardrobe-sheet'); });
$('wardrobe-open').addEventListener('click', () => { touch(); audio.activate(); openSheet('wardrobe-sheet'); });
$('kitchen-open').addEventListener('click', () => { touch(); audio.activate(); openSheet('kitchen-sheet'); });
$('kitchen-back').addEventListener('click', () => closeSheet('kitchen-sheet'));
$('wardrobe-back').addEventListener('click', () => closeSheet('wardrobe-sheet'));
$('kitchen-snack').addEventListener('click', () => {
  closeSheet('kitchen-sheet', false); wake(); mode = 'feed'; world?.setMode('feed'); startFeed(); sync();
});
holdToActivate($('parent-btn'), 2000, openParents, () => toast('Para adultos: segure o botão por 2 segundos.'));
holdToActivate($('rest-unlock'), 2000, endRest, () => toast('Um adulto precisa segurar o botão.'));
$('parent-close').addEventListener('click', closeParents);
$('parent-done').addEventListener('click', closeParents);
$('voice-setting').addEventListener('change', e => { state = { ...state, voice: e.target.checked }; sync(); if (!state.voice) audio.stopSpeech(); });
$('sound-setting').addEventListener('change', e => { state = { ...state, sound: e.target.checked }; sync(); if (state.sound) { audio.activate(); audio.good(); } });
$('music-setting').addEventListener('change', e => { state = { ...state, music: e.target.checked }; audio.activate(); sync(); });
$('fullscreen-setting').addEventListener('change', e => { state = { ...state, fullscreen: e.target.checked }; sync(); });
$('name-setting').addEventListener('change', commitName);
$('article-setting').addEventListener('change', e => { state = { ...state, article: e.target.value }; renderTitle(); sync(); });
$('activity-close').addEventListener('click', () => { audio.tap(); home(); });
$('activity-voice').addEventListener('click', () => audio.say(current?.spoken || current?.instruction || prompt));
document.querySelectorAll('.sheet-veil, .pipo-room-veil').forEach(v => v.addEventListener('click', e => { if (e.target === v) closeSheet(v.id); }));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('parent-modal').hidden) closeParents();
    else if (!$('wardrobe-sheet').hidden) closeSheet('wardrobe-sheet');
    else if (!$('kitchen-sheet').hidden) closeSheet('kitchen-sheet');
    else if (!$('adventure-sheet').hidden) closeSheet('adventure-sheet');
    else if (!$('games-sheet').hidden) closeSheet('games-sheet');
    else if (!$('activity-modal').hidden || mode !== 'home') home();
  }
  if (e.key === 'Tab') {
    const modal = ['parent-modal', 'activity-modal', 'games-sheet', 'adventure-sheet', 'adventure-sheet', 'wardrobe-sheet', 'kitchen-sheet', 'rest-screen', 'welcome'].map($).find(m => !m.hidden);
    if (!modal) return;
    const focusable = [...modal.querySelectorAll('button:not(:disabled),input,select')].filter(b => !b.hidden);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!modal.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Celular: sem menu de toque longo, sem zoom de pinça e sem seleção de texto.
document.addEventListener('contextmenu', e => { if (!e.target.closest?.('input,select')) e.preventDefault(); });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchstart', () => {}, { passive: true }); // ativa :active no iOS
document.addEventListener('pointerdown', touch, { passive: true });

window.addEventListener('pagehide', () => { closeSheet('kitchen-sheet', false); save(); audio.stop(); });
document.addEventListener('visibilitychange', () => {
  audio.holdMusic('hidden', document.hidden);
  if (document.hidden) { closeSheet('kitchen-sheet', false); save(); audio.stop(); }
});

// Relógio do jogo: necessidades, tempo de tela e convites quando a criança fica parada.
let elapsed = 0;
setInterval(() => {
  if (!started || document.hidden) return;
  state = tick(state, 2);
  if (!resting) state = addPlayTime(state, 2, todayKey());
  if (!resting && timeIsUp(state, todayKey())) { sync(); showRest(); return; }
  elapsed += 2;
  if (elapsed >= 10) { elapsed = 0; sync(); }
  const idle = Date.now() - lastInteraction;
  if (idle > 25000 && nudges < 3 && mode === 'home' && !state.sleeping && !anyOverlayOpen()) {
    nudges++;
    touch();
    world?.pet.react('wave');
    say('Vamos brincar? Toque na estrela!');
    const star = document.querySelector('.dock-btn.games');
    star?.classList.add('hint');
    setTimeout(() => star?.classList.remove('hint'), 2600);
  }
}, 2000);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
document.fonts?.ready?.then(() => { renderTitle(); updateInsets(); });

sync();
// Estado só de leitura, útil para verificar o jogo sem mexer no save da criança.
Object.defineProperty(window, 'jardimSofia', {
  value: { getState: () => structuredClone(state), getMode: () => mode, getActivity: () => current?.type || null, is3D: () => !!world },
  writable: false,
});
