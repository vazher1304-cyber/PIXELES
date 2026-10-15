# Prototype brief (skill: `prototype-fast`)

```text
QUESTION:   ¿Es satisfactorio un combate 1v1 de ki estilo "Dragon Ball Devolution"
            (golpes encadenados + ráfagas + rayo + transformación) en el navegador?
CORE VERB:  Golpear / lanzar ki a un rival, administrando la barra de ki.
THROWAWAY?: no — estructura mínima para crecer (escenas, sistemas, datos).
TIMEBOX:    una sesión para el vertical slice (3 luchadores, 3 escenarios, 1P/2P).
KEEP IF:    un jugador nuevo encadena golpes y usa el rayo sin explicación en ~30 s
            y pide "otra ronda".
KILL IF:    solo es divertido tras explicar los controles, o el combate depende
            de sistemas fuera del alcance del slice.
```

Género: no existe skill de "pelea" en el catálogo, así que el router compone
`phaser-core` + `phaser-arcade-physics` + `input-systems` + `game-ai` + `game-feel` +
`camera-systems` + `audio-design` + `game-ui-ux` + `create-game-assets` (+ `platformer`
como referencia de feel: coyote/buffer, gravedad asimétrica, `physics-tuning`).
