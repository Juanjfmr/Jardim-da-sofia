import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function appWorker() {
  const code = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
  const handlers = {};
  const stored = new Map();
  const waits = [];
  let online = true, calls = 0;
  const index = { ok: true, type: 'basic', name: 'offline-index', clone() { return this; } };
  const live = { ok: true, type: 'basic', name: 'online-index', clone() { return this; } };
  const makeKey = req => typeof req === 'string' ? req : req.url;
  const cache = {
    addAll: async assets => { for (const key of assets) stored.set(key, key === './index.html' ? index : {name:key}); },
    put: async (req, value) => { stored.set(makeKey(req), value); },
  };
  const cacheAPI = {
    open: async () => cache,
    match: async req => stored.get(makeKey(req)) || null,
    keys: async () => ['jardim-old', 'jardim-other', 'outside-jardim'],
    delete: async key => { stored.set('deleted:' + key, true); },
  };
  const context = {
    self: {
      location: { origin: 'https://example.com' },
      registration: { scope: 'https://example.com/Jardim-da-sofia/' },
      addEventListener: (event, handler) => { handlers[event] = handler; },
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    URL,
    caches: cacheAPI,
    fetch: async () => { calls++; if (!online) throw new Error('offline'); return live; },
    Response: { error: () => ({ name: 'offline-error' }) },
  };
  vm.runInNewContext(code, context, {filename:'sw.js'});
  async function dispatch(type, request) {
    let response;
    waits.length = 0;
    handlers[type]({
      request,
      respondWith: p => { response = p; },
      waitUntil: p => { waits.push(Promise.resolve(p)); },
    });
    const result = response && await response;
    await Promise.all(waits);
    return result;
  }
  return { handlers, stored, cacheAPI, dispatch, setOnline(v) { online = v; }, get calls() { return calls; } };
}

test('PWA pré-carrega os recursos e apresenta versão online atualizada', async () => {
  const sw = await appWorker();
  await sw.dispatch('install');
  assert.ok(sw.stored.has('./index.html'));
  assert.ok(sw.stored.has('./visual-polish.css'), 'CSS novo também funciona offline');
  assert.ok(sw.stored.has('./scene-polish.js'), 'atmosfera também funciona offline');
  const req = {method:'GET',mode:'navigate',url:'https://example.com/Jardim-da-sofia/index.html'};
  const live = await sw.dispatch('fetch',req);
  assert.equal(live.name,'online-index');
  assert.equal(sw.calls,1,'a tela busca a versão mais recente em rede');
  assert.equal(sw.stored.get(req.url), live,'a nova tela fica guardada');
  sw.setOnline(false);
  const cached = await sw.dispatch('fetch',req);
  assert.equal(cached.name,'online-index','offline reaproveita última versão');
  assert.equal(sw.calls,2,'tentativa de rede termina no cache');
});

test('PWA abre a tela inicial offline e ignora outros projetos e métodos inseguros', async () => {
  const sw = await appWorker();
  await sw.dispatch('install');
  sw.setOnline(false);
  const result = await sw.dispatch('fetch',{
    method:'GET',mode:'navigate',url:'https://example.com/Jardim-da-sofia/?offline=1',
  });
  assert.equal(result.name,'offline-index');
  const before = sw.calls;
  assert.equal(await sw.dispatch('fetch',{
    method:'GET',mode:'navigate',url:'https://example.com/Outro-projeto/',
  }), undefined);
  assert.equal(await sw.dispatch('fetch',{
    method:'POST',mode:'same-origin',url:'https://example.com/Jardim-da-sofia/data',
  }), undefined);
  assert.equal(sw.calls,before,'não intercepta fora do aplicativo');
  const cached = await sw.dispatch('fetch',{
    method:'GET',mode:'same-origin',url:'https://example.com/Jardim-da-sofia/visual-polish.css',
  });
  assert.equal(cached.name,'offline-error','arquivos inexistentes retornam falha sem criar resposta falsa');
});
