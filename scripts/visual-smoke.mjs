// Capturas automatizadas para revisar o acabamento real do WebGL.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4173';
const output = 'visual-previews';
const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1', '--directory', 'dist'], {
  stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const result = await fetch(base);
      if (result.ok) { ready = true; break; }
    } catch { /* servidor ainda iniciando */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Servidor de prévia não iniciou.');
  await mkdir(output, { recursive: true });

  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl',
      '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
  });
  for (const [name, width, height] of [
    ['celular-vertical', 390, 844],
    ['celular-horizontal', 844, 390],
    ['tablet-vertical', 820, 1180],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'load' });
    await page.locator('#start-btn').click();
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('#world');
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      return {
        active: window.jardimSofia?.is3D(),
        webgl: Boolean(gl),
        canvas: [canvas?.width || 0, canvas?.height || 0],
        labels: [...document.querySelectorAll('#station-labels button')]
          .filter(element => element.getBoundingClientRect().width > 0).length,
      };
    });
    if (errors.length) throw new Error(name + ': ' + errors.join(' / '));
    if (!result.active || !result.webgl || !result.canvas.every(n => n > 1)) {
      throw new Error(name + ': cena 3D indisponível: ' + JSON.stringify(result));
    }
    await page.screenshot({ path: output + '/' + name + '.png' });
    console.log(name + ': ' + JSON.stringify(result));
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
