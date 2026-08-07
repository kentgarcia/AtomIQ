import { Icon } from "@/components/ui/icon";
import { useTheme, type Palette } from "@/theme";
import { clearAllData, deleteAccountData } from "@/services/database";
import { getSoundEnabled, setSoundEnabled } from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import {
    isSupabaseConfigured,
    issueTransferCode,
    previewTransferCode,
    redeemTransferCode,
    supabase,
    type TransferCodeRedeemProfile,
} from "@/services/supabase";
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
    syncProfileToSupabase,
    isOnline,
    isSyncing,
    pendingChanges,
    lastSyncedAt,
  } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  const THEME = theme.palettes.settings;
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    userProfile?.display_name || userProfile?.username || "",
  );
  const [soundEffects, setSoundEffects] = useState(true);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isTransferCodeActionLoading, setIsTransferCodeActionLoading] =
    useState(false);
  const [activeTransferCode, setActiveTransferCode] = useState<string | null>(
    null,
  );
  const [transferCodeExpiresAt, setTransferCodeExpiresAt] = useState<
    string | null
  >(null);
  const [transferCodeInput, setTransferCodeInput] = useState("");
  const [previewTransferProfile, setPreviewTransferProfile] =
    useState<TransferCodeRedeemProfile | null>(null);
  const [pendingTransferCode, setPendingTransferCode] = useState<string | null>(
    null,
  );

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

  const normalizeTransferCodeInput = (value: string): string => {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  };

  const getTransferCodeExpiryText = (expiresAt: string | null): string => {
    if (!expiresAt) {
      return "Generate a code to move your account to another device";
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      return "Code expires soon";
    }

    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      return "Code expired - generate a new one";
    }

    const remainingMinutes = Math.max(Math.ceil(remainingMs / (60 * 1000)), 1);
    return `Expires in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
  };

  const syncBeforeTransferAction = async (): Promise<boolean> => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Transfer code actions require internet so your data can sync first.",
      );
      return false;
    }

    const synced = await syncProfileToSupabase();
    if (!synced) {
      Alert.alert(
        "Sync Required",
        "Unable to sync your latest data. Try again when network is stable.",
      );
      return false;
    }

    return true;
  };

  const handleManualSyncNow = async () => {
    if (isManualSyncing || isSyncing) {
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert("Unavailable", "Cloud sync is not configured in this build.");
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Internet Required",
        "Connect to the internet, then tap Sync Now to upload your latest data.",
      );
      return;
    }

    try {
      setIsManualSyncing(true);
      const synced = await syncProfileToSupabase();

      if (synced) {
        Alert.alert("Sync Complete", "Your latest data is now synced online.");
      } else {
        Alert.alert(
          "Sync Needed",
          "Unable to sync right now. Keep internet on and tap Sync Now again.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Sync Failed",
        "Unable to sync right now. Please try again in a moment.",
      );
    } finally {
      setIsManualSyncing(false);
    }
  };

  const syncStatusDescription = (() => {
    if (!isSupabaseConfigured()) {
      return "Cloud sync is unavailable in this build.";
    }

    if (!isOnline) {
      return "Offline. Connect to internet and tap Sync Now.";
    }

    if (isSyncing || isManualSyncing) {
      return "Syncing your latest changes...";
    }

    if (pendingChanges > 0) {
      return `${pendingChanges} change${pendingChanges === 1 ? "" : "s"} pending. Tap Sync Now if auto-sync is delayed.`;
    }

    if (lastSyncedAt) {
      return `Last synced at ${new Date(lastSyncedAt).toLocaleTimeString()}.`;
    }

    return "Ready. Tap Sync Now anytime if your changes are not appearing online.";
  })();

  const handleGenerateTransferCode = async () => {
    if (isTransferCodeActionLoading) {
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        "Unavailable",
        "Transfer codes require Supabase configuration in this build.",
      );
      return;
    }

    try {
      const syncReady = await syncBeforeTransferAction();
      if (!syncReady) {
        return;
      }

      setIsTransferCodeActionLoading(true);
      const result = await issueTransferCode();

      if (result.status === "success") {
        setActiveTransferCode(result.code ?? null);
        setTransferCodeExpiresAt(result.expiresAt ?? null);
        setPreviewTransferProfile(null);
        setPendingTransferCode(null);
        Alert.alert(
          "Transfer Code Ready",
          `Use ${result.code} on your new device. ${getTransferCodeExpiryText(result.expiresAt ?? null)}.`,
        );
        return;
      }

      Alert.alert(
        "Transfer Code",
        result.message || "Unable to generate a transfer code.",
      );
    } catch (error) {
      Alert.alert(
        "Transfer Code",
        error instanceof Error
          ? error.message
          : "Unable to generate a transfer code.",
      );
    } finally {
      setIsTransferCodeActionLoading(false);
    }
  };

  const handlePreviewTransferCode = async () => {
    if (isTransferCodeActionLoading) {
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert(
        "Unavailable",
        "Transfer codes require Supabase configuration in this build.",
      );
      return;
    }

    const normalizedCode = normalizeTransferCodeInput(transferCodeInput);
    if (normalizedCode.length !== 8) {
      Alert.alert("Invalid Code", "Transfer code must be 8 letters or digits.");
      return;
    }

    try {
      const syncReady = await syncBeforeTransferAction();
      if (!syncReady) {
        return;
      }

      setIsTransferCodeActionLoading(true);
      const result = await previewTransferCode(normalizedCode);

      if (result.status !== "success" || !result.profile) {
        Alert.alert(
          "Transfer Code",
          result.message || "Unable to import account from this code.",
        );
        return;
      }

      setPendingTransferCode(normalizedCode);
      setPreviewTransferProfile(result.profile);
    } catch (error) {
      Alert.alert(
        "Transfer Code",
        error instanceof Error
          ? error.message
          : "Unable to preview account from this code.",
      );
    } finally {
      setIsTransferCodeActionLoading(false);
    }
  };

  const executeTransferOverwrite = async () => {
    if (!pendingTransferCode || !previewTransferProfile) {
      return;
    }

    if (isTransferCodeActionLoading) {
      return;
    }

    try {
      const syncReady = await syncBeforeTransferAction();
      if (!syncReady) {
        return;
      }

      setIsTransferCodeActionLoading(true);
      const result = await redeemTransferCode(pendingTransferCode, true);

      if (result.status !== "success" || !result.profile) {
        Alert.alert(
          "Transfer Code",
          result.message || "Unable to overwrite current data with this code.",
        );
        return;
      }

      await updateUserProfile({
        user_id: result.profile.user_id,
        username: result.profile.username,
        display_name: result.profile.display_name,
        friend_code: result.profile.friend_code || undefined,
        display_name_updated_at: result.profile.display_name_updated_at,
        next_display_name_change_at: result.profile.next_display_name_change_at,
        avatar_url: result.profile.avatar_url || "",
        total_xp: result.profile.total_xp,
        current_streak: result.profile.current_streak,
        longest_streak: result.profile.longest_streak,
        myths_busted: result.profile.myths_busted,
        lessons_completed: result.profile.lessons_completed,
      });

      setTransferCodeInput("");
      setActiveTransferCode(null);
      setTransferCodeExpiresAt(null);
      setPendingTransferCode(null);
      setPreviewTransferProfile(null);

      Alert.alert(
        "Account Imported",
        "Your current device data has been overwritten with the transfer code profile.",
      );
    } catch (error) {
      Alert.alert(
        "Transfer Code",
        error instanceof Error
          ? error.message
          : "Unable to overwrite current data with this code.",
      );
    } finally {
      setIsTransferCodeActionLoading(false);
    }
  };

  const handleConfirmTransferOverwrite = () => {
    if (!previewTransferProfile) {
      return;
    }

    Alert.alert(
      "Overwrite Current Data",
      "This will replace your current local profile with the previewed transfer data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Overwrite",
          style: "destructive",
          onPress: () => {
            void executeTransferOverwrite();
          },
        },
      ],
    );
  };

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

      const cloudSyncEnabled = isSupabaseConfigured();
      if (!cloudSyncEnabled) {
        Alert.alert(
          "Success",
          "Display name updated successfully! You can change it again in 7 days.",
        );
        return;
      }

      if (!isOnline) {
        Alert.alert(
          "Saved Offline",
          "Display name updated on this device. It will sync automatically when internet is available.",
        );
        return;
      }

      const synced = await syncProfileToSupabase();
      if (!synced) {
        Alert.alert(
          "Saved Locally",
          "Display name updated on this device. Cloud sync will retry automatically when network is stable.",
        );
        return;
      }

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

      if (!isOnline) {
        Alert.alert(
          "Offline",
          "Unable to update display name right now while offline. Please try again once internet is available.",
        );
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
        "2. Data Storage: All data is stored locally using SQLite. When Supabase sync is enabled, data may be synced to secure cloud storage.\n\n" +
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

  const isIgnorableSupabaseError = (error: any): boolean => {
    return error?.code === "PGRST205" || error?.code === "42P01";
  };

  const deleteRemoteAccountData = async (userId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const runDelete = async (operation: Promise<{ error: any }>) => {
        const { error } = await operation;
        if (error && !isIgnorableSupabaseError(error)) {
          throw error;
        }
      };

      await runDelete(
        supabase.from("friend_requests").delete().eq("from_user_id", userId),
      );
      await runDelete(
        supabase.from("friend_requests").delete().eq("to_user_id", userId),
      );
      await runDelete(supabase.from("friends").delete().eq("user_id", userId));
      await runDelete(
        supabase.from("friends").delete().eq("friend_id", userId),
      );
      await runDelete(supabase.from("comments").delete().eq("user_id", userId));
      await runDelete(
        supabase.from("feed_comments").delete().eq("user_id", userId),
      );
      await runDelete(
        supabase.from("user_stats").delete().eq("user_id", userId),
      );
      await runDelete(
        supabase.from("leaderboard").delete().eq("user_id", userId),
      );
      await runDelete(supabase.from("users").delete().eq("user_id", userId));

      await supabase.auth.signOut();
      return true;
    } catch (error) {
      console.error("Error deleting remote account data:", error);
      return false;
    }
  };

  const executeDeleteAccount = async () => {
    if (isDeletingAccount) {
      return;
    }

    try {
      setIsDeletingAccount(true);

      let remoteCleanupSucceeded = true;
      if (userProfile?.user_id) {
        remoteCleanupSucceeded = await deleteRemoteAccountData(
          userProfile.user_id,
        );
      }

      await deleteAccountData();
      await AsyncStorage.clear();

      Alert.alert(
        remoteCleanupSucceeded ? "Account Deleted" : "Account Deleted Locally",
        remoteCleanupSucceeded
          ? "Your account has been deleted."
          : "Your account was deleted on this device, but cloud cleanup could not be completed.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/onboarding"),
          },
        ],
      );
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
                  name="ShieldTick"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Friend Code</Text>
                  <Text style={styles.settingDescription}>
                    Share this code so others can add you
                  </Text>
                </View>
              </View>
              <Text style={[styles.settingValue, styles.friendCodeValue]}>
                {userProfile?.friend_code || "Generating..."}
              </Text>
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
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

        {/* Cloud Sync Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.sectionTitle}>Cloud Sync</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Refresh"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Sync Status</Text>
                  <Text style={styles.settingDescription}>
                    {syncStatusDescription}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.cloudActionBtn,
                  (!isSupabaseConfigured() ||
                    !isOnline ||
                    isManualSyncing ||
                    isSyncing) &&
                    styles.cloudActionBtnDisabled,
                ]}
                onPress={handleManualSyncNow}
                disabled={
                  !isSupabaseConfigured() ||
                  !isOnline ||
                  isManualSyncing ||
                  isSyncing
                }
              >
                {isManualSyncing || isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.cloudActionBtnText}>Sync Now</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Profile"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Transfer Code</Text>
                  <Text style={styles.settingDescription}>
                    {getTransferCodeExpiryText(transferCodeExpiresAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.cloudActionBtn,
                  (!isSupabaseConfigured() || isTransferCodeActionLoading) &&
                    styles.cloudActionBtnDisabled,
                ]}
                onPress={handleGenerateTransferCode}
                disabled={
                  !isSupabaseConfigured() || isTransferCodeActionLoading
                }
              >
                {isTransferCodeActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.cloudActionBtnText}>
                    {activeTransferCode ? "Regenerate" : "Generate"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {activeTransferCode ? (
              <View style={[styles.settingRow, styles.settingRowBorder]}>
                <View style={styles.settingInfo}>
                  <Icon
                    name="ShieldTick"
                    size={20}
                    color={THEME.primary}
                    variant="Bold"
                  />
                  <View>
                    <Text style={styles.settingLabel}>Active Code</Text>
                    <Text style={styles.settingDescription}>
                      Enter this on your new device
                    </Text>
                  </View>
                </View>
                <Text style={styles.transferCodeValue}>
                  {activeTransferCode}
                </Text>
              </View>
            ) : null}

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <TextInput
                style={[styles.input, styles.transferCodeInput]}
                value={transferCodeInput}
                onChangeText={(text) => {
                  setTransferCodeInput(normalizeTransferCodeInput(text));
                  setPendingTransferCode(null);
                  setPreviewTransferProfile(null);
                }}
                placeholder="Enter transfer code"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={8}
              />
              <TouchableOpacity
                style={[
                  styles.cloudActionBtn,
                  styles.transferCodeRedeemBtn,
                  (!isSupabaseConfigured() || isTransferCodeActionLoading) &&
                    styles.cloudActionBtnDisabled,
                ]}
                onPress={handlePreviewTransferCode}
                disabled={
                  !isSupabaseConfigured() || isTransferCodeActionLoading
                }
              >
                {isTransferCodeActionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.cloudActionBtnText}>Preview</Text>
                )}
              </TouchableOpacity>
            </View>

            {previewTransferProfile ? (
              <View
                style={[styles.transferPreviewCard, styles.settingRowBorder]}
              >
                <Text style={styles.transferPreviewTitle}>
                  Code Data Preview
                </Text>
                <Text style={styles.transferPreviewLine}>
                  Display Name: {previewTransferProfile.display_name}
                </Text>
                <Text style={styles.transferPreviewLine}>
                  Friend Code: {previewTransferProfile.friend_code || "None"}
                </Text>
                <Text style={styles.transferPreviewLine}>
                  XP: {previewTransferProfile.total_xp}
                </Text>
                <Text style={styles.transferPreviewLine}>
                  Lessons: {previewTransferProfile.lessons_completed}
                </Text>
                <Text style={styles.transferPreviewLine}>
                  Myths Busted: {previewTransferProfile.myths_busted}
                </Text>

                <TouchableOpacity
                  style={styles.transferOverwriteBtn}
                  onPress={handleConfirmTransferOverwrite}
                  disabled={isTransferCodeActionLoading}
                >
                  <Text style={styles.transferOverwriteBtnText}>
                    Overwrite Current Data
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
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
      color: theme.text,
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textMuted,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.textMuted,
      marginRight: 8,
    },
    cloudActionBtn: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      minWidth: 100,
      alignItems: "center",
      justifyContent: "center",
    },
    cloudActionBtnDisabled: {
      opacity: 0.6,
    },
    cloudActionBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    friendCodeValue: {
      fontFamily: "monospace",
      fontSize: 13,
      fontWeight: "700",
      color: theme.primary,
      textTransform: "uppercase",
      letterSpacing: 1,
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
      color: theme.text,
    },
    transferCodeInput: {
      marginRight: 0,
    },
    transferCodeRedeemBtn: {
      marginLeft: 10,
      minWidth: 88,
    },
    transferCodeValue: {
      fontFamily: "monospace",
      fontSize: 18,
      fontWeight: "700",
      color: theme.primary,
      letterSpacing: 2,
    },
    transferPreviewCard: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      gap: 4,
      backgroundColor: theme.bg,
    },
    transferPreviewTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 6,
    },
    transferPreviewLine: {
      fontSize: 13,
      color: theme.textMuted,
    },
    transferOverwriteBtn: {
      marginTop: 12,
      backgroundColor: "#EF4444",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    transferOverwriteBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
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
      lineHeight: 18,
    },
    destructiveLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#EF4444",
    },
  });
