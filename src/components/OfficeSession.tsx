"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ZONE_NAMES, type ZoneId } from "@/game/map";
import { RemotePlayers } from "@/game/remotePlayers";
import type { SceneBridge } from "@/game/OfficeScene";
import { MAX_MEMBERS } from "@/lib/config";
import type { Profile } from "@/lib/profile";
import { OfficeChannel } from "@/lib/realtime/officeChannel";
import { randomId, type ConnectionStatus, type Member } from "@/lib/realtime/types";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  reconnecting: "Reconectando…",
  full: "Oficina llena",
};

interface Props {
  officeId: string;
  profile: Profile;
  onRetry: () => void;
}

export default function OfficeSession({ officeId, profile, onRetry }: Props) {
  const [self] = useState<Member>(() => ({ id: randomId(), ...profile, joinedAt: Date.now() }));
  const remotes = useMemo(() => new RemotePlayers(), []);
  const channelRef = useRef<OfficeChannel | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [members, setMembers] = useState<Member[]>([]);
  const [zone, setZone] = useState<ZoneId | null>(null);

  useEffect(() => {
    const channel = new OfficeChannel(officeId, self, {
      onStatus: setStatus,
      onMembers: (list) => {
        remotes.setMembers(list);
        setMembers(list);
      },
      onPosition: (id, state) => remotes.push(id, state),
    });
    channelRef.current = channel;
    channel.connect();

    // Al cerrar la pestaña, salir del canal para que los demás dejen de verme al instante.
    const leave = () => channel.destroy();
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      channel.destroy();
      channelRef.current = null;
      remotes.setMembers([]);
    };
  }, [officeId, self, remotes]);

  const bridge: SceneBridge = {
    onZoneChange: setZone,
    onLocalState: (state) => channelRef.current?.updateLocalState(state),
  };

  if (status === "full") {
    return (
      <main className="center-screen">
        <div className="card">
          <h1 className="title">Oficina llena</h1>
          <p className="muted">
            Ya hay {MAX_MEMBERS} personas en <strong>{officeId}</strong>. Espera a que alguien salga e
            inténtalo de nuevo.
          </p>
          <button className="btn primary" onClick={onRetry}>
            Reintentar
          </button>
          <Link className="btn" href="/">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="office">
      <GameCanvas player={profile} remotes={remotes} bridge={bridge} />
      <div className="hud top-left">
        <div className="hud-row">
          <span className={`status-dot ${status}`} />
          <strong>{officeId}</strong>
          <span className="muted small">{STATUS_LABEL[status]}</span>
        </div>
        <ul className="people">
          <li>
            <span className="dot" style={{ background: profile.color }} />
            {profile.name} <span className="muted">(tú)</span>
          </li>
          {members.map((m) => (
            <li key={m.id}>
              <span className="dot" style={{ background: m.color }} />
              {m.name}
            </li>
          ))}
        </ul>
        <span className="muted small">
          {members.length + 1}/{MAX_MEMBERS} personas
        </span>
      </div>
      <div className="hud top-right">{zone ? ZONE_NAMES[zone] : "Salón abierto"}</div>
      <div className="toolbar">
        <span className="muted small">Muévete con flechas o WASD</span>
        <Link className="btn danger" href="/">
          Salir
        </Link>
      </div>
    </div>
  );
}
