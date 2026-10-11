// Browser smoke test sem dependências: CDP com Chrome/Chromium em 390×844 e 844×390.
// Executado no CI depois da suíte Node; exercita também o WebGL quando disponível.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, resolve, sep } from 'node:path';

const dist = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const delay = ms => new Promise(ok => setTimeout(ok, ms));
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(dist, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(bytes);
  } catch { res.writeHead(404).end('not found'); }
});
let browser, connection, profile;
const finish = async () => {
  try { connection?.close(); } catch { /* already closed */ }
  if (browser && browser.exitCode === null) browser.kill('SIGKILL');
  await new Promise(done => server.close(done));
  if (profile) await rm(profile, { recursive: true, force: true });
};
try {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const host = 'http://127.0.0.1:' + server.address().port;
  profile = await mkdtemp(join(tmpdir(), 'jardim-browser-'));
  const chrome = process.env.CHROME_BIN
    || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
      .find(existsSync) || 'google-chrome';
  browser = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--no-default-browser-check', '--mute-audio', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 80; i++) {
    if (browser.exitCode !== null) throw new Error('Chrome terminou antes do início.');
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
    catch { await delay(150); }
  }
  assert.ok(port, 'Chrome não abriu porta de depuração.');
  const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const target = pages.find(p => p.type === 'page');
  assert.ok(target?.webSocketDebuggerUrl, 'Aba de teste não encontrada.');
  connection = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    connection.addEventListener('open', ok, { once: true });
    connection.addEventListener('error', fail, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  connection.addEventListener('message', msg => {
    const data = JSON.parse(msg.data);
    if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails?.text || 'Erro JS');
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error.message));
    else request.resolve(data.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    connection.send(JSON.stringify({ id: next, method, params }));
  });
  const evalJs = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ': ' + response.exceptionDetails.exception?.description);
    return response.result?.value;
  };
  const click = selector => evalJs(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Botão ausente: ${selector}'); el.click(); return true; })()`);
  const waitFor = async (expr, label) => {
    for (let i = 0; i < 65; i++) { if (await evalJs(expr).catch(() => false)) return; await delay(180); }
    throw new Error('Timeout: ' + label);
  };
  const snap = async filename => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(filename, Buffer.from(data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Page.navigate', { url: host + '/index.html' });
  await waitFor("typeof window.jardimSofia !== 'undefined'", 'aplicativo iniciar');
  assert.equal(await evalJs("document.querySelector('#welcome')?.hidden"), false);
  await click('#start-btn');
  assert.equal(await evalJs("window.jardimSofia.getState().visits"), 1);
  const home = await evalJs(`(() => {
    const a = document.querySelector('#app').getBoundingClientRect();
    const stage = document.querySelector('#stage').getBoundingClientRect();
    const dock = document.querySelector('#dock').getBoundingClientRect();
    return { width: a.width, height: a.height, stage: stage.height, dockBottom: dock.bottom,
      dockButtons: document.querySelectorAll('.dock-btn').length,
      overflowX: document.documentElement.scrollWidth - window.innerWidth };
  })()`);
  assert.equal(home.dockButtons, 5);
  assert.ok(home.stage > 200, 'jardim deve ser visível');
  assert.ok(home.overflowX <= 2, 'sem rolagem lateral em celular');
  assert.ok(home.dockBottom <= 846, 'navegação cabe na tela de celular');
  await snap('smoke-portrait.png');

  await click('.dock-btn.games');
  assert.equal(await evalJs("document.querySelectorAll('.game-card').length"), 8);
  await click('.game-card[data-activity="art"]');
  assert.equal(await evalJs("window.jardimSofia.getActivity()"), 'art');
  assert.equal(await evalJs("document.querySelectorAll('.art-stamp').length"), 8);
  await click('.art-stamp');
  await evalJs(`(() => {
    const el = document.querySelector('.art-canvas');
    const rect = el.getBoundingClientRect();
    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true,
      pointerId: 2, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
    el.dispatchEvent(event);
  })()`);
  assert.equal(await evalJs("window.jardimSofia.getState().artworks.garden.stamps.length"), 1);
  await click('.art-save');
  assert.equal(await evalJs("window.jardimSofia.getState().completed.art"), 1);
  await click('#activity-close');

  await click('.dock-btn.games');
  await click('.game-card[data-activity="explore"]');
  assert.equal(await evalJs("window.jardimSofia.getActivity()"), 'explore');
  await click('.explore-item[data-object="bee"]');
  await click('.explore-item[data-object="butterfly"]');
  await click('.explore-item[data-object="ladybug"]');
  assert.equal(await evalJs("window.jardimSofia.getState().completed.explore"), 1);
  await click('#activity-close');

  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true, screenWidth: 844, screenHeight: 390 });
  await delay(450);
  const landscape = await evalJs(`(() => {
    const app = document.querySelector('#app').getBoundingClientRect();
    const stage = document.querySelector('#stage').getBoundingClientRect();
    const dock = document.querySelector('#dock').getBoundingClientRect();
    return { appWidth:app.width,appHeight:app.height,stageHeight:stage.height,dockBottom:dock.bottom,
      overflowX:document.documentElement.scrollWidth-window.innerWidth };
  })()`);
  assert.ok(landscape.stageHeight >= 150, 'jardim legível na horizontal');
  assert.ok(landscape.overflowX <= 2, 'sem rolagem lateral na horizontal');
  assert.ok(landscape.dockBottom <= 392);
  await snap('smoke-landscape.png');
  assert.deepEqual(exceptions, [], 'nenhuma exceção não tratada no navegador');
  console.log('SMOKE OK: retrato 390×844, paisagem 844×390, Ateliê, Explorar, navegação e capturas.');
} finally {
  await finish();
}
