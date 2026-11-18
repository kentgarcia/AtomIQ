/**
 * A tiny pub/sub between a quest row and the layer that draws the XP coins above the tab bar.
 * The coins must be drawn above the bar (they land on its Profile tab), and the bar sits above
 * every screen, so the row cannot draw them itself: it announces where the claim started and the
 * layer inside the tab bar plays the flight. Framework-free.
 */

/** What the coins are: a quest's XP, or the diamonds of a chest. */
export type FlightKind = "xp" | "diamond";

export interface ClaimFlight {
  id: number;
  /** Middle of the quest bar (or chest) the coins come out of, in window coordinates. */
  origin: { x: number; y: number };
  kind: FlightKind;
  /** How many coins fly. */
  count: number;
}

type Listener = (flight: ClaimFlight) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/** Listen for claims. Returns the unsubscribe function. */
export function subscribeClaimFlights(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Announce a claim that starts now, coming out of `origin` (window coordinates). */
export function emitClaimFlight(origin: { x: number; y: number }, options: { kind?: FlightKind; count?: number } = {}): void {
  const kind = options.kind ?? "xp";
  const flight: ClaimFlight = { id: nextId++, origin, kind, count: options.count ?? (kind === "xp" ? 8 : 5) };
  listeners.forEach((l) => l(flight));
}

/* ------------------------------------------------------------------ */
/* Landing targets                                                      */
/* ------------------------------------------------------------------ */

/** Anything with `measureInWindow`: a View ref. */
export interface MeasurableRef {
  current: { measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => void } | null;
}

const targets: Partial<Record<FlightKind, MeasurableRef>> = {};

/**
 * A screen can say where a kind of coin should land (the XP and diamond counters in the Quests
 * header). While one is registered and on screen the coins land there; otherwise they land on the
 * Profile tab. Returns the function that unregisters it.
 */
export function registerClaimTarget(kind: FlightKind, ref: MeasurableRef): () => void {
  targets[kind] = ref;
  return () => {
    if (targets[kind] === ref) delete targets[kind];
  };
}

/** The registered landing for a kind of coin, if any. */
export const getClaimTarget = (kind: FlightKind): MeasurableRef | undefined => targets[kind];
