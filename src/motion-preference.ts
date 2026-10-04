export type MotionPreference = "system" | "full" | "reduced";
export function reducedMotion(choice: MotionPreference, system: boolean): boolean {
  return choice === "system" ? system : choice === "reduced";
}
