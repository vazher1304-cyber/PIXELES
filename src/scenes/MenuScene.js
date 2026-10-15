import Phaser from 'phaser';
import { drawFig, drawAura } from '../draw.js';
import { CHARS, session, DIFFS } from '../characters.js';
import { sfx } from '../audio.js';

const FONT = 'Impact, "Arial Black", sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    this.sel = session.mode === 1 ? 0 : 1;
    this.bg = this.add.graphics();
    this.fig = this.add.graphics();
    this.fx = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const stroke = { stroke: '#1a0a00', strokeThickness: 10 };
    this.add.text(480, 52, 'KI WARRIORS', { fontFamily: FONT, fontSize: '92px', color: '#ffb02e', ...stroke }).setOrigin(0.5);
    this.add.text(480, 122, 'E V O L U C I Ó N', { fontFamily: FONT, fontSize: '34px', color: '#ffffff', stroke: '#0a1a44', strokeThickness: 7 }).setOrigin(0.5);
    this.opts = [0, 1, 2].map((i) => this.add.text(480, 372 + i * 52, '', { fontFamily: FONT, fontSize: '36px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5));
    this.add.text(480, 515, '↑↓ elegir · ←→ dificultad · ENTER confirmar', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffffaa', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.refresh();

    const kb = this.input.keyboard;
    kb.on('keydown', (e) => {
      sfx.unlock();
      const k = e.code;
      if (k === 'ArrowUp' || k === 'KeyW') { this.sel = (this.sel + 2) % 3; sfx.select(); this.refresh(); }
      else if (k === 'ArrowDown' || k === 'KeyS') { this.sel = (this.sel + 1) % 3; sfx.select(); this.refresh(); }
      else if (k === 'ArrowLeft' || k === 'KeyA') { if (this.sel === 0) { session.diff = (session.diff + 2) % 3; sfx.select(); this.refresh(); } }
      else if (k === 'ArrowRight' || k === 'KeyD') { if (this.sel === 0) { session.diff = (session.diff + 1) % 3; sfx.select(); this.refresh(); } }
      else if (k === 'Enter' || k === 'Space' || k === 'KeyJ') this.confirm();
    });
    this.input.on('pointerdown', () => sfx.unlock());
    this.opts.forEach((t, i) => t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.sel = i; this.refresh(); this.confirm(); }));
  }

  refresh() {
    const labels = [`1 JUGADOR  ◂ ${DIFFS[session.diff]} ▸`, '2 JUGADORES', 'CONTROLES'];
    this.opts.forEach((t, i) => {
      t.setText((i === this.sel ? '▶ ' : '') + labels[i]).setColor(i === this.sel ? '#ffe066' : '#ffffff').setScale(i === this.sel ? 1.08 : 1);
    });
    if (this.help) { this.help.destroy(); this.help = null; }
  }

  confirm() {
    sfx.confirm();
    if (this.sel === 2) {
      if (this.help) { this.help.destroy(); this.help = null; return; }
      const txt = '1 JUGADOR: A/D mover · W saltar · S guardia\nJ puño (pulsa en cadena) · K patada · L ráfaga de ki (10)\nU rayo de ki (50) · I mantener = cargar ki\nO transformación SÚPER (ki 100) · ESPACIO esquiva\n\n2 JUGADORES: J1 WASD + F G H T R Y Q\nJ2 flechas + J K L U I O SHIFT   ·   P pausa · ESC menú';
      this.help = this.add.text(480, 300, txt, { fontFamily: 'sans-serif', fontSize: '17px', color: '#fff', align: 'center', backgroundColor: '#000000cc', padding: { x: 18, y: 14 }, lineSpacing: 6 }).setOrigin(0.5).setDepth(10);
      return;
    }
    session.mode = this.sel === 0 ? 1 : 2;
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(250, () => this.scene.start('select'));
  }

  update(time) {
    const T = time / 1000, g = this.bg;
    g.clear();
    for (let i = 0; i < 30; i++) { g.fillStyle(i % 2 ? 0x0a0f2e : 0x120a2e, 1); g.fillRect(0, i * 18, 960, 19); }
    g.fillStyle(0x2a1a55, 0.5);
    for (let i = 0; i < 70; i++) { const x = (i * 137 + T * 8 * (1 + (i % 3))) % 980 - 10, y = (i * 59) % 330; g.fillCircle(x, y, 1 + (i % 3) * 0.6); }
    g.fillStyle(0x1a1a3a, 1); g.fillRect(0, 405, 960, 135);
    const f = this.fig, fx = this.fx; f.clear(); fx.clear();
    const a = { x: 140, y: 405, facing: 1, def: CHARS[0], state: 'special', stateT: 0.75, dur: 0, atk: null, time: T, sup: true, flash: 0, zoom: 1.5 };
    const b = { x: 820, y: 405, facing: -1, def: CHARS[1], state: 'special', stateT: 0.75, dur: 0, atk: null, time: T + 1, sup: true, flash: 0, zoom: 1.5 };
    drawFig(f, a); drawFig(f, b);
    drawAura(fx, a, 0.8); drawAura(fx, b, 0.8);
    const by = 405 - 86 * 1.5 * 0.97;
    // choque de rayos
    const p = 480 + Math.sin(T * 2) * 20, pulse = 1 + Math.sin(T * 14) * 0.1;
    fx.fillStyle(CHARS[0].ki, 0.5); fx.fillRect(220, by - 24, p - 220, 48);
    fx.fillStyle(CHARS[1].ki, 0.5); fx.fillRect(p, by - 24, 740 - p, 48);
    fx.fillStyle(0xffffff, 0.9); fx.fillRect(220, by - 10, p - 220, 20); fx.fillRect(p, by - 10, 740 - p, 20);
    fx.fillStyle(0xffffff, 0.4); fx.fillCircle(p, by, 60 * pulse); fx.fillStyle(0xffffff, 0.9); fx.fillCircle(p, by, 28 * pulse);
  }
}
