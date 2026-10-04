export type SpeechCue = "voice" | "hoy" | "walang" | "walangShort" | "hayop" | "tahp";
export const SPEECH: readonly SpeechCue[] = [
  "voice",
  "hoy",
  "walang",
  "walangShort",
  "hayop",
  "tahp",
];
export function isSpeech(cue: string): cue is SpeechCue {
  return SPEECH.some((line) => line === cue);
}
export const FILES = {
  charge: "01-charge",
  throw: "02-rice-throw",
  hit: "03-plate-hit",
  perfect: "04-perfect-shot",
  miss: "05-miss",
  retry: "06-retry",
  voice: "07-bosseng-hoy",
  hoy: "buseng-hoy-short",
  walang: "buseng-walang-kanen",
  walangShort: "buseng-walang-kanen-short",
  hayop: "buseng-hayop",
  teleport: "buseng-teleport",
  music: "bosseng-bgm-preview",
  tahp: "tahp-stop-reply",
} as const;
export function speechEnergy(buffer: AudioBuffer | undefined, seconds: number): number {
  if (!buffer) return 0;
  const channel = buffer.getChannelData(0);
  const offset = Math.max(0, Math.floor(seconds * buffer.sampleRate));
  const end = Math.min(channel.length, offset + Math.floor(buffer.sampleRate * 0.035));
  let sum = 0;
  let count = 0;
  for (let sample = offset; sample < end; sample += 32) {
    const value = channel[sample] ?? 0;
    sum += value * value;
    count++;
  }
  return count > 0 ? Math.sqrt(sum / count) : 0;
}
