/**
 * Phone: the learner's own fictional smartphone (docs/features/PHONE_SPEC.md). A home screen of apps on the learner's
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
import { AppIcon } from "@/components/phone/AppIcon";
import { installStart } from "@/components/phone/phone-fx-core";
import { WALLPAPERS } from "@/components/phone/wallpaper-art";
import { OWN_WALLPAPER, isIllustrated } from "@/components/phone/wallpaper-core";
import { WallpaperLayer } from "@/components/phone/WallpaperLayer";
import { Icon } from "@/components/ui/icon";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { useTutorialTarget } from "@/components/tutorial/use-tutorial-target";
import { useTutorialBusy } from "@/hooks/use-tutorial";
import { emitTutorial } from "@/services/tutorial";
import { usePhone } from "@/hooks/use-phone";
import { usePhoneWallpaper } from "@/hooks/use-phone-wallpaper";
import { useStorage } from "@/services/StorageContext";
import { contentRepository } from "@/services/content-db";
import {
  APPS_PER_PAGE,
  INSTALLS_PER_VISIT,
  PHONE_APPS,
  gridColumns,
  pagesOf,
  unlockRequirement,
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
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";


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
  // A batch is only chosen while the tab is in front: the tab stays mounted under other pages, and a batch picked
  // behind them would play its sound and its install moment where the learner cannot see it
  const [focused, setFocused] = useState(false);
  const versionRef = useRef(0);
  useEffect(() => {
    versionRef.current = phone.version;
  }, [phone.version]);
  const { refresh } = phone;
  useFocusEffect(
    useCallback(() => {
      setMinVersion(versionRef.current + 1);
      setFocused(true);
      refresh();
      return () => {
        setFocused(false);
        setBatch(null);
        // The hand-over has played: the next visit is an ordinary one
        if (introFinished.current) setIntro(false);
      };
    }, [refresh]),
  );
  useEffect(() => {
    if (
      batch !== null ||
      !focused ||
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
  }, [batch, focused, phone.loaded, phone.version, minVersion, phone.newApps, intro]);

  const batchApps = batch ?? [];
  // The hand-over's opening chime, once per batch. Every install, the hand-over's too, pops with `reward.pop` as its icon
  // lands, played by AppIcon on its own install clock.
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
    // A later arrival's pops are played by each icon as it installs (AppIcon), not here
  }, [batch, intro]);
  const done = useRef(new Set<string>());
  // Shrodi's tour waits for the apps of this visit to finish installing, then lights Chats (docs/features/TUTORIAL_SPEC.md §5.3)
  const [installsDone, setInstallsDone] = useState(false);
  const chatsLit = useTutorialTarget("phone.app.chats", { radius: 22 });
  const finished = useCallback(
    (app: PhoneApp, isIntro: boolean) => {
      if (done.current.has(app.id)) return;
      done.current.add(app.id);
      if (batchApps.every((id) => done.current.has(id))) setInstallsDone(true);
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
    if (batch === null) {
      done.current = new Set();
      setInstallsDone(false);
    }
  }, [batch]);
  useTutorialBusy(focused && (!phone.loaded || (batchApps.length > 0 && !installsDone)), "phone installs");

  // What shows: every live app, in catalog order. Installed apps and the ones installing now are open; all the
  // rest (not unlocked yet, or unlocked and waiting for a later visit to install) sit behind a lock.
  const visible = useMemo(() => {
    if (batch === null) return [] as PhoneApp[];
    return PHONE_APPS.filter((a) => a.status === "live");
  }, [batch]);
  const installedIds = useMemo(() => {
    const inBatch = new Set(batch ?? []);
    const seenNow = phone.apps.filter((a) => !phone.newApps.some((n) => n.id === a.id));
    return new Set([...inBatch, ...seenNow.map((a) => a.id)]);
  }, [batch, phone.apps, phone.newApps]);

  // Unit names for "Finish the unit ..." in a locked app's dialog
  const [unitTitles, setUnitTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void contentRepository
      .getUnits()
      .then((units) => {
        if (alive) setUnitTitles(Object.fromEntries(units.map((u) => [u.id, u.title])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const [lockedApp, setLockedApp] = useState<PhoneApp | null>(null);
  const lockedInfo = useMemo(() => {
    if (!lockedApp) return null;
    // Unlocked already, only waiting for its arrival on the next visit
    if (phone.apps.some((a) => a.id === lockedApp.id)) {
      return { text: "You've unlocked this app! It arrives the next time you open your phone.", progress: null };
    }
    return unlockRequirement(lockedApp.unlock, phone.progress, (id) => unitTitles[id]);
  }, [lockedApp, phone.apps, phone.progress, unitTitles]);

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
    if (!installedIds.has(app.id)) {
      setLockedApp(app);
      return;
    }
    void playSfx("phone.app-open");
    phone.markOpened(app.id);
    if (app.id === "chats") emitTutorial("app-opened:chats");
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

      <View style={[styles.wallpaper, { paddingBottom: tabBarInset + 16 }]}>
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
                      const locked = !installedIds.has(app.id);
                      return (
                        <View
                          key={app.id}
                          ref={app.id === "chats" ? chatsLit.ref : undefined}
                          collapsable={false}
                          style={{
                            width: `${100 / cols}%`,
                            alignItems: "center",
                            marginBottom: 20,
                          }}
                        >
                          <AppIcon
                            app={app}
                            size={tile}
                            badge={locked ? null : phone.badgeOf(app)}
                            label={locked ? `${app.name}, locked` : phone.labelOf(app)}
                            locked={locked}
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

      </View>

      <ModalDialog
        visible={lockedApp !== null}
        onClose={() => setLockedApp(null)}
        title={lockedApp?.name ?? ""}
        dismissOnScrim
        footer={<ModalButton label="Got it" onPress={() => setLockedApp(null)} />}
      >
        <View style={styles.lockRow}>
          <View style={[styles.lockBadge, { backgroundColor: withAlpha(c.textMuted, 0.18) }]}>
            <Icon name="Lock" size={26} color={c.textMuted} variant="Bold" />
          </View>
          <View style={styles.lockText}>
            <Text style={[styles.lockHeading, { color: c.text }]}>Locked</Text>
            <Text style={[styles.lockBody, { color: c.text }]}>{lockedInfo?.text}</Text>
          </View>
        </View>
        {lockedInfo?.progress ? (
          <Text style={[styles.lockProgress, { color: c.textMuted }]}>{lockedInfo.progress}</Text>
        ) : null}
      </ModalDialog>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  return {
    container: { flex: 1, overflow: "hidden" },
    wallpaper: { flex: 1 },
    frame: { flex: 1, width: "100%", alignSelf: "center", paddingTop: 8 },
    pager: { flexGrow: 0 },
    // The pager is a horizontal ScrollView, which clips whatever pokes out of the first row (the badge sits 5 dp
    // above its tile and the install pop swells past it), so that room is padding inside the page
    page: { paddingTop: 16 },
    grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 0 },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
    },
    pageDot: { width: 8, height: 8, borderRadius: 4 },
    lockRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    lockBadge: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    lockText: { flex: 1, gap: 2 },
    lockHeading: { fontSize: 13, lineHeight: 18, ...fontFaces.heavy },
    lockBody: { fontSize: 16, lineHeight: 22, ...fontFaces.bold },
    lockProgress: { fontSize: 14, lineHeight: 20, ...fontFaces.bold },
  };
});
