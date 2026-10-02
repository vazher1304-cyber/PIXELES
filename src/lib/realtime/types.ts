import type { Direction } from "@/game/Avatar";

export interface Member {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export interface PlayerState {
  x: number;
  y: number;
  dir: Direction;
  moving: boolean;
}

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "full";

const DIRECTIONS = new Set(["up", "down", "left", "right"]);

export function isPlayerState(v: unknown): v is PlayerState {
  const s = v as PlayerState;
  return (
    typeof s === "object" &&
    s !== null &&
    Number.isFinite(s.x) &&
    Number.isFinite(s.y) &&
    DIRECTIONS.has(s.dir) &&
    typeof s.moving === "boolean"
  );
}

export function sameState(a: PlayerState | null, b: PlayerState | null) {
  return !!a && !!b && a.x === b.x && a.y === b.y && a.dir === b.dir && a.moving === b.moving;
}

export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
