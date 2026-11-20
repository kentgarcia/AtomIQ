/**
 * "Here is how AtomIQ gets you there": the pitch, rewritten from why the learner came (the order and
 * some wording of the four rows follow `rowsFor`). Not a tour, and no cards: each row is one of the navbar's pictures
 * and a single sentence whose opening phrase is bold, under Shrodi's one line. No claims beyond what the
 * app does today.
 */

import { Image, View } from "react-native";
import Animated, { type SharedValue } from "react-native-reanimated";

import { PAGE_FX, popIn, riseIn } from "@/components/motion/cascade-fx";
import { useCascadeSfx } from "@/components/motion/use-cascade-sfx";
import { Text } from "@/components/ui/text";

import { ShrodiSays } from "@/components/onboarding/ShrodiSays";
import { rowsFor, type HowRow, type Reason } from "@/services/onboarding-core";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

/** The navbar's own pictures, so the pitch shows the tabs the learner is about to use. */
const TAB_PICTURES: Record<HowRow["tab"], number> = {
  map: require("@/assets/images/icons/map.png"),
  games: require("@/assets/images/icons/games.png"),
  quests: require("@/assets/images/icons/chest.png"),
  phone: require("@/assets/images/icons/phone.png"),
};

const PICTURE = 52;

const useStyles = createStyles((theme) => ({
  title: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], lineHeight: 34, color: theme.colors.text },
  body: { gap: spacing.xl },
  // No cards: a picture and a sentence, one under the other
  list: { gap: spacing["2xl"], paddingTop: spacing.sm, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  sentence: { ...fontFaces.medium, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.text },
  bold: { ...fontFaces.heavy },
}));

export function HowPage({ reason, direction }: { reason: Reason | null; direction: SharedValue<number> }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  // Sound: Shrodi's pop, then a pop for each picture as it lands
  useCascadeSfx(direction, "reward.pop", PAGE_FX.fox, 0, 1);
  useCascadeSfx(direction, "reward.pop", PAGE_FX.rows + 60, PAGE_FX.rowStep, 4);
  return (
    <View style={styles.body}>
      <Animated.View entering={riseIn(direction, PAGE_FX.title)}>
        <Text accessibilityRole="header" style={styles.title}>
          Here is how AtomIQ gets you there
        </Text>
      </Animated.View>
      <ShrodiSays text="Four things make it stick." mood="happy" arrive={{ direction, at: PAGE_FX.fox }} />
      <View style={styles.list}>
        {rowsFor(reason).map((row, i) => (
          <View key={row.id} style={styles.row}>
            <Animated.View entering={popIn(direction, PAGE_FX.rows + i * PAGE_FX.rowStep)}>
              <Image source={TAB_PICTURES[row.tab]} style={{ width: PICTURE, height: PICTURE }} resizeMode="contain" accessible={false} />
            </Animated.View>
            <Animated.View entering={riseIn(direction, PAGE_FX.rows + i * PAGE_FX.rowStep + PAGE_FX.rowSentenceLag)} style={{ flex: 1 }}>
              <Text style={styles.sentence}>
                <Text style={styles.bold}>{row.title}</Text> {row.body}
              </Text>
            </Animated.View>
          </View>
        ))}
      </View>
    </View>
  );
}
