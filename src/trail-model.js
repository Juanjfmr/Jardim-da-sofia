// Modelo puro da primeira missão interativa: sem DOM e sem relógio.
// A criança escolhe o caminho; o avanço depende de ações no cenário, não de testes de múltipla escolha.
export const TRAIL_SCENES = ['forest', 'river', 'meadow', 'party'];
export const TRAIL_CLUES = ['ribbon', 'bell', 'acorn'];
export const TRAIL_DECORATIONS = ['flower', 'lantern', 'ribbon'];

export function initialTrail() {
  return { scene: 'forest', clues: [], bridge: '', pieces: [], obstacle: false,
    friend: false, escorted: false, decorations: [], finished: false };
}
const uniqueFrom = (input, allowed, limit) =>
  Array.isArray(input) ? [...new Set(input.filter(x => allowed.includes(x)))].slice(0, limit) : [];

export function sanitizeTrail(input) {
  const out = initialTrail();
  if (!input || typeof input !== 'object') return out;
  out.clues = uniqueFrom(input.clues, TRAIL_CLUES, 3);
  if (out.clues.length !== 3) return out;
  out.scene = 'river';
  out.bridge = ['logs', 'lilies'].includes(input.bridge) ? input.bridge : '';
  out.pieces = out.bridge ? uniqueFrom(input.pieces, [0, 1, 2], 3) : [];
  if (out.pieces.length !== 3) return out;
  out.scene = 'meadow';
  out.obstacle = input.obstacle === true;
  out.friend = out.obstacle && input.friend === true;
  out.escorted = out.friend && input.escorted === true;
  if (!out.escorted) return out;
  out.scene = 'party';
  out.decorations = uniqueFrom(input.decorations, TRAIL_DECORATIONS, 3);
  out.finished = out.decorations.length === 3 && input.finished === true;
  return out;
}
function apply(trail, change) { return sanitizeTrail({ ...sanitizeTrail(trail), ...change }); }
export function discoverTrailClue(trail, id) {
  const s = sanitizeTrail(trail);
  if (s.scene !== 'forest' || !TRAIL_CLUES.includes(id) || s.clues.includes(id)) return s;
  return apply(s, { clues: [...s.clues, id] });
}
export function placeTrailPiece(trail, method, index) {
  const s = sanitizeTrail(trail);
  if (s.scene !== 'river' || !['logs','lilies'].includes(method) || ![0,1,2].includes(index)) return s;
  if (s.bridge && s.bridge !== method) return s; // Um projeto de ponte por vez.
  return apply(s, { bridge: method, pieces: [...s.pieces, index] });
}
export function changeTrailBridge(trail) {
  const s = sanitizeTrail(trail);
  return s.scene === 'river' ? apply(s, { bridge: '', pieces: [] }) : s;
}
export function moveTrailBranch(trail) {
  const s = sanitizeTrail(trail);
  return s.scene === 'meadow' ? apply(s, { obstacle: true }) : s;
}
export function meetTrailFriend(trail) {
  const s = sanitizeTrail(trail);
  return s.scene === 'meadow' && s.obstacle ? apply(s, { friend: true }) : s;
}
export function escortTrailFriend(trail) {
  const s = sanitizeTrail(trail);
  return s.scene === 'meadow' && s.friend ? apply(s, { escorted: true }) : s;
}
export function decorateTrail(trail, item) {
  const s = sanitizeTrail(trail);
  if (s.scene !== 'party' || !TRAIL_DECORATIONS.includes(item) || s.decorations.includes(item)) return s;
  return apply(s, { decorations: [...s.decorations, item] });
}
export function finishTrail(trail) {
  const s = sanitizeTrail(trail);
  return s.scene === 'party' && s.decorations.length === 3 ? apply(s, { finished: true }) : s;
}
