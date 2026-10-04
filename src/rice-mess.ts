import { faceHitPose } from "./buseng-motion";
import type { Game } from "./model";
import type { Point } from "./physics";

type RiceMess = {
  readonly face: Point;
  readonly scale: number;
  readonly faceCovered: boolean;
  readonly headCovered: boolean;
  readonly shed?: number;
  readonly age?: number;
  readonly reaction?: number;
  readonly reduced?: boolean;
};

export function drawRiceMess(ctx: CanvasRenderingContext2D, mess: RiceMess): void {
  ctx.save();
  ctx.translate(mess.face.x, mess.face.y);
  ctx.scale(mess.scale, mess.scale);
  const pose = faceHitPose(mess.reaction ?? 0, mess.reduced ?? false);
  ctx.translate((pose.x * 190) / 430, 70 + (pose.y * 190) / 430);
  ctx.rotate(pose.angle);
  ctx.translate(0, -70);
  ctx.strokeStyle = "#dbcba1";
  ctx.lineWidth = 0.45;
  if (mess.headCovered) {
    // Sparse, asymmetric islands follow the wet hair sweep, leaving dark strands exposed.
    for (let i = 0; i < 43; i++) {
      const angle = i * 2.4;
      const band = i % 4;
      const centerX = [-18, 21, -35, 38][band] ?? 0;
      const centerY = [-41, -32, -19, -10][band] ?? 0;
      const spread = 3 + (i % 7) * 1.35;
      const settle = mess.reduced ? 1 : Math.min(1, (mess.age ?? 1) * 1.8);
      const x = centerX + Math.cos(angle) * spread;
      const y = centerY + Math.sin(angle) * spread * 0.7 + settle * (i % 3);
      ctx.fillStyle = i % 4 === 0 ? "#fff0c5" : "#fffced";
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2 + (i % 4) * 0.35, 1.1 + (i % 2) * 0.2, angle * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (mess.faceCovered) {
    for (let i = 0; i < 54; i++) {
      const cohort = i % 3;
      const progress = Math.max(
        0,
        Math.min(1, ((mess.shed ?? 0) - cohort - (i % 6) * 0.025) / 0.875),
      );
      if (progress >= 1) continue;
      const side = i % 2 === 0 ? -1 : 1;
      const angle = i * 2.4;
      const patch = i % 4;
      const x = patch === 0 ? Math.sin(angle) * 29 : side * (24 + Math.sin(angle) * 10);
      const y =
        patch === 0 ? -23 + Math.cos(angle) * 8 : patch === 3 ? 54 + (i % 7) * 4 : 3 + (i % 9) * 4;
      ctx.save();
      ctx.globalAlpha *= 1 - Math.max(0, (progress - 0.7) / 0.3);
      ctx.fillStyle = i % 4 === 0 ? "#fff0c5" : "#fffced";
      ctx.beginPath();
      ctx.ellipse(
        x + (mess.reduced ? 0 : side * progress * (5 + (i % 7))),
        y + (mess.reduced ? 0 : progress * progress * 88),
        3 + (i % 3) * 0.4,
        1.4,
        angle + (mess.reduced ? 0 : progress * side * 2),
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawDefeatRice(ctx: CanvasRenderingContext2D, game: Game, reduced: boolean): void {
  drawRiceMess(ctx, {
    face: { x: -5, y: -115 },
    scale: 1.65,
    faceCovered: game.faceRice,
    headCovered: true,
    age: game.age,
    shed: game.riceThrows - game.riceShedSeconds / 0.6,
    reduced,
  });
}
