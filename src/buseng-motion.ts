type WalkPose = {
  readonly phase: number;
  readonly direction: number;
  readonly amount: number;
};

// All joints are in the first atlas cell, after its 60px left inset.
// Reusing its legs keeps expression changes from moving the hip anchors.
export function drawBusengLegs(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pose: WalkPose,
): number {
  const bob = -Math.abs(Math.sin(pose.phase * 2)) * 7 * pose.amount;
  for (const side of [-1, 1]) {
    const cycle = (((pose.phase / (Math.PI * 2) + (side + 1) / 4) % 1) + 1) % 1;
    const swing = Math.max(0, (cycle - 0.6) / 0.4);
    const travel = cycle < 0.6 ? 1 - (cycle / 0.6) * 2 : -Math.cos(swing * Math.PI);
    const lift = Math.sin(swing * Math.PI) * 44 * pose.amount;
    const hipX = side < 0 ? 125 : 285;
    const kneeX = side < 0 ? 114 : 305;
    const step = travel * 43 * pose.direction * pose.amount;
    const kneeShift = step * 0.48 + lift * pose.direction * 0.35;
    const sx = side < 0 ? 40 : 230;
    const width = 170;
    // A stance foot stays at the floor while its body passes over it.
    ctx.save();
    ctx.translate(hipX, 391 + bob);
    ctx.transform(1, 0, kneeShift / 56, (56 - lift - bob) / 56, 0, 0);
    ctx.drawImage(image, 60 + sx, 382, width, 69, sx - hipX, -9, width, 69);
    ctx.restore();
    ctx.save();
    ctx.translate(kneeX + kneeShift, 447 - lift);
    ctx.rotate(-Math.sin(swing * Math.PI * 2) * 0.09 * pose.direction * pose.amount);
    // Keep the cuff, ankle and sandal continuous; the gap contains next-row hair.
    ctx.beginPath();
    ctx.rect(sx - kneeX, -3, width, 82);
    ctx.rect(150 - kneeX, 496 - 447, 130, 40);
    ctx.clip("evenodd");
    ctx.drawImage(image, 60 + sx, 444, width, 82, sx - kneeX, -3, width, 82);
    ctx.restore();
  }
  return bob;
}

type TransmissionPose = {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly visibility: number;
  readonly departing: boolean;
};

export function drawBusengTransmission(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  pose: TransmissionPose,
): void {
  const visibility = Math.max(0, Math.min(1, pose.visibility));
  if (visibility === 0) return;
  const smear = Math.sin(visibility * Math.PI);
  for (let strip = 0; strip < 40; strip++) {
    const y = strip * 13;
    const jitter = Math.sin(strip * 12.989) * 0.5 + 0.5;
    if (visibility < 0.8 && jitter > visibility * 1.3) continue;
    const width = 430 + smear * (40 + jitter * 165);
    const offset = (pose.departing ? 1 : -1) * smear * (jitter - 0.28) * 155;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, visibility * 1.9);
    ctx.drawImage(
      image,
      pose.sourceX,
      pose.sourceY + y,
      430,
      Math.min(13, 512 - y),
      offset - (width - 430) / 2,
      y,
      width,
      Math.min(13, 512 - y),
    );
    if (strip % 4 === 0 && smear > 0.15) {
      ctx.globalAlpha *= smear * 0.75;
      ctx.fillStyle = "#fff0c5";
      ctx.fillRect(offset + 65, y + 4, width - 130, 3);
    }
    ctx.restore();
  }
}

export function faceHitPose(
  seconds: number,
  reduced: boolean,
): { readonly x: number; readonly y: number; readonly angle: number } {
  const elapsed = 0.75 - seconds;
  const envelope =
    seconds > 0 && !reduced
      ? (Math.sin((Math.min(1, elapsed / 0.1) * Math.PI) / 2) * seconds) / 0.75
      : 0;
  return {
    x: (Math.sin(elapsed * 34) * 7 + 5) * envelope,
    y: -Math.sin(Math.min(1, elapsed / 0.2) * Math.PI) * 9 * envelope,
    angle: Math.sin(elapsed * 34) * 0.055 * envelope,
  };
}

export function drawFaceHit(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  seconds: number,
): void {
  // Keep the torso, hands and catch plate in their exact atlas position.
  ctx.drawImage(image, sourceX, sourceY + 270, 430, 242, 0, 270, 430, 242);
  const pose = faceHitPose(seconds, false);
  ctx.save();
  ctx.translate(215 + pose.x, 268 + pose.y);
  ctx.rotate(pose.angle);
  ctx.drawImage(image, sourceX, sourceY, 430, 282, -215, -268, 430, 282);
  ctx.restore();
}

/** A two-handed overhead windup and plate slap, confined to the defeat scene. */
export function drawPlateSlam(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  seconds: number,
): void {
  const age = Math.max(0, 0.85 - seconds);
  const lift =
    age < 0.3
      ? -Math.sin(((age / 0.3) * Math.PI) / 2) * 100
      : age < 0.43
        ? -100 + ((age - 0.3) / 0.13) ** 2 * 131
        : Math.cos((age - 0.43) * 26) * 31 * Math.exp(-(age - 0.43) * 13);
  // Monotonic whole-body deformation retains every original alpha edge and shirt seam.
  // The head and soles remain pinned while the torso drives the plate up and down.
  const offset = lift * 0.5;
  const mapped = (y: number): number => {
    const t = Math.max(0, Math.min(1, (y - 235) / 277));
    return y + Math.sin(t * Math.PI) ** 2 * offset;
  };
  ctx.drawImage(image, sourceX, sourceY, 430, 235, 0, 0, 430, 235);
  for (let y = 235; y < 512; y += 3) {
    const height = Math.min(3, 512 - y);
    const top = mapped(y);
    ctx.drawImage(
      image,
      sourceX,
      sourceY + y,
      430,
      height,
      0,
      top,
      430,
      mapped(y + height) - top + 0.35,
    );
  }
  if (age > 0.4 && age < 0.7) {
    const progress = (age - 0.4) / 0.3;
    ctx.globalAlpha *= 1 - progress;
    ctx.strokeStyle = "#FFCF1E";
    ctx.lineWidth = 5 * (1 - progress) + 1;
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * (0.05 + i * 0.128);
      const inner = 115 + progress * 58;
      ctx.beginPath();
      ctx.moveTo(215 + Math.cos(angle) * inner, 389 + Math.sin(angle) * inner * 0.24);
      ctx.lineTo(215 + Math.cos(angle) * (inner + 27), 389 + Math.sin(angle) * (inner + 27) * 0.24);
      ctx.stroke();
    }
  }
}
