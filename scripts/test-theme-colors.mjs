#!/usr/bin/env node
/**
 * Runtime theme tests.
 *
 * Loads the TypeScript theme modules in Node with a lightweight transpile
 * hook, then proves that:
 *   - light and dark themes expose every required semantic role;
 *   - mode-dependent roles actually differ between modes;
 *   - style factories built with `createStyles` recompute per theme;
 *   - `withAlpha` derives from the resolved mode-aware base.
 *
 * Run: npm run test:theme
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import ts from "typescript";

const ROOT = process.cwd();

/* ------------------------------------------------------------------ */
/* TypeScript require hook                                            */
/* ------------------------------------------------------------------ */

Module._extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

/* react-native is not importable in plain Node; `createStyles` only needs a
   pass-through StyleSheet for assertions. */
const reactNativeStub = {
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
  Platform: { OS: "node", select: (values) => values.default ?? values.ios },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "react-native") return reactNativeStub;
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
const { themes, withAlpha } = require(path.join(ROOT, "theme/themes.ts"));
const { createStyles } = require(path.join(ROOT, "theme/createStyles.ts"));

/* ------------------------------------------------------------------ */
/* Expectations                                                       */
/* ------------------------------------------------------------------ */

const REQUIRED_ROLES = [
  "background",
  "surface",
  "surfaceRaised",
  "surfaceStrong",
  "surfaceSoft",
  "card",
  "input",
  "primary",
  "primaryDark",
  "primaryLight",
  "border",
  "borderStrong",
  "borderSubtle",
  "text",
  "textSecondary",
  "textMuted",
  "textFaint",
  "link",
  "success",
  "warning",
  "error",
  "info",
  "gold",
  "danger",
  "disabled",
  "disabledText",
  "overlay",
  "shadow",
  "ring",
  "tint",
  "icon",
  "inverseSurface",
  "inverseText",
  "switchTrack",
  "creamTint",
  "creamBorder",
  "amberSurface",
  "amberSurfaceStrong",
  "amberText",
  "amberBorder",
  "pageGradientTop",
  "pageGradientBottom",
  "successSurface",
  "warningSurface",
  "errorSurface",
  "infoSurface",
];

const MODE_DEPENDENT_ROLES = [
  "background",
  "surface",
  "surfaceRaised",
  "surfaceStrong",
  "surfaceSoft",
  "card",
  "input",
  "border",
  "borderStrong",
  "text",
  "textSecondary",
  "textFaint",
  "inverseSurface",
  "inverseText",
  "creamTint",
  "amberSurface",
  "pageGradientTop",
  "pageGradientBottom",
];

const FEATURE_PALETTES = [
  "tab",
  "library",
  "entry",
  "lesson",
  "quiz",
  "article",
  "explorer",
  "settings",
  "maze",
  "mazeGame",
  "map",
  "onboarding",
  "achievements",
  "tabBar",
  "legacy",
  "ui",
  "amber",
];

const isHexOrRgb = (value) =>
  typeof value === "string" &&
  (/^#(?:[0-9a-f]{3,8})$/i.test(value) || /^rgba?\(/i.test(value));

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

test("light and dark themes exist with stable modes", () => {
  assert.equal(themes.light.mode, "light");
  assert.equal(themes.dark.mode, "dark");
});

test("every semantic role exists in both modes", () => {
  for (const mode of ["light", "dark"]) {
    const colors = themes[mode].colors;
    for (const role of REQUIRED_ROLES) {
      assert.ok(role in colors, `${mode}.colors.${role} is missing`);
      assert.ok(
        isHexOrRgb(colors[role]),
        `${mode}.colors.${role} must resolve to a color, got ${String(colors[role])}`,
      );
    }
  }

  assert.deepEqual(
    Object.keys(themes.light.colors).sort(),
    Object.keys(themes.dark.colors).sort(),
    "light and dark semantic role sets must match",
  );
});

test("mode-dependent semantic roles differ between light and dark", () => {
  for (const role of MODE_DEPENDENT_ROLES) {
    assert.notEqual(
      themes.light.colors[role],
      themes.dark.colors[role],
      `${role} must change between modes`,
    );
  }
});

test("every feature palette is present in both modes", () => {
  for (const palette of FEATURE_PALETTES) {
    assert.ok(themes.light.palettes[palette], `light.palettes.${palette} is missing`);
    assert.ok(themes.dark.palettes[palette], `dark.palettes.${palette} is missing`);
  }
});

test("shared ui/amber palettes change with the theme", () => {
  const lightUi = themes.light.palettes.ui;
  const darkUi = themes.dark.palettes.ui;

  for (const key of ["background", "card", "raised", "strong", "border", "text", "creamTint"]) {
    assert.notEqual(lightUi[key], darkUi[key], `palettes.ui.${key} must change between modes`);
  }

  assert.notEqual(
    themes.light.palettes.amber.header,
    themes.dark.palettes.amber.header,
    "palettes.amber.header must change between modes",
  );
});

test("createStyles factories recompute surface/text/border per theme", () => {
  const makeStyles = createStyles((theme) => ({
    surface: {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
    },
    body: {
      color: theme.colors.text,
    },
  }));

  const light = makeStyles(themes.light);
  const dark = makeStyles(themes.dark);

  assert.notEqual(light.surface.backgroundColor, dark.surface.backgroundColor);
  assert.notEqual(light.surface.borderColor, dark.surface.borderColor);
  assert.notEqual(light.body.color, dark.body.color);

  // A factory should always reflect the theme it is given, not a captured one.
  assert.equal(light.surface.backgroundColor, themes.light.colors.card);
  assert.equal(dark.surface.backgroundColor, themes.dark.colors.card);
});

test("feature palette factories switch surfaces as well", () => {
  const makeStyles = createStyles((theme) => ({
    card: { backgroundColor: theme.palettes.ui.card },
    lesson: { backgroundColor: theme.palettes.lesson.card },
    amber: { backgroundColor: theme.palettes.amber.header },
    myth: { backgroundColor: theme.myth.card },
    lab: { backgroundColor: theme.lab.card },
  }));

  const light = makeStyles(themes.light);
  const dark = makeStyles(themes.dark);

  assert.notEqual(light.card.backgroundColor, dark.card.backgroundColor);
  assert.notEqual(light.lesson.backgroundColor, dark.lesson.backgroundColor);
  assert.notEqual(light.amber.backgroundColor, dark.amber.backgroundColor);
  assert.notEqual(light.myth.backgroundColor, dark.myth.backgroundColor);
  assert.notEqual(light.lab.backgroundColor, dark.lab.backgroundColor);
});

test("withAlpha derives from resolved mode-aware bases", () => {
  for (const role of ["text", "card", "border", "surfaceSoft"]) {
    const light = withAlpha(themes.light.colors[role], 0.1);
    const dark = withAlpha(themes.dark.colors[role], 0.5);
    assert.match(light, /^#[0-9a-f]{8}$/i);
    assert.match(dark, /^#[0-9a-f]{8}$/i);
    assert.notEqual(
      withAlpha(themes.light.colors[role], 0.5),
      withAlpha(themes.dark.colors[role], 0.5),
      `withAlpha(${role}) must change between modes`,
    );
  }
});
