import { beginSlap, resetReactions, updateReactions } from "./buseng-behavior";
import type { Event, Phase } from "./game-events";
import type { Flight, Plate, Point } from "./physics";
import {
  catchResult,
  chargePower,
  contact,
  contactSeconds,
  difficulty,
  launch,
  position,
  target,
  WORLD,
} from "./physics";

export type { Cue, Event, Phase } from "./game-events";
export class Game {
  arenaHeight = 800;
  flamingShot = false;
  flameCatchSeconds = 0;
  spicySeconds = 0;
  plateSlamSeconds = 0;
  slapSeconds = 0;
  slapDelaySeconds = 0;
  phase: Phase = "menu";
  score = 0;
  combo = 0;
  power = 0;
  clock = 0;
  age = 0;
  flightAge = 0;
  flight: Flight = launch(0);
  rice: Point | null = null;
  plate: Plate = target(0);
  feedback = "";
  talkSeconds = 0;
  talkLine = "";
  mouthOpen = false;
  landing: Point | null = null;
  teleportLane = 0;
  teleportClock = 0;
  teleportFlash = 0;
  teleportOrigin: Point | null = null;
  teleportWarning = false;
  recordGagSeconds = 0;
  faceRice = false;
  faceHitSeconds = 0;
  riceThrows = 0;
  riceShedSeconds = 0;
  private bestToBeat = Number.POSITIVE_INFINITY;
  private recordCelebrated = false;
  private pausedPhase: Phase = "ready";
  constructor(
    private readonly emit: (event: Event) => void,
    readonly seed = Math.random() * 1000000,
  ) {}
  get level(): number {
    return difficulty(this.score).level;
  }
  get teleportDuration(): number {
    return difficulty(this.score).teleportDuration;
  }
  get teleportInterval(): number {
    return difficulty(this.score).teleportInterval;
  }
  setArenaHeight(height: number): void {
    const next = Math.max(800, Number.isFinite(height) ? height : 800);
    if (
      next === this.arenaHeight ||
      this.phase === "flight" ||
      this.phase === "hit" ||
      this.phase === "paused"
    )
      return;
    this.arenaHeight = next;
    this.plate = target(this.score, this.clock, this.teleportLane, next, this.seed);
  }
  start(bestToBeat = Number.POSITIVE_INFINITY): void {
    resetReactions(this);
    this.score = 0;
    this.flamingShot = false;
    this.clock = 0;
    this.combo = 0;
    this.power = 0;
    this.age = 0;
    this.rice = null;
    this.landing = null;
    this.teleportLane = 0;
    this.teleportClock = 0;
    this.teleportFlash = 0;
    this.teleportOrigin = null;
    this.teleportWarning = false;
    this.bestToBeat = bestToBeat;
    this.recordCelebrated = false;
    this.plate = target(0, 0, 0, this.arenaHeight, this.seed);
    this.feedback = "";
    this.talkSeconds = 0;
    this.talkLine = "";
    this.phase = "ready";
    this.emit({ cue: "retry", score: 0 });
  }
  hold(): void {
    if (this.phase !== "ready") return;
    this.phase = "charging";
    this.power = 0;
    this.age = 0;
    this.emit({ cue: "charge", score: this.score });
  }
  release(heldSeconds?: number): void {
    if (this.phase !== "charging") return;
    if (heldSeconds !== undefined) this.power = chargePower(heldSeconds);
    this.phase = "flight";
    this.age = 0;
    this.flightAge = 0;
    if (this.faceRice && this.riceThrows < 3) {
      this.riceThrows++;
      this.riceShedSeconds = 0.6;
    }
    this.flamingShot = this.combo >= 3;
    this.flight = launch(this.power, this.arenaHeight);
    this.rice = this.flight.origin;
    this.emit({ cue: "throw", score: this.score });
  }
  cancel(): void {
    if (this.phase === "charging") {
      this.phase = "ready";
      this.power = 0;
    }
  }
  pause(): void {
    if (this.phase === "menu" || this.phase === "over" || this.phase === "paused") return;
    this.cancel();
    this.pausedPhase = this.phase;
    this.phase = "paused";
  }
  resume(): void {
    if (this.phase === "paused") this.phase = this.pausedPhase;
  }
  menu(): void {
    this.phase = "menu";
    this.rice = null;
    this.feedback = "";
  }
  update(dt: number): void {
    if (this.phase === "paused") return;
    updateReactions(this, dt, this.emit);
    this.clock += dt;
    this.age += dt;
    switch (this.phase) {
      case "menu":
      case "over":
        return;
      case "ready":
      case "charging": {
        if (this.score >= 10) {
          const interval = this.teleportInterval;
          this.teleportClock += dt;
          this.teleportWarning =
            this.teleportClock >= interval - difficulty(this.score).warningDuration;
          if (this.teleportClock >= interval) {
            this.teleportClock %= interval;
            this.teleportOrigin = { x: this.plate.x, y: this.plate.y };
            this.teleportLane++;
            this.teleportFlash = this.teleportDuration;
            this.teleportWarning = false;
            this.emit({ cue: "teleport", score: this.score });
          }
        }
        this.plate = target(this.score, this.clock, this.teleportLane, this.arenaHeight, this.seed);
        if (this.phase === "charging") this.power = chargePower(this.age);
        return;
      }
      case "flight": {
        this.teleportWarning = false;
        const crossing = contactSeconds(this.flight, this.plate.y);
        const previousAge = this.flightAge;
        this.flightAge += dt;
        this.rice = position(this.flight, this.flightAge);
        if (previousAge < crossing && this.flightAge >= crossing) {
          this.landing = contact(this.flight, this.plate);
          this.resolve(catchResult(this.landing, this.plate));
        } else if (this.rice.x > WORLD.width + 40 || this.rice.y > this.arenaHeight) {
          this.resolve("miss");
        }
        return;
      }
      case "hit":
        if (
          this.age > (this.combo > 0 ? WORLD.perfectSeconds : WORLD.settleSeconds) &&
          this.recordGagSeconds === 0 &&
          this.flameCatchSeconds === 0 &&
          this.slapSeconds === 0 &&
          this.slapDelaySeconds === 0
        ) {
          this.phase = "ready";
          this.power = 0;
          this.rice = null;
          this.teleportWarning = false;
        }
        return;
      default:
        assertNever(this.phase);
    }
  }
  private resolve(result: "hit" | "perfect" | "miss"): void {
    this.age = 0;
    this.rice = null;
    beginSlap(this, result);
    const fedFlamingRice = this.flamingShot && result !== "miss";
    switch (result) {
      case "miss":
        this.combo = 0;
        this.flamingShot = false;
        this.phase = "over";
        this.feedback = "GALIT NA SI BUSENG!";
        this.plateSlamSeconds = WORLD.plateSlamSeconds;
        this.emit({ cue: "miss", score: this.score });
        this.emit({ cue: "plate-slam", score: this.score });
        return;
      case "perfect":
        this.combo++;
        this.feedback = this.combo > 1 ? `PERFECT! ×${this.combo}` : "PERFECT!";
        break;
      case "hit":
        this.flamingShot = false;
        this.combo = 0;
        this.feedback = "+1 · BUSOG!";
        break;
      default:
        assertNever(result);
    }
    this.score++;
    this.phase = "hit";
    this.emit({ cue: result, score: this.score });
    if (fedFlamingRice) {
      this.flameCatchSeconds = WORLD.flameCatchSeconds;
      this.emit({ cue: "flame-feed", score: this.score });
    }
    if (!this.recordCelebrated && this.score > this.bestToBeat) {
      this.recordCelebrated = true;
      this.recordGagSeconds = WORLD.recordGagSeconds;
    }
  }
}
export function assertNever(value: never): never {
  throw new TypeError(`Unknown game state: ${value}`);
}
