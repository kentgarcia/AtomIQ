/** A draggable slider for the labs: a thick track filled to the value and a round thumb with a lip. A tap or a drag sets it. */

import { useCallback, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { createStyles, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  hit: { height: 36, justifyContent: "center", paddingHorizontal: 14 },
  track: { height: 16, borderRadius: 8, backgroundColor: theme.colors.border, justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 8 },
  thumb: { position: "absolute", top: -6, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.card },
}));

export function LabSlider({
  value,
  min,
  max,
  step,
  tone,
  label,
  valueText,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  tone: string;
  label: string;
  valueText: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [width, setWidth] = useState(0);
  const pct = max > min ? (value - min) / (max - min) : 0;
  const set = useCallback(
    (x: number) => {
      if (width <= 0 || disabled) return;
      const raw = min + Math.min(1, Math.max(0, x / width)) * (max - min);
      const v = Math.round((raw - min) / step) * step + min;
      if (v !== value) onChange(Math.min(max, Math.max(min, v)));
    },
    [width, min, max, step, value, onChange, disabled],
  );
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(set)(e.x))
    .onUpdate((e) => runOnJS(set)(e.x));
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.hit}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: valueText }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === "increment" ? step : -step))))}
      >
        <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: tone }]} />
          <View style={[styles.thumb, { left: pct * Math.max(0, width - 28) }]} />
        </View>
      </View>
    </GestureDetector>
  );
}
