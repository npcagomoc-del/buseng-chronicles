import { expect, test } from "bun:test";
import { type Event, Game } from "../src/model";
import { contact, launch, target, WORLD } from "../src/physics";

function centeredPower(plate = target(0)): number {
  let power = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= 1000; step++) {
    const candidate = step / 1000;
    const error = Math.abs(contact(launch(candidate), plate).x - plate.x);
    if (error < distance) {
      distance = error;
      power = candidate;
    }
  }
  return power;
}

for (const fps of [30, 60, 120]) {
  test(`center hit scores exactly once at ${fps} fps`, () => {
    const events: Event[] = [];
    const game = new Game((event) => events.push(event));
    game.start();
    game.hold();
    game.update(centeredPower() * WORLD.chargeSeconds);
    game.release();
    for (let frame = 0; frame < fps * 2; frame++) game.update(1 / fps);
    expect(game.score).toBe(1);
    expect(game.combo).toBe(1);
    expect(events.filter((event) => event.cue === "perfect")).toHaveLength(1);
    expect(game.phase).toBe("ready");
  });
}

test("held charge reverses after maximum and cancellation never throws", () => {
  const game = new Game(() => {});
  game.start();
  game.hold();
  game.update(WORLD.chargeSeconds);
  expect(game.phase).toBe("charging");
  expect(game.power).toBe(1);
  game.update(WORLD.chargeSeconds / 2);
  expect(game.power).toBeCloseTo(0.5);
  expect(game.rice).toBeNull();
  game.pause();
  expect(game.power).toBe(0);
  game.resume();
  expect(game.phase).toBe("ready");
});

test("after score ten, Buseng warns then teleports without moving mid-flight", () => {
  const events: Event[] = [];
  const game = new Game((event) => events.push(event));
  game.start();
  game.score = 10;
  game.update(1.8);
  expect(game.teleportWarning).toBe(true);
  const before = game.plate;
  game.update(0.31);
  expect(game.teleportLane).toBe(1);
  expect(game.teleportFlash).toBeGreaterThan(0);
  expect(events.filter((event) => event.cue === "teleport")).toHaveLength(1);
  expect(game.teleportOrigin).toEqual({ x: before.x, y: before.y });
  expect(Math.abs(game.plate.x - before.x)).toBeGreaterThan(40);
  game.hold();
  game.update(0.4);
  game.release();
  const plate = game.plate;
  game.update(0.2);
  expect(game.plate).toEqual(plate);
});

test("plate and flight remain frozen during a pause", () => {
  const game = new Game(() => {});
  game.start();
  game.score = 20;
  game.hold();
  game.update(0.4);
  game.release();
  const plate = game.plate;
  game.update(0.2);
  expect(game.plate).toEqual(plate);
  const rice = game.rice;
  game.pause();
  game.update(20);
  expect(game.rice).toEqual(rice);
  game.resume();
  expect(game.phase).toBe("flight");
});

test("one miss ends the run and retry immediately restores play", () => {
  const events: Event[] = [];
  const game = new Game((event) => events.push(event));
  game.start();
  game.hold();
  game.release();
  for (let frame = 0; frame < 180; frame++) game.update(1 / 60);
  expect(game.phase).toBe("over");
  expect(events.filter((event) => event.cue === "miss")).toHaveLength(1);
  game.start();
  expect(game.phase).toBe("ready");
  expect(game.score).toBe(0);
  expect(game.combo).toBe(0);
  expect(game.feedback).toBe("");
});

test("release uses held input duration even between animation frames", () => {
  const game = new Game(() => {});
  game.start();
  game.hold();
  game.update(0.1);
  game.release(centeredPower() * WORLD.chargeSeconds);
  for (let frame = 0; frame < 90; frame++) game.update(1 / 60);
  expect(game.combo).toBe(1);
  expect(game.score).toBe(1);
});

test("beating the starting best throws rice at Buseng once, with impact-timed feedback", () => {
  const events: Event[] = [];
  const game = new Game((event) => events.push(event));
  game.start(0);
  const score = (): void => {
    game.hold();
    game.update(0.6);
    game.release(centeredPower(game.plate) * WORLD.chargeSeconds);
    for (let frame = 0; frame < 120 && game.phase === "flight"; frame++) game.update(1 / 60);
  };
  score();
  expect(game.score).toBe(1);
  expect(game.recordGagSeconds).toBeGreaterThan(0);
  expect(events.filter((event) => event.cue === "record")).toHaveLength(0);
  game.update(0.2);
  expect(game.phase).toBe("hit");
  game.update(0.2);
  expect(events.filter((event) => event.cue === "record")).toHaveLength(1);
  game.update(0.8);
  expect(game.phase).toBe("ready");
  score();
  expect(game.score).toBe(2);
  expect(game.recordGagSeconds).toBe(0);
  expect(events.filter((event) => event.cue === "record")).toHaveLength(1);
});

test("record rice remains after impact but sheds completely over the next three throws", () => {
  const events: Event[] = [];
  const game = new Game((event) => events.push(event));
  game.start(0);
  game.hold();
  game.release(centeredPower() * WORLD.chargeSeconds);
  for (let frame = 0; frame < 120 && game.phase === "flight"; frame++) game.update(1 / 60);
  expect(game.faceRice).toBe(false);
  game.update(0.4);
  expect(game.faceRice).toBe(true);
  game.update(2);
  expect(game.phase).toBe("ready");
  expect(game.faceRice).toBe(true);
  for (let throwNumber = 1; throwNumber <= 3; throwNumber++) {
    game.hold();
    game.release(centeredPower(game.plate) * WORLD.chargeSeconds);
    game.update(0.2);
    expect(game.faceRice).toBe(true);
    for (let frame = 0; frame < 240 && game.phase !== "ready"; frame++) game.update(1 / 60);
    expect(game.phase).toBe("ready");
    expect(game.faceRice).toBe(throwNumber < 3);
  }
  expect(events.filter((event) => event.cue === "record")).toHaveLength(1);
  game.start(1);
  expect(game.faceRice).toBe(false);
});

test("pause freezes rice shedding and face-hit reaction; retry clears both", () => {
  const game = new Game(() => {});
  game.start(0);
  game.hold();
  game.release(centeredPower() * WORLD.chargeSeconds);
  for (let frame = 0; frame < 120 && game.phase === "flight"; frame++) game.update(1 / 60);
  game.update(0.4);
  const reaction = game.faceHitSeconds;
  expect(reaction).toBeGreaterThan(0);
  game.pause();
  game.update(10);
  expect(game.faceHitSeconds).toBe(reaction);
  game.resume();
  game.update(2);
  game.hold();
  game.release(centeredPower(game.plate) * WORLD.chargeSeconds);
  game.update(0.15);
  const shedding = game.riceShedSeconds;
  game.pause();
  game.update(10);
  expect(game.riceShedSeconds).toBe(shedding);
  game.start(1);
  expect(game.faceHitSeconds).toBe(0);
  expect(game.riceShedSeconds).toBe(0);
  expect(game.riceThrows).toBe(0);
});

test("the fourth consecutive perfect throw ignites and an ordinary catch clears fire", () => {
  // Given: an earned three-perfect streak.
  const game = new Game(() => {});
  game.start();
  game.combo = 3;
  game.hold();
  // When: releasing the next rice ball.
  game.release(centeredPower(game.plate) * WORLD.chargeSeconds);
  // Then: its flame persists through the perfect impact.
  expect(game.flamingShot).toBe(true);
  for (let frame = 0; frame < 150; frame++) game.update(1 / 60);
  expect(game.flamingShot).toBe(true);
  game.update(2);
  game.hold();
  const center = centeredPower(game.plate);
  game.release((center + 0.1) * WORLD.chargeSeconds);
  for (let frame = 0; frame < 150; frame++) game.update(1 / 60);
  expect(game.combo).toBe(0);
  expect(game.flamingShot).toBe(false);
});

test("every twenty points accelerates teleport cadence and shortens transmission", () => {
  // Given: a run across six escalation levels.
  const game = new Game(() => {});
  let interval = Number.POSITIVE_INFINITY;
  let duration = Number.POSITIVE_INFINITY;
  for (let score = 0; score <= 120; score += 20) {
    // When: entering the next score band.
    game.score = score;
    // Then: the next transmission occurs sooner and completes faster.
    expect(game.teleportInterval).toBeLessThan(interval);
    expect(game.teleportDuration).toBeLessThan(duration);
    interval = game.teleportInterval;
    duration = game.teleportDuration;
  }
});

test("tall arena center throws survive a frame spanning the whole arc", () => {
  for (const height of [800, 1100, 1180]) {
    const game = new Game(() => {}, 73);
    game.setArenaHeight(height);
    game.start();
    game.hold();
    const plate = game.plate;
    const first = contact(launch(0, height), plate).x;
    const span = contact(launch(1, height), plate).x - first;
    game.release(((plate.x - first) / span) * WORLD.chargeSeconds);
    // When: a delayed frame crosses both ascent and descent.
    game.update(3);
    // Then: swept descending contact still scores exactly once.
    expect(game.score).toBe(1);
    expect(game.combo).toBe(1);
  }
});

test("a flaming catch stages feeding and spice while freezing the next shot", () => {
  // Given: the fourth shot of a perfect streak.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event), 73);
  game.start();
  game.combo = 3;
  game.hold();
  game.release(centeredPower(game.plate) * WORLD.chargeSeconds);
  // When: the flaming rice reaches Buseng.
  game.update(3);
  // Then: feeding starts before its spicy impact, with input and target held.
  expect(game.flameCatchSeconds).toBeGreaterThan(1);
  expect(game.spicySeconds).toBe(0);
  expect(events.filter((event) => event.cue === "flame-feed")).toHaveLength(1);
  const plate = game.plate;
  game.update(0.31);
  expect(game.spicySeconds).toBeGreaterThan(0);
  expect(events.filter((event) => event.cue === "spicy")).toHaveLength(1);
  game.hold();
  expect(game.phase).toBe("hit");
  expect(game.plate).toEqual(plate);
  game.pause();
  const spicy = game.spicySeconds;
  game.update(20);
  expect(game.spicySeconds).toBe(spicy);
  game.resume();
  game.update(2);
  expect(game.phase).toBe("ready");
  expect(game.flameCatchSeconds).toBe(0);
  expect(game.spicySeconds).toBe(0);
});

test("a miss starts one plate slam and retry clears reactions", () => {
  // Given: an empty-power miss.
  const events: Event[] = [];
  const game = new Game((event) => events.push(event));
  game.start();
  game.hold();
  game.release();
  // When: the shot resolves.
  game.update(3);
  // Then: the defeat has one timed slam and retry removes it.
  expect(game.plateSlamSeconds).toBeGreaterThan(0);
  expect(events.filter((event) => event.cue === "plate-slam")).toHaveLength(1);
  game.start();
  expect(game.plateSlamSeconds).toBe(0);
  expect(game.flameCatchSeconds).toBe(0);
});
