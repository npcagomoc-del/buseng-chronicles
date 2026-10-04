import type { Point } from "./physics";

type Eye = readonly [number, number, number, number, number];
const EYES: readonly (readonly Eye[])[] = [
  [
    [159, 141, 17, 11, 0.18],
    [226, 146, 19, 12, 0.04],
  ],
  [],
  [
    [149, 140, 17, 11, 0.18],
    [217, 144, 19, 12, 0.04],
  ],
  [
    [160, 140, 17, 9, 0.16],
    [227, 142, 19, 9, -0.08],
  ],
  [
    [150, 137, 18, 11, 0.2],
    [220, 137, 19, 11, -0.18],
  ],
  [
    [161, 139, 18, 12, 0.13],
    [230, 142, 19, 12, 0.12],
  ],
];

/** Eye interiors are registered to each atlas expression; lids and brows remain original. */
export function drawBusengGaze(
  ctx: CanvasRenderingContext2D,
  expression: number,
  gaze: Point,
): void {
  const eyes = EYES[expression] ?? [];
  for (const [x, y, rx, ry, angle] of eyes) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    const white = ctx.createLinearGradient(0, -ry, 0, ry);
    white.addColorStop(0, "#fffdf7");
    white.addColorStop(1, "#e3e4e6");
    ctx.fillStyle = white;
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    const dx = Math.max(-1, Math.min(1, gaze.x)) * (rx - 6);
    const dy = Math.max(-1, Math.min(1, gaze.y)) * 4;
    ctx.fillStyle = "#171312";
    ctx.beginPath();
    ctx.ellipse(dx, dy, 6.8, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffced";
    ctx.beginPath();
    ctx.ellipse(dx + 2, dy - 3, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
