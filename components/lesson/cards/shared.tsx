/**
 * Building blocks shared by every lesson card: term text, figure, prompt header,
 * the chunky option control, and the props every item interaction receives.
 */

import { useRouter } from "expo-router";
import { Children, isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { Easing, cancelAnimation, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { TeacherSays, useLessonTeacher } from "@/components/lesson/Conversation";
import { CascadeIn, useCascadeDirection } from "@/components/motion/cascade-context";
import { PAGE_FX } from "@/components/motion/cascade-fx";
import { useCascadeSfx } from "@/components/motion/use-cascade-sfx";
import { Sparkle } from "@/components/lesson/Sparkle";
import { useShakeClock } from "@/components/lesson/Shake";
import { ObjectArt } from "@/components/lesson/visual/ObjectArt";
import { isArtId } from "@/components/lesson/visual/object-art";
import { SceneSvg } from "@/components/lesson/visual/SceneFigure";
import { EASE_OUT } from "@/components/motion/motion";
import { Icon } from "@/components/ui/icon";
import type { CardFigure, ItemResponse, ItemResult } from "@/content/curriculum/types";
import { splitTerms } from "@/content/curriculum/terms";
import { select } from "@/services/haptics";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha, type Theme } from "@/theme";
import { controls } from "@/theme/tokens";

import { POP, POP_TOTAL, bandFrame, faceFrame, popAction, starFrame } from "./option-pop-core";
import { shakeOffset } from "./shake-core";

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
    optionLip: { borderRadius: radius.lg, paddingBottom: controls.lip },
    popShapeWrap: { position: "absolute", top: -controls.border, left: -controls.border, right: -controls.border, bottom: -controls.border },
    popBase: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, backgroundColor: theme.colors.surface },
    popShape: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, borderWidth: controls.border, overflow: "hidden" },
    popBand: { position: "absolute", top: -12, bottom: -12, left: 0 },
    popStar: { position: "absolute" },
    pictureGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    optionLipLayer: { position: "absolute", left: 0, right: 0, bottom: 0, top: controls.lip, borderRadius: radius.lg },
    pictureCard: { alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 168, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: controls.border },
    pictureLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
    pictureLabel: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 22, color: theme.colors.text, textAlign: "center" },
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
    badgeOn: { backgroundColor: theme.colors.guide, borderColor: theme.colors.guide },
    badgeText: { ...fontFaces.bold, fontSize: fontSizes.lg, color: theme.colors.textSecondary },
    badgeTextOn: { color: theme.colors.onPrimary },
    stack: { flexGrow: 1, gap: spacing.md },
    list: { gap: spacing.md },
    // The options of a question: centred in the room under the question, which stays on top.
    optionsArea: { flexGrow: 1, justifyContent: "center", gap: spacing.md },
    optionButton: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: controls.border },
    optionButtonLabel: { ...fontFaces.heavy, fontSize: fontSizes["2xl"], lineHeight: 24, color: theme.colors.text, textAlign: "center" },
    verdict: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: controls.border },
    verdictTile: { width: 52, height: 52, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
    verdictLabel: { ...fontFaces.black, fontSize: fontSizes["3xl"], lineHeight: 30, letterSpacing: 0.4, color: theme.colors.text },
    verdictHint: { ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 20, color: theme.colors.textSecondary },
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
  /**
   * Set when a built-up answer (match, order, sort) was graded wrong: the interaction shows what was
   * wrong with a shake, then resets itself so the learner can try again (see `useRejectFlash`).
   */
  rejection?: Rejection | null;
  /**
   * A wrong step in an answer that is graded piece by piece (match): the run records the miss so the
   * card comes back in the mistakes replay, while the interaction shows the miss itself.
   */
  onMiss?: () => void;
}

/** A wrong attempt at a match, order or sort item. `token` is new for every attempt. */
export interface Rejection {
  token: number;
  /** Ids of the pieces that were wrong (what `evaluateItem` returns as `wrongIds`). */
  wrongIds: string[];
}

/** How long a wrong attempt stays on screen, shaking, before the item resets. */
export const REJECT_MS = 950;

/**
 * Shows a wrong attempt, then resets. Returns the set of wrong ids while the attempt is on screen
 * (null otherwise); `reset` is called once when it ends, to clear the interaction's own state.
 */
export function useRejectFlash(rejection: Rejection | null | undefined, reset: () => void): ReadonlySet<string> | null {
  // The attempt is on screen from the moment it arrives until its timer fires (then it is "ended")
  const [ended, setEnded] = useState(0);
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  const token = rejection?.token ?? 0;
  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      resetRef.current();
      setEnded(token);
    }, REJECT_MS);
    return () => clearTimeout(timer);
  }, [token]);
  const wrongIds = rejection?.wrongIds;
  const wrong = useMemo(() => new Set(wrongIds ?? []), [wrongIds]);
  return token && ended !== token ? wrong : null;
}

/** "Try again" under a built-up item while a wrong attempt is on screen. */
export function RetryNote() {
  const { theme, isDark } = useTheme();
  return (
    <Text accessibilityLiveRegion="polite" style={{ ...fontFaces.bold, fontSize: fontSizes.xl, textAlign: "left", color: isDark ? theme.colors.error : theme.colors.dangerDark }}>
      Try again
    </Text>
  );
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
            accessibilityHint="Opens the AtomDex entry"
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

/** Where a figure or simulation stands: no card, the drawing sits straight on the page. */
export function FigureStage({ children }: { children: ReactNode }) {
  return <View style={{ width: "100%", alignItems: "center" }}>{children}</View>;
}

/** A card figure: a drawn scene on its stage, with alt text for screen readers and an optional caption. */
export function FigureView({ figure, maxWidth }: { figure: CardFigure; maxWidth?: number }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));
  // No card around the scene, so it takes the whole width it is given.
  const w = maxWidth ? Math.min(width, maxWidth) : width;
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
    <CascadeIn at={PAGE_FX.title + 50}>
      <View style={styles.promptRow}>
        <View style={styles.promptText}>
          <TermText text={text} style={styles.prompt} />
        </View>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </CascadeIn>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "dim";

type Skin = { background: string; border: string; lip: string };

/** Face, border and lip of an option per state, from theme roles. `dim` looks like `idle`, faded. */
export function optionSkins(c: Theme["colors"]): Record<"idle" | "selected" | "correct" | "wrong", Skin> {
  return {
    idle: { background: c.surface, border: c.border, lip: c.borderStrong },
    // Selecting is the app's blue (the Guide's), the same colour the onboarding is built on
    selected: { background: c.infoSurface, border: c.guide, lip: c.guideLip },
    correct: { background: c.successSurface, border: c.success, lip: c.successDark },
    wrong: { background: c.errorSurface, border: c.error, lip: c.dangerDark },
  };
}

/** The colour a row wears when it is selected, and its darker lip. */
export interface OptionTone {
  color: string;
  dark: string;
}

/** The colours of an option for a state, cross-fading from the previous state (in 160 ms; 50 ms into selected or correct). */
function useOptionSkin(state: OptionState, tone?: OptionTone) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const toneColor = tone?.color;
  const toneDark = tone?.dark;
  // A toned row (onboarding's questions) is selected in its own colour instead of the blue
  const skins = useMemo(() => {
    const base = optionSkins(theme.colors);
    if (toneColor && toneDark) base.selected = { background: withAlpha(toneColor, 0.14), border: toneColor, lip: toneDark };
    return base;
  }, [theme, toneColor, toneDark]);
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
    // Becoming selected or correct flips at once (the pop carries it); other changes cross-fade in 160 ms
    t.value = reduced ? 1 : withTiming(1, { duration: key === "selected" || key === "correct" ? 50 : 160, easing: EASE_OUT });
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

/** The corner sparkles of an option's pop are this big at their largest, dp. */
const POP_STAR = 18;
/** The pop's offsets are fractions of the face height, up to this height; taller cards (pictures) move no further than this. */
const POP_REF_HEIGHT = 56;

/** The band of light, drawn inside the face shape (which clips it to the rounded face). */
function PopBand({ clock, width }: { clock: SharedValue<number>; width: number }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const band = width * POP.bandWidth;
  const anim = useAnimatedStyle(() => {
    const f = bandFrame(clock.get());
    return { opacity: f.opacity, transform: [{ translateX: f.left * width }, { skewX: `-${POP.bandLean}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.popBand, { width: band, backgroundColor: withAlpha(theme.palettes.tab.white, 0.22) }, anim]} />;
}

/** A twinkling sparkle on a corner of the face (not clipped: it overlaps the border). */
function PopStar({ i, clock, color, place }: { i: 0 | 1; clock: SharedValue<number>; color: string; place: ViewStyle }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const anim = useAnimatedStyle(() => {
    const f = starFrame(i, clock.get());
    return { opacity: f.size > 0 ? 1 : 0, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.size }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.popStar, place, anim]}>
      <Sparkle size={POP_STAR} color={color} />
    </Animated.View>
  );
}

/**
 * The 3D surface of a selectable option: a lip layer in the state's colour sits exactly where the face
 * lands when pressed, so nothing darker shows above the face. The face is two layers: its SHAPE (an opaque base,
 * then the state's fill and border, which cross-fade between states) and its content (the label, which never scales).
 *
 * When an option becomes selected or correct it pops (option-pop-core.ts, measured from a reference
 * clip): the colour flips at once, the shape squashes, springs up tall and hangs on a slab of lip while a
 * band of light sweeps across it and two sparkles twinkle, falls stretched, lands squashed, hops a little
 * and settles. A wrong option shakes as a whole (lip included, so the face never leaves its base). Reduced motion keeps only the colour change.
 */
function OptionSurface({ state, pressed, disabled, faceStyle, tone, children }: { state: OptionState; pressed: boolean; disabled?: boolean; faceStyle: StyleProp<ViewStyle>; tone?: OptionTone; children: ReactNode }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const reduced = useReducedMotion();
  const { skinStyle, lipStyle } = useOptionSkin(state, tone);
  const skins = useMemo(() => {
    const base = optionSkins(theme.colors);
    if (tone) base.selected = { background: withAlpha(tone.color, 0.14), border: tone.color, lip: tone.dark };
    return base;
  }, [theme, tone]);
  const [width, setWidth] = useState(0);
  // The pop clock: POP_TOTAL means "not popping". A state that is already there when the row appears does not pop.
  const pop = useSharedValue(POP_TOTAL);
  const height = useSharedValue(POP_REF_HEIGHT);
  const was = useRef<OptionState>(state);
  useEffect(() => {
    const before = was.current;
    was.current = state;
    const action = popAction(before, state, reduced);
    if (action !== "start") {
      // A pop cut short by this change (selected, then at once wrong) must not stay frozen half way
      if (action === "rest") {
        cancelAnimation(pop);
        pop.set(POP_TOTAL);
      }
      return;
    }
    cancelAnimation(pop);
    pop.set(0);
    pop.set(withTiming(POP_TOTAL, { duration: POP_TOTAL, easing: Easing.linear }));
    return () => cancelAnimation(pop);
  }, [state, reduced, pop]);
  // The pop lifts the face (content included) off its lip; the offset is in dp from fractions of the (capped) height
  const moveStyle = useAnimatedStyle(() => {
    const ref = Math.min(height.get(), POP_REF_HEIGHT);
    return { transform: [{ translateY: faceFrame(pop.get(), controls.pressTravel / ref).y * ref }] };
  });
  // The shake moves the whole button, lip and all: shaking only the face slides it off its base
  const shake = useShakeClock(state === "wrong");
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeOffset(shake.get()) }] }));
  // Only the shape squashes and stretches; a tall card squashes less
  const shapeStyle = useAnimatedStyle(() => {
    const f = faceFrame(pop.get(), 0);
    const k = Math.min(1, POP_REF_HEIGHT / height.get());
    return { transform: [{ scaleX: 1 + (f.sx - 1) * k }, { scaleY: 1 + (f.sy - 1) * k }] };
  });
  const starColor = skins[state === "dim" ? "idle" : state].border;
  return (
    <Animated.View style={[styles.optionLip, state === "dim" && styles.optionDim, shakeStyle]}>
      <Animated.View pointerEvents="none" style={[styles.optionLipLayer, lipStyle]} />
      <Animated.View
        style={[faceStyle, { borderColor: "transparent" }, moveStyle, pressed && !disabled ? { transform: [{ translateY: controls.pressTravel }] } : null]}
        onLayout={(e) => height.set(e.nativeEvent.layout.height)}
      >
        <Animated.View pointerEvents="none" style={[styles.popShapeWrap, reduced ? null : shapeStyle]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {/* The states' fills are translucent (a tint); an opaque base keeps the fill whole wherever the face is, even lifted off its lip */}
          <View style={styles.popBase} />
          <Animated.View style={[styles.popShape, skinStyle]}>{reduced || width === 0 ? null : <PopBand clock={pop} width={width} />}</Animated.View>
        </Animated.View>
        {children}
        {reduced ? null : (
          <>
            <PopStar i={0} clock={pop} color={starColor} place={{ left: 5, top: -6 }} />
            <PopStar i={1} clock={pop} color={starColor} place={{ right: 2, bottom: 0 }} />
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Text that sits in the middle of its row: no fixed line height (where the extra of a taller line box lands differs
 * between Android and iOS, and it pushed the glyphs toward the top) and no extra font padding.
 */
const CENTERED_TEXT = { textAlignVertical: "center", includeFontPadding: false } as const;

/** The room the right/wrong mark takes: always reserved, so an option is the same size in every state. */
const STATE_ICON = 22;

function StateIcon({ state }: { state: OptionState }) {
  const { theme } = useTheme();
  const mark = state === "correct" ? <Icon name="TickCircle" size={STATE_ICON} color={theme.colors.success} /> : state === "wrong" ? <Icon name="CloseCircle" size={STATE_ICON} color={theme.colors.error} /> : null;
  return <View style={{ width: STATE_ICON, height: STATE_ICON }}>{mark}</View>;
}

/** The room under a question, with its options in the middle of it. */
export function OptionsArea({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const items = Children.toArray(children);
  // The options arrive like the onboarding's: one by one, a soft tick for each (the count is the one at arrival, so an explanation
  // that appears under them later does not tick again)
  const [arrived] = useState(items.length);
  useCascadeSfx(useCascadeDirection(), "ui.tick", PAGE_FX.options + 120, PAGE_FX.optionStep, Math.min(arrived, 6));
  return (
    <View style={useCardStyles(theme).optionsArea}>
      {items.map((child, i) => (
        <CascadeIn key={isValidElement(child) && child.key !== null ? child.key : i} at={PAGE_FX.options + Math.min(i, 5) * PAGE_FX.optionStep} from={0.96}>
          {child}
        </CascadeIn>
      ))}
    </View>
  );
}

/**
 * A centred answer button (myth or fact, a word-bank word): the same face as an option row, so it
 * has the same pressed, selected, correct and wrong looks and the same pop.
 */
export function OptionButton({ label, state = "idle", icon, iconOnly, iconColor, accessibilityLabel, fullWidth = true, disabled, onPress }: { label: string; state?: OptionState; icon?: string; /** Colour of the icon in every state (default: follows the state). */ iconColor?: string; /** Show only the icon (its name is the accessibility label); a legend explains it. */ iconOnly?: boolean; accessibilityLabel?: string; fullWidth?: boolean; disabled?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const c = theme.colors;
  const ink = state === "correct" ? c.success : state === "wrong" ? c.error : state === "selected" ? c.guide : c.textSecondary;
  return (
    <Pressable
      style={fullWidth ? { flex: 1 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: state === "selected", disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        select();
        onPress?.();
      }}
    >
      {({ pressed }) => (
        <OptionSurface state={state} pressed={pressed} disabled={disabled} faceStyle={styles.optionButton}>
          {icon ? <Icon name={icon} size={24} color={iconColor ?? ink} /> : null}
          {iconOnly && icon ? null : <Text style={styles.optionButtonLabel}>{label}</Text>}
        </OptionSurface>
      )}
    </Pressable>
  );
}

/**
 * One of the two answers of a myth-or-fact card: a tall row with a tinted icon tile (green tick, red
 * cross), the verdict in big letters and a few words under it. Same face, pressed state and pop as
 * every option row.
 */
export function VerdictOption({ label, hint, icon, hue, state = "idle", disabled, onPress }: { label: string; hint: string; icon: string; hue: string; state?: OptionState; disabled?: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      accessibilityState={{ selected: state === "selected", disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        select();
        onPress?.();
      }}
    >
      {({ pressed }) => (
        <OptionSurface state={state} pressed={pressed} disabled={disabled} faceStyle={styles.verdict}>
          <View style={[styles.verdictTile, { backgroundColor: withAlpha(hue, 0.18) }]}>
            <Icon name={icon} size={30} color={hue} variant="Bold" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verdictLabel}>{label}</Text>
            <Text style={styles.verdictHint}>{hint}</Text>
          </View>
          <StateIcon state={state} />
        </OptionSurface>
      )}
    </Pressable>
  );
}

/** The chunky selectable row used by choice, match, order and sort. Colours settle in 160 ms. */
export function OptionRow({
  label,
  state = "idle",
  badge,
  art,
  mark,
  disabled,
  onPress,
  accessibilityHint,
  right,
  icon,
  hint,
  centerText,
  tone,
}: {
  label: string;
  state?: OptionState;
  /** An icon in a tinted tile before the label (onboarding's questions). */
  icon?: string;
  /** A second, quieter line under the label. */
  hint?: string;
  /** The row's own colour: its icon tile, and its face, border and lip once selected. */
  tone?: OptionTone;
  /** A taller row with the label (and hint) centred vertically, font padding off so it sits in the middle (onboarding's questions). */
  centerText?: boolean;
  badge?: string;
  /** A coloured number badge that identifies the row (match pairs). */
  mark?: { color: string; label: string };
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
        <OptionSurface state={state} pressed={pressed} disabled={disabled} faceStyle={centerText ? [styles.option, { minHeight: 64 }] : styles.option} tone={tone}>
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
          {icon ? (
            <View style={{ width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(tone?.color ?? theme.colors.guide, on ? 0.28 : 0.16) }}>
              <Icon name={icon} size={26} color={tone?.color ?? (on ? theme.colors.guide : theme.colors.textSecondary)} variant="Bold" />
            </View>
          ) : null}
          <View style={centerText ? { flex: 1, justifyContent: "center" } : { flex: 1 }}>
            <Text style={centerText ? [{ ...fontFaces.semibold, fontSize: fontSizes.xl, color: theme.colors.text }, CENTERED_TEXT] : styles.optionLabel}>{label}</Text>
            {hint ? <Text style={centerText ? [styles.hint, CENTERED_TEXT] : styles.hint}>{hint}</Text> : null}
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
export function PictureOption({ label, art, state = "idle", disabled, onPress }: { label: string; art: string; state?: OptionState; disabled?: boolean; onPress?: () => void }) {
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
            {/* An empty slot on the left as wide as the mark on the right keeps the label centred */}
            <View style={{ width: STATE_ICON }} />
            <Text style={styles.pictureLabel}>{label}</Text>
            <StateIcon state={state} />
          </View>
        </OptionSurface>
      )}
    </Pressable>
  );
}

export { withAlpha };
