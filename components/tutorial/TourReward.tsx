/**
 * The tour's closing moment (once in the app's life), with no animation: a dim and, on it, a card (the page's own surface, so the
 * words read in light and dark: theme text colours on the bare scrim were unreadable) holding Shrodi's still picture, "Tour complete!",
 * the diamond with the amount and a button, all simply there. One cue and one haptic play as it appears. `onDone` runs when the
 * learner presses the button, or the moment times out; the layer then sends the diamonds to the counter.
 */

import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

import { TOUR_REWARD_TIMEOUT_MS } from "@/components/celebration/celebration-core";
import { ShrodiStill } from "@/components/mascot/ShrodiStill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { notifySuccess } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const DIAMOND = require("@/assets/images/icons/diamond.png");
const GEM = 64;
const FOX = 132;

const useStyles = createStyles((theme) => ({
  dim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay, justifyContent: "center", paddingHorizontal: spacing.lg },
  title: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 40, letterSpacing: -0.5, color: theme.colors.text, textAlign: "center" },
  prize: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, marginVertical: spacing.xs },
  gem: { width: GEM, height: GEM },
  amount: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 44, color: theme.colors.info },
  line: { ...fontFaces.semibold, fontSize: fontSizes["xl"], lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center", maxWidth: 320 },
  card: { alignSelf: "center", width: "100%", maxWidth: 360 },
  footer: { width: "100%", marginTop: spacing.sm },
}));

export function TourReward({ amount, onDone }: { amount: number; onDone: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);

  useEffect(() => {
    notifySuccess();
    void playSfx("lesson.complete");
    const id = setTimeout(onDone, TOUR_REWARD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <View style={styles.dim}>
      <Card style={styles.card} padding={spacing.xl} faceStyle={{ alignItems: "center", gap: spacing.md }}>
        <ShrodiStill size={FOX} />
        <Text accessibilityRole="header" style={styles.title}>
          Tour complete!
        </Text>
        <View style={styles.prize} accessible accessibilityLabel={`${amount} diamonds`}>
          <Image source={DIAMOND} style={styles.gem} resizeMode="contain" accessible={false} />
          <Text style={styles.amount}>+{amount}</Text>
        </View>
        <Text style={styles.line}>You know your way around now. Here is a thank you from me!</Text>
        <View style={styles.footer}>
          <Button label="Thanks!" onPress={onDone} />
        </View>
      </Card>
    </View>
  );
}
