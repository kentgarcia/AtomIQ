/**
 * A teacher's line in a 3D speech bubble (a `Card` with a rounded-triangle tail), with Read Aloud.
 * The words are real text with an accessibility label naming the speaker; the character picture is
 * decorative. Hidden when the "Teacher lines" setting is off.
 */

import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Svg, { Path } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { rtri } from "./npc-art";
import { useTeacherLines } from "./teacher-lines";

const useStyles = createStyles((theme) => ({
  wrap: { alignItems: "center", alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  text: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes["2xl"], lineHeight: 24, color: theme.colors.text },
  name: { ...fontFaces.bold, fontSize: fontSizes.md, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.primaryLight },
}));

const TAIL_W = 30;
const TAIL_H = 16;
const TRI = rtri([0, 0], [TAIL_W, 0], [TAIL_W / 2, TAIL_H], 3);

/** The tail under a bubble, pointing down at the speaker: border colour, then the face inset over it. */
export function BubbleTail({ align = "center" }: { align?: "center" | "start" }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignSelf: align === "center" ? "center" : "flex-start", marginLeft: align === "start" ? spacing.xl : 0, marginTop: -(controls.lip + 1), height: TAIL_H, width: TAIL_W }} importantForAccessibility="no-hide-descendants">
      <Svg width={TAIL_W} height={TAIL_H} viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}>
        <Path d={TRI} fill={theme.colors.borderStrong} />
        <Path d={rtri([4, 0], [TAIL_W - 4, 0], [TAIL_W / 2, TAIL_H - 6], 2)} fill={theme.colors.surface} />
      </Svg>
    </View>
  );
}

const SIDE_W = 16;
const SIDE_H = 30;

/**
 * Side tail geometry: an outline as thick as the card's border (`controls.border`) in the card's own
 * border colour, with the face colour inset by exactly that thickness, so the tail reads as the
 * bubble's border carried out to a point. The insets are the border width measured across the
 * slanted edges (not along the axes), so the outline stays even all the way round.
 */
const HALF = SIDE_H / 2;
const SLANT = Math.atan2(HALF, SIDE_W);
const INSET_Y = controls.border / Math.cos(SLANT);
const INSET_X = controls.border / Math.sin(SLANT);

function SideTailShape({ side }: { side: "left" | "right" }) {
  const { theme } = useTheme();
  const flip = (x: number) => (side === "left" ? SIDE_W - x : x);
  // Drawn pointing right (a tail on the right edge); mirrored for the left edge.
  const outer = rtri([flip(0), 0], [flip(0), SIDE_H], [flip(SIDE_W), HALF], 3);
  const inner = rtri([flip(0), INSET_Y], [flip(0), SIDE_H - INSET_Y], [flip(SIDE_W - INSET_X), HALF], 1.5);
  const edge = side === "left" ? { left: -(SIDE_W - controls.border - 1) } : { right: -(SIDE_W - controls.border - 1) };
  return (
    <View style={{ position: "absolute", ...edge, top: "50%", marginTop: -SIDE_H / 2 - controls.lip / 2, width: SIDE_W, height: SIDE_H }} importantForAccessibility="no-hide-descendants">
      <Svg width={SIDE_W} height={SIDE_H} viewBox={`0 0 ${SIDE_W} ${SIDE_H}`}>
        <Path d={outer} fill={theme.colors.border} />
        <Path d={inner} fill={theme.colors.surface} />
      </Svg>
    </View>
  );
}

/** A tail on a bubble's right edge pointing at a speaker beside it. Place it inside a relative wrapper. */
export function SideTail() {
  return <SideTailShape side="right" />;
}

/** The same tail on a bubble's left edge, pointing at a speaker on the left. Place it inside a relative wrapper. */
export function LeftTail() {
  return <SideTailShape side="left" />;
}

export function SpeechBubble({ name, text, ownerId, hidden = false, children }: { name: string; text: string; ownerId: string; /** No line yet: draw only the children. */ hidden?: boolean; children?: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const enabled = useTeacherLines();
  if (!enabled || hidden) return <View style={styles.wrap}>{children}</View>;
  return (
    <View style={styles.wrap}>
      <Card padding={spacing.md} gap={spacing.xs} style={{ alignSelf: "stretch" }}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.row}>
          <Text style={styles.text} accessibilityLabel={`${name} says: ${text}`}>
            {text}
          </Text>
          <ReadAloudButton ownerId={ownerId} subject={`${name}'s line`} text={`${name} says. ${text}`} size={36} />
        </View>
      </Card>
      <BubbleTail />
      {children}
    </View>
  );
}
