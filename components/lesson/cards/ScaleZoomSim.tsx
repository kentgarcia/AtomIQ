/**
 * Scale zoom: step from a familiar size down to an atom. Each stop shows its size and
 * a note; the card is complete once the learner has visited every stop.
 */

import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { ScaleZoomData } from "@/content/curriculum/types";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { TermText, useCardStyles } from "./shared";

const useStyles = createStyles((theme) => ({
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySurface,
  },
  name: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], color: theme.colors.text, textAlign: "center" },
  size: { ...fontFaces.bold, fontSize: fontSizes["3xl"], color: theme.colors.primaryLight, textAlign: "center" },
  note: { ...fontFaces.book, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.text, textAlign: "center" },
  steps: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  dotSeen: { backgroundColor: theme.colors.primarySurface, borderWidth: 2, borderColor: theme.colors.primaryBorder },
  dotNow: { backgroundColor: theme.colors.primary, transform: [{ scale: 1.25 }] },
}));

export function ScaleZoomSim({ data, onComplete }: { data: ScaleZoomData; onComplete: () => void }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<number>(0);
  const stop = data.stops[index];
  const last = data.stops.length - 1;

  const go = (to: number) => {
    const clamped = Math.min(last, Math.max(0, to));
    setIndex(clamped);
    setSeen((s) => Math.max(s, clamped));
    if (clamped === last) onComplete();
  };

  return (
    <View style={card.stack}>
      <Text style={card.sectionLabel}>Zoom in</Text>
      <TermText text={data.task} style={card.prompt} />
      <View accessible accessibilityLiveRegion="polite" accessibilityLabel={`${stop.label}, ${stop.sizeLabel}. ${stop.note}`}>
       <Card tone="soft" gap={spacing.sm} faceStyle={{ alignItems: "center", padding: spacing.md }}>
        {isArtId(stop.art) ? (
          <ObjectArt id={stop.art} size={112} />
        ) : (
          <View style={styles.iconWrap}>
            <Icon name={stop.icon ?? "Atom"} size={44} color={theme.colors.primaryLight} source={`scale-zoom:${stop.id}`} />
          </View>
        )}
        <Text style={styles.name}>{stop.label}</Text>
        <Text style={styles.size}>{stop.sizeLabel}</Text>
        <Text style={styles.note}>{stop.note}</Text>
       </Card>
      </View>
      <View style={styles.steps} accessible={false}>
        {data.stops.map((s, i) => (
          <View key={s.id} style={[styles.dot, i <= seen && styles.dotSeen, i === index && styles.dotNow]} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button label="Zoom out" variant="secondary" fullWidth={false} disabled={index === 0} style={{ flex: 1 }} onPress={() => go(index - 1)} />
        <Button label="Zoom in" fullWidth={false} disabled={index === last} style={{ flex: 1 }} onPress={() => go(index + 1)} />
      </View>
    </View>
  );
}
