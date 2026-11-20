/**
 * The SFX lab's player (development only). It plays a list of timed steps on one clock, with no
 * gates, throttling or pools: the lab is for hearing a sound, so the Sound Effects switch, the route
 * policy and a stinger's priority do not apply here.
 *
 * Every play makes its own native players, waits until they have all loaded so the steps keep their
 * timing, and removes them when the sequence ends. `check:sfx` allows `expo-audio` in this file.
 */
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

export interface PlayStep {
  source: number;
  /** 0 to 1. */
  volume: number;
  rate: number;
  /** ms from the start. */
  at: number;
  /** Cut off after this many ms. */
  stopAfter?: number;
  /** Length of the file, ms: when the sequence is over. */
  ms: number;
}

export interface PlayHandle {
  stop: () => void;
}

const LOAD_TIMEOUT_MS = 1500;

const whenLoaded = (player: AudioPlayer): Promise<void> =>
  new Promise((resolve) => {
    try {
      if (player.isLoaded) return resolve();
      const timer = setTimeout(done, LOAD_TIMEOUT_MS);
      const sub = player.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded) done();
      });
      function done() {
        clearTimeout(timer);
        try {
          sub.remove();
        } catch {
          // The player may already be gone.
        }
        resolve();
      }
    } catch {
      resolve();
    }
  });

/** Play `steps` now. `onEnd` is called once, when the last one finishes or `stop()` is called. */
export const playSteps = (steps: readonly PlayStep[], onEnd?: () => void): PlayHandle => {
  const players: AudioPlayer[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;
  let ended = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    timers.forEach(clearTimeout);
    for (const p of players) {
      try {
        p.remove();
      } catch {
        // Already removed.
      }
    }
    onEnd?.();
  };

  void (async () => {
    try {
      for (const step of steps) players.push(createAudioPlayer(step.source));
      await Promise.all(players.map(whenLoaded));
      if (stopped) return;
      let last = 0;
      steps.forEach((step, i) => {
        const player = players[i];
        const length = Math.min(step.stopAfter ?? Infinity, step.ms / Math.max(step.rate, 0.1));
        last = Math.max(last, step.at + length);
        timers.push(
          setTimeout(() => {
            try {
              player.volume = Math.min(1, Math.max(0, step.volume));
              // A higher rate is a higher pitch only with pitch correction off (docs/SFX_SPEC.md §7.5).
              player.shouldCorrectPitch = step.rate === 1;
              player.setPlaybackRate(step.rate);
              player.play();
            } catch (error) {
              console.warn("SFX lab: could not play a step:", error);
            }
          }, step.at),
        );
        if (step.stopAfter !== undefined) {
          timers.push(
            setTimeout(() => {
              try {
                player.pause();
              } catch {
                // Already gone.
              }
            }, step.at + step.stopAfter),
          );
        }
      });
      timers.push(setTimeout(finish, last + 150));
    } catch (error) {
      console.warn("SFX lab: could not start:", error);
      finish();
    }
  })();

  return {
    stop: () => {
      stopped = true;
      finish();
    },
  };
};
