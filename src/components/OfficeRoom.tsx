"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import JoinForm from "./JoinForm";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { ZONE_NAMES, type ZoneId } from "@/game/map";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

export default function OfficeRoom({ officeId }: { officeId: string }) {
  const [saved, setSaved] = useState<Profile | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [zone, setZone] = useState<ZoneId | null>(null);

  // localStorage solo existe en el cliente: se lee después de montar.
  useEffect(() => setSaved(loadProfile()), []);

  if (saved === undefined) return null;

  if (!profile) {
    return (
      <JoinForm
        officeId={officeId}
        initial={saved}
        onJoin={(p) => {
          saveProfile(p);
          setProfile(p);
        }}
      />
    );
  }

  return (
    <div className="office">
      <GameCanvas player={profile} bridge={{ onZoneChange: setZone }} />
      <div className="hud top-left">
        <span className="dot" style={{ background: profile.color }} />
        <strong>{profile.name}</strong>
        <span className="muted">· {officeId}</span>
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
