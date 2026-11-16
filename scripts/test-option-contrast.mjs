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
      "#8B5CF6", "#EA580C",
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

test("the reported failure is real and fixed: white on the old #FF8C00 fails, new selected state passes", () => {
  assert.ok(contrastRatio("#FFFFFF", "#FF8C00") < AA_TEXT);
  for (const mode of ["light", "dark"]) {
    const o = getOptionColors(themes[mode].colors, "selected");
    assert.ok(contrastRatio(o.text, o.background) >= AA_TEXT);
  }
});

const { controls } = loadTs("theme/tokens.ts");

for (const mode of ["light", "dark"]) {
  const c = themes[mode].colors;

  test(`${mode}: orange button face keeps a readable label (>= 3:1 for bold/large)`, () => {
    assert.ok(contrastRatio(c.onPrimary, c.primary) >= AA_LARGE);
  });

  test(`${mode}: orange text roles reach 4.5:1 on neutral surfaces`, () => {
    for (const bg of [c.background, c.card, c.surfaceSoft]) {
      assert.ok(contrastRatio(c.primaryLight, bg) >= AA_TEXT, `primaryLight on ${bg}`);
      assert.ok(contrastRatio(c.link, bg) >= AA_TEXT, `link on ${bg}`);
    }
    assert.ok(contrastRatio(c.primaryLight, c.primarySurface) >= AA_TEXT, "primaryLight on primarySurface");
  });

  test(`${mode}: orange face and selected border are visible on the card (>= 3:1)`, () => {
    assert.ok(contrastRatio(c.primary, c.card) >= AA_LARGE);
    assert.ok(contrastRatio(c.primaryBorder, c.card) >= AA_LARGE);
  });

  test(`${mode}: body and muted text reach 4.5:1 on background and card`, () => {
    for (const bg of [c.background, c.card]) {
      assert.ok(contrastRatio(c.text, bg) >= AA_TEXT);
      assert.ok(contrastRatio(c.textSecondary, bg) >= AA_TEXT);
      assert.ok(contrastRatio(c.textMuted, bg) >= AA_TEXT, `textMuted on ${bg}`);
    }
  });

  test(`${mode}: card border is visible against the page in dark and defined in light`, () => {
    const ratio = contrastRatio(c.border, c.card);
    assert.ok(ratio >= (mode === "dark" ? 1.5 : 1.2), `border ${ratio.toFixed(2)}`);
  });
}

test("control anatomy tokens: 4px lip, 2px border, press travel equals lip", () => {
  assert.equal(controls.lip, 4);
  assert.equal(controls.border, 2);
  assert.equal(controls.pressTravel, controls.lip);
});

// ---- lesson redesign: option skins, run chips, MYTH / FACT buttons ---------
// Several surface roles are translucent, so composite them over what they sit on first.
const parse = (h) => (h.startsWith("rgba") ? h.match(/[\d.]+/g).map(Number) : [...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), 1]);
const over = (fg, bg, alpha) => {
  const [r, g, b, a0] = parse(fg);
  const a = alpha ?? a0;
  const [R, G, B] = parse(bg);
  const mix = (x, y) => Math.round(x * a + y * (1 - a)).toString(16).padStart(2, "0");
  return `#${mix(r, R)}${mix(g, G)}${mix(b, B)}`;
};

for (const mode of ["light", "dark"]) {
  const c = themes[mode].colors;
  const faces = {
    idle: c.surface,
    selected: over(c.primarySurface, c.surface),
    correct: over(c.successSurface, c.surface),
    wrong: over(c.errorSurface, c.surface),
  };
  for (const [state, face] of Object.entries(faces)) {
    test(`${mode}: option label on the ${state} face is readable`, () => {
      assert.ok(contrastRatio(c.text, face) >= AA_TEXT, `${state} ${contrastRatio(c.text, face).toFixed(2)}`);
    });
  }
  test(`${mode}: selected badge letter (onPrimary) is readable on the primary fill`, () => {
    assert.ok(contrastRatio(c.onPrimary, c.primary) >= AA_LARGE);
  });
  // MYTH / FACT are the shared `Button` (destructive / success). Idle, the label is the role colour
  // on the card (FACT uses successDark: the bright green is only 2.1:1 on white). Filled, they keep
  // Button's own `onPrimary` on role pairing, which is the app-wide convention and is not asserted here.
  for (const [name, role] of [["MYTH", c.error], ["FACT", c.successDark]]) {
    test(`${mode}: ${name} idle label (role on card) is readable at large size`, () => {
      assert.ok(contrastRatio(role, c.surface) >= AA_LARGE, `${contrastRatio(role, c.surface).toFixed(2)}`);
    });
  }
  // Run chips: label is the normal text colour on an 18% tint of the hue; gold keeps a text-coloured icon.
  for (const [name, hue, icon] of [["gold", c.gold, c.text], ["info", c.info, c.info]]) {
    test(`${mode}: ${name} run chip label and icon are visible on the tint`, () => {
      const bg = over(hue, c.background, 0.18);
      assert.ok(contrastRatio(c.text, bg) >= AA_TEXT, `label ${contrastRatio(c.text, bg).toFixed(2)}`);
      assert.ok(contrastRatio(icon, bg) >= 1.5, `icon ${contrastRatio(icon, bg).toFixed(2)}`);
    });
  }
}
