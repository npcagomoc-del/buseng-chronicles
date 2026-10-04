import { expect, test } from "bun:test";
import { type Event, Game } from "../src/model";
import { releaseWindow, WORLD } from "../src/physics";

function serve(game: Game, perfect = true): void {
  game.hold();
  const window = releaseWindow(game.plate, game.arenaHeight);
  const power = perfect
    ? (window.perfectMin + window.perfectMax) / 2
    : (window.min + window.perfectMin) / 2;
  game.release(power * WORLD.chargeSeconds);
  game.update(3);
}

test("the third perfect begins a slap and each subsequent perfect repeats it", () => {
  // Given: a fresh run and two real perfect catches.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  for (let shot = 0; shot < 2; shot++) {
    serve(game);
    expect(game.slapSeconds).toBe(0);
    game.update(2);
  }
  // When: the third perfect resolves.
  serve(game);
  // Then: a visible hold begins, with sound only at palm contact.
  expect(game.slapSeconds).toBe(0);
  expect(game.slapDelaySeconds).toBe(WORLD.slapDelaySeconds);
  expect(game.flamingShot).toBe(false);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
  game.update(0.3);
  expect(game.slapSeconds).toBeCloseTo(WORLD.slapSeconds);
  game.update(0.11);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
  game.update(0.02);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(1);
  game.update(0.37);
  expect(game.phase).toBe("hit");
  game.hold();
  expect(game.phase).toBe("hit");
  game.update(0.16);
  expect(game.phase).toBe("ready");
  serve(game);
  expect(game.flamingShot).toBe(true);
  expect(game.slapSeconds).toBe(0);
  expect(game.slapDelaySeconds).toBe(WORLD.slapDelaySeconds);
  game.update(0.3);
  expect(game.slapSeconds).toBeCloseTo(WORLD.slapSeconds);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(1);
  game.update(0.13);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(2);
});

test("a non-perfect catch breaks the slap chain and the next throw is normal", () => {
  // Given: an active streak.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 3;
  // When: the flaming shot catches outside the perfect zone.
  serve(game, false);
  game.update(2);
  // Then: no slap is queued and the next release is ordinary rice.
  expect(game.combo).toBe(0);
  expect(game.slapSeconds).toBe(0);
  expect(game.slapDelaySeconds).toBe(0);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
  game.hold();
  game.release();
  expect(game.flamingShot).toBe(false);
});

test("pause freezes a delayed slap and retry cancels pending contact", () => {
  // Given: a flaming-perfect catch waiting for its slap.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 3;
  serve(game);
  // When: pausing before the feed finishes its approach.
  game.pause();
  game.update(20);
  // Then: neither the delay nor its sound advances; retry clears it.
  expect(game.slapDelaySeconds).toBe(WORLD.slapDelaySeconds);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
  game.start();
  game.update(2);
  expect(game.slapSeconds).toBe(0);
  expect(game.slapDelaySeconds).toBe(0);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
});

test("a delayed frame emits one slap alongside the independent record gag", () => {
  // Given: a record-breaking flaming perfect.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start(0);
  game.combo = 3;
  serve(game);
  // When: a frame crosses the complete celebration.
  game.update(3);
  game.update(3);
  // Then: each independent impact fires once and play resumes fairly.
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(1);
  expect(events.filter((event) => event.cue === "record")).toHaveLength(1);
  expect(game.phase).toBe("ready");
  expect(game.slapSeconds).toBe(0);
});

test("missing during a streak clears the slap and ends the run", () => {
  // Given: a streak ready to release flaming rice.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 3;
  game.hold();
  // When: an empty-power shot misses the plate.
  game.release(0);
  game.update(3);
  game.update(2);
  // Then: defeat clears the streak without a cheek impact.
  expect(game.phase).toBe("over");
  expect(game.combo).toBe(0);
  expect(game.slapSeconds).toBe(0);
  expect(game.slapDelaySeconds).toBe(0);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
});

test("pause holds an approaching palm and resume finishes exactly one contact", () => {
  // Given: the third-perfect palm approaching the cheek.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 2;
  serve(game);
  game.update(0.3);
  game.update(0.06);
  const remaining = game.slapSeconds;
  // When: pausing across the nominal impact time.
  game.pause();
  game.update(20);
  // Then: pose and sound are held until resuming.
  expect(game.slapSeconds).toBe(remaining);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
  game.resume();
  game.update(0.07);
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(1);
});

test("returning to the menu cancels the pending slap sound", () => {
  // Given: a delayed fiery slap.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 3;
  serve(game);
  // When: returning to the menu before contact.
  game.menu();
  game.update(3);
  // Then: gameplay audio does not sound over the menu.
  expect(events.filter((event) => event.cue === "slap")).toHaveLength(0);
});
