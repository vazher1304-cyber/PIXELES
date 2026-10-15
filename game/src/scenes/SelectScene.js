import Phaser from 'phaser';
import { FONT, BODY } from '../config.js';
import { CHARS, session } from '../data/characters.js';
import { Nav, hint } from '../ui/nav.js';
import { sfx } from '../systems/audio.js';

export class SelectScene extends Phaser.Scene {
  constructor() { super('select'); }

  init() { this.cur = [session.p1, session.p2]; this.ok = [false, false]; this.leaving = false; }

  create() {
    this.cameras.main.setBackgroundColor('#0b1030').fadeIn(250);
    this.g = this.add.graphics();
    this.add.text(480, 36, 'ELIGE A TU GUERRERO', { fontFamily: FONT, fontSize: '44px', color: '#ffb02e', stroke: '#1a0a00', strokeThickness: 8 }).setOrigin(0.5);
    this.sprites = CHARS.map((c, i) => {
      const x = 180 + i * 300;
      const s = this.add.sprite(x, 310, c.id, 'idle_0').setOrigin(0.5, 180 / 192).setScale(1.45);
      this.add.text(x, 336, c.name, { fontFamily: FONT, fontSize: '34px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
      this.add.text(x, 372, c.title, { fontFamily: BODY, fontSize: '14px', color: '#ffe066', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      const stat = (label, v, y, col) => {
        this.add.text(x - 90, y - 16, label, { fontFamily: BODY, fontSize: '11px', color: '#aab' });
        this.g.fillStyle(0x1a1a2a, 1).fillRect(x - 90, y, 180, 8).fillStyle(col, 1).fillRect(x - 90, y, 180 * Math.min(1, v), 8);
      };
      stat('VIDA', c.hp / 130, 418, 0x4ade4a); stat('PODER', c.power / 1.25, 446, 0xff7a3d); stat('VELOCIDAD', c.speed / 1.15, 474, 0x4de1ff);
      return s;
    });
    this.cursors = [0, 1].map((p) => this.add.graphics().setDepth(5));
    this.tags = [this.add.text(0, 0, 'J1', { fontFamily: FONT, fontSize: '28px', color: '#ff5a5a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5),
      this.add.text(0, 0, session.mode === 1 ? 'CPU' : 'J2', { fontFamily: FONT, fontSize: '28px', color: '#5ab0ff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5)];
    this.nav = new Nav(this, (d, e) => this.onNav(d, e));
    hint(this, session.mode === 1 ? '←→ / A D elegir · ENTER / J / A confirmar · ESC volver' : 'J1: A D + F · J2: ← → + ENTER · ESC volver');
    this.draw();
  }

  onNav(d, e) {
    if (this.leaving) return;
    if (d === 'back') { this.scene.start('menu'); return; }
    const mv = (p, k) => { if (!this.ok[p]) { this.cur[p] = (this.cur[p] + k + 3) % 3; sfx.select(); } };
    if (session.mode === 1) {
      if (d === 'left') mv(0, -1); else if (d === 'right') mv(0, 1); else if (d === 'ok') this.confirm(0);
    } else if (e) {
      const c = e.code;
      if (c === 'KeyA') mv(0, -1); else if (c === 'KeyD') mv(0, 1); else if (c === 'KeyF') this.confirm(0);
      else if (c === 'ArrowLeft') mv(1, -1); else if (c === 'ArrowRight') mv(1, 1); else if (c === 'Enter') this.confirm(1);
    }
    this.draw();
  }

  confirm(p) {
    if (this.ok[p]) return;
    this.ok[p] = true; sfx.confirm();
    if (session.mode === 1) { this.cur[1] = Phaser.Utils.Array.GetRandom([0, 1, 2].filter((i) => i !== this.cur[0])); this.ok[1] = true; }
    if (this.ok[0] && this.ok[1]) {
      session.p1 = this.cur[0]; session.p2 = this.cur[1]; this.leaving = true;
      this.time.delayedCall(600, () => { this.cameras.main.fadeOut(250); this.time.delayedCall(250, () => this.scene.start('fight')); });
    }
    this.draw();
  }

  draw() {
    CHARS.forEach((c, i) => {
      const sel = this.cur.includes(i);
      this.sprites[i].setFrame(sel ? 'wind_1' : 'idle_0');
    });
    [0, 1].forEach((p) => {
      const x = 180 + this.cur[p] * 300, g = this.cursors[p].clear();
      const col = p === 0 ? 0xff5a5a : 0x5ab0ff, off = p * 6;
      g.lineStyle(5, col, this.ok[p] ? 1 : 0.7).strokeRoundedRect(x - 134 - off, 76 - off, 268 + off * 2, 418 + off * 2, 16);
      this.tags[p].setPosition(x + (p === 0 ? -86 : 86), 100);
    });
  }

  update() { this.nav.poll(); }
}
