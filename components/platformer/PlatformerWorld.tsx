/**
 * Draws the platformer world (docs/features/PLATFORMER_SPEC.md §5). Nothing here decides anything: the screen
 * steps `platformer-core`, writes one array of pixel numbers per frame into `frame` (see `fillFrame`
 * in platformer-view.ts) and every moving thing reads its own slice of it on the UI thread, so a
 * frame is one write however many things move. The ground is built in chunks of columns and only
 * the chunks near the view exist, so a long level costs no more than a short one.
 */

import { memo, useEffect, useMemo } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { ENEMY_KINDS, type BlockTile, type EnemyKind, type Level } from "./platformer-core";
import {
  CHUNK_COLS,
  FRAME_HEAD,
  FRAME_PER_ENEMY,
  HERO_DRAW,
  backdropStack,
  platformSlot,
  springSlot,
  type BiomeName,
  type TerrainTheme,
  groundArt,
  underArt,
  waterArt,
} from "./platformer-view";
import { SHEET, SHEET_ROWS } from "./hero-anim-core";
import { EMOTE, emotePose, emoteTotal, type EmoteInstance } from "./emote-core";
import { BACKGROUND_CLOUDS, BACKGROUND_SKY, BIOMES, EMOTE_ASPECT, EMOTE_SPRITES, ENEMY_SPRITES, FLASH_HIT, FLASH_HURT, HERO_SHEET, PROP_SPRITES, SCENERY_SPRITES, gemSprite, SKY_COLOR, TERRAIN, WATER_SPRITES,
  LAVA_SPRITES, tileSprite } from "./sprites";
import { SHINE, shineFrame } from "@/components/motion/shine-core";
import { useTriggerClock } from "@/components/motion/use-trigger-clock";
import { Text } from "@/components/ui/text";
import { fontFaces, useTheme, withAlpha } from "@/theme";

import { SignBubble } from "./SignBubble";
import { WorldFx, type WorldEffect } from "./WorldFx";
import { DECOR_FPS, SPIN_FPS, WORLD_FX, blockBump, flagPop, signHint, signRock, stepped } from "./world-fx-core";

/* ------------------------------------------------------------------ */
/* Ground, water, decoration and spikes: one chunk of columns          */
/* ------------------------------------------------------------------ */

interface ChunkItem { key: string; source: number; c: number; r: number; w: number; h: number; dy: number; bleed?: boolean; flip?: boolean }

/** The pictures of one chunk, worked out once per level, theme and screen height and kept: a chunk that scrolls out of range and back in costs a mount, not a walk over its tiles. */
const CHUNK_CACHE = new WeakMap<Level, Map<string, ChunkItem[]>>();
function chunkItems(level: Level, index: number, underRows: number, theme: TerrainTheme): ChunkItem[] {
  let perLevel = CHUNK_CACHE.get(level);
  if (!perLevel) {
    perLevel = new Map();
    CHUNK_CACHE.set(level, perLevel);
  }
  const key = `${theme}:${underRows}:${index}`;
  const hit = perLevel.get(key);
  if (hit) return hit;
  const items = buildChunkItems(level, index, underRows, theme);
  perLevel.set(key, items);
  return items;
}

function buildChunkItems(level: Level, index: number, underRows: number, theme: TerrainTheme): ChunkItem[] {
  const from = index * CHUNK_COLS;
  const to = Math.min(level.cols, from + CHUNK_COLS);
  const out: ChunkItem[] = [];
  // Things only looked at come first, so the ground and the hero are drawn over them
  for (const sc of level.scenery) {
    if (sc.c < from || sc.c >= to) continue;
    const kind = sc.kind;
    if (kind === "torch") continue; // drawn by `Torch`, which flickers
    out.push({ key: `sc${sc.c}_${sc.r}`, source: SCENERY_SPRITES[kind] as number, c: sc.c, r: sc.r, w: 1, h: 1, dy: 0 });
  }
  for (let r = 0; r < level.rows; r++) {
    for (let c = from; c < to; c++) {
      const art = groundArt(level, c, r);
      if (art) out.push({ key: `t${c}_${r}`, source: tileSprite(theme, art) as number, c, r, w: 1, h: 1, dy: 0, bleed: true });
    }
  }
  // the ground goes on below the level as dirt, to the bottom of the screen
  for (let r = level.rows; r < level.rows + underRows; r++) {
    // (a pit's water goes on below its surface as water blocks, drawn by `WaterColumn`)
    for (let c = from; c < to; c++) {
      if (level.water[(level.rows - 1) * level.cols + c] !== 0) continue;
      out.push({ key: `u${c}_${r}`, source: tileSprite(theme, underArt(level, c)) as number, c, r, w: 1, h: 1, dy: 0, bleed: true });
    }
  }
  for (const d of level.decor) {
    if (d.c < from || d.c >= to) continue;
    if (d.kind === "bush") out.push({ key: `d${d.c}_${d.r}`, source: PROP_SPRITES.bush as number, c: d.c, r: d.r, w: 1, h: 1, dy: 0 });
  }
  for (let r = 0; r < level.rows; r++) {
    for (let c = from; c < to; c++) {
      const i = r * level.cols + c;
      if (level.oneway[i] === 1) out.push({ key: `ow${c}_${r}`, source: (level.bridge[i] === 1 ? PROP_SPRITES.bridge : PROP_SPRITES.plank) as number, c, r, w: 1, h: 1, dy: 0 });
      else if (level.conveyor[i] !== 0) out.push({ key: `cv${c}_${r}`, source: PROP_SPRITES.conveyor as number, c, r, w: 1, h: 1, dy: 0, bleed: true, flip: level.conveyor[i] < 0 });
    }
  }
  for (const s of level.spikes) {
    if (s.x < from || s.x >= to) continue;
    out.push({ key: `s${s.x}_${s.y}`, source: PROP_SPRITES.spikes as number, c: s.x, r: s.y, w: 1, h: 1, dy: 0 });
  }
  return out;
}

const Chunk = memo(function Chunk({ level, index, tile, underRows, flagLocked, doorOpen, theme, frame }: { level: Level; index: number; tile: number; underRows: number; flagLocked: boolean; doorOpen: boolean; theme: TerrainTheme; frame: SharedValue<number[]> }) {
  const items = useMemo(() => chunkItems(level, index, underRows, theme), [level, index, underRows, theme]);
  const torches = useMemo(() => level.scenery.filter((sc) => sc.kind === "torch" && sc.c >= index * CHUNK_COLS && sc.c < (index + 1) * CHUNK_COLS), [level, index]);
  const flag = level.decor.find((d) => d.kind === "flag");
  const hasFlag = flag && flag.c >= index * CHUNK_COLS && flag.c < (index + 1) * CHUNK_COLS;
  return (
    <>
      {items.map((it) => (
        <Image
          key={it.key}
          source={it.source}
          // Ground tiles reach a pixel into the next one: when the view is scaled (a battle zoom) a seam of sky would show between them otherwise
          style={{ position: "absolute", left: it.c * tile, top: it.r * tile, width: tile * it.w + (it.bleed ? 1 : 0), height: tile * it.h + (it.bleed ? 1 : 0), transform: it.flip ? [{ scaleX: -1 }] : undefined }}
          fadeDuration={0}
        />
      ))}
      {torches.map((sc) => (
        <Torch key={`torch${sc.c}_${sc.r}`} c={sc.c} r={sc.r} tile={tile} frame={frame} />
      ))}
      {hasFlag ? <Door c={flag.c} r={flag.r} tile={tile} locked={flagLocked} open={doorOpen} /> : null}
    </>
  );
});

/** A stretch of water: its columns, the row of its surface, and how many rows it fills down to the bottom of the screen. */
interface WaterBody {
  lava: boolean;
  c0: number;
  cols: number;
  top: number;
  rows: number;
}

/** The bodies of water of a level: runs of neighbouring pit columns that share a surface row. */
const waterBodies = (level: Level, underRows: number): WaterBody[] => {
  const out: WaterBody[] = [];
  for (let r = 0; r < level.rows; r++) {
    let c = 0;
    while (c < level.cols) {
      if (waterArt(level, c, r) !== "water_top") {
        c += 1;
        continue;
      }
      const c0 = c;
      while (c < level.cols && waterArt(level, c, r) === "water_top" && (level.water[r * level.cols + c] === 2) === (level.water[r * level.cols + c0] === 2)) c += 1;
      out.push({ lava: level.water[r * level.cols + c0] === 2, c0, cols: c - c0, top: r, rows: level.rows - r + underRows });
    }
  }
  return out;
};

/** How long the wave takes to slide one tile along (it repeats every tile, so the loop has no seam), seconds. */
const WATER_PERIOD = 3.2;

/**
 * One body of water drawn and moved as ONE piece: its surface and water blocks are a single sheet
 * that slides sideways one tile every WATER_PERIOD seconds behind a clip the size of the pit (the
 * tiles' waves repeat every tile, so it flows without a seam), with one pale shimmer over everything
 * below the surface. Nothing is animated per tile; still with reduced motion.
 */
function Water({ body, tile, frame }: { body: WaterBody; tile: number; frame: SharedValue<number[]> }) {
  const reduced = useReducedMotion();
  const amp = reduced ? 0 : 1;
  const flow = useAnimatedStyle(() => {
    const t = stepped(frame.value[1] ?? 0, SPIN_FPS);
    return { transform: [{ translateX: ((t / WATER_PERIOD) % 1) * tile * amp }] };
  });
  const shimmer = useAnimatedStyle(() => {
    const t = stepped(frame.value[1] ?? 0, 8);
    return { opacity: amp * (0.03 + 0.08 * (0.5 + 0.5 * Math.sin(t * 1.6))) };
  });
  const sheet = useMemo(() => Array.from({ length: body.rows * (body.cols + 1) }, (_, k) => k), [body.rows, body.cols]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: body.c0 * tile, top: body.top * tile, width: body.cols * tile, height: body.rows * tile, overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", left: -tile, top: 0, width: (body.cols + 1) * tile, height: body.rows * tile }, flow]}>
        {sheet.map((k) => {
          const row = Math.floor(k / (body.cols + 1));
          const col = k % (body.cols + 1);
          return <Image key={k} source={body.lava ? (row === 0 ? LAVA_SPRITES.lava_top : LAVA_SPRITES.lava) : row === 0 ? WATER_SPRITES.water_top : WATER_SPRITES.water} style={{ position: "absolute", left: col * tile, top: row * tile, width: tile + 1, height: tile + 1 }} fadeDuration={0} />;
        })}
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 0, top: tile, width: body.cols * tile, height: (body.rows - 1) * tile, backgroundColor: FLASH_HIT }, shimmer]} />
    </View>
  );
}

/** A wall torch: its two flames (the pack's `torch_on_a` and `_b`) swap about six times a second, each torch a step apart from the next. */
const TORCH_FPS = 6;
function Torch({ c, r, tile, frame }: { c: number; r: number; tile: number; frame: SharedValue<number[]> }) {
  const a = useAnimatedStyle(() => ({ opacity: Math.floor((frame.value[1] ?? 0) * TORCH_FPS + c) % 2 === 0 ? 1 : 0 }));
  const b = useAnimatedStyle(() => ({ opacity: Math.floor((frame.value[1] ?? 0) * TORCH_FPS + c) % 2 === 1 ? 1 : 0 }));
  const box = { position: "absolute", width: tile + 1, height: tile + 1 } as const;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile }}>
      <Animated.Image source={SCENERY_SPRITES.torch} style={[box, a]} fadeDuration={0} />
      <Animated.Image source={PROP_SPRITES.torchB} style={[box, b]} fadeDuration={0} />
    </View>
  );
}

/**
 * The goal door, two tiles tall (an arch over a body). Shut it shows a lock while a boss guards it; the
 * lock goes and the door pops when it unlocks, and it pops again when it swings open for the hero and
 * when it shuts behind them. Open it shows the dark doorway.
 */
function Door({ c, r, tile, locked, open }: { c: number; r: number; tile: number; locked: boolean; open: boolean }) {
  const unlock = useTriggerClock(WORLD_FX.flagPop, locked, !locked);
  const swing = useTriggerClock(WORLD_FX.bump, open);
  const popStyle = useAnimatedStyle(() => {
    const f = flagPop(unlock.get());
    const b = blockBump(swing.get());
    return { transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }, { scaleY: f.sy * b.sy }, { scaleX: b.sx }] };
  });
  const box = { position: "absolute", left: c * tile, top: (r - 1) * tile, width: tile, height: tile * 2, transformOrigin: "50% 100%" } as const;
  const half = { position: "absolute", left: 0, width: tile + 1, height: tile + 1 } as const;
  const lock = Math.round(tile * 0.62);
  return (
    <Animated.View pointerEvents="none" style={[box, popStyle]}>
      <Image source={open ? PROP_SPRITES.doorOpenTop : PROP_SPRITES.doorClosedTop} style={[half, { top: 0 }]} fadeDuration={0} />
      <Image source={open ? PROP_SPRITES.doorOpen : PROP_SPRITES.doorClosed} style={[half, { top: tile }]} fadeDuration={0} />
      {locked ? <Image source={PROP_SPRITES.lock} style={{ position: "absolute", left: (tile - lock) / 2, top: tile + (tile - lock) / 2, width: lock, height: lock }} fadeDuration={0} /> : null}
    </Animated.View>
  );
}

/** A checkpoint flag: grey and still until the hero passes it, then it pops up and waves like the goal flag. */
function Checkpoint({ c, r, tile, active, frame }: { c: number; r: number; tile: number; active: boolean; frame: SharedValue<number[]> }) {
  const a = useAnimatedStyle(() => ({ opacity: Math.floor(((frame.value[1] ?? 0) * 3) % 2) === 0 ? 1 : 0 }));
  const b = useAnimatedStyle(() => ({ opacity: Math.floor(((frame.value[1] ?? 0) * 3) % 2) === 1 ? 1 : 0 }));
  const pop = useTriggerClock(WORLD_FX.flagPop, active, active);
  const popStyle = useAnimatedStyle(() => {
    const f = flagPop(pop.get());
    return { transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }, { scaleY: f.sy }] };
  });
  const box = { position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile, transformOrigin: "50% 100%" } as const;
  if (!active) return <Image source={PROP_SPRITES.flagOff} style={box} fadeDuration={0} />;
  return (
    <Animated.View pointerEvents="none" style={[box, popStyle]}>
      <Animated.Image source={PROP_SPRITES.flagA} style={[{ position: "absolute", width: tile, height: tile }, a]} fadeDuration={0} />
      <Animated.Image source={PROP_SPRITES.flagB} style={[{ position: "absolute", width: tile, height: tile }, b]} fadeDuration={0} />
    </Animated.View>
  );
}

/** A readable sign: it rocks when the hero steps up to it, and a bobbing "!" over it asks to be read until it has been. */
function SignPost({ c, r, tile, index, open, read, frame }: { c: number; r: number; tile: number; index: number; open: boolean; read: boolean; frame: SharedValue<number[]> }) {
  const { theme } = useTheme();
  const rock = useTriggerClock(WORLD_FX.sign, open, open);
  const rockStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${signRock(rock.get())}deg` }] }));
  const hint = useAnimatedStyle(() => ({ transform: [{ translateY: signHint(stepped(frame.value[1] ?? 0, DECOR_FPS), index) * tile }] }));
  const badge = Math.round(tile * 0.34);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile }}>
      <Animated.Image source={PROP_SPRITES.sign} style={[{ width: tile, height: tile, transformOrigin: "50% 100%" }, rockStyle]} fadeDuration={0} />
      {read ? null : (
        <Animated.View style={[{ position: "absolute", left: (tile - badge) / 2, top: -badge * 0.9, width: badge, height: badge, borderRadius: badge / 2, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.warning }, hint]}>
          <Text style={{ ...fontFaces.heavy, fontSize: badge * 0.72, lineHeight: badge, color: theme.colors.onPrimary }}>!</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Coins                                                               */
/* ------------------------------------------------------------------ */

function Coin({ x, y, tile, index, frame }: { x: number; y: number; tile: number; index: number; frame: SharedValue<number[]> }) {
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: Math.sin(stepped(frame.value[1] ?? 0, DECOR_FPS) * 3.2 + index * 0.7) * tile * 0.06 }] }));
  const size = tile * 0.8;
  return (
    <Animated.View
      style={[{ position: "absolute", left: x * tile - size / 2, top: y * tile - size / 2, width: size, height: size }, bob]}
    >
      <Image source={PROP_SPRITES.coin} style={{ width: size, height: size }} fadeDuration={0} />
    </Animated.View>
  );
}

const Coins = memo(function Coins({ level, tile, taken, from, to, frame }: { level: Level; tile: number; taken: readonly boolean[]; from: number; to: number; frame: SharedValue<number[]> }) {
  return (
    <>
      {level.coins.map((coin, i) =>
        taken[i] || coin.x < from * CHUNK_COLS || coin.x >= (to + 1) * CHUNK_COLS ? null : (
          <Coin key={i} index={i} x={coin.x} y={coin.y} tile={tile} frame={frame} />
        ),
      )}
    </>
  );
});

/* ------------------------------------------------------------------ */
/* Gems and saws                                                       */
/* ------------------------------------------------------------------ */

/** A gem is one picture and one animated style (a bob and a slow twinkle of its size, off the shared clock): no views of its own for a shine, which made a level of gems stutter. */
function Gem({ x, y, tile, index, frame }: { x: number; y: number; tile: number; index: number; frame: SharedValue<number[]> }) {
  const bob = useAnimatedStyle(() => {
    const t = stepped(frame.value[1] ?? 0, DECOR_FPS);
    return { transform: [{ translateY: Math.sin(t * 2.6 + index * 0.9) * tile * 0.07 }, { scale: 1 + 0.06 * Math.sin(t * 4 + index * 1.7) }] };
  });
  const size = tile * 0.85;
  return (
    <Animated.View style={[{ position: "absolute", left: x * tile - size / 2, top: y * tile - size / 2, width: size, height: size }, bob]}>
      <Image source={gemSprite(index)} style={{ width: size, height: size }} fadeDuration={0} />
    </Animated.View>
  );
}

const Gems = memo(function Gems({ level, tile, taken, from, to, frame }: { level: Level; tile: number; taken: readonly boolean[]; from: number; to: number; frame: SharedValue<number[]> }) {
  return (
    <>
      {level.gems.map((g, i) =>
        taken[i] || g.x < from * CHUNK_COLS || g.x >= (to + 1) * CHUNK_COLS ? null : <Gem key={i} index={i} x={g.x} y={g.y} tile={tile} frame={frame} />,
      )}
    </>
  );
});

/** A saw turns about once every 0.7 s (still with reduced motion). */
const SAW_TURNS_PER_SECOND = 1.4;
function Saw({ c, r, tile, frame }: { c: number; r: number; tile: number; frame: SharedValue<number[]> }) {
  const reduced = useReducedMotion();
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${reduced ? 0 : ((stepped(frame.value[1] ?? 0, SPIN_FPS) * SAW_TURNS_PER_SECOND + c * 0.37) % 1) * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile }, spin]}>
      <Image source={PROP_SPRITES.saw} style={{ width: tile + 1, height: tile + 1 }} fadeDuration={0} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Blocks, keys, springs, moving platforms                             */
/* ------------------------------------------------------------------ */

/** One block: it jumps when hit from below, and a block that still has something in it glints now and then. */
/**
 * The band of light that crosses a block that still holds something, now and then. It reads the world's time
 * (no clock, no layout state and no focus hook of its own, which a looping `ShineSweep` on every block cost),
 * and between sweeps its style does not change, so nothing is sent while it rests.
 */
function BlockGlint({ index, size, radius, frame }: { index: number; size: number; radius: number; frame: SharedValue<number[]> }) {
  const { theme } = useTheme();
  const band = useAnimatedStyle(() => {
    const ms = ((frame.value[1] ?? 0) * 1000 + index * 1130) % SHINE.periodMs;
    const f = shineFrame(ms);
    return { opacity: f.opacity, transform: [{ translateX: f.left * size }, { skewX: `-${SHINE.lean}deg` }] };
  });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius, overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", top: -6, bottom: -6, left: 0, width: size * SHINE.bandWidth, backgroundColor: withAlpha(theme.palettes.tab.white, 0.3), opacity: 0 }, band]} />
    </View>
  );
}

function Block({ b, index, tile, done, bump, frame }: { b: BlockTile; index: number; tile: number; done: boolean; bump: number; frame: SharedValue<number[]> }) {
  const reduced = useReducedMotion();
  const clock = useTriggerClock(WORLD_FX.bump, bump);
  const anim = useAnimatedStyle(() => {
    const f = blockBump(clock.get());
    return { transform: [{ translateY: f.dy * tile }, { scaleX: f.sx }, { scaleY: f.sy }] };
  });
  const source = b.kind === "gem" ? (done ? PROP_SPRITES.blockGemEmpty : PROP_SPRITES.blockGem) : b.kind === "coin" ? (done ? PROP_SPRITES.blockEmpty : PROP_SPRITES.blockCoin) : b.kind === "heart" ? (done ? PROP_SPRITES.blockEmpty : PROP_SPRITES.blockHeart) : b.kind === "brick" ? PROP_SPRITES.brick : PROP_SPRITES.lock;
  const glints = !done && (b.kind === "coin" || b.kind === "heart" || b.kind === "gem");
  return (
    <Animated.View style={[{ position: "absolute", left: b.c * tile, top: b.r * tile, width: tile + 1, height: tile + 1, transformOrigin: "50% 100%" }, anim]}>
      <Image source={source} style={{ width: tile + 1, height: tile + 1 }} fadeDuration={0} />
      {glints && !reduced ? <BlockGlint index={index} size={tile + 1} radius={Math.round(tile * 0.12)} frame={frame} /> : null}
    </Animated.View>
  );
}

/** Coin, heart, brick and lock blocks: a block that has given shows empty, a broken brick or an opened lock is gone. */
const Blocks = memo(function Blocks({ level, tile, used, bumps, from, to, frame }: { level: Level; tile: number; used: readonly boolean[]; bumps: readonly number[]; from: number; to: number; frame: SharedValue<number[]> }) {
  return (
    <>
      {level.blocks.map((b, i) => {
        if (b.c < from * CHUNK_COLS || b.c >= (to + 1) * CHUNK_COLS) return null;
        const done = used[i] === true;
        if (done && (b.kind === "brick" || b.kind === "lock")) return null;
        return <Block key={`b${i}`} b={b} index={i} tile={tile} done={done} bump={bumps[i] ?? 0} frame={frame} />;
      })}
    </>
  );
});

function Key({ x, y, tile, index, frame }: { x: number; y: number; tile: number; index: number; frame: SharedValue<number[]> }) {
  const bob = useAnimatedStyle(() => {
    const t = stepped(frame.value[1] ?? 0, DECOR_FPS);
    return { transform: [{ translateY: Math.sin(t * 3 + index) * tile * 0.07 }, { rotate: `${Math.sin(t * 2 + index) * 8}deg` }] };
  });
  const size = tile * 0.9;
  return (
    <Animated.View style={[{ position: "absolute", left: x * tile - size / 2, top: y * tile - size / 2, width: size, height: size }, bob]}>
      <Image source={PROP_SPRITES.key} style={{ width: size, height: size }} fadeDuration={0} />
    </Animated.View>
  );
}

const Keys = memo(function Keys({ level, tile, taken, frame }: { level: Level; tile: number; taken: readonly boolean[]; frame: SharedValue<number[]> }) {
  return (
    <>
      {level.keys.map((k, i) => (taken[i] ? null : <Key key={i} index={i} x={k.x} y={k.y} tile={tile} frame={frame} />))}
    </>
  );
});

/** A spring: pressed down at rest, stretched up for a moment after it throws the hero. */
function Spring({ c, r, tile, slot, frame }: { c: number; r: number; tile: number; slot: number; frame: SharedValue<number[]> }) {
  const rest = useAnimatedStyle(() => ({ opacity: (frame.value[slot] ?? 0) === 1 ? 0 : 1 }));
  const out = useAnimatedStyle(() => ({ opacity: (frame.value[slot] ?? 0) === 1 ? 1 : 0 }));
  const box = { position: "absolute", width: tile + 1, height: tile + 1 } as const;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: c * tile, top: r * tile, width: tile, height: tile }}>
      <Animated.Image source={PROP_SPRITES.spring} style={[box, rest]} fadeDuration={0} />
      <Animated.Image source={PROP_SPRITES.springOut} style={[box, out]} fadeDuration={0} />
    </View>
  );
}

/** A moving platform: the terrain's thin slab, left end, middles and right end, sliding by the frame's numbers. */
function MovingPlatform({ w, tile, slot, theme, frame }: { w: number; tile: number; slot: number; theme: TerrainTheme; frame: SharedValue<number[]> }) {
  const place = useAnimatedStyle(() => ({ transform: [{ translateX: frame.value[slot] ?? 0 }, { translateY: frame.value[slot + 1] ?? 0 }] }));
  const art = TERRAIN[theme].cloud;
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: w * tile, height: tile, flexDirection: "row" }, place]}>
      {Array.from({ length: w }, (_, i) => (
        <Image key={i} source={i === 0 ? art.left : i === w - 1 ? art.right : art.middle} style={{ width: tile + 1, height: tile }} fadeDuration={0} />
      ))}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

const Enemy = memo(function Enemy({ kind, index, tile, alive, frame }: { kind: EnemyKind; index: number; tile: number; alive: boolean; frame: SharedValue<number[]> }) {
  const size = ENEMY_KINDS[kind].scale * tile;
  const base = FRAME_HEAD + index * FRAME_PER_ENEMY;
  const poof = useSharedValue(0);
  useEffect(() => {
    if (!alive) poof.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    else poof.value = 0;
  }, [alive, poof]);
  const place = useAnimatedStyle(() => {
    const f = frame.value;
    return {
      opacity: 1 - poof.value,
      // Squashed and stretched about its feet in a battle (battle-fx-core), then the poof grows it
      transformOrigin: "50% 100%",
      transform: [
        { translateX: f[base] ?? 0 },
        { translateY: (f[base + 1] ?? 0) - poof.value * tile * 0.35 },
        { scaleX: (f[base + 4] ?? 1) * (1 + poof.value * 0.5) },
        { scaleY: (f[base + 5] ?? 1) * (1 + poof.value * 0.5) },
      ],
    };
  });
  const flash = useAnimatedStyle(() => ({ opacity: frame.value[base + 6] ?? 0 }));
  const flip = useAnimatedStyle(() => ({ transform: [{ scaleX: frame.value[base + 3] ?? 1 }] }));
  const a = useAnimatedStyle(() => ({ opacity: (frame.value[base + 2] ?? 0) === 0 ? 1 : 0 }));
  const b = useAnimatedStyle(() => ({ opacity: (frame.value[base + 2] ?? 0) === 1 ? 1 : 0 }));
  const [first, second] = ENEMY_SPRITES[kind];
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, place]}>
      <Animated.View style={[{ width: size, height: size }, flip]}>
        <Animated.Image source={first} style={[{ position: "absolute", width: size, height: size }, a]} fadeDuration={0} />
        <Animated.Image source={second} style={[{ position: "absolute", width: size, height: size }, b]} fadeDuration={0} />
        {/* the white flash of a hit: the same picture, all white, over it */}
        <Animated.Image source={first} tintColor={FLASH_HIT} style={[{ position: "absolute", width: size, height: size }, flash]} fadeDuration={0} />
      </Animated.View>
    </Animated.View>
  );
});

/* ------------------------------------------------------------------ */
/* The hero                                                            */
/* ------------------------------------------------------------------ */

function Hero({ tile, frame }: { tile: number; frame: SharedValue<number[]> }) {
  const size = Math.round(HERO_DRAW * tile);
  const place = useAnimatedStyle(() => ({
    opacity: frame.value[6] ?? 1,
    // Squashed and stretched about the feet in a battle (battle-fx-core)
    transformOrigin: "50% 100%",
    transform: [{ translateX: frame.value[2] ?? 0 }, { translateY: frame.value[3] ?? 0 }, { scaleX: frame.value[7] ?? 1 }, { scaleY: frame.value[8] ?? 1 }],
  }));
  const flash = useAnimatedStyle(() => ({ opacity: frame.value[9] ?? 0 }));
  const flip = useAnimatedStyle(() => ({ transform: [{ scaleX: frame.value[5] ?? 1 }] }));
  // The sheet is one picture; the frame number moves it behind a window one cell wide
  const sheet = useAnimatedStyle(() => {
    const i = frame.value[4] ?? 0;
    return { transform: [{ translateX: -(i % SHEET.cols) * size }, { translateY: -Math.floor(i / SHEET.cols) * size }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, place]}>
      <Animated.View style={[{ width: size, height: size, overflow: "hidden" }, flip]}>
        <Animated.Image source={HERO_SHEET} style={[{ position: "absolute", left: 0, top: 0, width: SHEET.cols * size, height: SHEET_ROWS * size }, sheet]} fadeDuration={0} />
        {/* the red flash of being hurt: the same frame, all red, over it */}
        <Animated.Image source={HERO_SHEET} tintColor={FLASH_HURT} style={[{ position: "absolute", left: 0, top: 0, width: SHEET.cols * size, height: SHEET_ROWS * size }, sheet, flash]} fadeDuration={0} />
      </Animated.View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Emotes                                                              */
/* ------------------------------------------------------------------ */

/** A speech balloon over the hero or an enemy, following them (position from the frame array, so it is never squashed with them). */
function Emote({ emote, tile, frame, onDone }: { emote: EmoteInstance; tile: number; frame: SharedValue<number[]>; onDone: (id: number) => void }) {
  const reduced = useReducedMotion();
  const hold = emote.hold ?? EMOTE.hold;
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      const id = setTimeout(() => onDone(emote.id), hold);
      return () => clearTimeout(id);
    }
    clock.set(withTiming(emoteTotal(hold), { duration: emoteTotal(hold), easing: Easing.linear }));
    const id = setTimeout(() => onDone(emote.id), emoteTotal(hold) + 60);
    return () => {
      clearTimeout(id);
      cancelAnimation(clock);
    };
  }, [clock, emote.id, hold, onDone, reduced]);

  const heroDraw = Math.round(HERO_DRAW * tile);
  const enemyIndex = emote.target.kind === "enemy" ? emote.target.index : -1;
  const enemyBase = FRAME_HEAD + enemyIndex * FRAME_PER_ENEMY;
  const enemySize = enemyIndex >= 0 ? ENEMY_KINDS[emote.enemyKind ?? "slime"].scale * tile : 0;
  const w = Math.round(tile * 0.62);
  const h = Math.round(w / EMOTE_ASPECT);
  const style = useAnimatedStyle(() => {
    const f = frame.value;
    const pose = reduced ? { scale: 1, opacity: 1, dy: 0 } : emotePose(clock.get(), hold);
    // The tail's tip sits just over the head: the hero's picture has some air above it, an enemy's top is its head
    const tipX = enemyIndex >= 0 ? (f[enemyBase] ?? 0) + enemySize / 2 : (f[2] ?? 0) + heroDraw / 2;
    const tipY = enemyIndex >= 0 ? (f[enemyBase + 1] ?? 0) + enemySize * 0.04 : (f[3] ?? 0) + heroDraw * 0.2;
    return {
      opacity: pose.opacity,
      transformOrigin: "50% 100%",
      transform: [{ translateX: tipX - w / 2 }, { translateY: tipY - h + pose.dy * tile }, { scale: pose.scale }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: w, height: h, opacity: 0 }, style]}>
      <Image source={EMOTE_SPRITES[emote.name]} style={{ width: w, height: h }} fadeDuration={0} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

/** How far each backdrop layer slides as the camera moves: the clouds are far away, the biome nearer. */
const CLOUD_PARALLAX = 0.1;
const BIOME_PARALLAX = 0.24;

/** One picture repeated sideways, sliding by `factor` of the camera and wrapping after one picture. */
function Strip({ source, top, size, viewW, factor, frame }: { source: ImageSourcePropType; top: number; size: number; viewW: number; factor: number; frame: SharedValue<number[]> }) {
  const count = Math.ceil(viewW / size) + 2;
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: -(((frame.get()[0] ?? 0) * factor) % size) }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top, height: size, width: count * size, flexDirection: "row" }, slide]}>
      {Array.from({ length: count }, (_, i) => (
        <Image key={i} source={source} style={{ width: size, height: size }} fadeDuration={0} />
      ))}
    </Animated.View>
  );
}

/** The backdrop stack (see `backdropStack`): sky, clouds, the biome, and its ground colour below. */
function Backdrop({ viewW, viewH, groundY, tile, biome, fade, frame }: { viewW: number; viewH: number; groundY: number; tile: number; biome: BiomeName; fade: boolean; frame: SharedValue<number[]> }) {
  const stack = backdropStack(viewH, groundY, tile);
  const art = BIOMES[biome];
  return (
    <>
      <Strip source={BACKGROUND_CLOUDS} top={stack.cloudsTop} size={stack.size} viewW={viewW} factor={CLOUD_PARALLAX} frame={frame} />
      <Strip source={fade ? art.fade : art.color} top={stack.biomeTop} size={stack.size} viewW={viewW} factor={BIOME_PARALLAX} frame={frame} />
      {stack.fillHeight > 0 ? (
        <Image source={fade ? BACKGROUND_SKY : art.ground} style={{ position: "absolute", left: 0, top: stack.fillTop, width: viewW, height: stack.fillHeight }} resizeMode="stretch" fadeDuration={0} pointerEvents="none" />
      ) : null}
    </>
  );
}

export interface PlatformerWorldProps {
  level: Level;
  tile: number;
  viewW: number;
  viewH: number;
  /** Top of the level's first row, from the top of the view. */
  worldTop: number;
  /** Rows of dirt under the level, down to the bottom of the view. */
  underRows: number;
  frame: SharedValue<number[]>;
  /** Chunk numbers to build (from `visibleChunks`). */
  chunks: { from: number; to: number };
  coinTaken: readonly boolean[];
  gemTaken?: readonly boolean[];
  enemyAlive: readonly boolean[];
  flagLocked: boolean;
  /** The goal door is swung open (the hero is going through it). */
  doorOpen?: boolean;
  /** The ground set of this world (default grass). */
  theme?: TerrainTheme;
  blockUsed?: readonly boolean[];
  keyTaken?: readonly boolean[];
  /** How many times each block has been hit (a change makes it jump). */
  blockBumps?: readonly number[];
  /** The checkpoint the hero has reached (0 is the start): the flags up to it are raised. */
  checkpoint?: number;
  /** The sign whose bubble is (or was last) shown, and whether the hero is standing at it now; which signs were read. */
  signIndex?: number | null;
  signOpen?: boolean;
  signRead?: readonly boolean[];
  /** One-shot effects (a coin out of a block, bricks breaking, bursts) and the way to remove one that has ended. */
  effects?: readonly WorldEffect[];
  /** Speech balloons over the hero and enemies right now, and the call that retires one. */
  emotes?: readonly EmoteInstance[];
  onEmoteDone?: (id: number) => void;
  onEffectDone?: (id: number) => void;
  /** The background biome (default hills) and whether it fades back to sky instead of ending in ground. */
  biome?: BiomeName;
  fadeBiome?: boolean;
}

const noop = (): void => undefined;
const NONE: readonly never[] = [];

// The pieces that only change when the level's state does: a re-render of the world (a coin taken, a heart lost) leaves them alone
const WaterM = memo(Water);
const SawM = memo(Saw);
const SpringM = memo(Spring);
const MovingPlatformM = memo(MovingPlatform);
const SignPostM = memo(SignPost);
const CheckpointM = memo(Checkpoint);
const HeroM = memo(Hero);

export const PlatformerWorld = memo(function PlatformerWorld({ level, tile, viewW, viewH, worldTop, underRows, frame, chunks, coinTaken, gemTaken = NONE, enemyAlive, flagLocked, doorOpen = false, theme = "grass", blockUsed = NONE, keyTaken = NONE, blockBumps = NONE, checkpoint = 0, signIndex = null, signOpen = false, signRead = NONE, effects = NONE, onEffectDone = noop, emotes = NONE, onEmoteDone = noop, biome = "hills", fadeBiome = false }: PlatformerWorldProps) {
  const worldH = level.rows * tile;
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: -(frame.value[0] ?? 0) }] }));
  const indexes = useMemo(() => Array.from({ length: Math.max(0, chunks.to - chunks.from + 1) }, (_, i) => chunks.from + i), [chunks.from, chunks.to]);
  const bodies = useMemo(() => waterBodies(level, underRows), [level, underRows]);
  const flags = useMemo(() => level.decor.filter((d) => d.kind === "checkpoint").sort((x, y) => x.c - y.c), [level]);
  return (
    <View style={{ width: viewW, height: viewH, overflow: "hidden", backgroundColor: SKY_COLOR }}>
      <Backdrop viewW={viewW} viewH={viewH} groundY={worldTop + worldH - tile} tile={tile} biome={biome} fade={fadeBiome} frame={frame} />
      <Animated.View style={[{ position: "absolute", left: 0, top: worldTop, width: level.cols * tile, height: worldH + underRows * tile }, slide]}>
        {bodies
          .filter((b) => b.c0 < (chunks.to + 1) * CHUNK_COLS && b.c0 + b.cols > chunks.from * CHUNK_COLS)
          .map((b) => (
            <WaterM key={`water${b.c0}_${b.top}`} body={b} tile={tile} frame={frame} />
          ))}
        {indexes.map((i) => (
          <Chunk key={i} level={level} index={i} tile={tile} underRows={underRows} flagLocked={flagLocked} doorOpen={doorOpen} theme={theme} frame={frame} />
        ))}
        {level.signs.map((sg, i) => (
          <SignPostM key={`sign${i}`} c={sg.c} r={sg.r} tile={tile} index={i} open={signOpen && signIndex === i} read={signRead[i] === true} frame={frame} />
        ))}
        {flags.map((d, i) => (
          <CheckpointM key={`cp${d.c}`} c={d.c} r={d.r} tile={tile} active={checkpoint > i} frame={frame} />
        ))}
        <Blocks level={level} tile={tile} used={blockUsed} bumps={blockBumps} from={chunks.from} to={chunks.to} frame={frame} />
        {level.springs.map((sp, i) => (
          <SpringM key={`sp${i}`} c={sp.c} r={sp.r} tile={tile} slot={springSlot(level.enemies.length, level.platforms.length, i)} frame={frame} />
        ))}
        {level.platforms.map((p, i) => (
          <MovingPlatformM key={`mp${i}`} w={p.w} tile={tile} slot={platformSlot(level.enemies.length, i)} theme={theme} frame={frame} />
        ))}
        <Coins level={level} tile={tile} taken={coinTaken} from={chunks.from} to={chunks.to} frame={frame} />
        <Gems level={level} tile={tile} taken={gemTaken} from={chunks.from} to={chunks.to} frame={frame} />
        {level.saws.map((sw) => (sw.c < (chunks.from - 1) * CHUNK_COLS || sw.c >= (chunks.to + 2) * CHUNK_COLS ? null : <SawM key={`saw${sw.c}_${sw.r}`} c={sw.c} r={sw.r} tile={tile} frame={frame} />))}
        <Keys level={level} tile={tile} taken={keyTaken} frame={frame} />
        {level.enemies.map((e, i) => (
          <Enemy key={i} kind={e.kind} index={i} tile={tile} alive={enemyAlive[i] ?? true} frame={frame} />
        ))}
        <HeroM tile={tile} frame={frame} />
        <WorldFx effects={effects} tile={tile} onDone={onEffectDone} />
        {emotes.map((m) => (
          <Emote key={m.id} emote={m} tile={tile} frame={frame} onDone={onEmoteDone} />
        ))}
        {signIndex !== null && level.signs[signIndex] ? <SignBubble sign={level.signs[signIndex]} open={signOpen} tile={tile} viewW={viewW} frame={frame} /> : null}
      </Animated.View>
    </View>
  );
});
