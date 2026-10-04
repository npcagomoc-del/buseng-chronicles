import { expect, test } from "bun:test";
import { rageExpression, startDefeat } from "../src/buseng-reaction";
import { type Cue, Game } from "../src/model";
import type { SpeechCue } from "../src/sound";

test("defeat keeps full original voice and switches away from play music", () => {
  const game = new Game(() => {});
  const cues: (Cue | SpeechCue)[] = [];
  const scenes: string[] = [];
  startDefeat(game, {
    setScene: (scene) => scenes.push(scene),
    play: (cue) => {
      cues.push(cue);
      return cue === "voice" ? 10.95 : 0.6;
    },
  });
  expect(game.talkSeconds).toBeGreaterThan(2);
  expect(cues).toContain("voice");
  expect(scenes).toEqual(["over"]);
});
test("Buseng closes his jaw after the shout and between syllables", () => {
  const game = new Game(() => {});
  game.phase = "over";
  expect(rageExpression(game)).toBe(3);
  game.talkSeconds = 8;
  game.mouthOpen = true;
  expect(rageExpression(game)).toBe(2);
  game.mouthOpen = false;
  expect(rageExpression(game)).toBe(3);
  game.talkSeconds = 0;
  game.mouthOpen = true;
  expect(rageExpression(game)).toBe(3);
});
