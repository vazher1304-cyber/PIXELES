import Phaser from 'phaser';
import { FONT, BODY } from '../config.js';
import { Nav, hint } from '../ui/nav.js';
import { ACTIONS, ACTION_LABELS, PROFILES, PROFILE_LABELS, getBindings, rebind, resetBindings, keyNameFromEvent, prettyKey } from '../systems/actions.js';
import { sfx } from '../systems/audio.js';

// Pantalla de rebinding con detección de conflictos y reset a valores por defecto.
export class ControlsScene extends Phaser.Scene {
  constructor() { super('controls'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0f2e');
    this.profile = 0; this.sel = 0; this.capturing = false; this.msg = '';
    this.add.text(480, 44, 'CONTROLES', { fontFamily: FONT, fontSize: '52px', color: '#ffb02e', stroke: '#1a0a00', strokeThickness: 8 }).setOrigin(0.5);
    this.title = this.add.text(480, 96, '', { fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.rows = [...ACTIONS, 'reset', 'back'].map((a, i) => this.add.text(480, 128 + i * 26.5, '', { fontFamily: BODY, fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5));
    this.note = this.add.text(480, 496, '', { fontFamily: BODY, fontSize: '15px', color: '#ffe066', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.add.text(480, 478, 'Gamepad: stick/cruceta mover · A saltar · X puño · Y patada · B ráfaga · RB rayo · LB cargar · R2 transformar · L2 esquiva', { fontFamily: BODY, fontSize: '12px', color: '#9fb0ff' }).setOrigin(0.5);
    hint(this, '←→ cambiar perfil · ↑↓ elegir · ENTER reasignar · ESC volver');
    this.nav = new Nav(this, (d, e) => this.onNav(d, e));
    this.draw();
  }

  onNav(d, e) {
    if (this.capturing) {
      if (!e) return;
      if (e.code === 'Escape') { this.capturing = false; this.msg = 'Cancelado'; this.draw(); return; }
      const name = keyNameFromEvent(e);
      const r = rebind(PROFILES[this.profile], ACTIONS[this.sel], name);
      this.capturing = false;
      if (r.ok) { sfx.confirm(); this.msg = `${ACTION_LABELS[ACTIONS[this.sel]]} → ${prettyKey(name)}`; }
      else this.msg = r.conflict === 'reservada' ? 'Esa tecla está reservada' : `Conflicto: ya se usa en "${ACTION_LABELS[r.conflict]}"`;
      this.draw(); return;
    }
    const n = ACTIONS.length + 2;
    if (d === 'up') { this.sel = (this.sel + n - 1) % n; sfx.select(); }
    else if (d === 'down') { this.sel = (this.sel + 1) % n; sfx.select(); }
    else if (d === 'left') { this.profile = (this.profile + 2) % 3; sfx.select(); }
    else if (d === 'right') { this.profile = (this.profile + 1) % 3; sfx.select(); }
    else if (d === 'back') { this.scene.start('menu'); return; }
    else if (d === 'ok') {
      if (this.sel < ACTIONS.length) { this.capturing = true; this.msg = 'Pulsa la nueva tecla… (ESC cancela)'; }
      else if (this.sel === ACTIONS.length) { resetBindings(PROFILES[this.profile]); this.msg = 'Restaurado'; sfx.confirm(); }
      else { this.scene.start('menu'); return; }
    }
    this.draw();
  }

  draw() {
    const prof = PROFILES[this.profile], b = getBindings(prof);
    this.title.setText(`◂ ${PROFILE_LABELS[prof]} ▸`);
    this.rows.forEach((t, i) => {
      let label;
      if (i < ACTIONS.length) label = `${ACTION_LABELS[ACTIONS[i]].padEnd(14, ' ')}  [ ${this.capturing && i === this.sel ? '…' : prettyKey(b[ACTIONS[i]])} ]`;
      else label = i === ACTIONS.length ? 'Restaurar valores por defecto' : 'Volver';
      t.setText((i === this.sel ? '▶ ' : '  ') + label).setColor(i === this.sel ? '#ffe066' : '#ffffff');
    });
    this.note.setText(this.msg);
  }
  update() { this.nav.poll(); }
}
