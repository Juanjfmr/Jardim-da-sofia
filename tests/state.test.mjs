import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, sanitizeState, sanitizeName, care, reward, tick, countingRound, pickCarrot, letterRound, pickLetter,
  unlockedAccessories, nextAccessory, currentNeed, addPlayTime, timeIsUp, todayKey, wordsFor, colorRounds, colorsForLevel, shapesForLevel,
} from '../src/state.js';

test('um save quebrado ou adulterado não impede a brincadeira', () => {
  const s = sanitizeState({ food: Infinity, clean: -50, joy: 1000, level: 8, rewards: -10, plants: [1, 7, -1, 'x'], accessory: 'crown', completed: { letters: NaN, count: 1 }, limit: 7, article: 'xx', playDay: 'ontem', music: 'sim' });
  assert.equal(s.food, 82);
  assert.equal(s.clean, 25);
  assert.equal(s.joy, 100);
  assert.equal(s.level, 1);
  assert.deepEqual(s.plants, [1, 3, 0, 0]);
  assert.equal(s.accessory, 'none');
  assert.equal(s.completed.count, 1);
  assert.equal(s.limit, 0);
  assert.equal(s.article, 'da');
  assert.equal(s.playDay, '');
  assert.equal(s.music, true);
  assert.deepEqual(sanitizeState(null), initialState());
});

test('um save antigo (v1) continua valendo e ganha os ajustes novos', () => {
  const old = { version: 1, food: 60, clean: 70, joy: 80, energy: 90, sleeping: false, level: 2, sound: true, voice: false, rewards: 9, accessory: 'bow', completed: { letters: 3 }, plants: [3, 2, 1, 0], visits: 4 };
  const s = sanitizeState(old);
  assert.equal(s.name, 'Sofia');
  assert.equal(s.music, true);
  assert.equal(s.accessory, 'bow');
  assert.equal(s.voice, false);
  assert.deepEqual(s.plants, [3, 2, 1, 0]);
});

test('o nome da criança é limpo, curto e pode ficar vazio', () => {
  assert.equal(sanitizeName('  Ana   Júlia!! 3 '), 'Ana Júlia');
  assert.equal(sanitizeName('<b>João</b>'), 'bJoãob');
  assert.equal(sanitizeName('Maria-Clara D\'Ávila'), 'Maria-Clara D\'Áv');
  assert.equal(sanitizeName(''), '');
  assert.equal(sanitizeName(42), 'Sofia');
  assert.equal(sanitizeState({ name: '' }).name, '');
  assert.equal(sanitizeState({ name: 'Pedro', article: 'do' }).article, 'do');
});

test('cuidados fazem diferença e as necessidades têm limite acolhedor', () => {
  let s = initialState();
  s = care(s, 'eat');
  assert.equal(s.food, 100);
  s = care({ ...s, clean: 35 }, 'bath');
  assert.equal(s.clean, 100);
  s = care({ ...s, joy: 30 }, 'play');
  assert.equal(s.joy, 100);
  s = tick(s, 999999);
  assert.equal(s.food, 25);
  assert.equal(s.energy, 25);
  assert.equal(s.joy, 25);
  assert.equal(s.clean, 25);
  s = care(s, 'sleep');
  assert.equal(s.sleeping, true);
  assert.equal(tick(s, 100).food, s.food);
  s = care(s, 'wake');
  assert.equal(s.sleeping, false);
  assert.equal(s.energy, 43);
});

test('o Pipo pede uma coisa por vez, a mais urgente, e nunca enquanto dorme', () => {
  const s = initialState();
  assert.equal(currentNeed(s), null);
  assert.equal(currentNeed({ ...s, food: 40 }), 'feed');
  assert.equal(currentNeed({ ...s, food: 40, clean: 30 }), 'bath');
  assert.equal(currentNeed({ ...s, joy: 26 }), 'play');
  assert.equal(currentNeed({ ...s, energy: 30, sleeping: true }), null);
  // De cheio até pedir comida leva bastante tempo de jogo (mais de 15 minutos).
  let t = s;
  let seconds = 0;
  while (!currentNeed(t)) { t = tick(t, 10); seconds += 10; }
  assert.ok(seconds > 15 * 60, 'pediu algo cedo demais: ' + seconds + 's');
});

test('colheita termina na quantidade exata e rejeita toques repetidos', () => {
  let r = countingRound(2, () => 0.8);
  assert.equal(r.target, 5);
  r = pickCarrot(r, 0);
  assert.equal(pickCarrot(r, 0), r);
  assert.equal(pickCarrot(r, -1), r);
  for (let i = 1; i < 5; i++) r = pickCarrot(r, i);
  assert.equal(r.done, true);
  assert.equal(r.picked.length, 5);
  assert.equal(pickCarrot(r, 5), r);
});

test('todas as dificuldades geram quantidades válidas com peças suficientes', () => {
  for (const [level, max] of [[1, 3], [2, 5], [3, 10]]) {
    for (let n = 0; n < 100; n++) {
      const r = countingRound(level, () => n / 100);
      assert.ok(r.target >= 1 && r.target <= max);
      assert.ok(r.total >= r.target);
    }
  }
});

test('encaixe aceita a letra certa e trata letras repetidas como peças distintas', () => {
  let r = letterRound('PIPO', () => 0.3);
  const wrong = r.tiles.find(t => t.letter === 'O');
  assert.equal(pickLetter(r, wrong.id).accepted, false);
  assert.equal(r.placed.length, 0);
  for (const expected of 'PIPO') {
    const tile = r.tiles.find(t => t.letter === expected && !t.used);
    const out = pickLetter(r, tile.id);
    assert.equal(out.accepted, true);
    r = out.round;
    assert.equal(pickLetter(r, tile.id).accepted, false);
  }
  assert.equal(r.done, true);
  assert.equal(r.placed.join(''), 'PIPO');
});

test('palavras: o nome vem primeiro, com figura, e o nível 1 usa palavras curtas', () => {
  const s = initialState();
  const words = wordsFor(s);
  assert.deepEqual(words[0], { word: 'SOFIA', pic: '⭐', isName: true });
  assert.ok(words.slice(1).every(w => w.word.length <= 4 && w.pic));
  assert.ok(wordsFor({ ...s, level: 3 }).some(w => w.word === 'BOLO'));
  assert.equal(wordsFor({ ...s, name: 'João' })[0].word, 'JOÃO');
  assert.equal(wordsFor({ ...s, name: 'Ana Júlia' })[0].isName, undefined, 'nome com espaço não vira peças');
  assert.equal(wordsFor({ ...s, name: '' })[0].word, 'PIPO');
  assert.equal(wordsFor({ ...s, name: 'Pipo' }).filter(w => w.word === 'PIPO').length, 1);
});

test('cores e formas crescem com o desafio', () => {
  assert.deepEqual([1, 2, 3].map(l => colorsForLevel(l).length), [3, 4, 6]);
  assert.deepEqual([1, 2, 3].map(l => colorRounds(l, () => 0.5).rounds.length), [3, 4, 4]);
  for (const l of [1, 2, 3]) {
    const { palette, rounds } = colorRounds(l);
    assert.equal(new Set(rounds.map(c => c.id)).size, rounds.length, 'sem cor repetida na rodada');
    assert.ok(rounds.every(c => palette.includes(c)));
  }
  assert.deepEqual([1, 2, 3].map(l => shapesForLevel(l).length), [3, 4, 5]);
  assert.ok(shapesForLevel(2).includes('star'));
});

test('descobertas persistem e liberam enfeites sem depender de tempo offline', () => {
  let s = initialState();
  for (let i = 0; i < 8; i++) s = reward(s, 'letters');
  assert.equal(s.completed.letters, 8);
  assert.deepEqual(unlockedAccessories(s), ['none', 'flower', 'bow']);
  assert.equal(nextAccessory(s).id, 'crown');
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s))), s);
  assert.equal(sanitizeState({ ...s, food: 82, updatedAt: 0 }).food, 82);
  assert.equal(nextAccessory({ ...s, rewards: 99 }), null);
});

test('tempo de tela: conta por dia, só com limite ligado, e recomeça no dia seguinte', () => {
  let s = { ...initialState(), limit: 15 };
  const day = '2026-10-10';
  for (let i = 0; i < 449; i++) s = addPlayTime(s, 2, day);
  assert.equal(timeIsUp(s, day), false);
  s = addPlayTime(s, 2, day);
  assert.equal(s.playSeconds, 900);
  assert.equal(timeIsUp(s, day), true);
  assert.equal(timeIsUp(s, '2026-10-11'), false, 'outro dia, outro tempo');
  assert.equal(addPlayTime(s, 2, '2026-10-11').playSeconds, 2);
  assert.equal(timeIsUp({ ...s, limit: 0 }, day), false);
  assert.match(todayKey(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('preferências de voz: só valores conhecidos, e voz vazia quer dizer automática', () => {
  const s = initialState();
  assert.equal(s.voiceURI, '');
  assert.equal(s.voiceRate, 'normal');
  assert.equal(s.voicePitch, 'normal');
  const t = sanitizeState({ voiceURI: 'com.apple.voice.enhanced.pt-BR.Luciana', voiceRate: 'slow', voicePitch: 'higher' });
  assert.deepEqual([t.voiceURI, t.voiceRate, t.voicePitch], ['com.apple.voice.enhanced.pt-BR.Luciana', 'slow', 'higher']);
  const u = sanitizeState({ voiceURI: 42, voiceRate: 'turbo', voicePitch: 2 });
  assert.deepEqual([u.voiceURI, u.voiceRate, u.voicePitch], ['', 'normal', 'normal']);
  assert.equal(sanitizeState({ voiceURI: 'x'.repeat(999) }).voiceURI.length, 300);
});
