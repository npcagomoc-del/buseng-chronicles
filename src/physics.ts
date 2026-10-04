import { difficulty, routePhase } from "./buseng-behavior";

export { difficulty } from "./buseng-behavior";
export const WORLD = {
  width: 480,
  height: 800,
  gravity: 820,
  chargeSeconds: 0.95,
  settleSeconds: 0.22,
  recordGagSeconds: 1.1,
  perfectSeconds: 0.46,
  teleportSeconds: 0.64,
  flameCatchSeconds: 1.25,
  spicyDelaySeconds: 0.3,
  spicySeconds: 0.95,
  plateSlamSeconds: 0.85,
  slapSeconds: 0.65,
  slapImpactSeconds: 0.12,
  slapDelaySeconds: 0.3,
} as const;
export type Point = { readonly x: number; readonly y: number };
export type Flight = { readonly origin: Point; readonly vx: number; readonly vy: number };
export type Plate = Point & { readonly width: number };
export function hand(arenaHeight = 800): Point {
  return { x: 160, y: arenaHeight * 0.73 };
}
export const HAND: Point = hand();
export function chargePower(seconds: number): number {
  const phase = (((Math.max(0, seconds) / WORLD.chargeSeconds) % 2) + 2) % 2;
  return phase <= 1 ? phase : 2 - phase;
}
function highestPlate(arenaHeight: number): number {
  return Math.max(arenaHeight * 0.17 + 262, arenaHeight * 0.39 + 32);
}
export function launch(power: number, arenaHeight = 800): Flight {
  const origin = hand(arenaHeight);
  const top = highestPlate(arenaHeight);
  const vy = -Math.sqrt(2 * WORLD.gravity * (origin.y - top + 70));
  const referenceTime = contactSeconds({ origin, vx: 0, vy }, top);
  return { origin, vx: (-94 + Math.max(0, Math.min(1, power)) * 380) / referenceTime, vy };
}
export function position(flight: Flight, seconds: number): Point {
  return {
    x: flight.origin.x + flight.vx * seconds,
    y: flight.origin.y + flight.vy * seconds + (WORLD.gravity * seconds * seconds) / 2,
  };
}
export function contact(flight: Flight, plate: Plate): Point {
  return position(flight, contactSeconds(flight, plate.y));
}
export function contactSeconds(flight: Flight, y: number): number {
  const discriminant = flight.vy * flight.vy + 2 * WORLD.gravity * (y - flight.origin.y);
  return (-flight.vy + Math.sqrt(Math.max(0, discriminant))) / WORLD.gravity;
}
export function target(score: number, seconds = 0, lane = 0, arenaHeight = 800, seed = 0): Plate {
  const tuning = difficulty(score);
  const top = highestPlate(arenaHeight);
  if (score < 1) return { x: 380, y: Math.max(top, arenaHeight * 0.45), width: tuning.width };
  const phase = routePhase(seed, lane) + score * 1.7;
  const time = seconds * tuning.speed;
  const wave = Math.sin(time + phase) * 0.72 + Math.sin(time * 1.73 + phase * 0.61) * 0.28;
  const center = score < 3 ? 300 : score < 10 ? 246.5 : lane % 2 === 0 ? 166.5 : 326.5;
  const amplitude = score < 3 ? 30 : score < 10 ? 100 : 56.5;
  const x = center + wave * amplitude;
  const rightSide = Math.max(0, Math.min(1, (x - 223) / 47));
  const clearance = 155 - 75 * rightSide * rightSide * (3 - 2 * rightSide);
  const bottom = arenaHeight * 0.73 - clearance;
  const vertical = (Math.sin(time * 0.63 + phase * 1.37) + 1) / 2;
  return { x, y: top + (bottom - top) * vertical, width: tuning.width };
}
export function releaseWindow(
  plate: Plate,
  arenaHeight = 800,
): {
  readonly min: number;
  readonly max: number;
  readonly perfectMin: number;
  readonly perfectMax: number;
} {
  const first = contact(launch(0, arenaHeight), plate).x;
  const span = contact(launch(1, arenaHeight), plate).x - first;
  const powerAt = (x: number): number => Math.max(0, Math.min(1, (x - first) / span));
  return {
    min: powerAt(plate.x - plate.width / 2 - 4),
    max: powerAt(plate.x + plate.width / 2 + 4),
    perfectMin: powerAt(plate.x - plate.width * 0.15),
    perfectMax: powerAt(plate.x + plate.width * 0.15),
  };
}
export function catchResult(landing: Point, plate: Plate): "perfect" | "hit" | "miss" {
  const distance = Math.abs(landing.x - plate.x);
  if (distance <= plate.width * 0.15) return "perfect";
  if (distance <= plate.width / 2 + 4) return "hit";
  return "miss";
}
