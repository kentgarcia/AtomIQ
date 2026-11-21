/**
 * Media policy core — framework-free.
 *
 * One contract for Read Aloud (speech), sound effects and background music,
 * used by lessons, random quizzes, Schrodi/Shrodi (Guide), MythBuster,
 * Atom Maze, the Lab and the encyclopedia. See docs/critical/MEDIA_POLICY.md.
 *
 * This module has NO React Native / Expo imports on purpose so the whole
 * state machine runs under plain `node --test` (scripts/test-media-policy.mjs).
 * Runtime wiring (expo-speech, expo-audio, AsyncStorage, AppState) lives in
 * services/media.ts.
 */

/* ------------------------------------------------------------------ */
/* Preferences — the single source of truth                            */
/* ------------------------------------------------------------------ */

export interface MediaPreferences {
  /** UI click + game feedback sound effects. */
  soundEffects: boolean;
  /** Background music channel. */
  music: boolean;
  /** Read Aloud (text-to-speech) buttons. */
  readAloud: boolean;
}

export const DEFAULT_MEDIA_PREFERENCES: Readonly<MediaPreferences> = {
  soundEffects: true,
  music: true,
  readAloud: true,
};

/* ------------------------------------------------------------------ */
/* Route policy                                                        */
/* ------------------------------------------------------------------ */

export type MediaSurface =
  | "lesson"
  | "quiz"
  | "mythbuster"
  | "lab"
  | "phone"
  | "encyclopedia"
  | "other";

export interface RouteMediaPolicy {
  surface: MediaSurface;
  /** Generic button-press clicks. Off in game surfaces: those play their own feedback. */
  uiClicks: boolean;
  /** Correct / wrong / game-over effects. */
  gameSfx: boolean;
  /** Background music is only allowed on focused game surfaces. */
  music: boolean;
}

/** Normalise an expo-router pathname (strip groups, trailing slash, case). */
export const normalizeMediaPathname = (pathname?: string | null): string => {
  if (!pathname) return "";
  return pathname
    .toLowerCase()
    .replace(/\/(\([^/]+\))/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
};

const matches = (route: string, prefix: string): boolean =>
  route === prefix || route.startsWith(`${prefix}/`);

export const getRouteMediaPolicy = (
  pathname?: string | null,
): RouteMediaPolicy => {
  const route = normalizeMediaPathname(pathname);

  if (matches(route, "/lesson")) {
    // Footer buttons (Check, Continue, Skip) click in a lesson; its option rows stay silent and play
    // the answer cues instead (docs/features/SFX_SPEC.md §6.3).
    return { surface: "lesson", uiClicks: true, gameSfx: true, music: false };
  }
  if (matches(route, "/quiz") || matches(route, "/quiz-results")) {
    return { surface: "quiz", uiClicks: false, gameSfx: true, music: false };
  }
  if (matches(route, "/mythbuster")) {
    return {
      surface: "mythbuster",
      uiClicks: false,
      gameSfx: true,
      music: true,
    };
  }
  if (matches(route, "/lab")) {
    return { surface: "lab", uiClicks: false, gameSfx: true, music: false };
  }
  if (matches(route, "/phone") || matches(route, "/phone-apps")) {
    return { surface: "phone", uiClicks: true, gameSfx: false, music: false };
  }
  if (matches(route, "/encyclopedia") || matches(route, "/explorer/encyclopedia")) {
    return {
      surface: "encyclopedia",
      uiClicks: true,
      gameSfx: false,
      music: false,
    };
  }
  return { surface: "other", uiClicks: true, gameSfx: false, music: false };
};

/* ------------------------------------------------------------------ */
/* Effect / music gates                                                */
/* ------------------------------------------------------------------ */

export interface MediaEnvironment {
  /** A screen reader (TalkBack / VoiceOver) is running. */
  screenReaderActive: boolean;
  /** App is in the foreground. */
  appActive: boolean;
}

export const DEFAULT_MEDIA_ENVIRONMENT: Readonly<MediaEnvironment> = {
  screenReaderActive: false,
  appActive: true,
};

export const canPlayUiClick = (
  prefs: MediaPreferences,
  env: MediaEnvironment,
  policy: RouteMediaPolicy,
): boolean =>
  prefs.soundEffects &&
  env.appActive &&
  // A screen reader already announces the press; a click on top is noise.
  !env.screenReaderActive &&
  policy.uiClicks;

export const canPlayGameSfx = (
  prefs: MediaPreferences,
  env: MediaEnvironment,
): boolean => prefs.soundEffects && env.appActive;

/** How a sound effect is gated (docs/features/SFX_SPEC.md §7.2). */
export type SfxCategory = "tap" | "panel" | "feedback" | "reward" | "stinger" | "voice";

/**
 * One gate for every cue in the SFX catalog. Every category needs the Sound Effects
 * preference and the app in the foreground; the rest depends on what the sound is:
 * - tap: a generic press, so the route policy and screen readers apply (as canPlayUiClick);
 * - panel / feedback / reward / stinger: information or a reward, so they always play;
 * - voice: decorative (blips, sparkles), so no screen reader and never over Read Aloud.
 */
export const canPlayCue = (
  category: SfxCategory,
  prefs: MediaPreferences,
  env: MediaEnvironment,
  policy: RouteMediaPolicy,
  readAloudSpeaking: boolean = false,
): boolean => {
  if (!prefs.soundEffects || !env.appActive) return false;
  switch (category) {
    case "tap":
      return !env.screenReaderActive && policy.uiClicks;
    case "voice":
      return !env.screenReaderActive && !readAloudSpeaking;
    default:
      return true;
  }
};

export const canPlayMusic = (
  prefs: MediaPreferences,
  env: MediaEnvironment,
  policy: RouteMediaPolicy,
): boolean => prefs.music && env.appActive && policy.music;

/* ------------------------------------------------------------------ */
/* Read Aloud text builders (what each screen reads)                   */
/* ------------------------------------------------------------------ */

/**
 * Strip characters Android/iOS TTS engines choke on or read badly:
 * bullets, markdown emphasis, runs of whitespace, doubled full stops.
 */
export const sanitizeSpeechText = (text: string): string => {
  const cleaned = (text ?? "")
    .replace(/[*_`#>]+/g, "")
    .replace(/[•·▪▫◦]/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/(\.\s*){2,}/g, ". ")
    .replace(/^[.\s]+/, "")
    .trim();
  // Punctuation-only input (e.g. a lone bullet) has nothing to read.
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : "";
};

const optionLetter = (index: number): string => String.fromCharCode(65 + index);

/**
 * Unanswered question: the question, then the choices ("Option A: …").
 * Choices are included so a learner who cannot read the screen can answer.
 */
export const buildQuestionSpeech = (
  question: string,
  options?: readonly string[] | null,
): string => {
  const parts = [question?.trim() ?? ""];
  if (options && options.length > 0) {
    parts.push(
      options
        .map((opt, i) => `Option ${optionLetter(i)}: ${String(opt).trim()}`)
        .join(". "),
    );
  }
  return parts.filter(Boolean).join(" ");
};

/** Answered question: verdict + explanation. */
export const buildFeedbackSpeech = (
  isCorrect: boolean,
  explanation?: string | null,
): string =>
  [isCorrect ? "Correct." : "Not quite.", explanation?.trim()]
    .filter(Boolean)
    .join(" ");

/** Myth card: the claim, and (once revealed) the reality. */
export const buildMythSpeech = (
  myth: string,
  reveal?: { reality?: string | null; explanation?: string | null } | null,
): string => {
  if (!reveal) return `Myth: ${myth.trim()}`;
  return [
    `Myth: ${myth.trim()}`,
    reveal.reality ? `Reality: ${reveal.reality.trim()}` : "",
    reveal.explanation?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" ");
};

/** After a myth is answered: the reality, then the explanation. */
export const buildMythFeedbackSpeech = (
  reality?: string | null,
  explanation?: string | null,
): string =>
  [reality ? `The reality is: ${reality.trim()}` : "", explanation?.trim() ?? ""]
    .filter(Boolean)
    .join(" ");

/* ------------------------------------------------------------------ */
/* Read Aloud controller                                               */
/* ------------------------------------------------------------------ */

/**
 * Visible state model — identical on every surface.
 *
 * idle         nothing playing; button offers "Read aloud"
 * loading      request accepted, engine has not started yet
 * speaking     audio is playing; button offers "Stop"
 * error        engine reported a failure (voice data missing, interrupted by OS…)
 * unavailable  no usable speech engine on this device
 *
 * `error` / `unavailable` are transient: they auto-reset to `idle` so a
 * control can never be stranded. Tapping again retries.
 */
export type ReadAloudStatus =
  | "idle"
  | "loading"
  | "speaking"
  | "error"
  | "unavailable";

/** Why the most recent utterance ended — for diagnostics and tests. */
export type ReadAloudEndReason =
  | "none"
  | "completed"
  | "stopped"
  | "superseded"
  | "screen-exit"
  | "route-change"
  | "background"
  | "disabled"
  | "answered"
  | "error";

export interface ReadAloudSnapshot {
  status: ReadAloudStatus;
  /** Control that currently owns the speech channel (null when idle). */
  ownerId: string | null;
  requestId: number;
  lastEndReason: ReadAloudEndReason;
}

export interface SpeakRequest {
  ownerId: string;
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
}

export interface EngineSpeakCallbacks {
  onStart: () => void;
  onDone: () => void;
  onStopped: () => void;
  onError: (error: unknown) => void;
}

export interface ReadAloudEngine {
  /** Start speaking. Throwing synchronously means "no engine". */
  speak: (
    text: string,
    options: { language?: string; rate?: number; pitch?: number },
    callbacks: EngineSpeakCallbacks,
  ) => void;
  /** Stop whatever is speaking. Must never throw / reject. */
  stop: () => Promise<void> | void;
  /** Optional liveness probe used by the watchdog. */
  isSpeaking?: () => Promise<boolean>;
}

export interface TimerApi {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface ReadAloudOptions {
  engine: ReadAloudEngine;
  timers?: TimerApi;
  /** How long `loading` may last before it is declared an error. */
  startTimeoutMs?: number;
  /** How long `error`/`unavailable` stay visible before returning to idle. */
  errorResetMs?: number;
  /** Interval of the liveness probe while speaking. */
  watchdogMs?: number;
  /** Default speech rate (kept identical on every surface). */
  defaultRate?: number;
  defaultLanguage?: string;
}

export interface ReadAloudController {
  getSnapshot: () => ReadAloudSnapshot;
  subscribe: (listener: () => void) => () => void;
  speak: (request: SpeakRequest) => Promise<void>;
  /** Same call twice stops: play when idle, stop when this owner is active. */
  toggle: (request: SpeakRequest) => Promise<void>;
  /** Stop. With `ownerId`, only if that control owns the channel. */
  stop: (reason?: ReadAloudEndReason, ownerId?: string) => void;
  setEnabled: (enabled: boolean) => void;
  isActive: (ownerId: string) => boolean;
  dispose: () => void;
}

const defaultTimers: TimerApi = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export const createReadAloudController = (
  options: ReadAloudOptions,
): ReadAloudController => {
  const {
    engine,
    timers = defaultTimers,
    startTimeoutMs = 6000,
    errorResetMs = 2500,
    watchdogMs = 2000,
    defaultRate = 0.9,
    defaultLanguage = "en",
  } = options;

  let snapshot: ReadAloudSnapshot = {
    status: "idle",
    ownerId: null,
    requestId: 0,
    lastEndReason: "none",
  };
  let enabled = true;
  let disposed = false;
  let requestCounter = 0;
  let startTimer: unknown = null;
  let resetTimer: unknown = null;
  let watchdogTimer: unknown = null;
  let missedProbes = 0;
  const listeners = new Set<() => void>();

  const emit = () => {
    // Copy: a listener may unsubscribe while we iterate.
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch {
        // A broken subscriber must never break speech state.
      }
    }
  };

  const set = (next: Partial<ReadAloudSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
  };

  const clearTimers = () => {
    if (startTimer !== null) timers.clearTimeout(startTimer);
    if (resetTimer !== null) timers.clearTimeout(resetTimer);
    if (watchdogTimer !== null) timers.clearTimeout(watchdogTimer);
    startTimer = resetTimer = watchdogTimer = null;
    missedProbes = 0;
  };

  const safeStopEngine = async () => {
    try {
      await engine.stop();
    } catch {
      // No engine / already stopped / activity gone — safe to ignore.
    }
  };

  const finish = (requestId: number, reason: ReadAloudEndReason) => {
    // A callback from an utterance we already replaced must be a no-op,
    // and so must a second terminal callback (onDone then onStopped).
    if (requestId !== snapshot.requestId || snapshot.status === "idle") return;
    clearTimers();
    set({ status: "idle", ownerId: null, lastEndReason: reason });
  };

  const fail = (
    requestId: number,
    status: "error" | "unavailable",
  ) => {
    if (requestId !== snapshot.requestId || snapshot.status === "idle") return;
    clearTimers();
    set({ status, lastEndReason: "error" });
    // Never strand a control in a failed state.
    resetTimer = timers.setTimeout(() => {
      resetTimer = null;
      if (requestId === snapshot.requestId && snapshot.status === status) {
        set({ status: "idle", ownerId: null });
      }
    }, errorResetMs);
  };

  const scheduleWatchdog = (requestId: number) => {
    if (!engine.isSpeaking) return;
    watchdogTimer = timers.setTimeout(async () => {
      watchdogTimer = null;
      if (requestId !== snapshot.requestId || snapshot.status !== "speaking") {
        return;
      }
      let speaking = true;
      try {
        speaking = await engine.isSpeaking!();
      } catch {
        speaking = true; // probe failure is not evidence of silence
      }
      if (requestId !== snapshot.requestId || snapshot.status !== "speaking") {
        return;
      }
      missedProbes = speaking ? 0 : missedProbes + 1;
      if (missedProbes >= 2) {
        // Engine went quiet without telling us (OEM TTS bug, audio focus loss).
        finish(requestId, "completed");
        return;
      }
      scheduleWatchdog(requestId);
    }, watchdogMs);
  };

  const stop = (
    reason: ReadAloudEndReason = "stopped",
    ownerId?: string,
  ): void => {
    if (disposed) return;
    if (ownerId !== undefined && snapshot.ownerId !== ownerId) return;
    if (snapshot.status === "idle" && snapshot.ownerId === null) return;
    // Invalidate in-flight callbacks first, then stop the engine.
    requestCounter += 1;
    clearTimers();
    set({
      status: "idle",
      ownerId: null,
      requestId: requestCounter,
      lastEndReason: reason,
    });
    void safeStopEngine();
  };

  const speak = async (request: SpeakRequest): Promise<void> => {
    if (disposed) return;
    const text = sanitizeSpeechText(request.text);

    if (!enabled || !text) {
      stop(enabled ? "stopped" : "disabled");
      return;
    }

    const previousOwner = snapshot.ownerId;
    requestCounter += 1;
    const requestId = requestCounter;
    clearTimers();

    // One utterance at a time: the new request claims the channel
    // immediately (so two controls can never both read "playing").
    set({
      status: "loading",
      ownerId: request.ownerId,
      requestId,
      lastEndReason:
        previousOwner !== null && previousOwner !== request.ownerId
          ? "superseded"
          : snapshot.lastEndReason,
    });

    // Make sure the previous utterance is really gone before starting.
    await safeStopEngine();
    if (disposed || requestId !== snapshot.requestId) return;

    startTimer = timers.setTimeout(() => {
      startTimer = null;
      if (requestId === snapshot.requestId && snapshot.status === "loading") {
        void safeStopEngine();
        fail(requestId, "error");
      }
    }, startTimeoutMs);

    const markSpeaking = () => {
      if (requestId !== snapshot.requestId) return;
      if (snapshot.status !== "loading") return;
      if (startTimer !== null) {
        timers.clearTimeout(startTimer);
        startTimer = null;
      }
      set({ status: "speaking" });
      scheduleWatchdog(requestId);
    };

    try {
      engine.speak(
        text,
        {
          language: request.language ?? defaultLanguage,
          rate: request.rate ?? defaultRate,
          pitch: request.pitch,
        },
        {
          onStart: markSpeaking,
          onDone: () => finish(requestId, "completed"),
          // Our own stop() bumps requestId first, so a stale onStopped is
          // ignored; an unexpected one (OS audio focus loss) ends cleanly.
          onStopped: () => finish(requestId, "stopped"),
          onError: () => fail(requestId, "error"),
        },
      );
    } catch {
      fail(requestId, "unavailable");
    }
  };

  const toggle = async (request: SpeakRequest): Promise<void> => {
    if (
      snapshot.ownerId === request.ownerId &&
      (snapshot.status === "loading" || snapshot.status === "speaking")
    ) {
      stop("stopped", request.ownerId);
      return;
    }
    await speak(request);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    speak,
    toggle,
    stop,
    setEnabled: (value) => {
      enabled = value;
      if (!value) stop("disabled");
    },
    isActive: (ownerId) =>
      snapshot.ownerId === ownerId &&
      (snapshot.status === "loading" || snapshot.status === "speaking"),
    dispose: () => {
      if (disposed) return;
      stop("screen-exit");
      disposed = true;
      clearTimers();
      listeners.clear();
    },
  };
};

/* ------------------------------------------------------------------ */
/* View model for the shared Read Aloud button                         */
/* ------------------------------------------------------------------ */

export interface ReadAloudButtonModel {
  icon: "VolumeHigh" | "VolumeSlash" | "Warning2";
  label: string;
  /** Short visible caption for pill-style buttons. */
  caption: string;
  busy: boolean;
  active: boolean;
  failed: boolean;
}

/**
 * Map status + what the button reads to icon/label/caption.
 * `subject` is a lowercase noun phrase: "question", "explanation", "message".
 */
export const getReadAloudButtonModel = (
  status: ReadAloudStatus,
  subject: string,
): ReadAloudButtonModel => {
  switch (status) {
    case "loading":
      return {
        icon: "VolumeHigh",
        label: `Starting to read ${subject}. Tap to cancel`,
        caption: "Starting…",
        busy: true,
        active: true,
        failed: false,
      };
    case "speaking":
      return {
        icon: "VolumeSlash",
        label: `Stop reading ${subject}`,
        caption: "Stop",
        busy: false,
        active: true,
        failed: false,
      };
    case "error":
    case "unavailable":
      return {
        icon: "Warning2",
        label:
          status === "unavailable"
            ? `Read aloud is unavailable on this device. Tap to try again`
            : `Could not read ${subject}. Tap to try again`,
        caption: "Retry",
        busy: false,
        active: false,
        failed: true,
      };
    default:
      return {
        icon: "VolumeHigh",
        label: `Read ${subject} aloud`,
        caption: "Read Aloud",
        busy: false,
        active: false,
        failed: false,
      };
  }
};
