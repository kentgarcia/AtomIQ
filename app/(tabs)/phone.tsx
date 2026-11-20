/**
 * Phone: the learner's own fictional smartphone (docs/PHONE_SPEC.md). A home screen of apps on the learner's
 * paint and pattern. Apps are pushed routes above the tabs, so the tab bar is hidden inside them and back is the
 * home button. The phone starts with a few apps and installs more as the learner progresses (`services/phone-core.ts`);
 * each arrival plays an install moment here, and the very first open hands the phone over with a line from Shrodi.
 */

import {
  avatarBackground,
  normalizeAvatar,
} from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { HeaderButton, ScreenHeader, useTabBarInset } from "@/components/layout";
import { contrastBetween } from "@/components/lesson/visual/color-math";
import { settle } from "@/components/motion/settle";
import { AppIcon } from "@/components/phone/AppIcon";
import { INSTALL, installStart, introLineAt } from "@/components/phone/phone-fx-core";
import { WALLPAPERS } from "@/components/phone/wallpaper-art";
import { OWN_WALLPAPER, isIllustrated } from "@/components/phone/wallpaper-core";
import { WallpaperLayer } from "@/components/phone/WallpaperLayer";
import { Text } from "@/components/ui/text";
import { usePhone } from "@/hooks/use-phone";
import { usePhoneWallpaper } from "@/hooks/use-phone-wallpaper";
import { useStorage } from "@/services/StorageContext";
import {
  APPS_PER_PAGE,
  INSTALLS_PER_VISIT,
  gridColumns,
  pagesOf,
  type PhoneApp,
} from "@/services/phone-core";
import { playSfx, playSfxSequence, warmSfxGroup } from "@/services/sfx";
import { getPhoneIntroSeen, setPhoneIntroSeen } from "@/services/storage";
import {
  createStyles,
  fontFaces,
  useResponsiveLayout,
  useTheme,
  withAlpha,
} from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

const SHRODI = require("@/assets/images/mascot/happy.png");

/** The hand-over brings all five starting apps in; later visits bring in at most `INSTALLS_PER_VISIT`. */
const INTRO_APPS = 5;

export default function PhoneScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const tabBarInset = useTabBarInset();
  const { contentMaxWidth, width } = useResponsiveLayout();
  const { userProfile } = useStorage();
  const phone = usePhone();
  const wallpaper = usePhoneWallpaper();

  // The first open of the phone ever (a one-time hand-over); null until read
  const [intro, setIntro] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void getPhoneIntroSeen()
      .then((seen) => alive && setIntro(!seen))
      .catch(() => alive && setIntro(false));
    return () => {
      alive = false;
    };
  }, []);

  // The apps installing during this visit, fixed when the phone first has them so the batch does not shift as
  // each one lands. A new visit (the tab gaining focus again) takes a new batch.
  const [batch, setBatch] = useState<string[] | null>(null);
  const introFinished = useRef(false);
  // Progress made on another tab is what puts an app on the phone, so each visit reads again and waits for that
  // read before choosing what to install (a read that started before the tab gained focus may be stale)
  const [minVersion, setMinVersion] = useState(0);
  const versionRef = useRef(0);
  useEffect(() => {
    versionRef.current = phone.version;
  }, [phone.version]);
  const { refresh } = phone;
  useFocusEffect(
    useCallback(() => {
      setMinVersion(versionRef.current + 1);
      refresh();
      return () => {
        setBatch(null);
        // The hand-over has played: the next visit is an ordinary one
        if (introFinished.current) setIntro(false);
      };
    }, [refresh]),
  );
  useEffect(() => {
    if (
      batch !== null ||
      !phone.loaded ||
      phone.version < minVersion ||
      intro === null
    )
      return;
    setBatch(
      phone.newApps
        .slice(0, intro ? INTRO_APPS : INSTALLS_PER_VISIT)
        .map((a) => a.id),
    );
  }, [batch, phone.loaded, phone.version, minVersion, phone.newApps, intro]);

  const batchApps = batch ?? [];
  const reduced = useReducedMotion();
  // The sounds of a batch, once per batch: the hand-over is one short run of three; a later arrival is the install at
  // the pop of `reward.pop` as it lands (the same clock as AppIcon's install moment). Reduced motion has no moment, so
  // one pop plays.
  const soundedBatch = useRef<string[] | null>(null);
  useEffect(() => {
    warmSfxGroup("phone");
  }, []);
  useEffect(() => {
    if (batch === null || batch.length === 0 || intro === null || soundedBatch.current === batch) return;
    soundedBatch.current = batch;
    if (intro) {
      return playSfxSequence([
        { cue: "phone.start-1", at: 0 },
        { cue: "phone.start-2", at: 230 },
        { cue: "phone.start-3", at: 460 },
      ]);
    }
    if (reduced) {
      void playSfx("reward.pop");
      return;
    }
    const timers = batch.map((_, i) => setTimeout(() => void playSfx("reward.pop"), installStart(i) + INSTALL.popAt));
    return () => timers.forEach(clearTimeout);
  }, [batch, intro, reduced]);
  const done = useRef(new Set<string>());
  const finished = useCallback(
    (app: PhoneApp, isIntro: boolean) => {
      if (done.current.has(app.id)) return;
      done.current.add(app.id);
      // The starting apps arrive already opened (no "New" dot on five icons at once)
      phone.markSeen(app.id, isIntro);
      if (isIntro && batchApps.every((id) => done.current.has(id))) {
        introFinished.current = true;
        void setPhoneIntroSeen();
      }
    },
    [phone, batchApps],
  );
  // A visit's `done` is for that visit's batch only
  useEffect(() => {
    if (batch === null) done.current = new Set();
  }, [batch]);

  // What shows: installed apps and the ones installing now. Apps waiting for a later visit stay off the grid.
  const visible = useMemo(() => {
    if (batch === null) return [] as PhoneApp[];
    const inBatch = new Set(batch);
    const seenNow = new Set(
      phone.apps
        .filter((a) => !phone.newApps.some((n) => n.id === a.id))
        .map((a) => a.id),
    );
    return phone.apps.filter((a) => inBatch.has(a.id) || seenNow.has(a.id));
  }, [batch, phone.apps, phone.newApps]);

  const cols = gridColumns(width);
  const pages = useMemo(() => pagesOf(visible, APPS_PER_PAGE), [visible]);
  const [page, setPage] = useState(0);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w > 0) setPage(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  const look = useMemo(
    () => normalizeAvatar(userProfile?.avatar_url),
    [userProfile?.avatar_url],
  );
  const frameWidth = Math.min(width, contentMaxWidth);
  const gutter = 16;
  const tile = Math.max(
    52,
    Math.min(68, Math.floor((frameWidth - gutter * 2) / cols - 28)),
  );

  const open = (app: PhoneApp) => {
    void playSfx("phone.app-open");
    phone.markOpened(app.id);
    router.push(app.route as never);
  };

  // The header's text sits on the wallpaper: on the learner's paint (the default) it is whichever of the theme's text and page colours
  // reads better; the plain wallpaper is the page colour with the theme's text; an illustrated one names its own ink
  const illustrated = isIllustrated(wallpaper) ? WALLPAPERS[wallpaper] : null;
  const own = wallpaper === OWN_WALLPAPER;
  const paint = illustrated ? illustrated.base : own ? avatarBackground(look) : c.mapBackground;
  const ink =
    illustrated?.ink ??
    (own
      ? contrastBetween(paint, c.text) >= contrastBetween(paint, c.mapBackground)
        ? c.text
        : c.mapBackground
      : c.text);

  const showIntroLine = intro === true && batchApps.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: paint }]}>
      {/* The wallpaper, behind the header too: an illustrated one, the learner's own paint and pattern, or nothing but the page colour */}
      {isIllustrated(wallpaper) ? (
        <WallpaperLayer id={wallpaper} />
      ) : own ? (
        <PatternLayer pattern={look.pattern} tile={96} />
      ) : null}
      {/* The app's usual header, with the wallpaper showing through it; its button opens the wallpapers */}
      <ScreenHeader
        title="Phone"
        transparent
        color={ink}
        right={
          <HeaderButton
            icon="Gallery"
            label="Wallpapers"
            color={ink}
            onPress={() => {
              void playSfx("phone.app-open");
              router.push("/phone-apps/wallpapers" as never);
            }}
          />
        }
      />

      <View style={styles.wallpaper}>
        <View style={[styles.frame, { maxWidth: contentMaxWidth }]}>
          {/* Nothing is drawn until the phone knows what is installing, so no finished icon shows for a frame first */}
          {batch !== null ? (
            <ScrollView
              horizontal
              pagingEnabled
              scrollEnabled={pages.length > 1}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              style={styles.pager}
            >
              {pages.map((pageApps, p) => (
                <View key={p} style={[styles.page, { width: frameWidth }]}>
                  <View style={[styles.grid, { paddingHorizontal: gutter }]}>
                    {pageApps.map((app) => {
                      const batchIndex = batchApps.indexOf(app.id);
                      return (
                        <View
                          key={app.id}
                          style={{
                            width: `${100 / cols}%`,
                            alignItems: "center",
                            marginBottom: 20,
                          }}
                        >
                          <AppIcon
                            app={app}
                            size={tile}
                            badge={phone.badgeOf(app)}
                            label={phone.labelOf(app)}
                            onPress={() => open(app)}
                            install={
                              batchIndex >= 0
                                ? {
                                    delay: installStart(batchIndex),
                                    onDone: () => finished(app, intro === true),
                                    newDot:
                                      intro !== true && !phone.openedOf(app),
                                  }
                                : undefined
                            }
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {pages.length > 1 ? (
            <View
              style={styles.dots}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pageDot,
                    {
                      backgroundColor:
                        i === page ? c.card : withAlpha(c.card, 0.5),
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {showIntroLine ? (
          <View
            style={[
              styles.introWrap,
              { paddingBottom: tabBarInset + 16, maxWidth: contentMaxWidth },
            ]}
            pointerEvents="none"
          >
            {/* The line arrives once the last icon has popped in */}
            <IntroLine delay={introLineAt(batchApps.length)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function IntroLine({ delay }: { delay: number }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  return (
    <Animated.View entering={settle(delay)} style={styles.introRow}>
      <Image
        source={SHRODI}
        style={styles.shrodi}
        resizeMode="contain"
        accessible={false}
      />
      <View
        style={[
          styles.bubble,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <Text style={[styles.bubbleText, { color: c.text }]}>
          This is your phone. New apps arrive as you learn.
        </Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = createStyles((theme) => {
  return {
    container: { flex: 1, overflow: "hidden" },
    wallpaper: { flex: 1 },
    frame: { flex: 1, width: "100%", alignSelf: "center", paddingTop: 24 },
    pager: { flexGrow: 0 },
    page: {},
    grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 0 },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    },
    pageDot: { width: 8, height: 8, borderRadius: 4 },
    introWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignSelf: "center",
      width: "100%",
      paddingHorizontal: 16,
    },
    introRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    shrodi: { width: 72, height: 72 },
    bubble: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 2,
      borderBottomWidth: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
    },
    bubbleText: { fontSize: 15, lineHeight: 21, ...fontFaces.bold },
  };
});
