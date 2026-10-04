import type { Game } from "./model";
import { type Point, position } from "./physics";
import type { SceneEffects } from "./scene-effects";

export function drawRiceFlame(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  clock: number,
  size: number,
): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  const colors = ["#F24A17", "#F48B08", "#FFCF1E", "#fff0c5"] as const;
  // Open, tapered ribbons reveal individual grains instead of enclosing an opaque orb.
  for (let layer = 0; layer < colors.length; layer++) {
    const width = size * (0.8 - layer * 0.16);
    const length = size * (5.3 - layer * 0.95);
    ctx.fillStyle = colors[layer] ?? colors[0];
    ctx.globalAlpha = 0.63 + layer * 0.09;
    for (const side of [-1, 1]) {
      const curl = Math.sin(clock * 23 + layer * 1.7 + side) * size * 0.42;
      ctx.beginPath();
      ctx.moveTo(size * 0.5, side * width * 0.4);
      ctx.bezierCurveTo(
        -size,
        side * width * 1.4,
        -length * 0.52,
        side * width + curl,
        -length,
        curl,
      );
      ctx.bezierCurveTo(
        -length * 0.55,
        side * width * 0.1 - curl * 0.4,
        -size,
        side * width * 0.12,
        size * 0.5,
        side * width * 0.4,
      );
      ctx.fill();
    }
  }
  ctx.lineCap = "round";
  for (let i = 0; i < 11; i++) {
    const progress = (clock * 2.1 + i / 11) % 1;
    const x = -size * (1 + progress * 7);
    const y = Math.sin(i * 7.4) * size * (0.4 + progress * 1.2);
    ctx.globalAlpha = (1 - progress) * 0.85;
    ctx.strokeStyle = i % 2 ? "#F48B08" : "#FFCF1E";
    ctx.lineWidth = 1.5 * (1 - progress) + 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * (0.25 + progress * 0.4), y - 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFlyingRice(
  ctx: CanvasRenderingContext2D,
  game: Game,
  effects: SceneEffects,
  reduced: boolean,
): void {
  if (!game.rice) return;
  if (!reduced) {
    if (game.flamingShot) {
      const prior = position(game.flight, Math.max(0, game.flightAge - 0.015));
      const angle = Math.atan2(game.rice.y - prior.y, game.rice.x - prior.x);
      drawRiceFlame(ctx, game.rice, angle, game.clock, 12);
    } else {
      ctx.save();
      for (let i = 3; i > 0; i--) {
        ctx.globalAlpha = 0.18 / i;
        effects.rice(position(game.flight, Math.max(0, game.flightAge - i * 0.025)), 9);
      }
      ctx.restore();
    }
  }
  effects.rice(game.rice, 13, game.flamingShot);
}
