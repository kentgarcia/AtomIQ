/**
 * Contrast regression for interactive option states (spec §4.5):
 * Schrodi/Guide options + intent pills + the shared Read Aloud button fills,
 * in light and dark, for every interaction state.
 *
 * Run: npm run test:contrast
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { themes } = loadTs("theme/themes.ts");
const { AA_LARGE, AA_TEXT, contrastRatio, pickReadableText } = loadTs("theme/contrast.ts");
const { getIntentPillColors, getOptionColors } = loadTs("theme/option-states.ts");

const STATES = ["idle", "pressed", "selected", "disabled"];

for (const mode of ["light", "dark"]) {
  const colors = themes[mode].colors;

  for (const state of STATES) {
    test(`${mode}: option label/icon contrast — ${state}`, () => {
      const o = getOptionColors(colors, state);
      const min = state === "disabled" ? AA_LARGE : AA_TEXT;
      const label = contrastRatio(o.text, o.background);
      const icon = contrastRatio(o.icon, o.background);
      assert.ok(label >= min, `${mode}/${state} label ${label.toFixed(2)} < ${min}`);
      assert.ok(icon >= Math.min(min, AA_TEXT), `${mode}/${state} icon ${icon.toFixed(2)}`);
    });
  }

  test(`${mode}: selected option is distinguishable from idle without colour`, () => {
    const idle = getOptionColors(colors, "idle");
    const selected = getOptionColors(colors, "selected");
    assert.equal(selected.showCheck, true);
    assert.equal(idle.showCheck, false);
    assert.ok(selected.borderWidth > idle.borderWidth);
  });

  test(`${mode}: selected border is visible against the card surface (>= 3:1)`, () => {
    const selected = getOptionColors(colors, "selected");
    assert.ok(contrastRatio(selected.border, colors.card) >= AA_LARGE);
  });

  for (const pressed of [false, true]) {
    test(`${mode}: intent pill contrast — pressed=${pressed}`, () => {
      const o = getIntentPillColors(colors, pressed);
      assert.ok(contrastRatio(o.text, o.background) >= AA_TEXT);
      assert.ok(contrastRatio(o.icon, o.background) >= AA_TEXT);
    });
  }

  test(`${mode}: Read Aloud active fill keeps a readable glyph for every accent in use`, () => {
    const accents = [
      colors.primary, colors.gold, colors.success, colors.error, colors.link,
      "#8B5CF6", "#FF8C00",
    ];
    for (const accent of accents) {
      const fg = pickReadableText(accent, [colors.onPrimary, colors.text, "#000000", "#FFFFFF"]);
      assert.ok(
        contrastRatio(fg, accent) >= AA_LARGE,
        `${mode}: glyph on ${accent} is ${contrastRatio(fg, accent).toFixed(2)}`,
      );
    }
  });
}

test("the reported failure is real and fixed: white on #FF8C00 fails, new selected state passes", () => {
  assert.ok(contrastRatio("#FFFFFF", "#FF8C00") < AA_TEXT);
  for (const mode of ["light", "dark"]) {
    const o = getOptionColors(themes[mode].colors, "selected");
    assert.ok(contrastRatio(o.text, o.background) >= AA_TEXT);
  }
});
