"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeOfficeId } from "@/lib/profile";

export default function Home() {
  const router = useRouter();
  const [office, setOffice] = useState("mi-equipo");
  const id = normalizeOfficeId(office);

  return (
    <main className="center-screen">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (id) router.push(`/oficina/${id}`);
        }}
      >
        <h1 className="title">Pixeles</h1>
        <p className="muted">Oficina virtual para el equipo.</p>
        <label className="field">
          <span>Nombre de la oficina</span>
          <input value={office} onChange={(e) => setOffice(e.target.value)} maxLength={40} autoFocus />
        </label>
        <p className="muted small">URL: /oficina/{id || "…"}</p>
        <button className="btn primary" type="submit" disabled={!id}>
          Entrar
        </button>
      </form>
    </main>
  );
}
