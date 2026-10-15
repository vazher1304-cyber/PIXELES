// Máquina de estados finita del luchador (skill `game-ai`, patrón 1): un estado = un comportamiento.
// update() devuelve el nombre del siguiente estado o null para quedarse.
import { MOVES, KI } from '../data/moves.js';
import { sfx } from '../systems/audio.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const landOrFall = (f) => (f.grounded ? 'idle' : 'jump');

function neutral(mode) {
  return {
    enter(f) { f.setAnim(mode); },
    update(f, dt, inp) {
      if (!f.grounded) return 'jump';
      f.face(Math.sign(f.opp.x - f.x) || f.facing);
      const act = f.tryBuffered(inp); if (act) return act;
      const h = inp.held, dir = (h.right ? 1 : 0) - (h.left ? 1 : 0);
      if (h.down) { f.vx(0); return 'block'; }
      if (h.charge && f.ki < 100) {
        f.vx(0); f.addKi(KI.charge * dt);
        f.chargeSfx -= dt; if (f.chargeSfx <= 0) { sfx.charge(); f.chargeSfx = 0.45; }
        if (Math.random() < 0.5) f.sc.juice.spark(f.x + (Math.random() - 0.5) * 50, f.y - 6, f.def.aura, 1);
        return 'charge';
      }
      if (dir) { f.vx(dir * f.speed * (dir === f.facing ? 1 : 0.78)); return 'walk'; }
      f.vx(f.vxNow * Math.pow(0.0001, dt));
      return 'idle';
    },
  };
}

export const STATES = {
  idle: neutral('idle'),
  walk: neutral('walk'),
  block: neutral('block'),
  charge: neutral('charge'),

  jump: {
    enter(f) { f.setAnim('jump'); },
    update(f, dt, inp) {
      const act = f.tryBuffered(inp); if (act) return act;
      const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
      f.vx(clamp(f.vxNow + dir * 700 * dt, -f.speed, f.speed));
      if (f.grounded && f.vyNow >= 0) { f.vx(f.vxNow * 0.3); f.sc.juice.squash(f.sprite, 1.2, 0.82); f.sc.dust(f.x, f.y); sfx.land(); return 'idle'; }
      return null;
    },
  },

  attack: {
    update(f, dt, inp) {
      const m = f.move, p = f.stateT / m.dur;
      f.setAnim(m.anim, clamp(p, 0, 0.999));
      if (f.grounded) f.vx(f.vxNow * Math.pow(0.02, dt));
      if (!f.hitDone && f.stateT >= m.hs && f.stateT <= m.he) f.checkHit();
      // cadena de puños: puño buffereado en la parte final del golpe
      if ((f.moveKey === 'p1' || f.moveKey === 'p2') && f.stateT >= m.dur * 0.55 && f.buf && f.buf.a === 'punch') {
        f.buf = null; f.startMove(f.moveKey === 'p1' ? 'p2' : 'p3'); return null;
      }
      return f.stateT >= m.dur ? landOrFall(f) : null;
    },
  },

  cast: {
    enter(f) { f.setAnim('cast', 0); f.fired = false; f.noGravity(true); },
    update(f, dt) {
      f.setAnim('cast', clamp(f.stateT / 0.4, 0, 0.999));
      if (!f.grounded) f.vyZero();
      f.vx(f.vxNow * Math.pow(0.01, dt));
      if (!f.fired && f.stateT >= 0.12) { f.fired = true; f.addKi(-KI.blast); sfx.blast(); f.sc.fireball(f, 7 * f.pow); }
      return f.stateT >= 0.38 ? landOrFall(f) : null;
    },
    exit(f) { f.noGravity(false); },
  },

  special: {
    enter(f) { f.fired = false; f.beamTick = 0; f.vx(0); f.noGravity(true); f.addKi(-KI.special); sfx.beamCharge(); },
    update(f, dt) {
      f.vx(0);
      if (f.stateT < 0.6) f.setAnim('wind', clamp(f.stateT / 0.6, 0, 0.999)); else f.setAnim('fire');
      if (f.stateT > 0.6 && !f.fired) { f.fired = true; sfx.beam(); f.sc.juice.addTrauma(0.5); }
      if (f.fired && f.stateT <= 1.4) {
        f.beamTick -= dt;
        if (f.beamTick <= 0) { f.beamTick = 0.14; f.sc.beamHit(f, f.opp, f.stateT > 1.2); }
      }
      return f.stateT >= 1.65 ? 'idle' : null;
    },
    exit(f) { f.noGravity(false); },
  },

  transform: {
    enter(f) { f.fired = false; f.vx(0); f.noGravity(true); sfx.transform(); },
    update(f) {
      f.vx(0);
      f.setAnim('transform', clamp(f.stateT / 1.4, 0, 0.999));
      if (f.stateT > 0.55 && !f.fired) { f.fired = true; f.goSuper(); f.sc.transformFx(f); }
      return f.stateT >= 1.4 ? 'idle' : null;
    },
    exit(f) { f.noGravity(false); },
  },

  dash: {
    enter(f) { f.noGravity(true); f.addKi(-KI.dash); sfx.dash(); f.vyZero(); },
    update(f) {
      f.vyZero();
      f.sc.juice.spark(f.x, f.y - 50 - Math.random() * 40, f.def.aura, 1);
      if (f.stateT >= 0.2) { f.vx(f.vxNow * 0.25); return landOrFall(f); }
      return null;
    },
    exit(f) { f.noGravity(false); },
  },

  hurt: {
    enter(f) { f.setAnim('hurt', 0); },
    update(f, dt) {
      f.setAnim('hurt', 0); f.sprite.setFrame(`hurt_${Math.floor(f.stateT * 14) % 2}`);
      f.vx(f.vxNow * Math.pow(0.03, dt));
      f.stun -= dt;
      return f.stun <= 0 ? landOrFall(f) : null;
    },
  },

  launched: {
    enter(f) { f.setAnim('launched', 0); },
    update(f, dt) {
      f.vx(f.vxNow * Math.pow(0.5, dt));
      if (f.grounded && f.vyNow >= 0) {
        f.sc.dust(f.x, f.y); f.sc.juice.addTrauma(0.25); f.vx(0); sfx.land();
        return f.dead ? 'ko' : 'down';
      }
      return null;
    },
  },

  down: {
    enter(f) { f.setAnim('down', 0); f.vx(0); },
    update(f) { f.vx(0); if (f.stateT >= 0.75) { f.invuln = 0.4; return 'idle'; } return null; },
  },

  ko: { enter(f) { f.setAnim('ko', 0); f.vx(0); }, update(f) { f.vx(0); return null; } },
  win: { enter(f) { f.setAnim('win'); f.vx(0); }, update(f) { f.vx(0); return null; } },
};
