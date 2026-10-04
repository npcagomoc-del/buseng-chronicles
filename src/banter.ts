import type { Game } from "./model";
import type { SpeechCue } from "./sound";

const LINES = [
  { cue: "hoy", text: "HOY!", weight: 2, anger: 1 },
  { cue: "walang", text: "Walang kanen, Buseng!", weight: 4, anger: 0 },
  { cue: "walangShort", text: "Walang kanen!", weight: 2, anger: 1 },
  { cue: "hayop", text: "Hayop na yan!", weight: 1, anger: 2 },
] as const;

export class Banter {
  private cooldown = 2;
  private interval = 0;
  private previous = -1;
  constructor(
    private readonly speak: (cue: SpeechCue) => number,
    private readonly random: () => number = Math.random,
    private readonly canSpeak: () => boolean = () => true,
  ) {}
  reset(): void {
    this.cooldown = 1.5 + this.random();
    this.interval = 0;
  }
  update(dt: number, game: Game): void {
    if (game.phase === "menu" || game.phase === "over" || game.phase === "paused") return;
    this.interval = Math.max(0, this.interval - dt);
    if (game.talkSeconds > 0 || !this.canSpeak()) return;
    this.cooldown -= dt;
    if (this.cooldown > 0 || this.interval > 0 || game.phase !== "ready" || game.age < 0.7) return;
    const level = Math.min(8, Math.floor(game.score / 20));
    const choices = LINES.map((line, index) => ({
      line,
      index,
      weight: index === this.previous ? 0 : line.weight + line.anger * level,
    }));
    let draw = this.random() * choices.reduce((total, choice) => total + choice.weight, 0);
    const choice = choices.find((candidate) => {
      draw -= candidate.weight;
      return candidate.weight > 0 && draw < 0;
    });
    if (!choice) throw new RangeError("Invalid speech selection");
    const { line, index } = choice;
    game.talkSeconds = Math.max(1.2, this.speak(line.cue));
    game.talkLine = line.text;
    this.previous = index;
    this.cooldown = Math.max(2.4, 6 - level * 0.6) + this.random() * 1.8;
    this.interval = 4;
  }
}
