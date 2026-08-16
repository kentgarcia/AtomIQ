import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { clearAllData, deleteAccountData } from "@/services/database";
import { getSoundEnabled, setSoundEnabled } from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import { setUiSfxEnabled } from "@/services/ui-sfx";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

  const handleClearProgress = () => {
    Alert.alert(
      "Clear All Progress",
      "Are you sure you want to delete all your progress? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear database
              await clearAllData();
              // Clear AsyncStorage
              await AsyncStorage.clear();
              Alert.alert("Success", "All progress has been cleared", [
                {
                  text: "OK",
                  onPress: () => router.replace("/onboarding"),
                },
              ]);
            } catch (error) {
              console.error("Error clearing progress:", error);
              Alert.alert("Error", "Failed to clear progress");
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Return to Title Screen",
      "Are you sure you want to return to the title screen?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "default",
          onPress: () => {
            router.replace("/");
          },
        },
      ],
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      "Privacy Policy",
      "AtomIQ Privacy Policy\n\n" +
        "1. Data Collection: We collect minimal user data including display name, progress, and achievements stored locally on your device.\n\n" +
        "2. Data Storage: All data is stored locally using SQLite.\n\n" +
        "3. Data Usage: Your data is used solely to provide and improve the learning experience.\n\n" +
        "4. Third-Party Services: We may use Google Gemini AI for chat assistance. Chat data is processed according to Google's privacy policy.\n\n" +
        "5. User Rights: You can delete all your data at any time from the settings.\n\n" +
        "For more information, visit our website.",
      [{ text: "OK" }],
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      "Terms of Service",
      "AtomIQ Terms of Service\n\n" +
        "1. Acceptance: By using AtomIQ, you agree to these terms.\n\n" +
        "2. Educational Purpose: This app is for educational purposes only and provides information about nuclear science.\n\n" +
        '3. Content Accuracy: While we strive for accuracy, content is provided "as is" without warranties.\n\n' +
        "4. User Conduct: Users must use the app responsibly and not attempt to compromise its security.\n\n" +
        "5. Account: You are responsible for maintaining the security of your account.\n\n" +
        "6. Termination: We reserve the right to terminate access for violations of these terms.\n\n" +
        "7. Changes: Terms may be updated periodically. Continued use constitutes acceptance.\n\n" +
        "For complete terms, visit our website.",
      [{ text: "OK" }],
    );
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
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="InfoCircle"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.settingValue}>1.0.0</Text>
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
  });
