import Phaser from "phaser";
import { ensureAvatarTexture, frameName, type Facing } from "./textures";

export type Direction = "up" | "down" | "left" | "right";

const LABEL_OFFSET_Y = 24;

/** Sprite del avatar + nombre encima. Sirve tanto para el jugador local como para los remotos. */
export class Avatar {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text;
  private readonly textureKey: string;
  private direction: Direction = "down";
  private moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: string) {
    this.textureKey = ensureAvatarTexture(scene, color);
    this.sprite = scene.add.sprite(x, y, this.textureKey, frameName("down", 0));
    this.label = scene.add
      .text(x, y - LABEL_OFFSET_Y, name, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#ffffff",
        backgroundColor: "rgba(20,20,32,0.75)",
        padding: { x: 4, y: 2 },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(100000);
    this.syncDecorations();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  get facing(): Direction {
    return this.direction;
  }

  get isMoving() {
    return this.moving;
  }

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
    this.syncDecorations();
  }

  setName(name: string) {
    this.label.setText(name);
  }

  /** Actualiza animación según dirección y si se está moviendo. */
  setMotion(direction: Direction, moving: boolean) {
    if (direction === this.direction && moving === this.moving) return;
    this.direction = direction;
    this.moving = moving;
    const facing: Facing = direction === "left" || direction === "right" ? "side" : direction;
    this.sprite.setFlipX(direction === "left");
    if (moving) {
      this.sprite.play(`${this.textureKey}-walk-${facing}`, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(frameName(facing, 0));
    }
  }

  /** Mantiene el nombre encima y ordena por profundidad (los de más abajo tapan a los de arriba). */
  syncDecorations() {
    this.sprite.setDepth(10 + this.sprite.y);
    // Sin bajar de y=16 para que el nombre no se salga por el borde superior del mapa.
    const labelY = Math.max(16, this.sprite.y - LABEL_OFFSET_Y);
    this.label.setPosition(Math.round(this.sprite.x), Math.round(labelY));
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
  }
}
