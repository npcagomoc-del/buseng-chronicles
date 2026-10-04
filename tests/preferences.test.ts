import { expect, test } from "bun:test";
import { reducedMotion } from "../src/motion-preference";
import { readPreferences, savePreferences } from "../src/storage";

test("explicit full motion overrides system reduction, while system respects it", () => {
  expect(reducedMotion("full", true)).toBe(false);
  expect(reducedMotion("reduced", false)).toBe(true);
  for (const system of [false, true]) expect(reducedMotion("system", system)).toBe(system);
});

function withStorage(run: (store: Storage) => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  const store: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: store });
  try {
    run(store);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("legacy best and mute migrate; reset keeps motion, volume and character", () => {
  withStorage((store) => {
    store.setItem("buseng-chronicles-v1", JSON.stringify({ best: 72, muted: true }));
    const prefs = readPreferences();
    expect(prefs).toEqual({
      best: 72,
      muted: true,
      motion: "system",
      musicVolume: 1,
      fxVolume: 1,
      character: "riceman",
    });
    prefs.motion = "full";
    prefs.musicVolume = 0.25;
    prefs.fxVolume = 0.8;
    prefs.character = "tahp";
    prefs.best = 0;
    expect(savePreferences(prefs)).toBe(true);
    expect(readPreferences()).toEqual({
      best: 0,
      muted: true,
      motion: "full",
      musicVolume: 0.25,
      fxVolume: 0.8,
      character: "tahp",
    });
  });
});

test("v018 saves retain full motion when new controls default", () => {
  withStorage((store) => {
    store.setItem(
      "buseng-chronicles-v1",
      JSON.stringify({ best: 16, muted: false, motion: "full" }),
    );
    expect(readPreferences()).toEqual({
      best: 16,
      muted: false,
      motion: "full",
      musicVolume: 1,
      fxVolume: 1,
      character: "riceman",
    });
  });
});

test("volume endpoints and silent levels persist independently from mute", () => {
  withStorage(() => {
    const prefs = readPreferences();
    prefs.musicVolume = 0;
    prefs.fxVolume = 1;
    expect(savePreferences(prefs)).toBe(true);
    expect(readPreferences()).toEqual(prefs);
    prefs.musicVolume = 1;
    prefs.fxVolume = 0;
    prefs.muted = true;
    expect(savePreferences(prefs)).toBe(true);
    expect(readPreferences()).toEqual(prefs);
  });
});

test("invalid persisted volume, character and malformed JSON use safe defaults", () => {
  withStorage((store) => {
    const defaults = readPreferences();
    const invalid: readonly Record<string, unknown>[] = [
      { musicVolume: -0.01 },
      { musicVolume: 1.01 },
      { fxVolume: -1 },
      { fxVolume: 2 },
      { musicVolume: "0.5" },
      { fxVolume: null },
      { character: "buseng" },
    ];
    for (const fields of invalid) {
      store.setItem("buseng-chronicles-v1", JSON.stringify({ ...defaults, best: 12, ...fields }));
      expect(readPreferences()).toEqual(defaults);
    }
    store.setItem("buseng-chronicles-v1", "{");
    expect(readPreferences()).toEqual(defaults);
  });
});
