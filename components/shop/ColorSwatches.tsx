/**
 * The colour column of the shop: a vertical strip of blob-shaped swatches down the left edge of the stage,
 * under the back button, shown while an item that can be coloured is tried on (a hair style: its hair colour).
 * The picked one wears a ring and a tick; picking pops it. Colours are only tried on the avatar, none is sold.
 * When the column runs past its room it scrolls, and a small round chevron says so: down while more is below,
 * up once it has been scrolled (the rules are the lesson page's, `scroll-cue-core.ts`); a tap scrolls a step.
 */

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { PopWhen } from "@/components/motion/PopOnce";
import { SCROLL_CUE, moreBelow, scrollTarget, type ScrollMetrics } from "@/components/lesson/scroll-cue-core";
import { settle } from "@/components/motion/settle";
import { Icon } from "@/components/ui/icon";
import { playSfx } from "@/services/sfx";
import { createStyles, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import type { ColorOption } from "./shop-core";

/** A soft blob with a shallow waist, two lobes of nearly one width, drawn in a 48 box. */
const BLOB = "M24 4C35 4 43 9 43 16C43 21 41 24 39.5 25C43 27 45 31 45 36C45 42 38 45 24 45C10 45 3 42 3 36C3 31 5 27 8.5 25C7 24 5 21 5 16C5 9 13 4 24 4Z";
const SIZE = 42;
const GAP = 4;
const CHIP = 28;

const useStyles = createStyles((theme) => ({
  column: { position: "absolute" },
  list: { gap: GAP, alignItems: "center", paddingVertical: 2 },
  chip: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  chipFace: { width: CHIP, height: CHIP, borderRadius: CHIP / 2, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card, borderWidth: controls.border, borderColor: theme.colors.border, borderBottomWidth: controls.lip, borderBottomColor: theme.colors.borderStrong },
  badge: { position: "absolute", top: -2, right: -4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card },
}));

const Swatch = memo(function Swatch({ option, selected, onPick }: { option: ColorOption; selected: boolean; onPick: (id: string) => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <PopWhen trigger={selected} active={selected} intensity={0.7} sparkleColor={option.color}>
      <Pressable onPress={() => onPick(option.id)} hitSlop={2} accessibilityRole="radio" accessibilityLabel={`${option.name} colour`} accessibilityState={{ selected }}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
          {selected ? <Path d={BLOB} fill={theme.colors.primary} stroke={theme.colors.primary} strokeWidth={7} strokeLinejoin="round" /> : null}
          <Path d={BLOB} fill={option.color} />
        </Svg>
        {selected ? (
          <View style={styles.badge}>
            <Icon name="TickCircle" size={20} color={theme.colors.primary} variant="Bold" />
          </View>
        ) : null}
      </Pressable>
    </PopWhen>
  );
});

/** The round chevron that says the column scrolls: `down` bobs gently (not with reduced motion), `up` sits still. */
function Chip({ dir, onPress, offset }: { dir: "up" | "down"; onPress: () => void; offset: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (dir === "up" || reduced) return;
    const half = SCROLL_CUE.bobMs / 2;
    bob.set(withRepeat(withSequence(withTiming(2, { duration: half, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: half, easing: Easing.inOut(Easing.quad) })), -1, false));
    return () => {
      cancelAnimation(bob);
      bob.set(0);
    };
  }, [dir, reduced, bob]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));
  return (
    <Animated.View entering={FadeIn.duration(SCROLL_CUE.fadeMs)} exiting={FadeOut.duration(SCROLL_CUE.fadeMs)} style={[styles.chip, dir === "up" ? { top: offset } : { bottom: offset }]} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={dir === "down" ? "More colours below" : "Back to the first colours"}>
        <Animated.View style={[styles.chipFace, move]}>
          <Icon name={dir === "down" ? "ArrowDown2" : "ArrowUp2"} size={16} color={theme.colors.text} variant="Bold" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const ColorSwatches = memo(function ColorSwatches({
  options,
  value,
  onChange,
  top,
  left,
  maxHeight,
}: {
  options: readonly ColorOption[];
  /** The id of the colour on the avatar now. */
  value: string;
  onChange: (id: string) => void;
  /** Where the column starts, under the back button. */
  top: number;
  left: number;
  /** The room down to the panel: past it the column scrolls. */
  maxHeight: number;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const pick = useCallback(
    (id: string) => {
      void playSfx("shop.swatch");
      onChange(id);
    },
    [onChange],
  );

  // Where the column is scrolled to, to know whether there is more below (and whether it has moved off the top)
  const scroller = useRef<ScrollViewInstance>(null);
  const metrics = useRef<ScrollMetrics>({ contentHeight: 0, viewHeight: 0, offsetY: 0 });
  const [cue, setCue] = useState({ below: false, above: false });
  const refresh = useCallback(() => {
    const m = metrics.current;
    const below = moreBelow(m);
    const above = m.viewHeight > 0 && m.offsetY > SCROLL_CUE.minHidden;
    setCue((c) => (c.below === below && c.above === above ? c : { below, above }));
  }, []);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      metrics.current.offsetY = e.nativeEvent.contentOffset.y;
      refresh();
    },
    [refresh],
  );
  const onSize = useCallback(
    (_w: number, h: number) => {
      metrics.current.contentHeight = h;
      refresh();
    },
    [refresh],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      metrics.current.viewHeight = e.nativeEvent.layout.height;
      refresh();
    },
    [refresh],
  );
  const scrollOn = useCallback(() => scroller.current?.scrollTo({ y: scrollTarget(metrics.current), animated: true }), []);
  const scrollBack = useCallback(() => scroller.current?.scrollTo({ y: 0, animated: true }), []);
  return (
    <Animated.View entering={settle(0)} style={[styles.column, { top, left, maxHeight, width: SIZE + 8 }]} accessibilityRole="radiogroup" accessibilityLabel="Colour">
      <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} bounces={false} scrollEventThrottle={16} onScroll={onScroll} onContentSizeChange={onSize} onLayout={onLayout}>
        {options.map((o) => (
          <Swatch key={o.id} option={o} selected={o.id === value} onPick={pick} />
        ))}
      </ScrollView>
      {cue.above ? <Chip dir="up" onPress={scrollBack} offset={-6} /> : null}
      {cue.below ? <Chip dir="down" onPress={scrollOn} offset={-6} /> : null}
    </Animated.View>
  );
});

export const SWATCH_COLUMN = { size: SIZE, gap: GAP } as const;
