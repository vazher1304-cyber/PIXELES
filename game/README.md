# Ki Warriors: Evolución

Juego de pelea 2D de combates de ki en el navegador, inspirado en el estilo de *Dragon Ball Devolution*
(peleadores laterales, ráfagas, rayo de ki, transformación). Hecho con **Phaser 4.2** + **Arcade Physics**.
Personajes originales. Todo el arte y el sonido se generan por código (sin assets de terceros).

Se construyó siguiendo las skills del repositorio (`../skills`, `../router`). Ver [`docs/SKILLS-USED.md`](docs/SKILLS-USED.md).

## Ejecutar
```bash
cd game
npm install
npm run dev        # desarrollo (http://localhost:5173)
npm run build      # producción en dist/
npm run assets     # regenera sprites/escenarios (requiere Python 3 + Pillow)
```

## Modos y características
- **1 jugador** vs CPU (fácil / normal / difícil; la CPU usa un árbol de comportamiento) o **2 jugadores** locales.
- 3 luchadores con estadísticas distintas: Kaito (equilibrado), Ryuzen (rápido), Brolok (pesado).
- Puño encadenado (3 golpes), patada, golpes aéreos, guardia, **ráfaga de ki**, **rayo de ki**, cargar ki,
  esquiva y **transformación SÚPER**. Mejor de 3 rondas, 60 s por ronda, 3 escenarios.
- Cámara que encuadra a ambos luchadores (zoom dinámico), hit-stop, temblor por trauma, números de daño.
- Música adaptativa por capas (se intensifica al transformarse o con poca vida) y buses de audio con volumen en dB.
- Menú de **Controles** con reasignación de teclas y detección de conflictos; **Opciones** (volumen, reducir temblor/destellos).
- Teclado y **gamepad**.

## Controles por defecto
| Acción | 1 jugador | J1 (2P) | J2 (2P) |
|---|---|---|---|
| Mover / saltar / guardia | A D / W / S | A D / W / S | ← → / ↑ / ↓ |
| Puño (pulsa en cadena) / patada | J / K | F / G | J / K |
| Ráfaga (10 ki) / rayo (50 ki) | L / U | H / T | L / U |
| Cargar ki (mantener) / transformar (100 ki) | I / O | R / Y | I / O |
| Esquiva | Espacio | Q | Shift |

Gamepad: stick/cruceta mover · A saltar · X puño · Y patada · B ráfaga · RB rayo · LB cargar · R2 transformar · L2 esquiva · Start pausa.
`P` / `Esc` pausan.

## Estructura
```
src/config.js          constantes y tuning (salto derivado de altura + tiempo)
src/data/              personajes y datos de golpes
src/systems/           actions (input), audio, juice (game feel), settings
src/fighter/           Fighter (cuerpo Arcade) + máquina de estados
src/ai/                bt.js (árbol de comportamiento) + brain.js
src/scenes/            Boot, Menu, Options, Controls, Select, Fight, Hud, Pause
tools/build_sprites.py generador determinista de sprites/escenarios
public/assets/         atlas de luchadores, efectos y capas de escenario
docs/                  brief de prototipo, dirección de arte, manifiesto de assets, QA
```
