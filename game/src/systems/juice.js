// Game feel (skill `game-feel`): trauma de cámara, hit-stop, flashes, números, partículas, squash & stretch.
import Phaser from 'phaser';
import { TIERS, FONT } from '../config.js';
import { settings } from './settings.js';

export class Juice {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0; this.t = 0;
    this.freeze = 0;                 // hit-stop en TIEMPO REAL (no depende de timeScale)
    this.emitters = new Map();
    this.nums = [];
    scene.events.once('shutdown', () => { this.emitters.clear(); this.nums.length = 0; });
  }

  addTrauma(a) { this.trauma = Math.min(1, this.trauma + a * (settings().reduceShake ? 0.25 : 1)); }

  /** Offset aditivo para la cámara: trauma^2 * ruido suave (sumas de senos), decae solo. */
  update(realDt) {
    if (this.freeze > 0) this.freeze -= realDt;
    if (this.trauma <= 0) return { x: 0, y: 0, r: 0 };
    this.trauma = Math.max(0, this.trauma - 1.3 * realDt);
    const s = this.trauma * this.trauma;
    this.t += realDt * 30;
    return { x: 16 * s * Math.sin(this.t * 1.7), y: 10 * s * Math.sin(this.t * 2.3 + 1), r: 0.03 * s * Math.sin(this.t * 1.1) };
  }

  hitStop(d) { this.freeze = Math.max(this.freeze, d); }

  /** Paquete de feedback proporcional a la importancia del evento. */
  feedback(tier, x, y, color = 0xffffff) {
    const t = TIERS[tier];
    this.addTrauma(t.trauma);
    if (t.stop) this.hitStop(t.stop);
    this.spark(x, y, color, t.parts);
  }

  emitter(color) {
    let e = this.emitters.get(color);
    if (!e) {
      e = this.scene.add.particles(0, 0, 'fx', {
        frame: 'spark', lifespan: { min: 220, max: 520 }, speed: { min: 120, max: 420 }, scale: { start: 0.35, end: 0 },
        gravityY: 500, blendMode: 'ADD', tint: color, emitting: false,
      }).setDepth(30);
      this.emitters.set(color, e);
    }
    return e;
  }
  spark(x, y, color, n) { this.emitter(color).explode(n, x, y); }

  /** Anillo expansivo (onda de impacto) con ease-out. */
  ring(x, y, color, r) {
    const img = this.scene.add.image(x, y, 'fx', 'ring').setTint(color).setBlendMode('ADD').setDepth(31).setAlpha(0.9).setScale(0.1);
    this.scene.tweens.add({ targets: img, scale: r / 64, alpha: 0, duration: 320, ease: 'Cubic.Out', onComplete: () => img.destroy() });
  }

  /** Flash blanco 1-3 frames (o un tinte estático si se reduce el parpadeo). */
  flash(sprite, ms = 90) {
    if (settings().reduceFlash) sprite.setTint(0xffb0b0); else sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(ms, () => { if (sprite.active) sprite.clearTint(); });
  }

  /** Squash & stretch con vuelta elástica. */
  squash(sprite, sx = 1.25, sy = 0.78) {
    this.scene.tweens.killTweensOf(sprite);
    sprite.setScale(sx, sy);
    this.scene.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.Out' });
  }

  number(x, y, text, big = false, color = '#ffffff') {
    const tx = this.scene.add.text(x + (Math.random() - 0.5) * 26, y, String(text), {
      fontFamily: FONT, fontSize: (big ? 36 : 24) + 'px', color, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(50);
    this.scene.tweens.add({ targets: tx, y: y - 56, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => tx.destroy() });
  }
}
