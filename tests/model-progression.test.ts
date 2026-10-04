import { expect, test } from "bun:test";
import { type Event, Game } from "../src/model";
import { releaseWindow, WORLD } from "../src/physics";

test("rapid successful throws accumulate enough aiming time to teleport", () => {
  // Given: Buseng has reached teleport difficulty.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.score = 10;
  // When: each charge lasts less than one teleport interval, across repeated hits.
  for (let shot = 0; shot < 8; shot++) {
    game.hold();
    game.update(0.35);
    const window = releaseWindow(game.plate, game.arenaHeight);
    game.release(((window.perfectMin + window.perfectMax) / 2) * WORLD.chargeSeconds);
    const plate = game.plate;
    const timer = game.teleportClock;
    game.update(3);
    expect(game.plate).toEqual(plate);
    expect(game.teleportClock).toBe(timer);
    game.update(WORLD.flameCatchSeconds);
    expect(game.teleportClock).toBe(timer);
    expect(game.score).toBe(11 + shot);
  }
  // Then: accumulated aiming triggers a teleport despite rapid consecutive successes.
  expect(events.filter((event) => event.cue === "teleport")).toHaveLength(1);
  expect(game.teleportLane).toBe(1);
  game.start();
  expect(game.teleportClock).toBe(0);
});

test("three real perfect catches arm the fourth shot, including a normal flaming catch", () => {
  // Given: a fresh run, with no manually awarded combo.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  for (let shot = 0; shot < 4; shot++) {
    game.hold();
    const window = releaseWindow(game.plate);
    const power =
      shot === 3
        ? (window.min + window.perfectMin) / 2
        : (window.perfectMin + window.perfectMax) / 2;
    // When: three perfect throws are followed by a caught edge throw.
    game.release(power * WORLD.chargeSeconds);
    expect(game.flamingShot).toBe(shot === 3);
    game.update(3);
    if (shot < 3) game.update(1);
  }
  // Then: the caught flaming rice feeds Buseng but breaks the streak for the next throw.
  expect(game.score).toBe(4);
  expect(game.combo).toBe(0);
  expect(game.flamingShot).toBe(false);
  expect(game.flameCatchSeconds).toBe(WORLD.flameCatchSeconds);
  expect(events.filter((event) => event.cue === "flame-feed")).toHaveLength(1);
  game.update(WORLD.flameCatchSeconds);
  expect(events.filter((event) => event.cue === "spicy")).toHaveLength(1);
  game.update(10);
  expect(events.filter((event) => event.cue === "spicy")).toHaveLength(1);
  game.hold();
  game.release();
  expect(game.flamingShot).toBe(false);
});

test("leaving a celebration for the menu does not play delayed impacts", () => {
  // Given: both record and flaming feed celebrations pending.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start(0);
  game.combo = 3;
  game.hold();
  const window = releaseWindow(game.plate);
  game.release(((window.perfectMin + window.perfectMax) / 2) * WORLD.chargeSeconds);
  game.update(3);
  // When: the player leaves before either impact.
  game.menu();
  game.update(3);
  // Then: delayed gameplay sounds are not emitted from the menu.
  expect(events.filter((event) => event.cue === "record" || event.cue === "spicy")).toHaveLength(0);
});
