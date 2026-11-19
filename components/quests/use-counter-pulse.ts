/**
 * The number and the pulse of a header counter (XP, diamonds) while coins fly to it. The number holds
 * the old value, takes a share of the gain as each coin lands and ends on the real value
 * (`counter-core.ts`, the state machine); the counter gives a small pulse (scale 1 to 1.12 to 1 in 220 ms)
 * each time it goes up, at most once per `MIN_PULSE_GAP`. With reduced motion there are no flights, so the
 * number simply follows the value and does not pulse.
 *
 *   const { shown, pulseStyle } = useCounterPulse("xp", total_xp);
 *   <Animated.View style={pulseStyle}> ... {shown} ... </Animated.View>
 */

import { useEffect, useRef, useState } from "react";
import { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { PULSE, pulseScale } from "@/components/motion/reveal-core";
import { subscribeClaimFlights, subscribeClaimLandings, type FlightKind } from "@/components/quests/claim-fx-bus";
import { counterStep, HOLD_MS, initialCounter, MIN_PULSE_GAP, type CounterEvent } from "@/components/quests/counter-core";
import { flightTotal } from "@/components/quests/claim-fx-core";

export function useCounterPulse(kind: FlightKind, value: number) {
  const reduced = useReducedMotion();
  const [state, setState] = useState(() => initialCounter(value));

  // The real number changed: work it out while rendering, so a gain is held from its very first frame
  if (value !== state.value) setState(counterStep(state, { type: "value", value }));

  // The flights of this kind of coin
  useEffect(() => {
    const send = (e: CounterEvent) => setState((s) => counterStep(s, e));
    let guard: ReturnType<typeof setTimeout> | undefined;
    const stopFlights = subscribeClaimFlights((flight) => {
      if (flight.kind !== kind) return;
      send({ type: "start", count: flight.count });
      // If the coins never play (the layer is not there), the counter must not hold its number for ever
      clearTimeout(guard);
      guard = setTimeout(() => send({ type: "end" }), flightTotal(flight.count) + 2000);
    });
    const stopLandings = subscribeClaimLandings((landing) => {
      if (landing.kind === kind) send({ type: "landing" });
    });
    return () => {
      stopFlights();
      stopLandings();
      clearTimeout(guard);
    };
  }, [kind]);

  // A gain that no flight takes is shown after a short wait
  const holding = state.holding;
  useEffect(() => {
    if (!holding) return;
    const id = setTimeout(() => setState((s) => counterStep(s, { type: "settle" })), HOLD_MS);
    return () => clearTimeout(id);
  }, [holding]);

  // The pulse: each time the number goes up
  const pulse = useSharedValue<number>(PULSE.ms);
  const lastShown = useRef(state.shown);
  const lastPulse = useRef(0);
  useEffect(() => {
    const up = state.shown > lastShown.current;
    lastShown.current = state.shown;
    if (!up || reduced) return;
    const now = Date.now();
    if (now - lastPulse.current < MIN_PULSE_GAP) return;
    lastPulse.current = now;
    cancelAnimation(pulse);
    pulse.set(0);
    pulse.set(withTiming(PULSE.ms, { duration: PULSE.ms, easing: Easing.linear }));
  }, [state.shown, reduced, pulse]);
  useEffect(() => () => cancelAnimation(pulse), [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale(pulse.get()) }] }));
  return { shown: state.shown, pulseStyle };
}
