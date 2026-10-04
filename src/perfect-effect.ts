import type { Game } from "./model";

const LIFE = 0.42;
const COLORS = ["#FFFCED", "#FFCF1E", "#A3E630", "#FFF16C"] as const;

export function drawPerfectEffect(
  ctx: CanvasRenderingContext2D,
  game: Game,
  reduced: boolean,
): void {
  if (game.phase !== "hit" || game.combo === 0 || !game.landing || game.age >= LIFE) return;
  const progress = game.age / LIFE;
  const x = game.landing.x;
  const y = game.plate.y - 8;
  ctx.save();
  ctx.globalAlpha = reduced ? 0.8 : Math.min(1, (1 - progress) * 2.5);
  ctx.lineCap = "round";
  // Small outward accents leave the real plate and landing point unobscured.
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI + ((i + 0.5) / 7) * Math.PI;
    const travel = reduced ? 0 : 32 * (1 - (1 - progress) ** 3);
    const inner = 18 + travel;
    const length = reduced ? 5 : 9 * (1 - progress) + 3;
    ctx.strokeStyle = i % 2 === 0 ? "#FFCF1E" : "#A3E630";
    ctx.lineWidth = reduced ? 2 : 3 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * (inner + length), y + Math.sin(angle) * (inner + length));
    ctx.stroke();
  }
  if (!reduced) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI + ((i + 0.35) / 14) * Math.PI;
      const speed = 68 + (i % 4) * 21;
      const elapsed = game.age;
      const px = x + Math.cos(angle) * speed * elapsed;
      const py = y + Math.sin(angle) * speed * elapsed + 140 * elapsed ** 2;
      ctx.fillStyle = COLORS[i % COLORS.length] ?? COLORS[0];
      ctx.beginPath();
      ctx.ellipse(px, py, 3.5, 1.5, angle + elapsed * (i % 2 ? 7 : -7), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
