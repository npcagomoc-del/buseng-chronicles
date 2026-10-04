import "./intro.css";
import { drawCreditRiceMan } from "./credit-rice-man";
import type { Sound, SpeechCue } from "./sound";

type IntroOptions = {
  readonly muted: boolean;
  readonly reducedMotion: boolean;
  readonly onComplete: () => void;
  readonly onMutedChange: (muted: boolean) => void;
};

export class StartupIntro {
  private readonly root = document.createElement("section");
  private readonly canvas = document.createElement("canvas");
  private readonly heading = document.createElement("h2");
  private readonly caption = document.createElement("p");
  private readonly enter = document.createElement("button");
  private readonly mute = document.createElement("button");
  private readonly siblings: readonly { readonly node: HTMLElement; readonly inert: boolean }[];
  private timer = 0;
  private frame = 0;
  private running = false;
  private finished = false;
  private credit = false;
  private creditStarted = 0;
  private muted: boolean;
  private cue: SpeechCue | null = null;
  private expression = 0;
  private lastPose = 0;
  get active(): boolean {
    return !this.finished;
  }

  constructor(
    stage: HTMLElement,
    private readonly actors: HTMLImageElement,
    private readonly sound: Sound,
    private readonly options: IntroOptions,
    private readonly riceMan: HTMLImageElement,
  ) {
    this.muted = options.muted;
    this.siblings = Array.from(stage.children)
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => ({ node, inert: node.inert }));
    for (const { node } of this.siblings) node.inert = true;
    this.root.className = "startup-intro";
    this.root.setAttribute("aria-label", "Buseng Chronicles introduction");
    this.root.dataset["reduced"] = String(options.reducedMotion);
    const top = document.createElement("div");
    top.className = "intro-top";
    const skip = document.createElement("button");
    skip.type = "button";
    skip.textContent = "SKIP";
    skip.onclick = () => this.skip();
    top.append(skip);
    this.heading.className = "intro-title";
    this.heading.innerHTML = "BUSENG<span>CHRONICLES</span>";
    this.canvas.width = 720;
    this.canvas.height = 680;
    this.canvas.className = "intro-portrait";
    this.canvas.setAttribute("aria-hidden", "true");
    this.caption.className = "intro-caption";
    this.caption.textContent = "Walang kanen, Buseng!";
    this.caption.setAttribute("aria-live", "polite");
    const bottom = document.createElement("div");
    bottom.className = "intro-bottom";
    this.enter.type = "button";
    this.enter.className = "intro-enter";
    this.enter.textContent = "ENTER";
    this.enter.onclick = () => {
      void this.start();
    };
    this.mute.type = "button";
    this.mute.className = "intro-mute";
    this.mute.onclick = () => this.setMuted(!this.muted);
    this.muteLabel();
    bottom.append(this.enter, this.mute);
    this.root.append(top, this.heading, this.canvas, this.caption, bottom);
    this.root.addEventListener("pointerdown", (event) => event.stopPropagation());
    this.root.addEventListener("pointerup", (event) => event.stopPropagation());
    this.root.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Escape") this.skip();
      if (event.key === "Tab") {
        const buttons = Array.from(this.root.querySelectorAll("button")).filter(
          (button) => !button.hidden,
        );
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
    stage.append(this.root);
    this.enter.focus({ preventScroll: true });
    this.draw(0);
  }

  async start(): Promise<void> {
    if (this.running || this.finished) return;
    this.running = true;
    this.enter.hidden = true;
    this.mute.focus({ preventScroll: true });
    this.root.classList.add("is-playing");
    const unlocked = this.sound.unlock();
    const audio = await Promise.allSettled([this.sound.ready, unlocked]);
    if (this.finished) return;
    const available = audio.every((result) => result.status === "fulfilled");
    this.line("walang", "Walang kanen, Buseng!", 2.5, available, () => {
      this.line("hayop", "Hayop na yan!", 1.5, available, () => this.showCredit());
    });
  }

  setMuted(muted: boolean): void {
    if (this.finished) return;
    this.muted = muted;
    this.sound.setEnabled(!muted);
    if (muted) this.stopVoice();
    this.muteLabel();
    this.options.onMutedChange(muted);
  }

  skip(): void {
    if (this.finished) return;
    this.dispose();
    this.options.onComplete();
  }

  dispose(): void {
    if (this.finished) return;
    this.finished = true;
    window.clearTimeout(this.timer);
    cancelAnimationFrame(this.frame);
    this.stopVoice();
    this.root.remove();
    for (const { node, inert } of this.siblings) node.inert = inert;
  }

  private muteLabel(): void {
    this.mute.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>${this.muted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
    this.mute.setAttribute("aria-pressed", String(this.muted));
    this.mute.setAttribute("aria-label", this.muted ? "Unmute introduction" : "Mute introduction");
  }

  private stopVoice(): void {
    if (this.cue) this.sound.stop(this.cue);
    this.cue = null;
  }

  private line(
    cue: SpeechCue,
    caption: string,
    fallback: number,
    available: boolean,
    next: () => void,
  ): void {
    if (this.finished) return;
    this.caption.textContent = caption;
    this.cue = available && !this.muted ? cue : null;
    const duration = this.cue ? this.sound.play(this.cue) || fallback : fallback;
    this.timer = window.setTimeout(
      () => {
        this.stopVoice();
        if (!this.finished) next();
      },
      duration * 1000 + 250,
    );
  }

  private showCredit(): void {
    this.credit = true;
    this.creditStarted = performance.now();
    this.canvas.height = 520;
    this.root.classList.add("is-credit");
    this.heading.innerHTML = "<span>Developed by</span>NPC";
    this.caption.textContent = "BUSENG CHRONICLES";
    this.timer = window.setTimeout(() => this.skip(), 3000);
  }

  private draw = (time: number): void => {
    if (this.finished) return;
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, 360, 340);
      if (time - this.lastPose >= 200) {
        this.expression = this.cue && !this.muted && this.sound.speechLevel > 0.035 ? 2 : 0;
        this.lastPose = time;
      }
      const sourceX = this.expression * 512 + ([60, 35, 18][this.expression] ?? 60) + 75;
      if (this.credit) {
        ctx.drawImage(this.actors, 135, 0, 280, 300, 204, 64, 148, 159);
        drawCreditRiceMan(ctx, this.riceMan, time - this.creditStarted, this.options.reducedMotion);
      } else {
        ctx.drawImage(this.actors, sourceX, 0, 280, 300, 40, 12, 280, 300);
      }
      if (this.running && !this.credit) {
        ctx.fillStyle = "#87dafa";
        ctx.strokeStyle = "#fffced";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const progress = this.options.reducedMotion ? 0.35 : (time / 850 + i / 6) % 1;
          const x = 180 + (i % 2 ? 1 : -1) * (110 + progress * 36);
          const y = 112 + (i % 3) * 28 + progress * progress * 55;
          ctx.beginPath();
          ctx.ellipse(x, y, 3, 7, i % 2 ? -0.5 : 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
