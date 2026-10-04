import { describe, expect, it } from "bun:test";
import { Game } from "../src/model";
import { WORLD } from "../src/physics";
import { feedPose } from "../src/spicy-effect";

describe("flaming rice hand feeding", () => {
  it("meets the mouth at the spicy impact time", () => {
    const game = new Game(() => {});
    game.flameCatchSeconds = WORLD.flameCatchSeconds - WORLD.spicyDelaySeconds;
    const pose = feedPose(game, false);
    expect(pose.reach).toBeCloseTo(1);
    expect(pose.bite).toBe(true);
  });
  it("returns the actor home before the next shot", () => {
    const game = new Game(() => {});
    game.flameCatchSeconds = 0.05;
    const pose = feedPose(game, false);
    expect(pose.reach).toBe(0);
  });
  it("keeps reduced-motion actor anchored while retaining bite timing", () => {
    const game = new Game(() => {});
    game.flameCatchSeconds = 0.7;
    const pose = feedPose(game, true);
    expect(pose.reach).toBe(0);
    expect(pose.bite).toBe(true);
  });
});
