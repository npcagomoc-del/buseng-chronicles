import { startDefeat } from "./buseng-reaction";
import { assertNever, type Event, type Game } from "./model";
import type { Sound } from "./sound";
import { type Preferences, savePreferences } from "./storage";
import { ui } from "./ui";

export class GameFeedback {
  constructor(
    private readonly sound: Sound,
    private readonly preferences: Preferences,
  ) {}
  receive(event: Event, game: Game): void {
    const sound = this.sound;
    switch (event.cue) {
      case "charge":
        sound.play("charge");
        return;
      case "throw":
        sound.throwRice(game.power);
        return;
      case "hit":
      case "perfect":
        if (event.cue === "perfect") sound.perfect(game.combo);
        else sound.play("hit");
        this.preferences.best = Math.max(this.preferences.best, event.score);
        savePreferences(this.preferences);
        ui.live.textContent = `${event.score} points. ${event.cue}.`;
        return;
      case "miss":
        startDefeat(game, sound);
        ui.live.textContent = `Game over. ${event.score} points. Best ${this.preferences.best}. Press Isa pa to retry.`;
        return;
      case "retry":
        sound.clear();
        sound.pause(false);
        sound.music();
        sound.play("retry");
        return;
      case "voice":
        sound.play("voice");
        return;
      case "teleport":
        sound.teleport();
        return;
      case "record":
        sound.record();
        ui.live.textContent = `New best: ${event.score}. Buseng gets a faceful of rice!`;
        return;
      case "flame-feed":
      case "spicy":
      case "plate-slam":
      case "slap":
        sound.playFire(event.cue);
        return;
      default:
        assertNever(event.cue);
    }
  }
}
