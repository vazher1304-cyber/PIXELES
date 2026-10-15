// IA sencilla basada en planes y colas de acciones.
export class AI {
  constructor(level) {
    this.level = level; // 0 fácil, 1 normal, 2 difícil
    this.react = [0.55, 0.32, 0.16][level];
    this.aggr = [0.5, 0.75, 1.0][level];
    this.blockP = [0.25, 0.55, 0.8][level];
    this.plan = 'idle'; this.hold = 0.5; this.cd = 0; this.queue = [];
  }

  think(dt, me, opp, sc) {
    const inp = { left: false, right: false, down: false, charge: false, up: false, punch: false, kick: false, blast: false, special: false, transform: false, dash: false };
    if (sc.phase !== 'fight' || me.dead || opp.dead) return inp;
    this.hold -= dt; this.cd -= dt;
    const dx = opp.x - me.x, dist = Math.abs(dx), dir = Math.sign(dx) || 1;
    if (['hurt', 'launched', 'down', 'ko'].includes(me.state)) { this.queue.length = 0; this.hold = Math.min(this.hold, 0.15); }

    if (this.hold <= 0) {
      this.hold = this.react * (0.6 + Math.random() * 0.9);
      this.queue.length = 0;
      const r = Math.random();
      const oppAtk = ['attack', 'special', 'cast'].includes(opp.state);
      const incoming = sc.projectiles.find((p) => p.owner !== me && Math.abs(p.x - me.x) < 260 && Math.sign(me.x - p.x) === Math.sign(p.vx));
      if (incoming && Math.random() < this.blockP) {
        if (Math.random() < 0.4 && me.grounded) { this.plan = 'idle'; this.queue.push(['up', 0.1]); }
        else { this.plan = 'block'; this.hold = 0.5; }
      } else if (oppAtk && dist < 140 && Math.random() < this.blockP) {
        this.plan = 'block'; this.hold = 0.35 + Math.random() * 0.2;
      } else if (me.ki >= 100 && !me.sup && dist > 180) {
        this.plan = 'idle'; this.queue.push(['transform', 0.2]); this.hold = 1.6;
      } else if (me.ki >= 50 && dist > 170 && dist < 700 && r < 0.3 * this.aggr + 0.05 && !['hurt', 'launched'].includes(opp.state)) {
        this.plan = 'idle'; this.queue.push(['special', 0.3]); this.hold = 1.8;
      } else if (dist > 380) {
        if (r < 0.4 && me.ki >= 10) { this.plan = 'idle'; this.queue.push(['blast', 0.4]); this.hold = Math.max(this.hold, 0.45); }
        else if (r < 0.55 && me.ki < 70) { this.plan = 'charge'; this.hold = 0.9 + Math.random(); }
        else if (r < 0.7 && me.ki >= 6) { this.plan = 'approach'; this.queue.push(['dash', 0.1]); }
        else this.plan = 'approach';
      } else if (dist > 95) {
        if (r < 0.2 && me.ki >= 6) { this.queue.push(['dash', 0.05]); this.plan = 'approach'; }
        else if (r < 0.3 && me.ki >= 10) { this.plan = 'idle'; this.queue.push(['blast', 0.3]); }
        else if (r < 0.38) this.queue.push(['up', 0.1]);
        this.plan = 'approach';
      } else {
        if (r < 0.14 / this.aggr) { this.plan = 'retreat'; this.hold = 0.35; }
        else if (r < 0.2) { this.plan = 'block'; this.hold = 0.3; }
        else if (r < 0.55) { this.plan = 'idle'; this.queue.push(['punch', 0.12], ['punch', 0.12], ['punch', 0.3]); this.hold = 0.9; }
        else if (r < 0.8) { this.plan = 'idle'; this.queue.push(['kick', 0.3]); this.hold = 0.55; }
        else { this.plan = 'idle'; this.queue.push(['up', 0.08], ['kick', 0]); this.hold = 0.7; }
      }
    }

    if (this.plan === 'approach') { if (dist > 70) { dir > 0 ? (inp.right = true) : (inp.left = true); } }
    else if (this.plan === 'retreat') { dir > 0 ? (inp.left = true) : (inp.right = true); }
    else if (this.plan === 'block') inp.down = true;
    else if (this.plan === 'charge') inp.charge = true;

    if (this.cd <= 0 && this.queue.length) {
      const [a, gap] = this.queue.shift();
      inp[a] = true; this.cd = gap * (this.level === 0 ? 1.6 : 1);
    }
    return inp;
  }
}
