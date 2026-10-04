import type { Game } from "./model";
import { hand, WORLD } from "./physics";
import type { SceneEffects } from "./scene-effects";

const IMPACT_SECONDS = 0.38;

export function drawRecordGag(
  ctx: CanvasRenderingContext2D,
  game: Game,
  effects: SceneEffects,
  reduced: boolean,
): void {
  if (game.phase !== "hit" || game.recordGagSeconds === 0) return;
  const elapsed = WORLD.recordGagSeconds - game.recordGagSeconds;
  const origin = hand(game.arenaHeight);
  const face = { x: game.plate.x - 3, y: game.plate.y - 105 };
  if (elapsed < IMPACT_SECONDS && !reduced) {
    const progress = elapsed / IMPACT_SECONDS;
    const x = origin.x + (face.x - origin.x) * progress;
    const y = origin.y + (face.y - origin.y) * progress - Math.sin(progress * Math.PI) * 88;
    ctx.save();
    ctx.fillStyle = "#fffced";
    for (let grain = 1; grain <= 3; grain++) {
      const trail = Math.max(0, progress - grain * 0.055);
      ctx.globalAlpha = 0.45 / grain;
      ctx.beginPath();
      ctx.ellipse(
        origin.x + (face.x - origin.x) * trail,
        origin.y + (face.y - origin.y) * trail - Math.sin(trail * Math.PI) * 88,
        3,
        1.5,
        -0.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
    effects.rice({ x, y }, 11);
    return;
  }

  const fade = reduced ? 1 : Math.min(1, Math.max(0, (WORLD.recordGagSeconds - elapsed) / 0.34));
  ctx.save();
  ctx.translate(face.x, face.y);
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "#211006";
  ctx.fillStyle = "#fffced";
  ctx.lineWidth = 1.5;
  for (let grain = 0; grain < 13; grain++) {
    const angle = grain * 2.4;
    const distance = 6 + (grain % 4) * 6 + (reduced ? 0 : (elapsed - IMPACT_SECONDS) * 27);
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance * 0.8,
      4 + (grain % 3),
      2.3,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.font = "31px Bangers, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeText("SAPUL!", 0, -58);
  ctx.fillStyle = "#ffcf1e";
  ctx.fillText("SAPUL!", 0, -58);
  ctx.restore();
}
