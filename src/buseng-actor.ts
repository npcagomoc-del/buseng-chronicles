import { rageExpression } from "./buseng-reaction";
import type { Game } from "./model";
import { target } from "./physics";
import type { SceneEffects } from "./scene-effects";
import { serveOrigin } from "./serve-motion";
import { slapPose } from "./slap-effect";

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export class BusengActor {
  expression = 0;
  private stride = 0;
  private walking = false;
  private walkPhase = 0;
  private direction = 1;
  private walkClock = 0;
  constructor(
    private readonly effects: SceneEffects,
    private readonly image: HTMLImageElement,
    private readonly reduced: boolean,
  ) {}
  draw(game: Game, kind: "boss" | "rage", box: Box): void {
    if (game.phase !== "paused") {
      if (kind === "rage") this.expression = rageExpression(game);
      else if (game.slapSeconds > 0 && slapPose(game.slapSeconds, this.reduced).impact > 0.35)
        this.expression = 1;
      else if (game.slapSeconds > 0 && slapPose(game.slapSeconds, this.reduced).impact > 0)
        this.expression = 2;
      else if (game.flameCatchSeconds > 0) this.expression = 2;
      else if (game.faceHitSeconds > 0) this.expression = game.faceHitSeconds > 0.22 ? 1 : 3;
      else if (game.phase === "hit") this.expression = 4;
      else if (game.talkSeconds > 0) this.expression = game.mouthOpen ? 2 : 0;
      else if (game.clock % 3.4 < 0.16) this.expression = 1;
      else this.expression = game.clock % 5.2 > Math.max(0.6, 3.2 - game.level * 0.6) ? 3 : 0;
    }
    if (game.phase !== "paused") {
      const moving =
        !this.reduced &&
        kind === "boss" &&
        game.score >= 1 &&
        (game.phase === "ready" || game.phase === "charging");
      const now = target(game.score, game.clock, game.teleportLane, game.arenaHeight, game.seed);
      const next = target(
        game.score,
        game.clock + 0.02,
        game.teleportLane,
        game.arenaHeight,
        game.seed,
      );
      const velocity = moving ? Math.hypot(next.x - now.x, next.y - now.y) / 0.02 : 0;
      const speed = Math.min(1, velocity / 70);
      const dt = Math.max(0, Math.min(0.05, game.clock - this.walkClock));
      this.walkClock = game.clock;
      this.walkPhase += (velocity / 25) * dt;
      this.stride = Math.sin(this.walkPhase) * speed;
      this.walking = moving && speed > 0.06;
      this.direction = next.x >= now.x ? 1 : -1;
    }
    const origin = serveOrigin(game, this.reduced);
    const beside = game.flameCatchSeconds > 0 || game.slapDelaySeconds > 0 || game.slapSeconds > 0;
    const actorX =
      game.phase === "menu"
        ? 115
        : kind === "rage"
          ? 71
          : origin.x + (beside && game.plate.x < 220 ? 85 : -85);
    const actorY = game.phase === "menu" || kind === "rage" ? 500 : origin.y - 25;
    const faceX = kind === "rage" ? 300 : box.x + box.width * 0.46;
    const faceY = kind === "rage" ? 330 : box.y + box.height * 0.28;
    this.effects.actor(this.image, {
      box,
      gaze: { x: (actorX - faceX) / 115, y: (actorY - faceY) / 150 },
      expression: this.expression,
      stride: this.stride,
      slapSeconds: this.reduced || kind !== "boss" ? 0 : game.slapSeconds,
      slapSide: game.plate.x < 220 ? 1 : -1,
      plateSlamSeconds: this.reduced || kind !== "rage" ? 0 : game.plateSlamSeconds,
      faceHitSeconds: this.reduced || kind === "rage" ? 0 : game.faceHitSeconds,
      arrival:
        this.reduced || kind === "rage" || game.phase === "menu"
          ? 0
          : game.teleportFlash / game.teleportDuration,
      ...(this.walking ? { walkPhase: this.walkPhase, direction: this.direction } : {}),
    });
  }
}
