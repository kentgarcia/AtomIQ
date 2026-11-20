/**
 * Camera (docs/PHONE_SPEC.md §9): a photo mode for the learner's own character; the device camera is never used. Drawn like a camera
 * app, dark and full screen like the Atom Scanner: the viewfinder shows the learner's avatar standing in a flat scene (the preview is
 * live), a dark panel under it picks the scene, who stands beside them (nobody, Shrodi or a teacher from Contacts), the pose and a frame,
 * and the round shutter takes the photo: a flash, a click, and the picture shrinks into the gallery button. A photo is saved as its
 * composition (`photo-core.ts`), so it stays tiny and sharp at any size. The gallery is this screen's second view: a grid, newest first;
 * a photo opens large with a delete button. At 100 photos the shutter says "Your gallery is full" and nothing is removed.
 */

import { useCast } from "@/components/feed/use-cast";
import { PhotoView, photoHeight } from "@/components/camera/PhotoView";
import {
  DEFAULT_PHOTO,
  FULL_MESSAGE,
  PHOTO_FRAMES,
  PHOTO_POSES,
  PHOTO_SCENES,
  SHRODI_ID,
  photoCountText,
  type Photo,
  type PhotoConfig,
} from "@/components/camera/photo-core";
import { PHOTO_SCENE_BY_ID } from "@/components/camera/photo-scenes";
import { settle } from "@/components/motion/settle";
import { BandButton, BandRow, BandTitle } from "@/components/phone/band-header";
import { ChatHead, speakerFor } from "@/components/phone/ChatHead";
import { Shutter } from "@/components/scanner/Shutter";
import { EEL, SNOW } from "@/components/lesson/visual/object-art";
import { Icon } from "@/components/ui/icon";
import { ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import { usePhotos } from "@/hooks/use-photos";
import { getContactTeacherIds } from "@/services/chats";
import { deletePhoto, takePhoto } from "@/services/photos";
import { playSfx } from "@/services/sfx";
import { useStorage } from "@/services/StorageContext";
import {
  createStyles,
  fontFaces,
  useResponsiveLayout,
  useTheme,
  withAlpha,
} from "@/theme";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DARK = EEL[2];
const LIGHT = SNOW;
const PANEL_RADIUS = 28;
const TABS = [
  { id: "scene", label: "Scene" },
  { id: "with", label: "With" },
  { id: "pose", label: "Pose" },
  { id: "frame", label: "Frame" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const POSE_NAMES = {
  idle: "Relaxed",
  greet: "Wave",
  cheer: "Cheer",
  proud: "Proud",
  think: "Think",
} as const;
const FRAME_NAMES = {
  none: "None",
  white: "Instant",
  sun: "Sunny",
  ink: "Ink",
} as const;
const COLUMNS = 3;
const GAP = 10;

export default function CameraScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const { contentMaxWidth } = useResponsiveLayout();
  const { userProfile } = useStorage();
  const cast = useCast();
  const { photos } = usePhotos();

  const [view, setView] = useState<"camera" | "gallery">("camera");
  const [tab, setTab] = useState<TabId>("scene");
  const [setup, setSetup] = useState<Omit<PhotoConfig, "avatar">>({
    v: 1,
    scene: DEFAULT_PHOTO.scene,
    companion: null,
    pose: DEFAULT_PHOTO.pose,
    companionPose: DEFAULT_PHOTO.companionPose,
    frame: DEFAULT_PHOTO.frame,
  });
  const [open, setOpen] = useState<Photo | null>(null);
  const [full, setFull] = useState(false);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);

  // A teacher can stand beside the learner once they are in Contacts
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getContactTeacherIds()
        .then((ids) => alive && setTeacherIds(ids))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const config: PhotoConfig = useMemo(
    () => ({ ...setup, avatar: userProfile?.avatar_url ?? "" }),
    [setup, userProfile?.avatar_url],
  );
  const set = <K extends keyof PhotoConfig>(key: K, value: PhotoConfig[K]) => {
    void playSfx("camera.option");
    setFull(false);
    setSetup((s) => ({ ...s, [key]: value }));
  };
  const setPose = (pose: PhotoConfig["pose"]) => {
    void playSfx("camera.option");
    setSetup((s) => ({ ...s, pose, companionPose: pose }));
  };

  // The viewfinder takes what the panel leaves, keeping the picture's 4:5 shape
  const panelH = 232 + insets.bottom;
  const topH = insets.top + 12 + 48;
  const availH = Math.max(160, height - panelH - topH - 8);
  const maxW = Math.min(width - 32, contentMaxWidth - 32);
  const vfW = Math.floor(Math.min(maxW, availH / photoHeight(config, 1)));

  // Shutter: a flash over the picture, and the picture shrinking into the gallery button
  const flash = useSharedValue(0);
  const fly = useSharedValue(1);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const flyStyle = useAnimatedStyle(() => ({
    opacity: fly.value >= 1 ? 0 : fly.value < 0.82 ? 1 : (1 - fly.value) / 0.18,
    transform: [
      { translateX: -(1 - fly.value) * (width * 0.3) },
      { translateY: (1 - fly.value) * (availH * 0.55) },
      { scale: 1 + (1 - fly.value) * 2.2 },
    ],
  }));

  const shoot = async () => {
    const result = await takePhoto(config);
    if (!result.ok) {
      void playSfx("ui.cancel");
      setFull(result.reason === "full");
      return;
    }
    // The shutter, then the "saved" as the flash is ending (no flash with reduced motion, so a little sooner)
    void playSfx("camera.shutter");
    setTimeout(() => void playSfx("camera.saved"), reduced ? 220 : 320);
    if (!reduced) {
      cancelAnimation(flash);
      flash.value = withSequence(
        withTiming(0.9, { duration: 40 }),
        withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }),
      );
      cancelAnimation(fly);
      fly.value = 0;
      fly.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  const back = () => {
    if (view === "gallery") {
      void playSfx("nav.page-back");
      setView("camera");
      return;
    }
    void playSfx("phone.app-close");
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/phone");
  };

  const gridW = Math.min(width, contentMaxWidth) - 32;
  const cellW = Math.floor((gridW - GAP * (COLUMNS - 1)) / COLUMNS);

  const companions = useMemo(() => {
    const list: { id: string | null; name: string }[] = [
      { id: null, name: "Solo" },
      { id: SHRODI_ID, name: "Shrodi" },
    ];
    for (const id of teacherIds) {
      const npc = cast.get(id);
      if (npc) list.push({ id, name: npc.name });
    }
    return list;
  }, [teacherIds, cast]);

  const chip = (
    key: string,
    label: string,
    on: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <BandRow
          left={
            <BandButton
              icon="ArrowLeft2"
              label={
                view === "gallery" ? "Back to the camera" : "Back to the phone"
              }
              onPress={back}
              color={LIGHT}
            />
          }
          center={
            <BandTitle
              title={view === "gallery" ? "Gallery" : "Camera"}
              subtitle={photoCountText(photos.length)}
              color={LIGHT}
            />
          }
          right={
            <BandButton
              icon={view === "gallery" ? "Camera" : "Gallery"}
              label={
                view === "gallery"
                  ? "Back to the camera"
                  : `Open the gallery, ${photoCountText(photos.length)}`
              }
              onPress={() => setView(view === "gallery" ? "camera" : "gallery")}
              color={LIGHT}
            />
          }
        />
      </View>

      {view === "camera" ? (
        <>
          <View
            style={[
              styles.stage,
              { paddingTop: topH + 4, height: topH + availH + 12 },
            ]}
          >
            <View style={{ width: vfW, borderRadius: 14, overflow: "hidden" }}>
              <PhotoView config={config} width={vfW} live />
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: LIGHT,
                  },
                  flashStyle,
                ]}
              />
            </View>
            <Animated.View
              pointerEvents="none"
              style={[
                { position: "absolute", right: 16, top: insets.top + 12 + 52 },
                flyStyle,
              ]}
            >
              <View style={{ borderRadius: 6, overflow: "hidden" }}>
                <PhotoView config={config} width={44} />
              </View>
            </Animated.View>
            {full ? (
              <Pressable
                style={styles.notice}
                onPress={() => {
                  void playSfx("nav.page-next");
                  setView("gallery");
                }}
                accessibilityRole="button"
                accessibilityLabel={`${FULL_MESSAGE}. Opens the gallery.`}
              >
                <Text style={styles.noticeText}>{FULL_MESSAGE}</Text>
                <Icon
                  name="ArrowRight2"
                  size={16}
                  color={LIGHT}
                  variant="Bold"
                />
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.panel,
              { height: panelH, paddingBottom: insets.bottom + 12 },
            ]}
          >
            <View style={styles.tabs} accessibilityRole="tablist">
              {TABS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  hitSlop={8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.id }}
                  style={styles.tab}
                >
                  <Text style={[styles.tabText, tab === t.id && styles.tabOn]}>
                    {t.label}
                  </Text>
                  <View
                    style={[
                      styles.tabDot,
                      { backgroundColor: tab === t.id ? LIGHT : "transparent" },
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.options}
              contentContainerStyle={styles.optionsRow}
            >
              {tab === "scene"
                ? PHOTO_SCENES.map((id) =>
                    chip(
                      id,
                      PHOTO_SCENE_BY_ID[id].name,
                      setup.scene === id,
                      () => set("scene", id),
                    ),
                  )
                : null}
              {tab === "pose"
                ? PHOTO_POSES.map((id) =>
                    chip(id, POSE_NAMES[id], setup.pose === id, () =>
                      setPose(id),
                    ),
                  )
                : null}
              {tab === "frame"
                ? PHOTO_FRAMES.map((id) =>
                    chip(id, FRAME_NAMES[id], setup.frame === id, () =>
                      set("frame", id),
                    ),
                  )
                : null}
              {tab === "with"
                ? companions.map((p) => {
                    const on = setup.companion === p.id;
                    const speaker = p.id ? speakerFor(p.id, cast) : null;
                    return (
                      <Pressable
                        key={p.id ?? "solo"}
                        onPress={() => set("companion", p.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={
                          p.id ? `Stand beside ${p.name}` : "Stand alone"
                        }
                        style={styles.who}
                      >
                        <View
                          style={[styles.whoFace, on && { borderColor: LIGHT }]}
                        >
                          {p.id ? (
                            <ChatHead speaker={speaker} size={46} />
                          ) : (
                            <Icon
                              name="Profile"
                              size={24}
                              color={LIGHT}
                              variant="Bold"
                            />
                          )}
                        </View>
                        <Text
                          style={[styles.whoName, on && { color: LIGHT }]}
                          numberOfLines={1}
                        >
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>

            <View style={styles.shutterRow}>
              <Shutter
                clock={flash}
                scanning={false}
                locked
                reduced={reduced}
                onPress={() => void shoot()}
                label="Take a photo"
                ringColor={LIGHT}
                discColor={LIGHT}
                lockedColor={LIGHT}
                progressColor={LIGHT}
              />
            </View>
          </View>
        </>
      ) : (
        <FlatList
          data={photos}
          key={COLUMNS}
          numColumns={COLUMNS}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: 16,
            paddingTop: topH + 8,
            paddingBottom: insets.bottom + 24,
            gap: GAP,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No photos yet. Take one with the shutter and it will be here.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={settle(Math.min(index, 8) * 40)}>
              <Pressable
                onPress={() => setOpen(item)}
                accessibilityRole="button"
                accessibilityLabel={`Photo ${photos.length - index}. Opens it large.`}
                style={{ width: cellW, borderRadius: 10, overflow: "hidden" }}
              >
                <PhotoView config={item.config} width={cellW} />
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <ModalDialog
        visible={open !== null}
        onClose={() => setOpen(null)}
        title="Photo"
        dismissOnScrim
        footer={
          <ModalSecondaryButton
            label="Delete"
            variant="destructive"
            onPress={() => {
              const id = open?.id;
              setOpen(null);
              if (id) {
                void playSfx("ui.delete");
                void deletePhoto(id);
              }
            }}
          />
        }
      >
        {open ? (
          <View style={{ alignItems: "center" }}>
            <View style={{ borderRadius: 12, overflow: "hidden" }}>
              <PhotoView
                config={open.config}
                width={Math.min(300, width - 80)}
                live
              />
            </View>
          </View>
        ) : null}
      </ModalDialog>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  void theme;
  return {
    container: { flex: 1, backgroundColor: DARK },
    top: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 2 },
    stage: { alignItems: "center", justifyContent: "center" },
    notice: {
      position: "absolute",
      bottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: withAlpha(DARK, 0.85),
    },
    noticeText: {
      fontSize: 13,
      lineHeight: 18,
      ...fontFaces.heavy,
      color: LIGHT,
    },
    panel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: PANEL_RADIUS,
      borderTopRightRadius: PANEL_RADIUS,
      paddingTop: 14,
      backgroundColor: DARK,
      justifyContent: "space-between",
    },
    tabs: { flexDirection: "row", justifyContent: "center", gap: 26 },
    tab: { alignItems: "center", gap: 3, paddingVertical: 2 },
    tabText: {
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      ...fontFaces.heavy,
      color: withAlpha(LIGHT, 0.55),
    },
    tabOn: { color: LIGHT },
    tabDot: { width: 5, height: 5, borderRadius: 3 },
    options: { flexGrow: 0, minHeight: 72 },
    optionsRow: { paddingHorizontal: 20, gap: 10, alignItems: "center" },
    chip: {
      minHeight: 40,
      paddingHorizontal: 18,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(LIGHT, 0.14),
    },
    chipOn: { backgroundColor: LIGHT },
    chipText: { fontSize: 14, ...fontFaces.heavy, color: LIGHT },
    chipTextOn: { color: DARK },
    who: { width: 64, alignItems: "center", gap: 4 },
    whoFace: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 3,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: withAlpha(LIGHT, 0.14),
    },
    whoName: {
      fontSize: 11,
      lineHeight: 14,
      textAlign: "center",
      ...fontFaces.heavy,
      color: withAlpha(LIGHT, 0.65),
    },
    shutterRow: { alignItems: "center" },
    empty: {
      marginTop: 40,
      textAlign: "center",
      fontSize: 15,
      lineHeight: 22,
      ...fontFaces.semibold,
      color: withAlpha(LIGHT, 0.7),
    },
  };
});
