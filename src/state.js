// Estado puro do jogo: sem DOM, sem áudio. Tudo aqui é testado em tests/state.test.mjs.

import { sanitizeAdventure, sanitizeFinishedAdventures } from './adventures.js';
import { sanitizeArtworks } from './creative-model.js';

export const SAVE_KEY = 'jardim-sofia-v1';
export const DEFAULT_NAME = 'Sofia';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const NEED_FLOOR = 25; // o Pipo nunca fica "mal": as necessidades param num piso acolhedor

// Palavras com figura para quem ainda não lê. O nome da criança entra na frente.
export const WORD_BANK = [
  { word: 'PIPO', pic: '🐰' },
  { word: 'SOL', pic: '☀️' },
  { word: 'LUA', pic: '🌙' },
  { word: 'UVA', pic: '🍇' },
  { word: 'BOLA', pic: '⚽' },
  { word: 'FLOR', pic: '🌸' },
  { word: 'PATO', pic: '🦆' },
  { word: 'GATO', pic: '🐱' },
  { word: 'SAPO', pic: '🐸' },
  { word: 'CASA', pic: '🏠' },
  { word: 'BOLO', pic: '🎂' },
  { word: 'MAR', pic: '🌊' },
];
// Compatibilidade com quem importava a lista antiga.
export const WORDS = ['SOFIA', ...WORD_BANK.map(w => w.word)];

export const COLORS = [
  { id: 'red', name: 'vermelha', hex: '#f0626b' },
  { id: 'yellow', name: 'amarela', hex: '#ffc94d' },
  { id: 'blue', name: 'azul', hex: '#5aaeea' },
  { id: 'green', name: 'verde', hex: '#6cc07a' },
  { id: 'orange', name: 'laranja', hex: '#ff9a4d' },
  { id: 'purple', name: 'roxa', hex: '#a98bdc' },
];

export const SHAPES = ['circle', 'triangle', 'square', 'star', 'heart'];
export const SHAPE_NAMES = {
  circle: { article: 'o', name: 'círculo' },
  triangle: { article: 'o', name: 'triângulo' },
  square: { article: 'o', name: 'quadrado' },
  star: { article: 'a', name: 'estrela' },
  heart: { article: 'o', name: 'coração' },
};

export const ACCESSORIES = [
  { id: 'none', emoji: '🐰', label: 'Sem enfeite', need: 0 },
  { id: 'flower', emoji: '🌸', label: 'Flor', need: 3 },
  { id: 'bow', emoji: '🎀', label: 'Laço', need: 8 },
  { id: 'crown', emoji: '👑', label: 'Coroa', need: 15 },
  { id: 'hat', emoji: '🥳', label: 'Chapéu de festa', need: 22 },
  { id: 'glasses', emoji: '🕶️', label: 'Óculos', need: 30 },
];
const ACCESSORY_IDS = ACCESSORIES.map(a => a.id);
// As roupas fazem parte da brincadeira desde o começo, sem depender de flores.
export const OUTFITS = [
  { id: 'none', label: 'Sem roupa', need: 0 },
  { id: 'overalls', label: 'Jardineira', need: 0 },
  { id: 'shirt', label: 'Camiseta', need: 0 },
  { id: 'pajamas', label: 'Pijama', need: 0 },
  { id: 'chef', label: 'Avental', need: 0 },
];
export const OUTFIT_COLORS = [
  { id: 'mint', label: 'Verde', hex: '#77bfa0' },
  { id: 'coral', label: 'Rosa', hex: '#ee8ba5' },
  { id: 'sky', label: 'Azul', hex: '#76b7df' },
  { id: 'honey', label: 'Amarelo', hex: '#efbd53' },
];
const OUTFIT_IDS = OUTFITS.map(o => o.id);
const OUTFIT_COLOR_IDS = OUTFIT_COLORS.map(c => c.id);
export const VOICE_SPEEDS = ['slow', 'normal', 'fast'];
export const VOICE_TONES = ['normal', 'high', 'higher'];
const COMPLETION_KEYS = ['letters', 'count', 'colors', 'shapes', 'music', 'garden', 'art', 'explore', 'bath', 'play', 'cook'];

export function initialState() {
  return {
    version: 2,
    food: 82, clean: 88, joy: 85, energy: 86,
    sleeping: false,
    level: 1,
    sound: true, voice: true, music: true, fullscreen: true,
    voiceURI: '', voiceRate: 'normal', voicePitch: 'normal',
    name: DEFAULT_NAME, article: 'da',
    limit: 0, playDay: '', playSeconds: 0,
    rewards: 0, accessory: 'none', outfit: 'none', outfitColor: 'mint',
    completed: {},
    adventure: null, finishedAdventures: [],
    artworks: {},
    plants: [0, 0, 0, 0],
    visits: 0,
  };
}

// Mantém só letras (com acento), espaço, hífen e apóstrofo; até 16 caracteres.
export function sanitizeName(value) {
  if (typeof value !== 'string') return DEFAULT_NAME;
  const clean = value.normalize('NFC').replace(/[^\p{L}\s'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16).trim();
  return clean;
}

export function sanitizeState(input) {
  const s = initialState();
  if (!input || typeof input !== 'object') return s;
  for (const key of ['food', 'clean', 'joy', 'energy']) if (Number.isFinite(input[key])) s[key] = clamp(input[key], NEED_FLOOR, 100);
  for (const key of ['sound', 'voice', 'sleeping', 'music', 'fullscreen']) if (typeof input[key] === 'boolean') s[key] = input[key];
  if ([1, 2, 3].includes(input.level)) s.level = input.level;
  s.rewards = Number.isFinite(input.rewards) ? clamp(Math.floor(input.rewards), 0, 100000) : 0;
  s.visits = Number.isFinite(input.visits) ? clamp(Math.floor(input.visits), 0, 100000) : 0;
  if ('name' in input) s.name = sanitizeName(input.name);
  if (['da', 'do', 'de'].includes(input.article)) s.article = input.article;
  if ([0, 15, 30, 45].includes(input.limit)) s.limit = input.limit;
  // Voz escolhida no aparelho ('' = automática), velocidade e tom.
  if (typeof input.voiceURI === 'string') s.voiceURI = input.voiceURI.slice(0, 300);
  if (VOICE_SPEEDS.includes(input.voiceRate)) s.voiceRate = input.voiceRate;
  if (VOICE_TONES.includes(input.voicePitch)) s.voicePitch = input.voicePitch;
  if (typeof input.playDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.playDay)) s.playDay = input.playDay;
  if (Number.isFinite(input.playSeconds)) s.playSeconds = clamp(Math.floor(input.playSeconds), 0, 86400);
  if (ACCESSORY_IDS.includes(input.accessory)) s.accessory = input.accessory;
  if (OUTFIT_IDS.includes(input.outfit)) s.outfit = input.outfit;
  if (OUTFIT_COLOR_IDS.includes(input.outfitColor)) s.outfitColor = input.outfitColor;
  if (Array.isArray(input.plants) && input.plants.length === 4) s.plants = input.plants.map(v => Number.isInteger(v) ? clamp(v, 0, 3) : 0);
  if (input.completed && typeof input.completed === 'object') {
    for (const k of COMPLETION_KEYS) if (Number.isInteger(input.completed[k])) s.completed[k] = clamp(input.completed[k], 0, 100000);
  }
  s.adventure = sanitizeAdventure(input.adventure);
  s.finishedAdventures = sanitizeFinishedAdventures(input.finishedAdventures);
  s.artworks = sanitizeArtworks(input.artworks);
  if (!unlockedAccessories(s).includes(s.accessory)) s.accessory = 'none';
  return s;
}

export function unlockedAccessories(s) {
  return ACCESSORIES.filter(a => s.rewards >= a.need).map(a => a.id);
}
export function nextAccessory(s) {
  return ACCESSORIES.find(a => s.rewards < a.need) || null;
}

export function care(s, action) {
  const next = { ...s };
  if (action === 'eat') { next.food = clamp(s.food + 22, NEED_FLOOR, 100); next.energy = clamp(s.energy + 4, NEED_FLOOR, 100); next.joy = clamp(s.joy + 3, NEED_FLOOR, 100); }
  if (action === 'pet') next.joy = clamp(s.joy + 5, NEED_FLOOR, 100);
  if (action === 'bath') { next.clean = 100; next.joy = clamp(s.joy + 4, NEED_FLOOR, 100); }
  if (action === 'play') { next.joy = 100; next.clean = clamp(s.clean - 10, NEED_FLOOR, 100); next.energy = clamp(s.energy - 4, NEED_FLOOR, 100); }
  if (action === 'sleep') next.sleeping = true;
  if (action === 'wake') { next.sleeping = false; next.energy = clamp(s.energy + 18, NEED_FLOOR, 100); }
  return next;
}

export function reward(s, type) {
  return { ...s, rewards: s.rewards + 1, joy: clamp(s.joy + 7, NEED_FLOOR, 100), completed: { ...s.completed, [type]: (s.completed[type] || 0) + 1 } };
}

// Só avança com a página visível. Ritmo calmo: de cheio até pedir comida leva ~20 minutos.
export function tick(s, seconds) {
  if (s.sleeping) return { ...s, energy: clamp(s.energy + seconds * 0.22, NEED_FLOOR, 100) };
  return {
    ...s,
    food: clamp(s.food - seconds * 0.03, NEED_FLOOR, 100),
    clean: clamp(s.clean - seconds * 0.012, NEED_FLOOR, 100),
    joy: clamp(s.joy - seconds * 0.02, NEED_FLOOR, 100),
    energy: clamp(s.energy - seconds * 0.012, NEED_FLOOR, 100),
  };
}

// O que o Pipo pede agora (um balãozinho sobre a cabeça). Uma coisa por vez.
export function currentNeed(s) {
  if (s.sleeping) return null;
  const needs = [['feed', s.food], ['bath', s.clean], ['play', s.joy], ['sleep', s.energy]].filter(([, v]) => v < 45);
  if (!needs.length) return null;
  needs.sort((a, b) => a[1] - b[1]);
  return needs[0][0];
}

// Tempo de tela opcional, contado por dia e só enquanto o jogo está visível.
export function addPlayTime(s, seconds, today) {
  const sameDay = s.playDay === today;
  return { ...s, playDay: today, playSeconds: clamp((sameDay ? s.playSeconds : 0) + seconds, 0, 86400) };
}
export function timeIsUp(s, today) {
  return s.limit > 0 && s.playDay === today && s.playSeconds >= s.limit * 60;
}
export function todayKey(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
}

export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// O nome entra como primeira palavra quando cabe nas peças (até 7 letras, sem espaço).
export function wordsFor(s) {
  const name = (s.name || '').toLocaleUpperCase('pt-BR');
  const nameWord = /^\p{L}{2,7}$/u.test(name) ? [{ word: name, pic: '⭐', isName: true }] : [];
  const bank = s.level === 1 ? WORD_BANK.filter(w => w.word.length <= 4) : WORD_BANK;
  return [...nameWord, ...bank.filter(w => w.word !== name)];
}

export function colorsForLevel(level) {
  return COLORS.slice(0, [3, 4, 6][clamp(level, 1, 3) - 1]);
}
export function colorRounds(level, rng = Math.random) {
  const palette = colorsForLevel(level);
  const rounds = shuffle(palette, rng).slice(0, Math.min(palette.length, [3, 4, 4][clamp(level, 1, 3) - 1]));
  return { palette, rounds };
}

export function shapesForLevel(level) {
  return SHAPES.slice(0, [3, 4, 5][clamp(level, 1, 3) - 1]);
}

export function countingRound(level, rng = Math.random) {
  const max = [3, 5, 10][clamp(level, 1, 3) - 1];
  const target = 1 + Math.floor(rng() * max);
  return { target, total: Math.max(5, Math.min(12, target + 2)), picked: [], done: false };
}

export function pickCarrot(round, id) {
  if (round.done || round.picked.includes(id) || id < 0 || id >= round.total) return round;
  const picked = [...round.picked, id];
  return { ...round, picked, done: picked.length === round.target };
}

export function letterRound(word, rng = Math.random) {
  return { word, placed: [], tiles: shuffle([...word].map((letter, id) => ({ letter, id, used: false })), rng), done: false };
}

export function pickLetter(round, id) {
  const tile = round.tiles.find(t => t.id === id);
  if (round.done || !tile || tile.used || tile.letter !== round.word[round.placed.length]) return { round, accepted: false };
  const placed = [...round.placed, tile.letter];
  return { accepted: true, round: { ...round, placed, tiles: round.tiles.map(t => t.id === id ? { ...t, used: true } : t), done: placed.length === round.word.length } };
}
