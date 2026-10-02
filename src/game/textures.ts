import type Phaser from "phaser";
import { TILE_COUNT, TILE_SIZE, Tile } from "./map";

// Todos los gráficos se dibujan con Canvas 2D en tiempo de ejecución: no hay assets externos.

export const TILESET_KEY = "office-tiles";

type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawWoodFloor(ctx: Ctx, ox: number) {
  rect(ctx, ox, 0, TILE_SIZE, TILE_SIZE, "#c9a27a");
  for (let y = 0; y < TILE_SIZE; y += 8) {
    rect(ctx, ox, y + 6, TILE_SIZE, 2, "#b68d65");
    const seam = (y / 8) % 2 === 0 ? 10 : 24;
    rect(ctx, ox + seam, y, 2, 6, "#b68d65");
  }
}

function drawCarpet(ctx: Ctx, ox: number, base: string, dot: string) {
  rect(ctx, ox, 0, TILE_SIZE, TILE_SIZE, base);
  for (let y = 2; y < TILE_SIZE; y += 8) {
    for (let x = 2; x < TILE_SIZE; x += 8) {
      rect(ctx, ox + x + ((y / 8) % 2) * 4, y, 2, 2, dot);
    }
  }
}

function drawWall(ctx: Ctx, ox: number) {
  rect(ctx, ox, 0, TILE_SIZE, TILE_SIZE, "#4a4e69");
  rect(ctx, ox, 0, TILE_SIZE, 4, "#6b6f8e");
  for (let y = 8; y < TILE_SIZE; y += 8) {
    rect(ctx, ox, y, TILE_SIZE, 2, "#3c3f57");
    const off = (y / 8) % 2 === 0 ? 6 : 20;
    rect(ctx, ox + off, y - 6, 2, 6, "#3c3f57");
  }
}

function drawDesk(ctx: Ctx, ox: number) {
  drawWoodFloor(ctx, ox);
  rect(ctx, ox + 2, 22, 4, 8, "#5d4037");
  rect(ctx, ox + 26, 22, 4, 8, "#5d4037");
  rect(ctx, ox + 0, 10, TILE_SIZE, 14, "#8d6e63");
  rect(ctx, ox + 0, 10, TILE_SIZE, 2, "#a1887f");
  // monitor
  rect(ctx, ox + 8, 0, 16, 12, "#263238");
  rect(ctx, ox + 10, 2, 12, 8, "#4fc3f7");
  rect(ctx, ox + 14, 12, 4, 2, "#263238");
  // teclado
  rect(ctx, ox + 8, 16, 16, 4, "#cfd8dc");
}

function drawTable(ctx: Ctx, ox: number) {
  rect(ctx, ox, 0, TILE_SIZE, TILE_SIZE, "#9c7a5b");
  rect(ctx, ox, 0, TILE_SIZE, 2, "#b08e6e");
  rect(ctx, ox + 4, 12, 24, 2, "#8a6a4d");
  rect(ctx, ox + 8, 22, 16, 2, "#8a6a4d");
}

function drawPlant(ctx: Ctx, ox: number) {
  drawWoodFloor(ctx, ox);
  rect(ctx, ox + 10, 20, 12, 10, "#a0522d");
  rect(ctx, ox + 8, 18, 16, 4, "#b5653a");
  rect(ctx, ox + 8, 6, 16, 12, "#2e7d32");
  rect(ctx, ox + 4, 10, 6, 6, "#388e3c");
  rect(ctx, ox + 22, 10, 6, 6, "#388e3c");
  rect(ctx, ox + 12, 2, 8, 6, "#43a047");
  rect(ctx, ox + 12, 8, 4, 4, "#66bb6a");
}

function drawSofa(ctx: Ctx, ox: number) {
  drawWoodFloor(ctx, ox);
  rect(ctx, ox, 4, TILE_SIZE, 12, "#7b1fa2");
  rect(ctx, ox, 14, TILE_SIZE, 12, "#9c27b0");
  rect(ctx, ox, 14, TILE_SIZE, 2, "#ab47bc");
  rect(ctx, ox, 26, TILE_SIZE, 2, "#4a148c");
}

function drawDoor(ctx: Ctx, ox: number) {
  drawWoodFloor(ctx, ox);
  rect(ctx, ox, 0, TILE_SIZE, 4, "#8d6e63");
  rect(ctx, ox, 28, TILE_SIZE, 4, "#8d6e63");
}

export function createTileset(scene: Phaser.Scene) {
  if (scene.textures.exists(TILESET_KEY)) return;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_COUNT * TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const at = (i: number) => i * TILE_SIZE;
  drawWoodFloor(ctx, at(Tile.Hall));
  drawCarpet(ctx, at(Tile.RoomA), "#5b7fb5", "#6d90c6");
  drawCarpet(ctx, at(Tile.RoomB), "#6f9a52", "#80ab62");
  drawWall(ctx, at(Tile.Wall));
  drawDesk(ctx, at(Tile.Desk));
  drawTable(ctx, at(Tile.Table));
  drawPlant(ctx, at(Tile.Plant));
  drawSofa(ctx, at(Tile.Sofa));
  drawDoor(ctx, at(Tile.Door));
  scene.textures.addCanvas(TILESET_KEY, canvas);
}

// ---------- Avatares ----------

// 12x16 "píxeles" lógicos por cuadro. h=pelo s=piel e=ojo c=camisa d=camisa oscura p=pantalón k=zapato
const HEAD: Record<Facing, string[]> = {
  down: [
    "...hhhhhh...",
    "..hhhhhhhh..",
    "..hssssssh..",
    "..ssessess..",
    "..ssssssss..",
    "...ssssss...",
    "....ssss....",
  ],
  up: [
    "...hhhhhh...",
    "..hhhhhhhh..",
    "..hhhhhhhh..",
    "..hhhhhhhh..",
    "..hhhhhhhh..",
    "...hhhhhh...",
    "....ssss....",
  ],
  side: [
    "...hhhhhh...",
    "..hhhhhhhh..",
    "..hhsssssh..",
    "..hssssses..",
    "..hsssssss..",
    "...ssssss...",
    "....ssss....",
  ],
};

const BODY = [
  "..cccccccc..",
  ".cccccccccc.",
  ".cdccccccdc.",
  ".sccccccccs.",
  "..dddddddd..",
];

const LEGS = [
  ["...pp..pp...", "...pp..pp...", "...pp..pp...", "..kkk..kkk.."],
  ["...pp..pp...", "...pp..pp...", "..kkk..pp...", ".......kkk.."],
  ["...pp..pp...", "...pp..pp...", "...pp..kkk..", "..kkk......."],
];

export type Facing = "down" | "up" | "side";
const FACINGS: Facing[] = ["down", "up", "side"];
const STEPS = 3;

const PIXEL = 2; // tamaño en px de cada "píxel" lógico
const GRID_W = 12 + 2; // +2 por el contorno
const GRID_H = 16 + 2;
export const AVATAR_FRAME_W = GRID_W * PIXEL;
export const AVATAR_FRAME_H = GRID_H * PIXEL;

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
}

function drawAvatarFrame(ctx: Ctx, ox: number, facing: Facing, step: number, color: string) {
  const palette: Record<string, string> = {
    h: "#3b2a20",
    s: "#f1c27d",
    e: "#1b1b1b",
    c: color,
    d: shade(color, 0.7),
    p: "#2f3b52",
    k: "#1e1e1e",
  };
  const rows = [...HEAD[facing], ...BODY, ...LEGS[step]];
  // Rejilla con 1 celda de margen para el contorno.
  const grid: (string | null)[][] = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch !== ".") grid[y + 1][x + 1] = palette[ch];
    });
  });
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let color = grid[y][x];
      if (!color) {
        const neighbor =
          grid[y - 1]?.[x] || grid[y + 1]?.[x] || grid[y]?.[x - 1] || grid[y]?.[x + 1];
        if (!neighbor) continue;
        color = "#141420";
      }
      rect(ctx, ox + x * PIXEL, y * PIXEL, PIXEL, PIXEL, color);
    }
  }
}

export function avatarTextureKey(color: string) {
  return `avatar-${color.replace("#", "").toLowerCase()}`;
}

export function frameName(facing: Facing, step: number) {
  return `${facing}-${step}`;
}

/** Crea (si no existe) la textura y las animaciones de caminar para un color de camisa. */
export function ensureAvatarTexture(scene: Phaser.Scene, color: string): string {
  const key = avatarTextureKey(color);
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_FRAME_W * FACINGS.length * STEPS;
  canvas.height = AVATAR_FRAME_H;
  const ctx = canvas.getContext("2d")!;
  const texture = scene.textures.addCanvas(key, canvas)!;

  let i = 0;
  for (const facing of FACINGS) {
    for (let step = 0; step < STEPS; step++) {
      const ox = i * AVATAR_FRAME_W;
      drawAvatarFrame(ctx, ox, facing, step, color);
      texture.add(frameName(facing, step), 0, ox, 0, AVATAR_FRAME_W, AVATAR_FRAME_H);
      i++;
    }
  }
  texture.refresh();

  for (const facing of FACINGS) {
    scene.anims.create({
      key: `${key}-walk-${facing}`,
      frames: [1, 0, 2, 0].map((step) => ({ key, frame: frameName(facing, step) })),
      frameRate: 8,
      repeat: -1,
    });
  }
  return key;
}
