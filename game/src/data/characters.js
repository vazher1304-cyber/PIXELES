export const CHARS = [
  { id: 'kaito', name: 'KAITO', title: 'EL GUERRERO', hp: 100, speed: 1.0, power: 1.0, scale: 1.0,
    aura: 0xffe066, ki: 0xffd25a, core: 0xffffff },
  { id: 'ryuzen', name: 'RYUZEN', title: 'PRÍNCIPE ESCARCHA', hp: 90, speed: 1.12, power: 0.92, scale: 0.97,
    aura: 0x6fe3ff, ki: 0x55d6ff, core: 0xe8ffff },
  { id: 'brolok', name: 'BROLOK', title: 'EL COLOSO', hp: 130, speed: 0.84, power: 1.22, scale: 1.16,
    aura: 0xff4d4d, ki: 0xff5a3c, core: 0xffe3a0 },
];
export const STAGES = ['llanura', 'atardecer', 'isla'];
export const STAGE_INFO = {
  llanura: { name: 'LLANURA', ground: 0x7a5a3a },
  atardecer: { name: 'ATARDECER', ground: 0x4a2a28 },
  isla: { name: 'ISLA VERDE', ground: 0x2f5a3a },
};
export const DIFFS = ['FÁCIL', 'NORMAL', 'DIFÍCIL'];
export const ANIM_IDS = ['idle', 'walk', 'jump', 'p1', 'p2', 'p3', 'kick', 'air', 'block', 'hurt', 'launched', 'down', 'ko', 'charge', 'cast', 'wind', 'fire', 'transform', 'dash', 'win'];

// Estado compartido entre escenas (se reinicia en `init` de cada escena que lo usa).
export const session = { mode: 1, diff: 1, p1: 0, p2: 1 };
