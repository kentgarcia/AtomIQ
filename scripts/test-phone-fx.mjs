import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const fx = await import(pathToFileURL(path.resolve("components/phone/phone-fx-core.ts")).href);
const { INSTALL, installFrame } = fx;

test("before the install starts nothing shows", () => {
  const f = installFrame(-5);
  assert.deepEqual(f, { outline: 0, ring: 0, icon: 0, iconOpacity: 0, label: 0, dot: 0 });
});

test("the last frame is the plain icon with its label and dot", () => {
  const f = installFrame(INSTALL.total);
  assert.deepEqual(f, { outline: 0, ring: 0, icon: 1, iconOpacity: 1, label: 1, dot: 1 });
  assert.deepEqual(installFrame(INSTALL.total + 500), f);
});

test("the outline arrives, then the ring fills, and the icon is hidden meanwhile", () => {
  const a = installFrame(INSTALL.outlineEnd);
  assert.equal(a.outline, 1);
  assert.equal(a.ring, 0);
  const mid = installFrame((INSTALL.outlineEnd + INSTALL.ringEnd) / 2);
  assert.ok(mid.ring > 0.4 && mid.ring < 0.6);
  assert.equal(mid.iconOpacity, 0);
  assert.equal(installFrame(INSTALL.popAt - 1).ring > 0.99, true);
});

test("the ring only fills, never empties, until the icon pops in", () => {
  let last = 0;
  for (let t = 0; t < INSTALL.popAt; t += 10) {
    const r = installFrame(t).ring;
    assert.ok(r >= last - 1e-9, `ring went back at ${t}`);
    last = r;
  }
});

test("the icon pops in from 60%, overshoots a little and settles at 100%", () => {
  const start = installFrame(INSTALL.popAt + 1);
  assert.ok(start.icon > 0.55 && start.icon < 0.75);
  let peak = 0;
  for (let t = INSTALL.popAt; t <= INSTALL.popEnd; t += 5) peak = Math.max(peak, installFrame(t).icon);
  assert.ok(peak > 1.04 && peak <= 1.081, `peak ${peak}`);
  assert.ok(Math.abs(installFrame(INSTALL.popEnd).icon - 1) < 0.01);
  assert.equal(installFrame(INSTALL.popAt + 1).iconOpacity, 1);
});

test("the outline and ring give way when the icon pops in", () => {
  const f = installFrame(INSTALL.popAt + 20);
  assert.equal(f.outline, 0);
  assert.equal(f.ring, 0);
});

test("the label then the dot come in after the icon", () => {
  assert.equal(installFrame(INSTALL.labelAt).label, 0);
  assert.ok(installFrame((INSTALL.labelAt + INSTALL.labelEnd) / 2).label > 0);
  assert.equal(installFrame(INSTALL.labelEnd).label, 1);
  assert.equal(installFrame(INSTALL.dotAt).dot, 0);
  assert.equal(installFrame(INSTALL.dotEnd).dot, 1);
});

test("installs in a batch start 0.5 s apart, and the batch lasts until the last one ends", () => {
  assert.equal(fx.installStart(0), 0);
  assert.equal(fx.installStart(3), 1500);
  assert.equal(fx.batchTotal(0), 0);
  assert.equal(fx.batchTotal(1), INSTALL.total);
  assert.equal(fx.batchTotal(5), 2000 + INSTALL.total);
});

test("the intro line arrives after the last icon has popped in", () => {
  assert.equal(fx.introLineAt(0), 0);
  assert.equal(fx.introLineAt(5), 2000 + INSTALL.popEnd);
});

test("the press sinks to 92%", () => {
  assert.equal(fx.PRESS.scale, 0.92);
});

test("the install clock runs until the burst has left nothing behind", async () => {
  const burst = await import(pathToFileURL(path.resolve("components/motion/burst-core.ts")).href);
  assert.ok(fx.INSTALL_CLOCK >= INSTALL.popAt + burst.BURST.total, "the clock outlasts the burst that hangs off the pop");
  assert.ok(fx.INSTALL_CLOCK >= INSTALL.total);
  // at the last frame of the clock every star, the ring and the twinkles are gone
  const t = fx.INSTALL_CLOCK - INSTALL.popAt;
  for (let i = 0; i < burst.BURST.count; i++) assert.equal(burst.burstStar(i, t).opacity, 0, `star ${i}`);
  assert.equal(burst.burstRing(t).opacity, 0);
  assert.equal(burst.burstTwinkle(0, t).opacity, 0);
  assert.equal(burst.burstTwinkle(1, t).opacity, 0);
  // and the icon itself is the plain one by then
  assert.deepEqual(installFrame(fx.INSTALL_CLOCK), installFrame(INSTALL.total));
});
