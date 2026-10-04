import { z } from "zod";

const record = z.object({
  best: z.number().int().min(0).max(1000000),
  muted: z.boolean(),
  motion: z.enum(["system", "full", "reduced"]).default("system"),
  musicVolume: z.number().min(0).max(1).default(1),
  fxVolume: z.number().min(0).max(1).default(1),
  character: z.enum(["riceman", "tahp"]).default("riceman"),
});
export type Preferences = z.infer<typeof record>;
export type PlayerCharacter = Preferences["character"];
const defaults = (): Preferences => ({
  best: 0,
  muted: false,
  motion: "system",
  musicVolume: 1,
  fxVolume: 1,
  character: "riceman",
});
export function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem("buseng-chronicles-v1");
    const parsed = record.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : defaults();
  } catch (error) {
    if (error instanceof DOMException || error instanceof SyntaxError) return defaults();
    throw error;
  }
}
export function savePreferences(preferences: Preferences): boolean {
  try {
    localStorage.setItem("buseng-chronicles-v1", JSON.stringify(preferences));
    return true;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}
