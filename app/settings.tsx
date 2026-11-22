import { settle } from "@/components/motion/settle";
import { SettingsCard, SettingsRow } from "@/components/settings/SettingsCard";
import { MotionLevelDialog } from "@/components/settings/MotionLevelDialog";
import { MOTION_LEVEL_LABEL } from "@/components/motion/motion-level-core";
import { useMotionLevel } from "@/services/motion-level";
import { FieldInput } from "@/components/ui/field-input";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { useModalOrigin } from "@/components/ui/grow-modal";
import { Button } from "@/components/ui/button";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import {useTheme, createStyles, fontFaces, useResponsiveLayout, withAlpha} from "@/theme";
import { deleteAccountData, getUserProfile } from "@/services/database";
import {
  CONTENT_DB_VERSION,
  contentRepository,
  getContentDbStatus,
  loadPreviewContent,
  resetToBundledContent,
} from "@/services/content-db";
import { setHapticsGate } from "@/services/haptics";
import {
  getFeedPostsEnabled,
  getHapticsEnabled,
  getPhoneBadgesEnabled,
  getTutorialEnabled,
  setFeedPostsEnabled,
  setHapticsEnabled,
  setPhoneBadgesEnabled,
  setTutorialEnabled,
  subscribeFeedPostsEnabled,
  subscribePhoneBadgesEnabled,
} from "@/services/storage";
import { setTeacherLines, useTeacherLines } from "@/components/npc/teacher-lines";
import { setMediaPreference } from "@/services/media";
import { playSfx } from "@/services/sfx";
import { useMediaPreferences } from "@/hooks/use-read-aloud";
import { useStorage } from "@/services/StorageContext";
import { replayIntros, replayTour, resetTutorial } from "@/services/tutorial";
import Constants from "expo-constants";
import { appVersionLabel, contentVersionLabel } from "@/services/build-info-core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Linking,
    ScrollView,
    TouchableOpacity,
    View,
    type ImageStyle,
} from "react-native";
import { Text } from "@/components/ui/text";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// App version and the build number EAS keeps (docs/critical/VERSIONING_SPEC.md 3.5); never an invented number
const APP_VERSION = appVersionLabel({
  appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion,
  buildNumber: Constants.nativeBuildVersion,
});
const CONTENT_VERSION = contentVersionLabel(CONTENT_DB_VERSION);

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, setOnboardingDone } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  // Sound effects + Read Aloud come from the one shared media preference store.
  const { soundEffects, readAloud: readAloudEnabled } = useMediaPreferences();
  const [haptics, setHaptics] = useState(true);
  const [feedPosts, setFeedPosts] = useState(true);
  const [phoneBadges, setPhoneBadges] = useState(true);
  // "Tips from Shrodi" and "Replay the tour" (docs/features/TUTORIAL_SPEC.md §9)
  const [tips, setTips] = useState(true);
  const [replayAsk, setReplayAsk] = useState(false);
  const motionLevel = useMotionLevel();
  const [motionAsk, setMotionAsk] = useState(false);
  const teacherLines = useTeacherLines();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const { anchor: versionAnchor, origin: versionOrigin, capture: versionCapture } = useModalOrigin();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  // The delete dialog is one dialog in three stages: type the name, "are you sure?", then "account deleted"
  const [deleteStage, setDeleteStage] = useState<"type" | "sure" | "done">("type");

  interface DataStatus {
    contentLabel: string;
    contentOk: boolean;
    storageLabel: string;
    storageOk: boolean;
  }

  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);

  // Developer preview: pull the in-progress content from Content Studio (dev builds only).
  const [studioUrl, setStudioUrl] = useState(() => {
    const host = (Constants.expoConfig?.hostUri ?? "").split(":")[0];
    return host ? `http://${host}:8787` : "";
  });
  const [studioCode, setStudioCode] = useState("");
  const [studioMessage, setStudioMessage] = useState<string | null>(null);
  const [studioBusy, setStudioBusy] = useState(false);

  const runStudio = async (task: () => Promise<string>) => {
    setStudioBusy(true);
    setStudioMessage(null);
    try {
      setStudioMessage(await task());
    } catch (error) {
      setStudioMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setStudioBusy(false);
    }
  };

  // On-device database diagnostics — lets testers confirm the bundled
  // content.db actually seeded without needing logcat/Metro access.
  useEffect(() => {
    if (!versionModalVisible) {
      return;
    }

    let cancelled = false;
    setDataStatus(null);

    (async () => {
      let contentLabel = "Checking…";
      let contentOk = false;
      try {
        const status = getContentDbStatus();
        const lessons = await contentRepository.getLessonCount();
        if (status.lastError) {
          contentLabel = `Failed: ${status.lastError}`;
        } else if (status.seeded && lessons > 0) {
          const built = status.builtAt && status.builtAt !== "draft" && status.builtAt !== "preview" ? `, ${status.builtAt}` : "";
          const note = status.preview ? " — Studio preview" : status.version.includes("+draft") ? " — draft" : "";
          contentLabel = `Ready — ${lessons} lessons · content v${status.version}${built}${note}`;
          contentOk = true;
        } else {
          contentLabel = "Not seeded yet";
        }
      } catch (error) {
        contentLabel = `Failed: ${error instanceof Error ? error.message : String(error)}`;
      }

      let storageLabel = "Checking…";
      let storageOk = false;
      try {
        const profile = await getUserProfile();
        if (profile) {
          storageLabel = "Ready";
          storageOk = true;
        } else {
          storageLabel = "Empty (no profile)";
        }
      } catch (error) {
        storageLabel = `Failed: ${error instanceof Error ? error.message : String(error)}`;
      }

      if (!cancelled) {
        setDataStatus({ contentLabel, contentOk, storageLabel, storageOk });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [versionModalVisible]);

  const deleteConfirmationPhrase =
    userProfile?.display_name || userProfile?.username || "DELETE";
  const canConfirmDelete =
    confirmText.trim().toLowerCase() ===
    deleteConfirmationPhrase.trim().toLowerCase();

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const hapticsEnabled = await getHapticsEnabled();
        if (mounted) {
          setHaptics(hapticsEnabled);
          setHapticsGate(hapticsEnabled);
        }
      } catch (error) {
        console.error("Error loading sound preference:", error);
      }
    };

    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  // "Feed posts": the NPC feed on Discover (docs/features/NPC_FEED_SPEC.md §8). Kept in step with the one store.
  useEffect(() => {
    let mounted = true;
    void getFeedPostsEnabled()
      .then((on) => mounted && setFeedPosts(on))
      .catch(() => undefined);
    const stop = subscribeFeedPostsEnabled((on) => mounted && setFeedPosts(on));
    return () => {
      mounted = false;
      stop();
    };
  }, []);

  const handleFeedPostsToggle = (next: boolean) => {
    setFeedPosts(next);
    void setFeedPostsEnabled(next).catch((error) => console.error("Error saving feed posts preference:", error));
  };

  useEffect(() => {
    let mounted = true;
    void getTutorialEnabled()
      .then((on) => mounted && setTips(on))
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const handleTipsToggle = (next: boolean) => {
    setTips(next);
    void setTutorialEnabled(next).catch((error) => console.error("Error saving tips preference:", error));
  };

  // The tour starts again from its first chapter, and every screen intro shows again
  const handleReplay = async () => {
    setReplayAsk(false);
    await replayTour();
    await replayIntros();
    router.replace("/(tabs)");
  };

  // "App badges": the counts and dots on the phone's icons and on the Phone tab (docs/features/PHONE_SPEC.md §5.3).
  useEffect(() => {
    let mounted = true;
    void getPhoneBadgesEnabled()
      .then((on) => mounted && setPhoneBadges(on))
      .catch(() => undefined);
    const stop = subscribePhoneBadgesEnabled((on) => mounted && setPhoneBadges(on));
    return () => {
      mounted = false;
      stop();
    };
  }, []);

  const handlePhoneBadgesToggle = (next: boolean) => {
    setPhoneBadges(next);
    void setPhoneBadgesEnabled(next).catch((error) => console.error("Error saving app badges preference:", error));
  };

  // The switch itself plays the "off" cue while effects are still on, so turning them off is heard
  // once; turning them on is silent until the preference flips, so the preview plays after it.
  const handleSoundEffectsToggle = (enabled: boolean) => {
    setMediaPreference("soundEffects", enabled);
    if (enabled) void playSfx("ui.select");
  };

  const handleReadAloudToggle = (enabled: boolean) => {
    setMediaPreference("readAloud", enabled);
  };

  const handleHapticsToggle = (enabled: boolean) => {
    setHaptics(enabled);
    setHapticsGate(enabled);
    void setHapticsEnabled(enabled);
  };

  const executeDeleteAccount = async () => {
    if (isDeletingAccount) {
      return;
    }

    try {
      setIsDeletingAccount(true);

      await deleteAccountData();
      await AsyncStorage.clear();
      // The tour starts again with the next onboarding
      resetTutorial();

      // The dialog now says it is done; OK takes them back to the very start
      setDeleteStage("done");
    } catch (error) {
      console.error("Error deleting account:", error);
      setDeleteStage("type");
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // After "Account deleted": onboarding is needed again, so the app forgets it was finished and starts from the first screen
  const finishDeleteAccount = () => {
    setDeleteModalVisible(false);
    void playSfx("transition.wipe");
    void setOnboardingDone(false).catch(() => {});
    router.replace("/onboarding");
  };

  const handlePrivacyPolicy = () => {
    router.push("/privacy-policy");
  };

  const handleTermsOfService = () => {
    router.push("/terms-of-service");
  };


  const handleDeleteAccount = () => {
    setConfirmText("");
    setDeleteStage("type");
    setDeleteModalVisible(true);
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { contentMaxWidth, gutter } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mapBackground }}>
      <ScreenHeader title="Settings" onBack={() => router.back()} scrolled={scrolled} />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[
          styles.content,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: gutter,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={settle(100)}>
          <SettingsCard title="Preferences">
            <SettingsRow icon="Moon" color="#8B5CF6" label="Dark Mode" toggle={{ value: isDark, onChange: toggleTheme }} />
            <SettingsRow icon="VolumeHigh" color="#3B82F6" label="Sound Effects" toggle={{ value: soundEffects, onChange: handleSoundEffectsToggle }} />
            <SettingsRow icon="Microphone2" color="#14B8A6" label="Read Aloud" toggle={{ value: readAloudEnabled, onChange: handleReadAloudToggle }} />
            <SettingsRow icon="Flash" color="#F97316" label="Animations" value={MOTION_LEVEL_LABEL[motionLevel]} arrow hint="Choose how much the app moves" onPress={() => setMotionAsk(true)} />
            <SettingsRow icon="Vibe" color="#EC4899" label="Haptics" toggle={{ value: haptics, onChange: handleHapticsToggle }} />
            <SettingsRow icon="Message" color="#F59E0B" label="Teacher lines" toggle={{ value: teacherLines, onChange: setTeacherLines }} />
            <SettingsRow
              icon="Notification"
              color={theme.colors.primary}
              label="Feed posts"
              note="NPCs post about your progress. Blog pieces still unlock when this is off."
              toggle={{ value: feedPosts, onChange: handleFeedPostsToggle }}
            />
            <SettingsRow
              icon="Mobile"
              color={theme.colors.sky}
              label="App badges"
              note="The counts and dots on the Phone tab and its apps."
              toggle={{ value: phoneBadges, onChange: handlePhoneBadgesToggle }}
            />
          </SettingsCard>
        </Animated.View>

        <Animated.View entering={settle(180)}>
          <SettingsCard title="Tutorial">
            <SettingsRow
              icon="Lamp"
              color={theme.colors.primary}
              label="Tips from Shrodi"
              note="A short tour, and a hint the first time you open a screen."
              toggle={{ value: tips, onChange: handleTipsToggle }}
            />
            <SettingsRow icon="Refresh" color={theme.colors.sky} label="Replay the tour" arrow hint="Shrodi shows you around again" onPress={() => setReplayAsk(true)} />
          </SettingsCard>
        </Animated.View>

        <Animated.View entering={settle(250)}>
          <SettingsCard title="About">
            <SettingsRow
              icon="InfoCircle"
              color="#3B82F6"
              label="App Version"
              value={APP_VERSION}
              arrow
              anchor={versionAnchor}
              onPress={() => versionCapture(() => setVersionModalVisible(true))}
            />
            <SettingsRow icon="DocumentText" color="#14B8A6" label="Privacy Policy" arrow onPress={handlePrivacyPolicy} />
            <SettingsRow icon="Shield" color="#8B5CF6" label="Terms of Service" arrow onPress={handleTermsOfService} />
          </SettingsCard>
        </Animated.View>

        <Animated.View entering={settle(400)}>
          <SettingsCard title="Danger zone">
            <SettingsRow
              icon="Trash"
              color={theme.colors.error}
              label="Delete Account"
              destructive
              arrow
              busy={isDeletingAccount}
              hint="Permanently removes your account and data"
              onPress={handleDeleteAccount}
            />
          </SettingsCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* App Version */}
      <MotionLevelDialog visible={motionAsk} onClose={() => setMotionAsk(false)} />

      <ModalDialog
        visible={replayAsk}
        onClose={() => setReplayAsk(false)}
        title="Replay the tour?"
        dismissOnScrim
        footer={
          <>
            <ModalButton label="Replay" onPress={() => void handleReplay()} />
            <ModalSecondaryButton label="Not now" onPress={() => setReplayAsk(false)} />
          </>
        }
      >
        <Text style={{ color: theme.colors.textSecondary }}>Shrodi will start from your first lesson again, and show the hint on each screen once more. Your progress is not touched.</Text>
      </ModalDialog>

      <ModalDialog
        visible={versionModalVisible}
        origin={versionOrigin}
        onClose={() => setVersionModalVisible(false)}
        title="App Version"
        closeLabel="Close app version"
        footer={<ModalButton label="Got it" onPress={() => setVersionModalVisible(false)} />}
      >
        <View style={styles.modalHero}>
          <Image
            source={require("@/assets/images/mascot/icon-256.png")}
            style={styles.modalIcon as ImageStyle}
            resizeMode="contain"
          />
          <Text style={styles.modalAppName}>AtomIQ</Text>
          <View style={styles.versionBadge}>
            <Icon name="Crown1" size={13} color={theme.colors.primaryDark} variant="Bold" />
            <Text style={styles.versionBadgeText}>Version {APP_VERSION}</Text>
          </View>
          <Text style={[styles.modalSubtitle, { marginBottom: 8 }]}>Content {CONTENT_VERSION}</Text>
          <Text style={styles.modalSubtitle}>
            Learn nuclear science one atom at a time.
          </Text>
        </View>

        <View style={styles.dataStatusBlock}>
          <Text style={styles.dataStatusTitle}>Data status</Text>
          <View style={styles.dataStatusRow}>
            <View
              style={[
                styles.dataStatusDot,
                {
                  backgroundColor: dataStatus
                    ? dataStatus.contentOk
                      ? theme.colors.success
                      : theme.colors.error
                    : theme.colors.borderStrong,
                },
              ]}
            />
            <Text style={styles.dataStatusText} numberOfLines={3}>
              Content DB: {dataStatus ? dataStatus.contentLabel : "Checking…"}
            </Text>
          </View>
          <View style={styles.dataStatusRow}>
            <View
              style={[
                styles.dataStatusDot,
                {
                  backgroundColor: dataStatus
                    ? dataStatus.storageOk
                      ? theme.colors.success
                      : theme.colors.error
                    : theme.colors.borderStrong,
                },
              ]}
            />
            <Text style={styles.dataStatusText} numberOfLines={2}>
              Progress DB: {dataStatus ? dataStatus.storageLabel : "Checking…"}
            </Text>
          </View>
        </View>

        {__DEV__ ? (
          <View style={styles.dataStatusBlock}>
            <Text style={styles.dataStatusTitle}>Developer: content from Studio</Text>
            <FieldInput
              style={styles.devInput}
              value={studioUrl}
              onChangeText={setStudioUrl}
              placeholder="http://192.168.1.20:8787"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel="Content Studio address"
            />
            <FieldInput
              style={styles.devInput}
              value={studioCode}
              onChangeText={setStudioCode}
              placeholder="Pairing code from Studio"
              keyboardType="number-pad"
              accessibilityLabel="Pairing code"
            />
            <View style={styles.devRow}>
              <View style={styles.devCell}>
                <Button
                  size="compact"
                  label={studioBusy ? "Loading…" : "Load preview"}
                  disabled={studioBusy || !studioUrl || !studioCode}
                  onPress={() =>
                    void runStudio(async () => {
                      const meta = await loadPreviewContent(studioUrl, studioCode);
                      return `Loaded ${meta.content_version}. Reopen a lesson to see it.`;
                    })
                  }
                />
              </View>
              <View style={styles.devCell}>
                <Button
                  size="compact"
                  variant="secondary"
                  label="Reset to bundled"
                  disabled={studioBusy}
                  onPress={() =>
                    void runStudio(async () => {
                      await resetToBundledContent();
                      return "Back to the content bundled with this build.";
                    })
                  }
                />
              </View>
            </View>
            {studioMessage ? <Text style={styles.dataStatusText}>{studioMessage}</Text> : null}
          </View>
        ) : null}

        <View style={styles.creditRow}>
          <Icon name="Cup" size={16} color={theme.colors.primaryLight} variant="Bold" />
          <View style={{ flex: 1 }}>
            <Text style={styles.creditText}>
              Made for the MythSmashers by the DOST-PNRI, representing the
              Philippines in international competition.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.linkedin.com/in/kentgarcia").catch(() => {})}
              activeOpacity={0.7}
            >
              <Text style={styles.creditLink}>Developed by Kent Garcia</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.modalCopyright}>© 2026 AtomIQ. All rights reserved.</Text>
      </ModalDialog>

      {/* Delete Account: one dialog in three stages. The main action is red until the account is gone; Cancel keeps the yellow main button */}
      <ModalDialog
        visible={deleteModalVisible}
        warning={deleteStage !== "done"}
        onClose={() => {
          if (deleteStage === "done") finishDeleteAccount();
          else if (!isDeletingAccount) setDeleteModalVisible(false);
        }}
        title={deleteStage === "done" ? "Account deleted" : deleteStage === "sure" ? "Are you sure?" : "Delete Account"}
        closeLabel={deleteStage === "done" ? "Close" : "Close delete account"}
        footer={
          deleteStage === "done" ? (
            <ModalButton label="OK" onPress={finishDeleteAccount} />
          ) : deleteStage === "sure" ? (
            <>
              <ModalButton
                variant="destructive"
                label={isDeletingAccount ? "Deleting…" : "Yes, delete everything"}
                disabled={isDeletingAccount}
                onPress={() => void executeDeleteAccount()}
              />
              <ModalButton label="Keep my account" disabled={isDeletingAccount} onPress={() => setDeleteModalVisible(false)} />
            </>
          ) : (
            <>
              <ModalButton
                variant="destructive"
                label="Delete Forever"
                disabled={!canConfirmDelete}
                onPress={() => setDeleteStage("sure")}
              />
              <ModalButton label="Cancel" onPress={() => setDeleteModalVisible(false)} />
            </>
          )
        }
      >
        {deleteStage === "done" ? (
          <View style={styles.deleteModalWarning}>
            <Icon name="TickCircle" size={18} color={theme.colors.success} variant="Bold" />
            <Text style={styles.deleteModalWarningText}>
              Your account and all your data on this device have been deleted. You will start again from the beginning.
            </Text>
          </View>
        ) : deleteStage === "sure" ? (
          <View style={styles.deleteModalWarning}>
            <Icon name="Danger" size={18} color={theme.colors.error} variant="Bold" />
            <Text style={styles.deleteModalWarningText}>
              Last chance. Your progress, XP, diamonds and streak will be gone for good. This cannot be undone.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.deleteModalWarning}>
              <Icon name="Danger" size={18} color={theme.colors.error} variant="Bold" />
              <Text style={styles.deleteModalWarningText}>
                This will permanently delete your account and all local data.
                This action cannot be undone.
              </Text>
            </View>

            <Text style={styles.deleteModalText}>
              Type <Text style={styles.deleteModalPhrase}>{deleteConfirmationPhrase}</Text> to confirm.
            </Text>

            <FieldInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={deleteConfirmationPhrase}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}
      </ModalDialog>
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  return {
    content: {
      padding: 20,
    },
    input: {
      alignSelf: "stretch",
      backgroundColor: theme.colors.field,
      borderRadius: 14,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      ...fontFaces.semibold,
      color: theme.colors.fieldText,
    },
    /* App Version + Delete modals (ModalDialog contents) */
    devCell: { flex: 1 },
    modalHero: {
      alignItems: "center",
      paddingVertical: 8,
    },
    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginBottom: 10,
    },
    modalAppName: {
      fontSize: 20,
      ...fontFaces.heavy,
      color: theme.colors.text,
      marginBottom: 8,
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.primarySurface,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 10,
    },
    versionBadgeText: {
      fontSize: 13,
      ...fontFaces.heavy,
      color: theme.colors.primaryDark,
    },
    modalSubtitle: {
      fontSize: 13,
      ...fontFaces.medium,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    creditRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingTop: 14,
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
    },
    creditText: {
      fontSize: 12,
      ...fontFaces.medium,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    creditLink: {
      fontSize: 12,
      ...fontFaces.heavy,
      color: theme.colors.primaryLight,
      marginTop: 4,
      textDecorationLine: "underline",
    },
    modalCopyright: {
      fontSize: 11,
      ...fontFaces.regular,
      color: theme.colors.textFaint,
      textAlign: "center",
    },
    dataStatusBlock: {
      paddingTop: 14,
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      gap: 8,
    },
    dataStatusTitle: {
      fontSize: 13,
      ...fontFaces.heavy,
      color: theme.colors.text,
    },
    dataStatusRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    dataStatusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    dataStatusText: {
      flex: 1,
      fontSize: 12,
      ...fontFaces.medium,
      color: theme.colors.textSecondary,
      lineHeight: 17,
    },
    devInput: {
      borderRadius: 8,
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      ...fontFaces.medium,
      color: theme.colors.fieldText,
      backgroundColor: theme.colors.field,
    },
    devRow: {
      flexDirection: "row",
      gap: 8,
    },
    /* Delete Account Modal */
    deleteModalWarning: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: theme.colors.errorSurface,
      borderWidth: 1,
      borderColor: withAlpha(theme.colors.error, 0.35),
      borderRadius: 12,
      padding: 12,
    },
    deleteModalWarningText: {
      flex: 1,
      fontSize: 13,
      ...fontFaces.medium,
      color: theme.colors.error,
      lineHeight: 18,
    },
    deleteModalText: {
      fontSize: 13,
      ...fontFaces.medium,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    deleteModalPhrase: {
      ...fontFaces.heavy,
      color: theme.colors.error,
      textTransform: "uppercase",
    },
  };
});
