export type FireCue = "ignition" | "firethrow" | "flame-feed" | "spicy" | "plate-slam" | "slap";
const PROFILES = {
  slap: { duration: 0.24, tone: 1250, end: 420, noise: 0.15, level: 0.105 },
  ignition: { duration: 0.66, tone: 110, end: 650, noise: 0.22, level: 0.3 },
  firethrow: { duration: 0.32, tone: 180, end: 75, noise: 0.36, level: 0.25 },
  "flame-feed": { duration: 0.48, tone: 440, end: 880, noise: 0.12, level: 0.3 },
  spicy: { duration: 0.75, tone: 740, end: 160, noise: 0.4, level: 0.18 },
  "plate-slam": { duration: 0.42, tone: 145, end: 45, noise: 0.2, level: 0.36 },
} as const;
export function createFireCues(context: BaseAudioContext): ReadonlyMap<FireCue, AudioBuffer> {
  const entries = Object.entries(PROFILES).map(([cue, profile]) => {
    const impactDelay = cue === "plate-slam" ? 0.43 : 0;
    const buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * (profile.duration + impactDelay)),
      context.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    let noise = 719;
    let phase = 0;
    let previous = 0;
    for (let frame = 0; frame < channel.length; frame++) {
      const elapsed = frame / context.sampleRate;
      const time = elapsed - impactDelay;
      noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
      const raw = noise / 2147483648;
      const crackle = raw - previous * 0.72;
      previous = raw;
      if (time < 0) {
        const lift = elapsed / impactDelay;
        channel[frame] = crackle * 0.045 * Math.sin(Math.PI * lift) ** 2;
        continue;
      }
      const progress = time / profile.duration;
      const frequency = profile.tone * (profile.end / profile.tone) ** progress;
      phase += (2 * Math.PI * frequency) / context.sampleRate;
      if (cue === "slap") {
        const clap = crackle * profile.noise * Math.min(1, time / 0.002) * Math.exp(-time * 100);
        const squeakTime = Math.max(0, time - 0.035);
        const squeak =
          Math.sin(phase + Math.sin(time * 95) * 0.5) *
          profile.level *
          Math.min(1, squeakTime / 0.012) *
          Math.exp(-squeakTime * 18) *
          Math.min(1, (profile.duration - time) / 0.025);
        channel[frame] = clap + squeak;
        continue;
      }
      const envelope = Math.min(1, time / 0.009) * (1 - progress) ** 1.8;
      const ring = cue === "plate-slam" ? Math.sin(phase * 4.73) * Math.exp(-time * 18) * 0.35 : 0;
      channel[frame] = Math.tanh(
        (Math.sin(phase) * profile.level + crackle * profile.noise + ring) * envelope,
      );
    }
    return [cue, buffer] as const;
  });
  const result = new Map<FireCue, AudioBuffer>();
  for (const [cue, buffer] of entries) {
    if (
      cue === "ignition" ||
      cue === "firethrow" ||
      cue === "flame-feed" ||
      cue === "spicy" ||
      cue === "plate-slam" ||
      cue === "slap"
    )
      result.set(cue, buffer);
  }
  return result;
}
