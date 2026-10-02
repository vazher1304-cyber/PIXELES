"use client";

import { useState } from "react";
import { AVATAR_COLORS, MAX_NAME_LENGTH, type Profile } from "@/lib/profile";

interface Props {
  officeId: string;
  initial: Profile | null;
  onJoin: (profile: Profile) => void;
}

export default function JoinForm({ officeId, initial, onJoin }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? AVATAR_COLORS[5]);
  const trimmed = name.trim();

  return (
    <main className="center-screen">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onJoin({ name: trimmed, color });
        }}
      >
        <h1 className="title">Pixeles</h1>
        <p className="muted">
          Oficina: <strong>{officeId}</strong>
        </p>
        <label className="field">
          <span>Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Ej. Ana"
            autoFocus
          />
        </label>
        <div className="field">
          <span>Color</span>
          <div className="swatches">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch${c === color ? " selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        <button className="btn primary" type="submit" disabled={!trimmed}>
          Entrar a la oficina
        </button>
      </form>
    </main>
  );
}
