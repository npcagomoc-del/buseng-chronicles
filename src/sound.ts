import ky from "ky";
import { createFireCues, type FireCue } from "./fire-audio";
import { AudioAccents, createDefeatLoop, createGameplayLoop } from "./game-audio";
import type { Cue } from "./model";
import { FILES, isSpeech, SPEECH, type SpeechCue, speechEnergy } from "./sound-assets";

export type { SpeechCue } from "./sound-assets";

type SoundCue = Cue | SpeechCue | FireCue;
export type AudioScene = "menu" | "play" | "over";
export class Sound {
  private context = new AudioContext();
  private buffers = new Map<string, AudioBuffer>();
  private master = this.context.createGain();
  private fxGain = this.context.createGain();
  private musicVolume = 1;
  private heat = false;
  private character: "riceman" | "tahp" = "riceman";
  private replyAt = 0;
  private musicGain = this.context.createGain();
  private musicSource: AudioBufferSourceNode | null = null;
  private voices = new Map<string, AudioBufferSourceNode>();
  private speech: { readonly cue: SpeechCue; readonly start: number } | null = null;
  private enabled = true;
  private paused = false;
  private unlocked = false;
  private scene: AudioScene = "menu";
  private accents = new AudioAccents(this.context, this.fxGain);
  readonly ready: Promise<void>;
  constructor() {
    this.buffers.set("defeat", createDefeatLoop(this.context));
    this.buffers.set("gameplay", createGameplayLoop(this.context));
    this.buffers.set("fire", createGameplayLoop(this.context, true));
    for (const [cue, buffer] of createFireCues(this.context)) this.buffers.set(cue, buffer);
    this.fxGain.connect(this.master);
    this.master.connect(this.context.destination);
    this.master.gain.value = 0.8;
    this.musicGain.connect(this.master);
    this.musicGain.gain.value = 0.18;
    this.ready = Promise.all(
      Object.entries(FILES).map(async ([cue, file]) => {
        const bytes = await ky
          .get(`${import.meta.env.BASE_URL}assets/audio/${file}.mp3`)
          .arrayBuffer();
        this.buffers.set(cue, await this.context.decodeAudioData(bytes));
      }),
    ).then(() => {
      this.music();
    });
  }
  get speechActive(): boolean {
    return this.speech !== null;
  }
  get tahpActive(): boolean {
    return this.speech?.cue === "tahp";
  }
  get tahpLevel(): number {
    return this.tahpActive ? this.energy() : 0;
  }
  get speechLevel(): number {
    return this.tahpActive ? 0 : this.energy();
  }
  private energy(): number {
    return this.speech
      ? speechEnergy(
          this.buffers.get(this.speech.cue),
          this.context.currentTime - this.speech.start,
        )
      : 0;
  }
  setCharacter(character: "riceman" | "tahp"): void {
    this.character = character;
    if (character !== "tahp") this.stop("tahp");
  }
  setVolumes(music: number, fx: number): void {
    this.musicVolume = Number.isFinite(music) ? Math.max(0, Math.min(1, music)) : 1;
    this.fxGain.gain.setTargetAtTime(
      Number.isFinite(fx) ? Math.max(0, Math.min(1, fx)) : 1,
      this.context.currentTime,
      0.03,
    );
    this.duck(this.speech !== null);
  }
  setHeat(heat: boolean): void {
    if (this.heat === heat) return;
    this.heat = heat;
    if (this.scene === "play") {
      this.stopMusic();
      this.music();
    }
    if (heat) this.playFire("ignition");
  }
  playFire(cue: FireCue): void {
    this.play(cue);
  }
  async unlock(): Promise<void> {
    await this.context.resume();
    this.unlocked = true;
    this.music();
  }
  setScene(scene: AudioScene): void {
    this.clear();
    this.heat = false;
    this.stopMusic();
    this.scene = scene;
    this.pause(false);
    this.music();
  }
  async menuGesture(): Promise<void> {
    if (this.scene !== "menu") return;
    this.pause(false);
    await this.unlock();
  }
  throwRice(power: number): void {
    this.stop("charge");
    this.play("throw");
    if (this.heat) this.playFire("firethrow");
    if (this.enabled && !this.paused && this.unlocked) this.accents.throwRice(power);
  }
  teleport(): void {
    this.play("teleport");
  }
  record(): void {
    if (this.enabled && !this.paused && this.unlocked) this.accents.record();
  }
  perfect(combo: number): void {
    this.play("hit");
    this.play("perfect", 1 + Math.min(3, Math.max(0, combo - 1)) * 0.06);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.master.gain.setTargetAtTime(
      enabled && !this.paused ? 0.8 : 0,
      this.context.currentTime,
      0.03,
    );
  }
  pause(paused: boolean): void {
    this.paused = paused;
    this.setEnabled(this.enabled);
    this.stop("charge");
    if (paused) {
      this.clear();
      this.stopMusic();
    } else this.music();
  }
  music(): void {
    if (this.musicSource || !this.unlocked || this.paused) return;
    const tracks = {
      menu: "music",
      play: this.heat ? "fire" : "gameplay",
      over: "defeat",
    } as const;
    const buffer = this.buffers.get(tracks[this.scene]);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = this.scene === "menu" ? Math.min(15, buffer.duration) : buffer.duration;
    source.connect(this.musicGain);
    this.duck(this.speech !== null);
    source.start();
    this.musicSource = source;
  }
  private stopMusic(): void {
    this.musicSource?.stop();
    this.musicSource?.disconnect();
    this.musicSource = null;
  }
  stop(cue: SoundCue): void {
    const source = this.voices.get(cue);
    if (source) {
      source.stop();
      this.voices.delete(cue);
    }
    if (this.speech?.cue === cue) {
      this.speech = null;
      this.duck(false);
    }
  }
  clear(): void {
    this.accents.clear();
    for (const source of this.voices.values()) source.stop();
    this.voices.clear();
    this.speech = null;
    this.duck(false);
  }
  play(cue: SoundCue, rate = 1): number {
    if (!this.enabled || this.paused || !this.unlocked) return 0;
    if (isSpeech(cue)) for (const line of SPEECH) this.stop(line);
    this.stop(cue);
    const buffer = this.buffers.get(cue);
    if (!buffer) return 0;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = isSpeech(cue) ? 1 : Math.max(0.8, Math.min(1.2, rate));
    const gain = this.context.createGain();
    gain.gain.value = isSpeech(cue)
      ? 0.75
      : cue === "teleport"
        ? 0.22 * 0.65
        : cue === "perfect"
          ? 0.38
          : 0.62;
    source.connect(gain);
    gain.connect(this.fxGain);
    this.voices.set(cue, source);
    if (isSpeech(cue)) {
      this.speech = { cue, start: this.context.currentTime };
      this.duck(true);
    }
    source.onended = () => {
      if (this.voices.get(cue) === source) {
        this.voices.delete(cue);
        if (this.speech?.cue === cue) {
          this.speech = null;
          this.duck(false);
          if (
            cue !== "tahp" &&
            isSpeech(cue) &&
            this.character === "tahp" &&
            this.scene === "play" &&
            this.context.currentTime >= this.replyAt
          ) {
            this.replyAt = this.context.currentTime + 8;
            this.play("tahp");
          }
        }
      }
      gain.disconnect();
      source.disconnect();
    };
    source.start();
    return buffer.duration / source.playbackRate.value;
  }
  private duck(active: boolean): void {
    const level = this.scene === "over" ? 0.13 : 0.18;
    this.musicGain.gain.setTargetAtTime(
      (active ? 0.025 : level) * this.musicVolume,
      this.context.currentTime,
      0.06,
    );
  }
}
