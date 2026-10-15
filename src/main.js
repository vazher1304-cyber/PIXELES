import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { FightScene } from './scenes/FightScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#05050a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, SelectScene, FightScene],
});
window.__game = game;
