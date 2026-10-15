# Art direction brief (skill: `create-game-assets`)

## Game frame
- Player fantasy: guerrero de ki que se transforma y desata rayos.
- Core verbs: golpear, patear, lanzar ráfaga, rayo, cargar ki, transformar, esquivar.
- Engine/renderer: Phaser 4.2 (WebGL con fallback Canvas), Arcade Physics.
- Camera/view/facing: lateral 2D, personajes miran a la derecha en la hoja y se voltean (`flipX`).
- Native viewport: 960×540 (escala FIT). Luchador en pantalla ≈ 115–135 px de alto.

## Visual system
- Shape language: siluetas angulosas y claras; pelo en púas (Kaito/Ryuzen), cráneo liso y
  hombros anchos (Brolok). Extremidades de grosor constante, manos/pies redondeados.
- Silhouette priorities: pelo, puños y pies deben leerse sobre cualquier fondo.
- Value structure: personaje más saturado y contrastado que el fondo (fondos de bajo contraste).
- Palette roles (hex):
  - Kaito: gi `#ff7a1a`, cinturón/botas `#2347c9`, pelo `#14141c` → súper `#ffd83a`.
  - Ryuzen: gi `#2d55d8`, pantalón `#1c2f86`, cinturón/botas `#e8e8f0`, pelo `#c9d4e8` → súper `#7ff0ff`.
  - Brolok: piel `#84c86c`, gi `#6b2f9e`, cinturón `#ffd83a`, aura `#ff4d4d`.
  - Ki: color de aura por personaje + núcleo blanco. Daño = blanco; bloqueo = azul `#7fd0ff`.
- Edge treatment: formas planas con borde suave (supersampling ×4, reducción LANCZOS).
- Light: sin sombreado baked; solo oscurecimiento 0.72–0.78 de la extremidad trasera.
- Detail density: baja; el detalle vive en el rostro (ceja, ojo, boca).
- Motion character: rápido y elástico; poses exageradas en golpes (extensión máxima en el frame activo).
- Exclusions: texto, marcos, firmas, escenografía dentro de los sprites.

## Technical contract
- Hojas de luchador: atlas Phaser (PNG + JSON hash), frames 256×192, ancla pie-centro (128,180).
- Alfa: RGBA con transparencia real. Filtrado: lineal (arte suavizado, no pixel art).
- Efectos (`fx`): glow, beam, spark, ring en un atlas aparte, uso con mezcla ADD.
- Escenarios: capas independientes `sky / far / near / ground` (las 3 repetibles en horizontal).
- Naming: `<id>.png|json`, `<id>_super.png|json`, `stage_<id>_<capa>.png`.
- Generación: `tools/build_sprites.py` (determinista, sin IA generativa) → `asset-manifest.json`.

## Visual target
- Seeds: `public/assets/fighters/*_idle` (frame `idle_0`).
- Revisión: contact sheet (`tools/preview/*.png`) + captura en juego a escala nativa.
