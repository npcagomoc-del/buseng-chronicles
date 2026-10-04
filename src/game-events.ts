export type Phase = "menu" | "ready" | "charging" | "flight" | "hit" | "over" | "paused";
export type Cue =
  | "charge"
  | "throw"
  | "hit"
  | "perfect"
  | "miss"
  | "retry"
  | "voice"
  | "teleport"
  | "record"
  | "flame-feed"
  | "spicy"
  | "plate-slam"
  | "slap";
export type Event = { readonly cue: Cue; readonly score: number };
