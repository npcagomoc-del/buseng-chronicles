import { describe, expect, test } from "bun:test";
import {
  catchResult,
  chargePower,
  contact,
  launch,
  releaseWindow,
  target,
  WORLD,
} from "../src/physics";

describe("rice throwing contract", () => {
  test("every difficulty target has a useful release window", () => {
    for (let score = 0; score < 100; score++) {
      const plate = target(score);
      let hits = 0;
      for (let step = 0; step <= 1000; step++) {
        const landing = contact(launch(step / 1000), plate);
        if (catchResult(landing, plate) !== "miss") hits++;
      }
      expect((hits / 1000) * WORLD.chargeSeconds).toBeGreaterThan(0.16);
      const window = releaseWindow(plate);
      const center = (window.perfectMin + window.perfectMax) / 2;
      expect(catchResult(contact(launch(center), plate), plate)).toBe("perfect");
      expect(contact(launch(center), plate).y).toBeCloseTo(plate.y, 6);
      if (window.min > 0.01)
        expect(catchResult(contact(launch(window.min - 0.01), plate), plate)).toBe("miss");
      if (window.max < 0.99)
        expect(catchResult(contact(launch(window.max + 0.01), plate), plate)).toBe("miss");
    }
  });
  test("a descending center landing is perfect", () => {
    expect(catchResult({ x: 382, y: 458 }, target(0))).toBe("perfect");
  });
  test("near-edge rice counts while a clear overshoot misses", () => {
    expect(catchResult({ x: 430, y: 458 }, target(0))).toBe("hit");
    expect(catchResult({ x: 440, y: 458 }, target(0))).toBe("miss");
  });
  test("charging caps at maximum without changing the throw", () => {
    expect(launch(2)).toEqual(launch(1));
  });
  test("long holds sweep back and forth through perfect power", () => {
    expect(chargePower(WORLD.chargeSeconds)).toBeCloseTo(1);
    expect(chargePower(WORLD.chargeSeconds * 1.5)).toBeCloseTo(0.5);
    expect(chargePower(WORLD.chargeSeconds * 2)).toBeCloseTo(0);
    expect(chargePower(WORLD.chargeSeconds * 2.5)).toBeCloseTo(0.5);
  });
  test("Buseng sweeps wider and faster, with reachable teleport lanes", () => {
    const distance = (score: number): number => {
      let traveled = 0;
      for (let frame = 1; frame <= 120; frame++)
        traveled += Math.abs(target(score, frame / 60).x - target(score, (frame - 1) / 60).x);
      return traveled;
    };
    expect(distance(18)).toBeGreaterThan(distance(4));
    for (let score = 3; score < 100; score++)
      for (const lane of [0, 1])
        for (let tick = 0; tick <= 20; tick++) {
          const plate = target(score, tick * 0.2, lane);
          const window = releaseWindow(plate);
          expect(window.perfectMax).toBeGreaterThan(window.perfectMin);
          expect(window.max - window.min).toBeGreaterThan(0.16 / WORLD.chargeSeconds);
          const center = (window.perfectMin + window.perfectMax) / 2;
          expect(catchResult(contact(launch(center), plate), plate)).toBe("perfect");
        }
  });
});

test("tall arenas retain reachable descending perfect windows across escalation", () => {
  // Given: phone heights, all progression milestones, seeded routes and teleport arrivals.
  for (const height of [800, 1100, 1180])
    for (let score = 0; score <= 120; score += 5)
      for (const lane of [0, 1, 7])
        for (let tick = 0; tick < 40; tick++) {
          // When: selecting the middle of the advertised perfect interval.
          const plate = target(score, tick * 0.41, lane, height, 73);
          const window = releaseWindow(plate, height);
          const flight = launch((window.perfectMin + window.perfectMax) / 2, height);
          // Then: the real descending contact is perfect and safely framed.
          expect(catchResult(contact(flight, plate), plate)).toBe("perfect");
          expect(plate.x).toBeGreaterThanOrEqual(100);
          expect(plate.x).toBeLessThanOrEqual(383);
          expect(plate.y - 154).toBeGreaterThan(170);
          expect(plate.y + 74).toBeLessThan(height - 190);
          expect((window.max - window.min) * WORLD.chargeSeconds).toBeGreaterThan(0.16);
          expect(window.perfectMax - window.perfectMin).toBeGreaterThan(0.04);
        }
});

test("seeded routes keep moving without a clamped left-edge plateau", () => {
  // Given: every score band and several distinct run seeds.
  for (const score of [1, 4, 10, 20, 40, 60, 80, 100, 120])
    for (const seed of [0, 1, 73, 900001]) {
      const samples = Array.from(
        { length: 600 },
        (_, frame) => target(score, frame / 60, 0, 1180, seed).x,
      );
      // When: observing ten seconds of one route.
      const span = Math.max(...samples) - Math.min(...samples);
      // Then: it traverses its lane and never holds a coordinate for a frame sequence.
      expect(span).toBeGreaterThan(30);
      for (let frame = 20; frame < samples.length; frame++)
        expect(Math.abs((samples[frame] ?? 0) - (samples[frame - 20] ?? 0))).toBeGreaterThan(
          0.00001,
        );
    }
});

test("the whole Buseng actor clears the portrait HUD across all progression routes", () => {
  // Given: native and browser portrait arenas and every progression score.
  for (const height of [800, 880, 1046, 1100, 1180])
    for (let score = 0; score <= 120; score++)
      for (const lane of [0, 1, 7])
        for (let tick = 0; tick < 30; tick++) {
          // When: framing an actual target, including its hair and feet.
          const plate = target(score, tick * 0.41, lane, height, 73);
          const actorTop = plate.y - 154;
          const actorBottom = plate.y + 74;
          const window = releaseWindow(plate, height);
          const shot = launch((window.perfectMin + window.perfectMax) / 2, height);
          // Then: HUD clearance, control clearance, and honest aiming all hold.
          expect(actorTop - (height * 0.17 + 100)).toBeGreaterThanOrEqual(6);
          expect(actorBottom).toBeLessThan(height - 190);
          expect(actorBottom).toBeLessThan(height * 0.73);
          expect(catchResult(contact(shot, plate), plate)).toBe("perfect");
          expect((window.max - window.min) * WORLD.chargeSeconds).toBeGreaterThan(0.16);
          expect(window.perfectMax - window.perfectMin).toBeGreaterThan(0.04);
        }
});

test("teleport routes explore the left and right safe arena when difficulty is active", () => {
  // Given: several late-game scores, heights and seeds.
  for (const height of [800, 1100, 1180])
    for (const score of [10, 20, 60, 120])
      for (const seed of [0, 73, 900001]) {
        // When: observing each arrival route over a complete sweep.
        const samples = Array.from({ length: 500 }, (_, tick) =>
          target(score, tick * 0.07, tick % 8, height, seed),
        );
        // Then: Buseng visits both sides rather than two narrow central lanes.
        expect(Math.min(...samples.map((plate) => plate.x))).toBeLessThan(145);
        expect(Math.max(...samples.map((plate) => plate.x))).toBeGreaterThan(350);
        for (const plate of samples) {
          const window = releaseWindow(plate, height);
          expect(
            catchResult(
              contact(launch((window.perfectMin + window.perfectMax) / 2, height), plate),
              plate,
            ),
          ).toBe("perfect");
          expect((window.max - window.min) * WORLD.chargeSeconds).toBeGreaterThan(0.16);
        }
      }
});

test("tall phone routes fill the available height without crossing Rice Man", () => {
  // Given: full-height phone arenas and every broad movement band.
  for (const height of [1100, 1180, 1400, 1600])
    for (const score of [3, 10, 40, 120]) {
      const samples = Array.from({ length: 1600 }, (_, tick) =>
        target(score, tick * 0.07, tick % 8, height, 73),
      );
      // When: sampling the entire seeded horizontal and vertical route.
      const right = samples.filter((plate) => plate.x >= 270);
      const left = samples.filter((plate) => plate.x <= 223);
      // Then: both sides use tall-screen height while left-side feet clear the server head.
      expect(Math.max(...right.map((plate) => plate.y))).toBeGreaterThan(height * 0.73 - 110);
      expect(
        Math.max(...left.map((plate) => plate.y)) - Math.min(...left.map((plate) => plate.y)),
      ).toBeGreaterThan(155);
      for (const plate of samples) {
        if (plate.x <= 223) expect(plate.y + 74).toBeLessThan(height * 0.73 - 59);
        const window = releaseWindow(plate, height);
        expect((window.max - window.min) * WORLD.chargeSeconds).toBeGreaterThan(0.16);
        expect(
          catchResult(
            contact(launch((window.perfectMin + window.perfectMax) / 2, height), plate),
            plate,
          ),
        ).toBe("perfect");
      }
    }
});
