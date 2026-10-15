import Phaser from 'phaser';
import { FONT, BODY } from '../config.js';
import { CHARS, session } from '../data/characters.js';

// HUD en su propia escena (cámara aparte, no le afecta el zoom). Se actualiza por EVENTOS del combate,
// no consultando el estado cada frame (skill `game-ui-ux`).
export class HudScene extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    const fight = this.scene.get('fight');
    this.s = [{ hp: 1, trail: 1, ki: 0, wins: 0, sup: false, combo: 0 }, { hp: 1, trail: 1, ki: 0, wins: 0, sup: false, combo: 0 }];
    this.g = this.add.graphics();
    const t = (s, size, color = '#fff') => this.add.text(0, 0, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000', strokeThickness: Math.max(3, size / 9) });
    this.tTimer = t('60', 46, '#ffe066').setOrigin(0.5, 0).setPosition(480, 8);
    this.names = [t(CHARS[session.p1].name, 22).setPosition(34, 50), t(session.mode === 1 ? CHARS[session.p2].name + ' (CPU)' : CHARS[session.p2].name, 22).setOrigin(1, 0).setPosition(926, 50)];
    this.combo = [t('', 34, '#ffb347').setPosition(34, 140), t('', 34, '#ffb347').setOrigin(1, 0).setPosition(926, 140)];
    this.sup = [t('SÚPER', 20, '#ffe066').setPosition(34, 100).setVisible(false), t('SÚPER', 20, '#ffe066').setOrigin(1, 0).setPosition(926, 100).setVisible(false)];
    this.banner = t('', 96).setOrigin(0.5).setPosition(480, 220).setAlpha(0);
    this.sub = t('', 30, '#ffe066').setOrigin(0.5).setPosition(480, 290).setAlpha(0);
    this.help = this.add.text(480, 526, '', { fontFamily: BODY, fontSize: '13px', color: '#ffffffcc', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1);
    this.stageName = this.add.text(480, 66, '', { fontFamily: FONT, fontSize: '14px', color: '#ffffffaa' }).setOrigin(0.5, 0);

    const ev = fight.events, on = (n, fn) => { ev.on(n, fn, this); this.events.once('shutdown', () => ev.off(n, fn, this)); };
    on('hud:hp', (i, hp, max) => { this.s[i].hp = hp / max; this.dirty = true; });
    on('hud:ki', (i, ki) => { this.s[i].ki = ki / 100; this.dirty = true; });
    on('hud:wins', (i, w) => { this.s[i].wins = w; this.dirty = true; });
    on('hud:super', (i, v) => { this.s[i].sup = v; this.sup[i].setVisible(v); });
    on('hud:combo', (i, n) => { this.combo[i].setText(n >= 2 ? `${n} GOLPES` : ''); });
    on('hud:timer', (s) => this.tTimer.setText(String(s)));
    on('hud:help', (txt, alpha) => this.help.setText(txt).setAlpha(alpha));
    on('hud:stage', (n) => this.stageName.setText(n));
    on('hud:banner', (text, sub, hold) => {
      this.tweens.killTweensOf([this.banner, this.sub]);
      this.banner.setText(text).setAlpha(1).setScale(2.2); this.sub.setText(sub || '').setAlpha(sub ? 1 : 0);
      this.tweens.add({ targets: this.banner, scale: 1, duration: 220, ease: 'Back.Out' });
      if (hold > 0) this.tweens.add({ targets: [this.banner, this.sub], alpha: 0, delay: hold * 1000, duration: 250 });
    });
    this.dirty = true;
  }

  update(t, delta) {
    // la barra "de daño" (blanca) se desliza hacia la vida real: solo se redibuja mientras hay cambio
    for (const s of this.s) { if (s.trail > s.hp) { s.trail = Math.max(s.hp, s.trail - 0.4 * delta / 1000); this.dirty = true; } else s.trail = s.hp; }
    if (!this.dirty) return;
    this.dirty = false;
    const g = this.g.clear(), bw = 400;
    [[0, 30, 1], [1, 960 - 30 - bw, -1]].forEach(([i, x, dir]) => {
      const s = this.s[i], by = 20;
      g.fillStyle(0x000000, 0.65).fillRect(x - 4, by - 4, bw + 8, 50);
      g.fillStyle(0x3a0d0d, 1).fillRect(x, by, bw, 26);
      const bar = (v, c, h = 26, y = by) => g.fillStyle(c, 1).fillRect(dir > 0 ? x : x + bw - bw * v, y, bw * v, h);
      bar(s.trail, 0xffffff);
      bar(s.hp, s.hp > 0.5 ? 0x4ade4a : s.hp > 0.25 ? 0xf5c518 : 0xe53935);
      g.fillStyle(0xffffff, 0.22).fillRect(dir > 0 ? x : x + bw - bw * s.hp, by, bw * s.hp, 8);
      const kw = bw * 0.65, kx = dir > 0 ? x : x + bw - kw, ky = by + 32;
      g.fillStyle(0x08122a, 1).fillRect(kx, ky, kw, 10);
      g.fillStyle(s.ki >= 1 ? 0xffd23a : s.ki >= 0.5 ? 0x4de1ff : 0x2f7bff, 1).fillRect(dir > 0 ? kx : kx + kw - kw * s.ki, ky, kw * s.ki, 10);
      g.fillStyle(0xffffff, 0.8).fillRect(kx + kw * 0.5 - 1, ky - 2, 2, 14);
      for (let r = 0; r < 2; r++) {
        const cx = dir > 0 ? x + bw - 14 - r * 22 : x + 14 + r * 22;
        g.fillStyle(0x000000, 0.8).fillCircle(cx, ky + 5, 8).fillStyle(s.wins > r ? 0xffd23a : 0x333344, 1).fillCircle(cx, ky + 5, 6);
      }
    });
  }
}
