import { drawFig, drawAura } from './draw.js';
import { sfx } from './audio.js';

export const GROUND = 440;
const GRAVITY = 1900;

const ATK = {
  p1: { dur: 0.24, hs: 0.06, he: 0.14, dmg: 5, reach: 64, y0: -108, y1: -55, kb: 110, stun: 0.26 },
  p2: { dur: 0.24, hs: 0.06, he: 0.14, dmg: 6, reach: 66, y0: -108, y1: -55, kb: 130, stun: 0.28 },
  p3: { dur: 0.42, hs: 0.12, he: 0.22, dmg: 10, reach: 78, y0: -112, y1: -45, kb: 380, stun: 0.5, launch: true },
  kick: { dur: 0.46, hs: 0.15, he: 0.27, dmg: 12, reach: 86, y0: -104, y1: -12, kb: 330, stun: 0.4, heavy: true },
  air: { dur: 0.34, hs: 0.06, he: 0.24, dmg: 9, reach: 72, y0: -104, y1: -6, kb: 280, stun: 0.35 },
};

const FREE = new Set(['idle', 'walk', 'block', 'charge']);
const ACTIONS = ['punch', 'kick', 'blast', 'special', 'transform', 'dash', 'up'];

export class Fighter {
  constructor(scene, def, id) {
    this.sc = scene; this.def = def; this.id = id;
    this.g = scene.add.graphics().setDepth(10);
    this.maxHp = def.hp;
    this.reset(0, 1);
  }

  reset(x, facing) {
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0; this.facing = facing;
    this.hp = this.maxHp; this.ki = 0; this.state = 'idle'; this.stateT = 0; this.dur = 0;
    this.atk = null; this.atkKey = null; this.hitDone = false; this.stun = 0;
    this.flash = 0; this.invuln = 0; this.buf = null; this.superT = 0;
    this.combo = 0; this.comboT = 0; this.dead = false; this.time = 0; this.fired = false;
    this.beamTick = 0; this.shown = 1; this.chainWin = 0; this.lastKiSfx = 0;
  }

  get sup() { return this.superT > 0; }
  get grounded() { return this.y >= GROUND - 0.01; }
  get speed() { return 235 * this.def.speed * (this.sup ? 1.28 : 1); }
  get pow() { return this.def.power * (this.sup ? 1.5 : 1); }
  hurtbox() { return { x0: this.x - 20 * this.def.scale, x1: this.x + 20 * this.def.scale, y0: this.y - 114 * this.def.scale, y1: this.y }; }

  setState(s, dur = 0) { this.state = s; this.stateT = 0; this.dur = dur; }

  startAttack(key) {
    this.atk = ATK[key]; this.atkKey = key; this.hitDone = false;
    this.setState('attack', this.atk.dur);
    if (key === 'kick' || key === 'p3') this.vx = this.facing * 150;
    else if (this.grounded) this.vx = this.facing * 70;
    this.chainWin = 0;
    sfx.swing();
  }

  update(dt, inp, opp, sc) {
    this.time += dt; this.stateT += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.superT > 0) { this.superT -= dt; this.ki = Math.min(100, this.ki + 6 * dt); }
    this.ki = Math.min(100, this.ki + 2.5 * dt);

    for (const a of ACTIONS) if (inp[a]) this.buf = { a, t: 0.2 };
    if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const s = this.state;
    const air = !this.grounded;

    if (FREE.has(s) || s === 'jump') {
      if (s !== 'jump' && this.grounded) {
        const to = Math.sign(opp.x - this.x); if (to) this.facing = to;
      }
      this.tryActions(inp, dir, opp, sc);
    }

    switch (this.state) {
      case 'idle': case 'walk': case 'block': case 'charge': {
        if (!this.grounded) { this.setState('jump'); break; }
        if (inp.down) { if (this.state !== 'block') this.setState('block'); this.vx = 0; }
        else if (inp.charge && this.ki < 100) {
          if (this.state !== 'charge') { this.setState('charge'); sfx.charge(); }
          this.vx = 0; this.ki = Math.min(100, this.ki + 38 * dt);
          this.lastKiSfx -= dt; if (this.lastKiSfx <= 0) { sfx.charge(); this.lastKiSfx = 0.45; }
          if (Math.random() < 0.5) sc.particle(this.x + (Math.random() - 0.5) * 50, this.y - 4, this.def.aura, -(40 + Math.random() * 60));
        } else if (dir) {
          this.setState('walk');
          this.vx = dir * this.speed * (dir === this.facing ? 1 : 0.78);
        } else { this.setState('idle'); this.vx *= 0.75; }
        break;
      }
      case 'jump':
        this.vx += dir * 700 * dt;
        this.vx = Math.max(-this.speed, Math.min(this.speed, this.vx));
        if (this.grounded) { this.setState('idle'); this.vx *= 0.3; sc.dust(this.x, this.y); }
        break;
      case 'attack': {
        const a = this.atk;
        if (this.grounded) this.vx *= Math.pow(0.02, dt);
        if (!this.hitDone && this.stateT >= a.hs && this.stateT <= a.he) this.checkHit(opp, sc);
        // cadena de golpes
        if ((this.atkKey === 'p1' || this.atkKey === 'p2') && this.stateT >= a.dur * 0.55 && this.buf && this.buf.a === 'punch') {
          this.buf = null; this.startAttack(this.atkKey === 'p1' ? 'p2' : 'p3'); break;
        }
        if (this.stateT >= a.dur) this.setState(this.grounded ? 'idle' : 'jump');
        break;
      }
      case 'cast':
        if (!this.grounded) { this.vy = 0; }
        this.vx *= Math.pow(0.01, dt);
        if (!this.fired && this.stateT >= 0.12) {
          this.fired = true; this.ki -= 10; sfx.blast();
          sc.fireball(this, 7 * this.pow);
        }
        if (this.stateT >= 0.38) this.setState(this.grounded ? 'idle' : 'jump');
        break;
      case 'special':
        this.vx = 0;
        if (this.stateT > 0.6 && !this.fired) { this.fired = true; sfx.beam(); sc.shake(0.012, 0.5); }
        if (this.fired) {
          this.beamTick -= dt;
          if (this.beamTick <= 0) { this.beamTick = 0.14; sc.beamHit(this, opp, this.stateT > 1.1); }
        }
        if (this.stateT >= 1.65) this.setState('idle');
        break;
      case 'transform':
        this.vx = 0;
        if (this.stateT > 0.55 && !this.fired) {
          this.fired = true; this.superT = 28; this.ki = 0; sc.transformFx(this);
          if (Math.abs(opp.x - this.x) < 260 && opp.grounded && opp.state !== 'down' && opp.state !== 'ko') {
            opp.vx = Math.sign(opp.x - this.x || 1) * 520; opp.setState('hurt', 0.35); opp.stun = 0.35;
          }
        }
        if (this.stateT >= 1.4) this.setState('idle');
        break;
      case 'dash':
        if (this.stateT >= 0.2) { this.vx *= 0.25; this.setState(this.grounded ? 'idle' : 'jump'); }
        else if (Math.random() < 0.7) sc.particle(this.x, this.y - 50 - Math.random() * 40, this.def.aura, 0);
        break;
      case 'hurt':
        this.vx *= Math.pow(0.03, dt);
        this.stun -= dt;
        if (this.stun <= 0) this.setState(this.grounded ? 'idle' : 'jump');
        break;
      case 'launched':
        this.vx *= Math.pow(0.5, dt);
        if (this.grounded && this.vy >= 0) {
          sc.dust(this.x, this.y); sc.shake(0.006, 0.12);
          if (this.dead) { this.setState('ko'); this.vx = 0; }
          else { this.setState('down', 0.75); this.vx = 0; }
        }
        break;
      case 'down':
        this.vx = 0;
        if (this.stateT >= 0.75) { this.setState('idle'); this.invuln = 0.4; }
        break;
      case 'ko': this.vx = 0; break;
      default: break;
    }

    // física
    const noGrav = (this.state === 'cast' && !this.grounded) || this.state === 'special' || this.state === 'transform' || this.state === 'dash';
    if (!noGrav) this.vy += GRAVITY * dt; else if (this.state === 'dash') this.vy = 0;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= GROUND) { this.y = GROUND; if (this.vy > 0) this.vy = 0; }
    this.x = Math.max(40, Math.min(sc.worldW - 40, this.x));
  }

  tryActions(inp, dir, opp, sc) {
    const b = this.buf; if (!b) return;
    const g = this.grounded;
    let used = true;
    switch (b.a) {
      case 'up':
        if (g) { this.vy = -690; this.vx = dir * this.speed; this.setState('jump'); sfx.jump(); sc.dust(this.x, this.y); }
        else used = false; break;
      case 'punch':
        if (g) this.startAttack('p1'); else this.startAttack('air'); break;
      case 'kick':
        if (g) this.startAttack('kick'); else this.startAttack('air'); break;
      case 'blast':
        if (this.ki >= 10) { this.setState('cast'); this.fired = false; } else used = false; break;
      case 'special':
        if (g && this.ki >= 50) { this.ki -= 50; this.setState('special'); this.fired = false; this.beamTick = 0; sfx.beamCharge(); }
        else used = false; break;
      case 'transform':
        if (g && this.ki >= 100 && !this.sup) { this.setState('transform'); this.fired = false; sfx.transform(); }
        else used = false; break;
      case 'dash':
        if (this.ki >= 6) {
          this.ki -= 6; const dd = dir || Math.sign(opp.x - this.x) || this.facing;
          this.vx = dd * 880; this.vy = 0; this.setState('dash'); sfx.dash();
        } else used = false; break;
      default: used = false;
    }
    if (used) this.buf = null;
  }

  checkHit(opp, sc) {
    const a = this.atk, f = this.facing, reach = a.reach * this.def.scale;
    const hb = { x0: Math.min(this.x + f * 6, this.x + f * reach), x1: Math.max(this.x + f * 6, this.x + f * reach), y0: this.y + a.y0, y1: this.y + a.y1 };
    const hu = opp.hurtbox();
    if (hb.x1 < hu.x0 || hb.x0 > hu.x1 || hb.y1 < hu.y0 || hb.y0 > hu.y1) return;
    this.hitDone = true;
    const hx = (Math.min(this.x + f * reach, hu.x1) + this.x) / 2 + f * 20;
    opp.takeHit(this, { dmg: a.dmg * this.pow, kb: a.kb, stun: a.stun, launch: a.launch, heavy: a.heavy, hx, hy: this.y + (a.y0 + a.y1) / 2 }, sc);
  }

  takeHit(from, a, sc) {
    if (this.invuln > 0 || this.state === 'down' || this.state === 'ko' || this.dead) return 0;
    const dir = a.dir ?? (from.x <= this.x ? 1 : -1);
    const frontal = this.facing === -dir;
    const hx = a.hx ?? this.x, hy = a.hy ?? this.y - 70;
    let dmg = a.dmg;
    if (!a.noScale) dmg *= Math.max(0.45, 1 - 0.07 * Math.max(0, from.combo));

    if (this.state === 'block' && frontal && this.grounded) {
      dmg *= a.beam ? 0.35 : 0.1;
      this.hp = Math.max(1, this.hp - dmg);
      this.vx = dir * a.kb * 0.55; this.ki = Math.min(100, this.ki + 2);
      sc.spark(hx, hy, 0x7fd0ff, 6); sc.ring(hx, hy, 0x7fd0ff, 24);
      if (!a.quiet) sfx.block();
      return 2;
    }
    this.hp = Math.max(0, this.hp - dmg);
    from.ki = Math.min(100, from.ki + 4); this.ki = Math.min(100, this.ki + 3);
    from.combo = from.comboT > 0 ? from.combo + 1 : 1; from.comboT = 1.3;
    this.flash = 0.1;
    sc.spark(hx, hy, 0xffffff, a.heavy || a.launch ? 12 : 7); sc.ring(hx, hy, 0xfff1a0, a.heavy || a.launch ? 40 : 26);
    if (a.dmg >= 1) sc.damageText(hx, hy - 30, Math.round(dmg), from.combo);

    if (this.hp <= 0) this.dead = true;
    const armor = (this.state === 'transform' && this.fired) || (this.state === 'special' && this.fired);
    if (armor && !this.dead) { if (!a.quiet) sfx.punch(); return 1; }
    this.fired = false;
    if (!a.quiet) { (a.heavy || a.launch || this.dead) ? sfx.heavy() : (a.kb > 200 ? sfx.kick() : sfx.punch()); }
    if (!a.quiet) sc.hitstop(this.dead ? 0.16 : a.heavy || a.launch ? 0.09 : 0.05);
    if (!a.quiet) sc.shake(this.dead ? 0.02 : a.heavy || a.launch ? 0.01 : 0.004, 0.14);

    if (a.launch || this.dead || !this.grounded || a.heavy) {
      this.setState('launched'); this.vy = this.dead ? -460 : a.heavy ? -260 : -320; this.y -= 2;
      this.vx = dir * a.kb * (this.dead ? 1.5 : 1);
    } else {
      this.setState('hurt', a.stun); this.stun = a.stun * Math.max(0.6, 1 - 0.05 * from.combo);
      this.vx = dir * a.kb;
    }
    return 1;
  }

  draw(g, fx, sc) {
    const base = {
      x: this.x, y: this.y, facing: this.facing, def: this.def, state: this.state, stateT: this.stateT,
      dur: this.dur, atk: this.atkKey, time: this.time, sup: this.sup, flash: this.flash,
    };
    // sombra
    const h = Math.max(0, GROUND - this.y);
    g.fillStyle(0x000000, Math.max(0.12, 0.35 - h / 500));
    g.fillEllipse(this.x, GROUND + 3, Math.max(30, (64 - h * 0.15)) * this.def.scale, 12);
    if (this.invuln > 0 && Math.floor(this.time * 30) % 2 === 0 && this.state !== 'down') { /* parpadeo al levantarse */ }
    drawFig(g, base);
    const aura = this.state === 'charge' || this.state === 'transform' || this.sup;
    if (aura) drawAura(fx, base, this.state === 'transform' ? 1.6 : this.sup ? 1 : 0.8);
    // energía en las manos durante el rayo
    if (this.state === 'special' && this.stateT < 0.6) {
      const e = this.stateT / 0.6;
      const hx = this.x - this.facing * 20, hy = this.y - 86;
      fx.fillStyle(this.def.ki, 0.5); fx.fillCircle(hx, hy, 10 + e * 26);
      fx.fillStyle(this.def.kiCore, 0.9); fx.fillCircle(hx, hy, 5 + e * 14);
    }
  }
}
