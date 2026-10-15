// Navegación de menús por teclado y gamepad con foco inicial (skill `game-ui-ux`).
import { sfx } from '../systems/audio.js';
import { FONT, BODY } from '../config.js';

/** Convierte teclado + gamepad en eventos de navegación de un solo disparo. */
export class Nav {
  constructor(scene, onNav) {
    this.scene = scene; this.onNav = onNav; this.prev = {};
    this.kd = (e) => {
      sfx.unlock();
      const m = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', Space: 'ok', KeyJ: 'ok', Escape: 'back' };
      if (m[e.code]) this.onNav(m[e.code], e);
      else this.onNav('key', e);
    };
    scene.input.keyboard.on('keydown', this.kd);
    scene.events.once('shutdown', () => scene.input.keyboard.off('keydown', this.kd));
  }

  poll() {
    const g = this.scene.input.gamepad; if (!g) return;
    const pad = g.getPad(0); if (!pad) return;
    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const ax = pad.axes.length > 1 ? [pad.axes[0].getValue(), pad.axes[1].getValue()] : [0, 0];
    const cur = { up: b(12) || ax[1] < -0.6, down: b(13) || ax[1] > 0.6, left: b(14) || ax[0] < -0.6, right: b(15) || ax[0] > 0.6, ok: b(0) || b(9), back: b(1) };
    for (const k of Object.keys(cur)) { if (cur[k] && !this.prev[k]) this.onNav(k, null); this.prev[k] = cur[k]; }
  }
}

/** Lista vertical con foco. getLabel permite etiquetas dinámicas (sliders, toggles). */
export class MenuList {
  constructor(scene, items, x, y, gap = 52, size = 36) {
    this.scene = scene; this.items = items; this.sel = 0;
    this.texts = items.map((it, i) => {
      const t = scene.add.text(x, y + i * gap, '', { fontFamily: FONT, fontSize: size + 'px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { this.sel = i; this.refresh(); });
      t.on('pointerdown', () => { this.sel = i; this.activate(); });
      return t;
    });
    this.refresh();   // el foco siempre arranca en el primer elemento
  }
  refresh() {
    this.items.forEach((it, i) => {
      const label = typeof it.label === 'function' ? it.label() : it.label;
      this.texts[i].setText((i === this.sel ? '▶ ' : '') + label).setColor(i === this.sel ? '#ffe066' : '#ffffff').setScale(i === this.sel ? 1.08 : 1);
    });
  }
  activate() { sfx.confirm(); this.items[this.sel].onSelect?.(); this.refresh(); }
  nav(dir) {
    if (dir === 'up') { this.sel = (this.sel + this.items.length - 1) % this.items.length; sfx.select(); }
    else if (dir === 'down') { this.sel = (this.sel + 1) % this.items.length; sfx.select(); }
    else if (dir === 'left') { this.items[this.sel].onLeft?.(); sfx.select(); }
    else if (dir === 'right') { this.items[this.sel].onRight?.(); sfx.select(); }
    else if (dir === 'ok') { this.activate(); return; }
    this.refresh();
  }
}

export function hint(scene, text) {
  return scene.add.text(480, 518, text, { fontFamily: BODY, fontSize: '14px', color: '#ffffffaa', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
}
