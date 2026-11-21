/**
 * Daily and weekly quests: which period a state belongs to, how it rolls over, the reset timer,
 * and the quest tables themselves.
 *
 * Run: npm run test:missions
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("services/missions-core.ts");
const { MISSION_TYPES, emptyProgress, nextReset, periodKey, resolveState, timeUntilReset, toIsoDate, weekStart } = core;

// Local-time dates: 2026-11-16 is a Monday
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

test("weeks run Monday to Sunday", () => {
  for (const [d, monday] of [
    [at(2026, 11, 16), "2026-11-16"],
    [at(2026, 11, 17), "2026-11-16"],
    [at(2026, 11, 22, 23, 59), "2026-11-16"], // Sunday night
    [at(2026, 11, 23, 0, 1), "2026-11-23"], // next Monday
    [at(2027, 1, 1), "2026-12-28"], // across the year
  ]) {
    assert.equal(toIsoDate(weekStart(d)), monday, d.toString());
    assert.equal(periodKey("weekly", d), monday);
  }
  assert.equal(periodKey("daily", at(2026, 11, 17)), "2026-11-17");
});

test("the weekly key changes only on Monday, the daily key every day", () => {
  const days = Array.from({ length: 14 }, (_, i) => at(2026, 11, 16 + i));
  const weekly = days.map((d) => periodKey("weekly", d));
  assert.equal(new Set(weekly).size, 2);
  assert.equal(weekly[6], weekly[0]);
  assert.notEqual(weekly[7], weekly[6]);
  assert.equal(new Set(days.map((d) => periodKey("daily", d))).size, 14);
});

test("next reset: midnight tonight, or midnight starting next Monday", () => {
  assert.equal(nextReset("daily", at(2026, 11, 17, 8)).getTime(), at(2026, 11, 18, 0).getTime());
  assert.equal(nextReset("weekly", at(2026, 11, 17, 8)).getTime(), at(2026, 11, 23, 0).getTime());
  assert.equal(nextReset("weekly", at(2026, 11, 22, 23)).getTime(), at(2026, 11, 23, 0).getTime());
  assert.equal(nextReset("weekly", at(2026, 11, 16, 0, 0)).getTime(), at(2026, 11, 23, 0).getTime(), "Monday itself starts a new week");
});

test("reset timer: hours for the day, days for the week, hours again in the last day", () => {
  assert.deepEqual(timeUntilReset("daily", at(2026, 11, 17, 18, 30)), { amount: 6, unit: "HOUR" });
  assert.deepEqual(timeUntilReset("daily", at(2026, 11, 17, 23, 59)), { amount: 1, unit: "HOUR" });
  assert.deepEqual(timeUntilReset("weekly", at(2026, 11, 17, 8)), { amount: 6, unit: "DAY" });
  assert.deepEqual(timeUntilReset("weekly", at(2026, 11, 16, 0, 1)), { amount: 7, unit: "DAY" });
  assert.deepEqual(timeUntilReset("weekly", at(2026, 11, 22, 12)), { amount: 12, unit: "HOUR" });
});

test("a stored state of the same period is kept, with missing counters filled in", () => {
  const { state, fresh } = resolveState({ date: "2026-11-16", progress: { login: 2, mythbuster: 1 }, claimed: ["weekly_login"] }, "2026-11-16");
  assert.equal(fresh, false);
  assert.deepEqual(state.progress, { login: 2, mythbuster: 1, fact: 0, lesson: 0, maze: 0 });
  assert.deepEqual(state.claimed, ["weekly_login"]);
});

test("a state of an earlier period starts again from zero", () => {
  const { state, fresh } = resolveState({ date: "2026-11-09", progress: { login: 5 }, claimed: ["weekly_login"] }, "2026-11-16");
  assert.equal(fresh, true);
  assert.deepEqual(state, { date: "2026-11-16", progress: emptyProgress(), claimed: [] });
});

test("bad stored data never breaks it", () => {
  for (const bad of [null, undefined, 5, "x", [], { date: "2026-11-16", progress: "no", claimed: "no" }, { date: "2026-11-16", progress: { login: "3", fact: -2, lesson: Number.NaN } }]) {
    const { state } = resolveState(bad, "2026-11-16");
    assert.ok(Array.isArray(state.claimed));
    for (const t of MISSION_TYPES) assert.ok(Number.isFinite(state.progress[t]) && state.progress[t] >= 0, `${JSON.stringify(bad)}: ${t}`);
  }
  assert.equal(resolveState({ date: "2026-11-16", progress: { login: 3 } }, "2026-11-16").state.progress.login, 3);
});

test("quest tables: unique ids, every type is counted, weekly asks for more and pays more", () => {
  // missions.ts needs storage, so read the tables from source instead of loading it
  const src = fs.readFileSync("services/missions.ts", "utf8");
  const grab = (name) => {
    const body = src.slice(src.indexOf(`export const ${name}: DailyMission[] = [`));
    const end = body.indexOf("\n];");
    const field = (block, key) => new RegExp(`${key}: "?([^",\\n]+)"?,`).exec(block)?.[1];
    return body
      .slice(0, end)
      .split(/\n  \{/)
      .slice(1)
      .map((block) => ({
        id: field(block, "id"),
        type: field(block, "type"),
        period: field(block, "period"),
        target: Number(field(block, "target")),
        reward: Number(field(block, "reward")),
      }));
  };
  const daily = grab("DAILY_MISSIONS");
  const weekly = grab("WEEKLY_MISSIONS");
  assert.ok(daily.length >= 3 && weekly.length >= 3);
  const ids = [...daily, ...weekly].map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  assert.ok(daily.every((m) => m.period === "daily") && weekly.every((m) => m.period === "weekly"));
  for (const m of [...daily, ...weekly]) assert.ok(MISSION_TYPES.includes(m.type), `${m.id}: ${m.type}`);
  for (const w of weekly) {
    assert.ok(w.target >= 3 && w.target <= 7, `${w.id}: a week has 7 days, so ${w.target} is out of reach or trivial`);
    const d = daily.find((x) => x.type === w.type);
    if (d) assert.ok(w.target > d.target && w.reward > d.reward, `${w.id} asks for more and pays more than ${d.id}`);
  }
  // A daily login or fact can only happen once a day: a weekly one cannot ask for more than 7
  for (const w of weekly.filter((m) => m.type === "login" || m.type === "fact")) assert.ok(w.target <= 7);
});


test("the chest is locked until every quest is claimed, ready, then opened once", () => {
  const { CHEST_ID, CHEST_REWARD, chestStatus } = core;
  const ids = ["a", "b", "c"];
  assert.equal(chestStatus(ids, []), "locked");
  assert.equal(chestStatus(ids, ["a", "b"]), "locked");
  assert.equal(chestStatus(ids, ["a", "b", "c"]), "ready");
  assert.equal(chestStatus(ids, ["c", "b", "a", "x"]), "ready");
  assert.equal(chestStatus(ids, ["a", "b", "c", CHEST_ID]), "opened");
  assert.equal(chestStatus(ids, [CHEST_ID]), "opened", "opened stays opened");
  assert.equal(chestStatus([], []), "locked", "a period with no quests has no chest to open");
  assert.equal(CHEST_REWARD.daily, 5);
  assert.equal(CHEST_REWARD.weekly, 25);
  assert.ok(!ids.includes(CHEST_ID));
});

test("the weekly chest needs any 3 claimed quests, the daily chest all of them", () => {
  const { CHEST_ID, chestStatus, chestNeeded } = core;
  const week = ["l", "m", "g", "f", "x"];
  assert.equal(chestNeeded("weekly", week.length), 3);
  assert.equal(chestNeeded("daily", 4), 4);
  assert.equal(chestNeeded("weekly", 2), 2, "never more than the quests there are");
  assert.equal(chestStatus(week, ["l", "m"], 3), "locked");
  assert.equal(chestStatus(week, ["x", "m", "f"], 3), "ready", "any three");
  assert.equal(chestStatus(week, ["l", "m", "g", CHEST_ID], 3), "opened");
  assert.equal(chestStatus(week, ["l", "m", "g", "f", "x"], 3), "ready", "more than three is still ready");
});

test("the chest mark survives a reload of the stored state and ends with the period", () => {
  const { CHEST_ID } = core;
  const stored = { date: "2026-11-17", progress: emptyProgress(), claimed: ["daily_login", CHEST_ID] };
  assert.deepEqual(resolveState(stored, "2026-11-17").state.claimed, ["daily_login", CHEST_ID]);
  assert.deepEqual(resolveState(stored, "2026-11-18").state.claimed, [], "tomorrow's chest is closed again");
});

test("no quest is called chest", () => {
  const src = fs.readFileSync("services/missions.ts", "utf8");
  assert.equal(/id:\s*"chest"/.test(src), false);
});

test("a first focus does not read the counters again while the mount's own read is still going; any other focus does", () => {
  const { refreshOnFocus } = core;
  assert.equal(refreshOnFocus(true, true), false, "first focus, read in flight");
  assert.equal(refreshOnFocus(true, false), true, "first focus, the read already done");
  assert.equal(refreshOnFocus(false, true), true, "a later focus always reads");
  assert.equal(refreshOnFocus(false, false), true);
});
