import Phaser from 'phaser';
import { FONT } from '../config.js';
import { CHARS, DIFFS, session } from '../data/characters.js';
import { MenuList, Nav, hint } from '../ui/nav.js';
import { musicSys, sfx } from '../systems/audio.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0f2e').fadeIn(250);
    this.bg = this.add.graphics();
    this.fx = this.add.graphics().setBlendMode('ADD');
    const kaito = this.add.sprite(150, 400, 'kaito_super', 'wind_1').setOrigin(0.5, 180 / 192).setScale(1.5);
    const ryu = this.add.sprite(810, 400, 'ryuzen_super', 'wind_1').setOrigin(0.5, 180 / 192).setScale(1.5).setFlipX(true);
    this.fighters = [kaito, ryu];
    for (const [s, c] of [[kaito, CHARS[0]], [ryu, CHARS[1]]]) {
      this.add.particles(0, 0, 'fx', { frame: 'flame', lifespan: 600, speedY: { min: -200, max: -100 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, blendMode: 'ADD', tint: c.aura, frequency: 30, x: s.x, y: s.y - 6, speedX: { min: -30, max: 30 } });
    }
    this.add.text(480, 52, 'KI WARRIORS', { fontFamily: FONT, fontSize: '92px', color: '#ffb02e', stroke: '#1a0a00', strokeThickness: 10 }).setOrigin(0.5);
    this.add.text(480, 122, 'E V O L U C I Ó N', { fontFamily: FONT, fontSize: '34px', color: '#ffffff', stroke: '#0a1a44', strokeThickness: 7 }).setOrigin(0.5);

    this.list = new MenuList(this, [
      { label: () => `1 JUGADOR  ◂ ${DIFFS[session.diff]} ▸`, onSelect: () => this.go(1), onLeft: () => { session.diff = (session.diff + 2) % 3; }, onRight: () => { session.diff = (session.diff + 1) % 3; } },
      { label: '2 JUGADORES', onSelect: () => this.go(2) },
      { label: 'CONTROLES', onSelect: () => this.scene.start('controls') },
      { label: 'OPCIONES', onSelect: () => this.scene.start('options') },
    ], 480, 340, 46, 34);
    this.nav = new Nav(this, (d) => { if (d !== 'key' && d !== 'back') this.list.nav(d); });
    hint(this, '↑↓ elegir · ←→ dificultad · ENTER / A confirmar');
    this.input.once('pointerdown', () => { sfx.unlock(); musicSys.start(); });
    this.input.keyboard.once('keydown', () => { sfx.unlock(); musicSys.start(); musicSys.setIntensity(0); });
    this.beamY = 405 - 86 * 1.5;
  }

  go(mode) {
    session.mode = mode;
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(250, () => this.scene.start('select'));
  }

  update(time) {
    this.nav.poll();
    const T = time / 1000, g = this.bg, fx = this.fx;
    g.clear(); fx.clear();
    g.fillStyle(0x2a1a55, 0.5);
    for (let i = 0; i < 70; i++) g.fillCircle((i * 137 + T * 8 * (1 + (i % 3))) % 980 - 10, (i * 59) % 330, 1 + (i % 3) * 0.6);
    g.fillStyle(0x1a1a3a, 1).fillRect(0, 405, 960, 135);
    const p = 480 + Math.sin(T * 2) * 20, pulse = 1 + Math.sin(T * 14) * 0.1, by = this.beamY;
    fx.fillStyle(CHARS[0].ki, 0.5).fillRect(220, by - 24, p - 220, 48);
    fx.fillStyle(CHARS[1].ki, 0.5).fillRect(p, by - 24, 740 - p, 48);
    fx.fillStyle(0xffffff, 0.9).fillRect(220, by - 10, p - 220, 20).fillRect(p, by - 10, 740 - p, 20);
    fx.fillStyle(0xffffff, 0.4).fillCircle(p, by, 60 * pulse);
    fx.fillStyle(0xffffff, 0.9).fillCircle(p, by, 28 * pulse);
  }
}
