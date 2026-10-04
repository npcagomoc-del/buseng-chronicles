import type { Game, Phase } from "./model";
import { releaseWindow } from "./physics";
import type { Preferences } from "./storage";
export function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new TypeError(`Missing UI element: ${id}`);
  return found;
}
export const stage = element("stage");
export const ui = {
  hud: element("hud"),
  menu: element("menu"),
  over: element("over"),
  controls: element("play-controls"),
  paused: element("paused"),
  score: element("score"),
  best: element("best"),
  final: element("final-score"),
  finalBest: element("final-best"),
  feedback: element("feedback"),
  live: element("live"),
  fill: element("charge-fill"),
  marker: element("charge-marker"),
  band: element("catch-band"),
  perfectBand: element("perfect-band"),
  banter: element("banter"),
  throwLabel: element("throw-label"),
  verdict: element("verdict"),
  pause: element("pause"),
};
let previousPhase: Phase = "menu";
export function syncUI(game: Game, preferences: Preferences): void {
  stage.dataset["phase"] = game.phase;
  const isMenu = game.phase === "menu";
  const isOver = game.phase === "over";
  const isPaused = game.phase === "paused";
  ui.menu.hidden = !isMenu;
  ui.over.hidden = !isOver;
  ui.paused.hidden = !isPaused;
  ui.hud.hidden = isMenu || isOver;
  ui.controls.hidden = isMenu || isOver || isPaused;
  ui.banter.hidden = isMenu || isOver || isPaused || game.talkSeconds <= 0;
  ui.banter.textContent = game.talkLine;
  ui.pause.hidden = isMenu || isOver || isPaused;
  ui.score.textContent = String(game.score);
  ui.best.textContent = String(preferences.best);
  ui.final.textContent = String(game.score);
  ui.finalBest.textContent = String(preferences.best);
  ui.feedback.textContent = game.phase === "hit" ? game.feedback : "";
  ui.verdict.textContent =
    game.score === 0
      ? "Walang kanen?! Isa pa, Buseng!"
      : `${game.score} serving${game.score === 1 ? "" : "s"}. Bitin pa rin!`;
  ui.throwLabel.textContent = game.phase === "flight" ? "KANIN INCOMING!" : "HOLD • RELEASE";
  const window = releaseWindow(game.plate, game.arenaHeight);
  ui.band.style.left = `${window.min * 100}%`;
  ui.band.style.width = `${(window.max - window.min) * 100}%`;
  ui.perfectBand.style.left = `${window.perfectMin * 100}%`;
  ui.perfectBand.style.width = `${(window.perfectMax - window.perfectMin) * 100}%`;
  const percent = game.power * 100;
  ui.fill.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
  ui.marker.style.left = `${percent}%`;
  stage.dataset["charge"] = String(Math.round(percent));
  stage.dataset["perfectAim"] = String(
    (game.phase === "hit" && game.combo > 0) ||
      (game.phase === "charging" &&
        game.power >= window.perfectMin &&
        game.power <= window.perfectMax),
  );
  if (game.phase !== previousPhase) {
    if (isOver) element("retry").focus({ preventScroll: true });
    if (isPaused) element("resume").focus({ preventScroll: true });
    previousPhase = game.phase;
  }
}
