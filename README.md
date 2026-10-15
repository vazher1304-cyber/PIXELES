# Ki Warriors: Evolución

Juego de pelea 2D de combates de ki (inspirado en el estilo de *Dragon Ball Devolution*), hecho con **Phaser 4** y sin assets externos: personajes, efectos y sonidos se generan por código.

## Ejecutar
```bash
npm install
npm run dev      # desarrollo
npm run build    # producción en dist/
```

## Características
- 3 luchadores (Kaito, Ryuzen, Brolok) con estadísticas distintas.
- 1 jugador vs CPU (fácil / normal / difícil) o 2 jugadores locales.
- Combos de puño, patadas, ráfagas de ki, rayo de ki, cargar ki, esquiva y transformación SÚPER.
- Mejor de 3 rondas, tiempo límite, hit-stop, temblor de pantalla y cámara dinámica.

## Controles
| Acción | 1 jugador | J1 (2P) | J2 (2P) |
|---|---|---|---|
| Mover / saltar / guardia | A D / W / S | A D / W / S | ← → / ↑ / ↓ |
| Puño (encadenar) / patada | J / K | F / G | J / K |
| Ráfaga de ki (10) / rayo (50) | L / U | H / T | L / U |
| Cargar ki / transformar (100) | I / O | R / Y | I / O |
| Esquiva | Espacio | Q | Shift |

`P` pausa, `Esc` vuelve al menú.
