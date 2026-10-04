import { assertNever, type Game } from "./model";
import { drawRiceFlame } from "./rice-flame";
import { SceneEffects } from "./scene-effects";
import { serveOrigin } from "./serve-motion";
import { feedPose } from "./spicy-effect";
import { arcadeThrowHop } from "./throw-motion";

type Scene = "menu" | "play" | "over";
type Pose = "idle" | "stop" | "speaking" | "windup" | "throw" | "panic";
const CELLS = {
  idle: { x: 0, y: 0, width: 512 },
  stop: { x: 512, y: 0, width: 512 },
  windup: { x: 1024, y: 0, width: 512 },
  throw: { x: 0, y: 512, width: 540 },
  speaking: { x: 540, y: 512, width: 484 },
  panic: { x: 1024, y: 512, width: 512 },
} as const;
const THROW_HAND = { x: 464, y: 155 } as const;

export class Tahp {
  private pose: Pose = "idle";
  private bob = 0;
  private lean = 0;
  private hop = 0;
  private replyActive = false;
  private mouthOpen = false;
  private readonly effects: SceneEffects;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly sheet: HTMLImageElement,
    private readonly reduced: boolean,
  ) {
    this.effects = new SceneEffects(ctx);
  }

  setReply(active: boolean, mouthOpen: boolean): void {
    this.replyActive = active;
    this.mouthOpen = mouthOpen;
  }

  draw(game: Game, scene: Scene): void {
    if (game.phase !== "paused") this.animate(game);
    const feed = feedPose(game, this.reduced);
    const feeding = scene === "play" && game.flameCatchSeconds > 0;
    const serving =
      scene === "play" && (feeding || game.slapDelaySeconds > 0 || game.slapSeconds > 0);
    const pose = serving ? "throw" : this.pose;
    const crop = CELLS[pose];
    const ctx = this.ctx;
    const scale = (scene === "menu" ? 280 : scene === "over" ? 186 : 196) / 512;
    const origin = serveOrigin(game, this.reduced);
    const play = scene === "play";
    const x = play ? origin.x : scene === "menu" ? 115 : 71;
    const y = play ? origin.y : 646;
    ctx.save();
    if (play && !serving) ctx.translate(0, this.hop);
    ctx.translate(x, y);
    // Rotate around the palm in play, so the projectile never detaches from its hand.
    ctx.rotate(serving ? 0 : this.lean);
    ctx.scale(serving && game.plate.x < 220 ? -scale : scale, scale);
    ctx.translate(play ? -THROW_HAND.x : -256, play ? -THROW_HAND.y : -512);
    if (pose !== "throw") ctx.translate(0, this.bob / scale);
    ctx.drawImage(this.sheet, crop.x, crop.y, crop.width, 512, crop.x % 512, 0, crop.width, 512);
    if (play && game.combo >= 3 && (pose === "idle" || pose === "windup")) {
      const held = pose === "windup" ? { x: 144, y: 86 } : { x: 189, y: 203 };
      if (!this.reduced) drawRiceFlame(ctx, held, Math.PI / 2, game.clock, 20);
      this.effects.rice(held, 25, true);
    }
    ctx.restore();
    if (feeding && !feed.bite) {
      if (!this.reduced) drawRiceFlame(ctx, origin, Math.PI / 2, game.clock, 10);
      this.effects.rice(origin, 13, true);
    }
  }

  private animate(game: Game): void {
    this.hop =
      game.phase === "flight" ? arcadeThrowHop(game.age, game.flamingShot, this.reduced) : 0;
    this.bob = 0;
    this.lean = 0;
    switch (game.phase) {
      case "menu":
      case "ready": {
        const playful = game.clock % 4.2 > 2.8;
        this.pose = playful ? (Math.sin(game.clock * 18) > 0 ? "stop" : "speaking") : "idle";
        this.bob = Math.sin(game.clock * 3) * 1.5;
        this.lean = playful ? Math.sin(game.clock * 12) * 0.018 : 0;
        break;
      }
      case "charging":
        this.pose = "windup";
        this.lean = -0.015 - game.power * 0.06;
        this.bob = game.power * 3;
        break;
      case "flight":
        this.pose = "throw";
        this.lean = Math.sin(Math.min(1, game.age / 0.24) * Math.PI) * 0.045;
        break;
      case "hit":
        this.pose = "stop";
        this.bob = -Math.sin(Math.min(1, game.age / 0.42) * Math.PI) * 6;
        break;
      case "over":
        this.pose = "panic";
        this.lean = Math.sin(game.age * 22) * 0.025 * Math.exp(-game.age * 3);
        break;
      case "paused":
        return;
      default:
        assertNever(game.phase);
    }
    if (this.replyActive && game.phase !== "charging" && game.phase !== "flight") {
      this.pose = this.mouthOpen ? "stop" : "speaking";
      this.lean = Math.sin(game.clock * 14) * 0.018;
    }
    if (this.reduced) {
      this.bob = 0;
      this.lean = 0;
    }
  }
}
