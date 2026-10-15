import Phaser from 'phaser';
import { FONT } from '../config.js';
import { MenuList, Nav } from '../ui/nav.js';
import { musicSys } from '../systems/audio.js';

// Menú modal: la escena de combate se PAUSA (no se detiene) y esta se lanza encima.
export class PauseScene extends Phaser.Scene {
  constructor() { super('pause'); }

  create() {
    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.6);
    this.add.text(480, 150, 'PAUSA', { fontFamily: FONT, fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5);
    const resume = () => { this.scene.stop(); this.scene.resume('fight'); };
    this.list = new MenuList(this, [
      { label: 'CONTINUAR', onSelect: resume },
      { label: 'SALIR AL MENÚ', onSelect: () => { this.scene.stop('fight'); this.scene.stop('hud'); this.scene.stop(); this.scene.start('menu'); musicSys.setIntensity(0); } },
    ], 480, 280, 56, 36);
    this.nav = new Nav(this, (d, e) => { if (d === 'back' || (e && e.code === 'KeyP')) resume(); else if (d !== 'key') this.list.nav(d); });
  }
  update() { this.nav.poll(); }
}
