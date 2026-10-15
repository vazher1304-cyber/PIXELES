// Datos de golpes (frame data en segundos). hs/he = ventana activa, y0/y1 relativos a los pies.
export const MOVES = {
  p1: { anim: 'p1', dur: 0.24, hs: 0.06, he: 0.14, dmg: 5, reach: 64, y0: -108, y1: -55, kb: 110, stun: 0.26, tier: 'small', snd: 'punch' },
  p2: { anim: 'p2', dur: 0.24, hs: 0.06, he: 0.14, dmg: 6, reach: 66, y0: -108, y1: -55, kb: 130, stun: 0.28, tier: 'small', snd: 'punch' },
  p3: { anim: 'p3', dur: 0.42, hs: 0.12, he: 0.22, dmg: 10, reach: 78, y0: -112, y1: -45, kb: 380, stun: 0.5, launch: true, tier: 'medium', snd: 'heavy' },
  kick: { anim: 'kick', dur: 0.46, hs: 0.15, he: 0.27, dmg: 12, reach: 86, y0: -104, y1: -12, kb: 330, stun: 0.4, heavy: true, tier: 'medium', snd: 'kick' },
  air: { anim: 'air', dur: 0.34, hs: 0.06, he: 0.24, dmg: 9, reach: 72, y0: -104, y1: -6, kb: 280, stun: 0.35, tier: 'small', snd: 'kick' },
};
export const KI = { blast: 10, special: 50, transform: 100, dash: 6, passive: 2.5, charge: 38, onHit: 4, onHurt: 3, superRegen: 6 };
