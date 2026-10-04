import { afterAll, expect, mock, test } from "bun:test";
import { createFireCues } from "../src/fire-audio";
import { createGameplayLoop } from "../src/game-audio";
import { Sound } from "../src/sound";

class Parameter {
  value = 1;
  setTargetAtTime(value: number): void {
    this.value = value;
  }
}
class Node {
  connections: Node[] = [];
  connect(node: Node): void {
    this.connections.push(node);
  }
  disconnect(): void {
    this.connections = [];
  }
}
class Gain extends Node {
  gain = new Parameter();
}
class Buffer {
  readonly samples: Float32Array;
  readonly duration: number;
  constructor(
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.samples = new Float32Array(length);
    this.duration = length / sampleRate;
  }
  getChannelData(): Float32Array {
    return this.samples;
  }
}
class Source extends Node {
  buffer: Buffer | null = null;
  playbackRate = new Parameter();
  loop = false;
  loopEnd = 0;
  onended: (() => void) | null = null;
  stopped = false;
  start(): void {}
  stop(): void {
    this.stopped = true;
  }
  end(): void {
    this.onended?.();
  }
}
class Context {
  static latest: Context;
  readonly sampleRate = 8000;
  readonly destination = new Node();
  readonly gains: Gain[] = [];
  readonly sources: Source[] = [];
  currentTime = 0;
  constructor() {
    Context.latest = this;
  }
  createGain(): Gain {
    const gain = new Gain();
    this.gains.push(gain);
    return gain;
  }
  createBuffer(_channels: number, frames: number, sampleRate: number): Buffer {
    return new Buffer(frames, sampleRate);
  }
  createBufferSource(): Source {
    const source = new Source();
    this.sources.push(source);
    return source;
  }
  async decodeAudioData(): Promise<Buffer> {
    const buffer = new Buffer(8000, 8000);
    buffer.samples.fill(0.2);
    return buffer;
  }
  async resume(): Promise<void> {}
}
const originalContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: Context });
mock.module("ky", () => ({
  default: { get: () => ({ arrayBuffer: async () => new ArrayBuffer(1) }) },
}));
afterAll(() => {
  if (originalContext) Object.defineProperty(globalThis, "AudioContext", originalContext);
  else Reflect.deleteProperty(globalThis, "AudioContext");
  mock.restore();
});
async function session() {
  const sound = new Sound();
  await sound.ready;
  await sound.unlock();
  sound.setScene("play");
  return { sound, context: Context.latest };
}
test("independent buses retain music zero during speech ducking and heat switch", async () => {
  const { sound, context } = await session();
  sound.setVolumes(0, 0.4);
  sound.play("hayop");
  sound.setHeat(true);
  expect(context.gains[1]?.gain.value).toBe(0.4);
  expect(context.gains[2]?.gain.value).toBe(0);
  sound.setEnabled(false);
  expect(context.gains[0]?.gain.value).toBe(0);
  sound.pause(true);
  sound.setEnabled(true);
  expect(context.gains[0]?.gain.value).toBe(0);
});
test("Tahp replies to natural speech end with separate lipsync and a cooldown", async () => {
  const { sound, context } = await session();
  sound.setCharacter("tahp");
  sound.play("hayop");
  const buseng = context.sources.at(-1);
  expect(sound.tahpActive).toBe(false);
  buseng?.end();
  expect(sound.tahpActive).toBe(true);
  expect(sound.tahpLevel).toBeGreaterThan(0);
  expect(sound.speechLevel).toBe(0);
  context.sources.at(-1)?.end();
  sound.play("hoy");
  context.sources.at(-1)?.end();
  expect(sound.speechActive).toBe(false);
  context.currentTime = 10;
  sound.play("hayop");
  const canceled = context.sources.at(-1);
  sound.pause(true);
  canceled?.end();
  expect(sound.tahpActive).toBe(false);
});
test("Riceman and muted playback never start a Tahp reply", async () => {
  const { sound, context } = await session();
  sound.play("hayop");
  context.sources.at(-1)?.end();
  expect(sound.tahpActive).toBe(false);
  sound.setEnabled(false);
  expect(sound.play("hayop")).toBe(0);
});
test("original fire groove is distinct and generated cues are finite with headroom", () => {
  const context = new AudioContext();
  const normal = createGameplayLoop(context);
  const heat = createGameplayLoop(context, true);
  expect(heat.duration).toBeLessThan(normal.duration);
  expect(heat.getChannelData(0)).not.toEqual(normal.getChannelData(0));
  const cues = createFireCues(context);
  expect(cues.size).toBe(6);
  for (const buffer of [normal, heat, ...cues.values()]) {
    let peak = 0;
    let finite = true;
    for (const sample of buffer.getChannelData(0)) {
      finite &&= Number.isFinite(sample);
      peak = Math.max(peak, Math.abs(sample));
    }
    expect(finite).toBe(true);
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThan(0.99);
  }
});

test("plate slam winds up quietly then impacts at the animation contact time", () => {
  const buffer = createFireCues(new AudioContext()).get("plate-slam");
  expect(buffer).toBeDefined();
  if (!buffer) return;
  expect(buffer.duration).toBeCloseTo(0.85, 3);
  const samples = buffer.getChannelData(0);
  const peakBetween = (start: number, end: number): number => {
    let peak = 0;
    for (
      let index = Math.floor(start * buffer.sampleRate);
      index < end * buffer.sampleRate;
      index++
    ) {
      peak = Math.max(peak, Math.abs(samples[index] ?? 0));
    }
    return peak;
  };
  const windup = peakBetween(0, 0.43);
  expect(windup).toBeGreaterThan(0.01);
  expect(windup).toBeLessThan(0.09);
  expect(peakBetween(0.43, 0.5)).toBeGreaterThan(0.3);
  expect(peakBetween(0.8, 0.85)).toBeLessThan(0.04);
});

test("pause and retry cancel the complete slam including delayed impact", async () => {
  const { sound, context } = await session();
  sound.playFire("plate-slam");
  const pausedSlam = context.sources.at(-1);
  sound.pause(true);
  expect(pausedSlam?.stopped).toBe(true);
  sound.pause(false);
  sound.playFire("plate-slam");
  const retrySlam = context.sources.at(-1);
  sound.clear();
  expect(retrySlam?.stopped).toBe(true);
});

test("slap stays short and quiet with a clap followed by a squeak", () => {
  const buffer = createFireCues(new AudioContext()).get("slap");
  expect(buffer).toBeDefined();
  if (!buffer) return;
  expect(buffer.duration).toBeCloseTo(0.24, 3);
  const samples = buffer.getChannelData(0);
  let peak = 0;
  let squeakEnergy = 0;
  for (let frame = 0; frame < samples.length; frame++) {
    const sample = samples[frame] ?? 0;
    peak = Math.max(peak, Math.abs(sample));
    if (frame > buffer.sampleRate * 0.05 && frame < buffer.sampleRate * 0.13)
      squeakEnergy += sample * sample;
  }
  expect(peak).toBeGreaterThan(0.1);
  expect(peak).toBeLessThan(0.25);
  expect(squeakEnergy).toBeGreaterThan(0.1);
  expect(Math.abs(samples.at(-1) ?? 0)).toBeLessThan(0.001);
});

test("slap coexists with fiery cues through FX bus and obeys cancellation and mute", async () => {
  const { sound, context } = await session();
  sound.setVolumes(1, 0.3);
  sound.playFire("spicy");
  const spicy = context.sources.at(-1);
  sound.playFire("slap");
  const slap = context.sources.at(-1);
  expect(spicy?.stopped).toBe(false);
  expect(slap?.connections[0]?.connections[0]).toBe(context.gains[1]);
  expect(context.gains[1]?.gain.value).toBe(0.3);
  sound.pause(true);
  expect(slap?.stopped).toBe(true);
  sound.pause(false);
  sound.playFire("slap");
  const retried = context.sources.at(-1);
  sound.clear();
  expect(retried?.stopped).toBe(true);
  sound.setEnabled(false);
  const count = context.sources.length;
  sound.playFire("slap");
  expect(context.sources).toHaveLength(count);
});
