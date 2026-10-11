// Modelo de desenhos. Apenas dados pequenos e locais: sem fotos, rede ou contas.
export const ART_SCENES = [
  { id: 'garden', name: 'Jardim florido', emoji: '🌷' },
  { id: 'night', name: 'Céu estrelado', emoji: '🌙' },
  { id: 'pond', name: 'Lago dos amigos', emoji: '🦆' },
];
export const PAINT_COLORS = ['#ed809a', '#f6ba53', '#74b888', '#5da9dc', '#ac8dda', '#93694d'];
export const ART_STAMPS = ['🌸', '🦋', '🐝', '⭐', '🌈', '🍄', '🦆', '💛'];
const SCENE_IDS = ART_SCENES.map(s => s.id);
const W = 600, H = 360;
const MAX_LINES = 32, MAX_POINTS = 120, MAX_STAMPS = 40;
const clamp = (v, hi) => Math.max(0, Math.min(hi, Math.round(v)));
const cleanPoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)
  ? [clamp(p[0], W), clamp(p[1], H)] : null;
export function sanitizeArtwork(value) {
  if (!value || typeof value !== 'object') return { lines: [], stamps: [] };
  const lines = Array.isArray(value.lines) ? value.lines.slice(-MAX_LINES)
    .filter(l => l && PAINT_COLORS.includes(l.color) && Array.isArray(l.points))
    .map(l => ({ color: l.color, points: l.points.slice(0, MAX_POINTS).map(cleanPoint).filter(Boolean) }))
    .filter(l => l.points.length) : [];
  const stamps = Array.isArray(value.stamps) ? value.stamps.slice(-MAX_STAMPS)
    .filter(p => p && ART_STAMPS.includes(p.symbol) && Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => ({ symbol: p.symbol, x: clamp(p.x, W), y: clamp(p.y, H) })) : [];
  return { lines, stamps };
}
export function sanitizeArtworks(value) {
  const out = {};
  if (!value || typeof value !== 'object') return out;
  for (const scene of SCENE_IDS) {
    if (Object.prototype.hasOwnProperty.call(value, scene)) out[scene] = sanitizeArtwork(value[scene]);
  }
  return out;
}
export function getArtwork(state, scene) {
  if (!SCENE_IDS.includes(scene)) return sanitizeArtwork(null);
  return sanitizeArtwork(state?.artworks?.[scene]);
}
function saveArtwork(state, scene, art) {
  return { ...state, artworks: { ...state.artworks, [scene]: sanitizeArtwork(art) } };
}
export function addPaintLine(state, scene, color, points) {
  if (!SCENE_IDS.includes(scene) || !PAINT_COLORS.includes(color)) return state;
  const line = sanitizeArtwork({ lines: [{ color, points }] }).lines[0];
  if (!line) return state;
  const art = getArtwork(state, scene);
  return saveArtwork(state, scene, { ...art, lines: [...art.lines, line].slice(-MAX_LINES) });
}
export function addArtStamp(state, scene, symbol, x, y) {
  if (!SCENE_IDS.includes(scene) || !ART_STAMPS.includes(symbol) || !Number.isFinite(x) || !Number.isFinite(y)) return state;
  const art = getArtwork(state, scene);
  return saveArtwork(state, scene, { ...art, stamps: [...art.stamps, { symbol, x, y }].slice(-MAX_STAMPS) });
}
export function replaceArtwork(state, scene, value) {
  if (!SCENE_IDS.includes(scene)) return state;
  return saveArtwork(state, scene, value);
}
export function updateArtwork(state, scene, kind, payload = {}) {
  if (!SCENE_IDS.includes(scene)) return state;
  if (kind === 'line') return addPaintLine(state, scene, payload.color, payload.points);
  if (kind === 'stamp') return addArtStamp(state, scene, payload.symbol, payload.x, payload.y);
  if (kind === 'clear') return saveArtwork(state, scene, { lines: [], stamps: [] });
  return state;
}
export function artworkHasContent(art) { return !!(art.lines.length || art.stamps.length); }

export const DISCOVERY_SCENES = [
  {
    id: 'meadow', name: 'O bosque dos bichinhos', emoji: '🌳',
    items: [
      { id: 'bee', emoji: '🐝', name: 'abelha', x: 22, y: 27, fact: 'A abelha visita as flores e ajuda as plantas a crescer.' },
      { id: 'butterfly', emoji: '🦋', name: 'borboleta', x: 73, y: 29, fact: 'A borboleta começa a vida como uma lagarta!' },
      { id: 'ladybug', emoji: '🐞', name: 'joaninha', x: 45, y: 72, fact: 'A joaninha ajuda a proteger as folhas.' },
      { id: 'snail', emoji: '🐌', name: 'caracol', x: 14, y: 75, fact: 'O caracol carrega sua casinha nas costas.' },
      { id: 'bird', emoji: '🐦', name: 'passarinho', x: 84, y: 65, fact: 'Os passarinhos fazem ninhos para seus filhotes.' },
    ],
    targets: ['bee', 'butterfly', 'ladybug'],
  },
  {
    id: 'pond', name: 'Os segredos do lago', emoji: '💧',
    items: [
      { id: 'frog', emoji: '🐸', name: 'sapo', x: 27, y: 62, fact: 'O sapo gosta de lugares úmidos e dá saltos enormes.' },
      { id: 'duck', emoji: '🦆', name: 'pato', x: 63, y: 56, fact: 'O pato tem pés que ajudam a nadar.' },
      { id: 'fish', emoji: '🐟', name: 'peixinho', x: 50, y: 79, fact: 'Os peixes respiram debaixo da água usando brânquias.' },
      { id: 'turtle', emoji: '🐢', name: 'tartaruga', x: 82, y: 74, fact: 'A tartaruga tem um casco que protege seu corpo.' },
      { id: 'flower', emoji: '🌼', name: 'flor', x: 15, y: 24, fact: 'As flores atraem muitos bichinhos do jardim.' },
    ],
    targets: ['frog', 'duck', 'fish'],
  },
  {
    id: 'night', name: 'A noite brilhante', emoji: '🌙',
    items: [
      { id: 'moon', emoji: '🌙', name: 'lua', x: 21, y: 23, fact: 'A lua reflete a luz do sol e ilumina nossas noites.' },
      { id: 'star', emoji: '⭐', name: 'estrela', x: 70, y: 25, fact: 'As estrelas são como o sol, mas estão muito longe.' },
      { id: 'owl', emoji: '🦉', name: 'coruja', x: 78, y: 65, fact: 'Muitas corujas enxergam muito bem à noite.' },
      { id: 'bat', emoji: '🦇', name: 'morcego', x: 46, y: 44, fact: 'Muitos morcegos ajudam as plantas espalhando sementes.' },
      { id: 'cricket', emoji: '🦗', name: 'grilo', x: 29, y: 80, fact: 'O grilo faz música esfregando suas asas.' },
    ],
    targets: ['moon', 'star', 'owl'],
  },
];
