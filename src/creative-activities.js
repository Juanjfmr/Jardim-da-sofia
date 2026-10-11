// Duas brincadeiras novas: arte livre e descobertas na natureza.
// Implementadas em DOM/SVG: funcionam mesmo em aparelhos sem WebGL.
import { makeButton } from './ui.js';
import {
  ART_SCENES, PAINT_COLORS, ART_STAMPS, DISCOVERY_SCENES,
  getArtwork, replaceArtwork, updateArtwork, artworkHasContent,
} from './creative-model.js';

const escapeAttribute = s => String(s).replace(/[&"'<>]/g, '');
const paintBackground = {
  garden: '<rect width="600" height="360" fill="#dff5fa"/><circle cx="480" cy="73" r="37" fill="#ffe9a1"/><path d="M0 220Q120 140 250 218T600 195V360H0Z" fill="#b7deb0"/><path d="M0 300Q190 218 380 296T600 268V360H0Z" fill="#8cc4a1"/><path d="M0 346Q210 275 410 348" fill="none" stroke="#dce9ad" stroke-width="28" stroke-linecap="round"/><g fill="#fff" opacity=".85"><ellipse cx="130" cy="76" rx="55" ry="18"/><ellipse cx="156" cy="65" rx="35" ry="22"/><ellipse cx="312" cy="115" rx="40" ry="14"/></g>',
  night: '<rect width="600" height="360" fill="#3e517e"/><circle cx="450" cy="85" r="44" fill="#ffe6a2"/><circle cx="465" cy="72" r="44" fill="#3e517e"/><g fill="#fcf0c3"><circle cx="80" cy="50" r="5"/><circle cx="170" cy="105" r="4"/><circle cx="285" cy="58" r="6"/><circle cx="360" cy="146" r="3"/><circle cx="548" cy="130" r="5"/><circle cx="92" cy="176" r="3"/><circle cx="529" cy="46" r="3"/></g><path d="M0 300Q120 218 235 284T600 245V360H0Z" fill="#617da4"/><path d="M0 355Q195 257 361 321T600 282V360H0Z" fill="#456d7b"/>',
  pond: '<rect width="600" height="360" fill="#d5f1eb"/><circle cx="465" cy="66" r="32" fill="#ffe6ad"/><path d="M0 183Q180 122 330 175T600 153V360H0Z" fill="#a6d5a4"/><ellipse cx="300" cy="315" rx="315" ry="142" fill="#86c9d2"/><path d="M30 274Q165 243 255 274" fill="none" stroke="#bee7e9" stroke-width="8" stroke-linecap="round"/><path d="M315 315Q410 287 522 307" fill="none" stroke="#bee7e9" stroke-width="8" stroke-linecap="round"/><g fill="#8bad7a"><ellipse cx="108" cy="315" rx="45" ry="14"/><ellipse cx="496" cy="250" rx="39" ry="12"/></g>',
};
const pointFromEvent = (svg, event) => {
  const rect = svg.getBoundingClientRect();
  // O viewBox ocupa o retângulo inteiro; também funciona após rotação do celular.
  return [
    Math.max(0, Math.min(600, Math.round((event.clientX - rect.left) / Math.max(1, rect.width) * 600))),
    Math.max(0, Math.min(360, Math.round((event.clientY - rect.top) / Math.max(1, rect.height) * 360))),
  ];
};
const polyline = line => {
  if (line.points.length === 1) {
    const p = line.points[0];
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + line.color + '"/>';
  }
  return '<polyline points="' + line.points.map(p => p.join(',')).join(' ') + '" fill="none" stroke="' + line.color + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>';
};
const artMarks = (art, preview = null) => ({
  lines: art.lines.map(polyline).join('') + (preview ? polyline(preview) : ''),
  stamps: art.stamps.map(p => '<text x="' + p.x + '" y="' + p.y + '" text-anchor="middle" dominant-baseline="middle" font-size="56">' + p.symbol + '</text>').join(''),
});

export function createCreativeActivities(ctx) {
  const alive = cur => ctx.current() === cur && !cur.rewarded;

  function paintLayers(cur) {
    const svg = ctx.body().querySelector('.art-canvas');
    if (!svg) return;
    const painted = artMarks(getArtwork(ctx.state(), cur.scene), cur.activeLine);
    svg.querySelector('.art-lines').innerHTML = painted.lines;
    svg.querySelector('.art-stamps').innerHTML = painted.stamps;
  }
  function storeChange(cur, kind, payload) {
    if (!alive(cur)) return;
    const before = getArtwork(ctx.state(), cur.scene);
    cur.history.push(before);
    if (cur.history.length > 12) cur.history.shift();
    ctx.update(s => updateArtwork(s, cur.scene, kind, payload));
    cur.activeLine = null;
    paintLayers(cur);
    refreshArtTools(cur);
  }
  function refreshArtTools(cur) {
    const body = ctx.body();
    body.querySelectorAll('.art-color').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === cur.color && cur.tool === 'brush');
      b.setAttribute('aria-pressed', String(b.dataset.color === cur.color && cur.tool === 'brush'));
    });
    body.querySelectorAll('.art-stamp').forEach(b => {
      b.classList.toggle('selected', b.dataset.stamp === cur.stamp && cur.tool === 'stamp');
      b.setAttribute('aria-pressed', String(b.dataset.stamp === cur.stamp && cur.tool === 'stamp'));
    });
    const back = body.querySelector('.art-undo');
    if (back) back.disabled = cur.history.length === 0;
    const clean = body.querySelector('.art-clear');
    if (clean) clean.disabled = !artworkHasContent(getArtwork(ctx.state(), cur.scene));
    const done = body.querySelector('.art-save');
    if (done) done.disabled = !artworkHasContent(getArtwork(ctx.state(), cur.scene));
  }
  function drawArt(cur) {
    if (!alive(cur)) return;
    const body = ctx.body();
    body.innerHTML = '<div class="art-studio">'
      + '<div class="art-scene-tabs" role="group" aria-label="Escolher paisagem">'
      + ART_SCENES.map(scene => '<button type="button" class="art-scene' + (cur.scene === scene.id ? ' selected' : '')
        + '" data-scene="' + scene.id + '" aria-pressed="' + (cur.scene === scene.id) + '"><span aria-hidden="true">' + scene.emoji + '</span><small>' + scene.name + '</small></button>').join('')
      + '</div><div class="art-frame"><svg class="art-canvas" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" preserveAspectRatio="none" role="img" aria-label="Folha de desenho. Arraste para pintar ou toque para colocar um carimbo">'
      + paintBackground[cur.scene] + '<g class="art-lines"></g><g class="art-stamps"></g></svg></div>'
      + '<div class="art-palette" role="group" aria-label="Cores dos pincéis">'
      + PAINT_COLORS.map((color, i) => '<button class="art-color" type="button" data-color="' + color + '" style="--paint:' + color + '" aria-label="Pincel, cor ' + (i + 1) + '"></button>').join('')
      + '</div><div class="art-stamp-palette" role="group" aria-label="Carimbos">'
      + ART_STAMPS.map(stamp => '<button class="art-stamp" type="button" data-stamp="' + stamp + '" aria-label="Carimbo ' + stamp + '">' + stamp + '</button>').join('')
      + '</div><div class="art-actions"><button type="button" class="art-undo">↶ Desfazer</button><button type="button" class="art-clear">Limpar</button><button type="button" class="art-save">🌸 Terminei!</button></div></div>';
    paintLayers(cur);
    body.querySelectorAll('.art-scene').forEach(b => b.addEventListener('click', () => {
      if (!alive(cur) || cur.scene === b.dataset.scene) return;
      cur.scene = b.dataset.scene;
      cur.history = [];
      cur.activeLine = null;
      ctx.audio.tap();
      drawArt(cur);
      ctx.instruct('Uma nova paisagem para pintar!', 'Escolha as cores e carimbos da sua nova paisagem!');
    }));
    body.querySelectorAll('.art-color').forEach(b => b.addEventListener('click', () => {
      if (!alive(cur)) return;
      cur.color = b.dataset.color;
      cur.tool = 'brush';
      ctx.audio.tap();
      refreshArtTools(cur);
    }));
    body.querySelectorAll('.art-stamp').forEach(b => b.addEventListener('click', () => {
      if (!alive(cur)) return;
      cur.stamp = b.dataset.stamp;
      cur.tool = 'stamp';
      ctx.audio.pop();
      refreshArtTools(cur);
    }));
    body.querySelector('.art-undo').addEventListener('click', () => {
      if (!alive(cur) || !cur.history.length) return;
      const previous = cur.history.pop();
      ctx.update(s => replaceArtwork(s, cur.scene, previous));
      ctx.audio.tap();
      paintLayers(cur);
      refreshArtTools(cur);
    });
    body.querySelector('.art-clear').addEventListener('click', () => {
      if (!alive(cur)) return;
      storeChange(cur, 'clear');
      ctx.audio.soft();
    });
    body.querySelector('.art-save').addEventListener('click', () => {
      if (!alive(cur) || !artworkHasContent(getArtwork(ctx.state(), cur.scene))) return;
      ctx.react('happy');
      ctx.success('art', 'Seu desenho ficou guardado no ateliê. Vamos criar mais?', '🎨', true);
    });
    const canvas = body.querySelector('.art-canvas');
    canvas.addEventListener('pointerdown', e => {
      if (!alive(cur)) return;
      e.preventDefault();
      const [x,y] = pointFromEvent(canvas, e);
      if (cur.tool === 'stamp') {
        storeChange(cur, 'stamp', { symbol: cur.stamp, x, y });
        ctx.audio.pop();
        ctx.react('happy');
      } else {
        cur.activeLine = { color: cur.color, points: [[x,y]] };
        canvas.setPointerCapture?.(e.pointerId);
        paintLayers(cur);
      }
    });
    canvas.addEventListener('pointermove', e => {
      if (!alive(cur) || !cur.activeLine) return;
      const p = pointFromEvent(canvas, e);
      const prev = cur.activeLine.points.at(-1);
      if (Math.hypot(prev[0] - p[0], prev[1] - p[1]) < 4 || cur.activeLine.points.length >= 120) return;
      cur.activeLine.points.push(p);
      paintLayers(cur);
    });
    canvas.addEventListener('pointerup', () => {
      if (!alive(cur) || !cur.activeLine) return;
      const line = cur.activeLine;
      storeChange(cur, 'line', line);
      ctx.audio.xylo(2);
    });
    canvas.addEventListener('pointercancel', () => { cur.activeLine = null; paintLayers(cur); });
    refreshArtTools(cur);
  }
  function art(cur) {
    cur.scene = ART_SCENES[0].id;
    cur.color = PAINT_COLORS[0];
    cur.stamp = ART_STAMPS[0];
    cur.tool = 'brush';
    cur.history = [];
    cur.activeLine = null;
    drawArt(cur);
    ctx.instruct('Pinte com o dedo! Ou escolha um carimbo.', 'Esse é o seu ateliê! Escolha uma cor e arraste o dedo. Ou toque num carimbo!');
  }

  function drawExplore(cur) {
    if (!alive(cur)) return;
    const body = ctx.body();
    const target = cur.scene.items.find(item => item.id === cur.scene.targets[cur.index]);
    body.innerHTML = '<div class="explore-play"><div class="explore-progress" aria-label="Descobertas">'
      + cur.scene.targets.map((id, i) => '<span class="' + (i < cur.index ? 'found' : '') + '" aria-label="Descoberta ' + (i + 1) + '">✦</span>').join('')
      + '</div><div class="explore-landscape explore-' + cur.scene.id + '">'
      + '<div class="explore-sun"></div><div class="explore-hill"></div><div class="explore-hill back"></div>'
      + cur.scene.items.map(item => '<button type="button" class="explore-item'
        + (cur.found.has(item.id) ? ' found' : '') + (target?.id === item.id ? ' is-target' : '')
        + '" style="left:' + item.x + '%;top:' + item.y + '%" data-object="' + item.id
        + '" aria-label="' + escapeAttribute(item.name) + '" aria-pressed="' + cur.found.has(item.id) + '">'
        + '<span aria-hidden="true">' + item.emoji + '</span></button>').join('')
      + '</div><p class="explore-fact" role="status" aria-live="polite">' + (cur.fact || 'Toque nos bichinhos e veja o que o Pipo descobre!') + '</p></div>';
    body.querySelectorAll('.explore-item').forEach(b => b.addEventListener('click', () => {
      if (!alive(cur)) return;
      const item = cur.scene.items.find(x => x.id === b.dataset.object);
      if (!item) return;
      cur.fact = item.emoji + ' ' + item.fact;
      ctx.audio.pop();
      ctx.react('curious');
      if (item.id === cur.scene.targets[cur.index]) {
        cur.found.add(item.id);
        cur.index++;
        ctx.coach.clear();
        ctx.audio.sparkle();
        drawExplore(cur);
        if (cur.index >= cur.scene.targets.length) {
          ctx.success('explore', 'Você encontrou os amigos do ' + cur.scene.name.toLowerCase() + '! Agora sabe mais sobre a natureza.', '🔎', true);
        } else {
          const next = cur.scene.items.find(x => x.id === cur.scene.targets[cur.index]);
          ctx.instruct('Muito bem! Agora encontre ' + (next.name === 'abelha' || next.name === 'borboleta' || next.name === 'joaninha' || next.name === 'lua' || next.name === 'estrela' || next.name === 'coruja' || next.name === 'flor' ? 'a ' : 'o ') + next.name + '.',
            item.fact + ' Agora procure ' + next.name + '!');
        }
      } else {
        body.querySelector('.explore-fact').textContent = cur.fact;
        ctx.audio.say(item.fact + ' Vamos encontrar ' + target.name + '?');
      }
    }));
    if (target) ctx.coach.watch(() => body.querySelector('[data-object="' + target.id + '"]'), [6500, 9000, 12500][ctx.state().level - 1]);
  }
  function explore(cur) {
    cur.scene = DISCOVERY_SCENES[(ctx.state().completed.explore || 0) % DISCOVERY_SCENES.length];
    cur.index = 0;
    cur.found = new Set();
    cur.fact = '';
    drawExplore(cur);
    const first = cur.scene.items.find(x => x.id === cur.scene.targets[0]);
    ctx.instruct('Quem mora aqui? Encontre ' + first.name + '!', 'Vamos explorar ' + cur.scene.name + '! Encontre ' + first.name + '!');
  }

  return { art, explore };
}
