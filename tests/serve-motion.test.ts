import { expect, it } from "bun:test";
import { Game } from "../src/model";
import { hand, WORLD } from "../src/physics";
import { serveOrigin } from "../src/serve-motion";

it("moves the whole server beside Buseng before the short slap", () => {
  const game = new Game(() => {});
  game.plate = { ...game.plate, x: 390, y: 460 };
  game.slapDelaySeconds = WORLD.slapDelaySeconds;
  expect(serveOrigin(game, false)).toEqual(hand(game.arenaHeight));
  game.slapDelaySeconds = 0;
  game.slapSeconds = WORLD.slapSeconds;
  const ready = serveOrigin(game, false);
  game.slapSeconds = WORLD.slapSeconds - WORLD.slapImpactSeconds;
  const contact = serveOrigin(game, false);
  expect(contact.x).toBeCloseTo(363);
  expect(contact.y).toBeCloseTo(393);
  expect(Math.hypot(contact.x - ready.x, contact.y - ready.y)).toBeLessThan(20);
});
it("approaches a left-side target from its open right side", () => {
  const game = new Game(() => {});
  game.plate = { ...game.plate, x: 110, y: 460 };
  game.slapSeconds = WORLD.slapSeconds - WORLD.slapImpactSeconds;
  const contact = serveOrigin(game, false);
  expect(contact.x).toBeCloseTo(137);
  expect(contact.y).toBeCloseTo(393);
});
it("keeps reduced-motion serving at the ordinary hand anchor", () => {
  const game = new Game(() => {});
  game.slapSeconds = WORLD.slapSeconds - WORLD.slapImpactSeconds;
  expect(serveOrigin(game, true)).toEqual(hand(game.arenaHeight));
});
