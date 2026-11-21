/**
 * Media policy tests — Read Aloud controller state machine, route policy,
 * effect/music gates and the text builders (spec §4.1).
 *
 * Run: npm run test:media
 */
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import {
  DEFAULT_MEDIA_ENVIRONMENT,
  DEFAULT_MEDIA_PREFERENCES,
  buildFeedbackSpeech,
  buildMythSpeech,
  buildQuestionSpeech,
  canPlayGameSfx,
  canPlayMusic,
  canPlayUiClick,
  createReadAloudController,
  getReadAloudButtonModel,
  getRouteMediaPolicy,
  sanitizeSpeechText,
} from "../services/media-core.ts";

/** Scriptable fake engine that records calls and exposes the callbacks. */
const createFakeEngine = ({ throwOnSpeak = false } = {}) => {
  const calls = { speak: [], stop: 0 };
  let current = null;
  let speaking = false;
  return {
    calls,
    get current() {
      return current;
    },
    setSpeaking: (value) => {
      speaking = value;
    },
    engine: {
      speak(text, options, callbacks) {
        if (throwOnSpeak) throw new Error("no engine");
        calls.speak.push({ text, options });
        current = callbacks;
        speaking = true;
      },
      async stop() {
        calls.stop += 1;
        speaking = false;
        // Real engines report the interruption asynchronously.
        const cb = current;
        current = null;
        queueMicrotask(() => cb?.onStopped());
      },
      async isSpeaking() {
        return speaking;
      },
    },
  };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("Read Aloud controller", () => {
  it("walks idle → loading → speaking → idle", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    const seen = [];
    c.subscribe(() => seen.push(c.getSnapshot().status));

    await c.speak({ ownerId: "a", text: "Hello atoms" });
    assert.equal(c.getSnapshot().status, "loading");
    assert.equal(c.isActive("a"), true);

    fake.current.onStart();
    assert.equal(c.getSnapshot().status, "speaking");

    fake.current.onDone();
    assert.equal(c.getSnapshot().status, "idle");
    assert.equal(c.getSnapshot().ownerId, null);
    assert.equal(c.getSnapshot().lastEndReason, "completed");
    assert.deepEqual(seen.slice(0, 3), ["loading", "speaking", "idle"]);
    c.dispose();
  });

  it("starting a new utterance stops the previous one; only one owner is ever active", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });

    await c.speak({ ownerId: "quiz:1", text: "First" });
    fake.current.onStart();
    assert.equal(c.isActive("quiz:1"), true);

    await c.speak({ ownerId: "lesson:2", text: "Second" });
    assert.equal(c.isActive("quiz:1"), false, "previous control must drop");
    assert.equal(c.isActive("lesson:2"), true);
    assert.equal(c.getSnapshot().lastEndReason, "superseded");
    assert.ok(fake.calls.stop >= 2, "engine stopped before the new utterance");
    assert.equal(fake.calls.speak.length, 2);
    c.dispose();
  });

  it("a stale onStopped/onDone from a replaced utterance cannot reset the new one", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });

    await c.speak({ ownerId: "a", text: "First" });
    const staleCallbacks = fake.current;
    staleCallbacks.onStart();

    await c.speak({ ownerId: "a", text: "Second" }); // replay / next question
    fake.current.onStart();
    assert.equal(c.getSnapshot().status, "speaking");

    // The engine reports the first utterance finishing/stopping late.
    staleCallbacks.onStopped();
    staleCallbacks.onDone();
    await flush();
    assert.equal(c.getSnapshot().status, "speaking");
    assert.equal(c.isActive("a"), true);
    c.dispose();
  });

  it("rapid toggles never leave a control claiming playback after stop", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    const req = { ownerId: "a", text: "Tap tap tap" };

    await c.toggle(req); // start
    fake.current?.onStart();
    await c.toggle(req); // stop
    assert.equal(c.getSnapshot().status, "idle");
    await c.toggle(req); // start again
    c.toggle(req); // stop before awaiting
    c.toggle(req); // start
    c.toggle(req); // stop
    await flush();
    assert.equal(c.isActive("a"), false);
    assert.equal(c.getSnapshot().status, "idle");
    c.dispose();
  });

  it("stop(owner) is a no-op for a control that does not own the channel", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    await c.speak({ ownerId: "a", text: "Hello" });
    fake.current.onStart();
    c.stop("screen-exit", "someone-else");
    assert.equal(c.isActive("a"), true);
    c.stop("screen-exit", "a");
    assert.equal(c.isActive("a"), false);
    assert.equal(c.getSnapshot().lastEndReason, "screen-exit");
    c.dispose();
  });

  it("route change, backgrounding and screen exit all end with a clean idle state", async () => {
    for (const reason of ["route-change", "background", "screen-exit", "answered"]) {
      const fake = createFakeEngine();
      const c = createReadAloudController({ engine: fake.engine });
      await c.speak({ ownerId: "a", text: "Hello" });
      fake.current.onStart();
      c.stop(reason);
      assert.equal(c.getSnapshot().status, "idle");
      assert.equal(c.getSnapshot().ownerId, null);
      assert.equal(c.getSnapshot().lastEndReason, reason);
      c.dispose();
    }
  });

  it("disabling Read Aloud stops speech and refuses new requests", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    await c.speak({ ownerId: "a", text: "Hello" });
    fake.current.onStart();
    c.setEnabled(false);
    assert.equal(c.getSnapshot().status, "idle");
    assert.equal(c.getSnapshot().lastEndReason, "disabled");
    await c.speak({ ownerId: "a", text: "Again" });
    assert.equal(c.getSnapshot().status, "idle");
    assert.equal(fake.calls.speak.length, 1);
    c.setEnabled(true);
    await c.speak({ ownerId: "a", text: "Again" });
    assert.equal(c.getSnapshot().status, "loading");
    c.dispose();
  });

  it("empty text resets instead of sticking in loading", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    await c.speak({ ownerId: "a", text: "   •  " });
    assert.equal(c.getSnapshot().status, "idle");
    assert.equal(fake.calls.speak.length, 0);
    c.dispose();
  });

  it("engine errors surface as a transient error and auto-reset to idle", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const fake = createFakeEngine();
      const c = createReadAloudController({ engine: fake.engine, errorResetMs: 2500 });
      await c.speak({ ownerId: "a", text: "Hello" });
      fake.current.onError(new Error("voice data missing"));
      assert.equal(c.getSnapshot().status, "error");
      assert.equal(c.isActive("a"), false, "an errored control is not 'playing'");
      mock.timers.tick(2600);
      assert.equal(c.getSnapshot().status, "idle");
      assert.equal(c.getSnapshot().ownerId, null);
      c.dispose();
    } finally {
      mock.timers.reset();
    }
  });

  it("a missing engine (sync throw) reports unavailable and recovers", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const fake = createFakeEngine({ throwOnSpeak: true });
      const c = createReadAloudController({ engine: fake.engine });
      await c.speak({ ownerId: "a", text: "Hello" });
      assert.equal(c.getSnapshot().status, "unavailable");
      mock.timers.tick(3000);
      assert.equal(c.getSnapshot().status, "idle");
      c.dispose();
    } finally {
      mock.timers.reset();
    }
  });

  it("an engine that never starts cannot strand the control in loading", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const fake = createFakeEngine();
      const c = createReadAloudController({
        engine: fake.engine,
        startTimeoutMs: 6000,
        errorResetMs: 2500,
      });
      await c.speak({ ownerId: "a", text: "Hello" });
      assert.equal(c.getSnapshot().status, "loading");
      mock.timers.tick(6100);
      assert.equal(c.getSnapshot().status, "error");
      mock.timers.tick(2600);
      assert.equal(c.getSnapshot().status, "idle");
      c.dispose();
    } finally {
      mock.timers.reset();
    }
  });

  it("watchdog heals a speaking state when the engine silently went quiet", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const fake = createFakeEngine();
      const c = createReadAloudController({ engine: fake.engine, watchdogMs: 2000 });
      await c.speak({ ownerId: "a", text: "Hello" });
      fake.current.onStart();
      fake.setSpeaking(false); // OEM TTS dropped the utterance, no callback fired
      for (let i = 0; i < 4; i += 1) {
        mock.timers.tick(2000);
        await flush();
      }
      assert.equal(c.getSnapshot().status, "idle");
      c.dispose();
    } finally {
      mock.timers.reset();
    }
  });

  it("dispose stops speech and silences listeners", async () => {
    const fake = createFakeEngine();
    const c = createReadAloudController({ engine: fake.engine });
    let notified = 0;
    c.subscribe(() => {
      notified += 1;
    });
    await c.speak({ ownerId: "a", text: "Hello" });
    fake.current.onStart();
    c.dispose();
    const before = notified;
    await flush();
    fake.current?.onDone?.();
    assert.equal(notified, before);
    assert.equal(c.getSnapshot().status, "idle");
  });
});

describe("route media policy", () => {
  const cases = [
    ["/lesson/atomic-basics-1", "lesson", true, true, false],
    ["/quiz/atomic-basics", "quiz", false, true, false],
    ["/(tabs)/phone", "phone", true, false, false],
    ["/phone", "phone", true, false, false],
    ["/phone-apps/chats", "phone", true, false, false],
    ["/phone-apps/shrodi", "phone", true, false, false],
    ["/mythbuster", "mythbuster", false, true, true],
    ["/lab", "lab", false, true, false],
    ["/encyclopedia", "encyclopedia", true, false, false],
    ["/profile", "other", true, false, false],
    ["", "other", true, false, false],
  ];
  for (const [path, surface, uiClicks, gameSfx, music] of cases) {
    it(`${path || "(empty)"} → ${surface}`, () => {
      const p = getRouteMediaPolicy(path);
      assert.equal(p.surface, surface);
      assert.equal(p.uiClicks, uiClicks);
      assert.equal(p.gameSfx, gameSfx);
      assert.equal(p.music, music);
    });
  }
});

describe("effect and music gates share one preference source", () => {
  const prefs = { ...DEFAULT_MEDIA_PREFERENCES };
  const env = { ...DEFAULT_MEDIA_ENVIRONMENT };

  it("muting sound effects mutes clicks AND game sfx everywhere", () => {
    const muted = { ...prefs, soundEffects: false };
    assert.equal(canPlayGameSfx(muted, env), false);
    assert.equal(canPlayUiClick(muted, env, getRouteMediaPolicy("/profile")), false);
  });

  it("game surfaces play game sfx but not generic clicks", () => {
    const quiz = getRouteMediaPolicy("/quiz/x");
    assert.equal(canPlayGameSfx(prefs, env), true);
    assert.equal(canPlayUiClick(prefs, env, quiz), false);
    // Lesson footer buttons do click (their option rows play answer cues instead)
    assert.equal(canPlayUiClick(prefs, env, getRouteMediaPolicy("/lesson/x")), true);
  });

  it("backgrounded app plays nothing", () => {
    const bg = { ...env, appActive: false };
    assert.equal(canPlayGameSfx(prefs, bg), false);
    assert.equal(canPlayUiClick(prefs, bg, getRouteMediaPolicy("/profile")), false);
    assert.equal(canPlayMusic(prefs, bg, getRouteMediaPolicy("/mythbuster")), false);
  });

  it("an active screen reader suppresses redundant UI clicks only", () => {
    const sr = { ...env, screenReaderActive: true };
    assert.equal(canPlayUiClick(prefs, sr, getRouteMediaPolicy("/profile")), false);
    assert.equal(canPlayGameSfx(prefs, sr), true);
  });

  it("music needs both the music preference and a music-enabled surface", () => {
    assert.equal(canPlayMusic(prefs, env, getRouteMediaPolicy("/mythbuster")), true);
    assert.equal(canPlayMusic(prefs, env, getRouteMediaPolicy("/profile")), false);
    assert.equal(
      canPlayMusic({ ...prefs, music: false }, env, getRouteMediaPolicy("/mythbuster")),
      false,
    );
  });
});

describe("Read Aloud text builders", () => {
  it("reads the question and lettered options", () => {
    assert.equal(
      buildQuestionSpeech("What is an isotope?", ["A", "B"]),
      "What is an isotope? Option A: A. Option B: B",
    );
  });
  it("reads only the question when there are no options", () => {
    assert.equal(buildQuestionSpeech("What is an isotope?", []), "What is an isotope?");
  });
  it("builds feedback and myth speech", () => {
    assert.equal(buildFeedbackSpeech(true, "Because."), "Correct. Because.");
    assert.equal(buildFeedbackSpeech(false), "Not quite.");
    assert.equal(buildMythSpeech("X is Y"), "Myth: X is Y");
    assert.equal(
      buildMythSpeech("X is Y", { reality: "Z", explanation: "Because Z." }),
      "Myth: X is Y Reality: Z Because Z.",
    );
  });
  it("sanitizes bullets, markdown and whitespace", () => {
    assert.equal(sanitizeSpeechText("• one\n\n• two **bold**"), "one. two bold");
    assert.equal(sanitizeSpeechText(" • "), "");
    assert.equal(sanitizeSpeechText("   "), "");
  });
});

describe("Read Aloud button model", () => {
  it("uses the same state model on every surface", () => {
    assert.equal(getReadAloudButtonModel("idle", "question").icon, "VolumeHigh");
    assert.equal(getReadAloudButtonModel("speaking", "question").icon, "VolumeSlash");
    assert.equal(getReadAloudButtonModel("loading", "question").busy, true);
    assert.equal(getReadAloudButtonModel("error", "question").failed, true);
    assert.equal(getReadAloudButtonModel("unavailable", "question").failed, true);
    assert.match(getReadAloudButtonModel("idle", "explanation").label, /explanation/);
  });
});
