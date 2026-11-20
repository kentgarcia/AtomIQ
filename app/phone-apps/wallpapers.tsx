/**
 * Wallpapers (docs/PHONE_SPEC.md §4): the Phone tab's header button opens this. The first choice is the learner's own avatar paint and pattern
 * (what a new phone wears), then the plain page colour, then five calm illustrated wallpapers. Each is shown as a little phone
 * with a ghost grid of app icons on it; a tap puts it on the phone at once (the choice is a preference, saved on the device).
 */

import { Avatar } from "@/components/avatar/Avatar";
import { avatarBackground, normalizeAvatar } from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { SNOW } from "@/components/lesson/visual/object-art";
import { settle } from "@/components/motion/settle";
import { WALLPAPERS } from "@/components/phone/wallpaper-art";
import { WallpaperLayer } from "@/components/phone/WallpaperLayer";
import { OWN_WALLPAPER, WALLPAPER_CHOICES, WALLPAPER_NAMES, isIllustrated, type WallpaperChoice } from "@/components/phone/wallpaper-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { usePhoneWallpaper } from "@/hooks/use-phone-wallpaper";
import { playSfx } from "@/services/sfx";
import { useStorage } from "@/services/StorageContext";
import { setPhoneWallpaper } from "@/services/storage";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GUTTER = 20;
const GAP = 14;
const COLUMNS = 2;
const ASPECT = 1.7;

/** The ghost grid of app icons on a preview: four columns by three rows of rounded squares, as the phone's grid sits near the top. */
function GhostGrid({ width, color }: { width: number; color: string }) {
  const pad = width * 0.1;
  const cell = (width - pad * 2) / 4;
  const tile = cell * 0.72;
  return (
    <View style={{ position: "absolute", left: pad, right: pad, top: width * 0.26 }} pointerEvents="none">
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: "row", marginBottom: cell * 0.34 }}>
          {[0, 1, 2, 3].map((c) => (
            <View key={c} style={{ width: cell, alignItems: "center" }}>
              <View style={{ width: tile, height: tile, borderRadius: tile * 0.27, backgroundColor: color }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function WallpapersScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { userProfile } = useStorage();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const current = usePhoneWallpaper();
  const look = useMemo(() => normalizeAvatar(userProfile?.avatar_url), [userProfile?.avatar_url]);

  const { width: screenW } = useResponsiveLayout();
  const inner = Math.min(screenW, contentMaxWidth) - GUTTER * 2;
  const tileW = Math.floor((inner - GAP * (COLUMNS - 1)) / COLUMNS);
  const tileH = Math.round(tileW * ASPECT);

  const choose = (choice: WallpaperChoice) => {
    if (choice === current) return;
    void playSfx("ui.select");
    void setPhoneWallpaper(choice).catch(() => undefined);
  };

  const choices = WALLPAPER_CHOICES;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Wallpaper" subtitle={WALLPAPER_NAMES[current]} onBack={() => { void playSfx("phone.app-close"); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/phone"); }} backLabel="Back to the phone" scrolled={scrolled} />
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} showsVerticalScrollIndicator={false} contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.grid}>
          {choices.map((choice, i) => {
            const on = choice === current;
            return (
              <Animated.View key={choice} entering={settle(Math.min(60 * i, 360))} style={{ width: tileW }}>
                <Pressable onPress={() => choose(choice)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${WALLPAPER_NAMES[choice]}${on ? ", on your phone" : ""}`} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <View style={[styles.preview, { width: tileW, height: tileH, borderColor: on ? c.primary : c.border, backgroundColor: isIllustrated(choice) ? WALLPAPERS[choice].base : choice === OWN_WALLPAPER ? avatarBackground(look) : c.mapBackground }]}>
                    {choice === OWN_WALLPAPER ? (
                      <>
                        <PatternLayer pattern={look.pattern} tile={64} />
                        <GhostGrid width={tileW} color={withAlpha(SNOW, 0.55)} />
                        <View style={styles.me}>
                          <Avatar value={userProfile?.avatar_url} size={tileW * 0.34} radius={tileW * 0.17} />
                        </View>
                      </>
                    ) : isIllustrated(choice) ? (
                      <>
                        <WallpaperLayer id={choice} />
                        <GhostGrid width={tileW} color={withAlpha(SNOW, 0.55)} />
                      </>
                    ) : (
                      <GhostGrid width={tileW} color={c.field} />
                    )}
                    {on ? (
                      <View style={[styles.tick, { backgroundColor: c.primary }]}>
                        <Icon name="TickCircle" size={20} color={c.onPrimary} variant="Bold" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.name, on && { color: c.text }]} numberOfLines={1}>
                    {WALLPAPER_NAMES[choice]}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.mapBackground },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, rowGap: 18 },
    preview: { borderRadius: 24, borderWidth: 3, overflow: "hidden" },
    me: { position: "absolute", left: 0, right: 0, bottom: "8%", alignItems: "center" },
    tick: { position: "absolute", right: 8, top: 8, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    name: { marginTop: 8, textAlign: "center", fontSize: 14, lineHeight: 19, ...fontFaces.heavy, color: c.textMuted },
  };
});
