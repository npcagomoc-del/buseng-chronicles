import { expect, test } from "bun:test";
import { Banter } from "../src/banter";
import { Game } from "../src/model";
import type { SpeechCue } from "../src/sound";

function session(score = 0, duration = 1.2, random = 0) {
  const heard: SpeechCue[] = [];
  const game = new Game(() => {});
  const banter = new Banter(
    (cue) => {
      heard.push(cue);
      return duration;
    },
    () => random,
  );
  game.start();
  game.score = score;
  banter.reset();
  const advance = (seconds: number) => {
    for (let remaining = seconds; remaining > 0; remaining -= 0.05) {
      const dt = Math.min(0.05, remaining);
      game.update(dt);
      banter.update(dt, game);
    }
  };
  return { game, banter, heard, advance };
}

test("leaves a quiet break after the full clip when speech ends", () => {
  // Given: a long original clip has started.
  const run = session(160, 10);
  run.advance(2);
  expect(run.heard).toHaveLength(1);
  // When: it finishes and only one second of silence follows.
  run.advance(11);
  // Then: the next clip still waits for the minimum quiet break.
  expect(run.heard).toHaveLength(1);
  run.advance(2);
  expect(run.heard).toHaveLength(2);
});

test("increases requests at each twenty-serving level with a capped frequency", () => {
  // Given: runs at progressively higher serving levels.
  const counts = [0, 20, 40, 160, 10000].map((score) => session(score));
  // When: each has the same uninterrupted two minutes of readiness.
  for (const run of counts) run.advance(120);
  // Then: escalation grows before reaching the same bounded maximum.
  const lengths = counts.map((run) => run.heard.length);
  expect(lengths[1]).toBeGreaterThan(lengths[0] ?? 0);
  expect(lengths[2]).toBeGreaterThan(lengths[1] ?? 0);
  expect(lengths[3]).toBeLessThanOrEqual(30);
  expect(lengths[4]).toBe(lengths[3]);
});

test("weights angrier original clips more often at higher levels", () => {
  // Given: the same random draw near the upper part of the selection range.
  const calm = session(0, 1.2, 0.75);
  const angry = session(80, 1.2, 0.75);
  // When: each asks for its first line.
  calm.advance(3);
  angry.advance(3);
  // Then: higher-score selection favors the existing angry excerpt.
  expect(calm.heard[0]).toBe("walangShort");
  expect(angry.heard[0]).toBe("hayop");
});

test("avoids consecutive identical clips when randomness repeats", () => {
  // Given: a deterministic random source keeps choosing the first candidate.
  const run = session(160);
  // When: several requests play.
  run.advance(60);
  // Then: each clip differs from the preceding original excerpt.
  expect(run.heard.length).toBeGreaterThan(5);
  for (let index = 1; index < run.heard.length; index++)
    expect(run.heard[index]).not.toBe(run.heard[index - 1]);
});

test("waits for actual audio activity even when the caption has cleared", () => {
  // Given: audio from another owner is still active.
  const heard: SpeechCue[] = [];
  let available = false;
  const game = new Game(() => {});
  const banter = new Banter(
    (cue) => {
      heard.push(cue);
      return 1.2;
    },
    () => 0,
    () => available,
  );
  game.start();
  game.update(20);
  // When: its initial request becomes due while the audio guard is closed.
  banter.update(20, game);
  // Then: no overlapping voice is requested.
  expect(heard).toHaveLength(0);
  available = true;
  banter.update(1, game);
  expect(heard).toHaveLength(0);
  banter.update(2, game);
  expect(heard).toHaveLength(1);
});

test("freezes request pacing during pause", () => {
  // Given: the first request is still waiting.
  const run = session();
  run.game.pause();
  // When: a long pause is followed by resuming.
  run.advance(100);
  run.game.resume();
  run.advance(0.5);
  // Then: requests still wait rather than bursting immediately.
  expect(run.heard).toHaveLength(0);
  run.advance(2);
  expect(run.heard).toHaveLength(1);
});

test("starts a due request only when charging returns to readiness", () => {
  // Given: a charging player has left enough silence for a request.
  const run = session();
  run.game.hold();
  run.advance(10);
  expect(run.heard).toHaveLength(0);
  // When: the player returns to readiness.
  run.game.cancel();
  run.banter.update(0.05, run.game);
  // Then: one due request plays without a queued speech burst.
  expect(run.heard).toHaveLength(1);
});

test("menu and defeat never request speech and retry starts with clean captions", () => {
  // Given: a run has a current request.
  const run = session();
  run.advance(2);
  // When: menu, defeat and retry transitions occur.
  run.game.menu();
  run.banter.update(100, run.game);
  run.game.phase = "over";
  run.banter.update(100, run.game);
  run.game.start();
  run.banter.reset();
  // Then: old requests do not carry into the next run.
  expect(run.heard).toHaveLength(1);
  expect(run.game.talkSeconds).toBe(0);
  expect(run.game.talkLine).toBe("");
  run.advance(0.5);
  expect(run.heard).toHaveLength(1);
});

test("retains readable timed captions when original audio is unavailable", () => {
  // Given: the audio adapter has not loaded a clip.
  const run = session(0, 0);
  // When: the first request becomes due.
  run.advance(2);
  // Then: a speech caption remains visible for its minimum reading duration.
  expect(run.game.talkSeconds).toBeGreaterThan(0);
  expect(run.game.talkLine.length).toBeGreaterThan(0);
});
