// Audio (skill `audio-design`): buses, volumen en dB, ducking, variación de SFX y música adaptativa
// por capas con cambios cuantizados al compás. Todo sintetizado con WebAudio (sin archivos).
import { settings } from './settings.js';

let ctx = null, master, limiter, buses = {};
let unlocked = false;

const sliderToDb = (s) => (s <= 0.001 ? -Infinity : -48 + 48 * s);   // 0..1 -> dB
const dbToGain = (db) => (db === -Infinity ? 0 : 10 ** (db / 20));

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return null; }
  limiter = ctx.createDynamicsCompressor();           // limitador de seguridad en Master
  limiter.threshold.value = -8; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.2;
  master = ctx.createGain();
  master.connect(limiter).connect(ctx.destination);
  for (const n of ['music', 'sfx']) { buses[n] = ctx.createGain(); buses[n].connect(master); }
  applyVolumes();
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  const v = settings().volume;
  master.gain.value = dbToGain(sliderToDb(v.master));
  buses.sfx.gain.value = dbToGain(sliderToDb(v.sfx));
  buses.music.baseGain = dbToGain(sliderToDb(v.music));
  if (!duckActive) buses.music.gain.value = buses.music.baseGain;
}

let duckActive = false;
export function duckMusic(ms = 700, db = -9) {
  if (!ctx || !buses.music) return;
  const g = buses.music.gain, t = ctx.currentTime, base = buses.music.baseGain ?? 0.5;
  duckActive = true;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(base * dbToGain(db), t + 0.05);          // ataque rápido
  g.linearRampToValueAtTime(base, t + 0.05 + ms / 1000);              // liberación lenta
  setTimeout(() => { duckActive = false; }, ms + 80);
}

// ---------- SFX ----------
function tone(f0, f1, dur, type = 'square', vol = 0.15, delay = 0, vary = true) {
  const c = ensure(); if (!c) return;
  const k = vary ? 0.94 + Math.random() * 0.12 : 1;     // variación de tono ±6% (evita el "efecto ametralladora")
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0 * k, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * k), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(buses.sfx);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.2, freq = 1800, delay = 0, bus = 'sfx', type = 'lowpass') {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq * (0.9 + Math.random() * 0.2);
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(buses[bus]);
  s.start(t);
}

export const sfx = {
  unlock() { if (ensure()) unlocked = true; },
  swing() { noise(0.07, 0.08, 4000); },
  punch() { noise(0.09, 0.3, 1500); tone(190, 60, 0.1, 'square', 0.18); },
  kick() { noise(0.12, 0.35, 1200); tone(140, 45, 0.16, 'square', 0.22); },
  heavy() { noise(0.2, 0.45, 900); tone(110, 30, 0.3, 'sawtooth', 0.28); },
  block() { tone(1100, 500, 0.07, 'triangle', 0.2); noise(0.04, 0.1, 5000); },
  blast() { tone(280, 900, 0.22, 'sawtooth', 0.1); tone(560, 1200, 0.18, 'sine', 0.08); },
  explode() { noise(0.25, 0.35, 1000); tone(160, 40, 0.25, 'sawtooth', 0.2); },
  charge() { tone(90, 380, 0.4, 'sawtooth', 0.07); },
  beamCharge() { tone(100, 700, 0.6, 'sawtooth', 0.09); tone(200, 1400, 0.6, 'sine', 0.05); },
  beam() { tone(400, 120, 0.7, 'sawtooth', 0.14); noise(0.7, 0.2, 2500); duckMusic(900); },
  transform() { tone(80, 900, 1.1, 'sawtooth', 0.13); noise(1.0, 0.18, 3000); tone(900, 1800, 0.5, 'sine', 0.08, 0.8); duckMusic(1300); },
  dash() { noise(0.12, 0.18, 6000); tone(500, 150, 0.12, 'triangle', 0.1); },
  jump() { tone(220, 440, 0.1, 'triangle', 0.08); },
  land() { noise(0.06, 0.12, 700); },
  ko() { noise(0.6, 0.5, 700); tone(200, 25, 0.8, 'sawtooth', 0.3); duckMusic(1500, -14); },
  select() { tone(660, 880, 0.08, 'square', 0.1, 0, false); },
  confirm() { tone(440, 880, 0.12, 'square', 0.12, 0, false); tone(880, 1320, 0.14, 'square', 0.1, 0.08, false); },
  bell() { tone(880, 880, 0.5, 'sine', 0.15, 0, false); tone(1320, 1320, 0.4, 'sine', 0.08, 0, false); },
  fight() { tone(220, 330, 0.25, 'sawtooth', 0.16, 0, false); tone(330, 440, 0.3, 'sawtooth', 0.14, 0.12, false); },
  test() { tone(440, 440, 0.15, 'sine', 0.2, 0, false); },
};

// ---------- Música adaptativa ----------
// Capas verticales: 0 = base (pad+bajo), 1 = batería, 2 = lead/arpegio. El cambio de intensidad
// se aplica en el siguiente compás (cuantizado) para que las transiciones caigan en el tiempo.
const BPM = 132, STEP = 60 / BPM / 4;                 // semicorchea
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];  // Am F C G
const BASS = [45, 41, 36, 43];
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

const music = { on: false, step: 0, nextTime: 0, timer: null, layers: [], target: 0, pending: null };

function layerGain(i) {
  if (!music.layers[i]) { const g = ctx.createGain(); g.gain.value = i === 0 ? 1 : 0; g.connect(buses.music); music.layers[i] = g; }
  return music.layers[i];
}

function mnote(m, t, dur, type, vol, layer) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = mtof(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(layerGain(layer));
  o.start(t); o.stop(t + dur + 0.05);
}
function mdrum(kind, t) {
  const L = layerGain(1);
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(L); o.start(t); o.stop(t + 0.2);
  } else {
    const len = Math.floor(ctx.sampleRate * (kind === 's' ? 0.14 : 0.04));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 's' ? 1500 : 6000;
    const g = ctx.createGain(); g.gain.value = kind === 's' ? 0.3 : 0.1;
    s.connect(f).connect(g).connect(L); s.start(t);
  }
}

function scheduleStep(step, t) {
  const bar = Math.floor(step / 16) % 4, s = step % 16;
  if (s === 0) {                                      // límite de compás: aplicar intensidad pendiente
    if (music.pending !== null) {
      music.target = music.pending; music.pending = null;
      for (let i = 1; i < 3; i++) {
        const g = layerGain(i).gain;
        g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(music.target >= i ? 1 : 0, t + 0.2);
      }
    }
    for (const n of CHORDS[bar]) mnote(n, t, STEP * 15, 'triangle', 0.05, 0);   // pad
  }
  if (s % 4 === 0 || s === 10) mnote(BASS[bar], t, STEP * 3, 'sawtooth', 0.16, 0);
  // batería (capa 1)
  if (s % 4 === 0) mdrum('k', t);
  if (s === 4 || s === 12) mdrum('s', t);
  if (s % 2 === 0) mdrum('h', t);
  // lead/arpegio (capa 2)
  if (s % 2 === 0) { const n = CHORDS[bar][(s / 2) % 3] + 12; mnote(n, t, STEP * 1.8, 'square', 0.045, 2); }
}

function pump() {
  while (music.nextTime < ctx.currentTime + 0.15) {
    scheduleStep(music.step++, music.nextTime);
    music.nextTime += STEP;
  }
}

export const musicSys = {
  start() {
    if (!ensure() || music.on) return;
    music.on = true; music.step = 0; music.nextTime = ctx.currentTime + 0.1;
    layerGain(0); layerGain(1); layerGain(2);
    music.timer = setInterval(pump, 30);
  },
  stop() { if (music.timer) clearInterval(music.timer); music.timer = null; music.on = false; },
  /** 0 = menús, 1 = combate, 2 = momento crítico (súper / poca vida). Cambia en el próximo compás. */
  setIntensity(n) { if (music.on) music.pending = n; },
};
void unlocked;
