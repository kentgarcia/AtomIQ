#!/usr/bin/env node
/**
 * Tab-bar clearance gate (spec §4.2).
 *
 * Static + computed proof that the floating tab bar can never cover content:
 *  1. every tab screen reserves the bar through useTabBarInset (no magic
 *     numbers) and adds >= the minimum clearance below its last item;
 *  2. the fade behind the bar never takes touches and never reaches higher above the
 *     bar than the clearance floating buttons keep (so it cannot veil them);
 *  3. visibility goes through the inset provider (no navigation params);
 *  4. computed from theme/tab-bar-metrics.ts for phone/tablet viewports and
 *     none/gesture/iPhone/three-button/taskbar insets: tabs >= 48 dp, bar fits,
 *     reserved band < 25% of the window;
 *  5. no `bottom: insets.bottom + <n>` offsets or re-derived bar formula.
 *
 * Run: npm run check:tab-bar
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const failures = [];
const fail = (msg) => failures.push(msg);

/* ---- 1. every tab screen reserves the bar ---------------------------- */
const MIN_CLEARANCE = 16;
const TAB_SCREENS = {
  "app/(tabs)/index.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/community.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/phone.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/profile.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
  "app/(tabs)/quests.tsx": /paddingBottom:\s*tabBarInset\s*\+\s*(\d+)/,
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
if (/LinearGradient/.test(tabLayout)) {
  if (!/<LinearGradient[^>]*pointerEvents="none"/s.test(tabLayout))
    fail('app/(tabs)/_layout.tsx: the fade behind the bar must be pointerEvents="none"');
  const reach = /FADE_ABOVE_BAR\s*=\s*(\d+)/.exec(tabLayout);
  if (!reach) fail("app/(tabs)/_layout.tsx: the fade needs a FADE_ABOVE_BAR constant");
  else if (Number(reach[1]) > MIN_CLEARANCE)
    fail(`app/(tabs)/_layout.tsx: the fade reaches ${reach[1]} dp above the bar, more than the ${MIN_CLEARANCE} dp floating buttons keep clear`);
}
if (!/useTabBarVisible\(\)/.test(tabLayout))
  fail("app/(tabs)/_layout.tsx: bar must read visibility from the inset provider");
if (/hideTabBar/.test(tabLayout) || /hideTabBar/.test(read("app/(tabs)/phone.tsx")))
  fail("hideTabBar navigation params are back — use useHideTabBar()");
const provider = read("components/layout/tab-bar-inset.tsx");
if (!/Keyboard\.addListener/.test(provider))
  fail("tab-bar-inset.tsx: bar must hide while the keyboard is open");

/* ---- 4. computed invariants (resolver is the single source of truth) --- */
const { resolveTabBarMetrics, TAB_BAR_CONSTANTS } = await import(
  pathToFileURL(path.join(ROOT, "theme/tab-bar-metrics.ts")).href
);

// Typical system bottom insets (dp). Three-button is the largest phone inset.
const navigationModes = [
  ["none", 0],
  ["gesture", 24],
  ["iphone-indicator", 34],
  ["three-button", 48],
  ["taskbar", 64],
];
const viewports = [
  ["compact 320x568", 320, 568],
  ["compact 320x640", 320, 640],
  ["short 360x640", 360, 640],
  ["standard 360x800", 360, 800],
  ["iPhone SE 375x667", 375, 667],
  ["iPhone 393x852", 393, 852],
  ["tall 412x915", 412, 915],
  ["large 430x932", 430, 932],
  ["small tablet 600x960", 600, 960],
  ["tablet 800x1280", 800, 1280],
];
let combos = 0;
for (const [vpName, width, height] of viewports) {
  for (const [navName, bottom] of navigationModes) {
    // The taskbar only exists on large screens.
    if (navName === "taskbar" && width < 600) continue;
    combos += 1;
    const m = resolveTabBarMetrics({
      windowWidth: width,
      windowHeight: height,
      insets: { top: 24, bottom, left: 0, right: 0 },
    });
    const label = `${vpName} / ${navName}`;
    const lastItemBottom = m.reservedHeight + MIN_CLEARANCE;
    if (m.tabWidth < TAB_BAR_CONSTANTS.minTabWidth - 0.001)
      fail(`${label}: tab ${m.tabWidth.toFixed(1)} dp < ${TAB_BAR_CONSTANTS.minTabWidth} dp touch target`);
    if (m.barWidth > TAB_BAR_CONSTANTS.maxWidth) fail(`${label}: bar wider than max`);
    if (2 * m.horizontalMargin + m.barWidth > width + 0.001)
      fail(`${label}: bar does not fit the window`);
    if (m.gap !== 0 || m.bottomOffset !== bottom) fail(`${label}: bar is not docked at the inset`);
    if (m.reservedHeight !== m.contentHeight + m.bottomOffset)
      fail(`${label}: reserved height != bar + offset`);
    if (m.reservedHeight >= height * 0.25)
      fail(`${label}: reserved band ${m.reservedHeight} >= 25% of ${height}`);
    if (m.reservedHeight > lastItemBottom) fail(`${label}: the reserved band reaches the last item`);
  }
}

/* ---- 5. no magic bottom offsets / duplicated formula ------------------ */
const walk = (dir) =>
  fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return walk(rel);
    return /\.(tsx?)$/.test(e.name) ? [rel] : [];
  });
for (const file of [...walk("app/(tabs)"), ...walk("components/games")]) {
  const src = read(file);
  if (/bottom:\s*insets\.bottom\s*\+\s*\d+/.test(src))
    fail(`${file}: absolute 'bottom: insets.bottom + <n>' — anchor above the bar with useBottomInset({ tabBar: true, extra })`);
}
for (const file of [...walk("app"), ...walk("components"), ...walk("hooks")]) {
  if (file.endsWith("tab-bar-metrics.ts")) continue;
  if (/layout\.tabBar\.(contentHeight|gap)/.test(read(file)))
    fail(`${file}: re-derives tab bar space — use resolveTabBarMetrics()/useTabBarMetrics()`);
}

if (failures.length) {
  console.error(`check-tab-bar: ${failures.length} problem(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `check-tab-bar: OK — ${Object.keys(TAB_SCREENS).length} screens reserve the bar, ` +
    `${combos} viewport/navigation combinations clear.`,
);
