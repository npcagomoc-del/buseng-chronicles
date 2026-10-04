import { expect, it } from "bun:test";
import { arcadeThrowHop } from "../src/throw-motion";

it("keeps the hand at release then gives flaming throws a visible hop", () => {
  expect(arcadeThrowHop(0, true, false)).toBe(0);
  expect(arcadeThrowHop(0.06, true, false)).toBe(0);
  expect(arcadeThrowHop(0.28, true, false)).toBeCloseTo(-24);
  expect(arcadeThrowHop(0.5, true, false)).toBe(0);
});
it("keeps normal and reduced-motion throws grounded", () => {
  expect(arcadeThrowHop(0.28, false, false)).toBe(0);
  expect(arcadeThrowHop(0.28, true, true)).toBe(0);
});
