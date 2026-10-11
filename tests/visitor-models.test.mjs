import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  VISITORS, visitorById, validateGlb, MAX_VISITOR_BYTES,
} from '../dist/visitor-models.js';

function glb(json = { asset: { version: '2.0' }, nodes: [], scenes: [{nodes:[]}], scene: 0 }) {
  let str = JSON.stringify(json);
  str += ' '.repeat((4 - str.length % 4) % 4);
  const text = new TextEncoder().encode(str);
  const result = new ArrayBuffer(20 + text.length);
  const v = new DataView(result);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, result.byteLength, true);
  v.setUint32(12, text.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20).set(text);
  return result;
}

test('quatro visitantes oficiais somente como posições para modelos locais', () => {
  assert.deepEqual(VISITORS.map(v => v.id), ['chase','marshall','skye','rubble']);
  assert.equal(visitorById('chase')?.name, 'Chase');
  assert.equal(visitorById('unknown'), null);
  assert.equal(MAX_VISITOR_BYTES, 15 * 1024 * 1024);
});

test('somente GLB 2.0 com cabeçalho e tamanho corretos é aceito', () => {
  assert.equal(validateGlb(glb()), true);
  const tampered = glb();
  new DataView(tampered).setUint32(8, 500, true);
  assert.throws(() => validateGlb(tampered), /GLB/);
  assert.throws(() => validateGlb(new ArrayBuffer(10)), /completo/);
  const v1 = glb();
  new DataView(v1).setUint32(4, 1, true);
  assert.throws(() => validateGlb(v1), /GLB/);
});

test('o build traz carregador 3D offline e nenhuma imagem ou modelo de terceiros', async () => {
  const path = new URL('../dist/vendor/GLTFLoader.js', import.meta.url);
  const loader = await readFile(path, 'utf8');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const src = await readFile(new URL('../dist/visitor-models.js', import.meta.url), 'utf8');
  assert.match(loader, /from '\.\/three\.module\.js'/);
  assert.doesNotMatch(loader, /from 'three'/);
  assert.match(html, /id="visitor-settings"/);
  assert.match(html, /id="visitor-buttons"/);
  assert.match(src, /indexedDB/);
  assert.doesNotMatch(src, /fetch\(/);
});
