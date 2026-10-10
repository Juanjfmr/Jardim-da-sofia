import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { rankVoices, VOICE_RATES, VOICE_PITCHES } from '../dist/audio.js';

// Listas no formato que cada sistema entrega em speechSynthesis.getVoices().
const IOS = [
  { name: 'Eddy (Português (Brasil))', lang: 'pt-BR', voiceURI: 'com.apple.eloquence.pt-BR.Eddy', localService: true },
  { name: 'Grandma (Português (Brasil))', lang: 'pt-BR', voiceURI: 'com.apple.eloquence.pt-BR.Grandma', localService: true },
  { name: 'Luciana', lang: 'pt-BR', voiceURI: 'com.apple.voice.compact.pt-BR.Luciana', localService: true },
  { name: 'Luciana (Aprimorada)', lang: 'pt-BR', voiceURI: 'com.apple.voice.enhanced.pt-BR.Luciana', localService: true },
  { name: 'Joana', lang: 'pt-PT', voiceURI: 'com.apple.voice.compact.pt-PT.Joana', localService: true },
  { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha', localService: true },
];
const ANDROID = [
  { name: 'Português (Brasil)', lang: 'pt_BR', voiceURI: 'pt-br-x-afs-local', localService: true },
  { name: 'Português (Brasil) 2', lang: 'pt_BR', voiceURI: 'pt-br-x-ptd-network', localService: false },
  { name: 'Português (Portugal)', lang: 'pt_PT', voiceURI: 'pt-pt-x-jmn-local', localService: true },
];
const WINDOWS_CHROME = [
  { name: 'Microsoft Maria - Portuguese (Brazil)', lang: 'pt-BR', voiceURI: 'Microsoft Maria - Portuguese (Brazil)', localService: true, default: true },
  { name: 'Google português do Brasil', lang: 'pt-BR', voiceURI: 'Google português do Brasil', localService: false },
  { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English', localService: false },
];

test('ranking de vozes: alta qualidade do Brasil primeiro, robóticas fora, Portugal por último', () => {
  const ios = rankVoices(IOS);
  assert.deepEqual(ios.map(v => v.name), ['Luciana (Aprimorada)', 'Luciana', 'Joana']);
  assert.equal(ios[0].premium, true);
  assert.equal(ios.at(-1).region, 'Portugal');
  assert.ok(!ios.some(v => /Eddy|Grandma/.test(v.name)), 'vozes Eloquence (robóticas) não aparecem');

  const android = rankVoices(ANDROID);
  assert.equal(android[0].uri, 'pt-br-x-ptd-network', 'voz de rede (melhor) vem primeiro');
  assert.equal(android.at(-1).region, 'Portugal');
  assert.ok(android.every(v => v.voice), 'lang com sublinhado (pt_BR) é aceito');

  const win = rankVoices(WINDOWS_CHROME);
  assert.deepEqual(win.map(v => v.name), ['Google português do Brasil', 'Maria']);

  assert.deepEqual(rankVoices([{ name: 'Samantha', lang: 'en-US' }]), [], 'sem voz em português, lista vazia');
  const onlyRobotic = rankVoices(IOS.slice(0, 2));
  assert.equal(onlyRobotic.length, 2, 'se só houver robóticas, elas ainda aparecem');
  assert.equal(rankVoices([...IOS, ...IOS]).length, 3, 'sem repetidas');
});

test('cantinho da família: ouvir, escolher voz, velocidade e tom, e o Pipo passa a falar assim', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const { window } = parseHTML(html);
  globalThis.window = window;
  globalThis.document = window.document;
  const saved = new Map();
  globalThis.localStorage = { getItem: k => saved.get(k) || null, setItem: (k, v) => saved.set(k, v) };
  const voices = [...IOS];
  const spoken = [];
  const listeners = [];
  const synth = { speaking: false, pending: false, getVoices: () => voices, speak: u => spoken.push(u), cancel() {}, addEventListener: (_, cb) => listeners.push(cb) };
  window.speechSynthesis = synth;
  globalThis.speechSynthesis = synth;
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const intervals = [];
  const originalInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, t) => { const id = originalInterval(fn, t); intervals.push(id); id.unref(); return id; };
  const oldWarn = console.warn;
  console.warn = () => {};
  try {
    await import('../dist/game.js');
    const $ = id => document.getElementById(id);
    const game = window.jardimSofia;
    const last = () => spoken.at(-1);
    $('start-btn').click();
    assert.equal(last().voice.name, 'Luciana (Aprimorada)', 'automática escolhe a melhor voz');
    assert.equal(last().pitch, 1, 'tom natural por padrão (sem distorcer a voz)');
    assert.equal(last().rate, VOICE_RATES.normal);

    $('parent-btn').click();
    const rows = () => [...document.querySelectorAll('#voice-list .voice-row')];
    assert.equal(rows().length, 4, 'Automática + 3 vozes em português');
    assert.ok(rows()[0].classList.contains('selected'));
    assert.match(rows()[0].textContent, /Automática/);

    // Ouvir não muda a escolha.
    rows()[3].querySelector('.voice-hear').click();
    assert.equal(last().voice.name, 'Joana');
    assert.match(last().text, /Pipo/);
    assert.equal(game.getState().voiceURI, '');

    // Escolher a Luciana comum.
    rows()[2].querySelector('.voice-pick').click();
    assert.equal(game.getState().voiceURI, 'com.apple.voice.compact.pt-BR.Luciana');
    assert.ok(rows()[2].classList.contains('selected'));
    assert.equal(last().voice.name, 'Luciana');

    document.querySelector('#rate-options [data-value="slow"]').click();
    document.querySelector('#pitch-options [data-value="high"]').click();
    assert.equal(game.getState().voiceRate, 'slow');
    assert.equal(game.getState().voicePitch, 'high');
    assert.equal(last().rate, VOICE_RATES.slow);
    assert.equal(last().pitch, VOICE_PITCHES.high);

    // Com a voz do Pipo desligada, o botão de ouvir ainda funciona para testar.
    $('voice-setting').checked = false;
    $('voice-setting').dispatchEvent(new window.Event('change'));
    const before = spoken.length;
    rows()[1].querySelector('.voice-hear').click();
    assert.equal(spoken.length, before + 1);
    $('voice-setting').checked = true;
    $('voice-setting').dispatchEvent(new window.Event('change'));

    $('parent-done').click();
    $('repeat-prompt').click();
    assert.equal(last().voice.name, 'Luciana', 'o Pipo fala com a voz escolhida');
    assert.equal(last().rate, VOICE_RATES.slow);
    const persisted = JSON.parse(saved.get('jardim-sofia-v1'));
    assert.equal(persisted.voiceURI, 'com.apple.voice.compact.pt-BR.Luciana');
    assert.equal(persisted.voiceRate, 'slow');

    // Aparelho sem voz em português: aviso e instruções abertas.
    $('parent-btn').click();
    voices.splice(0, voices.length, { name: 'Samantha', lang: 'en-US', voiceURI: 'x' });
    listeners.forEach(cb => cb());
    assert.ok(document.querySelector('#voice-list .voice-empty'));
    assert.equal($('voice-help').open, true);
    assert.match($('voice-help-body').textContent, /Conteúdo Falado/);
    assert.match($('voice-help-body').textContent, /Serviços de fala do Google/);
    $('parent-done').click();
  } finally {
    intervals.forEach(clearInterval);
    globalThis.setInterval = originalInterval;
    console.warn = oldWarn;
  }
});
