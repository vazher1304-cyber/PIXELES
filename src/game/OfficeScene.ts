import Phaser from "phaser";
import { Avatar, type Direction } from "./Avatar";
import {
  MAP_DATA,
  MAP_HEIGHT,
  MAP_WIDTH,
  SOLID_TILES,
  TILE_SIZE,
  randomSpawn,
  zoneAt,
  type ZoneId,
} from "./map";
import { TILESET_KEY, createTileset } from "./textures";

const SPEED = 140;

export interface LocalPlayer {
  name: string;
  color: string;
}

/** Callbacks del juego hacia React. */
export interface SceneBridge {
  onZoneChange?: (zone: ZoneId | null) => void;
}

export interface OfficeSceneData {
  player: LocalPlayer;
  bridge: SceneBridge;
}

type MoveKeys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export class OfficeScene extends Phaser.Scene {
  static readonly KEY = "office";

  private bridge: SceneBridge = {};
  private player!: LocalPlayer;
  private me!: Avatar;
  private meBody!: Phaser.Physics.Arcade.Body;
  private keys!: MoveKeys;
  private zone: ZoneId | null = null;

  constructor() {
    super(OfficeScene.KEY);
  }

  init(data: OfficeSceneData) {
    this.player = data.player;
    this.bridge = data.bridge;
  }

  create() {
    createTileset(this);

    const map = this.make.tilemap({ data: MAP_DATA, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision(SOLID_TILES);

    const spawn = randomSpawn();
    this.me = new Avatar(this, spawn.x, spawn.y, this.player.name, this.player.color);
    this.physics.add.existing(this.me.sprite);
    this.meBody = this.me.sprite.body as Phaser.Physics.Arcade.Body;
    // Caja de colisión pequeña a la altura de los pies.
    this.meBody.setSize(14, 8).setOffset(7, 26);
    this.meBody.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.physics.add.collider(this.me.sprite, layer);

    const kb = this.input.keyboard!;
    // Sin capture en WASD para no bloquear la escritura en inputs de la página.
    this.keys = {
      ...kb.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT" }, true),
      ...kb.addKeys({ w: "W", a: "A", s: "S", d: "D" }, false),
    } as MoveKeys;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setRoundPixels(true);
    cam.startFollow(this.me.sprite, true, 0.15, 0.15);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });

    this.updateZone();
  }

  /** Zoom para que el mapa entero quepa en pantalla (entre 1x y 3x). */
  private fitCamera() {
    const { width, height } = this.scale.gameSize;
    const zoom = Phaser.Math.Clamp(Math.min(width / MAP_WIDTH, height / MAP_HEIGHT), 1, 3);
    this.cameras.main.setZoom(zoom);
  }

  update() {
    const k = this.keys;
    // Ignora el teclado si el foco está en un campo de texto.
    const typing = isTyping();
    const left = !typing && (k.left.isDown || k.a.isDown);
    const right = !typing && (k.right.isDown || k.d.isDown);
    const up = !typing && (k.up.isDown || k.w.isDown);
    const down = !typing && (k.down.isDown || k.s.isDown);

    const vx = (right ? 1 : 0) - (left ? 1 : 0);
    const vy = (down ? 1 : 0) - (up ? 1 : 0);
    const velocity = new Phaser.Math.Vector2(vx, vy).normalize().scale(SPEED);
    this.meBody.setVelocity(velocity.x, velocity.y);

    const moving = vx !== 0 || vy !== 0;
    let direction: Direction = this.me.facing;
    if (vx !== 0) direction = vx < 0 ? "left" : "right";
    else if (vy !== 0) direction = vy < 0 ? "up" : "down";
    this.me.setMotion(direction, moving);
    this.me.syncDecorations();

    this.updateZone();
  }

  private updateZone() {
    const zone = zoneAt(this.me.x, this.me.y + 12); // se mide en los pies
    if (zone !== this.zone) {
      this.zone = zone;
      this.bridge.onZoneChange?.(zone);
    }
  }
}

function isTyping() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}
