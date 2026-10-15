import Phaser from 'phaser';
import { CHARS, STAGES } from '../data/characters.js';
import { FONT } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    const bar = this.add.graphics();
    this.add.text(480, 250, 'CARGANDO…', { fontFamily: FONT, fontSize: '40px', color: '#ffb02e' }).setOrigin(0.5);
    this.load.on('progress', (v) => { bar.clear().fillStyle(0xffb02e, 1).fillRect(280, 290, 400 * v, 10); });
    for (const c of CHARS) {
      this.load.atlas(c.id, `assets/fighters/${c.id}.png`, `assets/fighters/${c.id}.json`);
      this.load.atlas(`${c.id}_super`, `assets/fighters/${c.id}_super.png`, `assets/fighters/${c.id}_super.json`);
    }
    this.load.json('anims', 'assets/fighters/anims.json');
    this.load.atlas('fx', 'assets/fx/fx.png', 'assets/fx/fx.json');
    for (const s of STAGES) for (const l of ['sky', 'far', 'near', 'ground']) this.load.image(`stage_${s}_${l}`, `assets/stages/stage_${s}_${l}.png`);
  }

  create() { this.scene.start('menu'); }
}
