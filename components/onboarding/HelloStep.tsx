/**
 * The first screen of the app: one promise and one button, laid out like the best first screens
 * (see docs/features/ONBOARDING_SPEC.md): a coloured hero on top with the character, a
 * scalloped cloud edge, and a white sheet under it with the AtomIQ name, one line under it (the tagline), and at the bottom a small
 * footnote right above the main button. The hero is the primary button's yellow (`buttonFace`) with flat blobs in its lip colour behind Shrodi,
 * so the first screen already looks like the app.
 *
 * Motion (tier C, once): Shrodi (the still picture `happy_2.png`, see `ShrodiStill`) is stamped down (tap him: he hops and a burst of stars flies), the name is stamped, then the line, the footnote and the button
 * arrive. The sky stands still (two pale clouds and three sparkles held at frame 0 of `SKY` in hello-core.ts): its loop clock cost frames on Android. The theme switch sits on the hero, top right. Get started scrolls the whole page up with the next step attached below it (see `app/onboarding.tsx`).
 */

import { useEffect, useMemo, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

import { Sparkle } from "@/components/lesson/Sparkle";
import { Stamp } from "@/components/lesson/Stamp";
import { STAMP_LANDS } from "@/components/lesson/stamp-core";
import { ShrodiStill } from "@/components/mascot/ShrodiStill";
import { Burst } from "@/components/motion/Burst";
import { BURST } from "@/components/motion/burst-core";
import { PopWhen } from "@/components/motion/PopOnce";
import { useTriggerClock } from "@/components/motion/use-trigger-clock";
import { Reveal } from "@/components/motion/Reveal";
import { HERO_BLOBS, SKY, cloudShape, skyCloudX, twinkleFrame } from "@/components/onboarding/hello-core";
import { FooterRow } from "@/components/lesson/FooterRow";
import { Button } from "@/components/ui/button";
import { LESSON_FRAME } from "@/components/lesson/LessonFrame";
import { Icon } from "@/components/ui/icon";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

/** When each piece arrives, ms after the screen appears. */
export const HELLO_FX = { fox: 120, brand: 420, line: 700, note: 800, button: 900 } as const;

/** The least share of the screen's height the white sheet takes, so the cloud and the title sit high. */
const SHEET_SHARE = 0.48;
/** The widest the button gets, dp (76% of the width on a phone). */
const BUTTON_MAX_WIDTH = 300;
/** The widest the subtitle gets, dp, so it wraps into two or three even lines instead of running edge to edge. */
const LINE_MAX_WIDTH = 270;
const FOX_MIN = 150;
const FOX_MAX = 320;

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  hero: { flex: 1, minHeight: 230, backgroundColor: theme.colors.buttonFace, overflow: "hidden" },
  foxLayer: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  sheet: { backgroundColor: theme.colors.background, paddingTop: spacing.lg },
  // The words sit in the middle of the room above the button
  middle: { flex: 1, justifyContent: "center", paddingVertical: spacing.md },
  brand: { ...fontFaces.heavy, fontSize: fontSizes["10xl"], lineHeight: 54, letterSpacing: -1, color: theme.colors.text, textAlign: "center" },
  copy: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing["2xl"] },
  bottom: { alignItems: "center", gap: spacing.md },
  note: { ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 20, color: theme.colors.textMuted, textAlign: "center" },
  accent: { color: theme.colors.primary },
  // Not full width: a narrow column breaks into balanced lines instead of one long stretched one
  line: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center", maxWidth: LINE_MAX_WIDTH },
  toggle: { position: "absolute", right: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 2, borderBottomWidth: 4, borderColor: theme.colors.border, backgroundColor: theme.colors.card, zIndex: 5 },
  toggleText: { ...fontFaces.heavy, fontSize: fontSizes.sm, color: theme.colors.text },
}));

/**
 * The cloud edge: big humps in two layers with the same outline, a pale one behind (the page colour at
 * 60% over the hero, so it is a light tint of the hero's own yellow, and dark in dark mode) and the
 * page-coloured one in front, which is also the colour of the sheet, so the cloud and the sheet are one shape.
 */
function Cloud({ width, front, back }: { width: number; front: string; back: string }) {
  const shape = useMemo(() => cloudShape(width), [width]);
  return (
    <Svg width={width} height={shape.height} viewBox={`0 0 ${width} ${shape.height}`}>
      <Path d={shape.back} fill={back} />
      <Path d={shape.front} fill={front} />
    </Svg>
  );
}

/** A soft flat cloud in the hero, held still where `skyCloudX` puts it at time 0 (the sky no longer moves: it cost frames on Android). One group opacity, so its overlapping puffs do not show through each other. */
function SkyCloud({ i, heroWidth, heroHeight, color }: { i: number; heroWidth: number; heroHeight: number; color: string }) {
  const spec = SKY.clouds[i];
  const h = Math.round(spec.width * 0.4);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: Math.round(skyCloudX(0, i, heroWidth)), top: Math.round(spec.y * heroHeight), width: spec.width, height: h }}>
      <Svg width={spec.width} height={h} viewBox="0 0 120 48">
        <G opacity={spec.opacity}>
          <Circle cx={32} cy={31} r={15} fill={color} />
          <Circle cx={58} cy={24} r={21} fill={color} />
          <Circle cx={88} cy={31} r={14} fill={color} />
          <Rect x={32} y={31} width={56} height={14} fill={color} />
        </G>
      </Svg>
    </View>
  );
}

/** A sparkle in the sky, held still at the frame `twinkleFrame` gives at time 0. */
function SkySparkle({ i, size, color, place, tilt = 0 }: { i: number; size: number; color: string; place: object; tilt?: number }) {
  const f = twinkleFrame(0, i);
  return (
    <View pointerEvents="none" style={[{ position: "absolute", opacity: f.opacity, transform: [{ rotate: `${tilt}deg` }, { scale: f.scale }] }, place]}>
      <Sparkle size={size} color={color} />
    </View>
  );
}

/** `onStart` is called when Get started is pressed; `app/onboarding.tsx` then slides this page up with the next step attached below it. */
export function HelloStep({ onStart }: { onStart: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const [heroHeight, setHeroHeight] = useState(260);
  const start = () => {
    impactLight();
    void playSfx("lesson.whoosh");
    onStart();
  };

  const dark = theme.mode === "dark";
  const c = theme.colors;
  const cloud = useMemo(() => cloudShape(width), [width]);
  // Shrodi fills most of the hero; the cloud (its two layers overlap the hero by about 55 dp) and the 2% he is tucked down cover the bottom of the picture
  const fox = Math.max(FOX_MIN, Math.min(FOX_MAX, Math.round(heroHeight * 0.85)));

  useEffect(() => {
    // Each thing that lands has its sound: Shrodi's stamp, the name's stamp, then the line and button arriving
    const ids = [
      setTimeout(() => void playSfx("lesson.stamp"), HELLO_FX.fox + STAMP_LANDS),
      setTimeout(() => void playSfx("lesson.stamp"), HELLO_FX.brand + STAMP_LANDS),
      setTimeout(() => void playSfx("reward.sparkle"), HELLO_FX.line),
      setTimeout(() => void playSfx("reward.appear"), HELLO_FX.button),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  // A tap on Shrodi: a hop with two sparkles, a burst of stars, a pop and a tap of haptic. Taps in a row restart it.
  const [taps, setTaps] = useState(0);
  const burst = useTriggerClock(BURST.total, taps);
  const poke = () => {
    impactLight();
    void playSfx("reward.pop", { index: taps % 3 });
    void playSfx("reward.sparkle");
    setTaps((n) => n + 1);
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero} onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}>
        {/* Flat shapes in the hero's own lip colour: no gradient */}
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
          <Path d={HERO_BLOBS.wave} fill={c.buttonLip} />
          <Path d={HERO_BLOBS.top} fill={withAlpha(c.buttonLip, 0.55)} />
        </Svg>
        {/* The sky: two pale clouds and three sparkles, standing still */}
        {SKY.clouds.map((_, i) => (
          <SkyCloud key={i} i={i} heroWidth={width} heroHeight={heroHeight} color={c.onPrimary} />
        ))}
        <SkySparkle i={0} size={30} color={withAlpha(c.onPrimary, 0.55)} tilt={-12} place={{ left: "9%", top: "16%" }} />
        <SkySparkle i={1} size={14} color={withAlpha(c.onPrimary, 0.6)} place={{ left: "20%", top: "46%" }} />
        <SkySparkle i={2} size={18} color={withAlpha(c.onPrimary, 0.55)} place={{ right: "9%", top: "52%" }} />

        <Pressable
          onPress={() => void toggleTheme()}
          style={[styles.toggle, { top: insets.top + spacing.sm }]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${dark ? "light" : "dark"} mode`}
        >
          <Icon name={dark ? "Moon" : "Sun"} size={16} color={dark ? c.warning : c.textMuted} variant="Bold" />
          <Text style={styles.toggleText}>{dark ? "Dark" : "Light"}</Text>
        </Pressable>

        <View pointerEvents="box-none" style={[styles.foxLayer, { bottom: -Math.round(fox * 0.02) }]}>
          <Stamp at={HELLO_FX.fox}>
            <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel="Shrodi" accessibilityHint="Tap to say hi">
              <PopWhen trigger={taps} active={taps > 0} intensity={1.5} sparkleColor={c.gold}>
                <ShrodiStill size={fox} />
              </PopWhen>
              {/* The burst comes out of his head */}
              <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "36%", width: 0, height: 0 }}>
                <Burst clock={burst} at={0} diameter={Math.round(fox * 0.5)} color={c.gold} ringColor={c.onPrimary} reach={Math.round(fox * 0.5)} count={8} />
              </View>
            </Pressable>
          </Stamp>
        </View>
      </View>

      {/* The sheet takes at least 48% of the screen (the cloud and the title start high), copy at its top and the button at its bottom */}
      <View style={[styles.sheet, { minHeight: Math.round(screenHeight * SHEET_SHARE) }]}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: -(cloud.height - 1), height: cloud.height }}>
          <Cloud width={width} front={c.background} back={withAlpha(c.background, 0.6)} />
        </View>
        <View style={styles.middle}>
          <View style={styles.copy}>
            <Stamp at={HELLO_FX.brand}>
              <Text accessibilityRole="header" style={styles.brand}>
                Atom<Text style={styles.accent}>IQ</Text>
              </Text>
            </Stamp>
            <Reveal at={HELLO_FX.line}>
              <Text style={styles.line}>Learn nuclear science with short lessons, games and myth busting.</Text>
            </Reveal>
          </View>
        </View>
        {/* A taller, narrower button than the other steps': this is the one promise of the screen */}
        <View style={[LESSON_FRAME, styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]}>
          {/* The footnote sits right on top of the button */}
          <Reveal at={HELLO_FX.note}>
            <Text style={styles.note}>Works offline. No account needed.</Text>
          </Reveal>
          <Reveal at={HELLO_FX.button} blockUntilShown style={{ width: "76%", maxWidth: BUTTON_MAX_WIDTH }}>
            <FooterRow>
              <Button
                label="Get started"
                size="large"
                onPress={start}
              />
            </FooterRow>
          </Reveal>
        </View>
      </View>
    </View>
  );
}
