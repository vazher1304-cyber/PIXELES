import Phaser from 'phaser';
import { VIEW, WORLD_W, GROUND_Y, TUNING } from '../config.js';
import { CHARS, STAGES, STAGE_INFO, session } from '../data/characters.js';
import { Fighter } from '../fighter/Fighter.js';
import { Brain } from '../ai/brain.js';
import { HumanInput, ACTIONS } from '../systems/actions.js';
import { Juice } from '../systems/juice.js';
import { sfx, musicSys } from '../systems/audio.js';
import { settings } from '../systems/settings.js';

const EMPTY = () => ({ held: Object.fromEntries(ACTIONS.map((a) => [a, false])), pressed: Object.fromEntries(ACTIONS.map((a) => [a, false])) });

export class FightScene extends Phaser.Scene {
  constructor() { super('fight'); }

  // Estado de la partida: se reinicia en init() (no en el constructor) para que un reinicio empiece limpio.
  init() {
    this.phase = 'intro'; this.phaseT = 0; this.round = 1; this.wins = [0, 0];
    this.timeLeft = TUNING.roundTime; this.matchWinner = -1; this.musicLevel = -1; this.lastSecond = -1;
    this.zoom = 1; this.camX = WORLD_W / 2; this.frozen = false; this.slowT = 0;
    this.latch = [{ held: EMPTY().held, pressed: EMPTY().pressed }, { held: EMPTY().held, pressed: EMPTY().pressed }];
  }

  create() {
    const stage = Phaser.Utils.Array.GetRandom(STAGES), info = STAGE_INFO[stage];
    this.buildStage(stage, info);
    this.physics.world.setBounds(0, -1500, WORLD_W, 1500 + GROUND_Y);
    this.viewBounds = new Phaser.Geom.Rectangle(0, -1500, WORLD_W, 1500 + GROUND_Y);
    this.juice = new Juice(this);
    this.music = (n) => musicSys.setIntensity(n);
    this.dustEm = this.add.particles(0, 0, 'fx', { frame: 'glow', lifespan: 420, speed: { min: 20, max: 110 }, scale: { start: 0.22, end: 0.05 }, alpha: { start: 0.45, end: 0 }, tint: 0xddccaa, emitting: false }).setDepth(11);

    const anims = this.cache.json.get('anims');
    this.f1 = new Fighter(this, CHARS[session.p1], 0, anims);
    this.f2 = new Fighter(this, CHARS[session.p2], 1, anims);
    this.fighters = [this.f1, this.f2];
    for (const f of this.fighters) f.sprite.body.setBoundsRectangle(this.viewBounds);

    // colisión entre luchadores solo cuando ambos están en el suelo y en pie (se pueden cruzar saltando)
    this.physics.add.collider(this.f1.sprite, this.f2.sprite, null, () => this.f1.grounded && this.f2.grounded
      && !['down', 'ko', 'launched'].includes(this.f1.stateName) && !['down', 'ko', 'launched'].includes(this.f2.stateName));

    // proyectiles (grupo de Arcade sin gravedad) + overlaps registrados UNA vez
    this.projectiles = this.physics.add.group({ allowGravity: false });
    for (const f of this.fighters) {
      this.physics.add.overlap(this.projectiles, f.sprite, (a, b) => this.projectileHit(a.owner !== undefined ? a : b, f));
    }

    // entradas: teclado por perfil + gamepad; la CPU usa el mismo formato de acciones
    this.in1 = new HumanInput(this, session.mode === 1 ? 'solo' : 'p1', 0);
    this.in2 = session.mode === 1 ? null : new HumanInput(this, 'p2', 1);
    this.brain = session.mode === 1 ? new Brain(session.diff, () => this.projectiles.getChildren()) : null;
    this.kPause = this.input.keyboard.addKey('P'); this.kEsc = this.input.keyboard.addKey('ESC'); this.kEnter = this.input.keyboard.addKey('ENTER');
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.pausePrev = false;

    this.scene.launch('hud');
    this.events.emit('hud:stage', info.name);
    this.physics.world.on('worldstep', this.fixedUpdate, this);
    this.events.once('shutdown', () => { this.physics.world.off('worldstep', this.fixedUpdate, this); this.scene.stop('hud'); this.physics.world.timeScale = 1; });
    this.cameras.main.fadeIn(300);
    this.time.delayedCall(60, () => this.startRound());
  }

  buildStage(stage, info) {
    const L = (k) => `stage_${stage}_${k}`;
    this.add.image(480, 270, L('sky')).setScrollFactor(0).setDepth(-20).setDisplaySize(1760, 990);
    const layer = (key, h, sf, depth, yOff = 0) => this.add.tileSprite(-1700, GROUND_Y + yOff - h, 5300, h, key).setOrigin(0, 0).setScrollFactor(sf, 1).setDepth(depth);
    layer(L('far'), 260, 0.25, -15, 4); layer(L('near'), 180, 0.55, -14, 4);
    this.add.tileSprite(-1700, GROUND_Y, 5300, 110, L('ground')).setOrigin(0, 0).setDepth(0);
    this.add.rectangle(-1700, GROUND_Y + 110, 5300, 1500, info.ground).setOrigin(0, 0).setDepth(0);
  }

  // ---------- flujo de rondas ----------
  startRound() {
    const mid = WORLD_W / 2;
    this.f1.reset(mid - 170, 1); this.f2.reset(mid + 170, -1);
    for (const p of this.projectiles.getChildren().slice()) p.destroy();
    this.timeLeft = TUNING.roundTime; this.phase = 'intro'; this.phaseT = 0; this.physics.world.timeScale = 1;
    this.camX = mid; this.zoom = 1;
    this.events.emit('hud:banner', `RONDA ${this.round}`, '', 1.1);
    this.events.emit('hud:wins', 0, this.wins[0]); this.events.emit('hud:wins', 1, this.wins[1]);
    this.events.emit('hud:help', this.helpText(), this.round === 1 ? 1 : 0.35);
    sfx.bell(); this.setMusic(0);
  }

  helpText() {
    return session.mode === 1
      ? 'A/D mover · W saltar · S guardia · J/K golpe/patada · L ráfaga · U rayo · I cargar ki · O transformar (ki 100) · ESPACIO esquiva · P pausa'
      : 'J1: WASD + F G H T R Y Q  ·  J2: flechas + J K L U I O SHIFT  ·  P pausa';
  }

  endRound(winner, reason) {
    this.phase = 'end'; this.phaseT = 0;
    if (winner >= 0) this.wins[winner]++;
    this.events.emit('hud:wins', 0, this.wins[0]); this.events.emit('hud:wins', 1, this.wins[1]);
    this.matchWinner = this.wins[0] >= 2 ? 0 : this.wins[1] >= 2 ? 1 : -1;
    this.events.emit('hud:banner', reason === 'ko' ? 'K.O.' : '¡TIEMPO!', winner >= 0 ? `GANA ${this.fighters[winner].def.name}` : 'EMPATE', 2.4);
    if (reason === 'ko') { this.physics.world.timeScale = 2.8; this.slowT = 1.3; sfx.ko(); }
    this.setMusic(0);
  }

  setMusic(n) { if (n !== this.musicLevel) { this.musicLevel = n; musicSys.setIntensity(n); } }

  // ---------- bucle ----------
  update(time, delta) {
    const rdt = Math.min(delta / 1000, 0.05);
    // pausa
    const pad = this.input.gamepad && this.input.gamepad.getPad(0);
    const padStart = !!(pad && pad.buttons[9] && pad.buttons[9].pressed);
    if (Phaser.Input.Keyboard.JustDown(this.kPause) || Phaser.Input.Keyboard.JustDown(this.kEsc) || (padStart && !this.pausePrev)) {
      this.scene.launch('pause'); this.scene.pause(); return;
    }
    this.pausePrev = padStart;

    // las pulsaciones se acumulan entre ticks fijos para no perder ninguna (skill `input-systems`)
    this.latchInput(0, this.in1); if (this.in2) this.latchInput(1, this.in2);

    // hit-stop en tiempo real: congela la simulación, no la cámara ni las partículas
    const shake = this.juice.update(rdt);
    const wantFreeze = this.juice.freeze > 0;
    if (wantFreeze !== this.frozen) { this.frozen = wantFreeze; wantFreeze ? this.physics.world.pause() : this.physics.world.resume(); }

    if (this.slowT > 0) { this.slowT -= rdt; if (this.slowT <= 0) this.physics.world.timeScale = 1; }
    for (const f of this.fighters) f.renderFx();
    this.updateCamera(rdt, shake);

    if (this.phase === 'end' && this.matchWinner >= 0 && this.matchShown) {
      const ok = Phaser.Input.Keyboard.JustDown(this.kEnter) || (pad && pad.buttons[0] && pad.buttons[0].pressed);
      if (ok) this.scene.restart();
    }
  }

  latchInput(i, src) {
    const fr = src.poll(), L = this.latch[i];
    L.held = fr.held;
    for (const a of ACTIONS) if (fr.pressed[a]) L.pressed[a] = true;
  }

  fixedUpdate(dt) {
    this.phaseT += dt;
    let i1 = EMPTY(), i2 = EMPTY();
    if (this.phase === 'fight') {
      const take = (i) => { const L = this.latch[i], out = { held: { ...L.held }, pressed: { ...L.pressed } }; for (const a of ACTIONS) L.pressed[a] = false; return out; };
      i1 = take(0);
      i2 = this.brain ? this.brain.poll(dt, this.f2, this.f1, this.time.now / 1000) : take(1);
    } else for (const L of this.latch) for (const a of ACTIONS) L.pressed[a] = false;

    if (this.phase === 'intro' && this.phaseT > 1.5) { this.phase = 'fight'; this.events.emit('hud:banner', '¡PELEA!', '', 0.6); sfx.fight(); this.setMusic(1); }
    if (this.phase === 'fight') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      const sec = Math.ceil(this.timeLeft);
      if (sec !== this.lastSecond) { this.lastSecond = sec; this.events.emit('hud:timer', sec); }
      const r = this.fighters.map((f) => f.hp / f.maxHp);
      this.setMusic(this.fighters.some((f) => f.isSuper) || Math.min(...r) < 0.3 ? 2 : 1);
      if (this.timeLeft <= 0) this.endRound(Math.abs(r[0] - r[1]) < 0.001 ? -1 : r[0] > r[1] ? 0 : 1, 'time');
    }

    this.f1.update(dt, i1); this.f2.update(dt, i2);
    this.updateProjectiles(dt);

    if (this.phase === 'fight' && (this.f1.dead || this.f2.dead)) this.endRound(this.f1.dead && this.f2.dead ? -1 : this.f1.dead ? 1 : 0, 'ko');
    if (this.phase === 'end') {
      if (this.matchWinner >= 0) {
        if (this.phaseT > 2.6 && !this.matchShown) {
          this.matchShown = true;
          this.events.emit('hud:banner', `${this.fighters[this.matchWinner].def.name} GANA`, 'ENTER / A: revancha  ·  P: pausa / menú', 0);
          for (const f of this.fighters) if (!f.dead) f.change('win');
        }
      } else if (this.phaseT > 3.2) { this.round++; this.startRound(); }
    }
  }

  // ---------- cámara (skill `camera-systems`: encuadre de varios objetivos) ----------
  updateCamera(dt, shake) {
    const cam = this.cameras.main, a = this.f1.x, b = this.f2.x;
    const need = Math.abs(a - b) + 440;
    const zT = Phaser.Math.Clamp(VIEW.w / need, 0.62, 1);
    const k = 1 - Math.exp(-6 * dt);                       // suavizado independiente de la frecuencia de cuadro
    this.zoom += (zT - this.zoom) * k;
    const half = VIEW.w / 2 / this.zoom;
    const targetX = Phaser.Math.Clamp((a + b) / 2, half, WORLD_W - half);
    this.camX += (targetX - this.camX) * (1 - Math.exp(-8 * dt));
    const cy = GROUND_Y - 170 / this.zoom;                 // mantiene el suelo en la misma altura de pantalla
    cam.setZoom(this.zoom).centerOn(this.camX + shake.x, cy + shake.y).setRotation(shake.r);
    // contención: ambos luchadores siempre visibles
    const left = this.camX - half + 50, right = this.camX + half - 50;
    this.viewBounds.x = Math.max(0, left - 0); this.viewBounds.width = Math.min(WORLD_W, right) - this.viewBounds.x;
  }

  // ---------- proyectiles, rayos y efectos ----------
  rectHits(x, y, w, h, target) {
    return this.physics.overlapRect(x, y, w, h, true, false).includes(target.sprite.body);
  }

  fireball(owner, dmg) {
    const f = owner.facing, def = owner.def;
    const p = this.projectiles.create(owner.x + f * 40, owner.y - 86, 'fx', 'glow').setBlendMode('ADD').setTint(def.ki).setScale(0.8).setDepth(18);
    p.body.setAllowGravity(false).setCircle(26, 38, 38).setVelocityX(f * 560 * (owner.isSuper ? 1.2 : 1));
    p.owner = owner; p.dmg = dmg; p.life = 2.2;
    p.core = this.add.image(p.x, p.y, 'fx', 'glow').setBlendMode('ADD').setTint(def.core).setScale(0.4).setDepth(19);
  }

  projectileHit(p, f) {
    if (!p.active || f === p.owner) return;
    const r = f.takeHit(p.owner, { dmg: p.dmg, kb: 260, stun: 0.4, heavy: true, tier: 'medium', dir: Math.sign(p.body.velocity.x), hx: p.x, hy: p.y });
    if (r) this.killProjectile(p, true);
  }

  killProjectile(p, boom) {
    if (boom) this.explosion(p.x, p.y, p.owner.def.ki);
    p.core?.destroy(); p.destroy();
  }

  updateProjectiles(dt) {
    const list = this.projectiles.getChildren().slice();
    for (const p of list) {
      p.life -= dt; if (p.core) p.core.setPosition(p.x, p.y);
      if (p.life <= 0 || p.x < -50 || p.x > WORLD_W + 50) { this.killProjectile(p, false); continue; }
    }
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {   // choque de ráfagas
      const a = list[i], b = list[j];
      if (a.active && b.active && a.owner !== b.owner && Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < 34) {
        this.explosion((a.x + b.x) / 2, a.y, 0xffffff); this.killProjectile(a, false); this.killProjectile(b, false);
      }
    }
  }

  beamHit(owner, opp, last) {
    const f = owner.facing, x0 = owner.x + f * 30, y = owner.y - 86, len = 1500;
    const bx = f > 0 ? x0 : x0 - len;
    for (const p of this.projectiles.getChildren().slice()) {      // el rayo destruye proyectiles rivales
      if (p.owner !== owner && Math.sign(p.x - x0) === f && Math.abs(p.y - y) < 40) { this.explosion(p.x, p.y, 0xffffff); this.killProjectile(p, false); }
    }
    if (this.rectHits(bx, y - 34, len, 68, opp)) {
      opp.takeHit(owner, { dmg: (last ? 10 : 5) * owner.pow, kb: last ? 520 : 140, stun: 0.3, launch: last, beam: true, dir: f, hx: opp.x, hy: y, quiet: !last, noScale: true, tier: 'large' });
      if (!last) { opp.vx(f * 60); this.juice.addTrauma(0.12); }
    }
  }

  transformFx(f) {
    const J = this.juice, c = f.def.aura;
    J.ring(f.x, f.y - 50, c, 520); J.ring(f.x, f.y - 50, 0xffffff, 320);
    J.spark(f.x, f.y - 60, c, 40); J.addTrauma(0.9);
    if (!settings().reduceFlash) this.cameras.main.flash(250, 255, 255, 255);
    sfx.explode();
    const o = f.opp;
    if (Math.abs(o.x - f.x) < 260 && o.grounded && !['down', 'ko'].includes(o.stateName)) {   // onda expansiva
      o.vx(Math.sign(o.x - f.x || 1) * 520); o.stun = 0.35; o.change('hurt');
    }
  }

  explosion(x, y, color) {
    const J = this.juice;
    J.spark(x, y, color, 16); J.ring(x, y, color, 130); J.ring(x, y, 0xffffff, 80); J.addTrauma(0.3); sfx.explode();
  }

  dust(x, y) { this.dustEm.explode(6, x, y - 2); }
}
