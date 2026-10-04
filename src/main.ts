import "./style.css";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Banter } from "./banter";
import { GameControls } from "./game-controls";
import { GameFeedback } from "./game-feedback";
import { StartupIntro } from "./intro";
import { Game } from "./model";
import { reducedMotion } from "./motion-preference";
import { type Art, Renderer } from "./renderer";
import { GameSettings } from "./settings";
import { Sound } from "./sound";
import { readPreferences, savePreferences } from "./storage";
import { element, stage, syncUI, ui } from "./ui";

const mute = element("mute");
const preferences = readPreferences();
const sound = new Sound();
sound.setEnabled(!preferences.muted);
sound.setVolumes(preferences.musicVolume, preferences.fxVolume);
sound.setCharacter(preferences.character);
let audioAvailable = true;
let lastTime = 0;
let renderer: Renderer | null = null;
let ready = false;
let art: Art | null = null;
let intro: StartupIntro | null = null;
const deviceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function refreshMotion(): void {
  if (!art) return;
  const canvas = document.querySelector<HTMLCanvasElement>("#game");
  if (!canvas) throw new TypeError("Missing game canvas");
  const reduced = reducedMotion(preferences.motion, deviceMotion.matches);
  renderer = new Renderer(canvas, art, reduced);
  renderer.setCharacter(preferences.character);
  canvas.setAttribute(
    "aria-label",
    `${preferences.character === "tahp" ? "Tahp Tahp Tahp" : "Rice Man"} throws rice onto Buseng's plate. Hold to charge, release to throw. One miss ends the run.`,
  );
  stage.dataset["motion"] = reduced ? "reduced" : "full";
}
const settings = new GameSettings(preferences, {
  motionChanged: refreshMotion,
  characterChanged: () => {
    sound.setCharacter(preferences.character);
    refreshMotion();
    unlock();
  },
  volumesChanged: () => {
    sound.setVolumes(preferences.musicVolume, preferences.fxVolume);
    unlock();
  },
  soundChanged: () => {
    sound.setEnabled(!preferences.muted);
    muteLabel();
    if (!preferences.muted) unlock();
  },
  resetScore: () => {
    game.score = 0;
    toMenu();
    ui.live.textContent = "Score reset.";
  },
});
element("settings").addEventListener("click", () => settings.open());
deviceMotion.addEventListener("change", () => {
  if (preferences.motion === "system") refreshMotion();
});
const feedback = new GameFeedback(sound, preferences);
const game = new Game((event) => feedback.receive(event, game));
const banter = new Banter(
  (cue) => sound.play(cue),
  Math.random,
  () => !sound.speechActive,
);
function unlock(): void {
  if (!audioAvailable) return;
  void sound.unlock().catch((error: unknown) => {
    if (!(error instanceof Error)) throw error;
    audioAvailable = false;
    ui.live.textContent = "Audio unavailable. You can still play silently.";
  });
}
function sync(): void {
  syncUI(game, preferences);
}
function begin(): void {
  if (!ready || settings.active || intro?.active) return;
  unlock();
  controls.reset();
  sound.setScene("play");
  game.start(preferences.best);
  banter.reset();
  sync();
  element("throw").focus({ preventScroll: true });
}
function toMenu(): void {
  controls.reset();
  sound.setScene("menu");
  game.menu();
  game.talkSeconds = 0;
  game.talkLine = "";
  sync();
  element("start").focus({ preventScroll: true });
}
function pause(): void {
  intro?.skip();
  controls.reset();
  game.pause();
  game.talkSeconds = 0;
  game.talkLine = "";
  sound.pause(true);
  sync();
}
function resume(): void {
  unlock();
  game.resume();
  sound.pause(false);
  sync();
}
function muteLabel(): void {
  mute.setAttribute("aria-pressed", String(preferences.muted));
  mute.setAttribute("aria-label", preferences.muted ? "Unmute sound" : "Mute sound");
}
muteLabel();
const controls = new GameControls(stage, game, {
  unlock,
  begin,
  pause,
  resume,
  stopCharge: () => sound.stop("charge"),
});
stage.addEventListener("pointerdown", (event) => {
  if (intro?.active || game.phase !== "menu" || event.button !== 0) return;
  if (event.target instanceof Element && event.target.closest("button")) return;
  void sound.menuGesture().catch(() => {
    ui.live.textContent = "Audio unavailable. You can still play silently.";
  });
});
for (const id of ["start", "retry"]) element(id).addEventListener("click", begin);
for (const id of ["back", "paused-menu"]) element(id).addEventListener("click", toMenu);
element("pause").addEventListener("click", pause);
element("resume").addEventListener("click", resume);
mute.addEventListener("click", () => {
  unlock();
  preferences.muted = !preferences.muted;
  savePreferences(preferences);
  sound.setEnabled(!preferences.muted);
  intro?.setMuted(preferences.muted);
  muteLabel();
  if (game.phase === "menu")
    void sound.menuGesture().catch(() => {
      audioAvailable = false;
    });
});
window.addEventListener("blur", pause);
if (Capacitor.isNativePlatform()) void App.addListener("pause", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
function image(file: string, extension = "webp"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new TypeError(`Cannot load game art: ${file}`));
    img.src = `${import.meta.env.BASE_URL}assets/art/${file}.${extension}`;
  });
}
void sound.ready.catch((error: unknown) => {
  if (!(error instanceof Error)) throw error;
  audioAvailable = false;
  ui.live.textContent = "Sound unavailable. Silent play is ready.";
});
void Promise.all([
  image("restaurant-v018"),
  image("buseng-gold"),
  image("rice-man-bucket"),
  image("tahp-v019", "png"),
  document.fonts.ready,
])
  .then(([background, actors, riceMan, tahp]) => {
    const canvas = document.querySelector<HTMLCanvasElement>("#game");
    if (!canvas) throw new TypeError("Missing game canvas");
    art = { background, actors, riceMan, tahp };
    refreshMotion();
    ready = true;
    element("loading").hidden = true;
    sync();
    intro = new StartupIntro(
      stage,
      actors,
      sound,
      {
        muted: preferences.muted,
        reducedMotion: reducedMotion(preferences.motion, deviceMotion.matches),
        onComplete: () => {
          sync();
          element("start").focus({ preventScroll: true });
        },
        onMutedChange: (muted) => {
          preferences.muted = muted;
          savePreferences(preferences);
          muteLabel();
        },
      },
      riceMan,
    );
    if (Capacitor.isNativePlatform()) void intro.start();
    requestAnimationFrame(frame);
  })
  .catch((error: unknown) => {
    if (!(error instanceof Error)) throw error;
    element("loading-message").textContent = "Hindi na-load ang kanin. Refresh para subukan ulit.";
    const retry = document.createElement("button");
    retry.className = "comic-button";
    retry.textContent = "RELOAD";
    retry.addEventListener("click", () => window.location.reload());
    element("loading").append(retry);
  });
function frame(now: number): void {
  const dt = Math.min((now - (lastTime || now)) / 1000, 0.04);
  lastTime = now;
  game.update(dt);
  banter.update(dt, game);
  sound.setHeat(
    game.phase !== "menu" &&
      game.phase !== "over" &&
      (game.combo >= 3 || game.flameCatchSeconds > 0),
  );
  renderer?.setTahpReply(sound.tahpActive, sound.tahpLevel > 0.055);
  game.mouthOpen = sound.speechLevel > 0.055;
  renderer?.draw(game);
  sync();
  requestAnimationFrame(frame);
}
