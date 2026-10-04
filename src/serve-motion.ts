import type { Game } from "./model";
import { hand, type Point, WORLD } from "./physics";
import { feedPose } from "./spicy-effect";

function ease(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Move the complete server into arm's reach; the original atlas arm never changes length. */
export function serveOrigin(game: Game, reduced: boolean): Point {
  const base = hand(game.arenaHeight);
  if (reduced) return base;
  const side = game.plate.x < 220 ? 1 : -1;
  const reach = feedPose(game, false).reach;
  const mouth = { x: game.plate.x - 9, y: game.plate.y - 64 };
  const cheek = { x: game.plate.x + side * 27, y: game.plate.y - 67 };
  let target = mouth;
  if (game.flameCatchSeconds <= 0 && (game.slapDelaySeconds > 0 || game.slapSeconds > 0)) {
    const age = game.slapSeconds > 0 ? WORLD.slapSeconds - game.slapSeconds : 0;
    const windup = 1 - ease(age / WORLD.slapImpactSeconds);
    target = { x: cheek.x + side * 12 * windup, y: cheek.y - 6 * windup };
  } else if (game.slapSeconds > 0) {
    const age = WORLD.slapSeconds - game.slapSeconds;
    const swipe = ease(age / WORLD.slapImpactSeconds) * (1 - ease((age - 0.2) / 0.16));
    target = { x: mouth.x + (cheek.x - mouth.x) * swipe, y: mouth.y + (cheek.y - mouth.y) * swipe };
  }
  return { x: base.x + (target.x - base.x) * reach, y: base.y + (target.y - base.y) * reach };
}
