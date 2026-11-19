/**
 * Lets a screen turn the cascade on for everything under it (`cascade-fx.ts`): it provides the `direction` shared value (1 on,
 * -1 back; never 0, which is the onboarding's "attached to the hello page"). Anything that wants to arrive as a cascade
 * (`CascadeIn`, the teacher and his bubble, the options) reads it, and where there is no provider it simply appears as before,
 * so a card shown elsewhere (a preview, a settings page) is unchanged.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { type SharedValue } from "react-native-reanimated";

import { popIn, riseIn } from "@/components/motion/cascade-fx";

const CascadeContext = createContext<SharedValue<number> | null>(null);

export const CascadeProvider = CascadeContext.Provider;

/** The direction the page is arriving from, or null when this part of the app does not cascade. */
export function useCascadeDirection(): SharedValue<number> | null {
  return useContext(CascadeContext);
}

/** Wraps a block so it arrives `at` ms after the page: fades up and rises (or pops, for a picture). Plain when there is no cascade. */
export function CascadeIn({ at, from = 1, pop = false, style, children }: { at: number; from?: number; pop?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const direction = useCascadeDirection();
  return (
    <Animated.View entering={direction ? (pop ? popIn(direction, at) : riseIn(direction, at, from)) : undefined} style={style}>
      {children}
    </Animated.View>
  );
}
