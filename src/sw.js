// Service worker: guarda o jogo no aparelho para abrir rápido e funcionar sem internet.
// VERSION e ASSETS são preenchidos por scripts/build.mjs.
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = 'jardim-' + VERSION;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jardim-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Somente requisições dentro do escopo deste aplicativo: GitHub Pages pode
// hospedar outros projetos na mesma origem.
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin
      || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  if (req.mode === 'navigate') {
    // Navegação online busca a versão mais recente, sem servir uma tela antiga.
    // Sem internet, a instalação pré-carregada continua disponível.
    event.respondWith(fetch(req).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
      }
      return response;
    }).catch(async () =>
      await caches.match(req, { ignoreSearch: true })
      || await caches.match('./index.html')
      || Response.error()
    ));
    return;
  }

  // Recursos com versão pelo conteúdo: rápidos mesmo sem internet.
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
    }
    return response;
  }).catch(() => Response.error())));
});
