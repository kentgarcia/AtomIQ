/**
 * Building blocks shared by every lesson card: term text, figure, prompt header,
 * the chunky option control, and the props every item interaction receives.
 */

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { TeacherSays, useLessonTeacher } from "@/components/lesson/Conversation";
import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { SceneSvg } from "@/components/lesson/visual/SceneFigure";
import { EASE_OUT } from "@/components/motion/motion";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { CardFigure, ItemResponse, ItemResult } from "@/content/curriculum/types";
import { splitTerms } from "@/content/curriculum/terms";
import { select } from "@/services/haptics";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha, type Theme } from "@/theme";
import { controls } from "@/theme/tokens";

export const useCardStyles = (() => {
  const make = createStyles((theme) => ({
    prompt: { ...fontFaces.bold, fontSize: fontSizes["4xl"], lineHeight: 30, color: theme.colors.text },
    ask: { ...fontFaces.bold, fontSize: fontSizes["3xl"], lineHeight: 27, color: theme.colors.text },
    askBlock: { gap: spacing.md },
    instruction: { ...fontFaces.semibold, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.textSecondary },
    promptRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
    promptText: { flex: 1 },
    hint: { ...fontFaces.medium, fontSize: fontSizes.lg, color: theme.colors.textSecondary, marginTop: spacing.xs },
    body: { ...fontFaces.book, fontSize: fontSizes["2xl"], lineHeight: 28, color: theme.colors.text },
    term: { ...fontFaces.bold, color: theme.colors.link, textDecorationLine: "underline" },
    figureWrap: { width: "100%", alignItems: "center" },
    caption: { ...fontFaces.medium, fontSize: fontSizes.md, color: theme.colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
    optionLip: { borderRadius: radius.lg, overflow: "hidden", paddingBottom: controls.lip },
    pictureGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    optionLipLayer: { position: "absolute", left: 0, right: 0, bottom: 0, top: controls.lip, borderRadius: radius.lg },
    pictureCard: { alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 168, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: controls.border },
    pictureLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
    pictureLabel: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 22, color: theme.colors.text, textAlign: "center" },
    pictureNote: { ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 20, color: theme.colors.textSecondary, textAlign: "center" },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 52,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: controls.border,
    },
    optionDim: { opacity: 0.55 },
    optionLabel: { ...fontFaces.semibold, flex: 1, fontSize: fontSizes.xl, lineHeight: 22, color: theme.colors.text },
    optionNote: { ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 20, color: theme.colors.textSecondary, marginTop: spacing.xs },
    badge: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      borderWidth: controls.border,
      borderColor: theme.colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
    },
    markBadge: { width: 30, height: 30, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
    markText: { ...fontFaces.heavy, fontSize: fontSizes.xl, color: theme.colors.onPrimary },
    markRing: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.lg, borderWidth: 3 },
    badgeOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    badgeText: { ...fontFaces.bold, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
    badgeTextOn: { color: theme.colors.onPrimary },
    stack: { gap: spacing.md },
    sectionLabel: {
      ...fontFaces.bold,
      fontSize: fontSizes.md,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: theme.colors.textMuted,
    },
  }));
  return make;
})();

/** What every item interaction receives from the runner. */
export interface InteractionProps<D, R extends ItemResponse> {
  data: D;
  /** Stable per card instance, so shuffles do not change on re-render. */
  seed: string;
  /** True once the answer has been checked. */
  locked: boolean;
  /** Set after checking. */
  result: ItemResult | null;
  /** Report the current response, or null while it is incomplete. */
  onChange: (response: R | null) => void;
}

/** Text with [[id|shown]] glossary markers rendered as tappable terms. */
export function TermText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const router = useRouter();
  const segments = useMemo(() => splitTerms(text), [text]);
  return (
    <Text style={style ?? styles.body}>
      {segments.map((s, i) =>
        s.termId ? (
          <Text
            key={i}
            style={styles.term}
            accessibilityRole="link"
            accessibilityHint="Opens the encyclopedia entry"
            onPress={() => router.push(`/explorer/encyclopedia-entry?id=${s.termId}`)}
          >
            {s.text}
          </Text>
        ) : (
          <Text key={i}>{s.text}</Text>
        ),
      )}
    </Text>
  );
}

/** The 3D card a figure or simulation stands on. */
export function FigureStage({ children }: { children: ReactNode }) {
  return (
    <Card tone="soft" padding={spacing.sm} style={{ width: "100%" }} faceStyle={{ alignItems: "center" }}>
      {children}
    </Card>
  );
}

/** A card figure: a drawn scene on its stage, with alt text for screen readers and an optional caption. */
export function FigureView({ figure, maxWidth }: { figure: CardFigure; maxWidth?: number }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));
  // The stage pads and borders the scene, so the scene is narrower than the space we are given.
  const inner = Math.max(0, width - 2 * (spacing.sm + controls.border));
  const w = maxWidth ? Math.min(inner, maxWidth) : inner;
  return (
    <View style={styles.figureWrap} onLayout={onLayout}>
      <FigureStage>
        <View accessible accessibilityRole="image" accessibilityLabel={figure.altText}>
          {w > 0 ? <SceneSvg scene={figure.scene} width={w} plate={false} /> : null}
        </View>
      </FigureStage>
      {figure.caption ? <Text style={styles.caption}>{figure.caption}</Text> : null}
    </View>
  );
}

/** Prompt with its Read Aloud control. */
export function PromptHeader({ ownerId, text, hint }: { ownerId: string; text: string; hint?: string }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const teacher = useLessonTeacher();
  // With a teacher, the question is asked in their speech bubble, which holds only what they say.
  // How to answer ("Tap the items in order") is an instruction, so it sits under the bubble.
  if (teacher) {
    return (
      <View style={styles.askBlock}>
        <TeacherSays>
          <TermText text={text} style={styles.ask} />
        </TeacherSays>
        {hint ? <Text style={styles.instruction}>{hint}</Text> : null}
      </View>
    );
  }
  return (
    <View>
      <View style={styles.promptRow}>
        <View style={styles.promptText}>
          <TermText text={text} style={styles.prompt} />
        </View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dim";

type Skin = { background: string; border: string; lip: string };

/** Face, border and lip of an option per state, from theme roles. `dim` looks like `idle`, faded. */
export function optionSkins(c: Theme["colors"]): Record<"idle" | "selected" | "correct" | "wrong", Skin> {
  return {
    idle: { background: c.surface, border: c.border, lip: c.borderStrong },
    selected: { background: c.primarySurface, border: c.primaryBorder, lip: c.primaryDark },
    correct: { background: c.successSurface, border: c.success, lip: c.successDark },
    wrong: { background: c.errorSurface, border: c.error, lip: c.dangerDark },
  };
}

/** The colours of an option for a state, cross-fading from the previous state in 160 ms. */
function useOptionSkin(state: OptionState) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const skins = useMemo(() => optionSkins(theme.colors), [theme]);
  const key = state === "dim" ? "idle" : state;

  // Cross-fade from the previous skin to the new one (a state change, so it is shown).
  const from = useSharedValue<string>(key);
  const to = useSharedValue<string>(key);
  const t = useSharedValue(1);
  useEffect(() => {
    if (to.value === key) return;
    from.value = to.value;
    to.value = key;
    t.value = 0;
    t.value = reduced ? 1 : withTiming(1, { duration: 160, easing: EASE_OUT });
  }, [key, reduced, from, to, t]);
  const skinStyle = useAnimatedStyle(() => {
    const a = skins[from.value as keyof typeof skins];
    const b = skins[to.value as keyof typeof skins];
    return {
      backgroundColor: interpolateColor(t.value, [0, 1], [a.background, b.background]),
      borderColor: interpolateColor(t.value, [0, 1], [a.border, b.border]),
    };
  });
  const lipStyle = useAnimatedStyle(() => {
    const a = skins[from.value as keyof typeof skins];
    const b = skins[to.value as keyof typeof skins];
    return { backgroundColor: interpolateColor(t.value, [0, 1], [a.lip, b.lip]) };
  });

  return { skinStyle, lipStyle };
}

/**
 * The 3D surface of a selectable option: a lip layer in the state's colour sits exactly where the face
 * lands when pressed, so nothing darker shows above the face. The face and lip cross-fade between states.
 */
function OptionSurface({ state, pressed, disabled, faceStyle, children }: { state: OptionState; pressed: boolean; disabled?: boolean; faceStyle: StyleProp<ViewStyle>; children: ReactNode }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const { skinStyle, lipStyle } = useOptionSkin(state);
  return (
    <View style={[styles.optionLip, state === "dim" && styles.optionDim]}>
      <Animated.View pointerEvents="none" style={[styles.optionLipLayer, lipStyle]} />
      <Animated.View style={[faceStyle, skinStyle, pressed && !disabled ? { transform: [{ translateY: controls.pressTravel }] } : null]}>{children}</Animated.View>
    </View>
  );
}

function StateIcon({ state }: { state: OptionState }) {
  const { theme } = useTheme();
  if (state === "correct") return <Icon name="TickCircle" size={22} color={theme.colors.success} />;
  if (state === "wrong") return <Icon name="CloseCircle" size={22} color={theme.colors.error} />;
  return null;
}

/** The chunky selectable row used by choice, match, order and sort. Colours settle in 160 ms. */
export function OptionRow({
  label,
  note,
  state = "idle",
  badge,
  art,
  mark,
  disabled,
  onPress,
  accessibilityHint,
  right,
}: {
  label: string;
  note?: string;
  state?: OptionState;
  badge?: string;
  /** A coloured number badge that identifies the row (match pairs), with a same-colour outline when `outlined`. */
  mark?: { color: string; label: string; outlined?: boolean };
  /** A picture from the lesson object art, shown before the label. */
  art?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  right?: ReactNode;
}) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const on = state === "selected";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: state === "selected", disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        select();
        onPress?.();
      }}
    >
      {({ pressed }) => (
        <OptionSurface state={state} pressed={pressed} disabled={disabled} faceStyle={styles.option}>
          {mark?.outlined ? <View pointerEvents="none" style={[styles.markRing, { borderColor: mark.color }]} /> : null}
          {mark ? (
            <View style={[styles.markBadge, { backgroundColor: mark.color }]}>
              <Text style={styles.markText}>{mark.label}</Text>
            </View>
          ) : badge ? (
            <View style={[styles.badge, on && styles.badgeOn]}>
              <Text style={[styles.badgeText, on && styles.badgeTextOn]}>{badge}</Text>
            </View>
          ) : null}
          {isArtId(art) ? <ObjectArt id={art} size={44} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.optionLabel}>{label}</Text>
            {note ? <Text style={styles.optionNote}>{note}</Text> : null}
          </View>
          {right}
          <StateIcon state={state} />
        </OptionSurface>
      )}
    </Pressable>
  );
}

/**
 * A picture card: a picture over its label, like an image-answer card. Used when every option of a
 * choice has a picture. Two sit side by side; the picture is about 60% of the card's width.
 */
export function PictureOption({ label, art, note, state = "idle", disabled, onPress }: { label: string; art: string; note?: string; state?: OptionState; disabled?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  return (
    <Pressable
      style={{ flexBasis: "45%", flexGrow: 1 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === "selected", disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        select();
        onPress?.();
      }}
    >
      {({ pressed }) => (
        <OptionSurface state={state} pressed={pressed} disabled={disabled} faceStyle={styles.pictureCard}>
          {isArtId(art) ? <ObjectArt id={art} size={96} /> : null}
          <View style={styles.pictureLabelRow}>
            <Text style={styles.pictureLabel}>{label}</Text>
            <StateIcon state={state} />
          </View>
          {note ? <Text style={styles.pictureNote}>{note}</Text> : null}
        </OptionSurface>
      )}
    </Pressable>
  );
}

export { withAlpha };
