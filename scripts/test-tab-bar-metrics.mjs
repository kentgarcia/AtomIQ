/**
 * Tab bar metrics tests (docs/TAB_BAR_RESPONSIVE_POSITIONING_SPEC.md §4, §7.1).
 *
 * Run: npm run test:tab-bar
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TAB_BAR_CONSTANTS,
  resolveTabBarMetrics,
} from "../theme/tab-bar-metrics.ts";

const resolve = (windowWidth, windowHeight, bottom = 0, extra = {}) =>
  resolveTabBarMetrics({
    windowWidth,
    windowHeight,
    insets: { top: 24, bottom, left: 0, right: 0, ...extra },
  });

describe("tab bar metrics", () => {
  it("keeps every tab at least 48 dp wide down to 320 dp", () => {
    for (let width = 320; width <= 1000; width += 4) {
      const m = resolve(width, 800);
      assert.ok(m.tabWidth >= 48 - 0.001, `${width}: tab ${m.tabWidth}`);
      assert.ok(m.iconSlot <= m.tabWidth, `${width}: icon wider than tab`);
    }
  });

  it("320 dp window: margin shrinks to 30 and tabs are exactly 48 dp", () => {
    const m = resolve(320, 568);
    assert.equal(m.horizontalMargin, 30);
    assert.equal(m.tabWidth, 48);
    assert.equal(m.iconSlot, 48);
  });

  it("keeps the iPhone reference bar unchanged (regular variant, margin 36)", () => {
    for (const [w, h] of [[375, 667], [390, 844], [393, 852], [430, 932]]) {
      const m = resolve(w, h, 34);
      assert.equal(m.variant, "regular", `${w}x${h}`);
      assert.equal(m.horizontalMargin, 36);
      assert.equal(m.contentHeight, 75);
      assert.equal(m.gap, 16);
      assert.equal(m.bottomOffset, 50);
    }
  });

  it("dense variant triggers exactly for width < 360 or height <= 640", () => {
    assert.equal(resolve(359, 800).variant, "dense");
    assert.equal(resolve(360, 800).variant, "regular");
    assert.equal(resolve(360, 640).variant, "dense");
    assert.equal(resolve(360, 641).variant, "regular");
  });

  it("dense bar is 67 dp tall with a 12 dp gap", () => {
    const m = resolve(360, 640, 48);
    assert.equal(m.contentHeight, 67);
    assert.equal(m.gap, 12);
    assert.equal(m.reservedHeight, 67 + 48 + 12);
  });

  it("sits at insets.bottom + gap for every navigation mode", () => {
    for (const bottom of [0, 24, 34, 48, 64]) {
      const m = resolve(412, 915, bottom);
      assert.equal(m.bottomOffset, bottom + m.gap);
      assert.equal(m.reservedHeight, m.contentHeight + m.bottomOffset);
    }
  });

  it("three-button navigation reserves more than gesture", () => {
    assert.ok(
      resolve(360, 800, 48).reservedHeight > resolve(360, 800, 24).reservedHeight,
    );
  });

  it("caps the bar at 520 dp and centres it on tablets", () => {
    const m = resolve(800, 1280, 64);
    assert.equal(m.barWidth, TAB_BAR_CONSTANTS.maxWidth);
    assert.ok(2 * m.horizontalMargin + m.barWidth <= 800);
  });

  it("respects side insets (cutout / side navigation bar)", () => {
    const m = resolve(720, 360, 0, { left: 0, right: 48 });
    assert.ok(m.horizontalMargin >= 48 + TAB_BAR_CONSTANTS.sideInsetGap);
  });

  it("reserved band stays under 25% of the window on all phones", () => {
    for (const [w, h] of [[320, 568], [320, 640], [360, 640], [360, 800], [412, 915]]) {
      for (const bottom of [0, 24, 34, 48]) {
        const m = resolve(w, h, bottom);
        assert.ok(m.reservedHeight < h * 0.25, `${w}x${h}/${bottom}: ${m.reservedHeight}`);
      }
    }
  });

  it("ignores invalid input instead of producing NaN", () => {
    const m = resolveTabBarMetrics({
      windowWidth: NaN,
      windowHeight: 0,
      insets: { bottom: NaN },
    });
    for (const value of Object.values(m)) {
      assert.ok(typeof value === "string" || Number.isFinite(value));
    }
  });
});
