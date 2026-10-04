/** Flaming follow-through begins after release, leaving the launch palm unchanged. */
export function arcadeThrowHop(age: number, flaming: boolean, reduced: boolean): number {
  if (!flaming || reduced || age <= 0.06 || age >= 0.5) return 0;
  const progress = (age - 0.06) / 0.44;
  return -Math.sin(progress * Math.PI) * 24;
}
