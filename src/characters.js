// Personajes originales inspirados en el género de peleas de Ki.
export const CHARS = [
  {
    id: 'kaito', name: 'KAITO', title: 'EL GUERRERO',
    skin: 0xf3c692, gi: 0xff7a1a, pants: 0xff7a1a, belt: 0x2347c9, boots: 0x2347c9,
    hair: 0x14141c, superHair: 0xffd83a, hairStyle: 'spiky',
    aura: 0xffe066, ki: 0xffd25a, kiCore: 0xffffff,
    hp: 100, speed: 1.0, power: 1.0, scale: 1.0,
  },
  {
    id: 'ryuzen', name: 'RYUZEN', title: 'PRÍNCIPE ESCARCHA',
    skin: 0xeab98f, gi: 0x2d55d8, pants: 0x1c2f86, belt: 0xe8e8f0, boots: 0xe8e8f0,
    hair: 0xc9d4e8, superHair: 0x7ff0ff, hairStyle: 'long',
    aura: 0x6fe3ff, ki: 0x55d6ff, kiCore: 0xe8ffff,
    hp: 90, speed: 1.12, power: 0.92, scale: 0.97,
  },
  {
    id: 'brolok', name: 'BROLOK', title: 'EL COLOSO',
    skin: 0x84c86c, gi: 0x6b2f9e, pants: 0x4a1f72, belt: 0xffd83a, boots: 0x2b2b35,
    hair: 0x000000, superHair: 0x000000, hairStyle: 'bald',
    aura: 0xff4d4d, ki: 0xff5a3c, kiCore: 0xffe3a0,
    hp: 130, speed: 0.84, power: 1.22, scale: 1.16,
  },
];

// Estado compartido entre escenas.
export const session = { mode: 1, diff: 1, p1: 0, p2: 1 };
export const DIFFS = ['FÁCIL', 'NORMAL', 'DIFÍCIL'];
