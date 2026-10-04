import { expect, it } from "bun:test";
import { slapHeadOffset, slapPose } from "../src/slap-effect";

it("reaches the cheek exactly at the scheduled slap impact", () => {
  const before = slapPose(0.65, false);
  const impact = slapPose(0.53, false);
  expect(before.reach).toBe(0);
  expect(before.impact).toBe(0);
  expect(impact.reach).toBeCloseTo(1);
  expect(impact.impact).toBeGreaterThan(0.9);
});
it("recovers the hand and head before the reaction finishes", () => {
  const recovered = slapPose(0, false);
  expect(recovered.reach).toBe(0);
  expect(recovered.impact).toBe(0);
});
it("never moves the neck or catch plate during the head recoil", () => {
  expect(slapHeadOffset(270, 0.53, 1, false)).toBe(0);
  expect(slapHeadOffset(345, 0.53, -1, false)).toBe(0);
  expect(slapHeadOffset(140, 0.53, 1, false)).toBeLessThan(0);
});
it("reduces the reaction to static contact without head movement", () => {
  expect(slapPose(0.53, true).reach).toBe(1);
  expect(slapHeadOffset(140, 0.53, 1, true)).toBe(0);
});
