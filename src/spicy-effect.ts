import type { Game } from "./model";
import { WORLD } from "./physics";
import { drawRiceFlame } from "./rice-flame";
import type { SceneEffects } from "./scene-effects";

/** The bite meets the registered open mouth, above the unchanged catch plate. */
export function feedPose(
  game: Game,
  reduced: boolean,
): { readonly reach: number; readonly bite: boolean } {
  if (game.flameCatchSeconds <= 0) {
    const progress =
      game.slapDelaySeconds > 0
        ? 1 - game.slapDelaySeconds / WORLD.slapDelaySeconds
        : game.slapSeconds > 0
          ? 1 -
            Math.max(0, (WORLD.slapSeconds - game.slapSeconds - 0.24) / (WORLD.slapSeconds - 0.24))
          : 0;
    const t = Math.max(0, Math.min(1, progress));
    return { reach: reduced ? 0 : t * t * (3 - 2 * t), bite: false };
  }
  const age = WORLD.flameCatchSeconds - game.flameCatchSeconds;
  const travel = Math.min(1, age / WORLD.spicyDelaySeconds);
  const retreat = Math.min(1, Math.max(0, (age - 0.65) / 0.5));
  return {
    reach: reduced
      ? 0
      : travel * travel * (3 - 2 * travel) * (1 - retreat * retreat * (3 - 2 * retreat)),
    bite: age >= WORLD.spicyDelaySeconds,
  };
}

export function drawSpicyEffect(
  ctx: CanvasRenderingContext2D,
  game: Game,
  effects: SceneEffects,
  reduced: boolean,
): void {
  if (game.spicySeconds <= 0) return;
  const age = WORLD.spicySeconds - game.spicySeconds;
  const face = { x: game.plate.x - 3, y: game.plate.y - 72 };
  const strength = Math.min(1, game.spicySeconds / 0.2);
  ctx.save();
  ctx.translate(face.x, face.y);
  // Translucent heat stays on the cheeks; the atlas eyes, nose and jaw remain visible.
  for (const side of [-1, 1]) {
    const blush = ctx.createRadialGradient(side * 25, -13, 2, side * 25, -13, 20);
    blush.addColorStop(0, `rgba(242,74,23,${strength * 0.68})`);
    blush.addColorStop(1, "rgba(242,74,23,0)");
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.ellipse(side * 25, -13, 20, 19, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const pant = reduced ? 0 : Math.sin(age * 24) * 2;
  ctx.fillStyle = "#ed6b70";
  ctx.strokeStyle = "#7f2527";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-9, 7);
  ctx.bezierCurveTo(-10, 21 + pant, 11, 27 + pant, 12, 11);
  ctx.quadraticCurveTo(3, 6, -9, 7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 11);
  ctx.lineTo(3, 19 + pant);
  ctx.stroke();
  if (!reduced) {
    if (age < 0.35) drawRiceFlame(ctx, { x: -9, y: 8 }, Math.PI, game.clock, 8 * (1 - age / 0.5));
    for (let i = 0; i < 8; i++) {
      const progress = (age * 1.8 + i * 0.13) % 1;
      effects.drop(
        { x: (i % 2 ? 1 : -1) * (34 + progress * 18), y: -34 + progress * progress * 70 },
        2.4,
      );
    }
    ctx.strokeStyle = "#fff0c5";
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      const fan = Math.sin(age * 27 + side) * 4;
      ctx.beginPath();
      ctx.moveTo(side * 48, 7);
      ctx.quadraticCurveTo(side * (60 + fan), -8, side * 47, -24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(side * 55, 10);
      ctx.quadraticCurveTo(side * (68 + fan), -8, side * 53, -28);
      ctx.stroke();
    }
  }
  ctx.restore();
}
