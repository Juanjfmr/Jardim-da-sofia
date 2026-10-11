import { mkdir, copyFile, readdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(a, b);
    else if (entry.name !== 'sw.js') await copyFile(a, b);
  }
}
async function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

await rm(dist, { recursive: true, force: true });
await copyDir(src, dist);

// Opcional: pacote de quatro modelos privados para APK familiar.
// FAMILY_MODEL_DIR aponta para uma pasta LOCAL, não versionada; os GLB não
// entram no GitHub nem são buscados em servidores de terceiros.
const familyModelDir = process.env.FAMILY_MODEL_DIR;
if (familyModelDir) {
  const folder = path.resolve(familyModelDir);
  const ids = ['chase', 'marshall', 'skye', 'rubble'];
  const out = path.join(dist, 'family-models');
  await mkdir(out, { recursive: true });
  for (const id of ids) {
    const bytes = await readFile(path.join(folder, id + '.glb'));
    if (bytes.length < 20 || bytes.length > 15 * 1024 * 1024
        || bytes.toString('ascii', 0, 4) !== 'glTF'
        || bytes.readUInt32LE(4) !== 2
        || bytes.readUInt32LE(8) !== bytes.length
        || bytes.readUInt32LE(16) !== 0x4e4f534a) {
      throw new Error('GLB 2.0 inválido ou grande demais: ' + id);
    }
    const jsonSize = bytes.readUInt32LE(12);
    if (jsonSize < 2 || jsonSize > 2_000_000 || jsonSize + 20 > bytes.length) {
      throw new Error('Descrição inválida: ' + id);
    }
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonSize));
    if (!String(gltf.asset?.version || '').startsWith('2.')) throw new Error('Versão glTF inválida: ' + id);
    if ([...(gltf.buffers || []), ...(gltf.images || [])].some(x => x.uri && !x.uri.startsWith('data:'))) {
      throw new Error('Texturas ou buffers externos não são permitidos: ' + id);
    }
    await writeFile(path.join(out, id + '.glb'), bytes);
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, ids }));
  console.log('Pacote familiar: quatro modelos 3D incorporados, sem upload ao repositório.');
}

// Bibliotecas locais: Three.js e a fonte Fredoka (sem CDN).
await mkdir(path.join(dist, 'vendor'), { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(path.join(root, 'node_modules/three/build', file), path.join(dist, 'vendor', file));
const loaderSource = await readFile(path.join(root, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js'), 'utf8');
const loaderLocal = loaderSource
  .replace(/from 'three';/g, "from './three.module.js';")
  .replace(/from '\.\.\/utils\/BufferGeometryUtils\.js';/g, "from './BufferGeometryUtils.js';");
if (loaderLocal === loaderSource) throw new Error('O carregador GLTF mudou: revise o import Three.js.');
await writeFile(path.join(dist, 'vendor/GLTFLoader.js'), loaderLocal);
const utilsSource = await readFile(path.join(root, 'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js'), 'utf8');
await writeFile(path.join(dist, 'vendor/BufferGeometryUtils.js'),
  utilsSource.replace(/from 'three';/g, "from './three.module.js';"));

await copyFile(path.join(root, 'node_modules/three/LICENSE'), path.join(dist, 'vendor/THREE-LICENSE.txt'));
const fontDir = path.join(root, 'node_modules/@fontsource-variable/fredoka');
await mkdir(path.join(dist, 'fonts'), { recursive: true });
await copyFile(path.join(fontDir, 'files/fredoka-latin-wght-normal.woff2'), path.join(dist, 'fonts/fredoka-latin-wght-normal.woff2'));
await copyFile(path.join(fontDir, 'LICENSE'), path.join(dist, 'fonts/FREDOKA-LICENSE.txt'));

await writeFile(path.join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
await writeFile(path.join(dist, '_headers'), [
  '/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Referrer-Policy: no-referrer',
  '  X-Content-Type-Options: nosniff',
  '/sw.js',
  '  Cache-Control: no-cache',
  '',
].join('\n'));

// Service worker com a lista exata de arquivos e uma versão pelo conteúdo.
const files = (await listFiles(dist)).filter(f => !['_headers', 'robots.txt'].includes(f) && !f.endsWith('.txt'));
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(path.join(dist, f)));
// Alterar apenas o service worker também deve gerar uma versão nova do cache.
hash.update(await readFile(path.join(src, 'sw.js')));
const version = hash.digest('hex').slice(0, 12);
const sw = (await readFile(path.join(src, 'sw.js'), 'utf8'))
  .replace('__VERSION__', version)
  // Modelos grandes já pertencem ao APK, não devem ocupar também o cache do SW.
  .replace('__ASSETS__', JSON.stringify(['./', ...files.filter(f => !f.startsWith('family-models/')).map(f => './' + f)]));
await writeFile(path.join(dist, 'sw.js'), sw);

console.log('Jardim: ' + files.length + ' arquivos prontos em dist (versão ' + version + ').');
