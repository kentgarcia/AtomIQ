import { SettingsCard, SettingsRow } from "@/components/settings/SettingsCard";
import { FieldInput } from "@/components/ui/field-input";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Icon } from "@/components/ui/icon";
import { useModalOrigin } from "@/components/ui/grow-modal";
import { Button } from "@/components/ui/button";
import { ModalButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { BETA_FEEDBACK_FORM_URL } from "@/constants/beta";
import { openExternalUrl } from "@/services/open-url";
import {useTheme, createStyles, fontFaces, useResponsiveLayout, withAlpha} from "@/theme";
import { deleteAccountData, getUserProfile } from "@/services/database";
import {
  contentRepository,
  getContentDbStatus,
  loadPreviewContent,
  resetToBundledContent,
} from "@/services/content-db";
import { setHapticsGate } from "@/services/haptics";
import { getFeedPostsEnabled, getHapticsEnabled, setFeedPostsEnabled, setHapticsEnabled, subscribeFeedPostsEnabled } from "@/services/storage";
import { setTeacherLines, useTeacherLines } from "@/components/npc/teacher-lines";
import { setMediaPreference } from "@/services/media";
import { useMediaPreferences } from "@/hooks/use-read-aloud";
import { useStorage } from "@/services/StorageContext";
import Constants from "expo-constants";
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
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  // Sound effects + Read Aloud come from the one shared media preference store.
  const { soundEffects, readAloud: readAloudEnabled } = useMediaPreferences();
  const [haptics, setHaptics] = useState(true);
  const [feedPosts, setFeedPosts] = useState(true);
  const teacherLines = useTeacherLines();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const { anchor: versionAnchor, origin: versionOrigin, capture: versionCapture } = useModalOrigin();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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

  // "Feed posts": the NPC feed on Discover (docs/NPC_FEED_SPEC.md §8). Kept in step with the one store.
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
    setConfirmText("");
  }, [deleteModalVisible]);

  const handleSoundEffectsToggle = (enabled: boolean) => {
    setMediaPreference("soundEffects", enabled);
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

      Alert.alert("Account Deleted", "Your account has been deleted.", [
        {
          text: "OK",
          onPress: () => router.replace("/onboarding"),
        },
      ]);
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleBetaFeedback = async () => {
    const opened = await openExternalUrl(BETA_FEEDBACK_FORM_URL);
    if (!opened) {
      Alert.alert(
        "Couldn't open the form",
        "Please check your internet connection and try again.",
      );
    }
  };

  const handlePrivacyPolicy = () => {
    router.push("/privacy-policy");
  };

  const handleTermsOfService = () => {
    router.push("/terms-of-service");
  };


  const handleDeleteAccount = () => {
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
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SettingsCard title="Preferences">
            <SettingsRow icon="Moon" color="#8B5CF6" label="Dark Mode" toggle={{ value: isDark, onChange: toggleTheme }} />
            <SettingsRow icon="VolumeHigh" color="#3B82F6" label="Sound Effects" toggle={{ value: soundEffects, onChange: handleSoundEffectsToggle }} />
            <SettingsRow icon="Microphone2" color="#14B8A6" label="Read Aloud" toggle={{ value: readAloudEnabled, onChange: handleReadAloudToggle }} />
            <SettingsRow icon="Vibe" color="#EC4899" label="Haptics" toggle={{ value: haptics, onChange: handleHapticsToggle }} />
            <SettingsRow icon="Message" color="#F59E0B" label="Teacher lines" toggle={{ value: teacherLines, onChange: setTeacherLines }} />
            <SettingsRow
              icon="Notification"
              color={theme.colors.primary}
              label="Feed posts"
              note="NPCs post about your progress. Blog pieces still unlock when this is off."
              toggle={{ value: feedPosts, onChange: handleFeedPostsToggle }}
            />
          </SettingsCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SettingsCard title="About">
            <SettingsRow icon="Message" color="#EA580C" label="Beta Feedback" arrow hint="Opens the feedback form" onPress={() => void handleBetaFeedback()} />
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

        <Animated.View entering={FadeInDown.delay(400).springify()}>
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
            source={require("@/assets/images/icon.png")}
            style={styles.modalIcon as ImageStyle}
            resizeMode="contain"
          />
          <Text style={styles.modalAppName}>AtomIQ</Text>
          <View style={styles.versionBadge}>
            <Icon name="Crown1" size={13} color={theme.colors.primaryDark} variant="Bold" />
            <Text style={styles.versionBadgeText}>Version {APP_VERSION}</Text>
          </View>
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

      {/* Delete Account: the main action is red; Cancel keeps the yellow main button */}
      <ModalDialog
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeletingAccount) setDeleteModalVisible(false);
        }}
        title="Delete Account"
        closeLabel="Close delete account"
        footer={
          <>
            <ModalButton
              variant="destructive"
              label={isDeletingAccount ? "Deleting…" : "Delete Forever"}
              disabled={!canConfirmDelete || isDeletingAccount}
              onPress={() => {
                setDeleteModalVisible(false);
                void executeDeleteAccount();
              }}
            />
            <ModalButton label="Cancel" disabled={isDeletingAccount} onPress={() => setDeleteModalVisible(false)} />
          </>
        }
      >
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
      backgroundColor: theme.colors.card,
      borderWidth: 2,
      borderColor: theme.colors.border,
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
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
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
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    dataStatusTitle: {
      fontSize: 12,
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
