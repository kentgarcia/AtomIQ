/**
 * HeaderCurrency — the learner's XP and diamonds in the Quests header (right side): an icon and a
 * number each. The two icons are where the claim animation lands: the XP coins of a quest and the
 * diamonds of a chest fly here (`claim-fx-bus` landing targets), and the numbers update as they arrive.
 */

import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { HeaderStat } from "@/components/layout/HeaderStat";
import { registerClaimTarget } from "@/components/quests/claim-fx-bus";
import { useCounterPulse } from "@/components/quests/use-counter-pulse";
import { Text } from "@/components/ui/text";
import { useDiamonds } from "@/hooks/use-wallet";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, useTheme } from "@/theme";

const XP_ICON = require("@/assets/images/icons/xp.png");
const DIAMOND_ICON = require("@/assets/images/icons/diamond.png");
const ICON = 26;

export function HeaderCurrency() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { userProfile } = useStorage();
  const diamonds = useDiamonds();
  // The numbers wait for the coins: each one that lands adds its share and the counter pulses
  const xp = useCounterPulse("xp", userProfile?.total_xp ?? 0);
  const diamondCount = useCounterPulse("diamond", diamonds);

  const xpRef = useRef<React.ComponentRef<typeof View>>(null);
  const diamondRef = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => {
    const stopXp = registerClaimTarget("xp", xpRef);
    const stopDiamond = registerClaimTarget("diamond", diamondRef);
    return () => {
      stopXp();
      stopDiamond();
    };
  }, []);

  return (
    <View style={styles.row}>
      <HeaderStat kind="xp" amount={userProfile?.total_xp ?? 0} style={styles.item} accessibilityLabel={`${xp.shown} XP`}>
        <Animated.View style={[styles.item, xp.pulseStyle]}>
          <View ref={xpRef} collapsable={false} style={styles.icon}>
            <Image source={XP_ICON} style={styles.image} contentFit="contain" />
          </View>
          <Text style={[styles.value, { color: theme.colors.primaryLight }]}>{xp.shown}</Text>
        </Animated.View>
      </HeaderStat>
      <HeaderStat kind="diamonds" amount={diamonds} style={styles.item} accessibilityLabel={`${diamondCount.shown} diamonds`}>
        <Animated.View style={[styles.item, diamondCount.pulseStyle]}>
          <View ref={diamondRef} collapsable={false} style={styles.icon}>
            <Image source={DIAMOND_ICON} style={styles.image} contentFit="contain" />
          </View>
          <Text style={[styles.value, { color: theme.colors.info }]}>{diamondCount.shown}</Text>
        </Animated.View>
      </HeaderStat>
    </View>
  );
}

const makeStyles = createStyles(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  icon: { width: ICON, height: ICON },
  image: { width: ICON, height: ICON },
  value: { fontSize: 20, ...fontFaces.heavy },
}));
