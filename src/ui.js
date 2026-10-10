// Pequenos ajudantes de interface, sem estado do jogo.

export const $ = id => document.getElementById(id);

export function makeButton(className, html, onClick, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.innerHTML = html;
  if (label) b.setAttribute('aria-label', label);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

const rectOf = node => node?.getBoundingClientRect?.() || null;
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Arrastar a própria peça. Toque curto = escolher; soltar longe = a peça volta com mola.
// onDrop(target, x, y) devolve true quando o arraste foi aceito.
export function installDrag(node, { onTap, onDrop, onMove, onEnd }) {
  let drag = null;
  let lastPointerUp = 0;
  const reset = () => {
    node.classList.remove('dragging');
    node.classList.add('returning');
    node.style.transform = '';
    setTimeout(() => node.classList.remove('returning'), 320);
  };
  node.addEventListener('pointerdown', e => {
    if (node.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { x: e.clientX, y: e.clientY, moving: false };
    try { node.setPointerCapture?.(e.pointerId); } catch { /* ok */ }
  });
  node.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moving && Math.hypot(dx, dy) > 10) {
      drag.moving = true;
      node.classList.add('dragging');
    }
    if (drag.moving) {
      node.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)';
      onMove?.(e.clientX, e.clientY);
    }
  });
  node.addEventListener('pointerup', e => {
    if (!drag) return;
    const wasMoving = drag.moving;
    drag = null;
    lastPointerUp = Date.now();
    if (!wasMoving) { onTap?.(); return; }
    const under = (document.elementsFromPoint?.(e.clientX, e.clientY) || []).filter(n => n !== node && !node.contains(n));
    const accepted = onDrop?.(under[0] || null, e.clientX, e.clientY, under);
    onEnd?.(accepted);
    if (accepted) {
      node.classList.remove('dragging');
      node.style.transform = '';
    } else reset();
  });
  node.addEventListener('pointercancel', () => { if (drag?.moving) reset(); drag = null; onEnd?.(false); });
  // Teclado e leitores de tela (e os testes) chegam aqui sem pointerup.
  node.addEventListener('click', () => { if (Date.now() - lastPointerUp > 400 && !node.disabled) onTap?.(); });
}

// Emojis que sobem e somem a partir de um ponto (ou do centro do palco).
export function particles(layer, symbol = '💛', count = 6, at = null) {
  if (!layer) return;
  const box = rectOf(layer);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'float-particle';
    p.textContent = symbol;
    if (at && box) {
      p.style.left = (at.x - box.left + (Math.random() - 0.5) * 40) + 'px';
      p.style.top = (at.y - box.top + (Math.random() - 0.5) * 30) + 'px';
    } else {
      p.style.left = (42 + Math.random() * 16) + '%';
      p.style.top = (40 + Math.random() * 15) + '%';
    }
    p.style.setProperty('--dx', ((Math.random() - 0.5) * 160) + 'px');
    p.style.animationDelay = (Math.random() * 0.2) + 's';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1900);
  }
}

const CONFETTI_COLORS = ['#f0626b', '#ffc94d', '#5aaeea', '#6cc07a', '#ff9a4d', '#a98bdc', '#f7a8c4'];
export function confetti(layer, count = 46) {
  if (!layer) return;
  const n = reducedMotion() ? 10 : count;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti' + (i % 4 === 0 ? ' round' : '');
    c.style.left = (Math.random() * 100) + '%';
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.setProperty('--drift', ((Math.random() - 0.5) * 140) + 'px');
    c.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
    c.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    c.style.animationDelay = (Math.random() * 0.35) + 's';
    layer.appendChild(c);
    setTimeout(() => c.remove(), 3400);
  }
}

// Um emoji voa de um elemento até outro (ex.: a flor ganha vai para o contador).
export function flyTo(from, to, html, onArrive) {
  const a = rectOf(from), b = rectOf(to);
  if (!a || !b || !a.width || !b.width) { onArrive?.(); return; }
  const f = document.createElement('div');
  f.className = 'fly-token';
  f.innerHTML = html;
  f.style.left = (a.left + a.width / 2) + 'px';
  f.style.top = (a.top + a.height / 2) + 'px';
  document.body.appendChild(f);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.6)';
    f.style.opacity = '0.4';
  }));
  setTimeout(() => { f.remove(); onArrive?.(); }, 900);
}

// Botão para adultos: precisa segurar. Toque rápido só mostra a dica.
export function holdToActivate(btn, ms, onDone, onShortTap) {
  let timer = null, startedAt = 0;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
  btn.style.setProperty('--hold', ms + 'ms');
  btn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startedAt = Date.now();
    btn.classList.add('holding');
    timer = setTimeout(() => { cancel(); startedAt = 0; onDone(); }, ms);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    btn.addEventListener(type, () => {
      if (!timer) return;
      const short = Date.now() - startedAt < ms;
      cancel();
      if (short && type === 'pointerup') onShortTap?.();
    });
  }
  btn.addEventListener('contextmenu', e => e.preventDefault());
  // Ativação por teclado (Enter/Espaço) não tem como segurar: abre direto.
  btn.addEventListener('click', e => { if (!e.detail) onDone(); });
}

// Ajuda automática: se a criança fica parada ou erra duas vezes, a resposta certa
// pulsa e uma mãozinha aponta para ela.
export class Coach {
  constructor({ hand, onHint }) {
    this.hand = hand;
    this.onHint = onHint;
    this.timer = null;
    this.hideTimer = null;
    this.getTarget = null;
    this.delay = 8000;
    this.misses = 0;
    this.shown = 0;
  }
  watch(getTarget, delay) {
    this.getTarget = getTarget;
    if (delay) this.delay = delay;
    this.misses = 0;
    this.shown = 0;
    this.arm();
  }
  arm() {
    clearTimeout(this.timer);
    if (!this.getTarget) return;
    this.timer = setTimeout(() => this.show(), this.delay * (1 + this.shown * 0.5));
  }
  poke() { this.hide(); this.arm(); }
  hit() { this.misses = 0; this.poke(); }
  miss() {
    this.misses++;
    if (this.misses >= 2) { this.misses = 0; this.show(); } else this.poke();
  }
  show() {
    const target = this.getTarget?.();
    if (!target) return;
    this.hide();
    this.shown++;
    target.classList.add('hint');
    this.target = target;
    const r = rectOf(target);
    if (this.hand && r && r.width) {
      this.hand.hidden = false;
      this.hand.style.left = (r.left + r.width / 2) + 'px';
      this.hand.style.top = (r.top + r.height * 0.6) + 'px';
    }
    this.onHint?.(target);
    this.hideTimer = setTimeout(() => { this.hide(); this.arm(); }, 2600);
  }
  hide() {
    clearTimeout(this.hideTimer);
    this.target?.classList.remove('hint');
    this.target = null;
    if (this.hand) this.hand.hidden = true;
  }
  clear() {
    clearTimeout(this.timer);
    this.timer = null;
    this.getTarget = null;
    this.hide();
  }
}
