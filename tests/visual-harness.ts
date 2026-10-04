import { Game } from "../src/model";
import { chargePower, contactSeconds, position, target, WORLD } from "../src/physics";
import { Renderer } from "../src/renderer";

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new TypeError(`Missing visual QA element: ${selector}`);
  return found;
}
const canvas = element<HTMLCanvasElement>("#game");
const stage = element<HTMLElement>("#stage");
const status = element<HTMLOutputElement>("#status");

function image(file: string, extension = "webp"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new TypeError(`Cannot load test art: ${file}`));
    img.src = `/assets/art/${file}.${extension}`;
  });
}

const [background, actors, riceMan, tahp] = await Promise.all([
  image("restaurant-v018"),
  image("buseng-gold"),
  image("rice-man-bucket"),
  image("tahp-v019", "png"),
]);
const art = { background, actors, riceMan, tahp };
let character: "riceman" | "tahp" = "riceman";
let reduced = false;
let arenaHeight = 800;
let score = 0;
let mode = "walk";
let time = 0;
let playing = false;
let renderer = new Renderer(canvas, art, reduced);
const game = new Game(() => {}, 123);

function fixture(): void {
  game.start(0);
  game.setArenaHeight(arenaHeight);
  game.score = score;
  game.clock = time + 1;
  game.plate = target(score, game.clock, 0, arenaHeight, game.seed);
  switch (mode) {
    case "tongue":
      game.clock = 2.3 + time;
      break;
    case "charge":
      game.hold();
      game.age = time;
      game.power = chargePower(time);
      break;
    case "flame-ready":
      game.combo = 3;
      break;
    case "flame-charge":
      game.combo = 3;
      game.hold();
      game.age = time;
      game.power = chargePower(time);
      break;
    case "teleport":
      game.score = Math.max(10, score);
      game.teleportLane = 1;
      game.teleportOrigin = target(game.score, 1, 0, arenaHeight, game.seed);
      game.plate = target(game.score, 1, 1, arenaHeight, game.seed);
      game.teleportFlash = Math.max(0, game.teleportDuration - time);
      break;
    case "face":
      game.phase = "hit";
      game.age = time;
      game.recordGagSeconds = Math.max(0, WORLD.recordGagSeconds - time);
      game.faceRice = time >= 0.38;
      game.faceHitSeconds = time < 0.38 ? 0 : Math.max(0, 0.75 - (time - 0.38));
      break;
    case "shed1":
    case "shed2":
    case "shed3":
      game.riceThrows = Number(mode.slice(-1));
      game.riceShedSeconds = Math.max(0, 0.6 - time);
      game.faceRice = game.riceThrows < 3 || game.riceShedSeconds > 0;
      break;
    case "clear":
      game.riceThrows = 3;
      game.faceRice = false;
      break;
    case "over":
      game.phase = "over";
      game.age = time;
      game.faceRice = true;
      game.plateSlamSeconds = Math.max(0, WORLD.plateSlamSeconds - time);
      break;
    case "slap":
      game.phase = "hit";
      game.age = time;
      game.combo = 3;
      game.landing = game.plate;
      game.slapDelaySeconds = Math.max(0, WORLD.slapDelaySeconds - time);
      game.slapSeconds =
        time < WORLD.slapDelaySeconds
          ? 0
          : Math.max(0, WORLD.slapSeconds - time + WORLD.slapDelaySeconds);
      break;
    case "feed":
      game.phase = "hit";
      game.age = time;
      game.combo = 4;
      game.flamingShot = true;
      game.flameCatchSeconds = Math.max(0, WORLD.flameCatchSeconds - time);
      game.slapDelaySeconds = Math.max(0, WORLD.slapDelaySeconds - time);
      game.slapSeconds = Math.max(
        0,
        WORLD.slapSeconds - Math.max(0, time - WORLD.slapDelaySeconds),
      );
      game.spicySeconds =
        time >= WORLD.spicyDelaySeconds
          ? Math.max(0, WORLD.spicySeconds - time + WORLD.spicyDelaySeconds)
          : 0;
      game.landing = game.plate;
      break;
    case "flight":
    case "flame-flight": {
      game.combo = mode === "flame-flight" ? 3 : 0;
      game.hold();
      game.release(WORLD.chargeSeconds * 0.72);
      const elapsed = Math.min(time, contactSeconds(game.flight, game.plate.y));
      game.age = elapsed;
      game.flightAge = elapsed;
      game.rice = position(game.flight, elapsed);
      break;
    }
    case "perfect":
      game.phase = "hit";
      game.age = time;
      game.combo = 3;
      game.landing = game.plate;
      break;
  }
}

function draw(): void {
  fixture();
  renderer.setCharacter(character);
  renderer.setTahpReply(mode === "reply", Math.sin(time * 16) > 0);
  renderer.draw(game);
  status.textContent = `${character} · ${mode} · score ${game.score} · level ${game.level} · ${arenaHeight}px · ${time.toFixed(2)}s · ${reduced ? "reduced" : "full motion"}`;
}
function reset(): void {
  time = 0;
  renderer = new Renderer(canvas, art, reduced);
  draw();
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
  button.addEventListener("click", () => {
    mode = button.dataset["mode"] ?? "walk";
    reset();
  });
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-score]")) {
  button.addEventListener("click", () => {
    score = Number(button.dataset["score"]);
    reset();
  });
}
document.querySelector("#character")?.addEventListener("click", (event) => {
  character = character === "riceman" ? "tahp" : "riceman";
  if (event.currentTarget instanceof HTMLButtonElement)
    event.currentTarget.textContent =
      character === "riceman" ? "Character: Rice Man" : "Character: Tahp";
  reset();
});
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-time]")) {
  button.addEventListener("click", () => {
    playing = false;
    time = Number(button.dataset["time"]);
    draw();
  });
}
document.querySelector("#tall")?.addEventListener("click", (event) => {
  arenaHeight = arenaHeight === 800 ? 1180 : 800;
  stage.style.aspectRatio = `480 / ${arenaHeight}`;
  if (event.currentTarget instanceof HTMLButtonElement)
    event.currentTarget.setAttribute("aria-pressed", String(arenaHeight === 1180));
  reset();
});
document.querySelector("#reduced")?.addEventListener("click", (event) => {
  reduced = !reduced;
  if (event.currentTarget instanceof HTMLButtonElement)
    event.currentTarget.setAttribute("aria-pressed", String(reduced));
  reset();
});
document.querySelector("#step")?.addEventListener("click", () => {
  playing = false;
  time += 0.08;
  draw();
});
document.querySelector("#reset")?.addEventListener("click", reset);
document.querySelector("#animate")?.addEventListener("click", () => {
  playing = !playing;
});
let previous = 0;
function frame(now: number): void {
  if (playing) {
    const duration = mode === "walk" || mode === "tongue" ? 6 : 1.4;
    time += Math.min(0.04, (now - previous) / 1000);
    if (time >= duration) reset();
    else draw();
  }
  previous = now;
  requestAnimationFrame(frame);
}
await document.fonts.ready;
draw();
requestAnimationFrame(frame);
