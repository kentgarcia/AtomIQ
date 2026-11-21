/**
 * SFX catalog and scheduling tests (docs/features/SFX_SPEC.md §5, §7).
 *
 * Run: npm run test:sfx
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_MEDIA_ENVIRONMENT,
  DEFAULT_MEDIA_PREFERENCES,
  canPlayCue,
  getRouteMediaPolicy,
} from "../services/media-core.ts";
import {
  BURST_MAX,
  BURST_WINDOW_MS,
  CUES,
  CUE_IDS,
  REACTION_RATE,
  SFX_FILES,
  SFX_SETS,
  WARMABLE_SETS,
  cuesInNoSet,
  filesOfCues,
  filesOfSet,
  blipRate,
  createSfxScheduler,
  fileGroup,
  filesOfGroup,
  ladderRate,
  pickSlot,
  poolSizeOf,
  shouldBlip,
} from "../services/sfx-core.ts";

import {
  BUFFER_BUDGET_BYTES,
  decodedBytes,
  livePlayerCap,
  pickBackend,
  planBufferEvictions,
  planEvictions,
  planWarm,
  retryAllowed,
} from "../services/sfx-backend-core.ts";
import { FAULT_OUTCOMES, createSfxDiag } from "../services/sfx-diag.ts";
import { BUDGETS } from "../services/device-profile-core.ts";

const prefs = (over = {}) => ({ ...DEFAULT_MEDIA_PREFERENCES, ...over });
const env = (over = {}) => ({ ...DEFAULT_MEDIA_ENVIRONMENT, ...over });
const policy = (path) => getRouteMediaPolicy(path);

describe("catalog", () => {
  it("every cue points at a bundled file with sane numbers", () => {
    for (const id of CUE_IDS) {
      const def = CUES[id];
      assert.ok(def.file in SFX_FILES, `${id}: unknown file ${def.file}`);
      assert.match(id, /^[a-z]+\.[a-z0-9-]+$/);
      assert.ok(def.volume > 0 && def.volume <= 1, `${id}: volume`);
      assert.ok(def.gap >= 0 && def.pool >= 1, `${id}: gap/pool`);
    }
  });

  it("every file is used by at least one cue, so none is bundled for nothing", () => {
    const used = new Set(CUE_IDS.map((id) => CUES[id].file));
    for (const file of Object.keys(SFX_FILES)) assert.ok(used.has(file), `${file} has no cue`);
  });

  it("groups come from the folder and cover every file", () => {
    const all = ["ui", "lesson", "reward", "social", "game", "phone"].flatMap((g) => filesOfGroup(g));
    assert.equal(all.length, Object.keys(SFX_FILES).length);
    assert.equal(fileGroup("lesson/blip"), "lesson");
  });

  it("a file's pool is the biggest any of its cues asks for", () => {
    assert.equal(poolSizeOf("reward/pop"), 3);
    assert.equal(poolSizeOf("ui/lock"), 1);
  });

  it("the spec's aliases share a file but not a meaning", () => {
    assert.equal(CUES["lesson.stamp"].file, "ui/lock");
    assert.equal(CUES["lesson.star"].file, "reward/pop");
    assert.equal(CUES["ui.toggle-off"].file, "ui/disable");
    assert.equal(CUES["reward.chest-ready"].file, CUES["reward.requirements-met"].file);
    assert.equal(CUES["game.hit"].file, "ui/lock");
  });
});

describe("gates", () => {
  const categories = ["tap", "panel", "feedback", "reward", "stinger", "voice"];

  it("nothing plays with Sound Effects off or the app in the background", () => {
    for (const c of categories) {
      assert.equal(canPlayCue(c, prefs({ soundEffects: false }), env(), policy("/")), false, c);
      assert.equal(canPlayCue(c, prefs(), env({ appActive: false }), policy("/")), false, c);
    }
  });

  it("taps follow the route policy: heard on Home and in a lesson, silent in the games", () => {
    assert.equal(canPlayCue("tap", prefs(), env(), policy("/")), true);
    assert.equal(canPlayCue("tap", prefs(), env(), policy("/lesson/abc")), true);
    assert.equal(canPlayCue("tap", prefs(), env(), policy("/quiz/abc")), false);
    assert.equal(canPlayCue("tap", prefs(), env(), policy("/mythbuster")), false);
  });

  it("panels and feedback play on every route, lessons included", () => {
    for (const c of ["panel", "feedback", "reward", "stinger"]) {
      assert.equal(canPlayCue(c, prefs(), env(), policy("/lesson/abc")), true, c);
    }
  });

  it("a screen reader silences taps and voice but not feedback", () => {
    const sr = env({ screenReaderActive: true });
    assert.equal(canPlayCue("tap", prefs(), sr, policy("/")), false);
    assert.equal(canPlayCue("voice", prefs(), sr, policy("/")), false);
    assert.equal(canPlayCue("feedback", prefs(), sr, policy("/")), true);
    assert.equal(canPlayCue("stinger", prefs(), sr, policy("/")), true);
  });

  it("voice cues never talk over Read Aloud", () => {
    assert.equal(canPlayCue("voice", prefs(), env(), policy("/"), true), false);
    assert.equal(canPlayCue("voice", prefs(), env(), policy("/"), false), true);
    assert.equal(canPlayCue("feedback", prefs(), env(), policy("/"), true), true);
  });
});

describe("scheduler", () => {
  it("drops a cue still inside its gap and lets it through after", () => {
    const s = createSfxScheduler();
    assert.equal(s.plan("ui.press", 1000).play, true);
    const early = s.plan("ui.press", 1000 + CUES["ui.press"].gap - 1);
    assert.equal(early.play, false);
    assert.equal(early.reason, "gap");
    assert.equal(s.plan("ui.press", 1000 + CUES["ui.press"].gap).play, true);
  });

  it("gaps are per cue: a different cue is not held back", () => {
    const s = createSfxScheduler();
    s.plan("ui.press", 1000);
    assert.equal(s.plan("ui.tab", 1001).play, true);
  });

  it("scales the catalog volume, clamped to 0..1", () => {
    const s = createSfxScheduler();
    assert.equal(s.plan("lesson.stamp", 0, { volume: 0.5 }).volume, CUES["lesson.stamp"].volume * 0.5);
    assert.equal(s.plan("reward.coin", 0, { volume: 9 }).volume, 1);
  });

  it("rate: absolute wins over a ladder index; none means 1", () => {
    const s = createSfxScheduler();
    assert.equal(s.plan("reward.pop", 0).rate, 1);
    assert.equal(s.plan("reward.pop", 1000, { index: 2 }).rate, ladderRate(2));
    assert.equal(s.plan("reward.pop", 2000, { index: 2, rate: 1.2 }).rate, 1.2);
  });

  it("a cue's own rate is the default; a caller's rate or ladder step wins", () => {
    const s = createSfxScheduler();
    assert.equal(s.plan("lesson.bubble", 0).rate, 0.85);
    assert.equal(s.plan("lesson.bubble", 1000, { rate: 1.3 }).rate, 1.3);
    assert.equal(s.plan("lesson.bubble", 2000, { index: 1 }).rate, ladderRate(1));
    assert.equal(s.plan("reward.appear", 0).rate, 1.15);
  });

  it("a new stinger stops the one still playing; after it ends nothing needs stopping", () => {
    const s = createSfxScheduler();
    assert.equal(s.plan("lesson.complete", 0).stopStinger, false);
    assert.equal(s.plan("reward.level-up", 1000).stopStinger, true);
    const later = 1000 + SFX_FILES["reward/level-up"] + 1;
    assert.equal(s.plan("reward.achievement", later).stopStinger, false);
  });

  it("a stinger ducks voice cues while it plays, then they return", () => {
    const s = createSfxScheduler();
    s.plan("lesson.complete", 0);
    const ducked = s.plan("lesson.blip", 500);
    assert.equal(ducked.play, false);
    assert.equal(ducked.reason, "duck");
    assert.equal(s.plan("lesson.answer-correct", 500).play, true, "feedback overlaps a stinger");
    assert.equal(s.plan("lesson.blip", SFX_FILES["lesson/complete"] + 1).play, true);
  });

  it("caps starts in a burst, dropping voice and taps first, never feedback", () => {
    const s = createSfxScheduler();
    const loud = ["lesson.answer-correct", "lesson.answer-wrong", "lesson.start", "lesson.unlock", "ui.lock", "ui.equip"];
    assert.equal(loud.length, BURST_MAX);
    for (const id of loud) assert.equal(s.plan(id, 0).play, true, id);
    const tap = s.plan("ui.tab", 10);
    assert.equal(tap.play, false);
    assert.equal(tap.reason, "burst");
    assert.equal(s.plan("lesson.blip", 10).play, false);
    assert.equal(s.plan("reward.coin", 10).play, true, "a reward still plays");
    assert.equal(s.plan("ui.tab", BURST_WINDOW_MS + 11).play, true, "the window moves on");
  });

  it("reset forgets gaps and stingers", () => {
    const s = createSfxScheduler();
    s.plan("ui.press", 0);
    s.plan("lesson.complete", 0);
    s.reset();
    assert.equal(s.plan("ui.press", 1).play, true);
    assert.equal(s.plan("lesson.blip", 2).play, true);
  });
});

describe("pitch and typing", () => {
  it("ladder rises, starts at 1 and stops at the top", () => {
    assert.equal(ladderRate(0), 1);
    assert.deepEqual([0, 1, 2].map(ladderRate), [1, 1.12, 1.26]);
    assert.ok(ladderRate(4) > ladderRate(3));
    assert.equal(ladderRate(99), ladderRate(4));
    assert.equal(ladderRate(-3), 1);
    assert.equal(ladderRate(Number.NaN), 1);
  });

  it("reaction pitches are the spec's", () => {
    assert.deepEqual(REACTION_RATE, { like: 1, love: 1.1, clap: 0.95, wow: 1.2 });
  });

  it("blip pitch varies by under 10 percent around 1", () => {
    assert.ok(blipRate(0) >= 0.92 && blipRate(0.999) <= 1.08);
    assert.ok(blipRate(0.5) > blipRate(0.1));
    assert.equal(blipRate(-1), blipRate(0));
  });

  it("a bubble blips on every third visible character, not on the empty string", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(shouldBlip), [false, false, false, true, false, false, true]);
  });
});

describe("player pool", () => {
  const slot = (over = {}) => ({ fresh: false, rewound: false, busyUntil: 0, ...over });

  it("prefers a free player that is already at the start", () => {
    assert.equal(pickSlot([slot(), slot({ rewound: true })], 2, 1000), 1);
    assert.equal(pickSlot([slot(), slot({ fresh: true })], 2, 1000), 1);
  });

  it("never gives a reserved player to a second play, even one that has not started", () => {
    const reserved = slot({ fresh: true, busyUntil: 1200 });
    assert.equal(pickSlot([reserved], 2, 1000), "new");
    assert.equal(pickSlot([reserved, slot({ fresh: true })], 2, 1000), 1);
  });

  it("uses a free player that needs a rewind before making a new one", () => {
    assert.equal(pickSlot([slot()], 2, 1000), 0);
  });

  it("cuts off the longest-reserved player when the pool is full", () => {
    assert.equal(pickSlot([slot({ busyUntil: 1500 }), slot({ busyUntil: 1100 })], 2, 1000), 1);
  });

  it("frees a player once its time has passed", () => {
    assert.equal(pickSlot([slot({ rewound: true, busyUntil: 1000 })], 1, 1000), 0);
  });
});

describe("sets", () => {
  it("lists every cue in at least one set, so a new cue is a decision", () => {
    assert.deepEqual(cuesInNoSet(), [], "add the cue to a set in SFX_SETS (or to on-demand to never warm it)");
  });

  it("every set names real cues, and the warmable ones are small enough to warm together", () => {
    for (const [name, cues] of Object.entries(SFX_SETS)) {
      for (const cue of cues) assert.ok(cue in CUES, `${name} lists unknown cue ${cue}`);
    }
    // A set larger than the lowest tier's player cap could never be warmed whole on a low-end phone
    for (const name of WARMABLE_SETS) {
      assert.ok(filesOfSet(name).length <= BUDGETS.low.playerCap, `${name} has ${filesOfSet(name).length} files, more than the low tier's ${BUDGETS.low.playerCap} players`);
    }
  });

  it("filesOfCues lists each file once, in order", () => {
    assert.deepEqual(filesOfCues(["reward.pop", "lesson.star", "reward.appear", "ui.press"]), ["reward/pop", "ui/press"]);
  });

  it("the core set holds the sounds every screen plays", () => {
    for (const cue of ["ui.press", "lesson.answer-correct", "lesson.answer-wrong", "reward.pop", "reward.coin"]) assert.ok(SFX_SETS.core.includes(cue), cue);
  });
});

describe("which engine", () => {
  it("is audio-api on Android when its module loads, and nothing else", () => {
    assert.equal(pickBackend({ os: "android", moduleLoaded: true }).id, "audio-api");
    assert.equal(pickBackend({ os: "android", moduleLoaded: false }).id, "expo-audio", "Expo Go on Android");
    assert.equal(pickBackend({ os: "ios", moduleLoaded: true }).id, "expo-audio", "never an iPhone");
    assert.equal(pickBackend({ os: "ios", moduleLoaded: false }).id, "expo-audio");
    assert.equal(pickBackend({ os: "web", moduleLoaded: false }).id, "expo-audio");
  });

  it("an override can force expo-audio anywhere, and audio-api only where it can run", () => {
    assert.equal(pickBackend({ os: "android", moduleLoaded: true, override: "expo-audio" }).id, "expo-audio");
    assert.equal(pickBackend({ os: "android", moduleLoaded: true, override: "audio-api" }).id, "audio-api");
    const ios = pickBackend({ os: "ios", moduleLoaded: true, override: "audio-api" });
    assert.equal(ios.id, "expo-audio");
    assert.match(ios.reason, /refused/);
    assert.equal(pickBackend({ os: "android", moduleLoaded: false, override: "audio-api" }).id, "expo-audio");
  });

  it("ignores an override it does not know", () => {
    assert.equal(pickBackend({ os: "android", moduleLoaded: true, override: "wat" }).id, "audio-api");
    assert.equal(pickBackend({ os: "ios", moduleLoaded: false, override: "" }).id, "expo-audio");
  });

  it("always says why", () => {
    for (const input of [{ os: "android", moduleLoaded: true }, { os: "ios", moduleLoaded: false }, { os: "android", moduleLoaded: false }]) {
      assert.ok(pickBackend(input).reason.length > 0);
    }
  });
});

describe("the player cap (expo-audio engine)", () => {
  const entry = (file, over = {}) => ({ file, players: 1, busy: false, pinned: false, released: false, ...over });

  it("takes nothing while there is room", () => {
    assert.deepEqual(planEvictions([entry("ui/press"), entry("ui/tab")], 4, 1), []);
  });

  it("takes the least recent first (entries are least recent first)", () => {
    const entries = [entry("ui/press"), entry("ui/tab"), entry("ui/select")];
    assert.deepEqual(planEvictions(entries, 3, 1), ["ui/press"]);
    assert.deepEqual(planEvictions(entries, 3, 2), ["ui/press", "ui/tab"]);
  });

  it("takes files whose screen was left before older ones", () => {
    const entries = [entry("ui/press"), entry("ui/tab", { released: true }), entry("ui/select")];
    assert.deepEqual(planEvictions(entries, 3, 1), ["ui/tab"]);
  });

  it("never takes a pinned or a sounding file, even if that leaves the cap over", () => {
    const entries = [entry("ui/press", { pinned: true }), entry("ui/tab", { busy: true })];
    assert.deepEqual(planEvictions(entries, 2, 1), []);
  });

  it("counts every player of a file, not just the file", () => {
    assert.deepEqual(planEvictions([entry("ui/press", { players: 3 }), entry("ui/tab")], 4, 1), ["ui/press"]);
  });

  it("warms only files without a player, and no more than fit", () => {
    const have = [entry("ui/press"), entry("ui/tab")];
    assert.deepEqual(planWarm(["ui/press", "ui/select", "ui/cancel"], have, 4), ["ui/select", "ui/cancel"]);
    assert.deepEqual(planWarm(["ui/press", "ui/select", "ui/cancel"], have, 3), ["ui/select", "ui/cancel"], "ui/tab is not in the set and can go");
    assert.deepEqual(planWarm(["ui/select", "ui/cancel", "ui/lock"], [entry("ui/press", { pinned: true }), entry("ui/tab", { busy: true })], 3), ["ui/select"]);
  });

  it("never evicts its own files to make room for the rest of the set", () => {
    // Everything alive is in the set, and the cap is full: nothing new is made
    assert.deepEqual(planWarm(["ui/press", "ui/tab", "ui/select"], [entry("ui/press"), entry("ui/tab")], 2), []);
  });

  it("android's cap is lower than iOS's", () => {
    assert.ok(livePlayerCap("android") < livePlayerCap("ios"));
    assert.ok(livePlayerCap("android") >= 12);
  });

  it("retries a lost play only for what the learner is waiting on", () => {
    for (const c of ["feedback", "tap", "reward", "panel"]) assert.equal(retryAllowed(c), true, c);
    for (const c of ["stinger", "voice"]) assert.equal(retryAllowed(c), false, c);
  });
});

describe("the buffer budget (audio-api engine)", () => {
  const entry = (file, over = {}) => ({ file, bytes: decodedBytes(file), busy: false, pinned: false, released: false, ...over });

  it("the whole catalog fits the budget with room to spare", () => {
    const all = Object.keys(SFX_FILES).reduce((sum, f) => sum + decodedBytes(f), 0);
    assert.ok(all < BUFFER_BUDGET_BYTES * 0.75, `${(all / 1048576).toFixed(1)} MB of ${(BUFFER_BUDGET_BYTES / 1048576).toFixed(0)}`);
  });

  it("a mono 44.1 kHz float buffer is 4 bytes a sample", () => {
    assert.equal(decodedBytes("ui/press"), Math.ceil(0.053 * 44100) * 4);
  });

  it("drops nothing while there is room, then released, then least recent; never pinned or sounding", () => {
    const entries = [entry("ui/shop-open"), entry("game/over", { released: true }), entry("lesson/complete", { pinned: true }), entry("game/count-1", { busy: true })];
    const total = entries.reduce((s, e) => s + e.bytes, 0);
    assert.deepEqual(planBufferEvictions(entries, total + 1000, 500), []);
    assert.deepEqual(planBufferEvictions(entries, total, decodedBytes("ui/press")), ["game/over"]);
    assert.deepEqual(planBufferEvictions(entries, total, total), ["game/over", "ui/shop-open"], "pinned and sounding stay, even if that is not enough");
  });
});

describe("the outcome log", () => {
  it("counts every outcome and keeps the last entries oldest first", () => {
    const diag = createSfxDiag(3);
    diag.record("ui.press", "played");
    diag.record("ui.press", "skip-gap");
    diag.record("lesson.bubble", "late", { ms: 120 });
    diag.record("lesson.bubble", "lost", { detail: "load-timeout" });
    assert.equal(diag.counts().played, 1);
    assert.equal(diag.counts()["skip-gap"], 1);
    assert.deepEqual(diag.entries().map((e) => e.outcome), ["skip-gap", "late", "lost"], "the oldest fell off the ring");
    assert.equal(diag.entries()[1].ms, 120);
    assert.equal(diag.counts().played, 1, "counters are not a ring");
  });

  it("tells faults from by-design silence", () => {
    const diag = createSfxDiag();
    for (const o of ["gate", "skip-gap", "skip-burst", "skip-duck", "late", "played", "evicted"]) diag.record("x", o);
    assert.equal(diag.faults(), 0);
    diag.record("x", "lost");
    diag.record("x", "error", { detail: "boom" });
    assert.equal(diag.faults(), 2);
    assert.deepEqual([...FAULT_OUTCOMES].sort(), ["error", "lost"]);
  });

  it("keeps a table per cue and resets", () => {
    const diag = createSfxDiag();
    diag.record("ui.press", "played");
    diag.record("ui.press", "played");
    diag.record("ui.tab", "skip-burst");
    assert.equal(diag.perCue().get("ui.press").played, 2);
    assert.equal(diag.perCue().get("ui.tab")["skip-burst"], 1);
    diag.reset();
    assert.equal(diag.entries().length, 0);
    assert.equal(diag.counts().played, 0);
    assert.equal(diag.perCue().size, 0);
  });
});
