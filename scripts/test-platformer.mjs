#!/usr/bin/env node
/**
 * Atom Maze platformer: physics, enemies, battle and the level itself.
 * Run: npm run test:platformer
 */

import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("components/platformer/platformer-core.ts");
const { LEVELS, LEVEL_1 } = loadTs("components/platformer/platformer-levels.ts");
const battle = loadTs("components/platformer/battle-core.ts");
const intro = loadTs("components/platformer/boss-intro-core.ts");

const {
  STEP, JUMP_SPEED, GRAVITY, RUN_SPEED, MAX_HEARTS, ENEMY_KINDS,
  parseLevel, createWorld, stepWorld, landingY, resolveBattle, cameraTarget, summarize, isSolid,
} = core;

const NONE = { left: false, right: false, jump: false };
const level = (rows) => parseLevel({ id: "t", title: "t", rows });
const run = (world, input, seconds, onEvents) => {
  const out = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    const ev = stepWorld(world, typeof input === "function" ? input(i) : input, STEP);
    out.push(...ev);
    if (onEvents) onEvents(ev);
  }
  return out;
};
const flat = (cols = 30) => level([
  ...Array.from({ length: 6 }, () => ".".repeat(cols)),
  "..P" + ".".repeat(cols - 4) + "F",
  "#".repeat(cols),
  "#".repeat(cols),
]);

test("parseLevel reads every tile kind and checks the format", () => {
  const l = level(["...F", "P.o^", "####"]);
  assert.equal(l.cols, 4);
  assert.equal(l.rows, 3);
  assert.deepEqual(l.start, { x: 0.5, y: 2 });
  assert.deepEqual(l.goal, { x: 3.5, y: 1 });
  assert.equal(l.coins.length, 1);
  assert.deepEqual(l.spikes, [{ x: 3, y: 1 }]);
  assert.equal(l.solid[2 * 4 + 1], 1);
  assert.throws(() => level(["P.F", "##"]), /wide/);
  assert.throws(() => level(["..F", "###"]), /no start/);
  assert.throws(() => level(["P..", "###"]), /no goal/);
  assert.throws(() => level(["P@F", "###"]), /unknown tile/);
});

test("enemies stand on the ground, and a bee hangs in its tile", () => {
  const l = level(["....F", "Ps.b.", "#####"]);
  const slime = l.enemies.find((e) => e.kind === "slime");
  assert.ok(Math.abs(slime.y + ENEMY_KINDS.slime.h - 2) < 1e-9, "slime bottom on the ground");
  const bee = l.enemies.find((e) => e.kind === "bee");
  assert.ok(bee.y > 0.8 && bee.y < 1.5);
});

test("the hero lands on the ground and stays there", () => {
  const w = createWorld(flat());
  run(w, NONE, 1);
  assert.ok(w.hero.onGround);
  assert.ok(Math.abs(w.hero.y + w.hero.h - 7) < 1e-3, `feet at ${w.hero.y + w.hero.h}`);
  assert.equal(w.status, "playing");
});

test("running accelerates to the top speed, stops at the invisible left wall, and friction stops it", () => {
  const w = createWorld(flat());
  run(w, { ...NONE, right: true }, 0.8);
  assert.ok(Math.abs(w.hero.vx - RUN_SPEED) < 1e-6);
  const startX = w.hero.x;
  run(w, NONE, 0.5);
  assert.equal(w.hero.vx, 0);
  assert.ok(w.hero.x > startX);
  run(w, { ...NONE, left: true }, 6);
  assert.equal(w.hero.x, 0, "stopped by the wall");
  assert.equal(w.hero.facing, -1);
});

test("a held jump rises about 2.9 tiles, a tap about a fifth of that or more but under a tile", () => {
  const apex = (held) => {
    const w = createWorld(flat());
    run(w, NONE, 0.5);
    const floor = w.hero.y;
    let top = floor;
    run(w, (i) => ({ ...NONE, jump: held ? true : i < 2 }), 1.2, () => (top = Math.min(top, w.hero.y)));
    return floor - top;
  };
  const full = apex(true);
  assert.ok(full > 2.7 && full < 3.05, `full jump ${full}`);
  assert.ok(Math.abs(full - JUMP_SPEED ** 2 / (2 * GRAVITY)) < 0.25);
  const tap = apex(false);
  assert.ok(tap > 0.3 && tap < 1.1, `tap jump ${tap}`);
});

test("the hero clears a 2 tile step but not a 3 tile wall", () => {
  const make = (height) => {
    const rows = Array.from({ length: 10 }, () => ".".repeat(20));
    rows[9 - 2] = "..P" + ".".repeat(17);
    rows[8] = "#".repeat(20);
    rows[9] = "#".repeat(20);
    for (let k = 0; k < height; k++) {
      const r = 7 - k;
      rows[r] = rows[r].slice(0, 10) + "#" + rows[r].slice(11);
    }
    rows[0] = rows[0].slice(0, 19) + "F";
    return createWorld(parseLevel({ id: "s", title: "s", rows }));
  };
  const attempt = (height) => {
    const w = make(height);
    run(w, NONE, 0.3);
    let jumped = false;
    run(w, () => {
      // run right and jump whenever the wall is one tile ahead
      const near = w.hero.x + w.hero.w > 9 && !jumped;
      if (near) jumped = true;
      return { left: false, right: true, jump: w.hero.x + w.hero.w > 8.6 && w.hero.x < 12 };
    }, 2);
    return w.hero.x > 11;
  };
  assert.ok(attempt(2), "2 tiles");
  assert.ok(!attempt(3), "3 tiles");
});

test("coyote time lets the hero jump just after leaving a ledge, a buffered press jumps on landing", () => {
  const rows = Array.from({ length: 10 }, () => ".".repeat(20));
  rows[6] = "..P" + ".".repeat(17);
  rows[7] = "#".repeat(6) + ".".repeat(14);
  rows[8] = "#".repeat(6) + ".".repeat(14);
  rows[9] = "#".repeat(6) + ".".repeat(14);
  rows[0] = rows[0].slice(0, 19) + "F";
  const w = createWorld(parseLevel({ id: "c", title: "c", rows }));
  run(w, NONE, 0.2);
  let events = [];
  // walk off the edge, then press jump 0.06 s after leaving it
  let left = -1;
  run(w, (i) => {
    if (left < 0 && !w.hero.onGround) left = i;
    return { left: false, right: true, jump: left >= 0 && i - left >= 4 };
  }, 1.6, (ev) => events.push(...ev));
  assert.ok(left >= 0, "walked off the ledge");
  assert.ok(events.some((e) => e.type === "jump"), "jumped after leaving the ledge");
});

test("coins are picked up once", () => {
  const w = createWorld(level(["........F", ".P.o.....", "#########"]));
  const ev = run(w, { ...NONE, right: true }, 1.5);
  assert.equal(ev.filter((e) => e.type === "coin").length, 1);
  assert.equal(w.stats.coins, 1);
  assert.equal(w.coinTaken[0], true);
});

test("spikes cost a heart, push the hero away and give a moment of grace", () => {
  const w = createWorld(level(["........F", ".P..^....", "#########"]));
  const ev = run(w, { ...NONE, right: true }, 1.2);
  assert.equal(ev.filter((e) => e.type === "hurt").length, 1, "hurt once, not every step");
  assert.equal(w.hearts, MAX_HEARTS - 1);
  assert.ok(w.hero.invulnerable >= 0);
});

test("a gem is worth five coins and is picked up once", () => {
  const w = createWorld(level(["........F", ".P.$.....", "#########"]));
  const ev = run(w, { ...NONE, right: true }, 1.5);
  assert.equal(ev.filter((e) => e.type === "gem").length, 1);
  assert.equal(w.stats.coins, core.GEM_VALUE);
  assert.equal(w.gemTaken[0], true);
  assert.equal(core.summarize(w).score >= core.GEM_VALUE * core.POINTS.coin, true);
  const l = level(["........F", ".P.$o....", "#########"]);
  assert.equal(core.maxScoreOf(l), (1 + core.GEM_VALUE) * core.POINTS.coin + 3 * core.POINTS.heart + core.POINTS.flag, "gems count toward the best score");
});

test("a gem block gives a gem when bumped from below, once", () => {
  const w = createWorld(level(["........F", "...G.....", ".........", ".P.......", "#########"]));
  w.hero.x = 3.15;
  w.hero.y = 2.4;
  w.hero.vy = -8;
  w.hero.onGround = false;
  const ev = run(w, NONE, 0.6);
  assert.equal(ev.filter((e) => e.type === "block" && e.reward === "gem").length, 1);
  assert.equal(w.stats.coins, core.GEM_VALUE);
  assert.equal(w.blockUsed[0], true);
});

test("a saw costs a heart, wherever it hangs, and gives a moment of grace", () => {
  const w = createWorld(level(["........F", ".P..Z....", "#########"]));
  const ev = run(w, { ...NONE, right: true }, 1.2);
  assert.equal(ev.filter((e) => e.type === "hurt").length, 1);
  assert.equal(w.hearts, MAX_HEARTS - 1);
  const high = createWorld(level(["........F", "....Z....", ".P.......", "#########"]));
  run(high, { ...NONE, right: true }, 1.2);
  assert.equal(high.hearts, MAX_HEARTS, "a saw above the hero's head does nothing");
});

test("a conveyor belt carries the hero standing on it, and only while they stand on it", () => {
  const right = createWorld(level(["........F", ".P.......", "#>>>>>###"]));
  right.hero.x = 1.2;
  run(right, NONE, 0.2);
  const x0 = right.hero.x;
  run(right, NONE, 0.5);
  assert.ok(right.hero.x - x0 > core.CONVEYOR_SPEED * 0.4, `carried right (${right.hero.x - x0})`);
  const left = createWorld(level(["........F", "....P....", "###<<<<##"]));
  run(left, NONE, 0.2);
  const y0 = left.hero.x;
  run(left, NONE, 0.5);
  assert.ok(y0 - left.hero.x > core.CONVEYOR_SPEED * 0.4, "carried left");
  const plain = createWorld(level(["........F", ".P.......", "#########"]));
  run(plain, NONE, 1);
  assert.ok(Math.abs(plain.hero.x + plain.hero.w / 2 - 1.5) < 0.01, "ground does not carry");
  const l = right.level;
  assert.equal(l.conveyor.filter((v) => v === 1).length, 5);
  assert.equal(l.solid[2 * l.cols + 1], 1, "a belt is solid");
  assert.equal(view.groundArt(l, 1, 2), null, "and has its own picture");
});

test("lava is a pit like water, and a bridge is a one-way plank with its own picture", () => {
  const l = level(["....F", "P_._.", "##%##", "##%##"]);
  assert.equal(l.water[2 * l.cols + 2], 2);
  assert.equal(view.waterArt(l, 2, 2), "water_top", "the surface of a lava pit");
  assert.equal(view.waterArt(l, 2, 3), "water");
  assert.equal(l.oneway[1 * l.cols + 1], 1);
  assert.equal(l.bridge[1 * l.cols + 1], 1);
  const plank = level(["..F", "P-.", "###"]);
  assert.equal(plank.bridge[1 * plank.cols + 1], 0);
});

const grid = (rows) => level(rows);

test("falling into a pit costs a heart and sends the hero back to the checkpoint", () => {
  const w = createWorld(grid([
    "..............F",
    "..............#",
    ".P..C.........#",
    "#######...#####",
    "#######~~~#####",
  ]));
  run(w, () => ({ ...NONE, right: w.stats.falls === 0 }), 3);
  assert.ok(w.stats.falls >= 1, "fell");
  assert.equal(w.hearts, MAX_HEARTS - 1);
  assert.ok(w.hero.y < 6, "back on the map");
  assert.equal(w.checkpoint, 1, "respawned at the checkpoint it had passed");
});

test("the checkpoint is remembered when passed", () => {
  const w = createWorld(grid(["..........F", ".P.C.......", "###########"]));
  const ev = run(w, { ...NONE, right: true }, 1.5);
  assert.ok(ev.some((e) => e.type === "checkpoint"));
  assert.equal(w.checkpoint, 1);
});

test("walkers turn at an edge and at a wall", () => {
  const w = createWorld(grid([
    "..........",
    "..........",
    "..s..#....",
    "#######...",
    "#######...",
  ].map((r, i) => (i === 2 ? "P.s..#...F" : r))));
  const slime = w.enemies[0];
  w.hero.invulnerable = 999;
  const seen = new Set();
  run(w, NONE, 8, () => seen.add(slime.dir));
  assert.ok(slime.x >= 0 && slime.x < 5, `stayed on its stretch: x ${slime.x}`);
  assert.equal(seen.size, 2, "turned around");
});

test("a bee flies side to side and never falls", () => {
  const w = createWorld(level(["P....b...F", "#.........", "#........."].map((r) => r.padEnd(10, "."))));
  const bee = w.enemies[0];
  const y0 = bee.y;
  const xs = [];
  run(w, NONE, 6, () => xs.push(bee.x));
  assert.ok(Math.max(...xs) - Math.min(...xs) > 3, "moves about 5 tiles");
  assert.ok(Math.abs(bee.y - y0) < 0.5);
});

function standingNextToEnemy(kind = "slime") {
  const ch = { slime: "s", snail: "n", boss: "B" }[kind];
  const w = createWorld(level([`.......F`, `.P${ch}.....`, "########"].map((r) => r.padEnd(8, "."))));
  w.hero.x = w.enemies[0].x - 0.3;
  w.hero.y = w.enemies[0].y + w.enemies[0].h - 1;
  return w;
}

test("touching an enemy opens a battle and stops the world", () => {
  const w = standingNextToEnemy();
  const ev = run(w, NONE, 0.1);
  assert.ok(ev.some((e) => e.type === "battle"));
  assert.equal(w.status, "battle");
  const t = w.t;
  assert.deepEqual(stepWorld(w, { ...NONE, right: true }), [], "nothing moves in a battle");
  assert.equal(w.t, t);
});

test("a right answer beats a 1 life enemy and the hero hops on", () => {
  const w = standingNextToEnemy();
  run(w, NONE, 0.1);
  const r = resolveBattle(w, true);
  assert.equal(r.continues, false);
  assert.ok(r.events.some((e) => e.type === "defeat"));
  assert.equal(w.enemies[0].alive, false);
  assert.equal(w.status, "playing");
  assert.equal(w.stats.defeated, 1);
  assert.equal(w.stats.correct, 1);
  run(w, NONE, 1);
  assert.equal(w.status, "playing", "the beaten enemy does not start another battle");
});

test("a 2 life enemy asks again, and a wrong answer costs a heart but keeps its damage", () => {
  const w = standingNextToEnemy("snail");
  run(w, NONE, 0.1);
  assert.equal(w.enemies[0].hp, 2);
  assert.equal(resolveBattle(w, true).continues, true);
  assert.equal(w.status, "battle");
  assert.equal(w.enemies[0].hp, 1);
  const r = resolveBattle(w, false);
  assert.equal(r.continues, false);
  assert.ok(r.events.some((e) => e.type === "hurt" && e.reason === "battle"));
  assert.equal(w.hearts, MAX_HEARTS - 1);
  assert.equal(w.status, "playing");
  assert.equal(w.enemies[0].alive, true);
  assert.equal(w.enemies[0].hp, 1, "it can be finished later");
  assert.ok(w.hero.invulnerable > 1, "a moment of grace so the same enemy does not catch the hero at once");
  assert.ok(w.hero.vy < 0);
});

test("losing the last heart loses the run", () => {
  const w = standingNextToEnemy();
  w.hearts = 1;
  run(w, NONE, 0.1);
  const r = resolveBattle(w, false);
  assert.equal(w.status, "lost");
  assert.ok(r.events.some((e) => e.type === "lost"));
  assert.deepEqual(stepWorld(w, NONE), []);
});

test("resolveBattle outside a battle does nothing", () => {
  const w = createWorld(flat());
  assert.deepEqual(resolveBattle(w, true), { events: [], continues: false });
  assert.equal(w.stats.correct, 0);
});

test("the flag ends the run, but a boss still standing keeps it shut", () => {
  const w = createWorld(level(["........", ".P.B..F.", "########"]));
  w.hero.x = 6.2;
  w.hero.y = 0.02;
  w.hero.invulnerable = 5;
  const ev1 = run(w, NONE, 0.1);
  assert.ok(ev1.some((e) => e.type === "flag-locked"));
  assert.equal(w.status, "playing");
  w.enemies[0].alive = false;
  const ev2 = run(w, NONE, 0.1);
  assert.ok(ev2.some((e) => e.type === "goal"));
  assert.equal(w.status, "won");
});

test("camera stays inside the level and leads the facing direction", () => {
  assert.equal(cameraTarget(1, 10, 100), 0);
  assert.equal(cameraTarget(99, 10, 100), 90);
  assert.equal(cameraTarget(5, 20, 10), 0, "a level narrower than the view");
  assert.ok(cameraTarget(50, 10, 100, 1) > cameraTarget(50, 10, 100, -1));
});

test("summary: score, the best possible score, time and stars", () => {
  const w = createWorld(flat());
  const max = core.maxScoreOf(w.level);
  assert.equal(max, w.level.coins.length * 10 + w.level.enemies.length * 100 + MAX_HEARTS * 50 + 200);
  w.stats.coins = 4;
  w.stats.defeated = 2;
  w.stats.time = 12.5;
  assert.deepEqual(summarize(w), { score: 240, maxScore: max, stars: 0, won: false, time: 12.5 });
  w.status = "won";
  w.hearts = 2;
  const s = summarize(w);
  assert.equal(s.score, 40 + 200 + 200 + 100);
  assert.equal(s.stars, core.starsFor(s.score, max, true));
  assert.equal(s.time, 12.5);
});

test("stars follow the points: the flag gives one, 60% of the best score two, 85% three", () => {
  const { starsFor, STAR_SHARE } = core;
  assert.equal(starsFor(999, 1000, false), 0, "no flag, no stars");
  assert.equal(starsFor(0, 1000, true), 1);
  assert.equal(starsFor(STAR_SHARE.two * 1000 - 1, 1000, true), 1);
  assert.equal(starsFor(STAR_SHARE.two * 1000, 1000, true), 2);
  assert.equal(starsFor(STAR_SHARE.three * 1000 - 1, 1000, true), 2);
  assert.equal(starsFor(STAR_SHARE.three * 1000, 1000, true), 3);
  assert.equal(starsFor(1000, 1000, true), 3);
});

test("stars: every level can reach three (the best score is the sum of what is in it) and skipping every enemy cannot", () => {
  for (const def of LEVELS) {
    const l = parseLevel(def);
    const max = core.maxScoreOf(l);
    assert.equal(core.starsFor(max, max, true), 3);
    const noFights = l.coins.length * 10 + 3 * 50 + 200;
    assert.ok(core.starsFor(noFights, max, true) < 3, `${def.id}: running past every enemy is not three stars`);
  }
});
test("the world is deterministic", () => {
  const play = () => {
    const w = createWorld(parseLevel(LEVEL_1));
    run(w, (i) => ({ left: false, right: i % 200 < 150, jump: i % 50 < 20 }), 8);
    return JSON.stringify({ h: w.hero, e: w.enemies.map((e) => [e.x, e.y]), s: w.stats, hearts: w.hearts, status: w.status });
  };
  assert.equal(play(), play());
});

/* ---------------------------- the real level --------------------------- */

test("every level parses, is rectangular and has one start and one flag", () => {
  assert.equal(LEVELS.length, 25, "the tutorial's five and five for each of the four units");
  LEVELS.forEach((def, n) => {
    const l = parseLevel(def);
    assert.ok(l.cols >= 60, `${def.id} is long enough`);
    assert.equal(def.rows.join("").split("P").length - 1, 1, "one start");
    assert.equal(def.rows.join("").split("F").length - 1, 1, "one flag");
    assert.ok(l.checkpoints.length >= 1, "at least one checkpoint");
    assert.ok(l.coins.length >= 8, `${def.id} has coins`);
    assert.ok(l.enemies.length >= 2, `${def.id} has enemies`);
    // The last level of each world has the boss, so the flag is open everywhere else
    assert.equal(l.enemies.some((e) => e.kind === "boss"), n % 5 === 4, `${def.id} boss`);
    // Every sign digit has its words
    assert.equal(l.signs.length, (def.signs ?? []).length, `${def.id} signs`);
    assert.ok(l.signs.every((sg) => sg.text.length > 0));
  });
});

test("levels introduce their mechanics one after another", () => {
  const l = LEVELS.map(parseLevel);
  assert.ok(l[0].signs.length >= 6, "level 1 is the tutorial");
  assert.equal(l[0].blocks.length + l[0].springs.length + l[0].platforms.length + l[0].keys.length, 0, "level 1 has nothing but ground");
  assert.ok(l[1].blocks.some((b) => b.kind === "coin") && l[1].blocks.some((b) => b.kind === "brick") && l[1].blocks.some((b) => b.kind === "heart"));
  assert.ok(l[1].oneway.some((v) => v === 1) && l[1].spikes.length > 0);
  assert.ok(l[2].springs.length >= 4);
  assert.ok(l[3].platforms.length >= 3 && l[3].keys.length === 1 && l[3].blocks.some((b) => b.kind === "lock"));
  assert.ok(l[4].platforms.length > 0 && l[4].springs.length > 0 && l[4].keys.length > 0);
  // The first unit: gems, then belts, then saws, then lava, then all of it (each adds ONE new thing, which the first sign explains)
  assert.ok(l[5].gems.length >= 6, "stage 1 has gems");
  assert.ok(l[6].conveyor.some((v) => v === 1) && l[6].conveyor.some((v) => v === -1) && l[6].spikes.length > 0, "stage 2 has belts both ways");
  assert.ok(l[7].saws.length >= 5, "stage 3 has saws");
  assert.ok(l[8].water.some((v) => v === 2) && l[8].platforms.length > 0 && l[8].springs.length > 0 && l[8].keys.length === 1, "stage 4 has lava, platforms, a spring and a key");
  assert.ok(l[9].conveyor.some((v) => v !== 0) && l[9].saws.length > 0 && l[9].water.some((v) => v === 2) && l[9].gems.length > 0, "stage 5 has everything");
  // The second unit: bridges, then gem blocks, then islands that halve, then steps, then all of it
  assert.ok(l[10].bridge.filter((v) => v === 1).length >= 20 && l[10].water.every((v) => v !== 2), "unit 2, stage 1 has bridges over water");
  assert.ok(l[11].blocks.filter((b) => b.kind === "gem").length >= 6, "unit 2, stage 2 has gem blocks");
  assert.ok(l[12].oneway.some((v) => v === 1) && l[12].spikes.length > 0, "unit 2, stage 3 has planks and spikes");
  assert.ok(l[13].spikes.length > 0 && l[13].blocks.some((b) => b.kind === "gem"), "unit 2, stage 4 has spikes and gem blocks");
  assert.ok(l[14].bridge.some((v) => v === 1) && l[14].conveyor.some((v) => v !== 0) && l[14].saws.length > 0 && l[14].water.some((v) => v === 2) && l[14].blocks.some((b) => b.kind === "gem"), "unit 2, stage 5 has everything");
});

test("half-life hollow: the islands halve (16, 8, 4, 2 tiles) and so do their coins (8, 4, 2, 1)", () => {
  const def = LEVELS.find((d) => d.id === "half-life-hollow");
  const l = parseLevel(def);
  const top = def.rows[def.rows.length - 2];
  const runs = [...top.matchAll(/#+/g)].map((m) => [m.index, m[0].length]).slice(1, 5);
  assert.deepEqual(runs.map(([, n]) => n), [16, 8, 4, 2]);
  const coins = runs.map(([c, n]) => l.coins.filter((k) => k.x >= c && k.x < c + n).length);
  assert.deepEqual(coins, [8, 4, 2, 1]);
});

test("radiation beams: dark, then a warning, then on; a row of beams side by side keeps time together, and the next zone is half a cycle apart", () => {
  const seq = [];
  for (let t = 0; t < core.BEAM_PERIOD; t += 0.05) seq.push(core.beamPhase(0, t));
  assert.equal(seq[0], "off");
  assert.deepEqual([...new Set(seq)], ["off", "warn", "on"], "off, warn, on, in that order");
  const secs = (phase) => seq.filter((p) => p === phase).length * 0.05;
  assert.ok(Math.abs(secs("on") - core.BEAM_ON) < 0.1 && Math.abs(secs("warn") - core.BEAM_WARN) < 0.1);
  assert.ok(secs("off") >= 1, "the dark is long enough to cross a three tile beam");
  for (let t = 0; t < 7; t += 0.1) {
    assert.equal(core.beamPhase(0, t), core.beamPhase(core.BEAM_ZONE - 1, t), "one zone, one clock");
    assert.equal(core.beamPhase(0, t + core.BEAM_PERIOD / 2), core.beamPhase(core.BEAM_ZONE, t), "the next zone is half a cycle later");
  }
});

test("dose sources: the field is a disc, lead on the line shields, and the meter fills, costs a heart when full and drains outside", () => {
  const rows = ["...........", "...........", "...........", "...........", "P.D.HH....F", "###########"];
  const l = parseLevel({ id: "dose-test", title: "t", rows });
  assert.equal(l.doseSources.length, 1);
  assert.deepEqual(l.doseSources[0], { c: 2, r: 4 });
  const src = l.doseSources[0];
  assert.ok(core.inDoseField(l, src, 2.5, 4.5), "in the middle of the field");
  assert.ok(!core.inDoseField(l, src, 2.5 + core.DOSE_RADIUS + 0.2, 4.5), "outside the disc");
  assert.ok(!core.inDoseField(l, src, 6.0, 4.5), "behind lead: the line passes through lead blocks");
  // Standing in the field fills the meter at 1 / DOSE_FILL_TIME a second; a full meter costs one heart and starts again
  const w = createWorld(l);
  w.hero.x = 1.2; w.hero.y = 3; w.hero.onGround = true;
  for (let t = 0; t < core.DOSE_FILL_TIME / 2; t += 1 / 60) core.stepWorld(w, NONE, 1 / 60);
  assert.ok(w.dose > 0.45 && w.dose < 0.6, `half full after half the time (${w.dose})`);
  assert.equal(w.hearts, core.MAX_HEARTS);
  for (let t = 0; t < core.DOSE_FILL_TIME / 2 + 0.2; t += 1 / 60) core.stepWorld(w, NONE, 1 / 60);
  assert.equal(w.hearts, core.MAX_HEARTS - 1, "a full meter costs a heart");
  assert.ok(w.dose < 0.3, "and starts again");
  // Out of the field it drains
  const v = createWorld(l);
  v.hero.x = 8; v.hero.y = 3; v.hero.onGround = true; v.dose = 1 - 1e-9;
  for (let t = 0; t < core.DOSE_DRAIN_TIME + 0.1; t += 1 / 60) core.stepWorld(v, NONE, 1 / 60);
  assert.equal(v.dose, 0);
  assert.equal(v.hearts, core.MAX_HEARTS);
});

test("dose sources: crossing a field at running speed never fills the meter, and no level places an enemy inside a field", () => {
  assert.ok((2 * core.DOSE_RADIUS) / core.RUN_SPEED < core.DOSE_FILL_TIME * 0.7, "a quick crossing is well inside the time to fill");
  for (const def of LEVELS) {
    const l = parseLevel(def);
    for (const e of l.enemies) {
      for (const src of l.doseSources) {
        const d = Math.hypot(e.x + 0.35 - (src.c + 0.5), e.y + 0.25 - (src.r + 0.5));
        assert.ok(d > core.DOSE_RADIUS, `${def.id}: a ${e.kind} stands in a dose field`);
      }
    }
  }
});

test("radiation beams: a beam ends at the first solid tile, lead stops it, and only a beam that is on costs a heart", () => {
  const l = parseLevel({ id: "beam-test", title: "t", rows: ["..V..V....", "..........", "..H.......", "..........", "P........F", "##########"] });
  assert.equal(l.beams.length, 2);
  const lead = l.beams.find((b) => b.c === 2);
  const open = l.beams.find((b) => b.c === 5);
  assert.equal(lead.endRow, 2, "a lead block above the hero stops the beam");
  assert.equal(open.endRow, 5, "an open beam runs down to the ground");
  assert.equal(l.lead.filter((v) => v === 1).length, 1);
  assert.ok(isSolid(l, 2, 2), "lead is solid");
  const hit = (c, t) => {
    const w = createWorld(l);
    w.hero.x = c + 0.15; w.hero.y = 4; w.hero.onGround = true; w.t = t;
    core.stepWorld(w, NONE, 1 / 60);
    return w.hearts;
  };
  const onT = core.BEAM_PERIOD - core.BEAM_ON / 2;
  assert.equal(core.beamPhase(5, onT), "on");
  assert.equal(hit(5, onT), core.MAX_HEARTS - 1, "in a beam that is on");
  assert.equal(hit(5, 0), core.MAX_HEARTS, "in a beam that is dark");
  assert.equal(hit(2, onT), core.MAX_HEARTS, "under a lead roof the beam never reaches the hero");
});

test("level: everything stands on something, and nothing is buried in the ground", () => {
  for (const def of LEVELS) {
    const l = parseLevel(def);
    const at = (c, r) => isSolid(l, c, r);
    const ground = (p) => at(Math.floor(p.x), Math.round(p.y));
    assert.ok(ground(l.start), "start on the ground");
    assert.ok(ground(l.goal), "flag on the ground");
    for (const c of l.checkpoints) assert.ok(ground(c), "checkpoint on the ground");
    for (const s of l.spikes) assert.ok(at(s.x, s.y + 1), "spikes on the ground");
    for (const e of l.enemies) {
      const k = ENEMY_KINDS[e.kind];
      if (!k.flying) assert.ok(at(Math.floor(e.x + k.w / 2), Math.round(e.y + k.h)), `${e.kind} at ${e.x} on the ground`);
      assert.ok(!at(Math.floor(e.x + k.w / 2), Math.floor(e.y + k.h / 2)), `${e.kind} not inside a block`);
    }
    for (const c of l.coins) assert.ok(!at(Math.floor(c.x), Math.floor(c.y)), "coin not inside a block");
  }
});

test("unit levels: each adds at most ONE new mechanic, explained by the first sign near the start; the rest of the signs are for the lessons", () => {
  const kinds = (l) => ({
    gems: l.gems.length > 0 || l.blocks.some((b) => b.kind === "gem"),
    belts: l.conveyor.some((v) => v !== 0),
    saws: l.saws.length > 0,
    lava: l.water.some((v) => v === 2),
    bridge: l.bridge.some((v) => v === 1),
    gemBlocks: l.blocks.some((b) => b.kind === "gem"),
    beams: l.beams.length > 0,
    lead: l.lead.some((v) => v === 1),
    dose: l.doseSources.length > 0,
    shelter: l.doseSources.length > 0 && l.lead.some((v) => v === 1),
  });
  const seen = new Set();
  LEVELS.slice(0, 5).forEach((def) => Object.entries(kinds(parseLevel(def))).forEach(([k, v]) => v && seen.add(k)));
  assert.equal(seen.size, 0, "the tutorial has none of these");
  const introduced = ["gems", "belts", "saws", "lava", null, "bridge", "gemBlocks", null, null, null, "beams", "lead", null, null, null, "dose", "shelter", null, null, null];
  const signIcon = { gems: "gem", belts: "belt", saws: "saw", lava: "lava", bridge: "bridge", gemBlocks: "gem", beams: "beam", lead: "lead", dose: "dose", shelter: "lead" };
  LEVELS.slice(5).forEach((def, i) => {
    const n = i % 5;
    const l = parseLevel(def);
    const now = Object.entries(kinds(l)).filter(([, v]) => v).map(([k]) => k);
    const fresh = now.filter((k) => !seen.has(k) && !(k === "gemBlocks" && i < 5));
    assert.deepEqual(fresh, introduced[i] ? [introduced[i]] : [], `${def.id} adds only ${introduced[i] ?? "nothing"}`);
    fresh.forEach((k) => seen.add(k));
    assert.ok(l.signs.length >= 3, `${def.id}: three signs`);
    const first = l.signs[0];
    assert.ok(first.c <= 12, `${def.id}: the first sign is at the start`);
    if (introduced[i]) assert.equal(first.icon, signIcon[introduced[i]], `${def.id}: the first sign shows the new thing`);
    const lessonSigns = l.signs.filter((sg) => sg.icon === "lesson");
    assert.ok(lessonSigns.length >= 2, `${def.id}: at least two signs teach a little of the lesson`);
    assert.ok(lessonSigns[0].text.startsWith(`Lesson ${n + 1}, `), `${def.id}: the first lesson sign names its lesson`);
    assert.ok(l.signs.every((sg) => sg.icon !== "tip"), `${def.id}: no tips, only the mechanic and the lesson`);
    assert.ok(l.signs.every((sg) => sg.icon !== "sign"), `${def.id}: every sign shows a picture`);
  });
  assert.equal(seen.has("bridge") && seen.has("gemBlocks"), true, "unit 2 brings the bridge and the gem block");
  assert.equal(seen.has("beams") && seen.has("lead"), true, "unit 3 brings the radiation beam and the lead block (two new things, one a level)");
  assert.equal(seen.has("dose") && seen.has("shelter"), true, "unit 4 brings the dose source and the lead shelter (two new things, one a level)");
});

test("signs name the thing they talk about: the icon is one the game can draw, and never a plain signpost in the story levels", () => {
  const known = ["sign", "move", "jump", "coin", "gem", "enemy", "boss", "checkpoint", "door", "spring", "plank", "bridge", "belt", "saw", "lava", "water", "key", "lock", "block", "heart", "brick", "spikes", "platform", "lift", "beam", "lead", "dose", "lesson", "tip"];
  for (const def of LEVELS) {
    const l = parseLevel(def);
    for (const sg of l.signs) {
      assert.ok(known.includes(sg.icon), `${def.id}: icon ${sg.icon}`);
      assert.notEqual(sg.icon, "sign", `${def.id}: "${sg.text.slice(0, 30)}" has a picture`);
    }
  }
  const first = parseLevel(LEVELS[0]).signs;
  assert.deepEqual(first.slice(0, 2).map((sg) => sg.icon), ["move", "jump"], "the arrow buttons, then the jump button");
});

test("a won fight gives the hero a moment of grace without the hurt blink; a hurt blinks", () => {
  const fight = () => {
    const world = core.createWorld(core.parseLevel(LEVELS[0]));
    const enemy = world.enemies[0];
    enemy.hp = 1; enemy.alive = true;
    world.status = "battle"; world.battleEnemy = enemy.id;
    return world;
  };
  const won = fight();
  core.resolveBattle(won, true);
  assert.ok(won.hero.invulnerable > 0, "grace, so the next foe waits");
  assert.equal(won.hero.blink, false, "but no flicker like a hurt");
  const lost = fight();
  core.resolveBattle(lost, false);
  assert.equal(lost.hero.blink, true);
  assert.ok(lost.hero.invulnerable > 0);
  for (let i = 0; i < 240 && lost.status === "playing"; i++) core.stepWorld(lost, { left: false, right: false, jump: false }, 1 / 60);
  assert.equal(lost.hero.invulnerable, 0);
  assert.equal(lost.hero.blink, false, "the blink ends with the grace");
});

test("levels run on past their door: the exit zooms in on it, so the world must not end right behind it", () => {
  for (const def of LEVELS) {
    const l = parseLevel(def);
    assert.ok(l.cols - l.goal.x >= 3.4, `${def.id}: only ${l.cols - l.goal.x} tiles after the door`);
  }
  const reactor = parseLevel(LEVELS.find((d) => d.id === "reactor-core"));
  assert.ok(reactor.cols - reactor.goal.x >= 8, "the Reactor Core's exit is the grandest: ground and sky go on well past the door");
});

test("level: a sign stands on something, so it can be read", () => {
  for (const def of LEVELS) {
    const l = parseLevel(def);
    for (const sg of l.signs) {
      const below = l.solid[(sg.r + 1) * l.cols + sg.c] === 1 || l.oneway[(sg.r + 1) * l.cols + sg.c] === 1;
      assert.ok(below, `${def.id}: sign at column ${sg.c}, row ${sg.r} floats`);
    }
  }
});

test("level: a spring beside a pit throws the hero over it (run at it, hold right, no jump)", () => {
  let checked = 0;
  for (const def of LEVELS) {
    const plain = { ...def, rows: def.rows.map((r) => r.replace(/[slnmbB]/g, ".")) };
    const l = parseLevel(plain);
    for (const sp of l.springs) {
      // the pit is the first column of liquid within four tiles to the right of the spring
      let pit = -1;
      for (let c = sp.c + 1; c <= sp.c + 4 && pit < 0; c++) if (l.water[(l.rows - 1) * l.cols + c] !== 0) pit = c;
      if (pit < 0) continue;
      let end = pit;
      while (end < l.cols && l.water[(l.rows - 1) * l.cols + end] !== 0) end++;
      checked++;
      const w = createWorld(l);
      w.hero.x = sp.c - 2.5;
      w.hero.y = sp.r + 1 - w.hero.h;
      w.hero.onGround = true;
      let landed = false;
      run(w, () => ({ ...NONE, right: true }), 4, () => {
        if (w.hero.onGround && w.hero.x > end) landed = true;
      });
      assert.ok(landed && w.stats.falls === 0, `${def.id}: the spring at column ${sp.c} does not carry the hero over the ${end - pit} wide pit (ends at x ${w.hero.x.toFixed(1)}, falls ${w.stats.falls})`);
    }
  }
  assert.ok(checked >= 2, "some springs were checked");
});

test("level: the ground has no step above 2 tiles and no gap wider than 4 tiles, unless a spring or a platform helps", () => {
  for (const def of LEVELS) {
    const l = parseLevel(def);
    const wall = (c, r) => "#<>_H".includes(def.rows[r][c]);
    const top = [];
    for (let c = 0; c < l.cols; c++) {
      let t = l.rows;
      for (let r = 0; r < l.rows; r++) if (wall(c, r)) { t = r; break; }
      top.push(t);
    }
    const lockCols = new Set(l.blocks.filter((b) => b.kind === "lock").map((b) => b.c));
    const springNear = (c) => l.springs.some((sp) => sp.c <= c && c - sp.c <= 5);
    let gap = 0;
    for (let c = 0; c < l.cols; c++) {
      const hasFloor = top[c] <= l.rows - 2;
      if (!hasFloor) { gap += 1; continue; }
      if (gap > 4) assert.ok(springNear(c - gap) || platformsBridge(l, c - gap, c), `${def.id}: gap of ${gap} before column ${c}`);
      if (c > 0 && top[c - 1] <= l.rows - 2 && !lockCols.has(c) && !lockCols.has(c - 1)) {
        assert.ok(top[c - 1] - top[c] <= 2 || springNear(c - 1), `${def.id}: step of ${top[c - 1] - top[c]} at column ${c}`);
      }
      gap = 0;
      // a step up after a gap too: the platforms or spring must put the hero within a jump of the new ground
      if (c > 0 && top[c - 1] > l.rows - 2) assert.ok(top[c] >= l.rows - 4 || springNear(c) || l.platforms.length > 0, `${def.id}: a high ledge after a gap at ${c}`);
    }
  }
});

function platformsBridge(l, from, to) {
  // The ground ends at column from - 1 and starts again at `to`. What a moving platform can cover is where it swings;
  // what is left must be no more than 4 tiles wide anywhere along the way.
  const covered = new Set();
  for (const p of l.platforms) {
    const a = p.axis === "x" ? Math.floor(p.x - p.range) : Math.floor(p.x);
    const b = p.axis === "x" ? Math.ceil(p.x + p.range + p.w) : Math.ceil(p.x + p.w);
    for (let c = a; c < b; c++) covered.add(c);
  }
  for (let c = from; c < to; c++) for (let r = 0; r < l.rows; r++) if (l.oneway[r * l.cols + c] === 1) covered.add(c);
  let run = 0;
  for (let c = from; c < to; c++) {
    if (covered.has(c)) run = 0;
    else if (++run > 4) return false;
  }
  return covered.size > 0;
}

test("level 1 can be walked from the start to the flag (a bot that jumps at every wall, edge and enemy)", () => {
  const w = createWorld(parseLevel(LEVEL_1));
  const l = w.level;
  const seen = { battles: 0 };
  let seekBoss = false;
  for (let i = 0; i < 120 * 60 && w.status !== "won" && w.status !== "lost"; i++) {
    const h = w.hero;
    const frontC = Math.floor(h.x + h.w + 0.45);
    const wallAhead = [0, 1].some((k) => isSolid(l, frontC, Math.floor(h.y + h.h - 0.5 - k)));
    const gapAhead = !isSolid(l, Math.floor(h.x + h.w + 0.9), Math.round(h.y + h.h)) && h.onGround;
    const spikeAhead = l.spikes.some((s) => s.x - (h.x + h.w) < 1.6 && s.x - (h.x + h.w) > -0.5);
    const enemyAhead = w.enemies.some((e) => e.alive && e.x - (h.x + h.w) < 1.8 && e.x - (h.x + h.w) > -0.3 && Math.abs(e.y - h.y) < 2);
    const ev = stepWorld(w, seekBoss ? { left: true, right: false, jump: false } : { left: false, right: true, jump: wallAhead || gapAhead || spikeAhead || enemyAhead || (!h.onGround && h.vy < 0) }, STEP);
    for (const e of ev) {
      if (e.type === "flag-locked") seekBoss = true; // turn back and fight it
      if (e.type === "battle") {
        seekBoss = false;
        seen.battles += 1;
        while (resolveBattle(w, true).continues);
      }
    }
  }
  assert.equal(w.status, "won", `stopped at x=${w.hero.x.toFixed(1)} y=${w.hero.y.toFixed(1)} hearts=${w.hearts}`);
});

/* ---------------------------- battle questions -------------------------- */

const bank = (n, difficulty) => Array.from({ length: n }, (_, i) => ({
  id: `${difficulty}-${i}`, type: "multiple_choice", question: `Question ${difficulty} ${i}?`,
  options: ["A", "B", "C", "D"], correctAnswer: i % 4, explanation: "because", difficulty, points: 10,
}));

test("battle questions: usable questions only, grouped by difficulty", () => {
  const raw = [
    ...bank(3, "easy"), ...bank(2, "medium"), ...bank(2, "hard"),
    { id: "tf", type: "true_false", question: "T?", correctAnswer: true, explanation: "", difficulty: "easy", points: 1 },
    { id: "bad", type: "multiple_choice", question: "Bad?", options: ["A"], correctAnswer: 0, explanation: "", difficulty: "easy", points: 1 },
    { id: "bad2", type: "multiple_choice", question: "Bad2?", options: ["A", "B"], correctAnswer: 5, explanation: "", difficulty: "easy", points: 1 },
  ];
  const usable = battle.toBattleQuestions(raw);
  assert.equal(usable.length, 8, "multiple choice and true or false, minus the two broken ones");
  assert.ok(usable.every((q) => q.options.length >= 2 && q.correctAnswer >= 0 && q.correctAnswer < q.options.length));
});

test("battle questions: tiers ask their own difficulty, never repeat, and fall back when a tier runs dry", () => {
  const pool = battle.createBattlePool(battle.toBattleQuestions([...bank(2, "easy"), ...bank(1, "medium"), ...bank(1, "hard")]), () => 0.5);
  const asked = [];
  for (let i = 0; i < 4; i++) {
    const served = battle.askQuestion(pool, i < 2 ? 0 : i === 2 ? 1 : 2);
    assert.ok(served);
    asked.push(served.question.difficulty);
    battle.answerQuestion(pool, served.token, 0);
    battle.settleQuestion(pool, served.token, true);
  }
  assert.deepEqual(asked, ["easy", "easy", "medium", "hard"]);
  assert.equal(battle.askQuestion(pool, 0), null, "nothing left");
});

test("battle questions: options are shuffled once and the right one is tracked", () => {
  const pool = battle.createBattlePool(battle.toBattleQuestions(bank(1, "easy")), () => 0.1);
  const a = battle.askQuestion(pool, 0);
  const b = battle.askQuestion(pool, 0);
  assert.equal(a.token, b.token, "asking again while one is open gives the same question");
  assert.deepEqual(a.question.options, b.question.options);
  assert.equal(a.question.options[a.question.correctAnswer], "A", "the right text is still the right one");
});

test("battle questions: a battle shows TWO options, the right one and one wrong one; true or false keeps its order", () => {
  for (const r of [0, 0.3, 0.6, 0.99]) {
    const pool = battle.createBattlePool(battle.toBattleQuestions(bank(4, "easy")), () => r);
    for (let i = 0; i < 4; i++) {
      const served = battle.askQuestion(pool, 0);
      const q = served.question;
      assert.equal(q.options.length, 2, "two options");
      assert.notEqual(q.options[0], q.options[1]);
      const original = Number(q.id.split("-")[1]);
      assert.equal(q.options[q.correctAnswer], ["A", "B", "C", "D"][original % 4], "the right answer is kept");
      battle.answerQuestion(pool, served.token, q.correctAnswer);
      battle.settleQuestion(pool, served.token, true);
    }
  }
  const tf = battle.createBattlePool(battle.toBattleQuestions([{ id: "tf", type: "true_false", question: "T?", correctAnswer: false, explanation: "", difficulty: "easy", points: 1 }]), () => 0.9);
  const q = battle.askQuestion(tf, 0).question;
  assert.deepEqual(q.options, ["True", "False"]);
  assert.equal(q.correctAnswer, 1);
});

test("battle questions: a wrong answer retires the question so it does not come straight back", () => {
  const pool = battle.createBattlePool(battle.toBattleQuestions(bank(2, "easy")), () => 0.5);
  const first = battle.askQuestion(pool, 0);
  const r = battle.answerQuestion(pool, first.token, (first.question.correctAnswer + 1) % 4);
  assert.equal(r.correct, false);
  battle.settleQuestion(pool, first.token, false);
  const next = battle.askQuestion(pool, 0);
  assert.notEqual(next.question.id, first.question.id);
});

test("battle questions: a double tap on an answer counts once", () => {
  const pool = battle.createBattlePool(battle.toBattleQuestions(bank(2, "easy")), () => 0.5);
  const q = battle.askQuestion(pool, 0);
  const r1 = battle.answerQuestion(pool, q.token, 0);
  const r2 = battle.answerQuestion(pool, q.token, 1);
  assert.ok(r1);
  assert.equal(r2, null);
});

/* ------------------------------- the view ------------------------------ */

const view = loadTs("components/platformer/platformer-view.ts");
const hero = loadTs("components/platformer/hero-anim-core.ts");
const fx = loadTs("components/platformer/battle-fx-core.ts");

test("ground pictures follow the open sides", () => {
  const l = level([
    "..P.F.....",
    "..........",
    ".###.#.##.",
    ".###.#.##.",
    "##########",
    "##########",
  ].map((r, i) => (i === 1 ? "..........." .slice(0, 10) : r)));
  const art = (c, r) => view.groundArt(l, c, r);
  assert.equal(art(1, 2), "top_left");
  assert.equal(art(2, 2), "top");
  assert.equal(art(3, 2), "top_right");
  assert.equal(art(1, 3), "left", "a wall below the top edge");
  assert.equal(art(5, 2), "top", "a pillar top");
  assert.equal(art(0, 4), "top", "the world's own end is not an open side");
  assert.equal(art(4, 2), null, "empty tile");
});

test("a thin slab uses the horizontal pieces, a lone block the round one", () => {
  const l = level(["P..F......", "..........", "..###.#...", "..........", "##########"]);
  assert.equal(view.groundArt(l, 2, 2), "h_left");
  assert.equal(view.groundArt(l, 3, 2), "h_middle");
  assert.equal(view.groundArt(l, 4, 2), "h_right");
  assert.equal(view.groundArt(l, 6, 2), "block");
});

test("ground at the bottom of the level carries on as dirt, and a pillar is open at its sides", () => {
  const l = level(["P..F.", "..#..", "..#..", "..#..", "#####", "#####"].map((r) => r));
  assert.equal(view.groundArt(l, 1, 5), "center", "the world is deeper than the screen");
  assert.equal(view.groundArt(l, 1, 4), "top");
  const f = level(["P..F.", ".....", ".#.#.", ".#.#.", "#####", "#####"]);
  // a one-wide pillar: grass on top, open on both sides
  assert.equal(view.groundArt(f, 1, 2), "top");
  assert.equal(view.groundArt(f, 1, 3), "left", "the pillar's body has an open left side");
  assert.equal(view.groundArt(f, 3, 3), "left");
});

test("water has a surface and a body", () => {
  const l = level(["P..F", "~~~~", "~~~~"].map((r, i) => (i === 0 ? r : r)));
  assert.equal(view.waterArt(l, 1, 1), "water_top");
  assert.equal(view.waterArt(l, 1, 2), "water");
  assert.equal(view.waterArt(l, 1, 0), null);
});

test("only chunks that touch the view are built, with one spare each side", () => {
  const { visibleChunks, CHUNK_COLS } = view;
  assert.deepEqual(visibleChunks(0, 10, 104), { from: 0, to: 2 });
  const mid = visibleChunks(50, 10, 104);
  assert.ok(mid.from <= Math.floor(50 / CHUNK_COLS) - 1 + 0 && mid.to >= Math.floor(60 / CHUNK_COLS));
  assert.equal(visibleChunks(94, 10, 104).to, Math.ceil(104 / CHUNK_COLS) - 1);
  assert.ok(visibleChunks(50, 10, 104).to - visibleChunks(50, 10, 104).from < 6, "a handful, not the whole level");
});

test("fillFrame parks what is far from the view and writes what is near it (a number that never changes costs the native side nothing)", () => {
  const def = LEVELS.find((d) => d.id === "reactor-core");
  const w = createWorld(parseLevel(def));
  const tile = 50, viewPx = 9 * tile;
  const out = new Array(view.frameLength(w.enemies.length, w.platforms.length, w.springs?.length ?? 0)).fill(0);
  view.fillFrame(w, 0, tile, out, undefined, viewPx);
  let near = 0, parked = 0;
  w.enemies.forEach((e, i) => {
    const at = view.FRAME_HEAD + i * view.FRAME_PER_ENEMY;
    const far = (e.x + e.w / 2) * tile > viewPx + (view.CULL_MARGIN_TILES + 2) * tile;
    const close = (e.x + e.w / 2) * tile < viewPx + (view.CULL_MARGIN_TILES - 1) * tile;
    if (far) { assert.equal(out[at], view.PARKED_PX, `enemy ${i} is parked`); parked++; }
    if (close) { assert.ok(out[at] > view.PARKED_PX, `enemy ${i} is drawn`); near++; }
  });
  assert.ok(parked > 3, "a long level has many foes out of sight");
  // the same frame twice gives the same numbers for what is parked
  const again = out.slice();
  view.fillFrame(w, 0, tile, again, undefined, viewPx);
  assert.deepEqual(again, out);
  // without a view size nothing is parked
  const all = view.fillFrame(w, 0, tile, [], undefined);
  assert.ok(w.enemies.every((_, i) => all[view.FRAME_HEAD + i * view.FRAME_PER_ENEMY] > view.PARKED_PX));
  // the battle's partner is always drawn
  const partner = w.enemies.length - 1;
  const fx = view.fillFrame(w, 0, tile, [], { pose: { hero: { dx: 0, dy: 0, sx: 1, sy: 1, flash: 0 }, enemy: { dx: 0, dy: 0, sx: 1, sy: 1, flash: 0 }, heroFrame: undefined }, enemy: partner }, viewPx);
  assert.ok(fx[view.FRAME_HEAD + partner * view.FRAME_PER_ENEMY] > view.PARKED_PX);
});

test("fillFrame writes the hero and each enemy in pixels", () => {
  const w = createWorld(parseLevel(LEVEL_1));
  const out = view.fillFrame(w, 120, 50, []);
  assert.equal(out.length, view.frameLength(w.enemies.length));
  assert.equal(out[0], 120);
  assert.ok(out.every((n) => Number.isFinite(n)));
  // the hero's picture is centred on the hit box and stands on its feet
  const h = w.hero;
  assert.ok(Math.abs(out[2] + (view.HERO_DRAW * 50) / 2 - (h.x + h.w / 2) * 50) < 1e-6);
  assert.ok(Math.abs(out[3] + view.HERO_DRAW * 50 - (h.y + h.h) * 50) < 1e-6);
  assert.ok(out[4] >= hero.CLIPS.rise.start && out[4] <= hero.CLIPS.fall.start, "in the air at the start");
  run(w, NONE, 1);
  view.fillFrame(w, 0, 50, out);
  assert.ok(out[4] >= hero.CLIPS.idle.start && out[4] < hero.CLIPS.idle.start + hero.CLIPS.idle.count, "standing: the idle loop");
  run(w, { ...NONE, right: true }, 0.4);
  view.fillFrame(w, 0, 50, out);
  assert.ok(out[4] >= hero.CLIPS.walk.start && out[4] < hero.CLIPS.walk.start + hero.CLIPS.walk.count, "running: the walk");
  assert.equal(out[5], 1);
});

test("a walker that moves right is drawn flipped, and a bee is centred on its tile", () => {
  const w = createWorld(level(["P..F....", "...s.b..", "########"]));
  w.enemies[0].dir = 1;
  const out = view.fillFrame(w, 0, 50, []);
  assert.equal(out[view.FRAME_HEAD + 3], -1);
  w.enemies[0].dir = -1;
  view.fillFrame(w, 0, 50, out);
  assert.equal(out[view.FRAME_HEAD + 3], 1);
  const bee = w.enemies[1];
  const k = ENEMY_KINDS.bee;
  const top = out[view.FRAME_HEAD + view.FRAME_PER_ENEMY + 1];
  assert.ok(Math.abs(top + (k.scale * 50) / 2 - (bee.y + bee.h / 2) * 50) < 1e-6);
});

/* ------------------------------ the hero's pictures ------------------------------ */

test("the clip table is in order, adds up, and fits the sheet", () => {
  const { CLIPS, CLIP_ORDER, TOTAL_FRAMES, SHEET, SHEET_ROWS } = hero;
  let next = 0;
  for (const name of CLIP_ORDER) {
    assert.equal(CLIPS[name].start, next, `${name} starts where the one before ends`);
    assert.ok(CLIPS[name].count >= 1);
    next += CLIPS[name].count;
  }
  assert.equal(next, TOTAL_FRAMES);
  assert.equal(SHEET_ROWS, Math.ceil(TOTAL_FRAMES / SHEET.cols));
  assert.deepEqual(hero.cellOf(0), { col: 0, row: 0 });
  assert.deepEqual(hero.cellOf(SHEET.cols + 2), { col: 2, row: 1 });
});

test("the baked sheet is the size the table says, and its editable source has every frame", () => {
  const png = fs.readFileSync("assets/images/platformer/characters/character_shrodi_sheet.png");
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, hero.SHEET.cols * hero.SHEET.frame);
  assert.equal(height, hero.SHEET_ROWS * hero.SHEET.frame);
  const svg = fs.readFileSync("tools/platformer-art/Vector/Characters/shrodi_sheet.svg", "utf8");
  assert.equal(svg.split("<clipPath id=\"cell").length - 1, hero.TOTAL_FRAMES, "one cell per frame");
  assert.ok(svg.includes("#353541"), "drawn with the sprites' stroke colour");
});

const stand = (o = {}) => ({ onGround: true, vx: 0, vy: 0, distance: 0, idleT: 0, landT: 0, hurtT: 0, t: 0, ...o });

test("what plays follows the hero: hurt first, then the air, the landing, walking, standing", () => {
  const { CLIPS, heroFrameIndex } = hero;
  const inClip = (i, name) => i >= CLIPS[name].start && i < CLIPS[name].start + CLIPS[name].count;
  assert.ok(inClip(heroFrameIndex(stand({ hurtT: 0.2, onGround: false, vy: -9 })), "hit"), "a flinch beats everything");
  assert.equal(heroFrameIndex(stand({ onGround: false, vy: -8 })), CLIPS.rise.start);
  assert.equal(heroFrameIndex(stand({ onGround: false, vy: 0.5 })), CLIPS.apex.start);
  assert.equal(heroFrameIndex(stand({ onGround: false, vy: 9 })), CLIPS.fall.start);
  assert.ok(inClip(heroFrameIndex(stand({ landT: 0.13 })), "land"));
  assert.ok(inClip(heroFrameIndex(stand({ vx: 6, landT: 0.13 })), "walk") || inClip(heroFrameIndex(stand({ vx: 6, landT: 0.13 })), "land"));
  assert.ok(inClip(heroFrameIndex(stand({ vx: 4 })), "walk"));
  assert.ok(inClip(heroFrameIndex(stand({ vx: 0 })), "idle"));
});

test("the walk follows the ground: one stride is one whole cycle, and the same distance is the same frame either way", () => {
  const { CLIPS, STRIDE, heroFrameIndex } = hero;
  const at = (d) => heroFrameIndex(stand({ vx: 4, distance: d }));
  const seen = new Set();
  const n = CLIPS.walk.count;
  for (let i = 0; i < n; i++) seen.add(at((i + 0.5) * (STRIDE / n)));
  assert.equal(seen.size, n, "every walking frame in one stride");
  assert.equal(at(0.01), CLIPS.walk.start);
  assert.equal(at(STRIDE + 0.01), CLIPS.walk.start, "a stride later it starts again");
  assert.equal(heroFrameIndex(stand({ vx: -4, distance: 1.3 })), heroFrameIndex(stand({ vx: 4, distance: 1.3 })), "walking left plays the same cycle");
});

test("standing: idle, idle, then a fidget, and round again", () => {
  const { CLIPS, IDLE_CYCLE, idleFrame } = hero;
  assert.equal(idleFrame(0), CLIPS.idle.start);
  const idleSeconds = CLIPS.idle.count / CLIPS.idle.fps;
  assert.equal(idleFrame(idleSeconds + 0.001), CLIPS.idle.start, "the second loop starts again from the first frame");
  assert.equal(idleFrame(2 * idleSeconds + 0.01), CLIPS.fidget.start, "then the fidget");
  assert.equal(idleFrame(IDLE_CYCLE - 0.01), CLIPS.fidget.start + CLIPS.fidget.count - 1, "and ends on its last frame");
  assert.equal(idleFrame(IDLE_CYCLE + 0.01), CLIPS.idle.start, "round again");
  for (let t = 0; t < IDLE_CYCLE * 2; t += 0.07) {
    const f = idleFrame(t);
    assert.ok(f >= CLIPS.idle.start && f < CLIPS.fidget.start + CLIPS.fidget.count, `frame ${f} at ${t}`);
  }
});

test("self-running modes for the cards: cheer and hit loop their own frames, idle is the idle cycle", () => {
  const { CLIPS, modeFrame } = hero;
  assert.equal(modeFrame("cheer", 0), CLIPS.cheer.start);
  assert.equal(modeFrame("cheer", CLIPS.cheer.count / CLIPS.cheer.fps + 0.001), CLIPS.cheer.start, "loops");
  assert.ok(modeFrame("hit", 0.3) >= CLIPS.hit.start && modeFrame("hit", 0.3) < CLIPS.hit.start + CLIPS.hit.count);
  assert.equal(modeFrame("idle", 0.5), hero.idleFrame(0.5));
});

test("the world feeds the pictures: distance counts while walking, idle time while standing, the flinch and the landing run out", () => {
  const w = createWorld(flat());
  run(w, NONE, 1);
  assert.ok(w.hero.idleT > 0.5, "standing still counts up");
  assert.equal(w.hero.distance, 0);
  run(w, { ...NONE, right: true }, 0.5);
  assert.equal(w.hero.idleT, 0, "running resets it");
  assert.ok(w.hero.distance > 1.5, `walked ${w.hero.distance}`);
  // a hit starts the flinch, and it runs out
  const hurt = createWorld(level(["........F", ".P..^....", "#########"]));
  run(hurt, { ...NONE, right: true }, 0.9);
  assert.ok(hurt.hero.hurtT >= 0, "flinch timer exists");
  run(hurt, NONE, 1);
  assert.equal(hurt.hero.hurtT, 0);
  // landing from a jump starts the squash, and it runs out
  const land = createWorld(flat());
  run(land, NONE, 0.5);
  let squashed = false;
  run(land, (i) => ({ ...NONE, jump: i < 40 }), 1.4, () => { if (land.hero.landT > 0) squashed = true; });
  assert.ok(squashed, "a landing squash started");
  assert.equal(land.hero.landT, 0);
});

/* ------------------------------ the world fills the screen ------------------------------ */

test("the layout: nine tiles across, the level's last row above the controls, dirt down to the bottom edge", () => {
  const opts = { colsInView: 9, deck: 150, top: 70, minTile: 24 };
  const lay = view.playLayout(390, 800, 7, opts);
  assert.equal(lay.tile, 43);
  assert.equal(lay.worldTop + 7 * lay.tile, 800 - 150, "the last row ends where the controls begin");
  assert.ok(lay.worldTop > 70, "sky above the level");
  assert.ok(lay.underRows * lay.tile >= 150 && (lay.underRows - 2) * lay.tile < 150, "enough dirt rows to reach the bottom, and not many more");
  assert.ok(Math.abs(lay.viewTiles - 390 / 43) < 1e-9);
  // a short, wide screen shrinks the tiles but keeps the level below the buttons and never under 24 px
  const land = view.playLayout(812, 360, 7, opts);
  assert.equal(land.tile, 24);
  assert.ok(land.worldTop >= 70);
  assert.ok(land.worldTop + 7 * land.tile + (land.underRows - 1) * land.tile >= 360, "ground still reaches the bottom");
});

test("the backdrop is a stack: sky, clouds, the biome sitting on the ground line, then its ground colour to the bottom", () => {
  const st = view.backdropStack(800, 600, 48);
  assert.equal(st.size, 264, "pictures scale with the tile");
  assert.equal(st.biomeTop + st.size, 600, "the biome's bottom edge is on the ground line, so it shows above the ground tiles");
  assert.equal(st.cloudsTop + st.size, st.biomeTop + Math.round(st.size * view.CLOUD_OVERLAP), "the biome covers the last of the clouds' white underside");
  assert.equal(st.fillTop, 600);
  assert.equal(st.fillHeight, 200, "the solid fill reaches the bottom of the view");
  assert.equal(view.backdropStack(500, 600, 48).fillHeight, 0, "no fill when the ground is below the view");
  assert.equal(view.backdropStack(800, 600, 20).size, 200, "never smaller than 200");
});

/* ------------------------------ blocks, keys, springs, platforms, signs ------------------------------ */

const hold = { left: false, right: false, jump: true };
const only = (extra) => ({ left: false, right: false, jump: false, ...extra });
/** A small world: `above` rows of sky, the hero on the ground, two rows of ground. */
const arena = (rows, signs) => parseLevel({ id: "t", title: "t", rows, signs });
const ground = (n) => "#".repeat(n);

test("new tiles parse: planks, blocks, keys, springs, moving platforms, signs and scenery", () => {
  const l = parseLevel({
    id: "t", title: "t", signs: ["hi"],
    rows: ["..-?!=Lk.", "u.M..W..1", "P.......F", ground(9)],
    scenery: [".r.f.....", "........t", "...b.....", "........."],
  });
  assert.equal(l.oneway[2], 1);
  assert.deepEqual(l.blocks.map((b) => b.kind), ["coin", "heart", "brick", "lock"]);
  assert.ok(l.blocks.every((b) => l.solid[b.r * l.cols + b.c] === 1), "blocks are solid");
  assert.equal(l.keys.length, 1);
  assert.deepEqual(l.springs, [{ c: 0, r: 1 }]);
  assert.deepEqual(l.platforms.map((p) => [p.axis, p.w]), [["x", 3], ["y", 3]]);
  assert.deepEqual(l.signs, [{ c: 8, r: 1, text: "hi", icon: "sign" }], "a plain string is the plain signpost");
  const iconic = parseLevel({ id: "t", title: "t", rows: ["P1F", "###"], signs: [{ text: "run", icon: "move" }] });
  assert.deepEqual(iconic.signs[0].icon, "move");
  assert.deepEqual(l.scenery.map((s) => s.kind), ["rock", "fence", "torch", "bush"]);
  assert.throws(() => parseLevel({ id: "t", title: "t", rows: ["1P.F", "####"] }), /no text/);
  assert.throws(() => parseLevel({ id: "t", title: "t", rows: ["P.F", "###"], scenery: ["..."] }), /scenery has 1 rows/);
  assert.throws(() => parseLevel({ id: "t", title: "t", rows: ["P.F", "###"], scenery: ["Z..", "..."] }), /unknown scenery/);
});

test("a one-way plank: the hero jumps up through it and lands on top, and walks under it freely", () => {
  const w = createWorld(arena(["..........", "..........", "..........", "..---.....", "...P.....F", ground(10), ground(10)]));
  run(w, NONE, 0.3);
  run(w, hold, 0.55);
  run(w, NONE, 1.2);
  assert.ok(w.hero.onGround);
  assert.ok(Math.abs(w.hero.y + w.hero.h - 3) < 1e-6, `stands on the plank (feet at ${w.hero.y + w.hero.h})`);
  // underneath, nothing is in the way
  const u = createWorld(arena(["..........", "..........", "..........", ".-------..", "P........F", ground(10), ground(10)]));
  run(u, only({ right: true }), 1);
  assert.ok(u.hero.x > 3, "walked under the plank");
  assert.ok(u.hero.onGround && Math.abs(u.hero.y + u.hero.h - 5) < 1e-6 || u.hero.y + u.hero.h <= 5 + 1e-6);
});

test("coin and heart blocks give once when bumped from below, and become empty", () => {
  const rows = ["..........", "..........", "...?!.....", "..........", "..P......F", ground(10), ground(10)];
  const w = createWorld(arena(rows));
  // jump straight up under the coin block (column 3)
  w.hero.x = 3.5 - w.hero.w / 2;
  const ev = [];
  run(w, hold, 0.5, (e) => ev.push(...e));
  assert.equal(ev.filter((e) => e.type === "block").length, 1);
  assert.deepEqual(ev.find((e) => e.type === "block"), { type: "block", index: 0, reward: "coin" });
  assert.equal(w.stats.coins, 1);
  assert.ok(w.blockUsed[0] && !w.blockUsed[1]);
  assert.equal(w.level.solid[2 * 10 + 3], 1, "an empty block is still solid");
  run(w, NONE, 1);
  const again = [];
  run(w, hold, 0.5, (e) => again.push(...e));
  assert.equal(again.filter((e) => e.type === "block").length, 0, "an empty block gives nothing");
  // the heart block: a heart when one is missing, coins when full
  const h = createWorld(arena(rows));
  h.hearts = 2;
  h.hero.x = 4.5 - h.hero.w / 2;
  run(h, hold, 0.5);
  assert.equal(h.hearts, 3);
  const f = createWorld(arena(rows));
  f.hero.x = 4.5 - f.hero.w / 2;
  const fe = [];
  run(f, hold, 0.5, (e) => fe.push(...e));
  assert.equal(f.hearts, MAX_HEARTS);
  assert.equal(fe.find((e) => e.type === "block").reward, "coins");
  assert.equal(f.stats.coins, 3);
});

test("a brick breaks when bumped, in the world's own copy of the level only", () => {
  const src = arena(["..........", "..........", "...=......", "..........", "..P......F", ground(10), ground(10)]);
  const w = createWorld(src);
  w.hero.x = 3.5 - w.hero.w / 2;
  run(w, hold, 0.5);
  assert.ok(w.blockUsed[0]);
  assert.equal(w.level.solid[2 * 10 + 3], 0, "the brick is gone from the world");
  assert.equal(src.solid[2 * 10 + 3], 1, "the level itself is untouched, so a restart has the brick back");
  assert.equal(createWorld(src).level.solid[2 * 10 + 3], 1);
});

test("a key opens a lock; without one the lock says so once", () => {
  const rows = ["..........", "..........", "..........", "..........", "P.kL.....F", ground(10), ground(10)];
  const w = createWorld(arena(rows));
  const ev = [];
  run(w, only({ right: true }), 1.2, (e) => ev.push(...e));
  assert.equal(w.keys, 0, "the key was used");
  assert.ok(ev.some((e) => e.type === "key") && ev.some((e) => e.type === "unlock"));
  assert.ok(w.hero.x > 4, "walked through where the lock was");
  assert.equal(w.level.solid[4 * 10 + 3], 0);
  // no key: blocked, and told once
  const n = createWorld(arena(["..........", "..........", "..........", "..........", "P..L.....F", ground(10), ground(10)]));
  const nv = [];
  run(n, only({ right: true }), 3, (e) => nv.push(...e));
  assert.equal(nv.filter((e) => e.type === "locked").length, 1, "told once while it keeps walking into it");
  assert.ok(n.hero.x < 3);
});

test("a spring throws the hero about six tiles up", () => {
  const w = createWorld(arena(["..........", "..........", "..........", "..........", "..........", "..........", "..........", ".uP......F", ground(10), ground(10)]));
  w.hero.x = 1.5 - w.hero.w / 2;
  let top = w.hero.y;
  const ev = [];
  run(w, NONE, 1.6, (e) => { ev.push(...e); top = Math.min(top, w.hero.y); });
  assert.ok(ev.some((e) => e.type === "spring"));
  assert.ok(7 - top > 5.5, `rose ${7 - top} tiles`);
  assert.ok(7 - top < 7, "not past seven");
  // letting go of jump does not cut a spring's climb (no jump pressed here at all)
});

test("a moving platform carries the hero, sideways and up and down", () => {
  const rows = ["..........", "..........", "..........", "..........", "..........", "..M.......", "..........", "P........F", ground(10), ground(10)];
  const w = createWorld(arena(rows));
  const p = w.level.platforms[0];
  // put the hero on the platform
  w.hero.x = p.x + 1.5 - w.hero.w / 2;
  w.hero.y = w.platforms[0].y - w.hero.h - 0.01;
  run(w, NONE, 0.2);
  assert.equal(w.hero.platform, 0);
  const x0 = w.hero.x - w.platforms[0].x;
  run(w, NONE, 1.5);
  assert.equal(w.hero.platform, 0, "still on it");
  assert.ok(Math.abs(w.hero.x - w.platforms[0].x - x0) < 1e-6, "moves with the platform");
  assert.ok(Math.abs(w.hero.x - (p.x + 1.5 - w.hero.w / 2)) > 0.5, "and so has moved");
  const v = createWorld(arena(["..........", "..........", "..........", "..........", "..........", "..W.......", "..........", "P........F", ground(10), ground(10)]));
  v.hero.x = 2 + 1.5 - v.hero.w / 2;
  v.hero.y = v.platforms[0].y - v.hero.h - 0.01;
  run(v, NONE, 0.2);
  assert.equal(v.hero.platform, 0);
  let moved = 0;
  run(v, NONE, 2, () => { moved = Math.max(moved, Math.abs(v.platforms[0].y - v.level.platforms[0].y)); });
  assert.equal(v.hero.platform, 0, "still on it while it rises and sinks");
  assert.ok(moved > 1.5, `the platform swings (${moved})`);
  assert.ok(Math.abs(v.hero.y + v.hero.h - v.platforms[0].y) < 0.02, "the hero rides it");
});

test("a sign is active while the hero stands near it, announced when it changes", () => {
  const w = createWorld(arena(["..........", "..........", "..........", "..........", "P..1.....F", ground(10), ground(10)], ["Hello"]));
  const ev = [];
  run(w, only({ right: true }), 1.2, (e) => ev.push(...e.filter((x) => x.type === "sign")));
  assert.deepEqual(ev.map((e) => e.index), [0, null], "on, then off again once the hero has gone past");
  assert.equal(w.activeSign, null);
});

test("frame slots for platforms and springs sit after the enemies", () => {
  assert.equal(view.frameLength(3, 2, 4), view.FRAME_HEAD + 3 * view.FRAME_PER_ENEMY + 2 * view.FRAME_PER_PLATFORM + 4 + 1, "the dose meter is the last slot");
  assert.equal(view.doseSlot(3, 2, 4), view.frameLength(3, 2, 4) - 1);
  assert.equal(view.platformSlot(3, 1), view.FRAME_HEAD + 3 * view.FRAME_PER_ENEMY + view.FRAME_PER_PLATFORM);
  const w = createWorld(arena(["..........", "..........", "..M.......", "..........", "P.u......F", ground(10), ground(10)]));
  const out = view.fillFrame(w, 0, 40, new Array(view.frameLength(0, 1, 1)).fill(0));
  assert.equal(out[view.platformSlot(0, 0)], w.platforms[0].x * 40);
  assert.equal(out[view.springSlot(0, 1, 0)], 0);
});

/* ------------------------------ the boss introduction ------------------------------ */

test("the boss cinematic: starts only when the hero is on the ground, within range and the boss lives ahead", () => {
  const hero = { x: 10, w: 0.8, onGround: true };
  const boss = { x: 16.5, w: 1.3, alive: true };
  assert.ok(intro.shouldIntroduceBoss(hero, boss));
  assert.ok(!intro.shouldIntroduceBoss({ ...hero, onGround: false }, boss), "not in mid-air");
  assert.ok(!intro.shouldIntroduceBoss({ ...hero, x: 2 }, boss), "not from far away");
  assert.ok(!intro.shouldIntroduceBoss({ ...hero, x: 20 }, boss), "not once the hero is past the boss");
  assert.ok(!intro.shouldIntroduceBoss(hero, { ...boss, alive: false }), "not for a beaten boss");
  assert.ok(!intro.shouldIntroduceBoss(hero, undefined));
  assert.equal(intro.bossCamera(16, 8, 100), 16 - 8 * 0.6);
  assert.equal(intro.bossCamera(2, 8, 100), 0, "the view stays inside the level");
  assert.equal(intro.bossCamera(99, 8, 100), 92);
});

test("the boss cinematic timeline: bars in, scroll to the boss, zoom, roar, then everything returns", () => {
  const I = intro.INTRO;
  const rest = intro.introPose(0);
  assert.deepEqual([rest.bars, rest.pan, rest.zoom, rest.shake], [0, 0, 0, 0]);
  assert.deepEqual(rest.boss, { dy: 0, sx: 1, sy: 1, flash: 0 });
  const mid = intro.introPose(I.roarAt - 50);
  assert.equal(mid.bars, 1);
  assert.equal(mid.pan, 1, "the camera has reached the boss");
  assert.equal(mid.zoom, 1);
  const t = (ms) => intro.introPose(ms);
  assert.ok(t(700).pan > 0 && t(700).pan < 1, "scrolling");
  assert.ok(t(I.panStart + 1).pan < t(I.panEnd - 1).pan, "pan grows on the way there");
  assert.ok(t(I.returnAt + 100).pan < 1 && t(I.panBackEnd - 100).pan < t(I.returnAt + 100).pan, "pan shrinks on the way back");
  // the roar: crouch, leap (stretched, up), slam (squashed, shake), settle
  const crouch = t(I.roarAt + 170).boss, leap = t(I.roarAt + 320).boss, slam = t(intro.SLAM_AT).boss;
  assert.ok(crouch.sy < 1 && crouch.sx > 1);
  assert.ok(leap.sy > 1 && leap.dy < 0 && leap.sx < 1);
  assert.ok(slam.sy < 1 && slam.dy === 0);
  assert.ok(Math.max(...Array.from({ length: 480 }, (_, i) => Math.abs(t(intro.SLAM_AT + i).shake))) > 3, "the slam shakes the picture");
  assert.deepEqual(t(I.roarAt + 800).boss, { dy: 0, sx: 1, sy: 1, flash: 0 }, "the boss is at rest after the roar");
  // everything is back at the end, so play continues from the hero's own view
  const end = t(I.total);
  assert.deepEqual([end.bars, end.pan, end.zoom, end.shake], [0, 0, 0, 0]);
  // values stay in range the whole way
  for (let ms = 0; ms <= I.total; ms += 10) {
    const p = t(ms);
    assert.ok(p.bars >= 0 && p.bars <= 1 && p.pan >= 0 && p.pan <= 1 && p.zoom >= 0 && p.zoom <= 1, `in range at ${ms}`);
  }
  assert.ok(I.titleAt > I.roarAt && I.returnAt > I.titleAt + 1000, "the name is on screen a good while before the return");
});

test("the boss introduction and the boss's defeat cannot be skipped: they are timelines only", () => {
  assert.equal(intro.skipTime, undefined);
  assert.equal(vic.skipTime, undefined);
});

test("under the level the ground goes on: dirt, with the dark edge on an open side, and a floor under a pit", () => {
  const lv = level(["...F..", "P.##..", "##~~##"]);
  const art = Array.from({ length: lv.cols }, (_, c) => view.underArt(lv, c));
  assert.ok(art.every((a) => ["left", "center", "right"].includes(a)));
  const pit = lv.water.findIndex((v) => v === 1);
  assert.ok(pit >= 0, "the test level has a pit");
  assert.equal(view.underArt(lv, pit % lv.cols), "center", "a pit gets a floor");
});

/* ------------------------------ the battle on the map ------------------------------ */

test("a fight starts and ends at rest, and every number is finite", () => {
  for (const kind of ["attack", "hurt"]) {
    for (const dir of [1, -1]) {
      for (const lethal of [false, true]) {
        const total = fx.fxTotal(kind);
        assert.deepEqual(fx.fxPose(kind, 0, dir, lethal), fx.NO_FX);
        assert.deepEqual(fx.fxPose(kind, total, dir, lethal), fx.NO_FX);
        for (let t = 1; t < total; t += 7) {
          const p = fx.fxPose(kind, t, dir, lethal);
          for (const body of [p.hero, p.enemy]) {
            for (const v of Object.values(body)) assert.ok(Number.isFinite(v), `${kind} ${t}`);
            assert.ok(body.sx > 0.5 && body.sx < 1.5 && body.sy > 0.5 && body.sy < 1.5, `squash stays sane at ${t}`);
            assert.ok(body.flash >= 0 && body.flash <= 1);
          }
        }
      }
    }
  }
});

test("a right answer: the hero lunges at the enemy, the enemy is thrown away from the hero and never flashes", () => {
  for (const dir of [1, -1]) {
    const crouch = fx.fxPose("attack", 110, dir);
    assert.ok(crouch.hero.dx * dir < 0, "the hero draws back first");
    const hit = fx.fxPose("attack", fx.FX.contact, dir);
    assert.ok(hit.hero.dx * dir > 0.25, "and lunges toward the enemy");
    const after = fx.fxPose("attack", 520, dir);
    assert.ok(after.enemy.dx * dir > 0.4, "the enemy flies away from the hero");
    for (const t of [fx.FX.contact - 40, fx.FX.contact, fx.FX.contact + 30, 400]) assert.equal(fx.fxPose("attack", t, dir).enemy.flash, 0, "a beaten enemy never flashes");
    assert.equal(fx.fxPose("attack", 700, dir).hero.flash, 0, "the hero never flashes on an attack");
  }
  const lethal = fx.fxPose("attack", 900, 1, true).enemy.dx;
  const normal = fx.fxPose("attack", 900, 1, false).enemy.dx;
  assert.ok(lethal > normal, "a beaten enemy stays away, the others come back");
  assert.ok(Math.abs(normal) < 0.2);
});

test("a wrong answer: the enemy lunges at the hero, the hero flashes red, is thrown back and plays the flinch", () => {
  for (const dir of [1, -1]) {
    const hit = fx.fxPose("hurt", fx.FX.contact, dir);
    assert.ok(hit.enemy.dx * dir < -0.25, "the enemy comes at the hero (toward it, so against the enemy's own side)");
    const after = fx.fxPose("hurt", 520, dir);
    assert.ok(after.hero.dx * dir < -0.5, "the hero is thrown back, away from the enemy");
    assert.ok(fx.fxPose("hurt", fx.FX.contact + 30, dir).hero.flash > 0.8);
    assert.equal(fx.fxPose("hurt", 700, dir).enemy.flash, 0);
    const frame = fx.fxPose("hurt", 400, dir).heroFrame;
    assert.ok(frame >= hero.CLIPS.hit.start && frame < hero.CLIPS.hit.start + hero.CLIPS.hit.count, "the hero's flinch frames");
  }
});

test("the hero's pictures in a fight: ready, a leap at the blow, a cheer after it", () => {
  assert.equal(fx.fxPose("attack", 50, 1).heroFrame, hero.CLIPS.idle.start);
  assert.equal(fx.fxPose("attack", 200, 1).heroFrame, hero.CLIPS.apex.start);
  const c = fx.fxPose("attack", 600, 1).heroFrame;
  assert.ok(c >= hero.CLIPS.cheer.start && c < hero.CLIPS.cheer.start + hero.CLIPS.cheer.count);
});

test("effects: they start after the contact, end by themselves and a hit shakes less than a hurt", () => {
  const C = fx.FX.contact;
  assert.equal(fx.zoomPunch(0), 0);
  assert.ok(fx.zoomPunch(C + 100) > 0.04);
  assert.equal(fx.zoomPunch(C + 400), 0);
  assert.equal(fx.camShake("hurt", C - 1), 0);
  let hurt = 0;
  let hit = 0;
  for (let t = C; t < C + 500; t += 3) {
    hurt = Math.max(hurt, Math.abs(fx.camShake("hurt", t)));
    hit = Math.max(hit, Math.abs(fx.camShake("attack", t)));
  }
  assert.ok(hurt > hit && hit > 0, `hurt ${hurt} hit ${hit}`);
  assert.equal(fx.camShake("hurt", C + 600), 0);
  assert.equal(fx.vignette("attack", C + 50), 0, "the red wash is for a hurt only");
  assert.ok(fx.vignette("hurt", C + 40) > 0.2);
  assert.equal(fx.vignette("hurt", C + 600), 0);
  for (let i = 0; i < fx.IMPACT_LINES; i++) {
    assert.equal(fx.impactLine(i, C - 1).opacity, 0);
    assert.ok(fx.impactLine(i, C + 100).opacity > 0.5);
    assert.ok(fx.impactLine(i, C + 100).dist > fx.impactLine(i, C + 10).dist, "lines fly outward");
    assert.equal(fx.impactLine(i, C + 300).opacity, 0);
  }
  assert.equal(fx.lostHeart(C).opacity, 0);
  assert.ok(fx.lostHeart(C + 250).y < 0, "the broken heart rises");
  assert.equal(fx.lostHeart(C + 900).opacity, 0);
});

test("the zoom puts the pair exactly where it is wanted, at a scale that fits, never zooming out", () => {
  const plan = fx.zoomPlan({ focus: { x: 200, y: 520 }, pairW: 110, areaW: 390, areaH: 844, target: { x: 195, y: 280 } });
  assert.ok(plan.scale >= 1.4 && plan.scale <= 2.2);
  const cx = 195;
  const cy = 422;
  // a point lands at middle + scale * (p - middle) + t: the focus must land on the target
  assert.ok(Math.abs(cx + plan.scale * (200 - cx) + plan.tx - 195) < 1e-9);
  assert.ok(Math.abs(cy + plan.scale * (520 - cy) + plan.ty - 280) < 1e-9);
  assert.equal(fx.zoomPlan({ focus: { x: 0, y: 0 }, pairW: 1000, areaW: 390, areaH: 800, target: { x: 0, y: 0 } }).scale, 1.4, "a very wide pair still zooms a little");
  assert.equal(fx.zoomPlan({ focus: { x: 0, y: 0 }, pairW: 5, areaW: 390, areaH: 800, target: { x: 0, y: 0 } }).scale, 2.2, "and a tiny one is capped");
});

test("fillFrame in a battle: the fighters face each other and the fight's moves, squashes and flashes are written", () => {
  const w = createWorld(flat());
  run(w, NONE, 1);
  const out = [];
  const enemy = { id: 0, kind: "slime", x: w.hero.x + 1.2, y: w.hero.y, w: 0.8, h: 0.8, vx: 0, dir: -1, hp: 2, maxHp: 2, alive: true };
  w.enemies.push(enemy);
  view.fillFrame(w, 0, 50, out, { pose: fx.NO_FX, enemy: 0 });
  assert.equal(out[5], 1, "the hero faces right, toward the enemy");
  assert.equal(out[view.FRAME_HEAD + 3], 1, "the enemy (drawn facing left) faces the hero on its left");
  enemy.x = w.hero.x - 2;
  view.fillFrame(w, 0, 50, out, { pose: fx.NO_FX, enemy: 0 });
  assert.equal(out[5], -1);
  assert.equal(out[view.FRAME_HEAD + 3], -1);
  const pose = fx.fxPose("hurt", 520, 1);
  view.fillFrame(w, 0, 50, out, { pose, enemy: 0 });
  assert.equal(out[9], pose.hero.flash);
  assert.equal(out[7], pose.hero.sx);
  assert.equal(out.length, view.frameLength(1));
  // without a fight everything is at rest
  view.fillFrame(w, 0, 50, out);
  assert.deepEqual([out[7], out[8], out[9]], [1, 1, 0]);
  assert.deepEqual([out[view.FRAME_HEAD + 4], out[view.FRAME_HEAD + 5], out[view.FRAME_HEAD + 6]], [1, 1, 0]);
});

/* ------------------------------ story mode ------------------------------ */

const storyCore = loadTs("components/platformer/story-core.ts");
const storyBattle = loadTs("components/platformer/story-battle-core.ts");
const storyQ = loadTs("components/platformer/story-questions-core.ts");
const { STORY_LEVELS, STORY_WORLDS } = loadTs("components/platformer/story-levels.ts");
const { GLYPH_IDS } = loadTs("components/path/node-glyphs.ts");

test("story: the levels line up with their level files and each has a theme, a unit and a pool", () => {
  assert.deepEqual(STORY_LEVELS.map((l) => l.number), Array.from({ length: 25 }, (_, i) => i + 1));
  assert.deepEqual(STORY_LEVELS.map((l) => l.def.id), LEVELS.map((d) => d.id));
  for (const l of STORY_LEVELS) {
    assert.ok(["grass", "sand", "stone", "purple", "snow"].includes(l.theme));
    assert.ok(["hills", "trees", "desert", "mushrooms"].includes(l.biome));
    assert.ok(l.mechanics.length > 0 && l.blurb && l.subtitle);
    assert.ok(GLYPH_IDS.includes(l.glyph), `${l.id} has a glyph of the lesson map`);
    assert.equal(new Set(l.questions).size, l.questions.length, `${l.id} has no repeated question`);
  }
});

test("story: the worlds are the tutorial and Units 1 to 4, five levels each, in order, and a unit keeps one biome", () => {
  assert.deepEqual(STORY_WORLDS.map((w) => w.id), ["tutorial", "inside-the-atom", "radioactivity", "radiation-meets-matter", "radiation-and-the-body"]);
  assert.deepEqual(STORY_WORLDS.map((w) => w.kind), ["tutorial", "unit", "unit", "unit", "unit"]);
  assert.deepEqual(STORY_WORLDS.map((w) => w.paletteIndex), [3, 1, 2, 3, 4], "unit N wears colour N, as on the lesson map");
  assert.deepEqual(STORY_WORLDS.flatMap((w) => w.levelIds), STORY_LEVELS.map((l) => l.id), "worlds list every level once, in order");
  for (const w of STORY_WORLDS) {
    assert.equal(w.levelIds.length, 5);
    const levels = w.levelIds.map((id) => STORY_LEVELS.find((l) => l.id === id));
    assert.deepEqual(levels.map((l) => l.worldId), levels.map(() => w.id));
    assert.deepEqual(levels.map((l) => l.position), [1, 2, 3, 4, 5]);
    assert.ok(w.paletteIndex >= 1 && w.paletteIndex <= 5);
    assert.equal(levels.some((l) => parseLevel(l.def).enemies.some((e) => e.kind === "boss")), true);
    assert.equal(parseLevel(levels[4].def).enemies.some((e) => e.kind === "boss"), true, "the last level of a world ends on the boss");
    if (w.kind === "unit") {
      assert.equal(new Set(levels.map((l) => l.biome)).size, 1, `${w.id} keeps one biome`);
      assert.equal(new Set(levels.map((l) => l.theme)).size, 1, `${w.id} keeps one ground`);
      assert.ok(levels.every((l) => l.unitId === w.id), "a unit's levels ask that unit's questions");
    }
  }
  assert.notEqual(STORY_WORLDS[1].biome + STORY_LEVELS[5].theme, STORY_WORLDS[0].biome + STORY_LEVELS[0].theme, "the unit does not look like the first tutorial level");
});

test("story: questions are shared out from the left of the level to the right, hp + spares each", () => {
  const level = { enemies: [{ kind: "slime", x: 40 }, { kind: "boss", x: 90 }, { kind: "ladybug", x: 10 }] };
  const pool = Array.from({ length: 30 }, (_, i) => `q${i}`);
  const out = storyCore.assignQuestions(level, pool);
  const need = (k) => core.ENEMY_KINDS[k].hp + storyCore.SPARE_QUESTIONS;
  assert.equal(out[2].length, need("ladybug"));
  assert.deepEqual(out[2], pool.slice(0, need("ladybug")), "the leftmost enemy gets the first (easiest)");
  assert.deepEqual(out[0], pool.slice(need("ladybug"), need("ladybug") + need("slime")));
  assert.equal(out[1][0], pool[(need("ladybug") + need("slime")) % pool.length], "the boss gets the last ones");
  assert.deepEqual(storyCore.assignQuestions(level, []), [[], [], []]);
  assert.equal(storyCore.slotsNeeded(level), need("slime") + need("boss") + need("ladybug"));
});

test("story: every level's pool covers its enemies (the pool wraps only for the biggest levels)", () => {
  for (const l of STORY_LEVELS) {
    const need = storyCore.slotsNeeded(parseLevel(l.def));
    assert.ok(l.questions.length >= Math.min(need, 8), `${l.id}: ${l.questions.length} questions for ${need} slots`);
  }
});

test("story: levels open one after another", () => {
  const ids = ["a", "b", "c"];
  assert.equal(storyCore.isLevelUnlocked(0, ids, []), true);
  assert.equal(storyCore.isLevelUnlocked(1, ids, []), false);
  assert.equal(storyCore.isLevelUnlocked(1, ids, [{ levelId: "a", stars: 0, bestScore: 5, bestTime: null }]), false, "played but not won");
  assert.equal(storyCore.isLevelUnlocked(1, ids, [{ levelId: "a", stars: 1, bestScore: 5, bestTime: 30 }]), true);
  assert.equal(storyCore.isLevelUnlocked(2, ids, [{ levelId: "a", stars: 3, bestScore: 5, bestTime: 30 }]), false);
  assert.equal(storyCore.currentLevelIndex(ids, []), 0);
  assert.equal(storyCore.currentLevelIndex(ids, [{ levelId: "a", stars: 2, bestScore: 1, bestTime: 9 }]), 1);
  assert.equal(storyCore.currentLevelIndex(ids, ids.map((levelId) => ({ levelId, stars: 1, bestScore: 1, bestTime: 9 }))), 2, "all done: the last");
  assert.deepEqual(storyCore.betterRecord({ levelId: "a", stars: 3, bestScore: 100, bestTime: 50 }, { levelId: "a", stars: 1, bestScore: 400, bestTime: 40 }), { levelId: "a", stars: 3, bestScore: 400, bestTime: 40 });
  assert.equal(storyCore.betterRecord({ levelId: "a", stars: 1, bestScore: 1, bestTime: null }, { levelId: "a", stars: 1, bestScore: 1, bestTime: 61 }).bestTime, 61, "a first time counts");
  assert.equal(storyCore.betterRecord({ levelId: "a", stars: 1, bestScore: 1, bestTime: 20 }, { levelId: "a", stars: 1, bestScore: 1, bestTime: null }).bestTime, 20);
  assert.equal(storyCore.formatTime(5.4), "0:05");
  assert.equal(storyCore.formatTime(125.76, true), "2:05.8");
  assert.equal(storyCore.formatTime(-3), "0:00");
});

test("story: lessons are recommended for what was missed, the most missed first", () => {
  const lessons = [
    { id: "l1", title: "One", teaches: ["o1", "o2"] },
    { id: "l2", title: "Two", teaches: ["o3"] },
    { id: "l3", title: "Three", teaches: ["o4"] },
  ];
  assert.deepEqual(storyCore.recommendLessons([], lessons), []);
  const r = storyCore.recommendLessons(["o3", "o1", "o2", "zzz", "o3", "o3", "o4"], lessons);
  assert.deepEqual(r.map((x) => [x.lessonId, x.missed]), [["l2", 3], ["l1", 2], ["l3", 1]]);
  assert.equal(storyCore.recommendLessons(["o1", "o3", "o4"], lessons, 2).length, 2);
});

const storyQs = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, itemId: `s${i}`, objectiveId: `o${i % 2}`, question: `Q${i}?`, options: ["A", "B", "C", "D"], correctAnswer: i % 4, explanation: "because", difficulty: "easy" }));

test("story battle: each enemy asks its own list in order, again from the start when it runs out", () => {
  const qs = storyQs(6);
  const s = storyBattle.createStoryBattle([[qs[0], qs[1]], [qs[2]]], () => 0.3);
  const first = storyBattle.askStory(s, 0);
  assert.equal(first.question.id, "s0");
  assert.equal(first.question.options.length, 2, "two options in a battle");
  assert.ok(first.question.options.includes("A"), "the right one is kept");
  assert.equal(storyBattle.askStory(s, 0).token, first.token, "asking again while open gives the same one");
  const ans = storyBattle.answerStory(s, first.token, first.question.correctAnswer);
  assert.equal(ans.correct, true);
  storyBattle.settleStory(s, first.token, true);
  assert.equal(storyBattle.askStory(s, 0).question.id, "s1");
  storyBattle.settleStory(s, s.open.token, true);
  assert.equal(storyBattle.askStory(s, 0).question.id, "s0", "wraps");
  storyBattle.settleStory(s, s.open.token, true);
  assert.equal(storyBattle.askStory(s, 1).question.id, "s2");
  assert.equal(storyBattle.askStory(storyBattle.createStoryBattle([[]]), 0), null);
});

test("story battle: wrong answers are remembered by objective; a restart forgets them", () => {
  const s = storyBattle.createStoryBattle([storyQs(4)], () => 0.5);
  const a = storyBattle.askStory(s, 0);
  const wrongIndex = a.question.correctAnswer === 0 ? 1 : 0;
  assert.equal(storyBattle.answerStory(s, a.token, wrongIndex).correct, false);
  storyBattle.settleStory(s, a.token, false);
  assert.deepEqual(s.missed, ["o0"]);
  assert.equal(s.wrong, 1);
  const b = storyBattle.askStory(s, 0);
  storyBattle.settleStory(s, b.token, true);
  assert.equal(s.right, 1);
  assert.equal(storyBattle.answerStory(s, "stale", 0), null, "an old token is refused");
  {
    // One answer per question: a second tap (the other option, a double tap) is refused, so a right answer is never also judged wrong
    const t = storyBattle.createStoryBattle([[{ id: "q", itemId: "q", objectiveId: "o", question: "?", options: ["a", "b"], correctAnswer: 0, explanation: "", difficulty: "easy", ordered: true }]], () => 0.5);
    const q = storyBattle.askStory(t, 0);
    assert.equal(storyBattle.answerStory(t, q.token, 0).correct, true);
    assert.equal(storyBattle.answerStory(t, q.token, 1), null, "the second answer gives nothing");
    assert.equal(storyBattle.answerStory(t, q.token, 0), null);
  }
  {
    // A boss takes three hits, so three questions in a row: each is answered once, settled once, and the next one is a NEW question (an answered one is never asked again)
    const mk = (n) => ({ id: `b${n}`, itemId: `b${n}`, objectiveId: "o", question: "?", options: ["a", "b"], correctAnswer: n % 2, explanation: "", difficulty: "easy", ordered: true });
    const t = storyBattle.createStoryBattle([[mk(0), mk(1), mk(2)]], () => 0.5);
    const seen = [];
    for (let hit = 0; hit < 3; hit++) {
      const q = storyBattle.askStory(t, 0);
      seen.push(q.token);
      assert.equal(storyBattle.askStory(t, 0), q, "asking again before the answer gives the same question");
      const right = q.question.correctAnswer;
      assert.equal(storyBattle.answerStory(t, q.token, right).correct, true);
      assert.equal(storyBattle.answerStory(t, q.token, 1 - right), null, "the other option, a moment later, is refused");
      const fresh = storyBattle.askStory(t, 0);
      assert.notEqual(fresh.token, q.token, "an answered question is not asked a second time");
      t.open = null;
    }
    assert.equal(new Set(seen).size, 3);
  }
  const again = storyBattle.restartStoryBattle(s);
  assert.deepEqual(again.missed, []);
  assert.equal(storyBattle.askStory(again, 0).question.id, "s0", "starts from the first question again");
});

test("story questions: choice and fact-or-myth items become battle questions; the rest are left out", () => {
  const choice = { id: "c", objectiveId: "o1", type: "choice", difficulty: 1, data: { prompt: "Pick?", options: [{ id: "a", label: "One" }, { id: "b", label: "Two" }, { id: "c", label: "Three" }], answer: "b", explanation: "why" } };
  const q = storyQ.itemToStoryQuestion(choice);
  assert.deepEqual([q.question, q.options, q.correctAnswer, q.itemId, q.objectiveId, q.difficulty], ["Pick?", ["One", "Two", "Three"], 1, "c", "o1", "easy"]);
  const myth = { id: "m", objectiveId: "o2", type: "true_or_myth", difficulty: 3, data: { statement: "Atoms are solid.", answer: "myth", explanation: "no" } };
  const m = storyQ.itemToStoryQuestion(myth);
  assert.deepEqual([m.options, m.correctAnswer, m.ordered, m.difficulty], [["True", "Myth"], 1, true, "hard"]);
  assert.equal(storyBattle.twoOptions(m, () => 0.1).options.join(), "True,Myth", "fact or myth keeps its order");
  assert.equal(storyQ.itemToStoryQuestion({ ...choice, type: "order" }), null);
  assert.equal(storyQ.itemToStoryQuestion({ ...choice, data: { ...choice.data, answer: "zzz" } }), null);
  assert.equal(storyQ.itemToStoryQuestion({ ...myth, data: { statement: "", answer: "true" } }), null);
  assert.equal(storyQ.questionsFromItems([choice, myth, { ...choice, type: "match" }]).length, 2);
});

test("story: every fixed question exists in the content database and fits a battle", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const rows = db.prepare("SELECT id, objective_id, type, data, difficulty FROM items").all();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lessons = db.prepare("SELECT id, unit_id, teaches FROM lessons").all();
  const objectives = db.prepare("SELECT id, unit_id FROM objectives").all();
  const unitOf = new Map(objectives.map((o) => [o.id, o.unit_id]));
  for (const l of STORY_LEVELS) {
    for (const id of l.questions) {
      const row = byId.get(id);
      assert.ok(row, `${l.id}: item ${id} is in the bank`);
      const item = { id: row.id, objectiveId: row.objective_id, type: row.type, difficulty: row.difficulty, data: JSON.parse(row.data) };
      assert.ok(storyQ.itemToStoryQuestion(item), `${l.id}: ${id} fits a battle`);
      assert.equal(unitOf.get(row.objective_id), l.unitId, `${l.id}: ${id} belongs to unit ${l.unitId}`);
      assert.ok(lessons.some((x) => x.unit_id === l.unitId && JSON.parse(x.teaches).includes(row.objective_id)), `${l.id}: a lesson teaches ${id}`);
    }
  }
  db.close();
});

/* ------------------------------- the entrance ------------------------------ */

const ent = loadTs("components/platformer/entrance-core.ts");

test("entrance: the hero walks in from beyond the left edge, stops at the start, is ready, then it is done", () => {
  const plan = ent.entrancePlan(3, 0);
  assert.ok(plan.fromX < 0, "starts off screen");
  assert.equal(plan.toX, 3);
  assert.ok(plan.walkMs > 500 && plan.walkMs < 3000);
  assert.equal(plan.total, plan.walkMs + ent.READY_TOTAL);
  const first = ent.entrancePose(0, plan);
  assert.equal(first.x, plan.fromX);
  assert.ok(first.walking && first.readyMs === null && !first.done);
  let last = -Infinity;
  for (let t = 0; t <= plan.walkMs; t += 16) {
    const p = ent.entrancePose(t, plan);
    assert.ok(p.x >= last - 1e-9, "never steps back");
    assert.ok(p.x <= plan.toX + 1e-9);
    last = p.x;
  }
  const ready = ent.entrancePose(plan.walkMs + 10, plan);
  assert.ok(!ready.walking && ready.readyMs === 10 && ready.x === 3);
  assert.equal(ent.entrancePose(plan.total - 1, plan).done, false);
  assert.equal(ent.entrancePose(plan.total, plan).done, true);
});

test("entrance: the walk slows to a stop and covers exactly the distance", () => {
  assert.equal(ent.walkProgress(0), 0);
  assert.ok(Math.abs(ent.walkProgress(1) - 1) < 1e-9);
  const step = (a, b) => ent.walkProgress(b) - ent.walkProgress(a);
  assert.ok(step(0.9, 1) < step(0.4, 0.5), "slower at the end than in the middle");
  assert.ok(Math.abs(step(0.1, 0.2) - step(0.4, 0.5)) < 1e-9, "an even pace first");
});

test("entrance: a view that starts further along the level walks in from its own left edge", () => {
  const plan = ent.entrancePlan(40, 36);
  assert.ok(plan.fromX < 36 && plan.fromX >= 36 - 2);
});

test("entrance: the ready animation crouches, hops and lands back on the ground, then cheers and holds", () => {
  const { CLIPS } = hero;
  const frames = new Set();
  for (let t = 0; t <= ent.READY_TOTAL; t += 10) {
    const p = ent.readyPose(t);
    frames.add(p.frame);
    assert.ok(p.frame >= 0 && p.frame < hero.TOTAL_FRAMES);
    assert.ok(p.dy <= 0 && p.dy >= -ent.READY.hopHeight - 1e-9, "only ever up");
  }
  assert.equal(ent.readyPose(0).dy, 0);
  assert.equal(ent.readyPose(0).frame, CLIPS.land.start, "crouches first");
  const top = ent.readyPose(ent.READY.crouch + ent.READY.hop / 2);
  assert.ok(top.dy < -ent.READY.hopHeight * 0.9, "the top of the hop");
  assert.equal(ent.readyPose(ent.READY.crouch + ent.READY.hop + 1).dy, 0, "back on the ground");
  assert.ok(frames.has(CLIPS.rise.start) && frames.has(CLIPS.fall.start) && frames.has(CLIPS.cheer.start));
  assert.equal(ent.readyPose(ent.READY_TOTAL).frame, CLIPS.cheer.start + CLIPS.cheer.count - 1, "holds the last cheer");
});

test("points to the next star", () => {
  assert.equal(core.pointsToNextStar(100, 1000, 1), 500);
  assert.equal(core.pointsToNextStar(700, 1000, 2), 150);
  assert.equal(core.pointsToNextStar(900, 1000, 3), null);
  assert.equal(core.pointsToNextStar(0, 1000, 0), null, "no flag");
});

/* ------------------------- level moments and the boss's defeat ------------------------- */

const wfx = loadTs("components/platformer/world-fx-core.ts");
const vic = loadTs("components/platformer/boss-victory-core.ts");

test("stepped holds the clock still between steps, so a drifting thing sends the native side one change per step", () => {
  assert.equal(wfx.stepped(0.0, 20), 0);
  assert.equal(wfx.stepped(0.049, 20), 0);
  assert.equal(wfx.stepped(0.05, 20), 0.05);
  assert.equal(wfx.stepped(1.0, 30), 1);
  // one second of 60 fps frames makes only DECOR_FPS different values
  const values = new Set();
  for (let f = 0; f < 60; f++) values.add(Math.sin(wfx.stepped(f / 60, wfx.DECOR_FPS) * 3.2));
  assert.ok(values.size <= wfx.DECOR_FPS + 1, `${values.size} values in a second`);
  assert.ok(wfx.DECOR_FPS >= 15 && wfx.SPIN_FPS >= 24, "still smooth to the eye");
});

test("world fx: every moment rests at its start and end, and stays in range", () => {
  const at = (f, total, step = 8) => { const out = []; for (let t = -10; t <= total + 10; t += step) out.push([t, f(t)]); return out; };
  for (const [t, p] of at(wfx.blockBump, wfx.WORLD_FX.bump)) {
    if (t <= 0 || t >= wfx.WORLD_FX.bump) assert.deepEqual(p, { dy: 0, sx: 1, sy: 1 });
    assert.ok(p.dy <= 0 && p.dy >= -0.31, "a bump only goes up, a third of a tile");
  }
  assert.ok(wfx.blockBump(85).dy < -0.29, "the top of the bump");
  for (const [t, p] of at(wfx.coinPop, wfx.WORLD_FX.coin)) {
    assert.ok(p.opacity >= 0 && p.opacity <= 1 && p.sx > 0 && p.sx <= 1);
    if (t <= 0 || t >= wfx.WORLD_FX.coin) assert.equal(p.opacity, 0, "gone at the ends");
  }
  assert.ok(wfx.coinPop(340).dy < -2, "the coin rises over two tiles");
  for (const [, p] of at(wfx.heartPop, wfx.WORLD_FX.heart)) assert.ok(p.opacity >= 0 && p.opacity <= 1 + 1e-9);
  assert.ok(wfx.heartPop(260).scale > 1.2, "the heart swells as it pops");
  for (const [t, p] of at(wfx.coinGet, wfx.WORLD_FX.coinGet)) if (t <= 0 || t >= wfx.WORLD_FX.coinGet) assert.equal(p.opacity, 0);
  for (const [t, p] of at(wfx.flagPop, wfx.WORLD_FX.flagPop)) {
    if (t <= 0 || t >= wfx.WORLD_FX.flagPop) assert.deepEqual(p, { scale: 1, sy: 1, rotate: 0 });
  }
  assert.ok(wfx.flagPop(120).scale > 1.25);
  assert.equal(wfx.signRock(0), 0);
  assert.equal(wfx.signRock(wfx.WORLD_FX.sign), 0);
  assert.ok(wfx.signHint(0.2, 0) <= 0);
});

test("world fx: the brick's four pieces fly outward, up first then down, and fade out", () => {
  for (let i = 0; i < 4; i++) {
    const early = wfx.brickPiece(i, 120);
    const late = wfx.brickPiece(i, 700);
    assert.ok(i % 2 === 1 ? early.x > 0 : early.x < 0, `piece ${i} goes to its own side`);
    assert.ok(early.y < 0, "up at first");
    assert.ok(late.y > early.y, "falls back down");
    assert.ok(wfx.brickPiece(i, 800).opacity < 0.1 && wfx.brickPiece(i, 100).opacity === 1);
    assert.equal(wfx.brickPiece(i, wfx.WORLD_FX.brick).opacity, 0);
  }
  assert.notEqual(wfx.brickPiece(0, 300).x, wfx.brickPiece(2, 300).x, "pieces differ");
});

test("world fx: the sign's bubble pops out of the sign and shrinks back into it", () => {
  const open0 = wfx.bubbleFrame(true, 0);
  assert.ok(Math.abs(open0.scale - 0.35) < 1e-9 && open0.opacity === 0);
  const open1 = wfx.bubbleFrame(true, wfx.WORLD_FX.bubbleIn);
  assert.deepEqual([open1.scale, open1.opacity, open1.lift], [1, 1, 0]);
  let last = 0;
  for (let t = 0; t <= wfx.WORLD_FX.bubbleIn; t += 10) { const f = wfx.bubbleFrame(true, t); assert.ok(f.scale >= last && f.scale <= 1, "no overshoot"); last = f.scale; }
  const gone = wfx.bubbleFrame(false, wfx.WORLD_FX.bubbleOut);
  assert.ok(gone.opacity === 0 && gone.scale < 0.7);
  assert.ok(wfx.WORLD_FX.bubbleOut < wfx.WORLD_FX.bubbleIn, "leaves quicker than it arrives");
});

test("boss victory: shudder, swell, burst; the boss is gone from the burst on; the way out returns everything to rest", () => {
  const { VICTORY, victoryPose } = vic;
  const start = victoryPose(0);
  assert.deepEqual([start.bars, start.zoom, start.pan, start.gone, start.heroFrame], [0, 1, 0, false, null]);
  assert.ok(victoryPose(900).boss.sx > 1.2, "about to burst");
  for (const t of [100, 300, 700, 900]) assert.equal(victoryPose(t).boss.flash, 0, "a beaten boss never flashes");
  assert.equal(victoryPose(VICTORY.explodeAt - 1).gone, false);
  assert.equal(victoryPose(VICTORY.explodeAt).gone, true);
  assert.ok(victoryPose(VICTORY.explodeAt + 60).punch > 0, "the picture kicks");
  assert.ok(victoryPose(VICTORY.explodeAt + 100).heroFrame >= hero.CLIPS.cheer.start, "the hero cheers");
  const end = victoryPose(VICTORY.total);
  assert.deepEqual([end.bars, end.pan, end.shake, end.punch], [0, 0, 0, 0]);
  assert.equal(victoryPose(VICTORY.flagAt).pan, 1, "the camera is on the flag when it opens");
  assert.equal(victoryPose(VICTORY.zoomOutEnd).zoom, 0);
  for (let t = 0; t <= VICTORY.total; t += 25) {
    const p = victoryPose(t);
    for (const v of [p.bars, p.zoom, p.pan]) assert.ok(v >= -1e-9 && v <= 1 + 1e-9);
  }
  assert.ok(VICTORY.zoomOutEnd <= VICTORY.panEnd && VICTORY.panEnd < VICTORY.flagAt + 1 && VICTORY.flagAt < VICTORY.returnAt && VICTORY.returnAt < VICTORY.total);
});

test("boss victory: confetti pieces start above the top, fall, and are gone before the end", () => {
  for (let i = 0; i < vic.CONFETTI; i++) {
    assert.equal(vic.confettiPiece(i, 0).opacity, 0, "not yet");
    assert.equal(vic.confettiPiece(i, vic.VICTORY.total + 4000).opacity, 0, "gone");
    const p = vic.confettiPiece(i, 1900);
    assert.ok(p.x > -0.1 && p.x < 1.1 && p.color >= 0 && p.color < 5 && p.size >= 7);
  }
  const seen = new Set(Array.from({ length: vic.CONFETTI }, (_, i) => vic.confettiPiece(i, 0).color));
  assert.ok(seen.size >= 3, "several colours");
});

/* ------------------------------- the exit through the door ------------------------------- */

const exitc = loadTs("components/platformer/exit-core.ts");

test("exit: the hero walks to the door, goes in and is gone; the door is open only while they pass", () => {
  const { EXIT, exitPose } = exitc;
  const p0 = exitPose(0, 100, 101);
  assert.deepEqual([p0.x, p0.walking, p0.enter, p0.gone, p0.doorOpen, p0.pan, p0.zoom], [100, true, 0, false, false, 0, 0]);
  assert.equal(exitPose(EXIT.openAt, 100, 101).doorOpen, true);
  assert.equal(exitPose(EXIT.walkEnd, 100, 101).x, 101, "at the door's middle");
  assert.equal(exitPose(EXIT.walkEnd, 100, 101).walking, false);
  assert.equal(exitPose(EXIT.enterEnd - 1, 100, 101).gone, false);
  assert.equal(exitPose(EXIT.enterEnd, 100, 101).gone, true);
  assert.equal(exitPose(EXIT.enterEnd, 100, 101).enter, 1);
  assert.equal(exitPose(EXIT.closeAt - 1, 100, 101).doorOpen, true);
  assert.equal(exitPose(EXIT.closeAt, 100, 101).doorOpen, false, "shuts behind them");
  assert.ok(exitPose(EXIT.closeAt + 100, 100, 101).punch > 0);
  assert.equal(exitPose(EXIT.closeAt + 300, 100, 101).punch, 0);
  let last = -1;
  for (let t = 0; t <= EXIT.walkEnd; t += 10) { const x = exitPose(t, 100, 101).x; assert.ok(x >= last && x <= 101); last = x; }
  assert.equal(exitPose(0, 101, 101).walking, false, "already at the door: no walking");
  assert.equal(exitPose(EXIT.zoomEnd, 100, 101).zoom, 1);
  assert.equal(exitPose(EXIT.panEnd, 100, 101).pan, 1);
});

test("exit: the title and the stars come after the door shuts, the panel after the last star", () => {
  const { EXIT, exitTotal, starAt } = exitc;
  assert.ok(EXIT.closeAt < EXIT.titleAt && EXIT.titleAt < EXIT.starsAt);
  assert.ok(EXIT.openAt < EXIT.walkEnd && EXIT.walkEnd < EXIT.enterEnd && EXIT.enterEnd <= EXIT.closeAt);
  assert.equal(starAt(0), EXIT.starsAt);
  assert.equal(starAt(2) - starAt(1), EXIT.starGap);
  assert.ok(exitTotal(3) > starAt(2) + 300, "after the third star has landed");
  assert.ok(exitTotal(1) < exitTotal(3));
  assert.equal(exitTotal(0), exitTotal(1), "never rises before a star's time has passed");
});

test("exit: a star swells out of nothing, rocks and rests; an unearned one is pale and does not float", () => {
  const { starPop } = exitc;
  assert.deepEqual(starPop(0, true), { scale: 0, rotate: 0, opacity: 0, dy: 0 });
  assert.ok(starPop(130, true).scale > 1.4);
  assert.equal(starPop(400, true).scale, 1);
  assert.equal(starPop(500, true).opacity, 1);
  assert.equal(starPop(500, false).opacity, 0.55);
  assert.equal(starPop(900, false).dy, 0);
  assert.ok(Math.abs(starPop(900, true).dy) <= 0.06 + 1e-9);
});

test("exit: out of hearts lies down, zooms in, then the panel", () => {
  const { LOST, lostPose } = exitc;
  assert.equal(lostPose(0).zoom, 0);
  assert.equal(lostPose(LOST.zoomEnd).zoom, 1);
  for (const t of [0, 300, 1000, 5000]) assert.equal(lostPose(t).heroFrame, hero.CLIPS.down.start, "one still frame, never a loop");
  assert.equal(hero.CLIPS.down.count, 1);
  assert.equal(hero.CLIPS.down.start + 1, hero.TOTAL_FRAMES, "the last frame of the sheet");
  assert.ok(LOST.zoomEnd <= LOST.panelAt && LOST.titleAt < LOST.panelAt);
});

/* ----------------------------------- emotes ----------------------------------- */

const emo = loadTs("components/platformer/emote-core.ts");

test("emote: a bubble pops, hangs, shrinks away and is gone", () => {
  const { EMOTE, emotePose, emoteTotal } = emo;
  assert.deepEqual(emotePose(0), { scale: 0, opacity: 0, dy: 0 });
  assert.ok(emotePose(130).scale > 1.15, "overshoots");
  assert.equal(emotePose(EMOTE.pop).scale, 1);
  assert.equal(emotePose(EMOTE.pop + 400).opacity, 1);
  assert.ok(Math.abs(emotePose(EMOTE.pop + 400).dy) <= 0.03 + 1e-9);
  const total = emoteTotal();
  assert.equal(total, EMOTE.pop + EMOTE.hold + EMOTE.out);
  assert.ok(emotePose(total - 20).opacity < 0.2 && emotePose(total - 20).scale < 1);
  assert.deepEqual(emotePose(total), { scale: 0, opacity: 0, dy: 0 });
  assert.equal(emoteTotal(2200), EMOTE.pop + 2200 + EMOTE.out);
  for (let t = 0; t < total; t += 5) { const p = emotePose(t); assert.ok(p.opacity >= 0 && p.opacity <= 1 && p.scale >= 0); }
});

test("emote: the rules say the right thing for each moment", () => {
  const { EMOTE_NAMES, emotesForEvent, emotesForAnswer, sleepDue } = emo;
  const hero = { kind: "hero" };
  assert.deepEqual(emotesForEvent({ type: "hurt" }), [{ target: hero, name: "heartBroken" }]);
  assert.equal(emotesForEvent({ type: "battle", enemy: 2 })[0].name, "exclamation");
  assert.equal(emotesForEvent({ type: "battle", enemy: 2 }, (i) => i === 2)[0].name, "anger");
  assert.deepEqual(emotesForEvent({ type: "battle", enemy: 2 })[0].target, { kind: "enemy", index: 2 });
  assert.equal(emotesForEvent({ type: "block", reward: "heart" })[0].name, "heart");
  assert.deepEqual(emotesForEvent({ type: "block", reward: "coin" }), []);
  assert.equal(emotesForEvent({ type: "key" })[0].name, "idea");
  assert.equal(emotesForEvent({ type: "locked" })[0].name, "question");
  assert.equal(emotesForEvent({ type: "flag-locked" })[0].name, "question");
  assert.equal(emotesForEvent({ type: "checkpoint" })[0].name, "star");
  assert.deepEqual(emotesForEvent({ type: "coin" }), []);
  assert.deepEqual(emotesForAnswer(true, true, 1), [{ target: hero, name: "stars" }]);
  assert.deepEqual(emotesForAnswer(true, false, 1).map((r) => r.name), ["swirl", "faceHappy"]);
  assert.deepEqual(emotesForAnswer(false, false, 1).map((r) => r.name), ["laugh", "heartBroken"]);
  assert.equal(emotesForAnswer(false, false, 4)[0].target.index, 4);
  assert.equal(sleepDue(3, Infinity), false);
  assert.equal(sleepDue(8, Infinity), true);
  assert.equal(sleepDue(8, 1), false, "not again at once");
  for (const r of [...emotesForEvent({ type: "hurt" }), ...emotesForAnswer(false, false, 0)]) assert.ok(EMOTE_NAMES.includes(r.name));
});

test("landingY: a hero in the air comes down to the ground under them, a hero over a pit has none", () => {
  const world = createWorld(parseLevel({ id: "l", title: "l", rows: ["....F.", "..P...", "######", "......"] }));
  world.hero.y = 0.2;
  world.hero.onGround = false;
  const y = landingY(world);
  assert.ok(y !== null && Math.abs(y + world.hero.h - 2) < 1e-6, "feet on the top of the ground row");
  assert.equal(world.hero.y, 0.2, "the world is untouched");
  const pit = createWorld(parseLevel({ id: "l", title: "l", rows: ["....F.", "..P...", "##..##", "......"] }));
  pit.hero.x = 2.2;
  pit.hero.y = 0.2;
  assert.equal(landingY(pit), null);
});

/* ------------------------------ footsteps and ground sounds ------------------------------ */

const psfx = loadTs("components/platformer/platformer-sfx-core.ts");
const sfxc = loadTs("services/sfx-core.ts");

test("ground sounds: every level theme has real cues for steps, jumps, landings and the fall", () => {
  const { groundOf, stepCue, JUMP_CUE, landCue, fallCue, cuesFor } = psfx;
  assert.equal(groundOf("purple"), "soil");
  assert.equal(groundOf("snow"), "snow");
  for (const theme of ["grass", "snow", "sand", "stone", "purple"]) {
    for (const cue of [stepCue(theme, 0), stepCue(theme, 1), JUMP_CUE, landCue(theme), fallCue(theme), ...cuesFor(theme)]) assert.ok(cue in sfxc.CUES, `${theme}: no cue ${cue}`);
    assert.notEqual(stepCue(theme, 0), stepCue(theme, 1), "left and right feet differ");
    assert.equal(stepCue(theme, 2), stepCue(theme, 0));
  }
  assert.equal(JUMP_CUE, "game.jump", "one jump sound on every ground");
  assert.equal(fallCue("snow"), "game.fall-grass");
  assert.equal(stepCue("stone", 3), "game.step-stone-right");
});

test("footsteps: one footfall each half stride on the ground, none in the air or standing still", () => {
  const { STEP_LENGTH, stepIndex, footstepDue } = psfx;
  assert.equal(stepIndex(0), 0);
  assert.equal(stepIndex(STEP_LENGTH - 0.01), 0);
  assert.equal(stepIndex(STEP_LENGTH), 1);
  assert.equal(footstepDue(0, STEP_LENGTH * 0.5, true, 6), null, "not yet");
  assert.equal(footstepDue(0, STEP_LENGTH * 1.1, true, 6), 1);
  assert.equal(footstepDue(1, STEP_LENGTH * 1.1, true, 6), null, "already heard");
  assert.equal(footstepDue(0, STEP_LENGTH * 1.1, false, 6), null, "in the air");
  assert.equal(footstepDue(0, STEP_LENGTH * 1.1, true, 0.1), null, "standing still");
  // walking 10 tiles gives the count the stride says
  let last = 0; let n = 0;
  for (let d = 0; d <= 10; d += 0.05) { const i = footstepDue(last, d, true, 6); if (i !== null) { last = i; n++; } }
  assert.equal(n, Math.floor(10 / STEP_LENGTH));
});
