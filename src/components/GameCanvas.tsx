"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { LocalPlayer, SceneBridge } from "@/game/OfficeScene";

interface Props {
  player: LocalPlayer;
  bridge: SceneBridge;
}

/** Monta el juego de Phaser. Phaser se importa dinámicamente para que solo exista en el cliente. */
export default function GameCanvas({ player, bridge }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Los callbacks se leen a través de una ref para no recrear el juego si cambian.
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const [{ default: PhaserLib }, { OfficeScene }] = await Promise.all([
        import("phaser"),
        import("@/game/OfficeScene"),
      ]);
      if (cancelled || !containerRef.current) return;

      game = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: containerRef.current,
        backgroundColor: "#1b1b2a",
        pixelArt: true,
        physics: { default: "arcade", arcade: { debug: false } },
        scale: { mode: PhaserLib.Scale.RESIZE, width: "100%", height: "100%" },
        audio: { noAudio: true },
        banner: false,
      });
      const proxy: SceneBridge = {
        onZoneChange: (zone) => bridgeRef.current.onZoneChange?.(zone),
      };
      game.scene.add(OfficeScene.KEY, OfficeScene, true, { player, bridge: proxy });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
    // El jugador no cambia mientras el juego está montado.
  }, []);

  return <div ref={containerRef} className="game-container" />;
}
