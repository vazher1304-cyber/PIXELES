import Phaser from 'phaser';
import { FONT } from '../config.js';
import { MenuList, Nav, hint } from '../ui/nav.js';
import { settings, saveSettings } from '../systems/settings.js';
import { applyVolumes, sfx } from '../systems/audio.js';

export class OptionsScene extends Phaser.Scene {
  constructor() { super('options'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0f2e');
    this.add.text(480, 60, 'OPCIONES', { fontFamily: FONT, fontSize: '56px', color: '#ffb02e', stroke: '#1a0a00', strokeThickness: 8 }).setOrigin(0.5);
    const S = settings();
    const bar = (v) => '█'.repeat(Math.round(v * 10)) + '░'.repeat(10 - Math.round(v * 10));
    const slider = (key, label) => ({
      label: () => `${label}  ${bar(S.volume[key])} ${Math.round(S.volume[key] * 100)}%`,
      onLeft: () => this.setVol(key, -0.1), onRight: () => this.setVol(key, 0.1),
    });
    const toggle = (key, label) => ({ label: () => `${label}: ${S[key] ? 'SÍ' : 'NO'}`, onSelect: () => { S[key] = !S[key]; saveSettings(); }, onLeft: () => { S[key] = !S[key]; saveSettings(); }, onRight: () => { S[key] = !S[key]; saveSettings(); } });
    this.list = new MenuList(this, [
      slider('master', 'VOLUMEN GENERAL'), slider('music', 'MÚSICA'), slider('sfx', 'EFECTOS'),
      toggle('reduceShake', 'REDUCIR TEMBLOR DE PANTALLA'), toggle('reduceFlash', 'REDUCIR DESTELLOS'),
      { label: 'VOLVER', onSelect: () => this.scene.start('menu') },
    ], 480, 170, 56, 28);
    this.nav = new Nav(this, (d) => { if (d === 'back') this.scene.start('menu'); else if (d !== 'key') this.list.nav(d); });
    hint(this, '↑↓ elegir · ←→ ajustar · ESC volver');
  }

  setVol(k, d) {
    const v = settings().volume; v[k] = Math.round(Math.max(0, Math.min(1, v[k] + d)) * 10) / 10;
    saveSettings(); applyVolumes(); sfx.test();
  }
  update() { this.nav.poll(); }
}
