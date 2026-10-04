import type { Game } from "./model";
import { catchResult, contact, contactSeconds, launch, position } from "./physics";

export function drawAimArc(ctx: CanvasRenderingContext2D, game: Game): void {
  const shot = launch(game.power, game.arenaHeight);
  const landing = contact(shot, game.plate);
  const flightTime = contactSeconds(shot, game.plate.y);
  const result = catchResult(landing, game.plate);
  const color = result === "perfect" ? "#68ff78" : result === "hit" ? "#ffe554" : "#fffbed";
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 1; i <= 32; i++) {
    const dot = position(shot, (flightTime * i) / 32);
    if (dot.x > 476 || dot.y < 8 || dot.y > game.arenaHeight - 20) break;
    ctx.globalAlpha = 0.2 + (i / 32) * 0.65;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 1.6 + (i / 32) * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (landing.x > 0 && landing.x < 476) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(landing.x, landing.y, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
