import type { Cue, Game } from "./model";
import type { SpeechCue } from "./sound";

type ReactionAudio = {
  readonly setScene: (scene: "over") => void;
  readonly play: (cue: Cue | SpeechCue) => number;
};
export function startDefeat(game: Game, audio: ReactionAudio): void {
  audio.setScene("over");
  audio.play("miss");
  game.talkSeconds = audio.play("voice");
  game.talkLine = "HOY!";
}
export function rageExpression(game: Game): number {
  return game.talkSeconds > 0 && game.mouthOpen ? 2 : 3;
}
