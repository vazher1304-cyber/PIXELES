import Phaser from 'phaser';
import { VIEW, TUNING } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { OptionsScene } from './scenes/OptionsScene.js';
import { ControlsScene } from './scenes/ControlsScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { FightScene } from './scenes/FightScene.js';
import { HudScene } from './scenes/HudScene.js';
import { PauseScene } from './scenes/PauseScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW.w,
  height: VIEW.h,
  parent: 'game',
  backgroundColor: '#05050a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: TUNING.gravity }, fps: 60, debug: false } },
  scene: [BootScene, MenuScene, OptionsScene, ControlsScene, SelectScene, FightScene, HudScene, PauseScene],
});
window.__game = game;
