// Efectos de sonido sintetizados con WebAudio (sin archivos externos).
let ctx = null;
function ac() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
  return ctx;
}

function tone(f0, f1, dur, type = 'square', vol = 0.15, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.2, freq = 1800, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

export const sfx = {
  unlock() { ac(); },
  swing() { noise(0.07, 0.08, 4000); },
  punch() { noise(0.09, 0.3, 1500); tone(190, 60, 0.1, 'square', 0.18); },
  kick() { noise(0.12, 0.35, 1200); tone(140, 45, 0.16, 'square', 0.22); },
  heavy() { noise(0.2, 0.45, 900); tone(110, 30, 0.3, 'sawtooth', 0.28); },
  block() { tone(1100, 500, 0.07, 'triangle', 0.2); noise(0.04, 0.1, 5000); },
  blast() { tone(280, 900, 0.22, 'sawtooth', 0.1); tone(560, 1200, 0.18, 'sine', 0.08); },
  explode() { noise(0.25, 0.35, 1000); tone(160, 40, 0.25, 'sawtooth', 0.2); },
  charge() { tone(90, 380, 0.4, 'sawtooth', 0.07); },
  beamCharge() { tone(100, 700, 0.6, 'sawtooth', 0.09); tone(200, 1400, 0.6, 'sine', 0.05); },
  beam() { tone(400, 120, 0.7, 'sawtooth', 0.14); noise(0.7, 0.2, 2500); },
  transform() { tone(80, 900, 1.1, 'sawtooth', 0.13); noise(1.0, 0.18, 3000); tone(900, 1800, 0.5, 'sine', 0.08, 0.8); },
  dash() { noise(0.12, 0.18, 6000); tone(500, 150, 0.12, 'triangle', 0.1); },
  jump() { tone(220, 440, 0.1, 'triangle', 0.08); },
  ko() { noise(0.6, 0.5, 700); tone(200, 25, 0.8, 'sawtooth', 0.3); },
  select() { tone(660, 880, 0.08, 'square', 0.1); },
  confirm() { tone(440, 880, 0.12, 'square', 0.12); tone(880, 1320, 0.14, 'square', 0.1, 0.08); },
  bell() { tone(880, 880, 0.5, 'sine', 0.15); tone(1320, 1320, 0.4, 'sine', 0.08); },
  fight() { tone(220, 330, 0.25, 'sawtooth', 0.16); tone(330, 440, 0.3, 'sawtooth', 0.14, 0.12); },
};
