import Phaser from 'phaser';
import { Fighter, GROUND } from '../fighter.js';
import { AI } from '../ai.js';
import { CHARS, session, DIFFS } from '../characters.js';
import { sfx } from '../audio.js';

const W = 960, H = 540, WORLD_W = 1800;
const FONT = 'Impact, "Arial Black", sans-serif';

const KEYS_1P = { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'J', kick: 'K', blast: 'L', special: 'U', charge: 'I', transform: 'O', dash: 'SPACE' };
const KEYS_P1_VS = { left: 'A', right: 'D', up: 'W', down: 'S', punch: 'F', kick: 'G', blast: 'H', special: 'T', charge: 'R', transform: 'Y', dash: 'Q' };
const KEYS_P2_VS = { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN', punch: 'J', kick: 'K', blast: 'L', special: 'U', charge: 'I', transform: 'O', dash: 'SHIFT' };
const TAP = ['up', 'punch', 'kick', 'blast', 'special', 'transform', 'dash'];

const STAGES = [
  { top: 0x2a6fd6, bot: 0xbfe6ff, sun: 0xfff3b0, far: 0x7aa6c8, near: 0x4d7b6a, ground: 0x7a5a3a, edge: 0xa9825a, name: 'LLANURA' },
  { top: 0x2a0f3d, bot: 0xff7a3d, sun: 0xffd27a, far: 0x7a2f4f, near: 0x3d1a33, ground: 0x4a2a28, edge: 0x7a4538, name: 'ATARDECER' },
  { top: 0x0b3b2e, bot: 0x9cf0a4, sun: 0xeaffd0, far: 0x2f8f6a, near: 0x1d5f4c, ground: 0x2f5a3a, edge: 0x5f9a56, name: 'ISLA VERDE' },
];

export class FightScene extends Phaser.Scene {
  constructor() { super('fight'); }

  init() {
    this.worldW = WORLD_W;
    this.projectiles = [];
    this.parts = []; this.rings = [];
    this.phase = 'intro'; this.phaseT = 0; this.round = 1;
    this.wins = [0, 0]; this.timeLeft = 60; this.freeze = 0; this.slow = 1;
    this.paused = false; this.trail = [1, 1];
    this.beams = [];
  }

  create() {
    const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
    this.buildBackground(stage);
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    this.shadowG = this.add.graphics().setDepth(5);
    this.fx = this.add.graphics().setDepth(20).setBlendMode(Phaser.BlendModes.ADD);
    this.fxNorm = this.add.graphics().setDepth(21);
    this.hud = this.add.graphics().setDepth(100).setScrollFactor(0);

    const d1 = CHARS[session.p1], d2 = CHARS[session.p2];
    this.f1 = new Fighter(this, d1, 0);
    this.f2 = new Fighter(this, d2, 1);
    this.fighters = [this.f1, this.f2];
    this.ai = session.mode === 1 ? new AI(session.diff) : null;

    const kb = this.input.keyboard;
    const mk = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, kb.addKey(Phaser.Input.Keyboard.KeyCodes[v])]));
    if (session.mode === 1) this.k1 = mk(KEYS_1P);
    else { this.k1 = mk(KEYS_P1_VS); this.k2 = mk(KEYS_P2_VS); }
    this.kEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.kP = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.kEnter = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.kBack = kb.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    const t = (s, size, color = '#fff') => this.add.text(0, 0, s, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000', strokeThickness: Math.max(3, size / 9) }).setScrollFactor(0).setDepth(110);
    this.tTimer = t('60', 46, '#ffe066').setOrigin(0.5, 0).setPosition(W / 2, 8);
    this.tName1 = t(d1.name, 22).setPosition(34, 50);
    this.tName2 = t(session.mode === 1 ? d2.name + ' (CPU)' : d2.name, 22).setOrigin(1, 0).setPosition(W - 34, 50);
    this.tCombo1 = t('', 34, '#ffb347').setPosition(34, 140).setAlpha(0);
    this.tCombo2 = t('', 34, '#ffb347').setOrigin(1, 0).setPosition(W - 34, 140).setAlpha(0);
    this.tSuper1 = t('SÚPER', 20, '#ffe066').setPosition(34, 100).setVisible(false);
    this.tSuper2 = t('SÚPER', 20, '#ffe066').setOrigin(1, 0).setPosition(W - 34, 100).setVisible(false);
    this.tBanner = t('', 96, '#fff').setOrigin(0.5).setPosition(W / 2, H / 2 - 40).setAlpha(0);
    this.tSub = t('', 30, '#ffe066').setOrigin(0.5).setPosition(W / 2, H / 2 + 30).setAlpha(0);
    const help = session.mode === 1
      ? 'A/D mover · W saltar · S guardia · J/K golpe/patada · L ráfaga · U rayo · I cargar ki · O transformar (ki 100) · ESPACIO esquiva'
      : 'J1: WASD+F G H T R Y Q   ·   J2: flechas+J K L U I O SHIFT   (golpe/patada/ráfaga/rayo/cargar/transformar/esquiva)';
    this.tHelp = this.add.text(W / 2, H - 14, help, { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffffcc', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(110);
    this.tPause = t('PAUSA', 80).setOrigin(0.5).setPosition(W / 2, H / 2).setVisible(false);
    this.tStage = this.add.text(W / 2, 66, stage.name, { fontFamily: FONT, fontSize: '14px', color: '#ffffffaa' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110);

    this.cameras.main.fadeIn(300);
    this.startRound();
  }

  // ---------- Fondo ----------
  buildBackground(s) {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-10);
    const lerp = (a, b, t) => {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(bb * t + ab * (1 - t));
    };
    for (let i = 0; i < 36; i++) { sky.fillStyle(lerp(s.top, s.bot, i / 35), 1); sky.fillRect(0, i * (GROUND / 36), W, GROUND / 36 + 1); }
    const sun = this.add.graphics().setScrollFactor(0.04).setDepth(-9);
    sun.fillStyle(s.sun, 0.25); sun.fillCircle(700, 140, 90); sun.fillStyle(s.sun, 0.9); sun.fillCircle(700, 140, 46);
    const clouds = this.add.graphics().setScrollFactor(0.12).setDepth(-8);
    clouds.fillStyle(0xffffff, 0.22);
    const rnd = new Phaser.Math.RandomDataGenerator(['ki' + s.name]);
    for (let i = 0; i < 14; i++) { const cx = rnd.between(0, WORLD_W), cy = rnd.between(40, 190); clouds.fillEllipse(cx, cy, rnd.between(90, 190), rnd.between(22, 40)); }
    const mtn = (sf, color, base, hmin, hmax, step, depth) => {
      const g = this.add.graphics().setScrollFactor(sf).setDepth(depth); g.fillStyle(color, 1);
      for (let x = -100; x < WORLD_W * sf + W + 200; x += step) {
        const h = rnd.between(hmin, hmax), w = step * rnd.realInRange(0.9, 1.7);
        g.fillTriangle(x - w / 2, base, x + w / 2, base, x + rnd.between(-20, 20), base - h);
      }
      g.fillRect(-200, base - 2, WORLD_W + 600, 200);
    };
    mtn(0.25, s.far, GROUND + 4, 90, 210, 130, -7);
    mtn(0.55, s.near, GROUND + 4, 50, 130, 90, -6);
    const gr = this.add.graphics().setDepth(0);
    gr.fillStyle(s.ground, 1); gr.fillRect(0, GROUND, WORLD_W, H - GROUND);
    gr.fillStyle(s.edge, 1); gr.fillRect(0, GROUND, WORLD_W, 8);
    gr.fillStyle(0x000000, 0.18); gr.fillRect(0, GROUND + 8, WORLD_W, 4);
    for (let i = 0; i < 90; i++) { // piedras y grietas
      const x = rnd.between(0, WORLD_W), y = rnd.between(GROUND + 18, H - 8), w = rnd.between(8, 38);
      gr.fillStyle(0x000000, 0.14); gr.fillEllipse(x, y, w, w * 0.32);
      gr.fillStyle(0xffffff, 0.06); gr.fillEllipse(x, y - 2, w * 0.7, w * 0.2);
    }
  }

  // ---------- Flujo de rondas ----------
  startRound() {
    const mid = WORLD_W / 2;
    this.f1.reset(mid - 170, 1); this.f2.reset(mid + 170, -1);
    this.f1.ki = this.f1.ki; this.projectiles.length = 0; this.beams.length = 0;
    this.timeLeft = 60; this.slow = 1; this.phase = 'intro'; this.phaseT = 0; this.trail = [1, 1];
    this.cameras.main.scrollX = mid - W / 2;
    this.banner(`RONDA ${this.round}`, '', 1.1);
    sfx.bell();
  }

  banner(text, sub = '', hold = 1) {
    this.tBanner.setText(text).setAlpha(1).setScale(2.2);
    this.tSub.setText(sub).setAlpha(sub ? 1 : 0);
    this.tweens.killTweensOf(this.tBanner);
    this.tweens.add({ targets: this.tBanner, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: [this.tBanner, this.tSub], alpha: 0, delay: hold * 1000, duration: 250 });
  }

  endRound(winner, reason) {
    this.phase = 'end'; this.phaseT = 0;
    if (winner >= 0) this.wins[winner]++;
    this.winner = winner;
    const name = winner >= 0 ? this.fighters[winner].def.name : null;
    this.banner(reason === 'ko' ? 'K.O.' : '¡TIEMPO!', name ? `GANA ${name}` : 'EMPATE', 2.4);
    if (this.wins[0] >= 2 || this.wins[1] >= 2) this.matchWinner = this.wins[0] >= 2 ? 0 : 1;
    else this.matchWinner = -1;
  }

  // ---------- Entrada ----------
  readInput(keys, map) {
    const Key = Phaser.Input.Keyboard;
    const inp = { left: keys.left.isDown, right: keys.right.isDown, down: keys.down.isDown, charge: keys.charge.isDown };
    for (const a of TAP) inp[a] = Key.JustDown(keys[a]);
    return inp;
  }

  // ---------- Bucle ----------
  update(time, delta) {
    const Key = Phaser.Input.Keyboard;
    if (Key.JustDown(this.kEsc)) { this.scene.start('menu'); return; }
    if (Key.JustDown(this.kP)) { this.paused = !this.paused; this.tPause.setVisible(this.paused); }
    if (this.paused) return;
    let dt = Math.min(delta / 1000, 0.033);
    if (this.freeze > 0) { this.freeze -= dt; this.render(dt); return; }
    dt *= this.slow;
    this.phaseT += dt;

    const empty = { left: false, right: false, down: false, charge: false, up: false, punch: false, kick: false, blast: false, special: false, transform: false, dash: false };
    let i1 = empty, i2 = empty;
    if (this.phase === 'fight') {
      i1 = this.readInput(this.k1);
      i2 = this.ai ? this.ai.think(dt, this.f2, this.f1, this) : this.readInput(this.k2);
    } else {
      // vaciar teclas pulsadas durante las pausas
      for (const k of Object.values(this.k1)) Key.JustDown(k);
      if (this.k2) for (const k of Object.values(this.k2)) Key.JustDown(k);
    }

    if (this.phase === 'intro' && this.phaseT > 1.5) { this.phase = 'fight'; this.banner('¡PELEA!', '', 0.6); sfx.fight(); }
    if (this.phase === 'fight') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        const r1 = this.f1.hp / this.f1.maxHp, r2 = this.f2.hp / this.f2.maxHp;
        this.endRound(Math.abs(r1 - r2) < 0.001 ? -1 : r1 > r2 ? 0 : 1, 'time');
      }
    }

    this.f1.update(dt, i1, this.f2, this);
    this.f2.update(dt, i2, this.f1, this);
    this.separate();
    this.updateProjectiles(dt);
    this.updateFx(dt);
    this.updateCamera(dt);

    if (this.phase === 'fight' && (this.f1.dead || this.f2.dead)) {
      this.endRound(this.f1.dead && this.f2.dead ? -1 : this.f1.dead ? 1 : 0, 'ko');
      this.slow = 0.35; sfx.ko();
    }
    if (this.phase === 'end') {
      if (this.phaseT > 1.2 && this.slow < 1) this.slow = Math.min(1, this.slow + dt * 0.8);
      if (this.matchWinner >= 0) {
        if (this.phaseT > 2.6 && !this.matchShown) {
          this.matchShown = true; this.slow = 1;
          this.tBanner.setText(`${this.fighters[this.matchWinner].def.name} GANA`).setAlpha(1).setScale(1);
          this.tSub.setText('ENTER: revancha  ·  ESC: menú').setAlpha(1);
          this.tweens.killTweensOf(this.tBanner);
          this.f1.state !== 'ko' && this.f1.setState('win'); this.f2.state !== 'ko' && this.f2.setState('win');
        }
        if (this.matchShown && Key.JustDown(this.kEnter)) { this.scene.restart(); }
      } else if (this.phaseT > 3.2) { this.round++; this.startRound(); }
    }
    this.render(dt);
  }

  separate() {
    const a = this.f1, b = this.f2;
    if (a.grounded === b.grounded || Math.abs(a.y - b.y) < 50) {
      const min = 36, dx = b.x - a.x;
      if (Math.abs(dx) < min && !['down', 'ko'].includes(a.state) && !['down', 'ko'].includes(b.state)) {
        const push = (min - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
        a.x -= push; b.x += push;
      }
    }
    // mantener a ambos dentro de la pantalla
    const cam = this.cameras.main, lo = cam.scrollX + 46, hi = cam.scrollX + W - 46;
    for (const f of this.fighters) f.x = Math.max(lo, Math.min(hi, f.x));
  }

  updateCamera(dt) {
    const cam = this.cameras.main;
    const target = Phaser.Math.Clamp((this.f1.x + this.f2.x) / 2 - W / 2, 0, WORLD_W - W);
    cam.scrollX += (target - cam.scrollX) * Math.min(1, dt * 7);
  }

  // ---------- Proyectiles y rayos ----------
  fireball(owner, dmg) {
    const f = owner.facing;
    this.projectiles.push({ x: owner.x + f * 40, y: owner.y - 86, vx: f * (560 * (owner.sup ? 1.2 : 1)), owner, dmg, def: owner.def, r: 15, life: 2.2 });
  }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      p.x += p.vx * dt; p.life -= dt;
      if (p.x < -50 || p.x > WORLD_W + 50) p.life = 0;
      for (const f of this.fighters) {
        if (f === p.owner || p.life <= 0) continue;
        const hu = f.hurtbox();
        if (p.x + p.r > hu.x0 && p.x - p.r < hu.x1 && p.y + p.r > hu.y0 && p.y - p.r < hu.y1) {
          const r = f.takeHit(p.owner, { dmg: p.dmg, kb: 260, stun: 0.4, heavy: true, dir: Math.sign(p.vx), hx: p.x, hy: p.y, noScale: false }, this);
          if (r) { p.life = 0; this.explosion(p.x, p.y, p.def.ki); }
        }
      }
    }
    for (let i = 0; i < this.projectiles.length; i++) for (let j = i + 1; j < this.projectiles.length; j++) {
      const a = this.projectiles[i], b = this.projectiles[j];
      if (a.owner !== b.owner && a.life > 0 && b.life > 0 && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
        a.life = b.life = 0; this.explosion((a.x + b.x) / 2, a.y, 0xffffff);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
  }

  beamHit(owner, opp, last) {
    const f = owner.facing, x0 = owner.x + f * 30;
    const y = owner.y - 86;
    this.beams.push({ owner, born: this.time.now });
    // destruye proyectiles enemigos
    for (const p of this.projectiles) if (p.owner !== owner && Math.sign(p.x - x0) === f && Math.abs(p.y - y) < 40) { p.life = 0; this.explosion(p.x, p.y, 0xffffff); }
    const hu = opp.hurtbox();
    const inX = f > 0 ? hu.x1 > x0 : hu.x0 < x0;
    if (inX && hu.y1 > y - 34 && hu.y0 < y + 34) {
      opp.takeHit(owner, { dmg: (last ? 10 : 5) * owner.pow, kb: last ? 520 : 140, stun: 0.3, launch: last, beam: true, dir: f, hx: opp.x, hy: y, quiet: !last, noScale: true }, this);
      if (!last) { opp.vx = f * 60; this.shake(0.006, 0.1); }
    }
  }

  beamRect(owner) {
    if (owner.state !== 'special' || owner.stateT < 0.6 || owner.stateT > 1.4) return null;
    const grow = Math.min(1, (owner.stateT - 0.6) / 0.1);
    const fade = owner.stateT > 1.2 ? 1 - (owner.stateT - 1.2) / 0.2 : 1;
    const len = 1400 * grow, f = owner.facing, x0 = owner.x + f * 30;
    return { x0, x1: x0 + f * len, y: owner.y - 86, th: 54 * fade };
  }

  transformFx(f) {
    this.ring(f.x, f.y - 50, f.def.aura, 260); this.ring(f.x, f.y - 50, 0xffffff, 160);
    this.spark(f.x, f.y - 60, f.def.aura, 40); this.shake(0.018, 0.4); sfx.explode();
    this.cameras.main.flash(250, 255, 255, 255);
  }

  // ---------- Efectos ----------
  hitstop(t) { this.freeze = Math.max(this.freeze, t); }
  shake(i, d) { this.cameras.main.shake(d * 1000, i); }
  spark(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 360;
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.3 + Math.random() * 0.25, max: 0.55, color, size: 2 + Math.random() * 3, grav: 500 });
    }
  }
  particle(x, y, color, vy) { this.parts.push({ x, y, vx: (Math.random() - 0.5) * 30, vy, life: 0.5, max: 0.5, color, size: 2 + Math.random() * 3, grav: 0 }); }
  dust(x, y) { for (let i = 0; i < 6; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 30, y: y - 2, vx: (Math.random() - 0.5) * 160, vy: -30 - Math.random() * 60, life: 0.4, max: 0.4, color: 0xddccaa, size: 4 + Math.random() * 4, grav: 0, norm: true }); }
  ring(x, y, color, r) { this.rings.push({ x, y, color, r, t: 0, max: 0.3 }); }
  explosion(x, y, color) { this.spark(x, y, color, 16); this.ring(x, y, color, 70); this.ring(x, y, 0xffffff, 40); sfx.explode(); this.shake(0.006, 0.15); }
  damageText(x, y, n, combo) {
    const tx = this.add.text(x, y, String(n), { fontFamily: FONT, fontSize: (18 + Math.min(14, n)) + 'px', color: combo > 3 ? '#ff7a3d' : '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: tx, y: y - 50, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => tx.destroy() });
  }

  updateFx(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.max);
    this.beams.length = 0;
  }

  // ---------- Dibujo ----------
  render() {
    const g = this.shadowG, fx = this.fx, fn = this.fxNorm;
    g.clear(); fx.clear(); fn.clear();
    for (const f of this.fighters) f.draw(g, fx, this);
    for (const p of this.projectiles) {
      const c = p.def;
      fx.fillStyle(c.ki, 0.25); fx.fillCircle(p.x, p.y, p.r * 2.2);
      fx.fillStyle(c.ki, 0.7); fx.fillCircle(p.x, p.y, p.r * 1.3);
      fx.fillStyle(c.kiCore, 1); fx.fillCircle(p.x, p.y, p.r * 0.7);
      fx.fillStyle(c.ki, 0.35); fx.fillEllipse(p.x - Math.sign(p.vx) * 24, p.y, 60, p.r);
    }
    for (const f of this.fighters) {
      const b = this.beamRect(f);
      if (!b) continue;
      const x = Math.min(b.x0, b.x1), w = Math.abs(b.x1 - b.x0), flick = 1 + Math.sin(this.time.now / 25) * 0.08;
      fx.fillStyle(f.def.ki, 0.28); fx.fillRect(x, b.y - b.th * 0.9 * flick, w, b.th * 1.8 * flick);
      fx.fillStyle(f.def.ki, 0.65); fx.fillRect(x, b.y - b.th * 0.55, w, b.th * 1.1);
      fx.fillStyle(f.def.kiCore, 1); fx.fillRect(x, b.y - b.th * 0.28, w, b.th * 0.56);
      fx.fillStyle(f.def.kiCore, 0.9); fx.fillCircle(b.x0, b.y, b.th * 0.9);
      fx.fillStyle(f.def.ki, 0.5); fx.fillCircle(b.x0, b.y, b.th * 1.5);
    }
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      (p.norm ? fn : fx).fillStyle(p.color, a * (p.norm ? 0.5 : 1)); (p.norm ? fn : fx).fillCircle(p.x, p.y, p.size * (0.4 + a * 0.6));
    }
    for (const r of this.rings) {
      const k = r.t / r.max;
      fx.lineStyle(5 * (1 - k) + 1, r.color, 1 - k); fx.strokeCircle(r.x, r.y, r.r * (0.25 + k * 0.75));
    }
    this.drawHud();
  }

  drawHud() {
    const h = this.hud; h.clear();
    const bw = 400, bx1 = 30, bx2 = W - 30 - bw, by = 20;
    const bars = [[this.f1, bx1, 1, 0], [this.f2, bx2, -1, 1]];
    for (const [f, x, dir, i] of bars) {
      const ratio = f.hp / f.maxHp;
      this.trail[i] = Math.max(ratio, this.trail[i] - 0.4 * (1 / 60));
      h.fillStyle(0x000000, 0.65); h.fillRect(x - 4, by - 4, bw + 8, 28 + 8 + 14);
      h.fillStyle(0x3a0d0d, 1); h.fillRect(x, by, bw, 26);
      const fillW = (v) => bw * v;
      const drawBar = (v, c) => { h.fillStyle(c, 1); if (dir > 0) h.fillRect(x, by, fillW(v), 26); else h.fillRect(x + bw - fillW(v), by, fillW(v), 26); };
      drawBar(this.trail[i], 0xffffff);
      const col = ratio > 0.5 ? 0x4ade4a : ratio > 0.25 ? 0xf5c518 : 0xe53935;
      drawBar(ratio, col);
      h.fillStyle(0xffffff, 0.22); if (dir > 0) h.fillRect(x, by, fillW(ratio), 8); else h.fillRect(x + bw - fillW(ratio), by, fillW(ratio), 8);
      // ki
      const kk = f.ki / 100, ky = by + 32;
      const kw = bw * 0.65, kx = dir > 0 ? x : x + bw - kw;
      h.fillStyle(0x08122a, 1); h.fillRect(kx, ky, kw, 10);
      const kc = f.ki >= 100 ? 0xffd23a : f.ki >= 50 ? 0x4de1ff : 0x2f7bff;
      h.fillStyle(kc, 1); h.fillRect(dir > 0 ? kx : kx + kw - kw * kk, ky, kw * kk, 10);
      // marca de 50 de ki
      h.fillStyle(0xffffff, 0.8); const mx = dir > 0 ? x + bw * 0.65 * 0.5 : x + bw - bw * 0.65 * 0.5; h.fillRect(mx - 1, ky - 2, 2, 14);
      // rondas
      for (let r = 0; r < 2; r++) {
        const cx = dir > 0 ? x + bw - 14 - r * 22 : x + 14 + r * 22;
        h.fillStyle(0x000000, 0.8); h.fillCircle(cx, ky + 5, 8);
        h.fillStyle(this.wins[i] > r ? 0xffd23a : 0x333344, 1); h.fillCircle(cx, ky + 5, 6);
      }
    }
    this.tTimer.setText(String(Math.ceil(this.timeLeft)));
    this.tSuper1.setVisible(this.f1.sup); this.tSuper2.setVisible(this.f2.sup);
    for (const [f, t] of [[this.f1, this.tCombo1], [this.f2, this.tCombo2]]) {
      if (f.combo >= 2 && f.comboT > 0) t.setText(`${f.combo} GOLPES`).setAlpha(1); else t.setAlpha(0);
    }
    if (this.phase === 'fight' && this.round > 1) this.tHelp.setAlpha(0.35); else this.tHelp.setAlpha(1);
  }
}
void DIFFS;
