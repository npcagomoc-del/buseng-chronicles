import type { Game } from "./model";
import { WORLD } from "./physics";

export function slapPose(
  seconds: number,
  reduced: boolean,
): { readonly reach: number; readonly impact: number } {
  if (seconds <= 0) return { reach: 0, impact: 0 };
  const age = WORLD.slapSeconds - seconds;
  const contact = WORLD.slapImpactSeconds;
  const reach = age < contact ? (age / contact) ** 2 : Math.max(0, 1 - (age - contact) / 0.2);
  const impact = age < contact - 0.00001 ? 0 : Math.exp(-(age - contact) * 9);
  return { reach: reduced ? 1 : reach, impact };
}

export function slapHeadOffset(y: number, seconds: number, side: number, reduced: boolean): number {
  if (reduced || y >= 270) return 0;
  const weight = Math.max(0, Math.min(1, (270 - y) / 110));
  return -side * 26 * slapPose(seconds, false).impact * weight * weight * (3 - 2 * weight);
}

export function drawSlapHead(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  seconds: number,
  side: number,
): void {
  ctx.drawImage(image, sourceX, sourceY + 270, 430, 242, 0, 270, 430, 242);
  for (let y = 0; y < 270; y += 3) {
    const offset = slapHeadOffset(y + 1.5, seconds, side, false);
    ctx.drawImage(image, sourceX, sourceY + y, 430, 3, offset, y, 430, 3.25);
  }
}

/** Contact accents stay on Buseng; the selected server's original hand performs the swipe. */
export function drawSlapEffect(ctx: CanvasRenderingContext2D, game: Game, reduced: boolean): void {
  if (game.slapSeconds <= 0) return;
  const pose = slapPose(game.slapSeconds, reduced);
  if (pose.impact <= 0 && !reduced) return;
  const side = game.plate.x < 220 ? 1 : -1;
  const cheek = {
    x:
      game.plate.x + side * 27 + (slapHeadOffset(195, game.slapSeconds, side, reduced) * 190) / 430,
    y: game.plate.y - 67,
  };
  ctx.save();
  ctx.globalAlpha = reduced ? 0.32 : pose.impact * 0.4;
  ctx.fillStyle = "#F24A17";
  ctx.beginPath();
  ctx.ellipse(cheek.x, cheek.y, 8, 11, side * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
