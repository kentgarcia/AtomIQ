/**
 * Atom Maze, platformer prototype (docs/PLATFORMER_SPEC.md): run and jump through a level, touch an
 * enemy to battle it with a question, reach the flag. The rules are in components/platformer/
 * platformer-core.ts (steps the world), battle-core.ts (questions) and platformer-view.ts (what to
 * draw); this screen runs the clock, turns events into sounds, hearts and the battle, and saves the
 * score. It plays one story level (`?level=<id>`, components/platformer/story-levels.ts): the questions
 * are the level's fixed ones, and after it the lessons that teach what was missed are recommended.
 * A level starts with a loading screen (pictures and questions loaded, the world built under it), then
 * Shrodi walks in from the left, gets ready, and the mission shows at the top (entrance-core.ts). Stars
 * come from the points and the timer is for the best run (platformer-core.ts `summarize`).
 * The old maze (atom-maze.tsx) stays for now.
 */

import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BackHandler, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, FadeInDown, FadeOut, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { GameHud } from "@/components/platformer/GameHud";
import { PauseDialog } from "@/components/platformer/PauseDialog";
import { BattleFx } from "@/components/platformer/BattleFx";
import { BossIntro, BossSlamFx } from "@/components/platformer/BossIntro";
import { BossBlastFx, BossVictory } from "@/components/platformer/BossVictory";
import { VICTORY, victoryPose } from "@/components/platformer/boss-victory-core";
import type { WorldEffect, WorldEffectKind } from "@/components/platformer/WorldFx";
import { INTRO, SLAM_AT, bossCamera, introPose, shouldIntroduceBoss } from "@/components/platformer/boss-intro-core";
import { BattlePanel } from "@/components/platformer/BattlePanel";
import { Controls } from "@/components/platformer/Controls";
import { LoadingScreen } from "@/components/platformer/LoadingScreen";
import { MissionBanner } from "@/components/platformer/MissionBanner";
import { EMOTE, emotesForAnswer, emotesForEvent, sleepDue, type EmoteInstance, type EmoteRequest } from "@/components/platformer/emote-core";
import { ExitStars, ExitTitle } from "@/components/platformer/ExitView";
import { ResultPanel } from "@/components/platformer/ResultPanel";
import { EXIT, LOST, exitPose, exitTotal, lostPose, starAt } from "@/components/platformer/exit-core";
import { READY, WALK_IN, entrancePlan, entrancePose, readyPose, type EntrancePlan } from "@/components/platformer/entrance-core";
import { levelSources, preloadSources } from "@/components/platformer/preload";
import { PlatformerWorld } from "@/components/platformer/PlatformerWorld";
import type { ServedBattleQuestion } from "@/components/platformer/battle-core";
import { answerStory, askStory, createStoryBattle, restartStoryBattle, settleStory, type StoryBattle } from "@/components/platformer/story-battle-core";
import { recommendLessons, type Recommendation } from "@/components/platformer/story-core";
import { STORY_LEVELS, storyLevelById } from "@/components/platformer/story-levels";
import {
  ENEMY_KINDS,
  GRAVITY,
  MAX_FALL,
  MAX_HEARTS,
  STEP,
  cameraTarget,
  landingY,
  createWorld,
  parseLevel,
  resolveBattle,
  stepWorld,
  summarize,
  type EnemyKind,
  type Input,
  type Stats,
  type Summary,
  type World,
  type WorldEvent,
} from "@/components/platformer/platformer-core";
import { FX, NO_FX, camShake, fxPose, fxTotal, vignette, zoomPlan, zoomPunch, type FxKind, type FxPose, type ZoomPlan } from "@/components/platformer/battle-fx-core";
import { idleFrame } from "@/components/platformer/hero-anim-core";
import { FRAME_HEAD, FRAME_PER_ENEMY, HERO_DRAW, fillFrame, frameLength, playLayout, visibleChunks } from "@/components/platformer/platformer-view";
import { Text } from "@/components/ui/text";
import { recordActivity } from "@/services/activity-log";
import { saveGameScore } from "@/services/database";
import { loadStoryQuestions } from "@/services/story-questions";
import { saveStoryResult, type SavedResult } from "@/services/story-progress";
import { vibrate } from "@/services/haptics";
import { playSfx, warmSfxCues } from "@/services/sfx";
import { JUMP_CUE, cuesFor, fallCue, footstepDue, landCue, stepCue } from "@/components/platformer/platformer-sfx-core";
import { createStyles, fontFaces, fontSizes, withAlpha, useTheme } from "@/theme";
import { EASE_IN_OUT, EASE_OUT } from "@/theme/motion";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: c.mapBackground },
    area: { flex: 1 },
    fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
    toast: { position: "absolute", left: 20, right: 20, alignItems: "center" },
    toastText: { ...fontFaces.heavy, fontSize: fontSizes.md, color: c.text, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, overflow: "hidden", backgroundColor: withAlpha(c.card, 0.92) },
    deck: { position: "absolute", left: 0, right: 0, bottom: 0, height: DECK },
    wash: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.error },
    zoomer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  };
});

interface BattleState {
  enemyId: number;
  kind: EnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  served: ServedBattleQuestion;
  picked: number | null;
  result: "correct" | "wrong" | null;
  /** Set when the answer is given: the blow beats the enemy. */
  lethal: boolean;
  /** Where things are on the screen when the battle opens (px, unzoomed), and which side the enemy is on. */
  geo: BattleGeo;
}

interface BattleGeo {
  hero: { x: number; y: number };
  enemy: { x: number; y: number };
  head: { x: number; y: number };
  dir: 1 | -1;
}

interface Ended {
  summary: Summary;
  stats: Stats;
  hearts: number;
  recommendations: Recommendation[];
}

/** Shortest time the loading screen stays, ms: long enough to read, never a flash. */
const MIN_LOADING_MS = 700;
/** How long the mission stays at the top, ms. */
const MISSION_MS = 3400;

const COLS_IN_VIEW = 8;
/** Height of the strip at the bottom that holds the thumbs; the level's last row sits just above it and the ground fades to black behind it. */
const DECK = 150;
/** The ground is lifted this much above the controls' strip, so the hero is nearer the middle of the screen and more dirt shows before the fade. */
const GROUND_LIFT = 60;
/** The fade to black: this much taller than the controls, so the ground is already dark behind the buttons. */
const FADE_EXTRA = 110;
/** How tall the question panel is at most, px (without the bottom inset): the pair is centred in what is left above it. */
const PANEL_H = 340;
/** After an answer is given, how long before the battle goes on (or ends), so the fight and the reason can be seen. */
const ADVANCE_MS = 1450;
const BLACK = "#000000"; // theme-allow: the world fades to black behind the controls whatever the appearance (EX-16)

/** The route: one screen per level, so going to the next level starts it from nothing. */
export default function PlatformerRoute() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  return <PlatformerScreen key={level ?? "first"} />;
}

function PlatformerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ level?: string }>();
  const story = useMemo(() => storyLevelById(params.level) ?? STORY_LEVELS[0], [params.level]);
  const nextStory = STORY_LEVELS[story.number] ?? null;
  const level = useMemo(() => parseLevel(story.def), [story]);

  const worldRef = useRef<World>(createWorld(level));
  const inputRef = useRef<Input>({ left: false, right: false, jump: false });
  const battlesRef = useRef<StoryBattle | null>(null);
  const lessonsRef = useRef<{ id: string; title: string; teaches: readonly string[] }[]>([]);
  const camRef = useRef(0);
  const endedRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frame = useSharedValue<number[]>(new Array(frameLength(level.enemies.length, level.platforms.length, level.springs.length)).fill(0));
  // The battle on the map: the view zooms in on the pair (`zoom` 0..1 along `plan`), and an answer's fight runs on `fxClock` (ms)
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  const zoom = useSharedValue(0);
  const plan = useSharedValue<ZoomPlan>({ scale: 1, tx: 0, ty: 0 });
  const fxClock = useSharedValue(0);
  const fxKind = useSharedValue(0);
  const fxRef = useRef<{ kind: FxKind; start: number; lethal: boolean } | null>(null);
  const battleStartRef = useRef(0);
  const outcomeRef = useRef<{ correct: boolean; continues: boolean } | null>(null);
  const layoutRef = useRef<{ tile: number; worldTop: number } | null>(null);
  // The boss introduction: `introRef` is the running cinematic (its clock and where the camera goes), `cineBars` and `cineClock` drive the bars and the slam's burst
  const cineBars = useSharedValue(0);
  const cineClock = useSharedValue(0);
  const cineShake = useSharedValue(0);
  const introRef = useRef<{ start: number; heroCam: number; bossCam: number; boss: number; cues: number } | null>(null);
  const introDoneRef = useRef(false);
  // The boss's defeat: `victoryRef` is the running celebration (its clock and where the camera goes); `bossBeatenRef` is set by the blow that beats it
  const victoryRef = useRef<{ start: number; heroCam: number; flagCam: number; boss: number; cues: number } | null>(null);
  const bossBeatenRef = useRef(false);
  // The end of the level on the map: `exitRef` is the running sequence (door and stars, or the flinch); `pendingEndRef` holds the result until the panel rises
  const exitRef = useRef<{ start: number; won: boolean; stars: number; heroX0: number; doorX: number; heroCam: number; doorCam: number; zoomed: boolean; cues: number; starCues: number; landY: number | null; thud: boolean } | null>(null);
  const pendingEndRef = useRef<Ended | null>(null);
  const exitWonRef = useRef(false);
  const cinePunch = useSharedValue(0);
  const effectId = useRef(0);
  const emoteId = useRef(0);
  const emotesRef = useRef<EmoteInstance[]>([]);
  // When the hero last fell asleep standing still (ms), so the "zZ" comes now and then and not every frame
  const sleepAtRef = useRef(0);
  const readyEmoteRef = useRef(false);
  const lastStepRef = useRef(0);
  const userPausedRef = useRef(false);

  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [phase, setPhase] = useState<"loading" | "entrance" | "playing" | "ended">("loading");
  const [bank, setBank] = useState<"loading" | "ready" | "failed">("loading");
  const [assets, setAssets] = useState({ done: 0, total: 1, ready: false });
  const [waited, setWaited] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mission, setMission] = useState(false);
  const [saved, setSaved] = useState<SavedResult | null>(null);
  const entranceRef = useRef<{ start: number; plan: EntrancePlan } | null>(null);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [coins, setCoins] = useState(0);
  const [keys, setKeys] = useState(0);
  const [blockUsed, setBlockUsed] = useState<boolean[]>(() => level.blocks.map(() => false));
  const [keyTaken, setKeyTaken] = useState<boolean[]>(() => level.keys.map(() => false));
  const [activeSign, setActiveSign] = useState<number | null>(null);
  const [blockBumps, setBlockBumps] = useState<number[]>(() => level.blocks.map(() => 0));
  const [signShown, setSignShown] = useState<number | null>(null);
  const [signRead, setSignRead] = useState<boolean[]>(() => level.signs.map(() => false));
  const [checkpointIdx, setCheckpointIdx] = useState(0);
  const [effects, setEffects] = useState<WorldEffect[]>([]);
  const [emotes, setEmotes] = useState<EmoteInstance[]>([]);
  const [flagOpen, setFlagOpen] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [exitView, setExitView] = useState<{ won: boolean; stars: number; door: { x: number; y: number } } | null>(null);
  const [exitTitle, setExitTitle] = useState<string | null>(null);
  const [victory, setVictory] = useState<{ name: string; blast: { x: number; y: number } } | null>(null);
  const [coinTaken, setCoinTaken] = useState<boolean[]>(() => level.coins.map(() => false));
  const [gemTaken, setGemTaken] = useState<boolean[]>(() => level.gems.map(() => false));
  const [enemyAlive, setEnemyAlive] = useState<boolean[]>(() => level.enemies.map(() => true));
  const [chunks, setChunks] = useState({ from: 0, to: 2 });
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState<{ name: string; slam: { x: number; y: number } } | null>(null);
  const [ended, setEnded] = useState<Ended | null>(null);
  const battleRef = useRef<BattleState | null>(null);
  const pausedRef = useRef(false);
  // The clock and the answer handlers read these, so they are kept in step after each render
  useEffect(() => {
    battleRef.current = battle;
    pausedRef.current = paused || battle !== null || intro !== null || victory !== null;
    userPausedRef.current = paused;
  }, [battle, paused, intro, victory]);

  const bossIndex = useMemo(() => level.enemies.findIndex((e) => e.kind === "boss"), [level]);
  // The flag opens when the boss's defeat is celebrated (or at once without the celebration)
  const flagLocked = bossIndex >= 0 && !flagOpen;
  const flagTile = useMemo(() => level.decor.find((d) => d.kind === "flag") ?? null, [level]);
  const checkpointTiles = useMemo(() => level.decor.filter((d) => d.kind === "checkpoint").sort((a, b) => a.c - b.c), [level]);

  const addEffect = useCallback((kind: WorldEffectKind, c: number, r: number, variant?: number) => {
    effectId.current += 1;
    const id = effectId.current;
    setEffects((list) => [...list, { id, kind, c, r, variant }]);
  }, []);
  /** Speech balloons: a speaker has one at a time, a new one replaces the old. */
  const showEmotes = useCallback((requests: EmoteRequest[]) => {
    if (requests.length === 0) return;
    const world = worldRef.current;
    let list = emotesRef.current;
    for (const r of requests) {
      const same = (m: EmoteInstance) => m.target.kind === r.target.kind && (m.target.kind === "hero" || (r.target.kind === "enemy" && m.target.index === r.target.index));
      emoteId.current += 1;
      list = [...list.filter((m) => !same(m)), { ...r, id: emoteId.current, enemyKind: r.target.kind === "enemy" ? world.enemies[r.target.index]?.kind : undefined }];
    }
    emotesRef.current = list;
    setEmotes(list);
  }, []);
  const removeEmote = useCallback((id: number) => {
    emotesRef.current = emotesRef.current.filter((m) => m.id !== id);
    setEmotes(emotesRef.current);
  }, []);
  const removeEffect = useCallback((id: number) => setEffects((list) => list.filter((e) => e.id !== id)), []);

  // The world fills the whole screen, eight tiles wide in view: sky above the level, the ground going on below it, and the controls over the bottom
  const insets = useSafeAreaInsets();
  const layout = useMemo(() => {
    if (!area) return null;
    return playLayout(area.w, area.h, level.rows, { colsInView: COLS_IN_VIEW, deck: DECK + insets.bottom + GROUND_LIFT, top: insets.top + 64, minTile: 24 });
  }, [area, level.rows, insets.top, insets.bottom]);

  useEffect(() => {
    layoutRef.current = layout ? { tile: layout.tile, worldTop: layout.worldTop } : null;
  }, [layout]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Only what this level can make: the whole game group would push the UI and lesson sounds out of the player pool
    warmSfxCues(["game.platformer-jump", "game.platformer-coin", "game.platformer-hurt", "game.platformer-battle", "game.over", "game.explosion", "game.hit", ...cuesFor(story.theme)]);
  }, [story.theme]);

  /* ------------------------------------- loading ------------------------------------- */

  // The level's pictures are loaded first, and the screen waits a moment so the loading card can be read
  useEffect(() => {
    let live = true;
    const sources = levelSources(story.theme, story.biome);
    preloadSources(sources, (done, total) => live && setAssets({ done, total, ready: done >= total }))
      .catch(() => undefined)
      .then(() => live && setAssets((a) => ({ ...a, ready: true })));
    const wait = setTimeout(() => live && setWaited(true), MIN_LOADING_MS);
    return () => {
      live = false;
      clearTimeout(wait);
    };
  }, [story]);
  const loadingProgress = Math.min(1, (assets.total ? (assets.done / assets.total) * 0.7 : 0) + (bank === "ready" ? 0.2 : 0) + (layout ? 0.1 : 0));

  /* ------------------------------ the question bank ------------------------------ */

  useEffect(() => {
    let live = true;
    loadStoryQuestions(story)
      .then(({ lists, lessons }) => {
        if (!live) return;
        if (lists.every((l) => l.length === 0)) {
          setBank("failed");
          return;
        }
        battlesRef.current = createStoryBattle(lists);
        lessonsRef.current = lessons;
        setBank("ready");
      })
      .catch(() => live && setBank("failed"));
    return () => {
      live = false;
    };
  }, [story]);

  /* ------------------------------------ run end ------------------------------------ */

  /** The level is over: the hero walks through the door (or flinches), the title and stars land on the map, then the result panel rises. */
  const beginExit = useCallback(
    (won: boolean, stars: number) => {
      const world = worldRef.current;
      const place = layoutRef.current;
      fxRef.current = null;
      fxKind.set(0);
      inputRef.current = { left: false, right: false, jump: false };
      setBattle(null);
      exitWonRef.current = won;
      if (!place || !area || reducedRef.current) {
        // Nothing to play: the panel is up at once, with the stars at rest
        if (!won) {
          const down = landingY(world);
          if (down !== null) world.hero.y = down;
        }
        cancelAnimation(zoom);
        zoom.set(0);
        if (won) setExitView({ won, stars, door: { x: 0, y: 0 } });
        setEnded(pendingEndRef.current);
        setPhase("ended");
        void playSfx(won ? "reward.finish-jingle" : "game.over");
        return;
      }
      const { tile, worldTop } = place;
      const viewTiles = area.w / tile;
      const hero = world.hero;
      const heroCam = Math.round(camRef.current);
      const heroX0 = hero.x + hero.w / 2;
      const zoomed = zoom.get() > 0.5;
      const targetY = Math.max(insets.top + 130, (area.h - PANEL_H - insets.bottom) * 0.55);
      // Out of hearts in the air: the hero falls to the floor while the end plays
      const landY = won ? null : landingY(world);
      const doorX = world.level.goal.x;
      const doorCam = won ? Math.round(bossCamera(doorX, viewTiles, level.cols) * tile) : heroCam;
      if (won) {
        const doorRow = flagTile?.r ?? Math.round(world.level.goal.y) - 1;
        const focus = { x: doorX * tile - doorCam, y: worldTop + doorRow * tile };
        plan.set(zoomPlan({ focus, pairW: tile * 3.2, areaW: area.w, areaH: area.h, target: { x: area.w / 2, y: targetY } }));
        setExitView({ won, stars, door: { x: doorX * tile - doorCam, y: worldTop + (doorRow - 1) * tile } });
      } else if (!zoomed) {
        const focus = { x: heroX0 * tile - heroCam, y: worldTop + ((landY ?? hero.y) + hero.h / 2) * tile };
        plan.set(zoomPlan({ focus, pairW: tile * 2.4, areaW: area.w, areaH: area.h, target: { x: area.w / 2, y: targetY } }));
        setExitView({ won, stars: 0, door: { x: 0, y: 0 } });
      } else {
        setExitView({ won, stars: 0, door: { x: 0, y: 0 } });
      }
      cineClock.set(0);
      exitRef.current = { start: Date.now(), won, stars, heroX0, doorX, heroCam, doorCam, zoomed, cues: 0, starCues: 0, landY, thud: false };
    },
    [area, cineClock, flagTile, insets.bottom, insets.top, level.cols, plan, zoom, fxKind],
  );

  const finish = useCallback(
    (won: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const world = worldRef.current;
      const summary = summarize(world);
      void saveGameScore("platformer", summary.score).catch(() => undefined);
      if (summary.won) saveStoryResult(story.id, summary.stars, summary.score, summary.time).then(setSaved).catch(() => undefined);
      const recommendations = recommendLessons(battlesRef.current?.missed ?? [], lessonsRef.current);
      recordActivity("game_session", { id: "platformer" });
      pendingEndRef.current = { summary, stats: { ...world.stats }, hearts: world.hearts, recommendations };
      beginExit(won, summary.stars);
    },
    [beginExit, story.id],
  );

  /* -------------------------------------- events -------------------------------------- */

  const say = useCallback(
    (text: string) => {
      setToast(text);
      later(() => setToast((t) => (t === text ? null : t)), 2200);
    },
    [later],
  );

  const askFor = useCallback(
    (enemyId: number): void => {
      const world = worldRef.current;
      const enemy = world.enemies[enemyId];
      const def = ENEMY_KINDS[enemy.kind];
      const battles = battlesRef.current;
      const served = battles ? askStory(battles, enemyId) : null;
      if (!served) {
        // The bank has run dry: the enemy gives way instead of asking something twice
        const r = resolveBattle(world, true);
        r.events.forEach((e) => e.type === "defeat" && setEnemyAlive((a) => a.map((v, i) => (i === e.enemy ? false : v))));
        setBattle(null);
        return;
      }
      // Where the two stand on the screen now; the view is frozen, so this holds for the whole battle
      const place = layoutRef.current;
      const hero = world.hero;
      const cam = Math.round(camRef.current);
      const geo = (() => {
        const tile = place?.tile ?? 48;
        const top = place?.worldTop ?? 0;
        const heroMid = { x: (hero.x + hero.w / 2) * tile - cam, y: top + (hero.y + hero.h / 2) * tile };
        const enemyMid = { x: (enemy.x + enemy.w / 2) * tile - cam, y: top + (enemy.y + enemy.h / 2) * tile };
        return { hero: heroMid, enemy: enemyMid, head: { x: heroMid.x, y: top + hero.y * tile - tile * 0.2 }, dir: (enemyMid.x >= heroMid.x ? 1 : -1) as 1 | -1 };
      })();
      if (place && area) {
        const tile = place.tile;
        const focus = { x: (geo.hero.x + geo.enemy.x) / 2, y: (geo.hero.y + geo.enemy.y) / 2 };
        const pairW = Math.abs(geo.enemy.x - geo.hero.x) + (HERO_DRAW + ENEMY_KINDS[enemy.kind].scale) * tile * 0.5;
        const target = { x: area.w / 2, y: Math.max(insets.top + 130, (area.h - PANEL_H - insets.bottom) * 0.55) };
        plan.set(zoomPlan({ focus, pairW, areaW: area.w, areaH: area.h, target }));
        cancelAnimation(zoom);
        zoom.set(reduced ? 1 : withTiming(1, { duration: FX.zoomIn, easing: EASE_OUT }));
        void playSfx("lesson.zoom-in");
      }
      fxKind.set(0);
      fxRef.current = null;
      outcomeRef.current = null;
      battleStartRef.current = Date.now();
      setBattle({ enemyId, kind: enemy.kind, name: def.name, hp: enemy.hp, maxHp: enemy.maxHp, served, picked: null, result: null, lethal: false, geo });
    },
    [area, insets.bottom, insets.top, plan, reduced, zoom, fxKind],
  );

  const onBattleEvents = useCallback(
    (events: WorldEvent[]) => {
      for (const e of events) {
        if (e.type === "defeat") {
          const isBoss = worldRef.current.enemies[e.enemy]?.kind === "boss";
          if (isBoss && !reducedRef.current) {
            // The boss stays on the map until it bursts in the celebration (beginVictory)
            bossBeatenRef.current = true;
            continue;
          }
          void playSfx("reward.sparkle", { volume: 0.9 });
          setEnemyAlive((a) => a.map((v, i) => (i === e.enemy ? false : v)));
          if (isBoss) setFlagOpen(true);
        } else if (e.type === "hurt") {
          void playSfx("game.platformer-hurt");
          vibrate(40);
          setHearts(worldRef.current.hearts);
        } else if (e.type === "lost") {
          finish(false);
        }
      }
    },
    [finish],
  );

  const handleEvents = useCallback(
    (events: WorldEvent[]) => {
      const world = worldRef.current;
      for (const e of events) {
        showEmotes(emotesForEvent(e, (i) => worldRef.current.enemies[i]?.kind === "boss"));
        switch (e.type) {
          case "jump":
            void playSfx(JUMP_CUE);
            break;
          case "land":
            void playSfx(landCue(story.theme));
            break;
          case "coin":
            void playSfx("game.platformer-coin");
            setCoins(world.stats.coins);
            setCoinTaken((t) => t.map((v, i) => (i === e.index ? true : v)));
            addEffect("coinGet", world.level.coins[e.index].x, world.level.coins[e.index].y);
            break;
          case "gem":
            void playSfx("reward.sparkle", { volume: 0.8 });
            setCoins(world.stats.coins);
            setGemTaken((t) => t.map((v, i) => (i === e.index ? true : v)));
            addEffect("gemGet", world.level.gems[e.index].x, world.level.gems[e.index].y, e.index);
            break;
          case "hurt":
            void playSfx("game.platformer-hurt");
            vibrate(40);
            setHearts(world.hearts);
            break;
          case "battle":
            void playSfx("game.platformer-battle");
            inputRef.current = { left: false, right: false, jump: false };
            askFor(e.enemy);
            break;
          case "block":
            void playSfx(e.reward === "heart" || e.reward === "gem" ? "reward.sparkle" : e.reward === "break" ? "game.hit" : "game.platformer-coin");
            setBlockUsed(world.blockUsed.slice());
            setCoins(world.stats.coins);
            setHearts(world.hearts);
            {
              const b = world.level.blocks[e.index];
              setBlockBumps((list) => list.map((n, i) => (i === e.index ? n + 1 : n)));
              addEffect(e.reward === "heart" ? "heart" : e.reward === "break" ? "brick" : e.reward === "gem" ? "gem" : "coin", b.c, b.r, e.index);
            }
            break;
          case "key":
            void playSfx("reward.sparkle");
            setKeys(world.keys);
            setKeyTaken(world.keyTaken.slice());
            say("You found a key!");
            break;
          case "unlock":
            void playSfx("lesson.unlock");
            setKeys(world.keys);
            setBlockUsed(world.blockUsed.slice());
            addEffect("lock", world.level.blocks[e.index].c, world.level.blocks[e.index].r);
            say("Unlocked!");
            break;
          case "locked":
            void playSfx("ui.cancel");
            say("Locked. Find a key first.");
            break;
          case "spring":
            void playSfx("game.platformer-jump");
            break;
          case "sign":
            setActiveSign(e.index);
            if (e.index !== null) {
              const read = e.index;
              setSignShown(read);
              setSignRead((list) => list.map((v, i) => v || i === read));
            }
            break;
          case "checkpoint":
            setCheckpointIdx(e.index);
            if (checkpointTiles[e.index - 1]) addEffect("checkpoint", checkpointTiles[e.index - 1].c, checkpointTiles[e.index - 1].r);
            void playSfx("game.checkpoint");
            say("Checkpoint!");
            break;
          case "flag-locked":
            void playSfx("ui.cancel");
            say(`Beat the ${ENEMY_KINDS.boss.name} to open the door!`);
            break;
          case "goal":
            finish(true);
            break;
          case "lost":
            finish(false);
            break;
          default:
            break;
        }
      }
    },
    [addEffect, askFor, checkpointTiles, finish, say, showEmotes, story.theme],
  );
  const handleEventsRef = useRef(handleEvents);
  useEffect(() => {
    handleEventsRef.current = handleEvents;
  }, [handleEvents]);

  /* ------------------------------- the boss introduction ------------------------------- */

  /** Freeze the world and start the cinematic: scroll to the boss, zoom in, let it roar, scroll back. */
  const beginIntro = useCallback(() => {
    const place = layoutRef.current;
    const world = worldRef.current;
    if (introDoneRef.current || !place || !area || bossIndex < 0) return;
    introDoneRef.current = true;
    if (reducedRef.current) return;
    const boss = world.enemies[bossIndex];
    const { tile } = place;
    const viewTiles = area.w / tile;
    const bossCam = Math.round(bossCamera(boss.x + boss.w / 2, viewTiles, level.cols) * tile);
    const barTop = insets.top + 50;
    const barBottom = 140 + insets.bottom;
    const size = ENEMY_KINDS.boss.scale * tile;
    const feet = place.worldTop + (boss.y + boss.h) * tile;
    const focus = { x: (boss.x + boss.w / 2) * tile - bossCam, y: feet - size * 0.45 };
    plan.set(zoomPlan({ focus, pairW: (area.w * 0.62) / INTRO.scale, areaW: area.w, areaH: area.h, target: { x: area.w / 2, y: (barTop + area.h - barBottom) / 2 }, min: INTRO.scale, max: INTRO.scale }));
    cancelAnimation(zoom);
    zoom.set(0);
    inputRef.current = { left: false, right: false, jump: false };
    introRef.current = { start: Date.now(), heroCam: Math.round(camRef.current), bossCam, boss: bossIndex, cues: 0 };
    cineBars.set(0);
    setIntro({ name: ENEMY_KINDS.boss.name, slam: { x: focus.x, y: feet } });
  }, [area, bossIndex, cineBars, insets.bottom, insets.top, level.cols, plan, zoom]);
  const beginIntroRef = useRef(beginIntro);
  useEffect(() => {
    beginIntroRef.current = beginIntro;
  }, [beginIntro]);

  /* ----------------------------------- the clock ----------------------------------- */

  useEffect(() => {
    if ((phase !== "playing" && phase !== "entrance" && phase !== "ended") || !focused || !layout) return;
    const { tile, viewTiles } = layout;
    const buf: number[] = new Array(frameLength(level.enemies.length, level.platforms.length, level.springs.length)).fill(0);
    let raf = 0;
    let last = Date.now();
    let acc = 0;
    let range = { from: -1, to: -1 };
    let shownSeconds = -1;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const world = worldRef.current;
      const walkIn = entranceRef.current;
      if (walkIn || victoryRef.current || exitRef.current || phase === "ended") {
        // The world waits; the water, coins and flag keep moving
        world.t += dt;
      } else if (!pausedRef.current && world.status === "playing" && !battleRef.current) {
        // (While a fight's panel is up the world stays still, even after the blow has landed: the hero's hop and the grace time wait for the zoom out)
        acc += dt;
        while (acc >= STEP) {
          acc -= STEP;
          const events = stepWorld(world, inputRef.current, STEP);
          if (events.length) handleEventsRef.current(events);
          if (world.status !== "playing") {
            acc = 0;
            break;
          }
        }
      }
      const hero = world.hero;
      const fighting = battleRef.current;
      // Near the boss for the first time: introduce it
      if (!walkIn && !introDoneRef.current && !fighting && !pausedRef.current && world.status === "playing" && bossIndex >= 0 && shouldIntroduceBoss(hero, world.enemies[bossIndex])) {
        beginIntroRef.current();
      }
      const cine = introRef.current;
      let cinePose: ReturnType<typeof introPose> | null = null;
      if (cine) {
        // The cinematic's own clock (it waits while the learner has paused), driving the camera, the zoom, the bars and the boss
        if (userPausedRef.current) cine.start += dt * 1000;
        const t = now - cine.start;
        if (t >= INTRO.total) {
          introRef.current = null;
          camRef.current = cine.heroCam;
          zoom.set(0);
          cineBars.set(0);
          cineShake.set(0);
          setIntro(null);
        } else {
          cinePose = introPose(t);
          camRef.current = cine.heroCam + (cine.bossCam - cine.heroCam) * cinePose.pan;
          zoom.set(cinePose.zoom);
          cineBars.set(cinePose.bars);
          cineShake.set(cinePose.shake);
          cineClock.set(t);
          if (cine.cues < 1 && t >= INTRO.panStart) {
            cine.cues = 1;
            void playSfx("lesson.whoosh");
          }
          if (cine.cues < 2 && t >= INTRO.zoomStart) {
            cine.cues = 2;
            void playSfx("lesson.zoom-in");
          }
          if (cine.cues < 3 && t >= INTRO.roarAt) {
            cine.cues = 3;
            void playSfx("game.platformer-battle");
            showEmotes([{ target: { kind: "enemy", index: cine.boss }, name: "anger", hold: 1500 }]);
          }
          if (cine.cues < 4 && t >= SLAM_AT) {
            cine.cues = 4;
            void playSfx("game.explosion");
            vibrate(30);
          }
          if (cine.cues < 5 && t >= INTRO.returnAt) {
            cine.cues = 5;
            void playSfx("lesson.zoom-out");
          }
        }
      }
      // The walk-in: Shrodi comes in from the left edge to the start, gets ready, and the mission shows
      let ready: ReturnType<typeof readyPose> | null = null;
      if (walkIn) {
        const pose = entrancePose(now - walkIn.start, walkIn.plan);
        const h = world.hero;
        const before = h.x;
        h.x = pose.x - h.w / 2;
        h.distance += Math.abs(h.x - before);
        h.vx = pose.walking ? WALK_IN.speed : 0;
        h.vy = 0;
        h.onGround = true;
        h.facing = 1;
        if (pose.readyMs !== null) {
          ready = readyPose(pose.readyMs);
          if (!readyEmoteRef.current && pose.readyMs >= READY.crouch + READY.hop + READY.land) {
            readyEmoteRef.current = true;
            showEmotes([{ target: { kind: "hero" }, name: "faceHappy", hold: 700 }]);
          }
        }
        if (pose.done) {
          entranceRef.current = null;
          h.vx = 0;
          h.idleT = 0;
          ready = null;
          beginPlayRef.current();
        }
      }
      // The end of the level: through the door (or the flinch), the title, the stars, then the panel
      const ex = exitRef.current;
      let exPose: ReturnType<typeof exitPose> | null = null;
      let exLost: ReturnType<typeof lostPose> | null = null;
      if (ex) {
        if (userPausedRef.current) ex.start += dt * 1000;
        const t = now - ex.start;
        const panelAt = ex.won ? exitTotal(ex.stars) : LOST.panelAt;
        cineClock.set(t);
        if (ex.won) {
          exPose = exitPose(t, ex.heroX0, ex.doorX);
          camRef.current = ex.heroCam + (ex.doorCam - ex.heroCam) * exPose.pan;
          zoom.set(exPose.zoom);
          cinePunch.set(exPose.punch);
          const h = world.hero;
          const before = h.x;
          h.x = exPose.x - h.w / 2;
          h.distance += Math.abs(h.x - before) + (exPose.enter > 0 && !exPose.gone ? dt * 1.2 : 0);
          h.vx = exPose.walking || (exPose.enter > 0 && !exPose.gone) ? 1 : 0;
          h.vy = 0;
          h.onGround = true;
          if (ex.doorX !== ex.heroX0) h.facing = ex.doorX > ex.heroX0 ? 1 : -1;
          if (ex.cues < 1 && t >= EXIT.openAt) {
            ex.cues = 1;
            setDoorOpen(true);
            void playSfx("lesson.unlock");
          }
          if (ex.cues < 2 && t >= EXIT.walkEnd) {
            ex.cues = 2;
            void playSfx("lesson.whoosh");
          }
          if (ex.cues < 3 && t >= EXIT.closeAt) {
            ex.cues = 3;
            setDoorOpen(false);
            if (flagTile) addEffect("goal", flagTile.c, flagTile.r - 0.5);
            void playSfx("game.hit");
            vibrate(30);
          }
          if (ex.cues < 4 && t >= EXIT.titleAt) {
            ex.cues = 4;
            setExitTitle("Level complete!");
            void playSfx("reward.finish-jingle");
            void playSfx("game.fireworks-launch");
            later(() => void playSfx("game.fireworks-burst"), 650);
          }
          while (ex.starCues < 3 && t >= starAt(ex.starCues)) {
            void playSfx(ex.starCues < ex.stars ? "reward.sparkle" : "ui.tick");
            ex.starCues += 1;
          }
        } else {
          exLost = lostPose(t);
          // Nothing holds them up: gravity takes them down to the floor (a pit has none, they stay where the fall put them)
          const h = world.hero;
          h.vx = 0;
          if (ex.landY !== null && h.y < ex.landY) {
            h.vy = Math.min(MAX_FALL, Math.max(0, h.vy) + GRAVITY * dt);
            h.y = Math.min(ex.landY, h.y + h.vy * dt);
            if (h.y >= ex.landY) h.onGround = true;
          } else h.vy = 0;
          // The thud of landing on the floor, once
          if (!ex.thud && ex.landY !== null && h.y >= ex.landY - 1e-6) {
            ex.thud = true;
            void playSfx(fallCue(story.theme));
          }
          if (!ex.zoomed) zoom.set(exLost.zoom);
          if (ex.cues < 1 && t >= LOST.titleAt) {
            ex.cues = 1;
            showEmotes([{ target: { kind: "hero" }, name: "faceSad", hold: 900 }]);
            setExitTitle("Out of hearts");
            void playSfx("game.over");
          }
        }
        if (t >= panelAt) {
          exitRef.current = null;
          setEnded(pendingEndRef.current);
          setPhase("ended");
        }
      }
      // The boss's defeat: the celebration's own clock (it waits while the learner has paused)
      const win = victoryRef.current;
      let winPose: ReturnType<typeof victoryPose> | null = null;
      if (win) {
        if (userPausedRef.current) win.start += dt * 1000;
        const t = now - win.start;
        if (t >= VICTORY.total) {
          victoryRef.current = null;
          camRef.current = win.heroCam;
          zoom.set(0);
          cineBars.set(0);
          cineShake.set(0);
          cinePunch.set(0);
          setVictory(null);
          bossBeatenRef.current = false;
        } else {
          winPose = victoryPose(t);
          camRef.current = win.heroCam + (win.flagCam - win.heroCam) * winPose.pan;
          zoom.set(winPose.zoom);
          cineBars.set(winPose.bars);
          cineShake.set(winPose.shake);
          cinePunch.set(winPose.punch);
          cineClock.set(t);
          if (win.cues < 1 && t >= VICTORY.explodeAt) {
            win.cues = 1;
            showEmotes([{ target: { kind: "hero" }, name: "stars", hold: 1500 }]);
            setEnemyAlive((a) => a.map((v, i) => (i === win.boss ? false : v)));
            void playSfx("game.explosion");
            vibrate(70);
          }
          if (win.cues < 2 && t >= VICTORY.titleAt) {
            win.cues = 2;
            void playSfx("reward.achievement");
            void playSfx("game.fireworks-burst");
          }
          if (win.cues < 3 && t >= VICTORY.zoomOutStart) {
            win.cues = 3;
            void playSfx("lesson.zoom-out");
          }
          if (win.cues < 4 && t >= VICTORY.panStart) {
            win.cues = 4;
            void playSfx("lesson.whoosh");
          }
          if (win.cues < 5 && t >= VICTORY.flagAt) {
            win.cues = 5;
            setFlagOpen(true);
            if (flagTile) addEffect("flag", flagTile.c, flagTile.r);
            void playSfx("lesson.unlock");
            void playSfx("reward.sparkle");
          }
          if (win.cues < 6 && t >= VICTORY.returnAt) {
            win.cues = 6;
            void playSfx("lesson.whoosh");
          }
        }
      }
      // Footsteps, left then right, a half stride apart on the ground
      if (!fighting && !cine && !walkIn && !victoryRef.current && !exitRef.current && phase === "playing") {
        const step = footstepDue(lastStepRef.current, hero.distance, hero.onGround, hero.vx);
        if (step !== null) {
          lastStepRef.current = step;
          void playSfx(stepCue(story.theme, step));
        }
      }
      // Standing still for a while: a "zZ" over the hero now and then, gone as soon as they move
      if (!fighting && !cine && !walkIn && !victoryRef.current && !exitRef.current && phase === "playing") {
        const sleeping = emotesRef.current.find((m) => m.target.kind === "hero" && m.name === "sleep");
        if (sleeping && hero.idleT < 0.5) removeEmote(sleeping.id);
        else if (!sleeping && sleepDue(hero.idleT, (now - sleepAtRef.current) / 1000)) {
          sleepAtRef.current = now;
          showEmotes([{ target: { kind: "hero" }, name: "sleep", hold: EMOTE.sleepHold }]);
        }
      }
      // The camera stays put during a battle, so the zoom's aim stays true
      if (!fighting && !cine && !walkIn && !victoryRef.current && !exitRef.current && phase !== "ended") {
        const target = cameraTarget(hero.x + hero.w / 2, viewTiles, level.cols, hero.facing) * tile;
        camRef.current += (target - camRef.current) * (1 - Math.exp(-7 * dt));
      }
      const cam = Math.round(camRef.current);
      let fx: { pose: FxPose; enemy: number } | undefined;
      if (fighting) {
        // The answer's fight, or, while the question waits, the hero's idle loop; reduced motion keeps still
        let pose: FxPose = { ...NO_FX, heroFrame: idleFrame((now - battleStartRef.current) / 1000) };
        const run = fxRef.current;
        if (run) {
          const t = now - run.start;
          if (t >= fxTotal(run.kind)) fxRef.current = null;
          else if (!reducedRef.current) pose = fxPose(run.kind, t, fighting.geo.dir, run.lethal);
        }
        fx = { pose, enemy: fighting.enemyId };
      }
      fillFrame(world, cam, tile, buf, fx, viewTiles * tile);
      if (ready) {
        buf[4] = ready.frame;
        buf[3] += ready.dy * tile;
      }
      const sec = Math.floor(world.stats.time);
      if (sec !== shownSeconds) {
        shownSeconds = sec;
        setSeconds(sec);
      }
      if (cine && cinePose) {
        // The hero stands and watches; the boss turns to face them and roars
        buf[4] = idleFrame((now - cine.start) / 1000);
        const boss = world.enemies[cine.boss];
        buf[5] = boss.x > hero.x ? 1 : -1;
        const at = FRAME_HEAD + cine.boss * FRAME_PER_ENEMY;
        buf[at + 1] += cinePose.boss.dy * tile;
        buf[at + 3] = boss.x > hero.x ? 1 : -1;
        buf[at + 4] = cinePose.boss.sx;
        buf[at + 5] = cinePose.boss.sy;
        buf[at + 6] = cinePose.boss.flash;
      }
      if (ex && exPose) {
        // Through the door: smaller with every step, then gone
        const k = exPose.gone ? 0 : 1 - 0.5 * exPose.enter;
        buf[7] = k;
        buf[8] = k;
      }
      // Out of hearts: lying down, one still frame, no flash and no blinking
      const lying = (ex && exLost) || (!ex && phase === "ended" && !exitWonRef.current);
      if (lying) {
        buf[4] = lostPose(now).heroFrame;
        buf[6] = 1;
        buf[7] = 1;
        buf[8] = 1;
        buf[9] = 0;
      }
      if (!ex && phase === "ended") {
        if (exitWonRef.current) {
          buf[7] = 0;
          buf[8] = 0;
        }
      }
      if (win && winPose) {
        // The hero watches the boss shudder and swell, then throws up their arms; the boss shakes, swells and bursts
        buf[4] = winPose.heroFrame ?? idleFrame((now - win.start) / 1000);
        const at = FRAME_HEAD + win.boss * FRAME_PER_ENEMY;
        buf[at] += winPose.boss.dx * tile;
        buf[at + 4] = winPose.gone ? 0 : winPose.boss.sx;
        buf[at + 5] = winPose.gone ? 0 : winPose.boss.sy;
        buf[at + 6] = winPose.boss.flash;
      }
      frame.value = buf.slice();
      const next = visibleChunks(cam / tile, viewTiles, level.cols);
      if (next.from !== range.from || next.to !== range.to) {
        range = next;
        setChunks(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, focused, layout, level, frame, zoom, cineBars, cineClock, cineShake, cinePunch, bossIndex, flagTile, addEffect, showEmotes, removeEmote, later, story.theme]);

  /* ----------------------------------- run control ----------------------------------- */

  /** Set up a fresh run. `walkIn` plays the entrance (the first time); a restart goes straight into play. */
  const begin = useCallback(
    (walkIn: boolean) => {
      if (bank !== "ready" || !layout) return;
      const world = createWorld(level);
      worldRef.current = world;
      if (battlesRef.current) battlesRef.current = restartStoryBattle(battlesRef.current);
      inputRef.current = { left: false, right: false, jump: false };
      endedRef.current = false;
      camRef.current = cameraTarget(world.hero.x + world.hero.w / 2, layout.viewTiles, level.cols) * layout.tile;
      setHearts(MAX_HEARTS);
      setCoins(0);
      setCoinTaken(level.coins.map(() => false));
      setGemTaken(level.gems.map(() => false));
      setBlockUsed(level.blocks.map(() => false));
      setKeyTaken(level.keys.map(() => false));
      setKeys(0);
      setActiveSign(null);
      setSignShown(null);
      setSignRead(level.signs.map(() => false));
      setBlockBumps(level.blocks.map(() => 0));
      setCheckpointIdx(0);
      setEffects([]);
      emotesRef.current = [];
      setEmotes([]);
      sleepAtRef.current = Date.now();
      readyEmoteRef.current = false;
      lastStepRef.current = 0;
      setFlagOpen(false);
      setDoorOpen(false);
      setExitView(null);
      setExitTitle(null);
      exitRef.current = null;
      pendingEndRef.current = null;
      setVictory(null);
      victoryRef.current = null;
      bossBeatenRef.current = false;
      cinePunch.set(0);
      setSeconds(0);
      setSaved(null);
      setMission(false);
      setEnemyAlive(level.enemies.map(() => true));
      cancelAnimation(zoom);
      zoom.set(0);
      fxKind.set(0);
      fxRef.current = null;
      introRef.current = null;
      introDoneRef.current = false;
      cineBars.set(0);
      cineShake.set(0);
      setIntro(null);
      setBattle(null);
      setEnded(null);
      setToast(null);
      if (walkIn && !reducedRef.current) {
        const plan = entrancePlan(world.hero.x + world.hero.w / 2, camRef.current / layout.tile);
        entranceRef.current = { start: Date.now(), plan };
        void playSfx("lesson.whoosh");
        setPhase("entrance");
      } else {
        entranceRef.current = null;
        void playSfx("lesson.start");
        setPhase("playing");
        if (walkIn) {
          setMission(true);
          later(() => setMission(false), MISSION_MS);
        }
      }
    },
    [bank, cinePunch, cineBars, cineShake, fxKind, later, layout, level, zoom],
  );
  const start = useCallback(() => begin(false), [begin]);

  /** The walk-in is over: play begins and the mission shows at the top for a few seconds. */
  const beginPlay = useCallback(() => {
    void playSfx("lesson.start");
    setPhase("playing");
    setMission(true);
    later(() => setMission(false), MISSION_MS);
  }, [later]);
  const beginPlayRef = useRef(beginPlay);
  useEffect(() => {
    beginPlayRef.current = beginPlay;
  }, [beginPlay]);

  // Everything is ready (pictures, questions, the screen measured, the card read): Shrodi walks in
  const walkInStarted = useRef(false);
  useEffect(() => {
    if (walkInStarted.current || phase !== "loading" || bank !== "ready" || !assets.ready || !waited || !layout) return;
    walkInStarted.current = true;
    later(() => begin(true), 0);
  }, [phase, bank, assets.ready, waited, layout, begin, later]);

  const setKey = useCallback((key: keyof Input, down: boolean) => {
    inputRef.current = { ...inputRef.current, [key]: down };
  }, []);

  const leave = useCallback(() => router.back(), [router]);
  const requestExit = useCallback(() => {
    if (phase === "playing") setPaused(true);
    else leave();
  }, [leave, phase]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (paused) setPaused(false);
      else requestExit();
      return true;
    });
    return () => sub.remove();
  }, [paused, requestExit]);

  /* ------------------------------------ battle input ------------------------------------ */

  /** Zoom back out and give the world back. */
  const leaveBattle = useCallback(() => {
    fxRef.current = null;
    fxKind.set(0);
    cancelAnimation(zoom);
    zoom.set(reduced ? 0 : withTiming(0, { duration: FX.zoomOut, easing: EASE_IN_OUT }));
    void playSfx("lesson.zoom-out");
    setBattle(null);
  }, [fxKind, reduced, zoom]);
  const leaveBattleRef = useRef(leaveBattle);
  useEffect(() => {
    leaveBattleRef.current = leaveBattle;
  }, [leaveBattle]);

  /** The blow lands (the moment of contact): the question is used up, the world applies the answer, hearts and life change. */
  const applyOutcome = useCallback(
    (correct: boolean, token: string) => {
      const current = battleRef.current;
      const battles = battlesRef.current;
      // A timer of a question that is no longer the open one (the battle moved on or ended) does nothing
      if (!current || current.served.token !== token) return;
      if (battles) settleStory(battles, current.served.token, correct);
      const world = worldRef.current;
      const enemy = world.enemies[current.enemyId];
      const r = resolveBattle(world, correct);
      if (correct && !current.lethal) void playSfx("reward.pop");
      onBattleEvents(r.events);
      showEmotes(emotesForAnswer(correct, current.lethal, current.enemyId));
      outcomeRef.current = { correct, continues: r.continues };
      setBattle((b) => (b ? { ...b, hp: Math.max(0, enemy.hp) } : b));
    },
    [onBattleEvents, showEmotes],
  );

  /** The boss is beaten: close the panel but stay zoomed, and let it burst, the hero cheer, confetti fall and the flag open. */
  const beginVictory = useCallback(
    (from: BattleState) => {
      const place = layoutRef.current;
      if (!place || !area || bossIndex < 0) {
        setEnemyAlive((a) => a.map((v, i) => (i === bossIndex ? false : v)));
        setFlagOpen(true);
        leaveBattleRef.current();
        return;
      }
      const viewTiles = area.w / place.tile;
      const flagX = (flagTile?.c ?? level.cols - 2) + 0.5;
      const flagCam = Math.round(bossCamera(flagX, viewTiles, level.cols) * place.tile);
      fxRef.current = null;
      fxKind.set(0);
      cineBars.set(0);
      cineClock.set(0);
      victoryRef.current = { start: Date.now(), heroCam: Math.round(camRef.current), flagCam, boss: bossIndex, cues: 0 };
      setBattle(null);
      setVictory({ name: from.name, blast: { x: from.geo.enemy.x, y: from.geo.enemy.y } });
    },
    [area, bossIndex, cineBars, cineClock, flagTile, fxKind, level.cols],
  );

  /** After the fight: the next question while the enemy still stands, or back to the map. */
  const advance = useCallback((token?: string) => {
    const current = battleRef.current;
    const battles = battlesRef.current;
    const outcome = outcomeRef.current;
    if (!current || !outcome) return;
    if (token !== undefined && current.served.token !== token) return;
    outcomeRef.current = null;
    if (outcome.continues) {
      const world = worldRef.current;
      const enemy = world.enemies[current.enemyId];
      const served = battles ? askStory(battles, current.enemyId) : null;
      if (served) {
        fxKind.set(0);
        fxRef.current = null;
        battleStartRef.current = Date.now();
        setBattle({ ...current, hp: enemy.hp, served, picked: null, result: null, lethal: false });
        return;
      }
      // Nothing left to ask: the rest of its life goes with the last answer
      enemy.hp = 1;
      const done = resolveBattle(world, true);
      onBattleEvents(done.events);
    }
    if (bossBeatenRef.current && current.kind === "boss" && !victoryRef.current) {
      beginVictory(current);
      return;
    }
    leaveBattle();
  }, [beginVictory, fxKind, leaveBattle, onBattleEvents]);

  const pick = useCallback(
    (index: number) => {
      const current = battleRef.current;
      const battles = battlesRef.current;
      if (!current || !battles || current.result) return;
      const res = answerStory(battles, current.served.token, index);
      if (!res) return;
      const kind: FxKind = res.correct ? "attack" : "hurt";
      const lethal = res.correct && current.hp <= 1;
      void playSfx(res.correct ? "lesson.answer-correct" : "lesson.answer-wrong");
      vibrate(res.correct ? 15 : 40);
      // The fight's clock starts now; the blow lands FX.contact ms later
      fxRef.current = { kind, start: Date.now(), lethal };
      cancelAnimation(fxClock);
      fxClock.set(0);
      fxKind.set(res.correct ? 1 : 2);
      fxClock.set(withTiming(fxTotal(kind), { duration: fxTotal(kind), easing: Easing.linear }));
      setBattle({ ...current, picked: index, result: res.correct ? "correct" : "wrong", lethal });
      const token = current.served.token;
      later(() => applyOutcome(res.correct, token), FX.contact + 40);
      if (res.correct) later(() => advance(token), ADVANCE_MS);
    },
    [advance, applyOutcome, fxClock, fxKind, later],
  );

  /** The wiggle of the whole picture while a fight plays, and the red wash of a hurt. */
  const zoomStyle = useAnimatedStyle(() => {
    const z = zoom.get();
    const p = plan.get();
    const k = fxKind.get();
    const t = fxClock.get();
    const kind: FxKind = k === 2 ? "hurt" : "attack";
    const scale = (1 + (p.scale - 1) * z) * (1 + (k ? zoomPunch(t) * z : 0) + cinePunch.get() * z);
    const shake = (k ? camShake(kind, t) * z : 0) + cineShake.get();
    return { transform: [{ translateX: p.tx * z + shake }, { translateY: p.ty * z }, { scale }] };
  });
  const washStyle = useAnimatedStyle(() => ({ opacity: fxKind.get() === 2 ? vignette("hurt", fxClock.get()) : 0 }));

  /* -------------------------------------- render -------------------------------------- */

  const bottomPad = insets.bottom;
  return (
    <View style={styles.screen}>
      <View style={styles.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {layout && area ? (
          <>
            <Animated.View style={[styles.zoomer, zoomStyle]} pointerEvents="none">
              <PlatformerWorld
                level={level}
                tile={layout.tile}
                viewW={area.w}
                viewH={area.h}
                worldTop={layout.worldTop}
                underRows={layout.underRows}
                frame={frame}
                chunks={chunks}
                coinTaken={coinTaken}
                gemTaken={gemTaken}
                enemyAlive={enemyAlive}
                flagLocked={flagLocked}
                doorOpen={doorOpen}
                theme={story.theme}
                blockUsed={blockUsed}
                blockBumps={blockBumps}
                keyTaken={keyTaken}
                checkpoint={checkpointIdx}
                signIndex={signShown}
                signOpen={activeSign !== null}
                signRead={signRead}
                effects={effects}
                onEffectDone={removeEffect}
                emotes={emotes}
                onEmoteDone={removeEmote}
                biome={story.biome}
                fadeBiome={story.fadeBiome}
              />
              {exitView && exitView.won ? <ExitStars clock={cineClock} at={exitView.door} tile={layout.tile} stars={exitView.stars} /> : null}
              {victory ? <BossBlastFx clock={cineClock} at={victory.blast} tile={layout.tile} /> : null}
              {intro ? <BossSlamFx clock={cineClock} at={intro.slam} tile={layout.tile} /> : null}
              {battle && battle.result ? (
                <BattleFx
                  key={battle.served.token}
                  kind={battle.result === "correct" ? "attack" : "hurt"}
                  clock={fxClock}
                  hit={battle.result === "correct" ? battle.geo.enemy : battle.geo.hero}
                  head={battle.geo.head}
                  lethal={battle.lethal}
                  tile={layout.tile}
                />
              ) : null}
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} />
            <LinearGradient pointerEvents="none" colors={[withAlpha(BLACK, 0), BLACK]} style={[styles.fade, { height: DECK + bottomPad + FADE_EXTRA }]} />
            {battle || intro || victory || exitView || phase === "loading" || phase === "entrance" ? null : (
              <View style={[styles.deck, { height: DECK + bottomPad, paddingBottom: bottomPad }]}>
                <Controls onChange={setKey} />
              </View>
            )}
            {phase === "playing" && !intro && !victory && !exitView ? (
              <GameHud
                level={level}
                tile={layout.tile}
                top={insets.top}
                frame={frame}
                hearts={hearts}
                coins={coins}
                keys={keys}
                seconds={seconds}
                flagLocked={flagLocked}
                inBattle={battle !== null}
                onPause={() => setPaused(true)}
              />
            ) : null}
            {victory ? <BossVictory bars={cineBars} clock={cineClock} name={victory.name} topHeight={insets.top + 50} bottomHeight={140 + insets.bottom} width={area.w} height={area.h} /> : null}
            {intro ? <BossIntro bars={cineBars} name={intro.name} topHeight={insets.top + 50} bottomHeight={140 + insets.bottom} /> : null}
            {toast ? (
              <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(160)} style={[styles.toast, { top: insets.top + 124 }]} pointerEvents="none">
                <Text style={styles.toastText}>{toast}</Text>
              </Animated.View>
            ) : null}
            {mission && phase === "playing" ? <MissionBanner text={story.mission} top={insets.top + 96} /> : null}
            {battle ? (
              <BattlePanel
                enemyName={battle.name}
                enemyHp={battle.hp}
                enemyMaxHp={battle.maxHp}
                served={battle.served}
                picked={battle.picked}
                result={battle.result}
                lastHit={battle.result === "correct" ? battle.lethal : false}
                bottomInset={bottomPad}
                onPick={pick}
                onContinue={() => advance()}
              />
            ) : null}
            {exitTitle ? <ExitTitle text={exitTitle} top={insets.top + 84} /> : null}
            {phase === "ended" && ended ? (
              <ResultPanel
                summary={ended.summary}
                stats={ended.stats}
                hearts={ended.hearts}
                recommendations={ended.recommendations}
                newBestTime={saved?.newBestTime ?? false}
                bestTime={saved?.record.bestTime ?? null}
                bottomInset={bottomPad}
                maxHeight={Math.min(PANEL_H + 72, area.h * 0.6)}
                onAgain={start}
                onBack={leave}
                onNext={nextStory ? () => router.replace(`/explorer/platformer?level=${nextStory.id}`) : undefined}
                onLesson={(id) => router.push(`/lesson/${id}`)}
              />
            ) : null}
          </>
        ) : null}
        {phase === "loading" ? <LoadingScreen title={story.title} levelNumber={story.number} progress={loadingProgress} failed={bank === "failed"} onBack={leave} /> : null}
      </View>
      <PauseDialog
        visible={paused}
        hearts={hearts}
        maxHearts={MAX_HEARTS}
        coins={coins}
        beaten={enemyAlive.filter((alive) => !alive).length}
        enemies={level.enemies.length}
        onResume={() => setPaused(false)}
        onRestart={() => {
          setPaused(false);
          start();
        }}
        onLeave={leave}
      />
    </View>
  );
}
