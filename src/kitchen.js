// Cozinha de faz de conta: a criança combina, assa e serve sem receitas obrigatórias.
import { installDrag, makeButton } from './ui.js';
import { pipoPortrait } from './pipo-portrait.js';

export const KITCHEN_INGREDIENTS = [
  { id: 'tomato', name: 'Tomate', emoji: '🍅' },
  { id: 'cheese', name: 'Queijo', emoji: '🧀' },
  { id: 'mushroom', name: 'Cogumelo', emoji: '🍄' },
  { id: 'carrot', name: 'Cenoura', emoji: '🥕' },
  { id: 'broccoli', name: 'Brócolis', emoji: '🥦' },
  { id: 'banana', name: 'Banana', emoji: '🍌' },
  { id: 'flour', name: 'Farinha', emoji: '🌾' },
  { id: 'milk', name: 'Leite', emoji: '🥛' },
];
export const KITCHEN_RECIPES = [
  { id: 'pizza', name: 'Pizza', emoji: '🍕', color: '#f5bba7', suggestions: ['tomato', 'cheese', 'mushroom'] },
  { id: 'banana-cake', name: 'Bolo de banana', emoji: '🍰', color: '#f4d483', suggestions: ['banana', 'flour', 'milk'] },
  { id: 'roast-vegetables', name: 'Legumes assados', emoji: '🥘', color: '#aad59c', suggestions: ['carrot', 'broccoli', 'mushroom'] },
];
const MAX_INGREDIENTS = 5;
const BAKE_TIME = 4000;
const recipeFor = id => KITCHEN_RECIPES.find(recipe => recipe.id === id) || KITCHEN_RECIPES[0];
const ingredientFor = id => KITCHEN_INGREDIENTS.find(ingredient => ingredient.id === id);

export function kitchenRound(recipe = 'pizza') {
  return { recipe: recipeFor(recipe).id, ingredients: [], stage: 'preparing' };
}

// Mantém transições explícitas: callbacks atrasados nunca podem servir comida crua
// nem recompensar duas vezes o mesmo prato.
export function kitchenAction(round, action, ingredient) {
  if (action === 'reset') return kitchenRound(round.recipe);
  if (action === 'add' && round.stage === 'preparing' && ingredientFor(ingredient) && round.ingredients.length < MAX_INGREDIENTS) {
    return { ...round, ingredients: [...round.ingredients, ingredient] };
  }
  if (action === 'undo' && round.stage === 'preparing' && round.ingredients.length) {
    return { ...round, ingredients: round.ingredients.slice(0, -1) };
  }
  if (action === 'bake' && round.stage === 'preparing' && round.ingredients.length) return { ...round, stage: 'baking' };
  if (action === 'ready' && round.stage === 'baking') return { ...round, stage: 'ready' };
  if (action === 'serve' && round.stage === 'ready') return { ...round, stage: 'served' };
  return round;
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function plateArt(recipe, baked, empty = false) {
  const stroke = baked ? '#b57e44' : '#d6b182';
  const base = baked ? '#eeb758' : '#f8dda4';
  let food;
  if (recipe === 'pizza') {
    food = '<circle cx="100" cy="82" r="61" fill="' + base + '" stroke="' + stroke + '" stroke-width="9"/>'
      + '<circle cx="100" cy="82" r="49" fill="' + (baked ? '#f0c56a' : '#fbebbf') + '"/>'
      + (baked ? '<g fill="#bc8a46" opacity=".5"><circle cx="70" cy="55" r="5"/><circle cx="121" cy="114" r="6"/><circle cx="139" cy="68" r="4"/></g>' : '');
  } else if (recipe === 'banana-cake') {
    food = '<path d="M41 101V67Q41 35 73 37q28-20 55 0 33-2 33 30v34Z" fill="' + base + '" stroke="' + stroke + '" stroke-width="6"/>'
      + '<path d="M41 97h120l-10 32H51Z" fill="#b77d64"/><path d="M59 103v17m20-17v17m21-17v17m21-17v17m20-17v17" stroke="#d8a387" stroke-width="5" stroke-linecap="round"/>'
      + (baked ? '<path d="M57 59q14-10 24-3m31-3q17-10 29 5" stroke="#c28c46" stroke-width="5" stroke-linecap="round" fill="none"/>' : '');
  } else {
    food = '<rect x="27" y="36" width="146" height="96" rx="26" fill="' + (baked ? '#dbbc82' : '#ece1bb') + '" stroke="#a89576" stroke-width="7"/>'
      + '<rect x="36" y="44" width="128" height="79" rx="20" fill="' + (baked ? '#e9c98d' : '#f2eacc') + '"/>'
      + '<path d="M19 64v38m162-38v38" stroke="#a89576" stroke-width="8" stroke-linecap="round"/>';
  }
  return '<svg class="kitchen-plate-art" viewBox="0 0 200 165" aria-hidden="true"><ellipse cx="100" cy="137" rx="83" ry="18" fill="#bfd0cb" opacity=".25"/>'
    + '<ellipse cx="100" cy="99" rx="96" ry="62" fill="#fffdfa" stroke="#cfdfdb" stroke-width="5"/>' + (empty ? '' : food) + '</svg>';
}

function ovenArt() {
  return '<svg class="kitchen-oven-art" viewBox="0 0 180 200" aria-hidden="true">'
    + '<rect x="12" y="15" width="156" height="170" rx="22" fill="#8ebfc2" stroke="#537f86" stroke-width="6"/>'
    + '<rect x="16" y="18" width="148" height="40" rx="16" fill="#c9e1dc"/>'
    + '<circle cx="43" cy="36" r="11" fill="#fff4d7" stroke="#7fa7aa" stroke-width="3"/><path d="M43 29v7" stroke="#d09160" stroke-width="3" stroke-linecap="round"/>'
    + '<path d="m91 26 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#e2b864"/>'
    + '<circle cx="137" cy="36" r="7" fill="#f2b590"/>'
    + '<rect x="27" y="67" width="126" height="96" rx="17" fill="#39565d" stroke="#e1f0e9" stroke-width="6"/>'
    + '<rect x="34" y="74" width="112" height="81" rx="13" fill="#f5d5a1" opacity=".7"/>'
    + '<path d="M49 83h82" stroke="#8eabad" stroke-width="7" stroke-linecap="round"/>'
    + '<path d="M28 188v6m124-6v6" stroke="#537f86" stroke-width="10" stroke-linecap="round"/>'
    + '<path class="kitchen-oven-glow" d="M42 137q13-21 24 0t24 0 24 0 24 0" stroke="#ffde7b" stroke-width="7" fill="none" opacity=".6"/>'
    + '</svg><span class="kitchen-oven-food" aria-hidden="true"></span>';
}

export function createKitchen(ctx) {
  let round = kitchenRound();
  let alive = true;
  let roundToken = 0;
  const timers = new Set();
  const room = el('section', 'pipo-room kitchen-room');
  room.setAttribute('aria-label', 'Cozinha do Pipo');
  const recipes = el('div', 'kitchen-recipes');
  const recipeButtons = [];
  const ingredientButtons = [];
  const guide = el('div', 'kitchen-guide');
  const stepIcon = el('span', 'kitchen-step-icon');
  stepIcon.setAttribute('aria-hidden', 'true');
  const instruction = el('p', 'kitchen-instruction');
  const listen = makeButton('kitchen-listen', '🔊', () => {
    if (alive) { ctx.touch?.(); ctx.say(instruction.textContent); }
  }, 'Ouvir o próximo passo da cozinha');
  guide.append(stepIcon, instruction, listen);
  const workspace = el('div', 'kitchen-workspace');
  const chef = makeButton('kitchen-chef', '<span class="kitchen-portrait"></span><span class="kitchen-chef-bubble"></span>', () => {
    if (!alive) return;
    if (round.stage === 'ready') serve();
    else { ctx.touch?.(); ctx.react('happy'); ctx.say(round.stage === 'served' ? 'Que delícia! Vamos preparar outro prato?' : 'Eu adoro cozinhar com você! ' + instruction.textContent); }
  }, 'Pipo: servir a comida pronta');
  const counter = el('div', 'kitchen-counter');
  const hint = el('div', 'kitchen-recipe-hint');
  const plate = makeButton('kitchen-plate', '<span class="kitchen-plate-drawing"></span><span class="kitchen-toppings"></span><span class="kitchen-plate-caption"></span>', null, 'Prato: colocar no forno');
  installDrag(plate, {
    onTap: () => round.stage === 'ready' ? serve() : bake(),
    onDrop: (_, x, y, under) => {
      if (!alive) return false;
      if (round.stage === 'preparing' && under.some(node => node.closest?.('.kitchen-oven'))) return bake();
      if (round.stage === 'ready' && under.some(node => node.closest?.('.kitchen-chef'))) return serve();
      return false;
    },
  });
  counter.append(hint, plate);
  const oven = makeButton('kitchen-oven', ovenArt() + '<progress class="kitchen-oven-progress" max="4" value="0" aria-label="Comida assando"></progress><span class="kitchen-oven-caption"></span>', bake, 'Colocar o prato no forno');
  const progress = oven.querySelector('progress');
  workspace.append(chef, counter, oven);
  const ingredients = el('div', 'kitchen-ingredients');
  ingredients.setAttribute('aria-label', 'Ingredientes para escolher');
  const actions = el('div', 'kitchen-actions');
  const undo = makeButton('kitchen-undo', '<span aria-hidden="true">↶</span><span>Tirar o último</span>', () => {
    if (!alive) return;
    const next = kitchenAction(round, 'undo');
    if (next === round) return;
    round = next;
    ctx.touch?.();
    ctx.audio.pop();
    draw();
    ctx.say(round.ingredients.length ? 'Pronto! Você pode escolher outro ingrediente.' : 'O prato está vazio. Escolha o que colocar!');
  }, 'Tirar o último ingrediente');
  const clear = makeButton('kitchen-clear', '<span aria-hidden="true">🔄</span><span class="kitchen-clear-label">Recomeçar</span>', () => reset(round.recipe), 'Limpar e preparar outro prato');
  actions.append(undo, clear);
  KITCHEN_RECIPES.forEach(recipe => {
    const button = makeButton('kitchen-recipe', '<span aria-hidden="true">' + recipe.emoji + '</span><span>' + recipe.name + '</span>', () => reset(recipe.id), 'Preparar ' + recipe.name.toLocaleLowerCase('pt-BR'));
    button.dataset.recipe = recipe.id;
    button.style.setProperty('--recipe-color', recipe.color);
    recipeButtons.push(button);
    recipes.appendChild(button);
  });
  KITCHEN_INGREDIENTS.forEach(ingredient => {
    const button = makeButton('kitchen-ingredient', '<span class="kitchen-ingredient-emoji" aria-hidden="true">' + ingredient.emoji + '</span><span>' + ingredient.name + '</span>', null, 'Colocar ' + ingredient.name.toLocaleLowerCase('pt-BR') + ' no prato');
    button.dataset.ingredient = ingredient.id;
    installDrag(button, {
      onTap: () => add(ingredient.id),
      onDrop: (_, x, y, under) => alive && under.some(node => node.closest?.('.kitchen-plate')) ? add(ingredient.id) : false,
    });
    ingredientButtons.push(button);
    ingredients.appendChild(button);
  });
  room.append(recipes, guide, workspace, ingredients, actions);
  ctx.body.replaceChildren(room);

  function schedule(fn, delay, token = roundToken) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (alive && token === roundToken) fn();
    }, delay);
    timers.add(timer);
  }
  function cancelTimers() {
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    roundToken++;
  }
  function reset(recipe) {
    if (!alive) return;
    cancelTimers();
    round = kitchenRound(recipe);
    ctx.touch?.();
    draw();
    ctx.say('Vamos preparar ' + recipeFor(round.recipe).name.toLocaleLowerCase('pt-BR') + '! Escolha os ingredientes e coloque no prato.');
  }
  function add(id) {
    if (!alive || round.stage !== 'preparing') return false;
    ctx.touch?.();
    const next = kitchenAction(round, 'add', id);
    if (next === round) {
      if (round.ingredients.length === MAX_INGREDIENTS) ctx.say('O prato já tem bastante! Toque no forno para assar ou tire um ingrediente.');
      return false;
    }
    round = next;
    ctx.audio.pop();
    ctx.audio.haptic?.(8);
    draw();
    ctx.burst?.(plate, ingredientFor(id).emoji, 2);
    ctx.say(ingredientFor(id).name + '! Pode colocar mais ou levar o prato ao forno.');
    return true;
  }
  function bake() {
    if (!alive) return false;
    const next = kitchenAction(round, 'bake');
    if (next === round) return false;
    round = next;
    ctx.touch?.();
    ctx.audio.pop();
    draw();
    ctx.say('O forno de faz de conta está assando! Olhe a comidinha.');
    for (let second = 1; second < 4; second++) {
      schedule(() => { progress.value = second; }, second * 1000);
    }
    schedule(() => {
      round = kitchenAction(round, 'ready');
      draw();
      ctx.audio.good();
      ctx.react('happy');
      ctx.say('Ficou pronto! Leve o prato até o Pipo ou toque nele para servir.');
    }, BAKE_TIME);
    return true;
  }
  function serve() {
    if (!alive) return false;
    const next = kitchenAction(round, 'serve');
    if (next === round) return false;
    // Marcar antes do callback também protege de um segundo toque no mesmo frame.
    round = next;
    ctx.touch?.();
    draw();
    drawPortrait('eat');
    schedule(() => drawPortrait('happy'), 850);
    ctx.audio.good();
    ctx.audio.haptic?.(20);
    ctx.react('happy');
    ctx.burst?.(chef, '💛', 7);
    const recipe = recipeFor(round.recipe);
    ctx.serve({ recipe: recipe.id, name: recipe.name, emoji: recipe.emoji, ingredients: [...round.ingredients] });
    if (alive) ctx.say('Hum, que delícia! Adorei cozinhar com você! Vamos fazer outro prato?');
    return true;
  }
  function drawPortrait(mood) {
    const state = ctx.state();
    chef.querySelector('.kitchen-portrait').innerHTML = pipoPortrait({
      outfit: state.outfit, outfitColor: state.outfitColor, accessory: state.accessory, mood,
    });
  }
  function draw() {
    const focused = document.activeElement;
    const recipe = recipeFor(round.recipe);
    const baked = round.stage === 'ready' || round.stage === 'served';
    const count = round.ingredients.length;
    room.dataset.stage = round.stage;
    room.style.setProperty('--recipe-color', recipe.color);
    recipeButtons.forEach(button => {
      const selected = button.dataset.recipe === round.recipe;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    ingredientButtons.forEach(button => { button.disabled = round.stage !== 'preparing'; });
    undo.disabled = round.stage !== 'preparing' || !count;
    plate.disabled = round.stage === 'baking' || round.stage === 'served' || !count;
    oven.disabled = round.stage !== 'preparing' || !count;
    progress.hidden = round.stage !== 'baking';
    progress.value = round.stage === 'baking' ? 0 : baked ? 4 : 0;
    drawPortrait(round.stage === 'served' || round.stage === 'ready' ? 'happy' : round.stage === 'baking' ? 'wait' : 'idle');
    chef.querySelector('.kitchen-chef-bubble').textContent = round.stage === 'served' ? 'Que delícia! 💛' : round.stage === 'ready' ? 'Para mim? 😋' : 'Vamos cozinhar?';
    hint.innerHTML = '<span class="kitchen-recipe-hint-label">Ideias para ' + recipe.name.toLocaleLowerCase('pt-BR') + '</span><span aria-hidden="true">'
      + recipe.suggestions.map(id => '<i>' + ingredientFor(id).emoji + '</i>').join('') + '</span>';
    plate.querySelector('.kitchen-plate-drawing').innerHTML = plateArt(round.recipe, baked, round.stage === 'served' || round.stage === 'baking');
    plate.querySelector('.kitchen-toppings').innerHTML = round.stage === 'served' || round.stage === 'baking' ? '' : round.ingredients.map((id, i) => '<span class="kitchen-topping" style="--ingredient-index:' + i + ';--ingredient-count:' + count + '" aria-hidden="true">' + ingredientFor(id).emoji + '</span>').join('');
    plate.querySelector('.kitchen-plate-caption').textContent = round.stage === 'served' ? 'Prato vazio 💛' : round.stage === 'ready' ? 'Servir ao Pipo →' : round.stage === 'baking' ? 'Assando…' : count ? 'Levar ao forno →' : 'Coloque aqui';
    plate.setAttribute('aria-label', round.stage === 'ready' ? 'Servir ' + recipe.name.toLocaleLowerCase('pt-BR') + ' ao Pipo' : 'Prato com ' + count + ' ingredientes: colocar no forno');
    oven.querySelector('.kitchen-oven-food').innerHTML = round.stage === 'baking' ? recipe.emoji : '';
    oven.querySelector('.kitchen-oven-caption').textContent = round.stage === 'baking' ? 'Assando…' : baked ? 'Prontinho! ✨' : 'Assar';
    clear.querySelector('.kitchen-clear-label').textContent = round.stage === 'served' ? 'Outro prato' : round.stage === 'baking' ? 'Recomeçar' : 'Limpar prato';
    const steps = {
      preparing: [count ? '👩‍🍳' : '🥣', count ? 'Pode colocar mais ingredientes ou levar o prato ao forno.' : 'Escolha os ingredientes e coloque no prato.'],
      baking: ['✨', 'O forno de faz de conta está assando a comidinha!'],
      ready: ['😋', 'Prontinho! Leve o prato até o Pipo ou toque nele para servir.'],
      served: ['💛', 'Pipo adorou! Vamos preparar outro prato?'],
    };
    stepIcon.textContent = steps[round.stage][0];
    instruction.textContent = steps[round.stage][1];
    if (room.contains(focused) && focused.disabled) chef.focus?.();
  }
  draw();
  ctx.say('Vamos cozinhar para o Pipo! Escolha os ingredientes e coloque no prato.');
  return {
    destroy() {
      alive = false;
      cancelTimers();
      room.remove();
    },
  };
}
