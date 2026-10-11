// Pequenas atitudes do Pipo. Puro e determinístico para testar sem WebGL.
// Nada aqui depende de datas, pontuação, conexão ou tempo fora do jogo.
export const PIPO_MOODS = ['calm', 'hungry', 'sleepy', 'messy', 'playful', 'asleep'];

export function moodFromNeeds(s = {}) {
  if (s.sleeping) return 'asleep';
  // Uma necessidade de cada vez, como no balão que já existe no jogo.
  const needs = [
    ['sleepy', s.energy],
    ['hungry', s.food],
    ['messy', s.clean],
    ['playful', s.joy],
  ].filter(([, amount]) => Number.isFinite(amount) && amount < 45);
  if (!needs.length) return 'calm';
  needs.sort((a, b) => a[1] - b[1]);
  return needs[0][0];
}

export function touchZone(localY) {
  if (!Number.isFinite(localY)) return 'head';
  if (localY >= 2.48) return 'ears';
  if (localY >= 1.57) return 'head';
  if (localY >= 0.61) return 'tummy';
  return 'feet';
}

export function responseToTouch(zone, taps = 1) {
  // Um toque repetido sempre continua com as surpresas já conhecidas.
  if (taps >= 6) return 'spin';
  if (taps >= 3) return 'giggle';
  return {
    ears: 'curious',
    head: 'nuzzle',
    tummy: 'giggle',
    feet: 'hop',
  }[zone] || 'pet';
}

export function chooseIdleMoment({ mode = 'home', paused = false, sleeping = false, sinceTouch = 0, mood = 'calm' } = {}, sample = 0.5) {
  if (mode !== 'home' || paused || sleeping || sinceTouch < 4) return null;
  const pool = {
    calm: ['sniff', 'curious', 'stretch', 'look'],
    hungry: ['sniff', 'look', 'sniff', 'curious'],
    sleepy: ['yawn', 'stretch', 'look', 'yawn'],
    messy: ['shake', 'look', 'sniff', 'curious'],
    playful: ['hop', 'curious', 'stretch', 'wave'],
  }[mood] || ['look'];
  const safe = Number.isFinite(sample) ? Math.max(0, Math.min(0.99999, sample)) : 0;
  return pool[Math.floor(safe * pool.length)];
}
