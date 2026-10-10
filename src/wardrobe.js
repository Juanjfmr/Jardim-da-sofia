import { makeButton, installDrag } from './ui.js';
import { icon } from './icons.js';
import { OUTFITS, OUTFIT_COLORS, ACCESSORIES, unlockedAccessories, nextAccessory } from './state.js';
import { pipoPortrait, outfitIcon } from './pipo-portrait.js';

// Troca imediata: o espelho e o Pipo do jardim usam a mesma roupa salva.
export function createWardrobe(ctx) {
  let alive = true;
  let moodTimer;
  const root = document.createElement('div');
  root.className = 'pipo-room wardrobe-room';
  root.innerHTML = `<div class="room-guide"><span aria-hidden="true">👕</span><p class="wardrobe-instruction">Escolha uma roupa e uma cor para o Pipo!</p><button class="wardrobe-listen" type="button" aria-label="Ouvir o guarda-roupa">${icon('sound')}</button></div>
    <div class="wardrobe-studio"><button class="wardrobe-mirror" type="button" aria-label="Dar carinho no Pipo"><span class="wardrobe-portrait"></span><span class="wardrobe-reaction">Vamos experimentar?</span></button>
    <div class="wardrobe-cabinet"><h3><span aria-hidden="true">🧺</span> Roupinhas</h3><div class="wardrobe-outfits"></div><h3><span aria-hidden="true">🎨</span> Cores</h3><div class="wardrobe-colors"></div></div></div>
    <section class="wardrobe-gifts"><h3><span aria-hidden="true">🎁</span> Enfeites das brincadeiras</h3><div id="wardrobe-progress" class="wardrobe-progress"></div><div id="accessory-options" class="accessory-grid"></div></section>`;
  ctx.body.replaceChildren(root);
  const mirror = root.querySelector('.wardrobe-mirror');
  const portrait = root.querySelector('.wardrobe-portrait');
  const reaction = root.querySelector('.wardrobe-reaction');
  const instruction = root.querySelector('.wardrobe-instruction');
  const paint = (mood = 'idle') => { portrait.innerHTML = pipoPortrait({ ...ctx.state(), mood }); };
  function celebrate(text) {
    ctx.touch();
    clearTimeout(moodTimer);
    paint('happy');
    reaction.textContent = text;
    ctx.react('happy');
    ctx.audio.sparkle();
    ctx.say(text);
    ctx.burst(mirror, '✨', 4);
    moodTimer = setTimeout(() => { if (alive) paint(); }, 1800);
  }
  function chooseOutfit(id) {
    if (!alive) return false;
    ctx.update(s => ({ ...s, outfit: id }));
    render();
    celebrate(id === 'none' ? 'Meu pelo fofinho!' : 'Olha minha roupa! Vamos passear?');
    return true;
  }
  function onPipo(target, x, y, under = []) {
    const r = mirror.getBoundingClientRect();
    return mirror.contains(target) || under.some(n => mirror.contains(n)) || (r.width > 0 && x >= r.left - 14 && x <= r.right + 14 && y >= r.top - 14 && y <= r.bottom + 14);
  }
  function render() {
    const focused = document.activeElement;
    const focusKey = focused?.dataset?.outfit ? ['outfit', focused.dataset.outfit] : focused?.dataset?.outfitColor ? ['outfitColor', focused.dataset.outfitColor] : focused?.dataset?.accessory ? ['accessory', focused.dataset.accessory] : null;
    const s = ctx.state();
    paint();
    const outfits = root.querySelector('.wardrobe-outfits');
    outfits.replaceChildren();
    for (const outfit of OUTFITS) {
      const b = makeButton('wardrobe-outfit' + (s.outfit === outfit.id ? ' is-selected' : ''), outfitIcon(outfit.id, s.outfitColor) + '<span>' + outfit.label + '</span>', null, 'Vestir ' + outfit.label.toLowerCase());
      b.dataset.outfit = outfit.id;
      b.setAttribute('aria-pressed', String(s.outfit === outfit.id));
      installDrag(b, { onTap: () => chooseOutfit(outfit.id), onDrop: (target, x, y, under) => onPipo(target, x, y, under) && chooseOutfit(outfit.id) });
      outfits.appendChild(b);
    }
    const colors = root.querySelector('.wardrobe-colors');
    colors.replaceChildren();
    for (const color of OUTFIT_COLORS) {
      const b = makeButton('wardrobe-color' + (s.outfitColor === color.id ? ' is-selected' : ''), '<i style="background:' + color.hex + '"></i><span>' + color.label + '</span>', () => {
        if (!alive) return;
        ctx.update(s => ({ ...s, outfitColor: color.id }));
        render();
        celebrate('Escolhi ' + color.label.toLowerCase() + '!');
      }, 'Roupa ' + color.label.toLowerCase());
      b.dataset.outfitColor = color.id;
      b.setAttribute('aria-pressed', String(s.outfitColor === color.id));
      colors.appendChild(b);
    }
    const next = nextAccessory(s);
    root.querySelector('#wardrobe-progress').textContent = '🌸 ' + s.rewards + (next ? '  →  ' + next.emoji + ' ' + next.need : '  ✨ Todos os enfeites!');
    const accessories = root.querySelector('#accessory-options');
    accessories.replaceChildren();
    const unlocked = unlockedAccessories(s);
    for (const a of ACCESSORIES) {
      const open = unlocked.includes(a.id);
      const b = makeButton('accessory-btn' + (s.accessory === a.id ? ' selected' : '') + (open ? '' : ' locked'), '<span class="acc-emoji">' + a.emoji + '</span>' + (open ? '' : '<span class="acc-lock">' + icon('lock') + '<small>🌸' + a.need + '</small></span>'), () => {
        if (!alive) return;
        ctx.touch();
        if (!open) { ctx.audio.soft(); ctx.say('Brinque para ganhar este enfeite! As roupinhas já estão prontas para usar.'); return; }
        ctx.update(s => ({ ...s, accessory: a.id }));
        render();
        celebrate(a.id === 'none' ? 'Assim, sem enfeite!' : 'Que lindo! ' + a.label + '!');
      }, a.label + (open ? '' : ': ' + a.need + ' flores para ganhar'));
      b.setAttribute('aria-pressed', String(s.accessory === a.id));
      b.dataset.accessory = a.id;
      accessories.appendChild(b);
    }
    if (focusKey) [...root.querySelectorAll('button')].find(b => b.dataset[focusKey[0]] === focusKey[1])?.focus?.();
  }
  root.querySelector('.wardrobe-listen').addEventListener('click', () => { if (alive) { ctx.touch(); ctx.say(instruction.textContent); } });
  mirror.addEventListener('click', () => { if (alive) celebrate('Hihihi! Gostou da minha roupa?'); });
  render();
  ctx.say(instruction.textContent);
  return { destroy() { alive = false; clearTimeout(moodTimer); } };
}
