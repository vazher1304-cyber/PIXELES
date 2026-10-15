// Cerebro de la CPU: un árbol de comportamiento que escribe en el MISMO formato de acciones que
// el jugador humano ({held, pressed}); el luchador no sabe si lo controla una persona o la IA.
import { ACTIONS } from '../systems/actions.js';
import { Selector, Sequence, Condition, Timed, Do, Cooldown, S } from './bt.js';
import { KI } from '../data/moves.js';

const LEVELS = [
  { react: 0.45, aggr: 0.45, block: 0.25 },   // fácil
  { react: 0.28, aggr: 0.75, block: 0.55 },   // normal
  { react: 0.14, aggr: 1.0, block: 0.8 },     // difícil
];

export class Brain {
  constructor(level, getProjectiles) {
    this.L = LEVELS[level]; this.getProjectiles = getProjectiles;
    this.bb = { dt: 0, now: 0, roll: Math.random(), roll2: Math.random(), rollT: 0, threatT: 0, out: null };
    const L = this.L, press = (a) => new Do((bb) => { bb.out.pressed[a] = true; });
    const hold = (a, d) => new Timed(d, (bb) => { bb.out.held[a] = true; });
    const wait = (d) => new Timed(d, () => {});
    const approach = new Timed(0.5, (bb) => {
      if (bb.dist > 70) bb.out.held[bb.dir > 0 ? 'right' : 'left'] = true;
    });
    const retreat = new Timed(0.35, (bb) => { bb.out.held[bb.dir > 0 ? 'left' : 'right'] = true; });

    this.tree = new Selector(
      new Sequence(new Condition((bb) => !bb.me.cannotAct), new Selector(
        // defender
        new Sequence(new Condition((bb) => bb.threatT > L.react && bb.roll < L.block), hold('down', 0.45)),
        // transformar
        new Sequence(new Condition((bb) => bb.me.ki >= KI.transform && !bb.me.isSuper && bb.dist > 180), press('transform'), wait(1.5)),
        // rayo de ki
        new Cooldown(4, new Sequence(
          new Condition((bb) => bb.me.ki >= KI.special && bb.dist > 170 && bb.dist < 700 && !bb.opp.cannotAct && bb.roll2 < 0.3 * L.aggr + 0.1),
          press('special'), wait(1.8))),
        // lejos
        new Sequence(new Condition((bb) => bb.dist > 380), new Selector(
          new Cooldown(0.9, new Sequence(new Condition((bb) => bb.me.ki >= KI.blast && bb.roll < 0.5), press('blast'), wait(0.45))),
          new Sequence(new Condition((bb) => bb.me.ki < 70 && bb.roll < 0.7), hold('charge', 1.2)),
          new Sequence(new Condition((bb) => bb.me.ki >= KI.dash && bb.roll2 < 0.3), press('dash'), approach),
          approach)),
        // media distancia
        new Sequence(new Condition((bb) => bb.dist > 95), new Selector(
          new Cooldown(0.8, new Sequence(new Condition((bb) => bb.me.ki >= KI.blast && bb.roll < 0.2), press('blast'), wait(0.35))),
          new Sequence(new Condition((bb) => bb.roll2 < 0.12), press('up'), approach),
          approach)),
        // cuerpo a cuerpo
        new Selector(
          new Sequence(new Condition((bb) => bb.roll < 0.14 / L.aggr), retreat),
          new Sequence(new Condition((bb) => bb.roll < 0.55), press('punch'), wait(0.13), press('punch'), wait(0.13), press('punch'), wait(0.3)),
          new Sequence(new Condition((bb) => bb.roll < 0.8), press('kick'), wait(0.5)),
          new Sequence(press('up'), wait(0.1), press('kick'), wait(0.45)))),
      ),
      new Condition(() => false),
    );
  }

  poll(dt, me, opp, now) {
    const bb = this.bb;
    bb.dt = dt; bb.now = now; bb.me = me; bb.opp = opp;
    bb.dx = opp.x - me.x; bb.dist = Math.abs(bb.dx); bb.dir = Math.sign(bb.dx) || 1;
    bb.rollT -= dt; if (bb.rollT <= 0) { bb.roll = Math.random(); bb.roll2 = Math.random(); bb.rollT = this.L.react * (0.7 + Math.random() * 0.8); }
    // percepción con retardo de reacción: amenaza = rival atacando cerca o proyectil entrante
    const atk = ['attack', 'cast', 'special'].includes(opp.stateName) && bb.dist < 150;
    const proj = this.getProjectiles().some((p) => p.owner !== me && Math.abs(p.x - me.x) < 260 && Math.sign(me.x - p.x) === Math.sign(p.body.velocity.x));
    bb.threatT = atk || proj ? bb.threatT + dt : 0;
    me.cannotAct = ['hurt', 'launched', 'down', 'ko', 'win'].includes(me.stateName);
    opp.cannotAct = ['hurt', 'launched', 'down', 'ko', 'win'].includes(opp.stateName);

    const out = { held: Object.fromEntries(ACTIONS.map((a) => [a, false])), pressed: Object.fromEntries(ACTIONS.map((a) => [a, false])) };
    bb.out = out;
    if (me.cannotAct) { this.tree.abort(); return out; }
    this.tree.tick(bb);
    return out;
  }
}
void S;
