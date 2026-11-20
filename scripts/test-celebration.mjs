/**
 * The timelines of the earned moments (components/celebration/celebration-core.ts): level up,
 * badge ranked up, the daily streak and the map's unlock. The checks are about order and about
 * how the pieces sit together (the burst hangs off the landing, the button never waits for the
 * whole show, the pop ends before its moment does), not about any single curve: those are tested
 * with their own pieces (test:stamp, test:option-pop, test:burst).
 *
 * Run: npm run test:celebration
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const C = loadTs("components/celebration/celebration-core.ts");
const { FINISH_STAMPS, STAMP_LANDS, STAMP_TOTAL } = loadTs("components/lesson/stamp-core.ts");
const { BURST } = loadTs("components/motion/burst-core.ts");
const { REVEAL } = loadTs("components/motion/reveal-core.ts");
const { POP_TOTAL } = loadTs("components/lesson/cards/option-pop-core.ts");

test("the pop constants are the option pop's own", () => {
  assert.equal(C.POP_LENGTH, POP_TOTAL);
  assert.ok(C.POP_CONTACT < C.POP_LENGTH && C.POP_HANG < C.POP_CONTACT);
});

test("a dialog's show waits for the grow to finish", () => {
  assert.equal(C.DIALOG_SETTLE_MS, 350);
});

test("level up: the medal lands and the burst goes off on the landing, the number counts while it lands, the button comes in time", () => {
  const L = C.LEVEL_UP;
  assert.equal(L.burst, STAMP_LANDS);
  assert.ok(L.countFrom >= L.medal && L.countFrom + L.countMs <= L.pop, "the number has landed when the medal pops");
  assert.ok(L.line < L.bar && L.button <= L.bar, "the line is there before its bar fills, the button is not held back");
  assert.ok(C.LEVEL_UP_TOTAL >= L.medal + STAMP_TOTAL && C.LEVEL_UP_TOTAL >= L.burst + BURST.total);
  assert.ok(C.LEVEL_UP_TOTAL >= L.pop + C.POP_LENGTH && C.LEVEL_UP_TOTAL >= L.bar + L.barMs);
  assert.ok(C.LEVEL_UP_TOTAL < 1500, "inside the length of the fanfare");
});

test("level up: the rays' loop is seamless (same picture at both ends, the fan looks the same after one step)", () => {
  const L = C.LEVEL_UP;
  const a = C.levelRaysLoop(0);
  const b = C.levelRaysLoop(L.loopMs);
  assert.equal(a.rotate, 0);
  assert.ok(Math.abs(b.rotate - 0) < 1e-6 || Math.abs(b.rotate - L.loopStep) < 1e-6 || Math.abs(C.levelRaysLoop(L.loopMs - 1e-6).rotate - L.loopStep) < 1e-3);
  assert.ok(Math.abs(a.scale - C.levelRaysLoop(L.loopMs - 1e-6).scale) < 1e-3);
  assert.equal(360 % L.loopStep, 0, "the step divides the circle");
  let last = -1;
  for (let t = 0; t < L.loopMs; t += 50) {
    const r = C.levelRaysLoop(t).rotate;
    assert.ok(r >= last, "it only turns one way");
    last = r;
  }
});

test("level up: the rays open once and rest, the bar only fills", () => {
  const L = C.LEVEL_UP;
  assert.equal(C.levelRays(0).opacity, 0);
  const end = C.levelRays(L.raysMs);
  assert.equal(end.scale, 1);
  assert.equal(end.opacity, 1);
  assert.equal(end.rotate, L.raysTurn);
  assert.deepEqual(C.levelRays(L.raysMs + 500), end);
  assert.equal(C.levelBar(0), 0);
  assert.equal(C.levelBar(L.barMs), 1);
  assert.equal(C.levelBar(L.barMs + 500), 1);
  let last = 0;
  for (let t = 0; t <= L.barMs; t += 10) {
    const f = C.levelBar(t);
    assert.ok(f >= last - 1e-9, `the bar went backwards at ${t}`);
    last = f;
  }
});

test("rank up: each badge's ring ends where its picture flips and pops, the burst is at the hang, the text after", () => {
  const R = C.RANK_UP;
  assert.equal(R.ring + R.ringMs, R.flip);
  assert.equal(R.flip, R.pop);
  assert.equal(R.burst, R.pop + C.POP_HANG);
  assert.equal(R.text, R.ring, "the text arrives with the ring, not after the progress animation");
});

test("rank up: badges start one after another, only the first few animate, the total grows with them", () => {
  assert.equal(C.rankUpStart(0), 0);
  assert.equal(C.rankUpStart(1), C.RANK_UP.step);
  assert.ok(C.rankUpStart(2) > C.rankUpStart(1));
  assert.equal(C.rankUpStart(10), C.rankUpStart(C.RANK_UP.maxAnimated), "after the cap they all start together");
  assert.ok(C.rankUpTotal(2) > C.rankUpTotal(1));
  assert.equal(C.rankUpTotal(10), C.rankUpTotal(C.RANK_UP.maxAnimated));
  assert.ok(C.rankUpTotal(1) >= C.RANK_UP.pop + C.POP_LENGTH, "the pop is over before the show is");
  assert.ok(C.rankUpTotal(1) < 2500 + 1, "one badge fits the length of the rank-up cue");
});

test("the rank-up ring fills once, stays full through the flip, then fades away", () => {
  const R = C.RANK_UP;
  assert.deepEqual(C.rankRing(0), { fill: 0, opacity: 0 });
  assert.equal(C.rankRing(R.flip).fill, 1);
  assert.equal(C.rankRing(R.flip).opacity, 1);
  assert.equal(C.rankRing(R.flip + 400).opacity, 0);
  let last = 0;
  for (let t = 1; t <= R.flip; t += 5) {
    const f = C.rankRing(t).fill;
    assert.ok(f >= last - 1e-9, `the ring went backwards at ${t}`);
    last = f;
  }
  assert.equal(C.RANK_UP_BADGE_TOTAL, C.rankUpTotal(1));
});

test("streak: the flame, then the count on its landing, the headline, the card and its days, today's tick, then Continue", () => {
  const S = C.STREAK_FX;
  assert.equal(S.count, STAMP_LANDS);
  assert.ok(S.flame < S.count && S.count < S.headline && S.headline < S.sub);
  assert.ok(S.card < S.days && S.days < S.tick, "the days are in before today's tick pops");
  assert.ok(S.tick < S.button + 1000);
  assert.ok(S.button < C.STREAK_TOTAL, "Continue is on screen before the show is over");
  assert.equal(C.STREAK_TICK_CONTACT, S.tick + C.POP_CONTACT);
  assert.ok(C.STREAK_TOTAL <= 2115, "inside the length of the achievement cue");
});

test("streak milestones: a week, two, a month, fifty and every hundred; nothing else", () => {
  for (const d of [7, 14, 30, 50, 100, 200, 300, 1000]) assert.equal(C.isMilestoneStreak(d), true, String(d));
  for (const d of [0, 1, 2, 3, 6, 8, 13, 29, 31, 51, 99, 101, 150]) assert.equal(C.isMilestoneStreak(d), false, String(d));
});

test("map unlock: the check and the pop both fit the show, the sound is at the pop's launch and the haptic at its landing", () => {
  const N = C.NODE_REVEAL;
  assert.ok(N.check < N.pop);
  assert.ok(N.check + STAMP_TOTAL <= N.total);
  assert.ok(N.pop + C.POP_LENGTH <= N.total);
  assert.ok(N.sound > N.pop && N.sound < N.haptic);
  assert.equal(N.haptic, N.pop + C.POP_CONTACT);
  assert.ok(N.wait >= 300, "the map has scrolled to the node by then (its own scroll runs after 100 ms)");
});

test("achievement detail: the badge's burst hangs off its landing", () => {
  assert.equal(C.ACHIEVEMENT_FX.burst, C.ACHIEVEMENT_FX.badge + STAMP_LANDS);
});

test("podium: third place rises first, then second, then first, 200 ms apart", () => {
  assert.equal(C.podiumStart(3), 0);
  assert.equal(C.podiumStart(2), C.PODIUM.step);
  assert.equal(C.podiumStart(1), 2 * C.PODIUM.step);
  assert.equal(C.podiumStart(9), 0, "out of range counts as third");
  assert.equal(C.PODIUM_FIRST_LANDS, 2 * C.PODIUM.step + C.PODIUM.rise);
  assert.equal(C.PODIUM_TOTAL, C.PODIUM_FIRST_LANDS + C.PODIUM.squashMs);
  assert.equal(C.PODIUM.learnerPop, C.PODIUM_TOTAL, "the learner's pop waits until the podium is up");
  assert.ok(C.PODIUM_TOTAL <= 1000);
});

test("podium frames: the block rises once from nothing and the head dips and comes back", () => {
  assert.deepEqual(C.podiumFrame(0), { rise: 0, headScaleY: 1 });
  assert.equal(C.podiumFrame(-50).rise, 0);
  assert.equal(C.podiumFrame(C.PODIUM.rise).rise, 1);
  assert.equal(C.podiumFrame(C.PODIUM.rise).headScaleY, 1);
  let last = 0;
  for (let t = 0; t <= C.PODIUM.rise; t += 8) {
    const r = C.podiumFrame(t).rise;
    assert.ok(r >= last - 1e-9, `the block went down at ${t}`);
    last = r;
  }
  const mid = C.podiumFrame(C.PODIUM.rise + C.PODIUM.squashMs / 2).headScaleY;
  assert.ok(Math.abs(mid - (1 - C.PODIUM.squash)) < 1e-9, "the dip is deepest half way through");
  assert.ok(C.podiumFrame(C.PODIUM.rise + C.PODIUM.squashMs).headScaleY > 0.999, "the head is back at full height");
  for (let t = 0; t < C.PODIUM.rise; t += 8) assert.equal(C.podiumFrame(t).headScaleY, 1, "no squash while it is still rising");
});

test("rank move: up is a better (smaller) place, nothing on a first visit or no change", () => {
  assert.equal(C.rankMove(null, 3), null);
  assert.equal(C.rankMove(4, 4), null);
  assert.equal(C.rankMove(5, 3), "up");
  assert.equal(C.rankMove(2, 6), "down");
  assert.equal(C.rankMove(Number.NaN, 2), null);
});

test("game results: title, its line, the numbers one after another, then the buttons, which come before the last count ends", () => {
  const R = C.RESULT_FX;
  assert.equal(R.title, FINISH_STAMPS.title);
  assert.equal(R.message, FINISH_STAMPS.message);
  assert.ok(R.title < R.message && R.message < R.statsStart);
  assert.equal(C.resultStatAt(1) - C.resultStatAt(0), R.statStep);
  assert.ok(C.resultActionsAt(3) > C.resultStatAt(2));
  assert.ok(C.resultActionsAt(3) <= 1500, "the buttons are never far away");
  assert.equal(C.resultActionsAt(0), C.resultStatAt(0) + 200);
});

test("welcome: the mascot lands, the burst is on the landing, the welcome is stamped after, the button is last and in time", () => {
  const W = C.WELCOME_FX;
  assert.equal(W.burst, STAMP_LANDS);
  assert.ok(W.mascot < W.burst && W.burst < W.title && W.title < W.line && W.line <= W.button);
  assert.ok(C.WELCOME_TOTAL >= W.mascot + STAMP_TOTAL && C.WELCOME_TOTAL >= W.burst + BURST.total);
  assert.ok(C.WELCOME_TOTAL < 1500);
});

test("level-up unlocked items: the tiles come after the line, the button after the last tile", () => {
  const { LEVEL_UP, LEVEL_UNLOCKS, levelUpButtonAt } = C;
  assert.ok(LEVEL_UNLOCKS.unlocked >= LEVEL_UP.line + 150, "after the line has arrived");
  assert.equal(levelUpButtonAt(0), LEVEL_UP.button, "no items: the button is where it was");
  assert.equal(levelUpButtonAt(-3), LEVEL_UP.button);
  let last = levelUpButtonAt(1);
  assert.ok(last > LEVEL_UNLOCKS.unlocked);
  for (let n = 2; n <= LEVEL_UNLOCKS.max; n++) {
    const at = levelUpButtonAt(n);
    assert.equal(at - last, LEVEL_UNLOCKS.unlockedStep, "one step per tile");
    last = at;
  }
  assert.ok(last < 2500, "never a long wait to leave");
});

test("tour reward: Shrodi lands, the title is stamped, the diamond pops, the count runs, then the line and the button, all in time", () => {
  const T = C.TOUR_REWARD_FX;
  assert.equal(T.burst, STAMP_LANDS);
  assert.ok(T.mascot < T.burst && T.burst < T.title && T.title < T.gem, "in the order they are seen");
  assert.ok(T.gem < T.gemBurst && T.gemBurst - T.gem === C.POP_HANG, "the diamond's burst is at its hang");
  assert.ok(T.count >= T.gem && T.count + T.countMs <= T.line, "the number has landed before the line arrives");
  assert.ok(T.line < T.button);
  assert.ok(C.TOUR_REWARD_TOTAL >= T.button + REVEAL.ms && C.TOUR_REWARD_TOTAL >= T.gem + C.POP_LENGTH);
  assert.ok(C.TOUR_REWARD_TOTAL < 2200, "the button is there within about two seconds");
  assert.ok(C.TOUR_REWARD_TIMEOUT_MS > C.TOUR_REWARD_TOTAL + 3000, "long enough to read");
});
