import type { Member, PlayerState } from "@/lib/realtime/types";

interface Snapshot extends PlayerState {
  t: number; // hora local de recepción (performance.now)
}

// Se dibuja a los remotos con este retraso para tener siempre dos posiciones entre las que interpolar.
const RENDER_DELAY_MS = 120;
const IDLE_GAP_MS = 250;
const TELEPORT_DISTANCE = 200;
const MAX_SNAPSHOTS = 20;

/**
 * Estado compartido entre la capa de red y la escena de Phaser.
 * La red escribe (miembros y posiciones); la escena lee en cada frame.
 */
export class RemotePlayers {
  private members = new Map<string, Member>();
  private buffers = new Map<string, Snapshot[]>();

  setMembers(list: Member[]) {
    const next = new Map(list.map((m) => [m.id, m]));
    // Solo se borran las posiciones de quien estaba y se fue: la posición de alguien
    // puede llegar antes que su presencia y no hay que perderla.
    for (const id of this.members.keys()) {
      if (!next.has(id)) this.buffers.delete(id);
    }
    this.members = next;
  }

  getMembers(): Member[] {
    return [...this.members.values()];
  }

  push(id: string, state: PlayerState) {
    const now = performance.now();
    let buf = this.buffers.get(id);
    if (!buf) {
      buf = [];
      this.buffers.set(id, buf);
    }
    const last = buf[buf.length - 1];
    if (last) {
      const jump = Math.hypot(state.x - last.x, state.y - last.y);
      if (jump > TELEPORT_DISTANCE) {
        buf.length = 0; // salto grande: aparece directamente en el nuevo sitio
      } else if (now - last.t > IDLE_GAP_MS) {
        // Venía quieto: duplica su última posición justo antes para que no "resbale" desde hace rato.
        buf.push({ ...last, t: now - 100 });
      }
    }
    buf.push({ ...state, t: now });
    if (buf.length > MAX_SNAPSHOTS) buf.splice(0, buf.length - MAX_SNAPSHOTS);
  }

  /** Posición interpolada para dibujar ahora, o null si aún no se recibió ninguna. */
  sample(id: string): PlayerState | null {
    const buf = this.buffers.get(id);
    if (!buf || buf.length === 0) return null;
    const renderAt = performance.now() - RENDER_DELAY_MS;

    const first = buf[0];
    if (renderAt <= first.t) return first;
    for (let i = buf.length - 1; i > 0; i--) {
      const a = buf[i - 1];
      const b = buf[i];
      if (renderAt >= a.t && renderAt <= b.t) {
        const k = b.t === a.t ? 1 : (renderAt - a.t) / (b.t - a.t);
        return {
          x: a.x + (b.x - a.x) * k,
          y: a.y + (b.y - a.y) * k,
          dir: b.dir,
          moving: b.moving || a.moving,
        };
      }
    }
    return buf[buf.length - 1];
  }
}
