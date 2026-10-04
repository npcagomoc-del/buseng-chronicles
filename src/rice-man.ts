import { assertNever, type Game } from "./model";
import { drawRiceFlame } from "./rice-flame";
import { SceneEffects } from "./scene-effects";
import { serveOrigin } from "./serve-motion";
import { feedPose } from "./spicy-effect";
import { arcadeThrowHop } from "./throw-motion";

type Scene = "menu" | "play" | "over";
type Pose = "idle" | "tongue" | "windup" | "throw" | "panic";
const CELLS = {
  idle: { x: 0, y: 0, width: 512, height: 512 },
  tongue: { x: 512, y: 0, width: 512, height: 512 },
  windup: { x: 1024, y: 0, width: 512, height: 512 },
  throw: { x: 540, y: 512, width: 572, height: 512 },
  panic: { x: 1120, y: 512, width: 416, height: 512 },
} as const;
const ease = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export class RiceMan {
  private pose: Pose = "idle";
  private bob = 0;
  private lean = 0;
  private squash = 1;
  private arm = 0;
  private clock = 0;
  private scene: Scene = "menu";
  private readonly effects: SceneEffects;
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly sheet: HTMLImageElement,
    private readonly reduced: boolean,
  ) {
    this.effects = new SceneEffects(ctx);
  }

  draw(game: Game, scene: Scene): void {
    if (game.phase !== "paused") this.animate(game, scene);
    const crop = CELLS[this.pose];
    const ctx = this.ctx;
    const size = scene === "menu" ? 280 : scene === "over" ? 186 : 196;
    const scale = size / 512;
    const feed = feedPose(game, this.reduced);
    const origin = serveOrigin(game, this.reduced);
    const feet =
      scene === "menu"
        ? { x: 115, y: 646 }
        : scene === "over"
          ? { x: 71, y: 645 }
          : { x: origin.x - 169 * scale, y: origin.y + 357 * scale };
    const left = -crop.width / 2;
    const top = -512;
    ctx.save();
    const released = this.pose === "throw" && scene === "play";
    if (game.phase === "flight" && scene === "play")
      ctx.translate(0, arcadeThrowHop(game.age, game.flamingShot, this.reduced));
    ctx.translate(released ? origin.x : feet.x, released ? origin.y : feet.y + this.bob);
    ctx.rotate(this.lean);
    const feedDirection =
      (game.flameCatchSeconds > 0 || game.slapSeconds > 0 || game.slapDelaySeconds > 0) &&
      scene === "play" &&
      game.plate.x < 220
        ? -1
        : 1;
    ctx.scale((scale * feedDirection) / this.squash, scale * this.squash);
    ctx.translate(released ? -425 : left, released ? -155 : top);
    if (this.pose === "throw" && this.arm !== 0) {
      // The open throwing arm is isolated at the sleeve, leaving one opaque face/body.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, crop.width, crop.height);
      ctx.rect(350, 90, 222, 140);
      ctx.clip("evenodd");
      ctx.drawImage(this.sheet, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, 512);
      ctx.restore();
      ctx.save();
      ctx.translate(350, 205);
      ctx.rotate(this.arm);
      ctx.translate(-350, -205);
      ctx.beginPath();
      ctx.rect(350, 90, 222, 140);
      ctx.clip();
      ctx.drawImage(this.sheet, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, 512);
      ctx.restore();
    } else {
      ctx.drawImage(this.sheet, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, 512);
    }
    if (scene === "play" && game.combo >= 3 && this.pose !== "throw" && this.pose !== "panic") {
      const held =
        this.pose === "windup"
          ? { x: 76, y: 145 }
          : this.pose === "tongue"
            ? { x: 107, y: 270 }
            : { x: 76, y: 244 };
      if (!this.reduced) drawRiceFlame(ctx, held, Math.PI / 2, game.clock, 21);
      this.effects.rice(held, 30, true);
    }
    ctx.restore();
    if (scene === "play" && game.flameCatchSeconds > 0 && !feed.bite) {
      if (!this.reduced) drawRiceFlame(ctx, origin, Math.PI / 2, game.clock, 10);
      this.effects.rice(origin, 13, true);
    }
  }

  private animate(game: Game, scene: Scene): void {
    const dt = Math.max(0, Math.min(0.05, game.clock - this.clock));
    const reset = scene !== this.scene || game.clock < this.clock;
    this.clock = game.clock;
    this.scene = scene;
    let bob = 0;
    let lean = 0;
    let squash = 1;
    let arm = 0;
    switch (game.phase) {
      case "menu":
      case "ready": {
        const playful = game.clock % 3.6 >= 2.2;
        this.pose = playful ? "tongue" : "idle";
        const breath = Math.sin((game.clock * Math.PI * 2) / 2.2);
        const wiggle = Math.sin(((game.clock % 3.6) - 2.2) * Math.PI * 4);
        bob = playful ? -Math.abs(wiggle) * 5 : breath * 1.8;
        lean = playful ? wiggle * 0.035 : breath * 0.012;
        squash = 1 + (playful ? wiggle * 0.016 : breath * 0.008);
        break;
      }
      case "charging": {
        // A single silhouette avoids a face/bucket swap whenever the meter cycles.
        this.pose = "windup";
        const anticipation = ease(game.age / 0.12);
        const tension = ease(game.power);
        lean = -anticipation * (0.025 + tension * 0.075);
        bob = anticipation * (2 + tension * 5);
        squash = 1 - anticipation * (0.015 + tension * 0.035);
        break;
      }
      case "flight": {
        this.pose = "throw";
        const follow = Math.sin(Math.min(1, game.age / 0.22) * Math.PI);
        lean = follow * (game.flamingShot ? 0.11 : 0.045);
        bob = -follow * 4;
        squash = 1 + follow * (game.flamingShot ? 0.07 : 0.025);
        arm = ease((game.age - 0.08) / 0.22) * 0.38;
        break;
      }
      case "hit": {
        const feeding = game.flameCatchSeconds > 0;
        const gag =
          game.slapDelaySeconds > 0 ||
          game.slapSeconds > 0 ||
          feeding ||
          (game.recordGagSeconds > 0 && game.age < 0.38);
        this.pose = gag ? "throw" : "tongue";
        const celebrate = Math.sin(Math.min(1, game.age / 0.42) * Math.PI);
        bob = -celebrate * (game.combo > 0 ? 8 : 4);
        lean = feeding ? 0 : celebrate * 0.025;
        squash = feeding ? 1 : 1 + celebrate * 0.018;
        arm = gag && !feeding ? -Math.sin(Math.min(1, game.age / 0.22) * Math.PI) * 0.12 : 0;
        break;
      }
      case "over":
        this.pose = "panic";
        bob = ease(game.age / 0.22) * 5;
        lean = Math.sin(game.age * 22) * 0.035 * Math.exp(-game.age * 5);
        break;
      case "paused":
        return;
      default:
        assertNever(game.phase);
    }
    const blend = reset || this.reduced ? 1 : 1 - Math.exp(-dt * 24);
    this.bob += ((this.reduced ? 0 : bob) - this.bob) * blend;
    this.lean += ((this.reduced ? 0 : lean) - this.lean) * blend;
    this.squash += ((this.reduced ? 1 : squash) - this.squash) * blend;
    this.arm += ((this.reduced ? 0 : arm) - this.arm) * blend;
    if (game.flameCatchSeconds > 0 || game.slapSeconds > 0 || game.slapDelaySeconds > 0) {
      this.lean = 0;
      this.squash = 1;
      this.arm = 0;
    }
  }
}
