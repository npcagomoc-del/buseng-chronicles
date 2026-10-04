import { WORLD } from "./physics";

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  height: number,
): void {
  const sourceWidth = (image.naturalHeight * WORLD.width) / height;
  ctx.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    0,
    sourceWidth,
    image.naturalHeight,
    0,
    0,
    WORLD.width,
    height,
  );
  const tint = ctx.createLinearGradient(0, 0, 0, height);
  tint.addColorStop(0, "#21100628");
  tint.addColorStop(0.65, "#21100600");
  tint.addColorStop(1, "#21100648");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, WORLD.width, height);
}

export function fitScene(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number {
  const height = Math.max(
    WORLD.height,
    (canvas.clientHeight / Math.max(1, canvas.clientWidth)) * WORLD.width,
  );
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(height * ratio);
  if (canvas.height !== pixels || canvas.width !== WORLD.width * ratio) {
    canvas.width = WORLD.width * ratio;
    canvas.height = pixels;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return height;
}
