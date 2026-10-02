"use client";

import { useEffect, useState } from "react";
import JoinForm from "./JoinForm";
import OfficeSession from "./OfficeSession";
import { isSupabaseConfigured } from "@/lib/config";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";

export default function OfficeRoom({ officeId }: { officeId: string }) {
  const [saved, setSaved] = useState<Profile | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Cambiar la key remonta la sesión desde cero (p. ej. "Reintentar" con la oficina llena).
  const [sessionKey, setSessionKey] = useState(0);

  // localStorage solo existe en el cliente: se lee después de montar.
  useEffect(() => setSaved(loadProfile()), []);

  if (saved === undefined) return null;

  if (!isSupabaseConfigured) {
    return (
      <main className="center-screen">
        <div className="card">
          <h1 className="title">Falta configuración</h1>
          <p className="muted">
            Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
            <code>.env.local</code> (o en Vercel) y reinicia el servidor.
          </p>
        </div>
      </main>
    );
  }

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
    <OfficeSession
      key={sessionKey}
      officeId={officeId}
      profile={profile}
      onRetry={() => setSessionKey((k) => k + 1)}
    />
  );
}
