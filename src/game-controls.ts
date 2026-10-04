import type { Game } from "./model";

type Actions = {
  readonly unlock: () => void;
  readonly begin: () => void;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly stopCharge: () => void;
};
export class GameControls {
  private activePointer: number | null = null;
  private spaceHeld = false;
  private pressedAt = 0;
  reset(): void {
    this.activePointer = null;
    this.spaceHeld = false;
  }
  constructor(stage: HTMLElement, game: Game, actions: Actions) {
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || this.activePointer !== null || game.phase !== "ready") return;
      if (
        event.target instanceof Element &&
        event.target.closest("button")?.id !== "throw" &&
        event.target.closest("button")
      )
        return;
      actions.unlock();
      this.activePointer = event.pointerId;
      stage.setPointerCapture(event.pointerId);
      this.pressedAt = event.timeStamp;
      game.hold();
    });
    stage.addEventListener("pointerup", (event) => {
      if (this.activePointer !== event.pointerId) return;
      this.activePointer = null;
      game.release((event.timeStamp - this.pressedAt) / 1000);
    });
    stage.addEventListener("pointercancel", (event) => {
      if (this.activePointer !== event.pointerId) return;
      game.cancel();
      actions.pause();
    });
    stage.addEventListener("lostpointercapture", () => {
      if (this.activePointer !== null) {
        this.activePointer = null;
        game.cancel();
        actions.stopCharge();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.code === "Escape") {
        event.preventDefault();
        if (game.phase === "paused") actions.resume();
        else actions.pause();
        return;
      }
      if (event.code !== "Space" || event.repeat || this.spaceHeld) return;
      if (
        event.target instanceof Element &&
        event.target.closest("button")?.id !== "throw" &&
        event.target.closest("button")
      )
        return;
      event.preventDefault();
      switch (game.phase) {
        case "menu":
        case "over":
          actions.begin();
          return;
        case "paused":
          actions.resume();
          return;
        case "ready":
          this.spaceHeld = true;
          actions.unlock();
          this.pressedAt = event.timeStamp;
          game.hold();
          return;
        case "charging":
        case "flight":
        case "hit":
          return;
      }
    });
    window.addEventListener("keyup", (event) => {
      if (event.code === "Space" && this.spaceHeld) {
        event.preventDefault();
        this.spaceHeld = false;
        game.release((event.timeStamp - this.pressedAt) / 1000);
      }
    });
  }
}
