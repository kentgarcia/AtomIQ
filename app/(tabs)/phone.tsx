/**
 * Phone: the learner's own fictional smartphone (docs/features/PHONE_SPEC.md). A home screen of apps on the learner's
 * paint and pattern. Apps are pushed routes above the tabs, so the tab bar is hidden inside them and back is the
 * home button. The phone starts with a few apps and installs more as the learner progresses (`services/phone-core.ts`);
 * each arrival plays an install moment here, and the very first open hands the phone over with a line from Shrodi.
 */

import { useRenderTimer } from "@/components/dev/render-timer";
import {
  avatarBackground,
  normalizeAvatar,
} from "@/components/avatar/avatar-core";
import { PatternLayer } from "@/components/avatar/PatternLayer";
import { HeaderButton, ScreenHeader, useTabBarInset } from "@/components/layout";
import { contrastBetween } from "@/components/lesson/visual/color-math";
import { AppIcon } from "@/components/phone/AppIcon";
import { ChoiceDialog } from "@/components/phone/ChoiceDialog";
import { FolderDialog } from "@/components/phone/FolderDialog";
import { FolderIcon } from "@/components/phone/FolderIcon";
import { LayoutBar } from "@/components/phone/LayoutBar";
import { PhoneBoot } from "@/components/phone/PhoneBoot";
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
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { usePhoneWallpaper } from "@/hooks/use-phone-wallpaper";
import { useStorage } from "@/services/StorageContext";
import { contentRepository } from "@/services/content-db";
import {
  INSTALLS_PER_VISIT,
  PHONE_APPS,
  gridColumns,
  gridRows,
  pagesOf,
  unlockRequirement,
  type PhoneApp,
} from "@/services/phone-core";
import {
  FOLDER_NAMES,
  addToFolder,
  createFolder,
  dissolveFolder,
  homeEntries,
  moveAfter,
  moveBefore,
  renameFolder,
  takeOut,
  type HomeEntry,
} from "@/services/phone-layout-core";
import { useSfxSet } from "@/components/motion/use-sfx-set";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { playSfx, playSfxSequence } from "@/services/sfx";
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
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";


/** The hand-over brings all five starting apps in; later visits bring in at most `INSTALLS_PER_VISIT`. */
const INTRO_APPS = 5;
/** What the page leaves to the header, the page dots and the wallpaper's padding, dp, and what an icon's name and gap add to its tile. */
const PAGE_CHROME = 150;
const ROW_EXTRA = 40;
/** What the arranging bar takes from the page while it is up, dp. */
const EDIT_BAR = 90;

export default function PhoneScreen() {
  useRenderTimer("/phone");
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const tabBarInset = useTabBarInset();
  const { contentMaxWidth, width } = useResponsiveLayout();
  const { height: windowHeight } = useWindowDimensions();
  const { userProfile } = useStorage();
  const phone = usePhone();
  const wallpaper = usePhoneWallpaper();
  // How the learner arranged the home screen, and the arranging itself: `picked` is the icon (an app id or a folder id) being moved
  const arranger = usePhoneLayout();
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ mode: "new"; appId: string } | { mode: "rename"; folderId: string } | null>(null);
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  // Apps that live in a folder have no icon of their own on the grid to play an install moment on
  const inFolder = useMemo(() => new Set(arranger.layout.items.flatMap((i) => (i.kind === "folder" ? i.apps : []))), [arranger.layout]);

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
  // The grid is drawn once the phone first knows what is installing, and then STAYS: it used to be torn down every time the tab lost focus
  // (the batch went null and every icon unmounted) and built again on return, a 230 to 280 ms frame on every visit. A later visit only
  // re-chooses the batch; an app waiting to install shows behind its lock until then, as it always did.
  const [gridDrawn, setGridDrawn] = useState(false);
  const introFinished = useRef(false);
  // The power-on screen (components/phone/PhoneBoot.tsx), only on the very first open and never with animation off. It is the phone's
  // loading: stage 0 plays it, 1 mounts the icon grid behind it (the heavy frame, while nothing moves), 2 lifts it and starts the installs,
  // 3 is over (and the value of every ordinary visit).
  const reduced = useReducedMotion();
  const [bootStage, setBootStage] = useState(0);
  const booting = intro === true && !reduced && bootStage < 3;
  const stage = booting ? bootStage : 3;
  const [gridLaidOut, setGridLaidOut] = useState(false);
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
        // The hand-over has played: the next visit is an ordinary one; one left half way starts the power-on again
        if (introFinished.current) setIntro(false);
        else setBootStage(0);
      };
    }, [refresh]),
  );
  useEffect(() => {
    if (!focused || !phone.loaded || !arranger.loaded || phone.version < minVersion || intro === null) return;
    // During the power-on the grid waits for stage 1 and the installs for stage 2
    if (stage >= 1 && !gridDrawn) setGridDrawn(true);
    if (stage >= 2 && batch === null) {
      setBatch(
        phone.newApps
          .filter((a) => !inFolder.has(a.id))
          .slice(0, intro ? INTRO_APPS : INSTALLS_PER_VISIT)
          .map((a) => a.id),
      );
    }
  }, [batch, gridDrawn, stage, focused, phone.loaded, arranger.loaded, inFolder, phone.version, minVersion, phone.newApps, intro]);
  // An app that arrives inside a folder is simply seen (the folder wears the "New" dot): there is no icon to play its install on
  const folderSeen = useRef(new Set<string>());
  const { markSeen } = phone;
  useEffect(() => {
    if (!focused || !phone.loaded || !arranger.loaded || stage < 2) return;
    for (const a of phone.newApps) {
      if (inFolder.has(a.id) && !folderSeen.current.has(a.id)) {
        folderSeen.current.add(a.id);
        markSeen(a.id, false);
      }
    }
  }, [focused, phone.loaded, arranger.loaded, stage, phone.newApps, inFolder, markSeen]);

  const batchApps = batch ?? [];
  // The hand-over's opening chime, once per batch. Every install, the hand-over's too, pops with `reward.pop` as its icon
  // lands, played by AppIcon on its own install clock.
  const soundedBatch = useRef<string[] | null>(null);
  useSfxSet("phone");
  useEffect(() => {
    if (batch === null || batch.length === 0 || intro === null || soundedBatch.current === batch) return;
    soundedBatch.current = batch;
    // With the power-on, its own chime has played already
    if (intro && !booting) {
      return playSfxSequence([
        { cue: "phone.start-1", at: 0 },
        { cue: "phone.start-2", at: 230 },
        { cue: "phone.start-3", at: 460 },
      ]);
    }
    // A later arrival's pops are played by each icon as it installs (AppIcon), not here
  }, [batch, intro, booting]);
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
  useTutorialBusy(focused && (booting || !phone.loaded || (batchApps.length > 0 && !installsDone)), "phone installs");

  // What is installed: the apps of this visit's batch and the ones seen before. Everything else waits behind a lock.
  const installedIds = useMemo(() => {
    const inBatch = new Set(batch ?? []);
    const seenNow = phone.apps.filter((a) => !phone.newApps.some((n) => n.id === a.id));
    return new Set([...inBatch, ...seenNow.map((a) => a.id)]);
  }, [batch, phone.apps, phone.newApps]);
  // What shows: the installed icons in the learner's own order (the progression order until they arrange it), folders where they put
  // them, and then the next few apps still to come behind a lock (components/phone via services/phone-layout-core.ts)
  const entries = useMemo<HomeEntry[]>(() => {
    if (!gridDrawn || !arranger.loaded) return [];
    return homeEntries(arranger.layout, PHONE_APPS, (id) => installedIds.has(id));
  }, [gridDrawn, arranger.loaded, arranger.layout, installedIds]);

  // Unit names for "Finish the unit ..." in a locked app's dialog
  const [unitTitles, setUnitTitles] = useState<Record<string, string>>({});
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    void contentRepository
      .getLessons()
      .then((lessons) => {
        if (alive) setLessonTitles(Object.fromEntries(lessons.map((l) => [l.id, l.title])));
      })
      .catch(() => {});
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
    return unlockRequirement(lockedApp.unlock, phone.progress, (id) => unitTitles[id], (id) => lessonTitles[id]);
  }, [lockedApp, phone.apps, phone.progress, unitTitles, lessonTitles]);

  const cols = gridColumns(width);
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

  // As many rows on a page as the screen has room for (the header, the page dots and the tab bar take theirs first)
  // (the arranging bar takes its room too while it is up)
  const rows = gridRows(windowHeight - PAGE_CHROME - (editing ? EDIT_BAR : 0) - tabBarInset - 32, tile + ROW_EXTRA);
  const perPage = cols * rows;
  const pages = useMemo(() => pagesOf(entries, perPage), [entries, perPage]);

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

  // The icons skip a render that only brings new handlers (`sameIconView`), so what they hold must never go stale: these two never change
  // and always call the newest `open` and `finished`
  // Arranging: the key of a home-screen item is its app id, or its folder id
  const keyOf = (e: HomeEntry) => (e.kind === "app" ? e.app.id : e.id);
  const shown = entries.filter((e) => !(e.kind === "app" && e.locked)).map(keyOf);
  const pickedAt = picked === null ? -1 : shown.indexOf(picked);
  const pickedEntry = entries.find((e) => keyOf(e) === picked);
  // Tapping while arranging: pick an icon, then tap where it goes (before that icon, or into a folder)
  const place = (key: string, targetIsFolder: boolean) => {
    if (picked === null) return setPicked(key);
    if (picked === key) return setPicked(null);
    const pickedIsFolder = arranger.layout.items.some((i) => i.kind === "folder" && i.id === picked);
    const from = picked;
    arranger.update((l) => (targetIsFolder && !pickedIsFolder ? addToFolder(l, from, key) : moveBefore(l, from, key)));
    setPicked(null);
  };
  const pressApp = (app: PhoneApp) => {
    if (!editing || !installedIds.has(app.id)) return open(app);
    place(app.id, false);
  };
  const pressFolder = (id: string) => (editing ? place(id, true) : setOpenFolderId(id));
  // A long press starts arranging with that icon picked
  const startArranging = (key: string) => {
    void playSfx("ui.tab");
    setEditing(true);
    setPicked(key);
  };
  const stopArranging = () => {
    setEditing(false);
    setPicked(null);
  };

  const latest = useRef({ open, finished, pressApp, startArranging });
  useEffect(() => {
    latest.current = { open, finished, pressApp, startArranging };
  });
  const openApp = useCallback((app: PhoneApp) => latest.current.pressApp(app), []);
  const longPressApp = useCallback((app: PhoneApp) => latest.current.startArranging(app.id), []);
  const finishApp = useCallback((app: PhoneApp, isIntro: boolean) => latest.current.finished(app, isIntro), []);

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
        <PatternLayer pattern={look.pattern} background={look.background} tile={96} />
      ) : null}
      {/* The app's usual header, with the wallpaper showing through it; its button opens the wallpapers */}
      <ScreenHeader
        title="Phone"
        transparent
        color={ink}
        right={
          <View style={styles.headerButtons}>
            {editing ? (
              <HeaderButton icon="TickCircle" label="Done arranging" color={ink} onPress={stopArranging} />
            ) : (
              <>
                <HeaderButton icon="Edit2" label="Arrange apps" color={ink} onPress={() => setEditing(true)} />
                <HeaderButton
                  icon="Gallery"
                  label="Wallpapers"
                  color={ink}
                  onPress={() => {
                    void playSfx("phone.app-open");
                    router.push("/phone-apps/wallpapers" as never);
                  }}
                />
              </>
            )}
          </View>
        }
      />

      <View style={[styles.wallpaper, { paddingBottom: tabBarInset + 16 }]}>
        <View style={[styles.frame, { maxWidth: contentMaxWidth }]}>
          {/* Nothing is drawn until the phone knows what is installing, so no finished icon shows for a frame first */}
          {gridDrawn ? (
            <ScrollView
              horizontal
              pagingEnabled
              scrollEnabled={pages.length > 1}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              onLayout={() => setGridLaidOut(true)}
              style={styles.pager}
            >
              {pages.map((pageApps, p) => (
                <View key={p} style={[styles.page, { width: frameWidth }]}>
                  <View style={[styles.grid, { paddingHorizontal: gutter }]}>
                    {pageApps.map((entry) => {
                      if (entry.kind === "folder") {
                        return (
                          <View key={entry.id} collapsable={false} style={[styles.cell, { width: `${100 / cols}%` }]}>
                            <View style={[styles.pickRing, editing && picked === entry.id && { borderColor: c.card }]}>
                              <FolderIcon
                                name={entry.name}
                                members={entry.members}
                                size={tile}
                                dot={entry.members.some((m) => !m.locked && phone.badgeOf(m.app) !== null)}
                                label={`${entry.name} folder, ${entry.members.filter((m) => !m.locked).length} apps`}
                                onPress={() => pressFolder(entry.id)}
                                onLongPress={() => startArranging(entry.id)}
                              />
                            </View>
                          </View>
                        );
                      }
                      const app = entry.app;
                      const batchIndex = batchApps.indexOf(app.id);
                      const locked = entry.locked;
                      return (
                        <View
                          key={app.id}
                          ref={app.id === "chats" ? chatsLit.ref : undefined}
                          collapsable={false}
                          style={[styles.cell, { width: `${100 / cols}%` }]}
                        >
                          <View style={[styles.pickRing, editing && picked === app.id && { borderColor: c.card }]}>
                            <AppIcon
                              app={app}
                              size={tile}
                              badge={locked ? null : phone.badgeOf(app)}
                              label={locked ? `${app.name}, locked` : phone.labelOf(app)}
                              locked={locked}
                              onPress={() => openApp(app)}
                              onLongPress={locked ? undefined : () => longPressApp(app)}
                              install={
                                batchIndex >= 0
                                  ? {
                                      delay: installStart(batchIndex),
                                      onDone: () => finishApp(app, intro === true),
                                      newDot: intro !== true && !phone.openedOf(app),
                                    }
                                  : undefined
                              }
                            />
                          </View>
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

      {/* The power-on, over the whole tab (header too) on the very first open; it is gone, and unmounted, once the dark has lifted.
          Only while the tab is in front, so a visit left half way starts it again. */}
      {booting && focused ? (
        <PhoneBoot
          gridReady={gridDrawn && gridLaidOut}
          onMountGrid={() => setBootStage((v) => Math.max(v, 1))}
          onReveal={() => setBootStage((v) => Math.max(v, 2))}
          onDone={() => setBootStage(3)}
        />
      ) : null}

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

      {/* The arranging bar, above the tab bar, while the home screen is being arranged */}
      {editing ? (
        <View style={[styles.editBar, { bottom: tabBarInset + 8 }]} pointerEvents="box-none">
          <LayoutBar
            picked={pickedEntry ? { kind: pickedEntry.kind } : null}
            canEarlier={pickedAt > 0}
            canLater={pickedAt >= 0 && pickedAt < shown.length - 1}
            hasFolders={arranger.layout.items.some((i) => i.kind === "folder")}
            onEarlier={() => picked && pickedAt > 0 && arranger.update((l) => moveBefore(l, picked, shown[pickedAt - 1]))}
            onLater={() => picked && pickedAt >= 0 && pickedAt < shown.length - 1 && arranger.update((l) => moveAfter(l, picked, shown[pickedAt + 1]))}
            onNewFolder={() => picked && setNaming({ mode: "new", appId: picked })}
            onIntoFolder={() => picked && setChoosingFor(picked)}
            onRename={() => picked && setNaming({ mode: "rename", folderId: picked })}
            onOpenFolder={() => picked && setOpenFolderId(picked)}
            onUndoFolder={() => {
              if (!picked) return;
              const id = picked;
              arranger.update((l) => dissolveFolder(l, id));
              setPicked(null);
            }}
            onReset={() => {
              arranger.reset();
              setPicked(null);
            }}
          />
        </View>
      ) : null}

      {/* An open folder */}
      {(() => {
        const folder = openFolderId === null ? undefined : entries.find((e): e is Extract<HomeEntry, { kind: "folder" }> => e.kind === "folder" && e.id === openFolderId);
        return (
          <FolderDialog
            visible={folder !== undefined}
            name={folder?.name ?? ""}
            members={folder?.members ?? []}
            badgeOf={phone.badgeOf}
            labelOf={phone.labelOf}
            editing={editing}
            onClose={() => setOpenFolderId(null)}
            onOpenApp={(app, isLocked) => {
              setOpenFolderId(null);
              if (isLocked) setLockedApp(app);
              else open(app);
            }}
            onTakeOut={(app) => arranger.update((l) => takeOut(l, app.id))}
          />
        );
      })()}

      {/* A folder's name, from a short list, when one is made or renamed */}
      <ChoiceDialog
        visible={naming !== null}
        title={naming?.mode === "rename" ? "Rename folder" : "Name the folder"}
        options={FOLDER_NAMES.map((n) => ({ key: n, label: n }))}
        onClose={() => setNaming(null)}
        onPick={(name) => {
          const n = naming;
          setNaming(null);
          if (!n) return;
          if (n.mode === "new") arranger.update((l) => createFolder(l, n.appId, name));
          else arranger.update((l) => renameFolder(l, n.folderId, name));
          setPicked(null);
        }}
      />

      {/* Which folder an app goes into */}
      <ChoiceDialog
        visible={choosingFor !== null}
        title="Put it in which folder?"
        options={arranger.layout.items.flatMap((i) => (i.kind === "folder" ? [{ key: i.id, label: i.name, hint: `${i.apps.length} ${i.apps.length === 1 ? "app" : "apps"}` }] : []))}
        onClose={() => setChoosingFor(null)}
        onPick={(folderId) => {
          const id = choosingFor;
          setChoosingFor(null);
          if (id) arranger.update((l) => addToFolder(l, id, folderId));
          setPicked(null);
        }}
      />
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
    cell: { alignItems: "center", marginBottom: 20 },
    // A ring that is clear until the icon is picked while arranging, so picking one never moves anything
    pickRing: { borderWidth: 2, borderColor: "transparent", borderRadius: 24, borderStyle: "dashed", padding: 2 },
    headerButtons: { flexDirection: "row", alignItems: "center" },
    editBar: { position: "absolute", left: 0, right: 0 },
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
