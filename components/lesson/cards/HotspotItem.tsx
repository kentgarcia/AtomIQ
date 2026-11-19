/** Tap the right part of a figure. Targets have 44dp minimum hit areas and labels for screen readers. */

import { useEffect, useMemo, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";

import { SceneSvg } from "@/components/lesson/visual/SceneFigure";
import type { HotspotItemData } from "@/content/curriculum/types";
import { createStyles, radius, useTheme } from "@/theme";

import { OptionsArea, PromptHeader, useCardStyles, type InteractionProps } from "./shared";

const MIN_HIT = 44;

const useStyles = createStyles((theme) => ({
  ring: { position: "absolute", borderRadius: radius.full, borderWidth: 3, borderColor: "transparent" },
  ringSelected: { borderColor: theme.colors.guide, backgroundColor: theme.colors.infoSurface },
  ringCorrect: { borderColor: theme.colors.success, backgroundColor: theme.colors.successSurface },
  ringWrong: { borderColor: theme.colors.error, backgroundColor: theme.colors.errorSurface },
}));

/** A copy of the scene where the circles inside one target tremble: the nucleus that "changes by itself". */
function trembleWithin(scene: HotspotItemData["scene"], target: HotspotItemData["targets"][number]): HotspotItemData["scene"] {
  let n = 0;
  return {
    ...scene,
    shapes: scene.shapes.map((shape) => {
      if (shape.t !== "circle" || Math.hypot(shape.x - target.x, shape.y - target.y) > target.r) return shape;
      const period = 2000 + (n++ % 3) * 1000;
      return { ...shape, motion: { kind: "pulse" as const, period, amount: 0.12, phase: (n % 4) / 4 } };
    }),
  };
}

export function HotspotItem({ data, locked, result, onChange, ownerId }: InteractionProps<HotspotItemData, { type: "hotspot"; targetId: string }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  const styles = useStyles(theme);
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const scale = width / 100;
  const answer = data.targets.find((t) => t.id === data.answer);
  // The change animation plays only once the learner has tapped the right nucleus and checked.
  const scene = useMemo(
    () => (data.animateOnCorrect && locked && result?.correct && answer ? trembleWithin(data.scene, answer) : data.scene),
    [data.animateOnCorrect, data.scene, locked, result?.correct, answer],
  );

  useEffect(() => {
    onChange(picked ? { type: "hotspot", targetId: picked } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Tap the figure" />
      <OptionsArea>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        {width > 0 ? (
          <View style={{ width, height: (width * data.scene.height) / 100 }}>
            <SceneSvg scene={scene} width={width} />
            {data.targets.map((t) => {
              const size = Math.max(MIN_HIT, t.r * 2 * scale);
              const state = locked
                ? t.id === data.answer
                  ? styles.ringCorrect
                  : t.id === picked
                    ? styles.ringWrong
                    : null
                : picked === t.id
                  ? styles.ringSelected
                  : null;
              return (
                <Pressable
                  key={t.id}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: picked === t.id }}
                  onPress={() => setPicked(t.id)}
                  style={[styles.ring, state, { left: t.x * scale - size / 2, top: t.y * scale - size / 2, width: size, height: size }]}
                />
              );
            })}
          </View>
        ) : null}
      </View>
      </OptionsArea>
    </View>
  );
}
