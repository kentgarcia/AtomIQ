/**
 * Idle motion of a lesson figure (orbiting electrons, floating and pulsing shapes), framework-free so `test:figure-motion` can run it.
 *
 * Why it costs what it costs: every moving shape is two native Svg views (the face and its lip) whose props are rewritten each time
 * the figure's clock changes. A lecture page also keeps every earlier figure on it, so a long page used to run them all. Three rules
 * keep that small (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.4):
 *   1. the clock ticks in steps (30 a second on a fast phone, 15 on a mid one, none on a slow one: frame 0 is a good drawing);
 *      these motions are slow (periods of 3 to 15 s, a shift of a dp or two), so steps do not read as stutter;
 *   2. the clock is held, not reset, when it stops, so a paused figure stays where it is instead of snapping to frame 0;
 *   3. on a page only the newest moving figure plays; the ones above it hold their pose.
 */

/** The clock's step, ms, for the device budget's `idleFps`; 0 means no idle motion at all (hold frame 0). */
export const figureQuantumMs = (idleFps: 60 | 30 | 0): number => (idleFps === 60 ? 1000 / 30 : idleFps === 30 ? 1000 / 15 : 0);

/**
 * One frame of the clock: `dt` ms has passed. Returns `[time, carry]`: the time moves on only in whole steps of `quantum` (so it
 * reads the same between steps and nothing downstream has anything new to draw), and the part of a step not yet reached is carried.
 */
export function advanceFigureClock(time: number, carry: number, dt: number, quantum: number, loop: number): [number, number] {
  "worklet";
  const total = carry + (dt > 0 ? dt : 0);
  if (quantum <= 0 || total < quantum) return [time, total];
  const steps = Math.floor(total / quantum);
  return [(time + steps * quantum) % loop, total - steps * quantum];
}

/**
 * Which figures may play. Figures that can move join when they mount; the one that joined last is the newest and the only one that
 * plays, and when it leaves the one before it plays again. A figure that is not part of it is not held back.
 */
export interface FigureRegistry {
  /** Join; returns the function that leaves. */
  join(token: object): () => void;
  isNewest(token: object): boolean;
  subscribe(listener: () => void): () => void;
}

export function createFigureRegistry(): FigureRegistry {
  const stack: object[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    join(token) {
      stack.push(token);
      notify();
      return () => {
        const i = stack.lastIndexOf(token);
        if (i !== -1) stack.splice(i, 1);
        notify();
      };
    },
    isNewest: (token) => stack.length > 0 && stack[stack.length - 1] === token,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
