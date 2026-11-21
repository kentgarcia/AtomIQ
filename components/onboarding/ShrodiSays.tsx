/**
 * Shrodi, talking: the fox beside a speech bubble, like the lessons' teachers. The words type
 * themselves out with the soft talking blip; when `text` changes the bubble pops in again (scale
 * 0.35 to 1 in 200 ms, ease-out, no overshoot, growing from the side the fox is on) and types the
 * new line. His mood glides (450 ms), it never swaps drawings. A bubble that is simply there on
 * arrival does not pop (the page settling in is its entrance). Reduced motion: no pop, no typing.
 */

import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { ReduceMotion, withTiming, type EntryExitAnimationFunction, type SharedValue } from "react-native-reanimated";

import { TypedTermText } from "@/components/lesson/TypedText";
import { Shrodi, type Mood } from "@/components/mascot/Shrodi";
import { ShrodiStill } from "@/components/mascot/ShrodiStill";
import { LeftTail } from "@/components/npc/SpeechBubble";
import { Card } from "@/components/ui/card";
import { PAGE_FX, bubbleInAt, leadFor, popIn } from "@/components/motion/cascade-fx";
import { playSfx } from "@/services/sfx";
import { EASE_OUT } from "@/theme/motion";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const POP_MS = 200;
const FADE_MS = 40;

/** The bubble arriving: from 0.35 and a little left (where the fox stands) to its place. */
const bubbleIn: EntryExitAnimationFunction = () => {
  "worklet";
  const timing = { duration: POP_MS, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
  return {
    initialValues: { opacity: 0, transform: [{ translateX: -48 }, { scale: 0.35 }] },
    animations: {
      opacity: withTiming(1, { ...timing, duration: FADE_MS }),
      transform: [{ translateX: withTiming(0, timing) }, { scale: withTiming(1, timing) }],
    },
  };
};

const useStyles = createStyles((theme) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bubble: { flex: 1 },
  text: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.text },
}));

/** How long the bubble's pop lasts before its first letter. */
const BUBBLE_POP = 200;

/**
 * `arrive` makes him part of a page's cascade (`cascade-fx.ts`): he pops in `at` ms after the page appears, then his bubble pops
 * and, once it is up, types. Without it he is simply there on arrival, as on the steps that settle in as a whole.
 * His words type with no blips; the bubble's own pop is the only sound (`lesson.bubble`).
 */
export function ShrodiSays({ text, mood = "idle", size = 96, typing = true, still = false, arrive }: { text: string; mood?: Mood; size?: number; typing?: boolean; /** One still picture instead of the moving drawing (onboarding); `mood` is then ignored. */ still?: boolean; arrive?: { direction: SharedValue<number>; at: number } }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  // The line the bubble arrived with is the page's own entrance; any other one pops
  const [arrivedWith] = useState(text);
  const bubbleAt = arrive ? arrive.at + (PAGE_FX.bubble - PAGE_FX.fox) : 0;
  // When the first line's typing begins: after the lead, the fox, the bubble's pop
  const [firstTypeAt] = useState(() => (arrive ? bubbleAt + leadFor(arrive.direction.get()) + BUBBLE_POP : 0));

  useEffect(() => {
    if (text === arrivedWith) {
      if (!arrive) return;
      const id = setTimeout(() => void playSfx("lesson.bubble"), firstTypeAt - BUBBLE_POP);
      return () => clearTimeout(id);
    }
    void playSfx("lesson.bubble");
  }, [text, arrivedWith, arrive, firstTypeAt]);

  const entering = text !== arrivedWith ? bubbleIn : arrive ? bubbleInAt(arrive.direction, bubbleAt) : undefined;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Animated.View entering={arrive ? popIn(arrive.direction, arrive.at) : undefined} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {still ? <ShrodiStill size={size} /> : <Shrodi mood={mood} size={size} />}
      </Animated.View>
      <Animated.View key={text} entering={entering} style={styles.bubble}>
        <Card padding={spacing.lg}>
          <TypedTermText key={text} text={text} style={styles.text} typing={typing} startAt={text === arrivedWith ? firstTypeAt : 0} />
        </Card>
        <LeftTail />
      </Animated.View>
    </View>
  );
}
