// Som do jardim: efeitos sintetizados (sem arquivos), música de fundo e a voz do navegador.

const LETTER_NAMES = {
  A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i', J: 'jota', K: 'cá', L: 'éle', M: 'ême',
  N: 'êne', O: 'ó', P: 'pê', Q: 'quê', R: 'érre', S: 'ésse', T: 'tê', U: 'u', V: 'vê', W: 'dáblio', X: 'xis', Y: 'ípsilon', Z: 'zê', Ç: 'cê cedilha',
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// Escala de dó maior a partir do dó central (usada por note(), como antes).
const SCALE = [60, 62, 64, 65, 67, 69, 71, 72];
// Xilofone: pentatônica, qualquer combinação soa bonita.
const XYLO = [72, 74, 76, 79, 81];

// Uma canção de ninar curta, em loop: [tempo em batidas, nota MIDI, duração].
const MELODY = [
  [[0, 76, 1], [1, 79, 1], [2, 84, 1.5], [3.5, 79, 0.5]],
  [[0, 81, 1], [1, 79, 1], [2, 76, 2]],
  [[0, 77, 1], [1, 81, 1], [2, 79, 1], [3, 77, 1]],
  [[0, 74, 1.5], [1.5, 76, 0.5], [2, 79, 2]],
  [[0, 76, 1], [1, 79, 1], [2, 84, 1], [3, 86, 1]],
  [[0, 84, 1], [1, 81, 1], [2, 76, 2]],
  [[0, 77, 1], [1, 76, 1], [2, 74, 1], [3, 71, 1]],
  [[0, 72, 3]],
];
const CHORDS = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [48, 60, 64, 67]];

// ---- Vozes do aparelho ----
// Vozes "divertidas" ou antigas que soam robóticas (iOS Eloquence, eSpeak, novidades da Apple).
const ROBOTIC = /eloquence|espeak|\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;
const PREMIUM = /natural|neural|online|enhanced|premium|aprimorad|network|wavenet|studio/i;
export const VOICE_RATES = { slow: 0.82, normal: 0.95, fast: 1.08 };
export const VOICE_PITCHES = { normal: 1, high: 1.12, higher: 1.25 };

function cleanVoiceName(name = '') {
  return name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s*[-–]\s*Portugu[eê]s.*$/i, '')
    .replace(/\s*[-–]\s*Portuguese.*$/i, '')
    .replace(/\s*\((Portugu[eê]s|Portuguese)[^()]*(\([^)]*\))?[^)]*\)/i, '')
    .trim() || name;
}

// Descreve uma voz em português (ou devolve null). Pura: testada com listas de iPhone, Android e computador.
export function describeVoice(v) {
  if (!v) return null;
  const lang = String(v.lang || '').replace(/_/g, '-');
  if (!/^pt\b/i.test(lang) && !/^pt$/i.test(lang)) return null;
  const text = (v.name || '') + ' ' + (v.voiceURI || '');
  const br = /^pt-BR/i.test(lang) || /brasil|brazil/i.test(v.name || '');
  const robotic = ROBOTIC.test(text);
  const premium = PREMIUM.test(text) || v.localService === false;
  const score = (br ? 100 : 40) + (premium ? 20 : 0) + (/luciana|francisca|thalita|google/i.test(v.name || '') ? 6 : 0) + (v.default ? 2 : 0) - (robotic ? 80 : 0);
  return { uri: v.voiceURI || v.name, name: cleanVoiceName(v.name), region: br ? 'Brasil' : 'Portugal', premium, robotic, score, voice: v };
}

// Vozes em português da melhor para a pior. As robóticas só aparecem se não houver outra.
export function rankVoices(voices = []) {
  const all = voices.map(describeVoice).filter(Boolean);
  const good = all.filter(d => !d.robotic);
  const seen = new Set();
  return (good.length ? good : all)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'))
    .filter(d => !seen.has(d.uri) && seen.add(d.uri));
}

export class GardenAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true; // efeitos
    this.voice = true;
    this.musicOn = true;
    this.voices = [];
    this.ranked = [];
    this.prefs = { uri: '', rate: 'normal', pitch: 'normal' };
    this.onVoicesChanged = null;
    this.nodes = new Set();
    this.musicHolds = new Set();
    this.night = false;
    this.speaking = false;
    this.speechToken = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();
      try { speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices()); } catch { /* navegador antigo */ }
    }
  }

  // notify=false quando quem pede a lista é a própria tela (evita redesenhar em laço).
  refreshVoices(notify = true) {
    try { this.voices = speechSynthesis.getVoices() || []; } catch { this.voices = []; }
    this.ranked = rankVoices(this.voices);
    if (notify) this.onVoicesChanged?.();
  }

  // Vozes em português disponíveis neste aparelho (a primeira é a automática).
  listVoices() {
    // Alguns navegadores (iOS) só entregam as vozes depois do primeiro pedido.
    if (!this.voices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) this.refreshVoices(false);
    return this.ranked;
  }
  setVoicePrefs({ uri = '', rate = 'normal', pitch = 'normal' } = {}) {
    this.prefs = { uri: String(uri || ''), rate: rate in VOICE_RATES ? rate : 'normal', pitch: pitch in VOICE_PITCHES ? pitch : 'normal' };
  }
  // A voz escolhida pela família; se ela não existir neste aparelho, a melhor automática.
  currentVoice(uri = this.prefs.uri) {
    const list = this.listVoices();
    return (uri && list.find(d => d.uri === uri)) || list[0] || null;
  }

  async activate() {
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      if (!this.ctx) this.buildGraph(new A());
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.updateMusic();
    } catch { /* sem áudio: o jogo continua */ }
  }

  buildGraph(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 0.6);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  // Um toque de baqueta: fundamental + parcial agudo que some rápido (timbre de marimba).
  mallet(freq, { at = 0, dur = 0.7, gain = 0.2, bus = this.sfx, bright = 0.35 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(bus);
    const parts = [[1, 1, 'sine'], [4, bright, 'sine'], [2, 0.12, 'triangle']];
    for (const [mult, amp, type] of parts) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(amp, t);
      if (mult > 1) g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.25);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      if (bus === this.sfx) this.nodes.add(osc);
      osc.onended = () => { this.nodes.delete(osc); try { osc.disconnect(); g.disconnect(); } catch { /* ok */ } };
    }
    setTimeout(() => { try { out.disconnect(); } catch { /* ok */ } }, (at + dur + 0.3) * 1000);
  }

  sweep(from, to, { at = 0, dur = 0.12, gain = 0.16, type = 'sine' } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    this.nodes.add(osc);
    osc.onended = () => { this.nodes.delete(osc); try { osc.disconnect(); g.disconnect(); } catch { /* ok */ } };
  }

  hiss({ at = 0, dur = 0.3, gain = 0.12, type = 'bandpass', from = 800, to = 2400, q = 1.2 } = {}) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t, Math.random() * 0.2);
    src.stop(t + dur + 0.02);
    this.nodes.add(src);
    src.onended = () => { this.nodes.delete(src); try { src.disconnect(); f.disconnect(); g.disconnect(); } catch { /* ok */ } };
  }

  // ---- Efeitos com nome (o jogo só usa estes) ----
  note(index = 0, duration = 0.5, delay = 0) { if (this.enabled) this.mallet(midi(SCALE[((index % 8) + 8) % 8]), { at: delay, dur: Math.max(0.3, duration * 2) }); }
  xylo(index) { if (this.enabled) this.mallet(midi(XYLO[index % XYLO.length]), { dur: 1.1, gain: 0.24, bright: 0.45 }); }
  tap() { if (this.enabled) this.sweep(620, 420, { dur: 0.09, gain: 0.12 }); }
  pop() { if (!this.enabled) return; this.sweep(380, 1300, { dur: 0.07, gain: 0.16 }); this.hiss({ dur: 0.06, gain: 0.05, type: 'highpass', from: 3000, to: 5000 }); }
  good() { if (!this.enabled) return; this.mallet(midi(79), { dur: 0.5, gain: 0.18 }); this.mallet(midi(84), { at: 0.09, dur: 0.8, gain: 0.2 }); }
  chime() { this.good(); }
  soft() { if (this.enabled) this.sweep(300, 220, { dur: 0.22, gain: 0.08, type: 'triangle' }); }
  sparkle() { if (!this.enabled) return; [88, 91, 93, 96].forEach((n, i) => this.mallet(midi(n), { at: i * 0.05, dur: 0.4, gain: 0.07, bright: 0.2 })); }
  fanfare() {
    if (!this.enabled) return;
    [72, 76, 79].forEach((n, i) => this.mallet(midi(n), { at: i * 0.11, dur: 0.6, gain: 0.18 }));
    this.mallet(midi(84), { at: 0.33, dur: 1.4, gain: 0.22 });
    this.mallet(midi(76), { at: 0.33, dur: 1.4, gain: 0.1 });
    [96, 100, 103].forEach((n, i) => this.mallet(midi(n), { at: 0.5 + i * 0.06, dur: 0.5, gain: 0.05, bright: 0.1 }));
  }
  munch() { if (!this.enabled) return; for (let i = 0; i < 3; i++) this.hiss({ at: i * 0.17, dur: 0.09, gain: 0.1, type: 'lowpass', from: 1400, to: 500, q: 0.7 }); }
  splash() { if (this.enabled) this.hiss({ dur: 0.9, gain: 0.14, type: 'bandpass', from: 3000, to: 700, q: 0.8 }); }
  whoosh() { if (this.enabled) this.hiss({ dur: 0.35, gain: 0.07, type: 'bandpass', from: 500, to: 2600, q: 1.5 }); }
  scrub() { if (this.enabled) this.hiss({ dur: 0.12, gain: 0.05, type: 'bandpass', from: 2400, to: 3400, q: 2 }); }
  yawn() { if (this.enabled) this.sweep(520, 260, { dur: 0.9, gain: 0.06, type: 'triangle' }); }

  haptic(pattern = 12) {
    if (!this.enabled) return;
    try { navigator.vibrate?.(pattern); } catch { /* sem vibração */ }
  }

  // ---- Música de fundo ----
  setMusic(on) { this.musicOn = !!on; this.updateMusic(); }
  holdMusic(reason, held) { if (held) this.musicHolds.add(reason); else this.musicHolds.delete(reason); this.updateMusic(); }
  setNight(night) { this.night = !!night; this.updateMusic(); }

  musicLevel() { return (this.night ? 0.55 : 1) * (this.speaking ? 0.35 : 1); }

  updateMusic() {
    if (!this.ctx) return;
    const want = this.musicOn && !this.musicHolds.size && this.ready;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(want ? 0.3 * this.musicLevel() : 0, t, want ? 0.6 : 0.25);
    if (want && !this.musicTimer) {
      this.bar = 0;
      this.nextBar = t + 0.15;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 120);
      this.scheduleMusic();
    } else if (!want && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  scheduleMusic() {
    if (!this.ready) return;
    const beat = this.night ? 0.95 : 0.72;
    while (this.nextBar < this.ctx.currentTime + 0.8) {
      const at = this.nextBar;
      const i = this.bar % MELODY.length;
      const delay = at - this.ctx.currentTime;
      for (const [b, n, d] of MELODY[i]) {
        if (this.night && b % 1) continue; // de noite, só as notas principais
        this.mallet(midi(n), { at: delay + b * beat, dur: Math.min(2.4, d * beat * 1.6), gain: 0.16, bus: this.musicBus, bright: 0.18 });
      }
      this.pad(CHORDS[i], at, beat * 4);
      this.nextBar += beat * 4;
      this.bar++;
    }
  }

  pad(notes, at, length) {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05, at + length * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.4);
    f.connect(g);
    g.connect(this.musicBus);
    notes.forEach((n, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = midi(n);
      osc.detune.value = (idx % 2 ? 4 : -4);
      const og = this.ctx.createGain();
      og.gain.value = idx === 0 ? 0.9 : 0.35;
      osc.connect(og);
      og.connect(f);
      osc.start(at);
      osc.stop(at + length + 0.5);
      osc.onended = () => { try { osc.disconnect(); og.disconnect(); } catch { /* ok */ } };
    });
    setTimeout(() => { try { f.disconnect(); g.disconnect(); } catch { /* ok */ } }, (at - this.ctx.currentTime + length + 1) * 1000);
  }

  // ---- Voz ----
  say(text, onEnd, options = {}) {
    if ((!this.voice && !options.force) || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) { onEnd?.(); return; }
    try {
      const token = ++this.speechToken;
      const speak = () => {
        if (token !== this.speechToken) return;
        const u = new SpeechSynthesisUtterance(text);
        const chosen = this.currentVoice(options.uri ?? this.prefs.uri);
        u.lang = String(chosen?.voice.lang || 'pt-BR').replace(/_/g, '-');
        u.rate = VOICE_RATES[options.rate || this.prefs.rate] || VOICE_RATES.normal;
        u.pitch = VOICE_PITCHES[options.pitch || this.prefs.pitch] || 1;
        u.volume = 1;
        if (chosen) u.voice = chosen.voice;
        const done = () => {
          if (token !== this.speechToken) return;
          this.speaking = false;
          this.updateMusic();
          onEnd?.();
        };
        u.onstart = () => { this.speaking = true; this.updateMusic(); };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      };
      if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
        setTimeout(speak, 60);
      } else speak();
    } catch { onEnd?.(); }
  }

  letter(l) { this.say(LETTER_NAMES[l] || l); }

  // Para o cantinho da família ouvir uma voz antes de escolher (toca mesmo com a voz desligada).
  preview(text, options = {}) { this.say(text, null, { ...options, force: true }); }

  stopSpeech() {
    this.speechToken++;
    this.speaking = false;
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ok */ }
    this.updateMusic();
  }

  // Para a fala e os efeitos em andamento (a música continua, se ligada).
  stop() {
    this.stopSpeech();
    for (const node of this.nodes) { try { node.stop(); } catch { /* já parado */ } }
    this.nodes.clear();
  }
}
