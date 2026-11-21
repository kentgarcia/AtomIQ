import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("components/phone/phone-boot-core.ts")).href);
const { BOOT, bootFrame } = core;

test("before it starts there is only the dark screen", () => {
  const f = bootFrame(-10);
  assert.equal(f.screen, 1);
  assert.equal(f.logoOpacity, 0);
  assert.equal(f.fill, 0);
  assert.deepEqual(bootFrame(0), f);
});

test("after the end the dark has lifted and nothing of it shows", () => {
  const f = bootFrame(BOOT.total);
  assert.equal(f.screen, 0);
  assert.equal(f.logoOpacity, 0);
  assert.equal(f.word, 0);
  assert.equal(f.track, 0);
  assert.deepEqual(bootFrame(BOOT.total + 900), f);
});

test("the beats are in order and inside the clock", () => {
  const order = [BOOT.logoAt, BOOT.wordAt, BOOT.trackAt, BOOT.fillAt, BOOT.holdAt, BOOT.fillEnd, BOOT.liftAt, BOOT.total];
  for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1], `beat ${i} comes before beat ${i - 1}`);
  assert.ok(BOOT.logoEnd > BOOT.logoAt && BOOT.wordEnd > BOOT.wordAt && BOOT.trackEnd > BOOT.trackAt);
  // the install moments start as the dark begins to lift, never before the bar is full
  assert.ok(BOOT.revealAt >= BOOT.fillEnd && BOOT.revealAt < BOOT.total);
});

test("the logo pops in from 60%, passes full size and settles at 100% before the bar finishes", () => {
  assert.equal(bootFrame(BOOT.logoAt - 1).logo, 0);
  const start = bootFrame(BOOT.logoAt + 1).logo;
  assert.ok(start > 0.55 && start < 0.7, `starts at ${start}`);
  let peak = 0;
  for (let t = BOOT.logoAt; t <= BOOT.logoEnd; t += 5) peak = Math.max(peak, bootFrame(t).logo);
  assert.ok(peak > 1.04 && peak < 1.12, `peak ${peak}`);
  assert.ok(Math.abs(bootFrame(BOOT.logoEnd).logo - 1) < 1e-9);
  assert.ok(Math.abs(bootFrame(BOOT.holdAt).logo - 1) < 1e-9);
});

test("the bar only fills, stalls at 60% where the clock stops, and ends full", () => {
  let last = 0;
  for (let t = 0; t <= BOOT.total; t += 10) {
    const f = bootFrame(t).fill;
    assert.ok(f >= last - 1e-9, `the bar went back at ${t}`);
    assert.ok(f >= 0 && f <= 1);
    last = f;
  }
  assert.ok(Math.abs(bootFrame(BOOT.holdAt).fill - BOOT.stallFill) < 1e-9);
  assert.equal(bootFrame(BOOT.holdAt - 1).fill < BOOT.stallFill + 1e-6, true);
  assert.ok(Math.abs(bootFrame(BOOT.fillEnd).fill - 1) < 1e-9);
});

test("the stall is still: the logo, the name and the bar are at rest at the hold", () => {
  const f = bootFrame(BOOT.holdAt);
  assert.equal(f.screen, 1);
  assert.equal(f.logoOpacity, 1);
  assert.equal(f.word, 1);
  assert.equal(f.wordY, 0);
  assert.equal(f.track, 1);
});

test("the screen stays fully dark until the lift, then goes down and never back up", () => {
  assert.equal(bootFrame(BOOT.liftAt).screen, 1);
  let last = 1;
  for (let t = BOOT.liftAt; t <= BOOT.total; t += 10) {
    const s = bootFrame(t).screen;
    assert.ok(s <= last + 1e-9, `the dark came back at ${t}`);
    last = s;
  }
  assert.ok(bootFrame((BOOT.liftAt + BOOT.total) / 2).screen < 1);
});

test("the whole of it is short enough to be loading, not a wait", () => {
  assert.ok(BOOT.total <= 2500);
});
