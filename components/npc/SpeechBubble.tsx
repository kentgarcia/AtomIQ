/**
 * A teacher's line in a 3D speech bubble (a `Card` with a rounded-triangle tail), with Read Aloud.
 * The words are real text with an accessibility label naming the speaker; the character picture is
 * decorative. Hidden when the "Teacher lines" setting is off.
 */

import { useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Svg, { Path } from "react-native-svg";

import { Card } from "@/components/ui/card";
import { ReadAloudButton } from "@/components/ui/read-aloud-button";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";

import { rtri } from "./npc-art";
import { sideTailGeometry, tailHeightFor } from "./speech-tail-core";
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

/** The tail under a bubble, pointing down at the speaker: border colour, then the face inset over it. It starts above the card's bottom border (lip plus border), so it opens the whole border, not all but a hairline of it. */
export function BubbleTail({ align = "center" }: { align?: "center" | "start" }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignSelf: align === "center" ? "center" : "flex-start", marginLeft: align === "start" ? spacing.xl : 0, marginTop: -(controls.lip + controls.border), height: TAIL_H, width: TAIL_W }} importantForAccessibility="no-hide-descendants">
      <Svg width={TAIL_W} height={TAIL_H} viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}>
        <Path d={TRI} fill={theme.colors.borderStrong} />
        <Path d={rtri([4, 0], [TAIL_W - 4, 0], [TAIL_W / 2, TAIL_H - 6], 2)} fill={theme.colors.surface} />
      </Svg>
    </View>
  );
}

/**
 * Side tail: the bubble's border carried out to a rounded point (geometry and the rules that keep it
 * clean are in `speech-tail-core.ts`). It measures the card it sits on and shrinks to fit the straight
 * part of the card's edge, so a one-line bubble gets a smaller tail instead of one that pokes out over
 * the curved corner and into the bottom border.
 */
function SideTailShape({ side }: { side: "left" | "right" }) {
  const { theme } = useTheme();
  const [faceHeight, setFaceHeight] = useState<number | null>(null);
  const g = useMemo(() => sideTailGeometry(faceHeight === null ? 26 : tailHeightFor(faceHeight, radius.xl), controls.border), [faceHeight]);
  // The overlay spans the card's face (everything above the lip) and is only there to be measured and to centre the tail on it
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, bottom: controls.lip, left: 0, right: 0 }}
      onLayout={(e) => setFaceHeight(Math.round(e.nativeEvent.layout.height))}
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          position: "absolute",
          top: "50%",
          marginTop: -g.h / 2,
          width: g.drawW,
          height: g.h,
          // The base meets the border's inner edge; the right-hand tail is the left one mirrored
          ...(side === "left" ? { left: -g.protrude } : { right: -g.protrude, transform: [{ scaleX: -1 }] }),
        }}
      >
        <Svg width={g.drawW} height={g.h} viewBox={`0 0 ${g.drawW} ${g.h}`}>
          <Path d={g.outer} fill={theme.colors.border} />
          <Path d={g.inner} fill={theme.colors.surface} />
        </Svg>
      </View>
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
