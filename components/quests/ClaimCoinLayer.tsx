/**
 * ClaimCoinLayer — draws the XP coins of a quest claim above everything, and lands them on the
 * counter the Quests header registered (XP or diamonds) or, without one, on the Profile tab of the tab bar. It lives inside the tab bar (which is above every screen) and
 * listens to `claim-fx-bus`: a quest row announces where its claim started, and each announcement
 * plays one flight (`claim-fx-core.ts`), measured against where the Profile tab is right now.
 *
 * The coins are the app's xp.png. A ring flashes on the tab as each one lands. Decorative: hidden
 * from screen readers, never takes a touch. With reduced motion the rows never announce.
 */

import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { useOneShotClock } from "@/components/motion/motion";
import { emitClaimLanding, getClaimTarget, subscribeClaimFlights, type ClaimFlight, type FlightKind } from "@/components/quests/claim-fx-bus";
import { CLAIM_FX, coinFrame, coinSpec, flightTotal, landingRing, SKIP_FILL, type Point } from "@/components/quests/claim-fx-core";
import { playSfx } from "@/services/sfx";
import { createStyles, useTheme } from "@/theme";

const XP_ICON = require("@/assets/images/icons/xp.png");
const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");
const COIN = 28;
const RING = 46;

interface Flight {
  id: number;
  /** In the layer's own space. */
  origin: Point;
  target: Point;
  kind: FlightKind;
  count: number;
  skipFill: boolean;
}

function Coin({ index, count, kind, skipFill, clock, origin, target }: { index: number; count: number; kind: FlightKind; skipFill: boolean; clock: SharedValue<number>; origin: Point; target: Point }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const spec = useMemo(() => coinSpec(index, count), [index, count]);
  // A chest's diamonds (or a fact's XP) have no bar fill to wait for
  const skip = skipFill ? SKIP_FILL : 0;
  const rel = useMemo(() => ({ x: target.x - origin.x, y: target.y - origin.y }), [origin, target]);
  const style = useAnimatedStyle(() => {
    const f = coinFrame(spec, clock.get() + skip, rel);
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { scale: f.scale }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.coin, { left: origin.x - COIN / 2, top: origin.y - COIN / 2, opacity: 0 }, style]}
    >
      <Image source={kind === "diamond" ? DIAMOND_ICON : XP_ICON} style={styles.coinImage} contentFit="contain" />
    </Animated.View>
  );
}

function FlightView({ flight, onDone }: { flight: Flight; onDone: (id: number) => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const skip = flight.skipFill ? SKIP_FILL : 0;
  const total = flightTotal(flight.count) - skip;
  const clock = useOneShotClock(total, true, false);

  useEffect(() => {
    const id = setTimeout(() => onDone(flight.id), total);
    return () => clearTimeout(id);
  }, [flight.id, total, onDone]);

  // Sound (docs/features/SFX_SPEC.md §6.5), in the order the flight plays: the coins pop out of the bar (or the
  // chest) with one pop, then a tick as each one lands, a step higher than the last. A chest's
  // diamonds end on the coin cue; an XP claim's coin cue is played by the quest row at CLAIM_AT.
  useEffect(() => {
    const appear = setTimeout(() => void playSfx("reward.appear"), Math.max(0, CLAIM_FX.scatterStart - skip));
    const timers = Array.from({ length: flight.count }, (_, i) => {
      const lands = CLAIM_FX.magnetStart + i * CLAIM_FX.magnetStagger + CLAIM_FX.magnetDuration - skip;
      const last = i === flight.count - 1;
      return setTimeout(() => {
        if (flight.kind === "diamond" && last) void playSfx("reward.coin");
        else void playSfx("ui.tick", { index: i });
        // The counter that shows the total takes this coin's share now (counter-core.ts)
        emitClaimLanding({ kind: flight.kind, index: i, count: flight.count });
      }, Math.max(0, lands));
    });
    return () => {
      clearTimeout(appear);
      timers.forEach(clearTimeout);
    };
  }, [flight.count, flight.kind, skip]);

  const ringStyle = useAnimatedStyle(() => {
    const r = landingRing(clock.get() + skip, flight.count);
    return { opacity: r.opacity, transform: [{ scale: r.scale }] };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { left: flight.target.x - RING / 2, top: flight.target.y - RING / 2, opacity: 0 }, ringStyle]}
      />
      {Array.from({ length: flight.count }, (_, i) => (
        <Coin key={i} index={i} count={flight.count} kind={flight.kind} skipFill={flight.skipFill} clock={clock} origin={flight.origin} target={flight.target} />
      ))}
    </>
  );
}

export interface ClaimCoinLayerProps {
  /** The tab bar's row of tabs: the Profile tab is its last slot. */
  tabsRowRef: RefObject<React.ComponentRef<typeof View> | null>;
  tabCount: number;
}

function ClaimCoinLayerBase({ tabsRowRef, tabCount }: ClaimCoinLayerProps) {
  const layerRef = useRef<React.ComponentRef<typeof View>>(null);
  const [flights, setFlights] = useState<Flight[]>([]);

  const start = useCallback(
    (announced: ClaimFlight) => {
      const layer = layerRef.current;
      const row = tabsRowRef.current;
      if (!layer || !row) return;
      // Where the layer is in the window right now; the coins land on the screen's own counter when it
      // registered one and is on screen, otherwise on the Profile tab
      layer.measureInWindow((lx: number, ly: number) => {
        const origin = { x: announced.origin.x - lx, y: announced.origin.y - ly };
        const fly = (target: Point) =>
          setFlights((cur) => [...cur, { id: announced.id, origin, target, kind: announced.kind, count: announced.count, skipFill: announced.skipFill }]);
        const toTab = () =>
          row.measureInWindow((rx: number, ry: number, rw: number, rh: number) => {
            const tabWidth = rw / Math.max(1, tabCount);
            fly({ x: rx + rw - tabWidth / 2 - lx, y: ry + rh / 2 - ly });
          });
        const landing = getClaimTarget(announced.kind)?.current;
        if (!landing) return toTab();
        landing.measureInWindow((tx: number, ty: number, tw: number, th: number) => {
          // A counter that is not on screen measures as nothing: use the tab instead
          if (!(tw > 0 && th > 0)) return toTab();
          fly({ x: tx + tw / 2 - lx, y: ty + th / 2 - ly });
        });
      });
    },
    [tabsRowRef, tabCount],
  );

  useEffect(() => subscribeClaimFlights(start), [start]);

  const done = useCallback((id: number) => setFlights((cur) => cur.filter((f) => f.id !== id)), []);

  return (
    <View
      ref={layerRef}
      collapsable={false}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={StyleSheetAbsoluteFill}
    >
      {flights.map((f) => (
        <FlightView key={f.id} flight={f} onDone={done} />
      ))}
    </View>
  );
}

const StyleSheetAbsoluteFill = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } as const;

export const ClaimCoinLayer = memo(ClaimCoinLayerBase);

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    coin: { position: "absolute", width: COIN, height: COIN },
    coinImage: { width: COIN, height: COIN },
    /** Yellow: visible on the white bar and on the blue map alike */
    ring: {
      position: "absolute",
      width: RING,
      height: RING,
      borderRadius: RING / 2,
      borderWidth: 3,
      borderColor: c.lessonHeader,
    },
  };
});
