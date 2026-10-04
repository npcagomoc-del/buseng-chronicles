export function drawCreditRiceMan(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  elapsed: number,
  reducedMotion: boolean,
): void {
  const beat = reducedMotion ? 0 : (elapsed / 1400) * Math.PI * 2;
  const bounce = reducedMotion ? 0 : (1 - Math.cos(beat * 2)) * 4;
  const squash = reducedMotion ? 1 : 1 + Math.cos(beat * 2) * 0.018;
  ctx.save();
  ctx.translate(110, 244 - bounce);
  ctx.rotate(Math.sin(beat) * 0.045);
  ctx.scale(1 / squash, squash);
  ctx.drawImage(sheet, 512, 0, 512, 512, -108, -216, 216, 216);
  ctx.restore();
}
