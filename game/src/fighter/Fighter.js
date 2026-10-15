import { STATES } from './states.js';
import { MOVES, KI } from '../data/moves.js';
import { TUNING, GROUND_Y, WORLD_W } from '../config.js';
import { sfx } from '../systems/audio.js';

const ACTIONS_BUFFERED = ['punch', 'kick', 'blast', 'special', 'transform', 'dash', 'up'];
const FREE = new Set(['idle', 'walk', 'block', 'charge', 'jump']);
const FW = 256, FEET = 180;

export class Fighter {
  constructor(scene, def, index, anims) {
    this.sc = scene; this.def = def; this.index = index; this.maxHp = def.hp; this.anims = anims;
    const s = (this.sprite = scene.physics.add.sprite(0, 0, def.id, 'idle_0'));
    s.setOrigin(0.5, FEET / 192).setDepth(10);
    const w = 44 * def.scale, h = 114 * def.scale;
    s.body.setSize(w, h, false).setOffset((FW - w) / 2, FEET - h);   // hitbox ajustada al arte
    s.body.setCollideWorldBounds(true).setMaxVelocity(1000, TUNING.maxFall);
    this.shadow = scene.add.ellipse(0, GROUND_Y + 3, 60, 12, 0x000000, 0.3).setDepth(5);
    this.glow = scene.add.image(0, 0, 'fx', 'glow').setBlendMode('ADD').setTint(def.aura).setDepth(9).setVisible(false);
    this.beam = [0, 1, 2].map((i) => scene.add.image(0, 0, 'fx', i === 2 ? 'glow' : 'beam').setBlendMode('ADD').setDepth(19).setVisible(false));
    this.flames = scene.add.particles(0, 0, 'fx', {
      frame: 'flame', lifespan: 450, speedY: { min: -170, max: -90 }, speedX: { min: -30, max: 30 },
      scale: { start: 0.55 * def.scale, end: 0 }, alpha: { start: 0.7, end: 0 }, blendMode: 'ADD', tint: def.aura, frequency: 28, emitting: false,
    }).setDepth(8);
    this.flames.startFollow(s, 0, -8);
    this.aliveText = null;
    this.reset(0, 1);
  }

  reset(x, facing) {
    this.sprite.setTexture(this.def.id, 'idle_0').clearTint().setScale(1).setPosition(x, GROUND_Y);
    this.sprite.body.reset(x, GROUND_Y);
    this.hp = this.maxHp; this.ki = 0; this.superT = 0; this.combo = 0; this.comboT = 0;
    this.dead = false; this.stun = 0; this.invuln = 0; this.buf = null; this.fired = false; this.hitDone = false;
    this.move = null; this.moveKey = null; this.chargeSfx = 0; this.beamTick = 0; this.animName = ''; this.animT = 0; this.stateT = 0;
    this.facing = facing; this.sprite.setFlipX(facing < 0);
    this.stateName = ''; this.noGravity(false);
    this.change('idle');
    this.emitHud(true);
  }

  // ---- propiedades de conveniencia ----
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get vxNow() { return this.sprite.body.velocity.x; }
  get vyNow() { return this.sprite.body.velocity.y; }
  get grounded() { return this.sprite.body.blocked.down || this.sprite.y >= GROUND_Y - 0.5; }
  get isSuper() { return this.superT > 0; }
  get speed() { return 235 * this.def.speed * (this.isSuper ? 1.28 : 1); }
  get pow() { return this.def.power * (this.isSuper ? 1.5 : 1); }
  get opp() { return this.sc.fighters[1 - this.index]; }
  vx(v) { this.sprite.body.setVelocityX(v); }
  vyZero() { this.sprite.body.setVelocityY(0); }
  noGravity(on) { this.sprite.body.setAllowGravity(!on); }
  face(d) { if (d) { this.facing = d; this.sprite.setFlipX(d < 0); } }
  addKi(v) { this.ki = Math.max(0, Math.min(100, this.ki + v)); }

  // ---- animación por atlas (frames dirigidos por el estado, determinista con hit-stop) ----
  setAnim(name, p = null) {
    if (name !== this.animName) { this.animName = name; this.animT = 0; }
    const a = this.anims[name]; if (!a) return;
    let i;
    if (p !== null) i = Math.min(a.n - 1, Math.floor(p * a.n));
    else i = a.loop ? Math.floor(this.animT * a.fps) % a.n : 0;
    const tex = this.isSuper ? `${this.def.id}_super` : this.def.id;
    if (this.sprite.texture.key !== tex) this.sprite.setTexture(tex);
    this.sprite.setFrame(`${name}_${i}`);
  }

  // ---- máquina de estados ----
  change(name) {
    if (name === this.stateName) return;
    const old = STATES[this.stateName];
    if (old && old.exit) old.exit(this);
    this.stateName = name; this.stateT = 0;
    STATES[name].enter?.(this);
  }

  startMove(key) {
    this.move = MOVES[key]; this.moveKey = key; this.hitDone = false; this.stateT = 0;
    if (key === 'kick' || key === 'p3') this.vx(this.facing * 150); else if (this.grounded) this.vx(this.facing * 70);
    sfx.swing();
    if (this.stateName !== 'attack') this.change('attack');
    return 'attack';
  }

  tryBuffered(inp) {
    const b = this.buf; if (!b) return null;
    const g = this.grounded, h = inp.held;
    const dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    let st = null;
    switch (b.a) {
      case 'up': if (g) { this.sprite.body.setVelocity(dir * this.speed, -TUNING.jumpVelocity); sfx.jump(); this.sc.dust(this.x, this.y); st = 'jump'; } break;
      case 'punch': st = this.startMove(g ? 'p1' : 'air'); break;
      case 'kick': st = this.startMove(g ? 'kick' : 'air'); break;
      case 'blast': if (this.ki >= KI.blast) st = 'cast'; break;
      case 'special': if (g && this.ki >= KI.special) st = 'special'; break;
      case 'transform': if (g && this.ki >= KI.transform && !this.isSuper) st = 'transform'; break;
      case 'dash': if (this.ki >= KI.dash) { this.vx((dir || Math.sign(this.opp.x - this.x) || this.facing) * 880); st = 'dash'; } break;
      default: break;
    }
    if (st) this.buf = null;
    return st;
  }

  goSuper() { this.superT = 28; this.ki = 0; this.sc.events.emit('hud:super', this.index, true); this.sc.music?.(2); }

  // ---- combate ----
  hurtbox() { return this.sprite.body; }

  checkHit() {
    const m = this.move, f = this.facing, reach = m.reach * this.def.scale;
    const x0 = Math.min(this.x + f * 6, this.x + f * reach), x1 = Math.max(this.x + f * 6, this.x + f * reach);
    const y0 = this.y + m.y0, y1 = this.y + m.y1;
    if (!this.sc.rectHits(x0, y0, x1 - x0, y1 - y0, this.opp)) return;
    this.hitDone = true;
    const hx = this.x + f * reach * 0.85, hy = this.y + (m.y0 + m.y1) / 2;
    this.opp.takeHit(this, { dmg: m.dmg * this.pow, kb: m.kb, stun: m.stun, launch: m.launch, heavy: m.heavy, tier: m.tier, snd: m.snd, hx, hy });
  }

  takeHit(from, a) {
    if (this.invuln > 0 || this.dead || ['down', 'ko'].includes(this.stateName)) return 0;
    const dir = a.dir ?? (from.x <= this.x ? 1 : -1);
    const frontal = this.facing === -dir;
    const hx = a.hx ?? this.x, hy = a.hy ?? this.y - 70;
    const J = this.sc.juice;
    let dmg = a.dmg;
    if (!a.noScale) dmg *= Math.max(0.45, 1 - 0.07 * Math.max(0, from.combo));

    if (this.stateName === 'block' && frontal && this.grounded) {          // bloqueo: chip damage
      dmg *= a.beam ? 0.35 : 0.1;
      this.setHp(Math.max(1, this.hp - dmg));
      this.vx(dir * a.kb * 0.55); this.addKi(2);
      J.spark(hx, hy, 0x7fd0ff, 6); J.ring(hx, hy, 0x7fd0ff, 50);
      if (!a.quiet) sfx.block();
      return 2;
    }
    this.setHp(Math.max(0, this.hp - dmg));
    from.addKi(KI.onHit); this.addKi(KI.onHurt);
    from.combo = from.comboT > 0 ? from.combo + 1 : 1; from.comboT = 1.3; this.sc.events.emit('hud:combo', from.index, from.combo);
    if (a.dmg >= 1) J.number(hx, hy - 30, Math.round(dmg), from.combo > 3 || a.launch, from.combo > 3 ? '#ff9a3d' : '#ffffff');
    if (this.hp <= 0) this.dead = true;
    const big = a.heavy || a.launch;
    J.ring(hx, hy, 0xfff1a0, big ? 80 : 52);
    J.flash(this.sprite);
    const armor = (this.stateName === 'transform' && this.fired) || (this.stateName === 'special' && this.fired);
    if (!a.quiet) {
      const tier = this.dead ? 'large' : a.tier || (big ? 'medium' : 'small');
      J.feedback(tier, hx, hy, 0xffffff);
      (this.dead ? sfx.heavy : sfx[a.snd || 'punch'])();
    }
    if (armor && !this.dead) return 1;                                   // súper armadura
    this.fired = false;
    if (a.launch || this.dead || !this.grounded || a.heavy) {
      this.sprite.body.setVelocity(dir * a.kb * (this.dead ? 1.5 : 1), this.dead ? -460 : a.heavy ? -260 : -320);
      this.change('launched');
    } else {
      this.stun = a.stun * Math.max(0.6, 1 - 0.05 * from.combo);
      this.vx(dir * a.kb); this.change('hurt');
    }
    return 1;
  }

  setHp(v) { this.hp = v; this.sc.events.emit('hud:hp', this.index, this.hp, this.maxHp); }
  emitHud(force) {
    const e = this.sc.events, k = Math.round(this.ki);
    if (force || k !== this.lastKi) { this.lastKi = k; e.emit('hud:ki', this.index, this.ki); }
    if (force) { e.emit('hud:hp', this.index, this.hp, this.maxHp); e.emit('hud:super', this.index, false); e.emit('hud:combo', this.index, 0); }
  }

  // ---- paso fijo ----
  update(dt, frame) {
    this.stateT += dt; this.animT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; this.sc.events.emit('hud:combo', this.index, 0); } }
    if (this.superT > 0) {
      this.superT -= dt; this.addKi(KI.superRegen * dt);
      if (this.superT <= 0) { this.sc.events.emit('hud:super', this.index, false); this.sprite.setTexture(this.def.id); }
    }
    this.addKi(KI.passive * dt);

    if (frame) {
      for (const a of ACTIONS_BUFFERED) if (frame.pressed[a]) this.buf = { a, t: TUNING.bufferWindow };
    }
    if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }

    const st = STATES[this.stateName];
    const next = st.update(this, dt, frame || { held: {}, pressed: {} });
    if (next) this.change(next);

    // gravedad asimétrica: caída más pesada que la subida (se suma a la gravedad del mundo)
    const b = this.sprite.body;
    if (b.allowGravity) b.setGravityY(b.velocity.y > 0 ? TUNING.gravity * (TUNING.fallMult - 1) : 0);
    this.emitHud(false);
  }

  /** Efectos visuales que dependen del estado (se llama cada frame de render). */
  renderFx() {
    const s = this.sprite, def = this.def;
    this.shadow.setPosition(s.x, GROUND_Y + 3);
    const h = Math.max(0, GROUND_Y - s.y);
    this.shadow.setSize(Math.max(30, 64 - h * 0.15) * def.scale, 12).setAlpha(Math.max(0.1, 0.32 - h / 500));
    const aura = this.stateName === 'charge' || this.stateName === 'transform' || this.isSuper;
    this.flames.emitting = aura;
    this.glow.setVisible(aura).setPosition(s.x, s.y - 60 * def.scale).setScale(1.1 * def.scale, 2.0 * def.scale)
      .setAlpha((this.stateName === 'transform' ? 0.55 : 0.28) + Math.sin(this.sc.time.now / 60) * 0.05);

    const beamOn = this.stateName === 'special' && this.stateT > 0.6 && this.stateT < 1.4;
    if (this.stateName === 'special' && this.stateT < 0.6) {   // energía acumulándose en las manos
      const e = this.stateT / 0.6;
      this.beam[2].setVisible(true).setTint(def.ki).setPosition(s.x - this.facing * 20, s.y - 86).setScale(0.35 + e * 0.9).setAlpha(0.8);
      this.beam[0].setVisible(false); this.beam[1].setVisible(false);
    } else if (beamOn) {
      const grow = Math.min(1, (this.stateT - 0.6) / 0.1), fade = this.stateT > 1.2 ? 1 - (this.stateT - 1.2) / 0.2 : 1;
      const len = 1500 * grow, th = 54 * fade, x0 = s.x + this.facing * 30, cx = x0 + this.facing * len / 2, y = s.y - 86;
      const flick = 1 + Math.sin(this.sc.time.now / 25) * 0.08;
      this.beam[0].setVisible(true).setTint(def.ki).setPosition(cx, y).setDisplaySize(len, th * 1.9 * flick).setAlpha(0.8);
      this.beam[1].setVisible(true).setTint(def.core).setPosition(cx, y).setDisplaySize(len, th * 0.7).setAlpha(1);
      this.beam[2].setVisible(true).setTint(def.core).setPosition(x0, y).setScale(th / 40).setAlpha(0.95);
    } else for (const b of this.beam) b.setVisible(false);
  }
}
void WORLD_W;
