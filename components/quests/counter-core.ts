/**
 * What a header counter (XP, diamonds) shows while coins are flying to it, as a pure state machine
 * (no React), unit-tested in `scripts/test-counter-pulse.mjs`; `use-counter-pulse.ts` only feeds it.
 *
 * The real number (`value`) is saved at the moment the first coin lands, or just before the flight is
 * announced (a chest pays, then its diamonds fly). The number the learner SEES (`shown`) must not move
 * before the coins arrive, so it holds the old number and then takes a share of the gain as each coin
 * lands, ending on the real number with the last one (the duolingo-motion-style skill, rule 9):
 *
 *   value (up), no flight   hold: the gain waits `HOLD_MS` for a flight to be announced, then shows at once
 *   start(count)            a flight of `count` coins is on its way; a held gain becomes the flight's
 *   landing                 the next coin lands: `shown` takes its share (`landingShares`)
 *   end                     the flight is over (the last coin landed, or it never played): `shown` = `value`
 *
 * `shown` never passes `value` and never goes down because of a flight. A change that is not a gain
 * (a spend, a reset) shows at once.
 */

/** How long a gain waits for a flight to be announced before it is shown at once. */
export const HOLD_MS = 250;
/** A counter pulses at most this often, ms. */
export const MIN_PULSE_GAP = 100;

/** `delta` split over `count` coins, whole numbers, the earlier coins taking the remainder. Sums to `delta`. */
export function landingShares(delta: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  const total = Math.max(0, Math.floor(delta));
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export interface Flight {
  count: number;
  landed: number;
  /** Known once the gain is known. */
  shares: number[] | null;
}

export interface CounterState {
  shown: number;
  value: number;
  flight: Flight | null;
  /** A gain is waiting for a flight. */
  holding: boolean;
}

export type CounterEvent =
  | { type: "value"; value: number }
  | { type: "start"; count: number }
  | { type: "landing" }
  | { type: "end" }
  | { type: "settle" };

export const initialCounter = (value: number): CounterState => ({ shown: value, value, flight: null, holding: false });

export function counterStep(s: CounterState, e: CounterEvent): CounterState {
  switch (e.type) {
    case "value": {
      if (e.value === s.value) return s;
      // Not a gain: show it at once
      if (e.value <= s.shown) return { ...s, value: e.value, shown: e.value, holding: false };
      const gain = e.value - s.shown;
      if (!s.flight) return { ...s, value: e.value, holding: true };
      if (s.flight.shares) return { ...s, value: e.value }; // more gain in the same flight: the last coin brings the rest
      const shares = landingShares(gain, s.flight.count);
      // Coins that landed before the gain was known pay out now
      const owed = shares.slice(0, s.flight.landed).reduce((a, b) => a + b, 0);
      return { ...s, value: e.value, shown: s.shown + owed, flight: { ...s.flight, shares } };
    }
    case "start": {
      const flight: Flight = { count: Math.max(1, e.count), landed: 0, shares: null };
      if (s.holding && s.value > s.shown) {
        return { ...s, holding: false, flight: { ...flight, shares: landingShares(s.value - s.shown, flight.count) } };
      }
      return { ...s, flight };
    }
    case "landing": {
      const f = s.flight;
      if (!f) return s;
      const landed = f.landed + 1;
      if (landed >= f.count) return { ...s, shown: s.value, flight: null, holding: false };
      const share = f.shares ? f.shares[landed - 1] : 0;
      return { ...s, shown: Math.min(s.value, s.shown + share), flight: { ...f, landed } };
    }
    case "end":
      return { ...s, shown: s.value, flight: null, holding: false };
    case "settle":
      return s.holding && !s.flight ? { ...s, shown: s.value, holding: false } : s;
  }
}
