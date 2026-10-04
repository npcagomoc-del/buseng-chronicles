import { type PlayerCharacter, type Preferences, savePreferences } from "./storage";

type Actions = {
  readonly volumesChanged: () => void;
  readonly characterChanged: () => void;
  readonly saved: (message: string, success: boolean) => void;
};

export function appendPreferenceControls(
  host: HTMLElement,
  preferences: Preferences,
  actions: Actions,
): void {
  const audio = document.createElement("section");
  audio.className = "settings-section settings-volumes";
  audio.setAttribute("aria-labelledby", "settings-volume-title");
  audio.innerHTML = '<h3 id="settings-volume-title">VOLUME</h3>';
  const channels = [
    ["musicVolume", "Background music"],
    ["fxVolume", "Sound effects & voices"],
  ] as const;
  for (const [key, text] of channels) {
    const row = document.createElement("div");
    row.className = "settings-volume";
    const label = document.createElement("label");
    label.htmlFor = `settings-${key}`;
    label.textContent = text;
    const output = document.createElement("output");
    output.setAttribute("for", label.htmlFor);
    const input = document.createElement("input");
    input.type = "range";
    input.id = label.htmlFor;
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = String(Math.round(preferences[key] * 100));
    output.value = `${input.value}%`;
    input.setAttribute("aria-valuetext", output.value);
    input.addEventListener("input", () => {
      preferences[key] = input.valueAsNumber / 100;
      output.value = `${input.value}%`;
      input.setAttribute("aria-valuetext", output.value);
      actions.volumesChanged();
      const saved = savePreferences(preferences);
      actions.saved("Volume setting saved.", saved);
    });
    row.append(label, output, input);
    audio.append(row);
  }

  const characters = document.createElement("fieldset");
  characters.className = "settings-section settings-characters";
  const legend = document.createElement("legend");
  legend.textContent = "THROWER";
  const choices = document.createElement("div");
  choices.className = "settings-character-options";
  const players: readonly (readonly [PlayerCharacter, string, string])[] = [
    ["riceman", "Rice Man", "The original kanin hero"],
    ["tahp", "Tahp Tahp Tahp", "Cebu City stop-hand reply"],
  ];
  for (const [value, title, description] of players) {
    const label = document.createElement("label");
    label.className = "settings-character";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "settings-character";
    radio.value = value;
    radio.checked = preferences.character === value;
    const card = document.createElement("span");
    card.className = "settings-character-card";
    const name = document.createElement("strong");
    name.textContent = title;
    const detail = document.createElement("span");
    detail.textContent = description;
    card.append(name, detail);
    radio.addEventListener("change", () => {
      preferences.character = value;
      const saved = savePreferences(preferences);
      actions.characterChanged();
      actions.saved(`${title} selected.`, saved);
    });
    label.append(radio, card);
    choices.append(label);
  }
  characters.append(legend, choices);
  host.append(audio, characters);
}
