import { Icon } from "@/components/ui/icon";
import { BETA_FEEDBACK_FORM_URL } from "@/constants/beta";
import { openExternalUrl } from "@/services/open-url";
import {useTheme, type Palette, fontFamilies, useResponsiveLayout} from "@/theme";
import { deleteAccountData, getUserProfile } from "@/services/database";
import { contentRepository, getContentDbStatus } from "@/services/content-db";
import { setHapticsGate } from "@/services/haptics";
import {
  getHapticsEnabled,
  getSoundEnabled,
  setHapticsEnabled,
  setSoundEnabled,
} from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import { setUiSfxEnabled } from "@/services/ui-sfx";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  const THEME = theme.palettes.settings;
  const [soundEffects, setSoundEffects] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  interface DataStatus {
    contentLabel: string;
    contentOk: boolean;
    storageLabel: string;
    storageOk: boolean;
  }

  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);

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
          contentLabel = `Ready — ${lessons} lessons (v${status.version})`;
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
        const [soundEnabled, hapticsEnabled] = await Promise.all([
          getSoundEnabled(),
          getHapticsEnabled(),
        ]);
        if (mounted) {
          setSoundEffects(soundEnabled);
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

  useEffect(() => {
    setConfirmText("");
  }, [deleteModalVisible]);

  const handleSoundEffectsToggle = (enabled: boolean) => {
    setSoundEffects(enabled);
    setUiSfxEnabled(enabled);
    void setSoundEnabled(enabled);
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

  const styles = React.useMemo(() => createStyles(THEME), [THEME]);
  const { contentMaxWidth, gutter } = useResponsiveLayout();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            paddingHorizontal: gutter,
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="ArrowLeft2" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            padding: gutter,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Moon"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>
                    Switch between light and dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E5E5E5", true: THEME.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon
                  name="VolumeHigh"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Sound Effects</Text>
                  <Text style={styles.settingDescription}>
                    Play sounds for actions
                  </Text>
                </View>
              </View>
              <Switch
                value={soundEffects}
                onValueChange={handleSoundEffectsToggle}
                trackColor={{ false: "#E5E5E5", true: THEME.primary }}
                thumbColor={soundEffects ? "#FFFFFF" : "#FFFFFF"}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Vibe"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Haptics</Text>
                  <Text style={styles.settingDescription}>
                    Vibrate on actions and game events
                  </Text>
                </View>
              </View>
              <Switch
                value={haptics}
                onValueChange={handleHapticsToggle}
                trackColor={{ false: "#E5E5E5", true: THEME.primary }}
                thumbColor={haptics ? "#FFFFFF" : "#FFFFFF"}
              />
            </View>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={() => void handleBetaFeedback()}
            >
              <View style={styles.settingInfo}>
                <Icon
                  name="Message"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Beta Feedback</Text>
                  <Text style={styles.settingDescription}>
                    Help us improve AtomIQ
                  </Text>
                </View>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={() => setVersionModalVisible(true)}
            >
              <View style={styles.settingInfo}>
                <Icon
                  name="InfoCircle"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.settingValue}>{APP_VERSION}</Text>
                <Icon name="ArrowRight2" size={18} color={THEME.textMuted} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={handlePrivacyPolicy}
            >
              <View style={styles.settingInfo}>
                <Icon
                  name="DocumentText"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowBorder]}
              onPress={handleTermsOfService}
            >
              <View style={styles.settingInfo}>
                <Icon
                  name="Shield"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount}
            >
              <View style={styles.settingInfo}>
                <Icon name="Trash" size={20} color="#EF4444" variant="Bold" />
                <View>
                  <Text style={styles.destructiveLabel}>Delete Account</Text>
                  <Text style={styles.settingDescription}>
                    Permanently remove your account and data
                  </Text>
                </View>
              </View>
              {isDeletingAccount ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <Icon name="ArrowRight2" size={18} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* App Version Modal */}
      <Modal
        visible={versionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVersionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.modalCard}
          >
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Icon name="InfoCircle" size={16} color="#FF8C00" variant="Bold" />
                </View>
                <Text style={styles.modalTitle}>App Version</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVersionModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.85}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Close app version"
              >
                <Icon name="CloseCircle" size={20} color="#9CA3AF" variant="Bold" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalHero}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.modalIcon}
                resizeMode="contain"
              />
              <Text style={styles.modalAppName}>AtomIQ</Text>
              <View style={styles.versionBadge}>
                <Icon name="Crown1" size={13} color="#E67E22" variant="Bold" />
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
                          ? "#22C55E"
                          : "#EF4444"
                        : "#D1D5DB",
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
                          ? "#22C55E"
                          : "#EF4444"
                        : "#D1D5DB",
                    },
                  ]}
                />
                <Text style={styles.dataStatusText} numberOfLines={2}>
                  Progress DB: {dataStatus ? dataStatus.storageLabel : "Checking…"}
                </Text>
              </View>
            </View>

            <View style={styles.creditRow}>
              <Icon name="Cup" size={16} color="#FF8C00" variant="Bold" />
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

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              activeOpacity={0.85}
              onPress={() => setVersionModalVisible(false)}
            >
              <Icon name="TickCircle" size={18} color="#FFFFFF" variant="Bold" />
              <Text style={styles.modalPrimaryBtnText}>Got it</Text>
            </TouchableOpacity>

            <Text style={styles.modalCopyright}>
              © 2026 AtomIQ. All rights reserved.
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeInDown.duration(300).springify()}
              style={styles.modalCard}
            >
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.deleteModalHeaderIcon}>
                  <Icon name="Trash" size={16} color="#EF4444" variant="Bold" />
                </View>
                <Text style={styles.modalTitle}>Delete Account</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.85}
                disabled={isDeletingAccount}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Close delete account"
              >
                <Icon name="CloseCircle" size={20} color="#9CA3AF" variant="Bold" />
              </TouchableOpacity>
            </View>

            <View style={styles.deleteModalWarning}>
              <Icon name="Danger" size={18} color="#EF4444" variant="Bold" />
              <Text style={styles.deleteModalWarningText}>
                This will permanently delete your account and all local data.
                This action cannot be undone.
              </Text>
            </View>

            <Text style={styles.deleteModalText}>
              Type{" "}
              <Text style={styles.deleteModalPhrase}>
                {deleteConfirmationPhrase}
              </Text>{" "}
              to confirm.
            </Text>

            <TextInput
              style={styles.input}
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={deleteConfirmationPhrase}
              placeholderTextColor="#C9CDD3"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.deleteModalCancelBtn}
                activeOpacity={0.85}
                disabled={isDeletingAccount}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDeleteModalVisible(false);
                  void executeDeleteAccount();
                }}
                style={[
                  styles.deleteModalConfirmBtn,
                  !canConfirmDelete && styles.deleteModalConfirmBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!canConfirmDelete || isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="Trash" size={16} color="#FFFFFF" variant="Bold" />
                    <Text style={styles.deleteModalConfirmText}>Delete Forever</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: fontFamilies.bold,
      color: theme.textMuted,
      marginBottom: 12,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    settingsCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 24,
      overflow: "hidden",
      // Modern shadow
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      minHeight: 60,
    },
    settingRowBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    settingInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontFamily: fontFamilies.semibold,
      color: theme.text,
    },
    settingDescription: {
      fontSize: 13,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 15,
      fontFamily: fontFamilies.medium,
      color: theme.textMuted,
      marginRight: 8,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      alignSelf: "stretch",
      backgroundColor: "#F9FAFB",
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fontFamilies.semibold,
      color: theme.text,
      marginTop: 12,
    },
    destructiveLabel: {
      fontSize: 16,
      fontFamily: fontFamilies.semibold,
      color: "#EF4444",
    },
    /* App Version + Delete modals — profile edit-modal design */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: "#FFFFFF",
      borderRadius: 26,
      padding: 16,
      paddingTop: 12,
      borderWidth: 2,
      borderColor: "#E5E7EB",
      borderBottomWidth: 4,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 10,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#E5E7EB",
      alignSelf: "center",
      marginBottom: 8,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    modalHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    modalHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FFF3E0",
      alignItems: "center",
      justifyContent: "center",
    },
    deleteModalHeaderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#FEE2E2",
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#F9FAFB",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#E5E7EB",
    },
    modalHero: {
      alignItems: "center",
      paddingVertical: 8,
      marginBottom: 14,
    },
    modalIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: "#FFE0B2",
      marginBottom: 10,
    },
    modalAppName: {
      fontSize: 20,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: "#FFE0B2",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 10,
    },
    versionBadgeText: {
      fontSize: 13,
      fontFamily: fontFamilies.heavy,
      color: "#E67E22",
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: fontFamilies.medium,
      color: "#888888",
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 14,
    },
    creditRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: "#F9FAFB",
      borderWidth: 1,
      borderColor: "#F4F5F7",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    creditText: {
      fontSize: 12,
      fontFamily: fontFamilies.medium,
      color: "#666666",
      lineHeight: 17,
    },
    creditLink: {
      fontSize: 12,
      fontFamily: fontFamilies.heavy,
      color: "#FF8C00",
      marginTop: 4,
      textDecorationLine: "underline",
    },
    modalCopyright: {
      fontSize: 11,
      fontFamily: fontFamilies.regular,
      color: "#9CA3AF",
      marginTop: 12,
      textAlign: "center",
    },
    dataStatusBlock: {
      backgroundColor: "#F9FAFB",
      borderWidth: 1,
      borderColor: "#F4F5F7",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      gap: 8,
    },
    dataStatusTitle: {
      fontSize: 12,
      fontFamily: fontFamilies.heavy,
      color: "#333333",
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
      fontFamily: fontFamilies.medium,
      color: "#666666",
      lineHeight: 17,
    },
    modalPrimaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 6,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: "#E67E22",
      backgroundColor: "#FF8C00",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    modalPrimaryBtnText: {
      fontSize: 15,
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
    /* Delete Account Modal */
    deleteModalWarning: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    deleteModalWarningText: {
      flex: 1,
      fontSize: 13,
      fontFamily: fontFamilies.medium,
      color: "#B91C1C",
      lineHeight: 18,
    },
    deleteModalText: {
      fontSize: 13,
      fontFamily: fontFamilies.medium,
      color: "#666666",
      lineHeight: 18,
      marginBottom: 4,
    },
    deleteModalPhrase: {
      fontFamily: fontFamilies.heavy,
      color: "#EF4444",
      textTransform: "uppercase",
    },
    deleteModalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    deleteModalCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: "#E5E7EB",
      backgroundColor: "#FFFFFF",
    },
    deleteModalCancelText: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: "#6B7280",
    },
    deleteModalConfirmBtn: {
      flex: 1.4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: "#DC2626",
      backgroundColor: "#EF4444",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    deleteModalConfirmBtnDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
    deleteModalConfirmText: {
      fontSize: 14,
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
    },
  });
