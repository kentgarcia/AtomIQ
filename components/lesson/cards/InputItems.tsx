/** Input-style interactions: fill in the blank, estimate on a slider, and the estimate flavour of predict. */

import { useEffect, useMemo, useRef, useState } from "react";
import { FieldInput } from "@/components/ui/field-input";
import { type AccessibilityActionEvent, type GestureResponderEvent, View, type LayoutChangeEvent } from "react-native";
import { Text } from "@/components/ui/text";

import { seededShuffle } from "@/content/curriculum/evaluate";
import { formatEstimate, fractionFromValue, valueFromFraction } from "@/content/curriculum/estimate";
import type { EstimateItemData, FillItemData, PredictItemData } from "@/content/curriculum/types";
import { Button } from "@/components/ui/button";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme } from "@/theme";

import { playSfx } from "@/services/sfx";
import { FigureView, OptionButton, OptionsArea, PromptHeader, TermText, useCardStyles, type InteractionProps, type OptionState } from "./shared";

const useStyles = createStyles((theme) => ({
  // The fill page: the statement is the star of it, big, with its answers, in the middle of the room.
  fillRoot: { flexGrow: 1, gap: spacing.lg },
  fillMiddle: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: spacing["2xl"], paddingVertical: spacing.lg },
  sentence: { ...fontFaces.heavy, fontSize: fontSizes["8xl"], lineHeight: 46, color: theme.colors.text, textAlign: "center" },
  blank: {
    ...fontFaces.heavy,
    color: theme.colors.primaryLight,
    textDecorationLine: "underline",
  },
  bank: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  input: {
    ...fontFaces.bold,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.field,
    color: theme.colors.fieldText,
    fontSize: fontSizes["4xl"],
    paddingHorizontal: spacing.lg,
    textAlign: "center",
  },
  inputOk: { backgroundColor: theme.colors.successSurface, color: theme.colors.success },
  inputBad: { backgroundColor: theme.colors.errorSurface, color: theme.colors.error },
  value: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], color: theme.colors.text, textAlign: "center" },
  track: { height: 56, justifyContent: "center" },
  rail: { height: 12, borderRadius: radius.full, backgroundColor: theme.colors.surfaceStrong },
  fill: { position: "absolute", left: 0, height: 12, borderRadius: radius.full, backgroundColor: theme.colors.primary },
  thumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  marker: { position: "absolute", width: 4, height: 28, borderRadius: 2, backgroundColor: theme.colors.success },
  scaleRow: { flexDirection: "row", justifyContent: "space-between" },
  scaleText: { ...fontFaces.medium, fontSize: fontSizes.md, color: theme.colors.textMuted },
  nudgeRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  answerLine: { ...fontFaces.semibold, fontSize: fontSizes.xl, color: theme.colors.textSecondary, textAlign: "center" },
}));

// ---------------------------------------------------------------------------
// Fill
// ---------------------------------------------------------------------------

export function FillItem({ data, seed, locked, result, onChange, ownerId }: InteractionProps<FillItemData, { type: "fill"; value: string | number }> & { ownerId: string }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const bank = useMemo(() => seededShuffle(data.bank ?? [], seed), [data.bank, seed]);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (data.mode === "bank") onChange(picked ? { type: "fill", value: picked } : null);
    else {
      const n = Number(typed.replace(",", "."));
      onChange(typed.trim() !== "" && Number.isFinite(n) ? { type: "fill", value: n } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, typed]);

  const [before, after] = data.prompt.split("___");
  const shown = data.mode === "bank" ? (bank.find((b) => b.id === picked)?.label ?? "_____") : typed || "_____";

  return (
    <View style={styles.fillRoot}>
      <PromptHeader ownerId={ownerId} text={data.mode === "bank" ? "Pick the word that fits" : "Type the missing number"} />
      <View style={styles.fillMiddle}>
      <Text style={styles.sentence} accessibilityLabel={data.prompt.replace("___", "blank")}>
        {before}
        <Text style={styles.blank}>{shown}</Text>
        {after}
      </Text>
      {data.mode === "bank" ? (
        <View style={styles.bank}>
          {bank.map((b) => {
            const isPicked = picked === b.id;
            const state: OptionState = locked ? (b.id === data.answer ? "correct" : isPicked ? "wrong" : "dim") : isPicked ? "selected" : "idle";
            return <OptionButton key={b.id} label={b.label} state={state} fullWidth={false} disabled={locked} onPress={() => setPicked(b.id)} />;
          })}
        </View>
      ) : (
        <View style={{ alignSelf: "stretch" }}>
          <FieldInput
            value={typed}
            editable={!locked}
            onChangeText={setTyped}
            keyboardType="numeric"
            inputMode="decimal"
            placeholder="Type a number"
            accessibilityLabel="Your answer"
            style={[styles.input, locked && (result?.correct ? styles.inputOk : styles.inputBad)]}
          />
          {data.unit ? <Text style={styles.answerLine}>{data.unit}</Text> : null}
        </View>
      )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slider (shared by estimate and predict)
// ---------------------------------------------------------------------------

function EstimateSlider({
  range,
  unit,
  locked,
  onValue,
  marker,
}: {
  range: { min: number; max: number; scale?: "linear" | "log"; step?: number };
  unit?: string;
  locked: boolean;
  onValue: (value: number) => void;
  /** Correct value to mark on the rail once checked. */
  marker?: number;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const [width, setWidth] = useState(0);
  const [fraction, setFraction] = useState(0.5);
  const [touched, setTouched] = useState(false);
  const value = valueFromFraction(fraction, range);
  const THUMB = 32;

  useEffect(() => {
    if (touched) onValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched, value]);

  // Sound (docs/features/SFX_SPEC.md §6.3): a select when the thumb is first touched, then a soft tick each
  // time it passes a notch (every 5 percent of the rail), so a drag has a texture and a stop is heard.
  const lastNotch = useRef<number | null>(null);
  const grab = (e: GestureResponderEvent) => {
    lastNotch.current = null;
    void playSfx("ui.select");
    move(e);
  };
  const move = (e: GestureResponderEvent) => {
    if (locked || width <= 0) return;
    const f = Math.min(1, Math.max(0, (e.nativeEvent.locationX - THUMB / 2) / Math.max(1, width - THUMB)));
    const notch = Math.round(f * 20);
    if (lastNotch.current !== null && notch !== lastNotch.current) void playSfx("ui.tick");
    lastNotch.current = notch;
    setFraction(f);
    setTouched(true);
  };
  const nudge = (delta: number) => {
    if (locked) return;
    setFraction((f) => Math.min(1, Math.max(0, f + delta)));
    setTouched(true);
  };
  const usable = Math.max(0, width - THUMB);

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {touched ? formatEstimate(value, unit) : "Slide to guess"}
      </Text>
      <View
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !locked}
        onMoveShouldSetResponder={() => !locked}
        onResponderGrant={grab}
        onResponderMove={move}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Estimate slider"
        accessibilityValue={{ text: touched ? formatEstimate(value, unit) : "not set" }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e: AccessibilityActionEvent) => nudge(e.nativeEvent.actionName === "increment" ? 0.05 : -0.05)}
      >
        <View style={styles.rail} pointerEvents="none" />
        <View style={[styles.fill, { width: THUMB / 2 + fraction * usable }]} pointerEvents="none" />
        {marker !== undefined && locked ? (
          <View style={[styles.marker, { left: THUMB / 2 - 2 + fractionFromValue(marker, range) * usable }]} pointerEvents="none" />
        ) : null}
        <View style={[styles.thumb, { left: fraction * usable }]} pointerEvents="none" />
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{formatEstimate(range.min)}</Text>
        <Text style={styles.scaleText}>{formatEstimate(range.max)}</Text>
      </View>
      {!locked ? (
        <View style={styles.nudgeRow}>
          <Button label="-" accessibilityLabel="Lower" variant="secondary" fullWidth={false} style={{ minWidth: 72 }} onPress={() => nudge(-0.03)} />
          <Button label="+" accessibilityLabel="Higher" variant="secondary" fullWidth={false} style={{ minWidth: 72 }} onPress={() => nudge(0.03)} />
        </View>
      ) : null}
    </View>
  );
}

export function EstimateItem({ data, locked, onChange, ownerId }: InteractionProps<EstimateItemData, { type: "estimate"; value: number }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      <OptionsArea>
      <EstimateSlider
        range={{ min: data.min, max: data.max, scale: data.scale, step: data.step }}
        unit={data.unit}
        locked={locked}
        marker={data.answer}
        onValue={(value) => onChange({ type: "estimate", value })}
      />
      </OptionsArea>
    </View>
  );
}

export function PredictEstimateItem({ data, locked, onChange, ownerId }: InteractionProps<PredictItemData, { type: "predict"; value: number }> & { ownerId: string }) {
  const { theme } = useTheme();
  const card = useCardStyles(theme);
  return (
    <View style={card.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Your guess, not scored" />
      <OptionsArea>
      <EstimateSlider
        range={{ min: data.min ?? 0, max: data.max ?? 100, scale: data.scale, step: data.step }}
        unit={data.unit}
        locked={locked}
        onValue={(value) => onChange({ type: "predict", value })}
      />
      {data.explanation && locked ? <TermText text={data.explanation} style={card.hint} /> : null}
      </OptionsArea>
    </View>
  );
}
