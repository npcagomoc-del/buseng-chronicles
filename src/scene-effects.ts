import { drawBusengGaze } from "./buseng-gaze";
import {
  drawBusengLegs,
  drawBusengTransmission,
  drawFaceHit,
  drawPlateSlam,
} from "./buseng-motion";
import type { Point } from "./physics";
import { drawSlapHead, slapHeadOffset } from "./slap-effect";

const COLORS = {
  cream: "#fff0c5",
  rice: "#fffced",
  wood: "#e5a04c",
  sweat: "#87dafa",
  ink: "#211006",
} as const;
type ActorPose = {
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly expression: number;
  readonly stride: number;
  readonly arrival: number;
  readonly walkPhase?: number;
  readonly direction?: number;
  readonly departure?: number;
  readonly faceHitSeconds?: number;
  readonly plateSlamSeconds?: number;
  readonly gaze?: Point;
  readonly slapSeconds?: number;
  readonly slapSide?: number;
};
export class SceneEffects {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}
  rice(at: Point, radius: number, flaming = false): void {
    const ctx = this.ctx;
    for (let i = 0; i < 36; i++) {
      const angle = i * 2.4;
      const distance = Math.sqrt(i / 36) * radius * (0.68 + (i % 4) * 0.12);
      ctx.fillStyle = flaming
        ? i % 5 === 0
          ? "#F48B08"
          : i % 3 === 0
            ? "#FFCF1E"
            : COLORS.rice
        : i % 3 === 0
          ? COLORS.cream
          : COLORS.rice;
      ctx.strokeStyle = flaming ? "#F48B08" : "#dfcc9b";
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(
        at.x + Math.cos(angle) * distance,
        at.y + Math.sin(angle) * distance,
        radius * (0.22 + (i % 3) * 0.025),
        radius * 0.095,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }
  }
  drop(at: Point, radius: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.sweat;
    ctx.strokeStyle = COLORS.rice;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y - radius * 2);
    ctx.quadraticCurveTo(at.x + radius * 1.7, at.y + radius, at.x, at.y + radius);
    ctx.quadraticCurveTo(at.x - radius * 1.7, at.y + radius, at.x, at.y - radius * 2);
    ctx.fill();
    ctx.stroke();
  }
  actor(image: HTMLImageElement, pose: ActorPose): void {
    const ctx = this.ctx;
    const { box, expression, stride, arrival } = pose;
    const col = expression % 3;
    const row = Math.floor(expression / 3);
    const sourceX = col * 512 + ([60, 35, 18][col] ?? 60);
    const departure = pose.departure ?? 0;
    const visibility = departure > 0 ? departure : Math.min(1, (0.75 - arrival) / 0.5);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.width / 430, box.height / 512);
    ctx.save();
    ctx.globalAlpha *= 0.19 * Math.max(0, visibility);
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.ellipse(215, 519, 157, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (row === 1) {
      ctx.beginPath();
      ctx.rect(-200, 0, 830, 550);
      ctx.rect(0, 0, 150, 16);
      ctx.rect(275, 0, 155, 16);
      ctx.clip("evenodd");
    }
    if (arrival > 0.25 || departure > 0) {
      ctx.save();
      if (row === 0) {
        ctx.beginPath();
        ctx.rect(-200, 0, 830, 512);
        ctx.rect(150, 496, 130, 16);
        ctx.clip("evenodd");
      }
      drawBusengTransmission(ctx, image, {
        sourceX,
        sourceY: row * 512,
        visibility,
        departing: departure > 0,
      });
      ctx.restore();
    } else if ((pose.plateSlamSeconds ?? 0) > 0) {
      drawPlateSlam(ctx, image, sourceX, row * 512, pose.plateSlamSeconds ?? 0);
    } else if ((pose.slapSeconds ?? 0) > 0) {
      drawSlapHead(ctx, image, sourceX, row * 512, pose.slapSeconds ?? 0, pose.slapSide ?? -1);
    } else if ((pose.faceHitSeconds ?? 0) > 0) {
      drawFaceHit(ctx, image, sourceX, row * 512, pose.faceHitSeconds ?? 0);
    } else if (pose.walkPhase !== undefined || Math.abs(stride) > 0.01) {
      drawBusengLegs(ctx, image, {
        phase: pose.walkPhase ?? Math.asin(stride),
        direction: pose.direction ?? 1,
        amount: pose.walkPhase === undefined ? Math.abs(stride) : 1,
      });
      // Keep the illustrated plate aligned to the moving collision target.
      // Follow the curved shirt hem: a rectangular crop would paint over the thighs.
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(430, 0);
      ctx.lineTo(430, 373);
      ctx.lineTo(337, 380);
      ctx.quadraticCurveTo(215, 453, 91, 380);
      ctx.lineTo(0, 373);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(image, sourceX, row * 512, 430, 424, 0, 0, 430, 424);
    } else {
      if (row === 0) {
        ctx.beginPath();
        ctx.rect(0, 0, 430, 512);
        ctx.rect(160, 496, 110, 16);
        ctx.clip("evenodd");
      }
      ctx.drawImage(image, sourceX, row * 512, 430, 512, 0, 0, 430, 512);
    }
    if (pose.gaze && arrival <= 0.25 && departure <= 0 && (pose.faceHitSeconds ?? 0) <= 0) {
      ctx.save();
      ctx.translate(slapHeadOffset(140, pose.slapSeconds ?? 0, pose.slapSide ?? -1, false), 0);
      drawBusengGaze(ctx, expression, pose.gaze);
      ctx.restore();
    }
    ctx.restore();
  }
  teleport(at: Point, intensity: number): void {
    const ctx = this.ctx;
    const strength = Math.max(0, Math.min(1, intensity));
    const progress = 1 - strength;
    ctx.save();
    ctx.globalAlpha *= Math.sin(Math.PI * Math.min(0.98, progress + 0.12));
    ctx.lineCap = "round";
    for (let i = 0; i < 19; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const y = at.y - 165 + i * 14;
      const spread = 12 + progress * 60 + (i % 4) * 7;
      ctx.strokeStyle = i % 3 === 0 ? COLORS.wood : COLORS.rice;
      ctx.lineWidth = i % 3 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(at.x + side * spread, y);
      ctx.lineTo(at.x + side * (spread + 28 + strength * 48), y);
      ctx.stroke();
    }
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 3 * strength + 1;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y + 102, 18 + progress * 79, 4 + progress * 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  bubble(text: string, at: Point): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(-0.06);
    ctx.font = "28px Bangers, Impact, sans-serif";
    const lines = text.split("|");
    const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 64;
    ctx.fillStyle = COLORS.cream;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 2, lines.length > 1 ? 48 : 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * 32);
    });
    ctx.restore();
  }
}
