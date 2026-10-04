type MusicNote = {
  readonly beat: number;
  readonly length: number;
  readonly midi: number;
  readonly level: number;
  readonly bass?: boolean;
};

export function createGameplayLoop(context: BaseAudioContext, heat = false): AudioBuffer {
  const beatTime = 60 / (heat ? 148 : 132);
  const buffer = context.createBuffer(
    1,
    Math.round(context.sampleRate * beatTime * 32),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  const note = ({ beat, length, midi, level, bass = false }: MusicNote): void => {
    const start = Math.round(beat * beatTime * context.sampleRate);
    const duration = length * beatTime;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (let frame = 0; frame < duration * context.sampleRate; frame++) {
      const time = frame / context.sampleRate;
      const phase = time * frequency * 2 * Math.PI;
      const envelope = Math.min(1, time / 0.008) * Math.min(1, (duration - time) / 0.055);
      const tone = bass
        ? Math.sin(phase) + 0.25 * Math.sin(phase * 2)
        : (Math.sin(phase) + 0.3 * Math.sin(phase * 2) + 0.12 * Math.sin(phase * 3)) *
          Math.exp(-time * (heat ? 9 : 5));
      const index = (start + frame) % samples.length;
      samples[index] = (samples[index] ?? 0) + tone * envelope * level;
    }
  };
  const roots = heat ? ([40, 40, 43, 45] as const) : ([45, 41, 48, 43] as const);
  const hook = heat
    ? ([12, 0, 7, 10, 12, 15, 10, 7] as const)
    : ([0, 7, 12, 7, 10, 7, 3, 7] as const);
  for (let bar = 0; bar < 8; bar++) {
    const root = roots[bar % roots.length] ?? 45;
    for (const offset of [0, 0.75, 1.5, 2, 2.75, 3.5]) {
      note({
        beat: bar * 4 + offset,
        length: 0.36,
        midi: root + (offset === 2.75 ? 12 : 0),
        level: 0.27,
        bass: true,
      });
    }
    hook.forEach((interval, step) => {
      const answer = bar >= 4 && step >= 4;
      note({
        beat: bar * 4 + step * 0.5,
        length: step === 7 ? 0.65 : 0.32,
        midi: root + 24 + interval + (answer ? -12 : 0),
        level: 0.12,
      });
      if (step % 2 === 0)
        note({
          beat: bar * 4 + step * 0.5 + 0.25,
          length: 0.3,
          midi: root + 24 + interval,
          level: 0.035,
        });
    });
  }
  let noise = 173;
  for (let step = 0; step < 256; step++) {
    const beat = step / 8;
    const kick = step % 8 === 0 || (heat && step % 32 === 22);
    const clap = step % 16 === 8;
    const hat = step % 4 === 2 || (step >= 240 && step % 2 === 0);
    if (!kick && !clap && !hat) continue;
    const start = Math.round(beat * beatTime * context.sampleRate);
    for (let frame = 0; frame < context.sampleRate * 0.19; frame++) {
      const time = frame / context.sampleRate;
      noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
      const hiss = noise / 2147483648;
      const attack = Math.min(1, time / 0.0015);
      const thump = kick
        ? Math.sin(2 * Math.PI * (48 * time + 95 * 0.025 * (1 - Math.exp(-time / 0.025)))) *
          Math.exp(-time * 25) *
          0.43
        : 0;
      const snare = clap ? hiss * Math.exp(-time * 35) * 0.16 : 0;
      const tick = hat ? hiss * Math.exp(-time * 110) * 0.075 : 0;
      const index = (start + frame) % samples.length;
      samples[index] = (samples[index] ?? 0) + (thump + snare + tick) * attack;
    }
  }
  for (let frame = 0; frame < samples.length; frame++) {
    samples[frame] = Math.tanh((samples[frame] ?? 0) * 1.25) * 0.85;
  }
  return buffer;
}

export function createDefeatLoop(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 4), context.sampleRate);
  const samples = buffer.getChannelData(0);
  const notes = [392, 369.99, 349.23, 261.63] as const;
  notes.forEach((frequency, note) => {
    const start = note * 0.45;
    const duration = note === 3 ? 0.95 : 0.37;
    const count = Math.floor(duration * context.sampleRate);
    let phase = 0;
    for (let frame = 0; frame < count; frame++) {
      const time = frame / context.sampleRate;
      const progress = time / duration;
      const slide = note === 3 ? 1 - 0.25 * progress : 1;
      phase += (2 * Math.PI * frequency * slide) / context.sampleRate;
      const envelope = Math.min(1, time / 0.014) * Math.min(1, (duration - time) / 0.09);
      const reed = Math.sin(phase) + 0.2 * Math.sin(phase * 3) + 0.08 * Math.sin(phase * 5);
      const index = Math.floor(start * context.sampleRate) + frame;
      samples[index] = reed * envelope * 0.42 * (1 - progress * 0.35);
    }
  });
  return buffer;
}

export class AudioAccents {
  private active = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer;
  constructor(
    private readonly context: AudioContext,
    private readonly output: AudioNode,
  ) {
    this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.09), context.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  }
  throwRice(power: number): void {
    const strength = Math.max(0, Math.min(1, power));
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.buffer = this.noise;
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(850 + strength * 650, now);
    filter.frequency.exponentialRampToValueAtTime(2800 + strength * 1800, now + 0.075);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1 + strength * 0.025, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    this.track(source, [filter, gain]);
    source.start(now);
    source.stop(now + 0.09);
  }
  record(): void {
    const source = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.type = "triangle";
    source.frequency.setValueAtTime(720, now);
    source.frequency.exponentialRampToValueAtTime(190, now + 0.18);
    source.frequency.exponentialRampToValueAtTime(280, now + 0.29);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.31);
    source.connect(gain);
    gain.connect(this.output);
    this.track(source, [gain]);
    source.start(now);
    source.stop(now + 0.32);
  }
  intro(): void {
    const source = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    source.type = "sine";
    source.frequency.setValueAtTime(523.25, now);
    source.frequency.setValueAtTime(783.99, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    source.connect(gain);
    gain.connect(this.output);
    this.track(source, [gain]);
    source.start(now);
    source.stop(now + 0.19);
  }
  clear(): void {
    for (const source of this.active) source.stop();
    this.active.clear();
  }
  private track(source: AudioScheduledSourceNode, nodes: readonly AudioNode[]): void {
    this.active.add(source);
    source.onended = () => {
      this.active.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  }
}
