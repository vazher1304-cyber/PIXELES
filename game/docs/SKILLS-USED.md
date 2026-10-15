# Cómo se usaron las skills del repositorio

El router (`../router/SKILL.md`) detectó **Phaser** (`package.json` con `phaser`). No hay skill de género
"pelea", así que se compusieron estas (cada una se leyó completa antes de escribir código):

| Skill | Dónde se aplica |
|---|---|
| `prototype-fast` | `docs/prototype-brief.md`: pregunta, verbo central, criterios de keep/kill. |
| `create-game-assets` | `docs/art-direction-brief.md`, `docs/asset-manifest.json`, `tools/build_sprites.py`; QA con `asset_report.py` y hoja de contacto (`docs/asset-qa-report.json`). Anclas fijas, atlas con nombres estables, alfa verificado. |
| `phaser-core` | Escenas con `init()` para reiniciar estado, `launch` para HUD, `pause`+`launch` para el menú modal, limpieza en `shutdown`. |
| `phaser-arcade-physics` | Luchadores como `physics.add.sprite` con hitbox ajustada (`setSize/setOffset`), límites del mundo, `collider` con `processCallback`, `overlap` registrado una sola vez, `overlapRect` para hitboxes de ataque. |
| `physics-tuning` | Paso fijo de 60 Hz (`arcade.fps`), lógica de combate en `worldstep`, velocidad máxima, gravedad asimétrica. |
| `platformer` (feel) | Salto derivado de altura + tiempo hasta el vértice; caída 1.6× más pesada. |
| `input-systems` | `systems/actions.js`: acciones (no teclas), flanco vs mantenido, buffer de 0.12 s, zona muerta radial, rebinding con conflictos y persistencia. |
| `game-ai` | `fighter/states.js` (FSM por estado) y `ai/` (árbol de comportamiento con RUNNING, selector reactivo, cooldown y pizarra). |
| `game-feel` | `systems/juice.js`: trauma^2, hit-stop en tiempo real, flash, squash & stretch, números con easing, tiers small/medium/large, opciones de accesibilidad. |
| `camera-systems` | Encuadre de dos objetivos, suavizado `1-exp(-k·dt)`, zoom acotado, límites del mundo, shake aditivo. |
| `audio-design` | Buses (music/sfx → master + limitador), volumen en dB, ducking, variación de SFX, música adaptativa por capas cuantizada al compás. |
| `game-ui-ux` | HUD en su escena, actualizado por eventos; foco inicial y navegación por teclado/gamepad; pila de pantallas (menú → selección → combate → pausa). |

Notas:
- El baseline de versión es Phaser 4.2 (`docs/VERSION-SUPPORT.md`). Se detectaron cambios de API de Phaser 4
  (p. ej. `setTintFill` → `setTint(...).setTintMode(Phaser.TintModes.FILL)`).
- Sin interpolación de render: la simulación va a 60 Hz fijos; en monitores de alta frecuencia el movimiento sigue ese paso.
