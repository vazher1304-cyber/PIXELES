import Phaser from 'phaser';
import { drawFig } from '../draw.js';
import { CHARS, session } from '../characters.js';
import { sfx } from '../audio.js';

const FONT = 'Impact, "Arial Black", sans-serif';

export class SelectScene extends Phaser.Scene {
  constructor() { super('select'); }

  create() {
    this.cur = [session.p1, session.p2];
    this.ok = [false, false];
    this.g = this.add.graphics();
    this.fg = this.add.graphics();
    this.add.text(480, 34, 'ELIGE A TU GUERRERO', { fontFamily: FONT, fontSize: '44px', color: '#ffb02e', stroke: '#1a0a00', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(480, 515, session.mode === 1 ? '←→ / A D elegir · ENTER / J confirmar · ESC volver' : 'J1: A D + F · J2: ← → + ENTER · ESC volver', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffffaa', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.names = CHARS.map((c, i) => {
      const x = 180 + i * 300;
      return [
        this.add.text(x, 330, c.name, { fontFamily: FONT, fontSize: '34px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5),
        this.add.text(x, 366, c.title, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe066', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5),
      ];
    });
    this.tags = [this.add.text(0, 0, 'J1', { fontFamily: FONT, fontSize: '28px', color: '#ff5a5a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5),
      this.add.text(0, 0, session.mode === 1 ? 'CPU' : 'J2', { fontFamily: FONT, fontSize: '28px', color: '#5ab0ff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5)];
    this.cameras.main.fadeIn(250);

    this.input.keyboard.on('keydown', (e) => {
      sfx.unlock();
      const k = e.code;
      if (k === 'Escape') { this.scene.start('menu'); return; }
      const mv = (p, d) => { if (this.ok[p]) return; this.cur[p] = (this.cur[p] + d + 3) % 3; sfx.select(); };
      if (session.mode === 1) {
        if (k === 'ArrowLeft' || k === 'KeyA') mv(0, -1);
        else if (k === 'ArrowRight' || k === 'KeyD') mv(0, 1);
        else if (k === 'Enter' || k === 'KeyJ' || k === 'Space') this.confirm(0);
      } else {
        if (k === 'KeyA') mv(0, -1); else if (k === 'KeyD') mv(0, 1); else if (k === 'KeyF') this.confirm(0);
        else if (k === 'ArrowLeft') mv(1, -1); else if (k === 'ArrowRight') mv(1, 1); else if (k === 'Enter') this.confirm(1);
      }
    });
  }

  confirm(p) {
    if (this.ok[p]) return;
    this.ok[p] = true; sfx.confirm();
    if (session.mode === 1) {
      // la CPU elige un rival distinto al azar
      const opts = [0, 1, 2].filter((i) => i !== this.cur[0]);
      this.cur[1] = Phaser.Utils.Array.GetRandom(opts); this.ok[1] = true;
    }
    if (this.ok[0] && this.ok[1]) {
      session.p1 = this.cur[0]; session.p2 = this.cur[1];
      this.time.delayedCall(700, () => { this.cameras.main.fadeOut(250); this.time.delayedCall(250, () => this.scene.start('fight')); });
    }
  }

  update(time) {
    const T = time / 1000, g = this.g, fg = this.fg;
    g.clear(); fg.clear();
    for (let i = 0; i < 30; i++) { g.fillStyle(i % 2 ? 0x0b1030 : 0x14103a, 1); g.fillRect(0, i * 18, 960, 19); }
    CHARS.forEach((c, i) => {
      const x = 180 + i * 300;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 130, 90, 260, 400, 14);
      g.lineStyle(3, 0x444a7a, 1); g.strokeRoundedRect(x - 130, 90, 260, 400, 14);
      [0, 1].forEach((p) => {
        if (this.cur[p] !== i) return;
        const col = p === 0 ? 0xff5a5a : 0x5ab0ff, off = p * 6;
        g.lineStyle(5, col, this.ok[p] ? 1 : 0.6 + Math.sin(T * 8) * 0.4);
        g.strokeRoundedRect(x - 134 - off, 86 - off, 268 + off * 2, 408 + off * 2, 16);
        this.tags[p].setPosition(x + (p === 0 ? -86 : 86), 112);
      });
      const sel = this.cur.includes(i);
      drawFig(fg, { x, y: 300, facing: 1, def: c, state: sel ? 'special' : 'idle', stateT: 0.8, dur: 0, atk: null, time: T + i, sup: false, flash: 0, zoom: 1.45 });
      this.names[i][0].setColor(sel ? '#ffe066' : '#ffffff');
      const stat = (label, v, y, col) => {
        g.fillStyle(0x1a1a2a, 1); g.fillRect(x - 90, y, 180, 8); g.fillStyle(col, 1); g.fillRect(x - 90, y, 180 * Math.min(1, v), 8);
        if (!this['l' + label + i]) this['l' + label + i] = this.add.text(x - 90, y - 15, label, { fontFamily: 'sans-serif', fontSize: '11px', color: '#aab' });
      };
      stat('VIDA', c.hp / 130, 410, 0x4ade4a); stat('PODER', c.power / 1.25, 440, 0xff7a3d); stat('VELOCIDAD', c.speed / 1.15, 470, 0x4de1ff);
    });
  }
}
