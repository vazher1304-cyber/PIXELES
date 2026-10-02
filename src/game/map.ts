// Mapa fijo de la oficina. Cada carácter es un tile de TILE_SIZE px.
//   #  pared            .  piso del salón abierto
//   a  piso sala 1      b  piso sala 2
//   +  puerta           T  mesa de reuniones
//   D  escritorio       P  planta
//   S  sofá
const LAYOUT = [
  "##############################",
  "#aaaaaaaaa#........#bbbbbbbbb#",
  "#aaaaaaaaa#P......P#bbbbbbbbb#",
  "#aaTTTTTaa#........#bbTTTTTbb#",
  "#aaTTTTTaa#........#bbTTTTTbb#",
  "#aaaaaaaaa#........#bbbbbbbbb#",
  "#aaaaaaaaa#........#bbbbbbbbb#",
  "#####+#####........#####+#####",
  "#............................#",
  "#..DD..DD..............SSS...#",
  "#............................#",
  "#............................#",
  "#..DD..DD..............P.....#",
  "#............................#",
  "#P..........................P#",
  "##############################",
];

export const TILE_SIZE = 32;
export const MAP_COLS = LAYOUT[0].length;
export const MAP_ROWS = LAYOUT.length;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// Índices de tile dentro del tileset generado en textures.ts (mismo orden).
export const Tile = {
  Hall: 0,
  RoomA: 1,
  RoomB: 2,
  Wall: 3,
  Desk: 4,
  Table: 5,
  Plant: 6,
  Sofa: 7,
  Door: 8,
} as const;
export const TILE_COUNT = 9;

export const SOLID_TILES: number[] = [Tile.Wall, Tile.Desk, Tile.Table, Tile.Plant, Tile.Sofa];

const CHAR_TO_TILE: Record<string, number> = {
  ".": Tile.Hall,
  a: Tile.RoomA,
  b: Tile.RoomB,
  "#": Tile.Wall,
  D: Tile.Desk,
  T: Tile.Table,
  P: Tile.Plant,
  S: Tile.Sofa,
  "+": Tile.Door,
};

for (const row of LAYOUT) {
  if (row.length !== MAP_COLS) throw new Error(`Fila de mapa con ancho inválido: "${row}"`);
  for (const ch of row) {
    if (!(ch in CHAR_TO_TILE)) throw new Error(`Carácter de mapa desconocido: "${ch}"`);
  }
}

export const MAP_DATA: number[][] = LAYOUT.map((row) => [...row].map((ch) => CHAR_TO_TILE[ch]));

// Zonas: null = salón abierto. Las mesas dentro de una sala cuentan como sala.
export type ZoneId = "sala-1" | "sala-2";

export const ZONE_NAMES: Record<ZoneId, string> = {
  "sala-1": "Sala de reuniones 1",
  "sala-2": "Sala de reuniones 2",
};

function zoneForTile(col: number, row: number): ZoneId | null {
  const ch = LAYOUT[row]?.[col];
  if (ch === "a") return "sala-1";
  if (ch === "b") return "sala-2";
  if (ch === "T") return col < MAP_COLS / 2 ? "sala-1" : "sala-2";
  return null;
}

export function zoneAt(x: number, y: number): ZoneId | null {
  return zoneForTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}

// Aparición: un tile libre al azar del centro del salón, para que no se encimen los avatares.
const SPAWN_AREA = { cols: [11, 20], rows: [9, 13] } as const;

export function randomSpawn(): { x: number; y: number } {
  const free: Array<[number, number]> = [];
  for (let row = SPAWN_AREA.rows[0]; row <= SPAWN_AREA.rows[1]; row++) {
    for (let col = SPAWN_AREA.cols[0]; col <= SPAWN_AREA.cols[1]; col++) {
      if (LAYOUT[row][col] === ".") free.push([col, row]);
    }
  }
  const [col, row] = free[Math.floor(Math.random() * free.length)];
  return { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE };
}
