// Árbol de comportamiento mínimo (skill `game-ai`): SUCCESS / FAILURE / RUNNING, compuestos con memoria
// del hijo en ejecución, decoradores y una pizarra (blackboard) compartida.
export const S = { SUCCESS: 0, FAILURE: 1, RUNNING: 2 };

export class Node { tick() { return S.FAILURE; } abort() {} }

/** Secuencia: avanza por los hijos y recuerda cuál devolvió RUNNING. */
export class Sequence extends Node {
  constructor(...c) { super(); this.c = c; this.i = 0; }
  tick(bb) {
    while (this.i < this.c.length) {
      const s = this.c[this.i].tick(bb);
      if (s === S.RUNNING) return S.RUNNING;
      if (s === S.FAILURE) { this.abort(); return S.FAILURE; }
      this.i++;
    }
    this.i = 0; return S.SUCCESS;
  }
  abort() { this.c[this.i]?.abort(); this.i = 0; }
}

/** Selector reactivo: reevalúa desde el primer hijo en cada tick; aborta el hijo previo si cambia la rama. */
export class Selector extends Node {
  constructor(...c) { super(); this.c = c; this.last = -1; }
  tick(bb) {
    for (let k = 0; k < this.c.length; k++) {
      const s = this.c[k].tick(bb);
      if (s !== S.FAILURE) {
        if (this.last !== -1 && this.last !== k) this.c[this.last].abort();
        this.last = k;
        return s;
      }
    }
    if (this.last !== -1) this.c[this.last].abort();
    this.last = -1; return S.FAILURE;
  }
  abort() { if (this.last !== -1) this.c[this.last].abort(); this.last = -1; }
}

export class Condition extends Node {
  constructor(fn) { super(); this.fn = fn; }
  tick(bb) { return this.fn(bb) ? S.SUCCESS : S.FAILURE; }
}

/** Acción de varios frames: llama a fn(bb) cada tick durante `dur` segundos y devuelve RUNNING. */
export class Timed extends Node {
  constructor(dur, fn) { super(); this.dur = dur; this.fn = fn; this.t = 0; }
  tick(bb) {
    if (this.t === 0) this.start?.(bb);
    this.fn(bb, this.t);
    this.t += bb.dt;
    if (this.t >= this.dur) { this.t = 0; return S.SUCCESS; }
    return S.RUNNING;
  }
  abort() { this.t = 0; }
}

/** Acción instantánea. */
export class Do extends Node {
  constructor(fn) { super(); this.fn = fn; }
  tick(bb) { this.fn(bb); return S.SUCCESS; }
}

/** Decorador: tras ejecutarse con éxito, bloquea al hijo `cd` segundos. */
export class Cooldown extends Node {
  constructor(cd, child) { super(); this.cd = cd; this.child = child; this.until = 0; }
  tick(bb) {
    if (bb.now < this.until) return S.FAILURE;
    const s = this.child.tick(bb);
    if (s === S.SUCCESS) this.until = bb.now + this.cd;
    return s;
  }
  abort() { this.child.abort(); }
}
