import type { MotionPreference } from "./motion-preference";
import { appendPreferenceControls } from "./settings-controls";
import { type Preferences, savePreferences } from "./storage";

type Actions = {
  readonly motionChanged: () => void;
  readonly resetScore: () => void;
  readonly soundChanged: () => void;
  readonly volumesChanged: () => void;
  readonly characterChanged: () => void;
};
export class GameSettings {
  private readonly dialog = document.createElement("dialog");
  private readonly reset: HTMLButtonElement;
  private readonly sound: HTMLButtonElement;
  private readonly best: HTMLSpanElement;
  private readonly confirmation: HTMLDivElement;
  private readonly status: HTMLParagraphElement;
  get active(): boolean {
    return this.dialog.open;
  }
  constructor(
    private readonly preferences: Preferences,
    actions: Actions,
  ) {
    this.dialog.className = "settings-panel plaque";
    this.dialog.setAttribute("aria-labelledby", "settings-title");
    this.dialog.innerHTML = `
      <header class="settings-header">
        <svg class="settings-emblem" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></svg>
        <div><p class="settings-kicker">BUSENG CHRONICLES</p><h2 id="settings-title">SETTINGS</h2></div>
        <button class="settings-close" type="button" aria-label="Close settings" data-close><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="settings-content">
        <section class="settings-section settings-audio" aria-labelledby="settings-sound-title">
          <div><h3 id="settings-sound-title">SOUND</h3><p>Music, effects &amp; voices</p></div>
          <button class="settings-sound" type="button" role="switch" aria-label="Game sound"><span class="settings-switch" aria-hidden="true"></span><span data-sound-label></span></button>
        </section>
        <section class="settings-section settings-motion" aria-labelledby="settings-motion-title">
          <h3 id="settings-motion-title">ANIMATIONS</h3>
          <div class="settings-options" role="radiogroup" aria-labelledby="settings-motion-title"></div>
        </section>
        <section class="settings-section settings-score" aria-labelledby="settings-score-title">
          <div class="settings-score-heading"><h3 id="settings-score-title">BEST SCORE</h3><span data-best></span></div>
          <button class="secondary settings-reset" type="button" aria-expanded="false" aria-controls="settings-confirm">RESET SCORE</button>
          <div class="settings-confirm" id="settings-confirm" hidden><p></p><button class="settings-keep" type="button">KEEP SCORE</button></div>
        </section>
      </div>
      <p class="settings-status" role="status" aria-live="polite"></p>
      <button class="comic-button settings-done" type="button" data-close>DONE</button>`;
    this.reset = this.find<HTMLButtonElement>(".settings-reset");
    this.sound = this.find<HTMLButtonElement>(".settings-sound");
    this.best = this.find<HTMLSpanElement>("[data-best]");
    this.confirmation = this.find<HTMLDivElement>(".settings-confirm");
    this.status = this.find<HTMLParagraphElement>(".settings-status");
    const controls = document.createElement("div");
    controls.className = "settings-preferences";
    appendPreferenceControls(controls, preferences, {
      volumesChanged: actions.volumesChanged,
      characterChanged: actions.characterChanged,
      saved: (message, success) => {
        this.status.textContent = success ? message : "Changed for this session. Could not save.";
      },
    });
    this.find<HTMLDivElement>(".settings-content").insertBefore(
      controls,
      this.find<HTMLElement>(".settings-motion"),
    );
    this.sound.addEventListener("click", () => {
      preferences.muted = !preferences.muted;
      const saved = savePreferences(preferences);
      actions.soundChanged();
      this.refreshSound();
      this.status.textContent = saved
        ? "Sound setting saved."
        : "Changed for this session. Could not save.";
    });
    const options = this.find<HTMLDivElement>(".settings-options");
    const choices: readonly (readonly [MotionPreference, string])[] = [
      ["system", "Use device setting"],
      ["full", "Full animations"],
      ["reduced", "Reduced motion"],
    ];
    const buttons = choices.map(([value, text]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "settings-option";
      button.setAttribute("role", "radio");
      button.textContent = text;
      button.addEventListener("click", () => changeMotion(value));
      options.append(button);
      return button;
    });
    const refreshChoices = () => {
      buttons.forEach((button, index) => {
        const checked = choices[index]?.[0] === preferences.motion;
        button.setAttribute("aria-checked", String(checked));
        button.tabIndex = checked ? 0 : -1;
      });
    };
    const changeMotion = (value: MotionPreference) => {
      preferences.motion = value;
      const saved = savePreferences(preferences);
      actions.motionChanged();
      refreshChoices();
      this.status.textContent = saved
        ? "Animation setting saved."
        : "Changed for this session. Could not save.";
    };
    options.addEventListener("keydown", (event) => {
      const index = choices.findIndex(([value]) => value === preferences.motion);
      let next: number;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          next = (index + 1) % choices.length;
          break;
        case "ArrowUp":
        case "ArrowLeft":
          next = (index + choices.length - 1) % choices.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = choices.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const choice = choices[next];
      if (!choice) throw new RangeError("Invalid motion selection");
      changeMotion(choice[0]);
      buttons[next]?.focus();
    });
    refreshChoices();
    this.reset.addEventListener("click", () => {
      if (this.confirmation.hidden) {
        this.confirmation.hidden = false;
        this.reset.setAttribute("aria-expanded", "true");
        this.reset.textContent = "CONFIRM RESET";
        this.find<HTMLParagraphElement>(".settings-confirm p").textContent =
          `Clear best score ${preferences.best}? This cannot be undone.`;
        this.status.textContent = "";
        return;
      }
      preferences.best = 0;
      const saved = savePreferences(preferences);
      actions.resetScore();
      this.best.textContent = "0";
      this.status.textContent = saved
        ? "Score reset. Fresh kanin, fresh start!"
        : "Reset for this session. Could not save.";
      this.cancelReset();
    });
    this.find<HTMLButtonElement>(".settings-keep").addEventListener("click", () => {
      this.cancelReset();
      this.reset.focus();
    });
    for (const close of this.dialog.querySelectorAll<HTMLButtonElement>("[data-close]"))
      close.addEventListener("click", () => this.dialog.close());
    this.dialog.addEventListener("close", () => {
      this.cancelReset();
      this.status.textContent = "";
    });
    this.dialog.addEventListener("keydown", (event) => event.stopPropagation());
    document.body.append(this.dialog);
  }
  private find<Element extends HTMLElement>(selector: string): Element {
    const element = this.dialog.querySelector<Element>(selector);
    if (!element) throw new TypeError(`Missing settings control: ${selector}`);
    return element;
  }
  private refreshSound(): void {
    this.sound.setAttribute("aria-checked", String(!this.preferences.muted));
    this.find<HTMLSpanElement>("[data-sound-label]").textContent = this.preferences.muted
      ? "OFF"
      : "ON";
  }
  private cancelReset(): void {
    this.confirmation.hidden = true;
    this.reset.setAttribute("aria-expanded", "false");
    this.reset.textContent = "RESET SCORE";
  }
  open(): void {
    if (this.active) return;
    this.refreshSound();
    this.best.textContent = String(this.preferences.best);
    this.dialog.showModal();
  }
}
