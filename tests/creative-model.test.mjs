import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, sanitizeState } from '../src/state.js';
import {
  ART_SCENES, ART_STAMPS, PAINT_COLORS, DISCOVERY_SCENES,
  sanitizeArtwork, sanitizeArtworks, getArtwork,
  addPaintLine, addArtStamp, updateArtwork, replaceArtwork, artworkHasContent,
} from '../src/creative-model.js';

test('Ateliê oferece três paisagens, pincéis e carimbos conhecidos', () => {
  assert.deepEqual(ART_SCENES.map(s => s.id), ['garden', 'night', 'pond']);
  assert.ok(PAINT_COLORS.length >= 6);
  assert.ok(ART_STAMPS.length >= 6);
  assert.equal(artworkHasContent(getArtwork(initialState(), 'garden')), false);
});

test('pintura e carimbos ficam salvos sem afetar as outras paisagens', () => {
  let s = initialState();
  s = addPaintLine(s, 'garden', PAINT_COLORS[0], [[0, 2], [100, 120], [600, 360]]);
  s = addArtStamp(s, 'garden', '🦋', 242, 167);
  assert.equal(s.artworks.garden.lines.length, 1);
  assert.equal(s.artworks.garden.stamps[0].symbol, '🦋');
  assert.equal(s.artworks.garden.lines[0].points[2][0], 600);
  assert.deepEqual(getArtwork(s, 'pond'), { lines: [], stamps: [] });
  assert.ok(artworkHasContent(getArtwork(s, 'garden')));
  s = updateArtwork(s, 'pond', 'stamp', { symbol: '🦆', x: 211, y: 150 });
  assert.equal(s.artworks.pond.stamps.length, 1);
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s))), s);
  s = updateArtwork(s, 'garden', 'clear');
  assert.equal(artworkHasContent(getArtwork(s, 'garden')), false);
  assert.equal(artworkHasContent(getArtwork(s, 'pond')), true);
  const returned = replaceArtwork(s, 'garden', { lines: [], stamps: [{ symbol: '🌸', x: 20, y: 20 }] });
  assert.equal(getArtwork(returned, 'garden').stamps[0].symbol, '🌸');
  assert.equal(artworkHasContent(getArtwork(s, 'garden')), false, 'save anterior não é alterado');
});

test('dados locais adulterados são validados com limite de tamanho e coordenadas', () => {
  const injected = {
    lines: [
      { color: 'url(javascript:alert(1))', points: [[33, 22]] },
      { color: PAINT_COLORS[0], points: [[-999, 99], [99999, 900], ['20', 4], [3, NaN]] },
    ],
    stamps: [
      { symbol: '<img src=x onerror=alert(1)>', x: 5, y: 5 },
      { symbol: '🌸', x: -400, y: 999999 },
    ],
  };
  const art = sanitizeArtwork(injected);
  assert.equal(art.lines.length, 1);
  assert.deepEqual(art.lines[0].points, [[0, 99], [600, 360]]);
  assert.deepEqual(art.stamps, [{ symbol: '🌸', x: 0, y: 360 }]);
  assert.deepEqual(sanitizeArtworks({ garden: injected, forged: injected }), { garden: art });
  assert.deepEqual(sanitizeArtworks(null), {});
  const overflowing = sanitizeArtwork({
    lines: Array.from({length: 100}, () => ({ color: PAINT_COLORS[1], points: Array.from({length: 1000}, () => [1,2]) })),
    stamps: Array.from({length: 1000}, () => ({ symbol: '🌸', x: 1, y: 2 })),
  });
  assert.equal(overflowing.lines.length, 32);
  assert.equal(overflowing.lines[0].points.length, 120);
  assert.equal(overflowing.stamps.length, 40);
  assert.equal(addArtStamp(initialState(), 'garden', '<script>', 3, 4).artworks.garden, undefined);
  assert.equal(addPaintLine(initialState(), 'forged', PAINT_COLORS[0], [[10,10]]).artworks.forged, undefined);
  assert.deepEqual(sanitizeState({artworks:{ garden: injected }}).artworks.garden, art);
  assert.equal(sanitizeState({}).completed.art, undefined, 'não altera contadores antigos');
});

test('Exploradores tem três cenas distintas com pistas e fatos sem repetição', () => {
  assert.equal(DISCOVERY_SCENES.length, 3);
  for (const scene of DISCOVERY_SCENES) {
    const ids = scene.items.map(x => x.id);
    assert.equal(new Set(ids).size, scene.items.length);
    assert.equal(scene.targets.length, 3);
    assert.ok(scene.targets.every(id => ids.includes(id)));
    assert.ok(scene.items.every(i => i.fact.length > 25 && i.emoji && i.name && i.x >= 0 && i.x <= 100));
    assert.ok(scene.items.every(i => i.y >= 0 && i.y <= 100));
  }
  assert.ok(DISCOVERY_SCENES.some(s => s.id === 'night'));
});
