// Constantes del juego. Los valores de salto se DERIVAN de altura y tiempo (skill `platformer`).
export const VIEW = { w: 960, h: 540 };
export const WORLD_W = 1800;
export const GROUND_Y = 440;
export const MAX_SEPARATION = 1250;   // distancia máxima entre luchadores (limita el zoom-out)

export const TUNING = {
  jumpHeight: 125,        // px
  timeToApex: 0.36,       // s
  fallMult: 1.6,          // caída más pesada que la subida
  maxFall: 1300,
  get gravity() { return (2 * this.jumpHeight) / (this.timeToApex ** 2); },
  get jumpVelocity() { return (2 * this.jumpHeight) / this.timeToApex; },
  bufferWindow: 0.12,     // s — input buffering (skill `input-systems`)
  roundTime: 60,
};

// Niveles de feedback (skill `game-feel`: tiers de importancia).
export const TIERS = {
  small: { trauma: 0.12, stop: 0, parts: 3 },
  medium: { trauma: 0.35, stop: 0.05, parts: 8 },
  large: { trauma: 0.8, stop: 0.12, parts: 24 },
};

export const FONT = 'Impact, "Arial Black", sans-serif';
export const BODY = 'system-ui, "Segoe UI", sans-serif';
