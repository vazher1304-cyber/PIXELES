import type { RealtimeChannel } from "@supabase/supabase-js";
import { MAX_MEMBERS } from "../config";
import { MAX_NAME_LENGTH } from "../profile";
import { getSupabase } from "./supabaseClient";
import {
  isPlayerState,
  sameState,
  type ConnectionStatus,
  type Member,
  type PlayerState,
} from "./types";

const SEND_INTERVAL_MS = 100; // máximo 10 posiciones por segundo
const REJOIN_WATCHDOG_MS = 15_000; // si la librería no se recupera sola en este tiempo, se recrea el canal
const MAX_BACKOFF_MS = 10_000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export interface OfficeChannelEvents {
  onStatus: (status: ConnectionStatus) => void;
  /** Personas admitidas en la oficina (sin incluirme). */
  onMembers: (members: Member[]) => void;
  onPosition: (id: string, state: PlayerState) => void;
}

type BroadcastHandler = (payload: Record<string, unknown>) => void;

/**
 * Un canal de Supabase Realtime por oficina:
 * - Presence: quién está conectado (nombre, color, hora de entrada).
 * - Broadcast: posiciones (y en la etapa 3, señalización WebRTC).
 * Se reconecta solo y limita la oficina a MAX_MEMBERS personas.
 */
export class OfficeChannel {
  private channel: RealtimeChannel | null = null;
  private status: ConnectionStatus | null = null;
  private destroyed = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private readonly extraHandlers = new Map<string, BroadcastHandler>();

  // Envío de posición con límite de frecuencia.
  private pending: PlayerState | null = null;
  private lastSent: PlayerState | null = null;
  private lastSentAt = 0;
  private sendTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly officeId: string,
    readonly self: Member,
    private readonly events: OfficeChannelEvents,
  ) {}

  connect() {
    if (this.destroyed) return;
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting");

    const supabase = getSupabase();
    const channel = supabase.channel(`oficina:${this.officeId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.self.id, enabled: true },
      },
    });
    this.channel = channel;

    channel
      .on("presence", { event: "sync" }, () => this.handlePresenceSync())
      .on("presence", { event: "join" }, ({ key }) => {
        // Alguien nuevo: le reenvío mi posición para que me vea aunque yo esté quieto.
        if (key !== this.self.id) this.resendPosition();
      })
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const { id, ...state } = (payload ?? {}) as { id?: unknown } & Record<string, unknown>;
        if (typeof id === "string" && id !== this.self.id && isPlayerState(state)) {
          this.events.onPosition(id, state);
        }
      });
    for (const [event, handler] of this.extraHandlers) {
      channel.on("broadcast", { event }, ({ payload }) => handler(payload ?? {}));
    }

    channel.subscribe((status, err) => {
      if (this.destroyed || channel !== this.channel) return;
      if (status === "SUBSCRIBED") {
        this.attempt = 0;
        this.clearWatchdog();
        // Track en cada (re)suscripción: tras reconectar el servidor ya no tiene mi presencia.
        void channel.track({ ...this.self }).then(() => {
          if (this.status !== "full") this.setStatus("connected");
          this.resendPosition();
        });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (err) console.warn("[realtime]", status, err);
        // supabase-js reintenta solo; el watchdog cubre el caso en que no lo logre.
        this.setStatus("reconnecting");
        this.armWatchdog();
      } else if (status === "CLOSED") {
        this.scheduleReconnect();
      }
    });
  }

  /** Registra un evento de broadcast adicional (se mantiene tras reconectar). Llamar antes de connect(). */
  onBroadcast(event: string, handler: BroadcastHandler) {
    this.extraHandlers.set(event, handler);
  }

  send(event: string, payload: Record<string, unknown>) {
    if (!this.channel || this.status !== "connected") return false;
    void this.channel.send({ type: "broadcast", event, payload });
    return true;
  }

  /** Se llama en cada frame; solo envía si cambió y como máximo cada SEND_INTERVAL_MS. */
  updateLocalState(state: PlayerState) {
    this.pending = state;
    if (this.sendTimer || sameState(state, this.lastSent)) return;
    const wait = Math.max(0, SEND_INTERVAL_MS - (performance.now() - this.lastSentAt));
    this.sendTimer = setTimeout(() => this.flushPosition(), wait);
  }

  private flushPosition(force = false) {
    this.sendTimer = null;
    const state = this.pending;
    if (!state || (!force && sameState(state, this.lastSent))) return;
    if (this.send("pos", { id: this.self.id, ...state })) {
      this.lastSent = state;
      this.lastSentAt = performance.now();
    }
  }

  private resendPosition() {
    if (this.sendTimer) clearTimeout(this.sendTimer);
    this.flushPosition(true);
  }

  private handlePresenceSync() {
    const channel = this.channel;
    if (!channel) return;
    const state = channel.presenceState<Member>();
    const members: Member[] = [];
    for (const [key, metas] of Object.entries(state)) {
      const m = metas[0];
      if (m && typeof m.name === "string" && typeof m.color === "string" && HEX_COLOR.test(m.color)) {
        members.push({
          id: key,
          name: m.name.slice(0, MAX_NAME_LENGTH),
          color: m.color,
          joinedAt: Number(m.joinedAt) || 0,
        });
      }
    }
    // Entra quien llegó primero; si empatan, decide el ID.
    members.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
    const admitted = members.slice(0, MAX_MEMBERS);
    const iAmPresent = members.some((m) => m.id === this.self.id);
    const iAmAdmitted = admitted.some((m) => m.id === this.self.id);

    if (iAmPresent && !iAmAdmitted) {
      this.setStatus("full");
      this.destroy();
      return;
    }
    this.events.onMembers(admitted.filter((m) => m.id !== this.self.id));
  }

  private armWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      this.scheduleReconnect();
    }, REJOIN_WATCHDOG_MS);
  }

  private clearWatchdog() {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  /** Tira el canal actual y crea uno nuevo con espera exponencial. */
  private scheduleReconnect() {
    if (this.destroyed || this.retryTimer) return;
    this.clearWatchdog();
    this.setStatus("reconnecting");
    const old = this.channel;
    this.channel = null;
    if (old) void getSupabase().removeChannel(old);
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt);
    this.attempt++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status || (this.status === "full" && status !== "full")) return;
    this.status = status;
    this.events.onStatus(status);
  }

  /** Sale del canal y cancela todo. Idempotente. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearWatchdog();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.sendTimer) clearTimeout(this.sendTimer);
    const channel = this.channel;
    this.channel = null;
    // Salir del canal borra mi presencia en el servidor; no hace falta untrack().
    if (channel) void getSupabase().removeChannel(channel);
  }
}
