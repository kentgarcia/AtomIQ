/**
 * Myth Buster's start screen, the way a phone app opens: the app's own tile big on top, its name, and the ways to play as cards.
 * Quick Play pushes to a list of units inside the same screen (the header's back goes one step back, then out to the phone).
 * Every way in ends in `/mythbuster?mode=...`; with no mode this screen asks.
 */

import { MythUnitRows, useMythUnits } from "@/components/games/MythUnitList";
import { BandButton } from "@/components/phone/band-header";
import { AppGlyph } from "@/components/phone/AppGlyph";
import { phoneTile } from "@/components/phone/phone-palette";
import { settle } from "@/components/motion/settle";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { GAME_MODES, type ModeConfig } from "@/constants/mythbuster-modes";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import React, { useEffect, useMemo, useState } from "react";
import { BackHandler, Platform, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON = 96;

export function MythBusterStart({ onBack, onPick }: { onBack: () => void; onPick: (mode: ModeConfig, unitId?: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const s = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const tile = phoneTile(c, "purple");
  // Quick Play is a second step: which unit
  const [step, setStep] = useState<"modes" | "units">("modes");
  const { units, deckSizes } = useMythUnits(step === "units");

  const back = () => {
    impactLight();
    if (step === "units") setStep("modes");
    else onBack();
  };
  // Android's back goes one step back too
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "units") {
        setStep("modes");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  return (
    <View style={[s.screen, { paddingTop: insets.top + 12 }]}>
      <View style={s.bar}>
        <BandButton icon="ArrowLeft2" label={step === "units" ? "Back to modes" : "Back to the phone"} onPress={back} color={c.text} />
      </View>
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={settle(0)} style={s.hero}>
          <View style={[s.tileLip, { backgroundColor: tile.lip }]}>
            <View style={[s.tileFace, { backgroundColor: tile.face }]}>
              <AppGlyph id="mythbuster" size={ICON} face={tile.face} lip={tile.lip} />
            </View>
          </View>
          <Text accessibilityRole="header" style={s.name}>
            Myth Buster
          </Text>
          <Text style={s.tag}>{step === "units" ? "Pick a unit to play its 10 statements." : "Fact or myth? Pick how to play."}</Text>
        </Animated.View>

        {step === "modes" ? (
          <Animated.View key="modes" entering={settle(60)} style={s.list}>
            {GAME_MODES.map((mode) => (
              <Card
                key={mode.id}
                onPress={() => {
                  impactLight();
                  if (mode.byUnit) setStep("units");
                  else onPick(mode);
                }}
                accessibilityLabel={`${mode.title}. ${mode.description}`}
                padding={14}
                faceStyle={s.cardFace}
              >
                <View style={[s.modeIcon, { backgroundColor: mode.color }]}>
                  <Icon name={mode.icon} size={24} color={c.onPrimary} variant="Bold" />
                </View>
                <View style={s.copy}>
                  <Text style={s.title}>{mode.title}</Text>
                  <Text style={s.sub}>{mode.description}</Text>
                </View>
                <Icon name="ArrowRight2" size={20} color={c.textMuted} variant="Bold" />
              </Card>
            ))}
          </Animated.View>
        ) : (
          <Animated.View key="units" entering={settle(60)} style={s.list}>
            <Card padding={4}>
              <View style={s.units}>
                <MythUnitRows units={units} deckSizes={deckSizes} onPick={(unit) => onPick(GAME_MODES[0], unit.id)} />
              </View>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    screen: { flex: 1, backgroundColor: c.background },
    bar: { paddingHorizontal: 24 - 12 },
    body: { paddingHorizontal: 20, gap: 20 },
    hero: { alignItems: "center", gap: 8, paddingTop: 4 },
    tileLip: { borderRadius: Math.round(ICON * 0.27), paddingBottom: 6 },
    tileFace: { width: ICON, height: ICON, borderRadius: Math.round(ICON * 0.27), overflow: "hidden" },
    name: { fontSize: 28, lineHeight: 34, marginTop: 8, ...fontFaces.heavy, color: c.text },
    tag: { fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.semibold, color: c.textMuted },
    list: { gap: 14 },
    cardFace: { flexDirection: "row", alignItems: "center", gap: 14 },
    modeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    copy: { flex: 1, gap: 2 },
    title: { fontSize: 17, ...fontFaces.heavy, color: c.text },
    sub: { fontSize: 13, lineHeight: 18, ...fontFaces.medium, color: c.textMuted },
    units: { paddingHorizontal: 10 },
  };
});
