/**
 * One app on the phone's home screen: a rounded-square tile with the 3D face-and-lip look of the lesson map's
 * nodes and, like an iPhone's icons, one bold flat picture on it (`app-icon-art.ts`, `AppGlyph.tsx`; an app with no picture
 * keeps a white icon glyph), the name beneath on a small chip (the wallpaper can be any colour) and a badge on the
 * corner. A press sinks it to 92% and takes the face to the lip colour (reduced motion: only the colour).
 *
 * With `install` it plays the install moment (`phone-fx-core.ts`): an outline in the slot, a ring filling round
 * it, the icon popping in with a burst, then the label and a "New" dot. `onDone` is called once when it ends
 * (at once with reduced motion, where the icon is simply there).
 */

import { memo, useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import Svg, { Rect } from "react-native-svg";

import { AppGlyph, hasGlyph } from "@/components/phone/AppGlyph";
import { APP_ICON_TILE, ICON_TILES } from "@/components/phone/app-icon-art";
import { phoneTile } from "@/components/phone/phone-palette";
import {
  INSTALL,
  INSTALL_CLOCK,
  PRESS,
  installFrame,
} from "@/components/phone/phone-fx-core";
import { Burst } from "@/components/motion/Burst";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { sameIconView, type Badge, type PhoneApp } from "@/services/phone-core";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const LIP = 4;

export interface AppIconProps {
  app: PhoneApp;
  /** Tile size, dp. */
  size: number;
  badge: Badge;
  /** The accessibility label, badge included. */
  label: string;
  onPress: () => void;
  /** A long press (the phone starts arranging its home screen with it). */
  onLongPress?: () => void;
  /** Not on the phone yet: a grey tile with a lock, no picture and no badge. Pressing it explains how to get it. */
  locked?: boolean;
  /** Play the install moment, `delay` ms from mount. Keep it set for the whole visit: it plays once. */
  install?: {
    delay: number;
    onDone: () => void;
    /** Show the "New" dot as it lands. */ newDot: boolean;
  };
}

function AppIconBase({
  app,
  size,
  badge,
  label,
  onPress,
  onLongPress,
  locked = false,
  install,
}: AppIconProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const reduced = useReducedMotion();
  // A white or a dark tile where the picture wants one (iOS-like), else the catalog colour; a locked app is grey
  const own = APP_ICON_TILE[app.id];
  const tile = locked
    ? phoneTile(c, "grey")
    : own
      ? ICON_TILES[own]
      : phoneTile(c, app.color);
  const radius = Math.round(size * 0.27);

  const pressed = useSharedValue(0);
  const clock = useDelayedClock(INSTALL_CLOCK, install?.delay ?? 0, !!install);

  const onDoneRef = useRef(install?.onDone);
  // The newest press handler is what runs: the screen builds a new one on every render, and `sameIcon` below lets the icon skip those renders
  const onPressRef = useRef(onPress);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onDoneRef.current = install?.onDone;
    onPressRef.current = onPress;
    onLongPressRef.current = onLongPress;
  });
  const installing = !!install;
  const delay = install?.delay ?? 0;
  // The pop's sound is the icon's own, on the install clock (the moment the icon lands), so it can never drift from the picture or
  // be cancelled by the screen re-rendering. Reduced motion has no moment, so one pop plays at once.
  useEffect(() => {
    if (!installing) return;
    const timer = setTimeout(() => void playSfx("reward.pop"), reduced ? 0 : delay + INSTALL.popAt);
    return () => clearTimeout(timer);
  }, [installing, delay, reduced]);
  useEffect(() => {
    if (!installing) return;
    // Reduced motion: no moment, the icon is simply there
    const timer = setTimeout(
      () => onDoneRef.current?.(),
      reduced ? 0 : delay + INSTALL_CLOCK,
    );
    return () => clearTimeout(timer);
  }, [installing, delay, reduced]);

  const sink = useAnimatedStyle(() => {
    const f = installFrame(clock.get());
    const p = pressed.get();
    const scale = reduced ? 1 : f.icon * (1 + (PRESS.scale - 1) * p);
    return { opacity: f.iconOpacity, transform: [{ scale }] };
  });
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get() > 0.5 ? tile.lip : tile.face,
  }));
  const outlineStyle = useAnimatedStyle(() => ({
    opacity: installFrame(clock.get()).outline,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: installFrame(clock.get()).label,
  }));
  const badgeStyle = useAnimatedStyle(() => {
    const s = installing ? installFrame(clock.get()).dot : 1;
    return { opacity: s > 0 ? 1 : 0, transform: [{ scale: s }] };
  });

  // The ring is a dashed outline drawn as the rounded rectangle's stroke, filling as the install runs
  const inset = 2;
  const w = size - inset * 2;
  const perimeter = 4 * (w - 2 * radius) + 2 * Math.PI * radius;
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: perimeter * (1 - installFrame(clock.get()).ring),
  }));

  const showBadge = locked
    ? false
    : installing
      ? install?.newDot === true || badge !== null
      : badge !== null;

  return (
    <View style={[styles.cell, { width: size + 20 }]}>
      <Pressable
        onPress={() => onPressRef.current()}
        onLongPress={() => onLongPressRef.current?.()}
        delayLongPress={350}
        onPressIn={() =>
          pressed.set(withTiming(1, { duration: 60, easing: EASE_OUT }))
        }
        onPressOut={() =>
          pressed.set(
            withTiming(0, { duration: PRESS.releaseMs, easing: EASE_OUT }),
          )
        }
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={{ width: size, height: size + LIP }}
      >
        {/* The slot outline and the filling ring, behind the icon, while it installs */}
        {installing ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: size,
                  height: size,
                  borderRadius: radius,
                  borderCurve: "continuous",
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: withAlpha(c.text, 0.35),
                },
                outlineStyle,
              ]}
            />
            <Svg
              pointerEvents="none"
              width={size}
              height={size}
              style={{ position: "absolute", left: 0, top: 0 }}
            >
              <AnimatedRect
                x={inset}
                y={inset}
                width={w}
                height={w}
                rx={radius}
                ry={radius}
                fill="none"
                stroke={tile.face}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={perimeter}
                animatedProps={ringProps}
              />
            </Svg>
          </>
        ) : null}

        <Animated.View style={[{ width: size, height: size + LIP }, sink]}>
          <View
            style={[
              styles.lip,
              {
                top: LIP,
                height: size,
                borderRadius: radius,
                borderCurve: "continuous",
                backgroundColor: tile.lip,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.face,
              { height: size, borderRadius: radius, borderCurve: "continuous" },
              faceStyle,
            ]}
          >
            {locked ? (
              <Icon
                name="Lock"
                size={Math.round(size * 0.46)}
                color={tile.ink}
                variant="Bold"
              />
            ) : hasGlyph(app.id) ? (
              <AppGlyph
                id={app.id}
                size={size}
                face={tile.face}
                lip={tile.lip}
              />
            ) : (
              <Icon
                name={app.icon}
                size={Math.round(size * 0.5)}
                color={tile.ink}
                variant="Bold"
              />
            )}
          </Animated.View>
        </Animated.View>

        {installing ? (
          <Burst
            clock={clock}
            at={INSTALL.popAt}
            diameter={size}
            color={tile.face}
          />
        ) : null}

        {showBadge ? (
          <Animated.View
            pointerEvents="none"
            accessible={false}
            style={[styles.badgeWrap, badgeStyle]}
          >
            {badge?.kind === "count" ? (
              <View
                style={[
                  styles.count,
                  { backgroundColor: c.error, borderColor: c.background },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.countText, { color: c.onPrimary }]}
                >
                  {badge.count > 9 ? "9+" : badge.count}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: c.error, borderColor: c.background },
                ]}
              />
            )}
          </Animated.View>
        ) : null}
      </Pressable>

      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: withAlpha(c.card, 0.92) },
          labelStyle,
        ]}
      >
        <Text numberOfLines={2} style={[styles.name, { color: c.text }]}>
          {app.name}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Two renders of an icon that look the same skip the render (`sameIconView`, tested). The press and install-done handlers are left out on
 * purpose (new functions on every render of the Phone tab, which made every icon, with its SVG picture, re-render on each of the tab's
 * several state changes per visit); the icon calls the newest through a ref instead.
 */
export const AppIcon = memo(AppIconBase, (a, b) => sameIconView(a, b));


const useStyles = createStyles(() => ({
  cell: { alignItems: "center", gap: 8 },
  lip: { position: "absolute", left: 0, right: 0 },
  // overflow hidden: a picture may run to the tile's edge and is cut to its rounded corners
  face: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeWrap: { position: "absolute", top: -5, right: -5 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 11, lineHeight: 14, ...fontFaces.heavy },
  chip: {
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  name: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    ...fontFaces.bold,
  },
}));
