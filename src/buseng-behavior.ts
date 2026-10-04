import type { Event } from "./game-events";
import type { Game } from "./model";
import { WORLD } from "./physics";

export function difficulty(score: number): {
  readonly level: number;
  readonly width: number;
  readonly speed: number;
  readonly teleportInterval: number;
  readonly teleportDuration: number;
  readonly warningDuration: number;
} {
  const level = Math.floor(Math.max(0, score) / 20);
  return {
    level,
    width: Math.max(92, 96 - score * 0.9),
    speed: score < 10 ? 0.7 + score * 0.1 : 3.6 + level * 0.6,
    teleportInterval: 2.1 / (1 + level * 0.18),
    teleportDuration: 0.64 / (1 + level * 0.14),
    warningDuration: 0.42 / (1 + level * 0.12),
  };
}

export function routePhase(seed: number, lane: number): number {
  const value = Math.sin(seed * 12.9898 + lane * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * Math.PI * 2;
}

export function updateReactions(game: Game, dt: number, emit: (event: Event) => void): void {
  updateSlap(game, dt, emit);
  const beforeFeed = game.flameCatchSeconds;
  game.flameCatchSeconds = Math.max(0, beforeFeed - dt);
  game.spicySeconds = Math.max(0, game.spicySeconds - dt);
  if (
    game.phase === "hit" &&
    beforeFeed > WORLD.spicySeconds &&
    game.flameCatchSeconds <= WORLD.spicySeconds
  ) {
    game.spicySeconds = game.flameCatchSeconds;
    emit({ cue: "spicy", score: game.score });
  }
  game.plateSlamSeconds = Math.max(0, game.plateSlamSeconds - dt);
  game.talkSeconds = Math.max(0, game.talkSeconds - dt);
  if (game.talkSeconds === 0) game.talkLine = "";
  game.faceHitSeconds = Math.max(0, game.faceHitSeconds - dt);
  game.riceShedSeconds = Math.max(0, game.riceShedSeconds - dt);
  if (game.riceThrows === 3 && game.riceShedSeconds === 0) game.faceRice = false;
  game.teleportFlash = Math.max(0, game.teleportFlash - dt);
  const beforeRecord = game.recordGagSeconds;
  game.recordGagSeconds = Math.max(0, beforeRecord - dt);
  const impactAt = WORLD.recordGagSeconds - 0.38;
  if (game.phase === "hit" && beforeRecord > impactAt && game.recordGagSeconds <= impactAt) {
    game.faceRice = true;
    game.faceHitSeconds = 0.75;
    emit({ cue: "record", score: game.score });
  }
}

export function resetReactions(game: Game): void {
  game.flameCatchSeconds = 0;
  game.spicySeconds = 0;
  game.plateSlamSeconds = 0;
  game.slapSeconds = 0;
  game.slapDelaySeconds = 0;
  game.recordGagSeconds = 0;
  game.faceRice = false;
  game.faceHitSeconds = 0;
  game.riceThrows = 0;
  game.riceShedSeconds = 0;
}

export function beginSlap(game: Game, result: "hit" | "perfect" | "miss"): void {
  game.slapSeconds = 0;
  game.slapDelaySeconds = 0;
  if (result !== "perfect" || game.combo < 2) return;
  game.slapDelaySeconds = WORLD.slapDelaySeconds;
}

function updateSlap(game: Game, dt: number, emit: (event: Event) => void): void {
  const beforeDelay = game.slapDelaySeconds;
  game.slapDelaySeconds = Math.max(0, beforeDelay - dt);
  if (beforeDelay > 0 && game.slapDelaySeconds === 0) game.slapSeconds = WORLD.slapSeconds;
  const beforeSlap = game.slapSeconds;
  game.slapSeconds = Math.max(0, beforeSlap - Math.max(0, dt - beforeDelay));
  const contactAt = WORLD.slapSeconds - WORLD.slapImpactSeconds;
  if (game.phase === "hit" && beforeSlap > contactAt && game.slapSeconds <= contactAt)
    emit({ cue: "slap", score: game.score });
}
