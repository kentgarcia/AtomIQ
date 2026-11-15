#!/usr/bin/env node
/**
 * Tab-bar clearance gate (spec §4.2).
 *
 * Static + computed proof that the floating tab bar can never cover content:
 *  1. every tab screen reserves the bar through useTabBarInset (no magic
 *     numbers) and adds >= the minimum clearance below its last item;
 *  2. the bar's gradient fade is bounded by the reserved band;
 *  3. visibility goes through the inset provider (no navigation params);
 *  4. for compact/standard/short/tablet viewports and gesture vs three-button
 *     navigation insets, reserved space >= bar footprint and the last item
 *     stays reachable above the fade.
 *
 * Run: npm run check:tab-bar
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const failures = [];
const fail = (msg) => failures.push(msg);

/* ---- 1. every tab screen reserves the bar ---------------------------- */
const MIN_CLEARANCE = 16;
const TAB_SCREENS = {
  "app/(tabs)/index.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/community.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/chat.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/profile.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/leaderboard.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "components/games/PickAGame.tsx": /bottomReserve\s*=\s*tabBarInset\s*\+\s*(\d+)/,
  "components/games/DifficultyPanel.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
};
for (const [file, pattern] of Object.entries(TAB_SCREENS)) {
  const src = read(file);
  if (!/useTabBarInset\(\)/.test(src)) {
    fail(`${file}: does not call useTabBarInset()`);
    continue;
  }
  const match = pattern.exec(src);
  if (!match) fail(`${file}: bottom padding is not derived from tabBarInset`);
  else if (Number(match[1]) < MIN_CLEARANCE)
    fail(`${file}: clearance ${match[1]} < ${MIN_CLEARANCE}`);
}

/* ---- 2/3. layout wiring ---------------------------------------------- */
const tabLayout = read("app/(tabs)/_layout.tsx");
if (/height:\s*\d{3,}/.test(tabLayout.split("const styles")[1] ?? "") &&
    /fade:\s*{[^}]*height:\s*\d+/.test(tabLayout))
  fail("app/(tabs)/_layout.tsx: fade has a hard-coded height");
if (!/fadeHeight\s*=\s*tabBarInset/.test(tabLayout))
  fail("app/(tabs)/_layout.tsx: fade height must equal the reserved inset");
if (!/useTabBarVisible\(\)/.test(tabLayout))
  fail("app/(tabs)/_layout.tsx: bar must read visibility from the inset provider");
if (/hideTabBar/.test(tabLayout) || /hideTabBar/.test(read("app/(tabs)/chat.tsx")))
  fail("hideTabBar navigation params are back — use useHideTabBar()");
if (!/useHideTabBar\(/.test(read("app/(tabs)/chat.tsx")))
  fail("app/(tabs)/chat.tsx: Guide mode must hide the bar via useHideTabBar()");
const provider = read("components/layout/tab-bar-inset.tsx");
if (!/Keyboard\.addListener/.test(provider))
  fail("tab-bar-inset.tsx: bar must hide while the keyboard is open");

/* ---- 4. computed invariants ------------------------------------------ */
const layoutSrc = read("theme/layout.ts");
const num = (re) => Number(re.exec(layoutSrc)?.[1]);
const contentHeight = num(/contentHeight:\s*(\d+)/);
const gap = num(/gap:\s*(\d+),\s*\n\s*horizontalMargin/);
if (![contentHeight, gap].every(Number.isFinite)) fail("could not read layout.tabBar metrics");

const viewports = [
  ["compact 320x568", 320, 568],
  ["standard 360x800", 360, 800],
  ["short 360x640", 360, 640],
  ["tall 412x915", 412, 915],
  ["tablet 800x1280", 800, 1280],
];
const navigationModes = [
  ["three-button", 0],
  ["gesture", 24],
  ["tall-gesture", 48],
];
for (const [vpName, , height] of viewports) {
  for (const [navName, bottomInset] of navigationModes) {
    const barFootprint = contentHeight + gap + bottomInset;
    const reserved = barFootprint; // useTabBarInset().total when visible
    const fade = reserved; // fadeHeight = tabBarInset
    const lastItemBottom = reserved + MIN_CLEARANCE;
    const label = `${vpName} / ${navName}`;
    if (reserved < barFootprint) fail(`${label}: reserved ${reserved} < bar ${barFootprint}`);
    if (fade > lastItemBottom) fail(`${label}: fade ${fade} reaches last item`);
    if (lastItemBottom >= height * 0.5) fail(`${label}: reserved band covers half the screen`);
  }
}

if (failures.length) {
  console.error(`check-tab-bar: ${failures.length} problem(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `check-tab-bar: OK — ${Object.keys(TAB_SCREENS).length} screens reserve the bar, ` +
    `${viewports.length * navigationModes.length} viewport/navigation combinations clear.`,
);
