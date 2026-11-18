/**
 * ScrollCue — the "there is more below" hint on a lesson page: a fade into the page colour along the
 * bottom edge and a small round down-arrow that bobs. Shown by `LessonRun` while the page runs past the
 * screen and the learner is not at its end (`scroll-cue-core.ts`); a tap scrolls on. The fade takes no
 * touches. With reduced motion the arrow does not bob and the cue only fades.
 */

import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { SCROLL_CUE } from "@/components/lesson/scroll-cue-core";
import { Icon } from "@/components/ui/icon";
import { createStyles, useTheme, withAlpha } from "@/theme";
import { controls } from "@/theme/tokens";

const FADE_HEIGHT = 72;
const BUTTON = 44;

const useStyles = createStyles((theme) => ({
  fill: { position: "absolute", left: 0, right: 0, bottom: 0, height: FADE_HEIGHT + BUTTON },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: FADE_HEIGHT },
  buttonWrap: { position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center" },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    borderWidth: controls.border,
    borderColor: theme.colors.border,
    borderBottomWidth: controls.lip,
    borderBottomColor: theme.colors.borderStrong,
  },
}));

export function ScrollCue({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!visible || reduced) return;
    bob.set(withRepeat(withSequence(withTiming(SCROLL_CUE.bob, { duration: SCROLL_CUE.bobMs / 2, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: SCROLL_CUE.bobMs / 2, easing: Easing.inOut(Easing.quad) })), -1, false));
    return () => {
      cancelAnimation(bob);
      bob.set(0);
    };
  }, [visible, reduced, bob]);
  const bobStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() }] }));

  if (!visible) return null;
  const page = theme.colors.background;
  return (
    <Animated.View pointerEvents="box-none" style={styles.fill} entering={FadeIn.duration(SCROLL_CUE.fadeMs)} exiting={FadeOut.duration(SCROLL_CUE.fadeMs)}>
      <LinearGradient pointerEvents="none" colors={[withAlpha(page, 0), page]} style={styles.fade} />
      <View pointerEvents="box-none" style={styles.buttonWrap}>
        <Pressable accessibilityRole="button" accessibilityLabel="Scroll down for more" onPress={onPress} hitSlop={8}>
          <View style={styles.button}>
            <Animated.View style={bobStyle}>
              <Icon name="ArrowDown2" size={22} color={theme.colors.textSecondary} />
            </Animated.View>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
