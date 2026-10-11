// Verifica a inclusão de quatro GLB particulares sem usar nem publicar modelos reais.
// Somente o APK com FAMILY_MODEL_DIR presente deve receber os arquivos.
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const folder = await mkdtemp(join(tmpdir(), 'jardim-glb-fixture-'));
function sampleGlb() {
  const json = JSON.stringify({ asset:{ version:'2.0' }, scene:0, scenes:[{nodes:[]}], nodes:[] });
  const padded = json + ' '.repeat((4 - json.length % 4) % 4);
  const bytes = Buffer.alloc(20 + Buffer.byteLength(padded));
  bytes.write('glTF', 0, 4, 'ascii');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(Buffer.byteLength(padded), 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  bytes.write(padded, 20);
  return bytes;
}
try {
  for (const id of ['chase','marshall','skye','rubble']) await writeFile(join(folder, id + '.glb'), sampleGlb());
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    env: { ...process.env, FAMILY_MODEL_DIR: folder }, stdio:'inherit',
  });
  const manifest = JSON.parse(await readFile('dist/family-models/manifest.json', 'utf8'));
  assert.deepEqual(manifest.ids, ['chase','marshall','skye','rubble']);
  for (const id of manifest.ids) assert.ok((await stat('dist/family-models/' + id + '.glb')).size > 20);
  const sw = await readFile('dist/sw.js', 'utf8');
  assert.ok(!sw.includes('./family-models/chase.glb'), 'não duplicar binários no cache offline');
  console.log('Pacote particular de quatro GLB: OK (somente modelos fictícios de teste).');
} finally {
  await rm(folder, {recursive:true,force:true});
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'FAMILY_MODEL_DIR')),
    stdio:'inherit',
  });
  assert.ok(!existsSync('dist/family-models'), 'build normal não carrega modelos do pacote privado');
}
