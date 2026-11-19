/**
 * The body of the level-up dialog (the card, header and button are the house ModalDialog). It plays the
 * level-up moment (timeline in `celebration-core.ts`, tier D of the duolingo-motion-style skill, one
 * hero): a gold medal drops like a stamp onto a fan of rays that opens behind it, a burst of stars goes
 * off as it lands, the level number counts up inside it from the level before and the medal pops as
 * the number lands; then the line "N XP to Level X" and a bar toward the next level arrive and the bar
 * fills. The rays keep turning and breathing for as long as the dialog is open. Several levels gained
 * at once are one show: `from` is the level before the first, and the number counts from it. The button is the dialog's own footer: wrap it in
 * `<LevelUpButton>` so it arrives with the line.
 *
 * The show starts when the dialog has finished growing. The sound (`reward.level-up`) is played by the
 * screen when the dialog opens; the haptic is here, on the medal's landing. Reduced motion shows the
 * finished dialog and no burst.
 */

import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { DIALOG_SETTLE_MS, LEVEL_UP, LEVEL_UP_TOTAL, levelBar, levelRays, levelRaysLoop } from "@/components/celebration/celebration-core";
import { STAMP_LANDS } from "@/components/lesson/stamp-core";
import { Stamp } from "@/components/lesson/Stamp";
import { Burst } from "@/components/motion/Burst";
import { BURST } from "@/components/motion/burst-core";
import { CountUp } from "@/components/motion/CountUp";
import { PopOnce } from "@/components/motion/PopOnce";
import { Reveal } from "@/components/motion/Reveal";
import { useLoopClock } from "@/components/motion/motion";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { shadeColor } from "@/components/path/firefly-core";
import { Text } from "@/components/ui/text";
import { notifySuccess } from "@/services/haptics";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const STAGE = 200;
const MEDAL = 104;
const LIP = 5;
const RAYS = 12;
const BAR_HEIGHT = 14;

/**
 * The fan: `RAYS` wedges round the middle of the stage (the gaps are as wide as the rays), drawn in
 * `BANDS` rings from the middle out. Each ring is its own path, so its alpha can be set on its own and
 * the rays fade out toward their tips (SVG gradients render black on device, so the fade is stepped
 * finely instead).The rays are full strength until `FADE_FROM` of the way out, then fade to nothing at the tips.
 */
const BANDS = 14;
const FADE_FROM = 0.3;
function bandAlpha(i: number): number {
  const f = (i + 0.5) / BANDS;
  const k = Math.min(1, Math.max(0, (f - FADE_FROM) / (1 - FADE_FROM)));
  return (1 - k) * (1 - k);
}
function raysBands(size: number): { d: string; alpha: number }[] {
  const r = size / 2;
  const step = (Math.PI * 2) / RAYS;
  const half = step / 4;
  const at = (radius: number, angle: number) => `${(r + Math.cos(angle) * radius).toFixed(1)} ${(r + Math.sin(angle) * radius).toFixed(1)}`;
  return Array.from({ length: BANDS }, (_, i) => {
    const r0 = (r * i) / BANDS;
    // A hair of overlap so no seam shows between rings
    const r1 = Math.min(r, (r * (i + 1)) / BANDS + 0.6);
    let d = "";
    for (let k = 0; k < RAYS; k++) {
      const a = k * step;
      d += `M${at(r0, a - half)} L${at(r1, a - half)} L${at(r1, a + half)} L${at(r0, a + half)} Z `;
    }
    return { d, alpha: bandAlpha(i) };
  });
}
const RAY_BANDS = raysBands(STAGE);

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  const face = c.gold;
  const lip = shadeColor(c.gold, -0.22);
  return {
    body: { alignItems: "center", gap: 12, alignSelf: "stretch" },
    stage: { width: STAGE, height: STAGE, alignItems: "center", justifyContent: "center" },
    rays: { position: "absolute", left: 0, top: 0, width: STAGE, height: STAGE },
    raysSpin: { width: STAGE, height: STAGE },
    medalBox: { width: MEDAL, height: MEDAL + LIP, alignItems: "center", justifyContent: "center" },
    medalLip: { position: "absolute", left: 0, top: LIP, width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, backgroundColor: lip },
    medalFace: { width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, backgroundColor: face, alignItems: "center", justifyContent: "center", position: "absolute", left: 0, top: 0 },
    medalRing: { width: MEDAL - 20, height: MEDAL - 20, borderRadius: (MEDAL - 20) / 2, borderWidth: 3, borderColor: withAlpha(theme.palettes.tab.white, 0.5), alignItems: "center", justifyContent: "center" },
    value: { fontSize: 40, ...fontFaces.heavy, color: theme.palettes.tab.white, fontVariant: ["tabular-nums"], textAlign: "center" },
    line: { alignItems: "center", gap: 8, alignSelf: "stretch" },
    sub: { fontSize: 15, ...fontFaces.bold, color: c.textSecondary, textAlign: "center" },
    track: { alignSelf: "stretch", height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: c.surfaceSoft, borderWidth: 2, borderColor: c.border, overflow: "hidden" },
    fill: { height: "100%", borderRadius: BAR_HEIGHT / 2, backgroundColor: c.gold },
  };
});

/** The dialog's body needs the card's top padding raised so the burst is not clipped by the scrolling body. */
export const LEVEL_UP_BODY_STYLE = { paddingTop: 16 } as const;

export function LevelUpBody({ level, from, xpIntoLevel = 0 }: { level: number; /** The level before the first one gained (1 to 5: from 1); one level back when left out. */ from?: number; /** XP the learner has earned toward the next level, 0 to 99. */ xpIntoLevel?: number }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const reduced = useReducedMotion();
  // The dialog keeps its last content while it shrinks away: hold the last real level
  const [now, setNow] = useState(level);
  if (level > 0 && level !== now) setNow(level);
  const [start, setStart] = useState(from ?? level - 1);
  if (from != null && level > 0 && from !== start) setStart(from);

  const clock = useDelayedClock(LEVEL_UP_TOTAL, DIALOG_SETTLE_MS);
  const barClock = useDelayedClock(LEVEL_UP.barMs, DIALOG_SETTLE_MS + LEVEL_UP.bar);
  const progress = Math.max(0, Math.min(99, Math.round(xpIntoLevel))) / 100;

  useEffect(() => {
    if (reduced) {
      notifySuccess();
      return;
    }
    const id = setTimeout(notifySuccess, DIALOG_SETTLE_MS + LEVEL_UP.medal + STAMP_LANDS);
    return () => clearTimeout(id);
  }, [reduced]);

  // The rays keep turning and breathing once open (frozen with reduced motion)
  const loopClock = useLoopClock(LEVEL_UP.loopMs, !reduced);
  const raysSpinStyle = useAnimatedStyle(() => {
    const f = levelRaysLoop(loopClock.get());
    return { transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  const raysStyle = useAnimatedStyle(() => {
    const f = levelRays(clock.get());
    return { opacity: f.opacity, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  const fillStyle = useAnimatedStyle(() => ({ width: `${levelBar(barClock.get()) * progress * 100}%` }));

  return (
    <View style={styles.body}>
      <View style={styles.stage}>
        <Animated.View pointerEvents="none" style={[styles.rays, raysStyle]}>
          <Animated.View style={[styles.raysSpin, raysSpinStyle]}>
            <Svg width={STAGE} height={STAGE}>
              {RAY_BANDS.map((band, i) => (
                <Path key={i} d={band.d} fill={withAlpha(c.gold, 0.28 * band.alpha)} />
              ))}
            </Svg>
          </Animated.View>
        </Animated.View>

        <Stamp at={DIALOG_SETTLE_MS + LEVEL_UP.medal}>
          <PopOnce at={DIALOG_SETTLE_MS + LEVEL_UP.pop} sparkleColor={c.gold}>
            <View style={styles.medalBox}>
              <View style={styles.medalLip} />
              <View style={styles.medalFace}>
                <View style={styles.medalRing}>
                  <CountUp
                    from={Math.max(1, Math.min(start, now))}
                    to={now}
                    at={DIALOG_SETTLE_MS + LEVEL_UP.countFrom}
                    duration={LEVEL_UP.countMs}
                    style={styles.value}
                  />
                </View>
              </View>
            </View>
          </PopOnce>
        </Stamp>
        <Burst clock={clock} at={LEVEL_UP.burst} diameter={MEDAL} color={c.gold} reach={BURST.reach + 10} />
      </View>

      <Reveal at={DIALOG_SETTLE_MS + LEVEL_UP.line} style={styles.line}>
        <Text style={styles.sub}>
          {100 - Math.round(progress * 100)} XP to Level {now + 1}
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </Reveal>
    </View>
  );
}

/** The dialog's button: it arrives with the line and cannot be tapped before it can be seen. */
export function LevelUpButton({ children }: { children: ReactNode }) {
  return (
    <Reveal at={DIALOG_SETTLE_MS + LEVEL_UP.button} blockUntilShown>
      {children}
    </Reveal>
  );
}
