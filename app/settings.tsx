import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { deleteAccountData } from "@/services/database";
import { getContentDbStatus, contentRepository } from "@/services/content-db";
import { getSoundEnabled, setSoundEnabled } from "@/services/storage";
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
    Modal,
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
  const {
    userProfile,
    updateUserProfile,
  } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  const THEME = theme.palettes.settings;
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    userProfile?.display_name || userProfile?.username || "",
  );
  const [soundEffects, setSoundEffects] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [contentDbLabel, setContentDbLabel] = useState("Checking...");
  const [contentDbError, setContentDbError] = useState<string | null>(null);

  // Surface the bundled content database status so seeding failures are
  // visible in the app instead of showing "no data" screens.
  useEffect(() => {
    let mounted = true;

    const checkContentDb = async () => {
      try {
        const { seeded, version, lastError } = getContentDbStatus();
        if (lastError) {
          if (mounted) {
            setContentDbError(lastError);
            setContentDbLabel(`Seed failed (v${version})`);
          }
          return;
        }
        if (seeded) {
          if (mounted) {
            setContentDbLabel(`Ready (v${version})`);
          }
          return;
        }
        const lessonCount = await contentRepository.getLessonCount();
        if (mounted) {
          setContentDbLabel(
            lessonCount > 0 ? `Ready — ${lessonCount} lessons (v${version})` : "Empty",
          );
        }
      } catch (error) {
        if (mounted) {
          setContentDbError(error instanceof Error ? error.message : String(error));
          setContentDbLabel("Unavailable");
        }
      }
    };

    void checkContentDb();

    return () => {
      mounted = false;
    };
  }, []);

  const nextDisplayNameChangeAt =
    userProfile?.next_display_name_change_at &&
    userProfile.next_display_name_change_at > 0
      ? userProfile.next_display_name_change_at
      : 0;
  const canChangeDisplayName =
    !nextDisplayNameChangeAt || Date.now() >= nextDisplayNameChangeAt;

  const formatCooldown = (timestamp: number) => {
    const diffMs = Math.max(timestamp - Date.now(), 0);
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays <= 1) {
      return "You can change your display name again in less than 1 day.";
    }

    return `You can change your display name again in ${diffDays} days.`;
  };

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const soundEnabled = await getSoundEnabled();
        if (mounted) {
          setSoundEffects(soundEnabled);
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
    setDisplayName(userProfile?.display_name || userProfile?.username || "");
  }, [userProfile?.display_name, userProfile?.username]);

  const handleSaveDisplayName = async () => {
    const nextDisplayName = displayName.trim();

    if (nextDisplayName.length < 3) {
      Alert.alert("Error", "Display name must be at least 3 characters long");
      return;
    }

    if (!canChangeDisplayName && nextDisplayNameChangeAt) {
      Alert.alert("Cooldown Active", formatCooldown(nextDisplayNameChangeAt));
      return;
    }

    try {
      // Always save locally first so profile updates still work offline.
      await updateUserProfile({ display_name: nextDisplayName });
      setIsEditing(false);

      Alert.alert(
        "Success",
        "Display name updated successfully! You can change it again in 7 days.",
      );
    } catch (error) {
      const nextAllowedAt = (error as { nextAllowedAt?: number })
        ?.nextAllowedAt;
      if (nextAllowedAt) {
        Alert.alert("Cooldown Active", formatCooldown(nextAllowedAt));
        return;
      }

      Alert.alert("Error", "Failed to update display name");
    }
  };

  const handlePrivacyPolicy = () => {
    router.push("/privacy-policy");
  };

  const handleTermsOfService = () => {
    router.push("/terms-of-service");
  };

  const handleSoundEffectsToggle = (enabled: boolean) => {
    setSoundEffects(enabled);
    setUiSfxEnabled(enabled);
    void setSoundEnabled(enabled);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all local data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure you want to delete your account forever?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: () => {
                    void executeDeleteAccount();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const styles = React.useMemo(() => createStyles(THEME), [THEME]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Profile"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Display Name</Text>
                  <Text style={styles.settingDescription}>
                    Can be changed once every 7 days
                  </Text>
                </View>
              </View>
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.input}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter display name"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleSaveDisplayName}
                    style={styles.saveBtn}
                    disabled={!canChangeDisplayName}
                  >
                    <Icon
                      name="TickCircle"
                      size={20}
                      color={canChangeDisplayName ? "#2ECC71" : THEME.textMuted}
                      variant="Bold"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(false);
                      setDisplayName(
                        userProfile?.display_name ||
                          userProfile?.username ||
                          "",
                      );
                    }}
                    style={styles.cancelBtn}
                  >
                    <Icon
                      name="CloseCircle"
                      size={20}
                      color="#EF4444"
                      variant="Bold"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.valueRow}
                >
                  <Text style={styles.settingValue}>
                    {userProfile?.display_name || userProfile?.username}
                  </Text>
                  <Icon name="Edit" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {!canChangeDisplayName && nextDisplayNameChangeAt ? (
              <View style={styles.cooldownBanner}>
                <Text style={styles.cooldownText}>
                  {formatCooldown(nextDisplayNameChangeAt)}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
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
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
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

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Document"
                  size={20}
                  color={contentDbError ? "#EF4444" : THEME.primary}
                  variant="Bold"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Content Database</Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      contentDbError ? { color: "#EF4444" } : null,
                    ]}
                    numberOfLines={2}
                  >
                    {contentDbError
                      ? `Seed error: ${contentDbError}`
                      : contentDbLabel}
                  </Text>
                </View>
              </View>
            </View>

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
            <TouchableOpacity
              onPress={() => setVersionModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="CloseCircle" size={28} color={THEME.textMuted} variant="Bold" />
            </TouchableOpacity>

            <View style={styles.modalIconWrap}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.modalIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.modalTitle}>AtomIQ</Text>
            <View style={styles.versionBadge}>
              <Icon name="Crown1" size={13} color="#FFC107" variant="Bold" />
              <Text style={styles.versionBadgeText}>Version {APP_VERSION}</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Learn nuclear science one atom at a time.
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalInfoRow}>
              <Icon name="Code" size={18} color={THEME.primary} variant="Bold" />
              <Text style={styles.modalInfoText}>Built with React Native</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Icon name="DocumentText" size={18} color={THEME.primary} variant="Bold" />
              <Text style={styles.modalInfoText}>Educational content</Text>
            </View>

            <Text style={styles.modalCopyright}>
              © 2026 AtomIQ. All rights reserved.
            </Text>

            <TouchableOpacity
              style={styles.modalGotItBtn}
              onPress={() => setVersionModalVisible(false)}
            >
              <Text style={styles.modalGotItText}>Got it!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
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
      fontWeight: "600",
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
      fontWeight: "500",
      fontFamily: fontFamilies.medium,
      color: theme.textMuted,
      marginRight: 8,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
      justifyContent: "flex-end",
    },
    input: {
      flex: 1,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
      fontFamily: fontFamilies.regular,
      color: theme.text,
    },
    saveBtn: {
      padding: 8,
      backgroundColor: theme.primary + "10",
      borderRadius: 8,
    },
    cancelBtn: {
      padding: 8,
    },
    cooldownBanner: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cooldownText: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      lineHeight: 18,
    },
    destructiveLabel: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#EF4444",
    },
    /* App Version Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
    },
    modalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: theme.card,
      borderRadius: 28,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    modalCloseBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      padding: 4,
      zIndex: 10,
    },
    modalIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor: "#FFF7ED",
      borderWidth: 2,
      borderColor: "#FFEDD5",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },
    modalIcon: {
      width: 64,
      height: 64,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 10,
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FEF3C7",
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      marginBottom: 14,
    },
    versionBadgeText: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#92400E",
    },
    modalSubtitle: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 18,
    },
    modalDivider: {
      width: "70%",
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 18,
    },
    modalInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    modalInfoText: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.text,
    },
    modalCopyright: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      marginTop: 6,
      marginBottom: 18,
    },
    modalGotItBtn: {
      alignSelf: "stretch",
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    modalGotItText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#FFFFFF",
    },
  });
