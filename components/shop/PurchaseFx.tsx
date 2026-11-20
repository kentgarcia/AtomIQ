/**
 * The buying moment drawn (timeline in `purchase-fx-core.ts`): diamonds fly from the balance to the avatar, a "-price"
 * rises from the balance, and when the last one lands a burst goes off round the avatar. It fills the preview, never takes a
 * touch, and with reduced motion draws nothing (the screen then puts the item on at once). `clock` is the moment's clock in
 * ms; `from` is the middle of the balance and `to` the middle of the avatar, in this view's own space.
 */

import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, type SharedValue } from "react-native-reanimated";

import { Burst } from "@/components/motion/Burst";
import { Text } from "@/components/ui/text";
import { fontFaces } from "@/theme";

import { PURCHASE, coinFrame, coinCount, labelFrame, landMs, type Point } from "./purchase-fx-core";

const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");
const LABEL_WIDTH = 80;

const Coin = memo(function Coin({ i, clock, from, to }: { i: number; clock: SharedValue<number>; from: Point; to: Point }) {
  const anim = useAnimatedStyle(() => {
    const f = coinFrame(i, clock.get(), from, to);
    return { opacity: f.opacity, transform: [{ translateX: f.x - PURCHASE.size / 2 }, { translateY: f.y - PURCHASE.size / 2 }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: PURCHASE.size, height: PURCHASE.size, opacity: 0 }, anim]}>
      <Image source={DIAMOND_ICON} style={{ width: PURCHASE.size, height: PURCHASE.size }} contentFit="contain" />
    </Animated.View>
  );
});

const SpendLabel = memo(function SpendLabel({ clock, from, price, color }: { clock: SharedValue<number>; from: Point; price: number; color: string }) {
  const anim = useAnimatedStyle(() => {
    const f = labelFrame(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.y }, { scale: f.scale }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: from.x - LABEL_WIDTH / 2, top: from.y + 22, width: LABEL_WIDTH, alignItems: "center", opacity: 0 }, anim]}>
      <Text style={{ fontSize: 18, ...fontFaces.heavy, color, fontVariant: ["tabular-nums"] }}>{`-${price}`}</Text>
    </Animated.View>
  );
});

export const PurchaseFx = memo(function PurchaseFx({
  clock,
  price,
  from,
  to,
  burstColor,
  labelColor,
  diameter,
}: {
  clock: SharedValue<number>;
  price: number;
  from: Point;
  to: Point;
  burstColor: string;
  labelColor: string;
  /** The avatar's width, px: the ring round it. */
  diameter: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const count = coinCount(price);
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <Coin key={i} i={i} clock={clock} from={from} to={to} />
      ))}
      {price > 0 ? <SpendLabel clock={clock} from={from} price={price} color={labelColor} /> : null}
      {/* The burst centres itself on its parent: a zero-size view at the avatar */}
      <View style={{ position: "absolute", left: to.x, top: to.y, width: 0, height: 0 }}>
        <Burst clock={clock} at={landMs(count)} diameter={diameter} color={burstColor} reach={diameter * 0.55} />
      </View>
    </View>
  );
});
