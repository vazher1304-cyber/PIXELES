// Capa de acciones (skill `input-systems`): el juego lee ACCIONES, nunca teclas.
// Cada perfil define bindings de teclado (datos) + mapeo de gamepad con zona muerta radial.
import Phaser from 'phaser';
import { settings, saveSettings } from './settings.js';

export const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'blast', 'special', 'charge', 'transform', 'dash'];
export const HELD = new Set(['left', 'right', 'down', 'charge']);   // continuas; el resto son de flanco
export const ACTION_LABELS = {
  left: 'Izquierda', right: 'Derecha', up: 'Saltar', down: 'Guardia', punch: 'Puño', kick: 'Patada',
  blast: 'Ráfaga de ki', special: 'Rayo de ki', charge: 'Cargar ki', transform: 'Transformar', dash: 'Esquiva',
};

export const DEFAULT_BINDINGS = {
  solo: { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'J', kick: 'K', blast: 'L', special: 'U', charge: 'I', transform: 'O', dash: 'SPACE' },
  p1: { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'F', kick: 'G', blast: 'H', special: 'T', charge: 'R', transform: 'Y', dash: 'Q' },
  p2: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'J', kick: 'K', blast: 'L', special: 'U', charge: 'I', transform: 'O', dash: 'SHIFT' },
};
export const PROFILES = ['solo', 'p1', 'p2'];
export const PROFILE_LABELS = { solo: '1 JUGADOR', p1: 'J1 (2 JUGADORES)', p2: 'J2 (2 JUGADORES)' };
const RESERVED = new Set(['ESC', 'P', 'ENTER', 'BACKSPACE']);

// Botones del gamepad (layout estándar). Sticks: radial deadzone.
const PAD = { up: [0], punch: [2], kick: [3], blast: [1], special: [5], charge: [4], transform: [7], dash: [6] };
const DEADZONE = 0.28;

const KEYNAMES = (() => {
  const m = {};
  for (const [name, code] of Object.entries(Phaser.Input.Keyboard.KeyCodes)) m[code] = name;
  return m;
})();
export const keyNameFromEvent = (e) => KEYNAMES[e.keyCode];
export const prettyKey = (n) => ({ SPACE: 'Espacio', LEFT: '←', RIGHT: '→', UP: '↑', DOWN: '↓', SHIFT: 'Shift', COMMA: ',', PERIOD: '.', FORWARD_SLASH: '/' }[n] || n);

export function getBindings(profile) {
  return { ...DEFAULT_BINDINGS[profile], ...(settings().bindings[profile] || {}) };
}

/** Rebind con detección de conflictos. Devuelve {ok, conflict}. */
export function rebind(profile, action, keyName) {
  if (!keyName || RESERVED.has(keyName)) return { ok: false, conflict: 'reservada' };
  const cur = getBindings(profile);
  for (const a of ACTIONS) if (a !== action && cur[a] === keyName) return { ok: false, conflict: a };
  settings().bindings[profile] = { ...(settings().bindings[profile] || {}), [action]: keyName };
  saveSettings();
  return { ok: true };
}
export function resetBindings(profile) { delete settings().bindings[profile]; saveSettings(); }

const emptyFrame = () => ({ held: Object.fromEntries(ACTIONS.map((a) => [a, false])), pressed: Object.fromEntries(ACTIONS.map((a) => [a, false])) });

/** Fuente de entrada humana: teclado (perfil) + gamepad opcional. */
export class HumanInput {
  constructor(scene, profile, padIndex = -1) {
    this.scene = scene; this.profile = profile; this.padIndex = padIndex;
    this.prev = Object.fromEntries(ACTIONS.map((a) => [a, false]));
    this.lastDevice = 'keyboard';
    this.refreshKeys();
  }

  refreshKeys() {
    const kb = this.scene.input.keyboard;
    const b = getBindings(this.profile);
    this.keys = {};
    for (const a of ACTIONS) this.keys[a] = kb.addKey(Phaser.Input.Keyboard.KeyCodes[b[a]]);
  }

  poll() {
    const out = emptyFrame();
    const down = Object.fromEntries(ACTIONS.map((a) => [a, !!this.keys[a].isDown]));
    const pad = this.padIndex >= 0 && this.scene.input.gamepad ? this.scene.input.gamepad.getPad(this.padIndex) : null;
    if (pad) {
      // zona muerta RADIAL (no por eje) para que las diagonales no se recorten
      let x = pad.axes.length > 0 ? pad.axes[0].getValue() : 0, y = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const mag = Math.hypot(x, y);
      if (mag < DEADZONE) { x = 0; y = 0; } else { const s = (mag - DEADZONE) / (1 - DEADZONE) / mag; x *= s; y *= s; }
      const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      if (x < -0.3 || btn(14)) down.left = true;
      if (x > 0.3 || btn(15)) down.right = true;
      if (y < -0.6 || btn(12)) down.up = true;
      if (y > 0.5 || btn(13)) down.down = true;
      for (const [a, idx] of Object.entries(PAD)) if (idx.some(btn)) down[a] = true;
      if (Object.values(down).some(Boolean) && !ACTIONS.some((a) => this.keys[a].isDown)) this.lastDevice = 'gamepad';
    }
    for (const a of ACTIONS) {
      out.held[a] = down[a];
      out.pressed[a] = down[a] && !this.prev[a];   // flanco: solo el frame de pulsación
      this.prev[a] = down[a];
    }
    return out;
  }
}
