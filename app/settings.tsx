import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-color-scheme";
import { clearAllData, deleteAccountData } from "@/services/database";
import { getSoundEnabled, setSoundEnabled } from "@/services/storage";
import { useStorage } from "@/services/StorageContext";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
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

const LightTHEME = {
  bg: "#F8F9FE",
  card: "#FFFFFF",
  text: "#32325D",
  textMuted: "#8898AA",
  primary: "#EA580C",
  border: "#E5E7EB",
};

const DarkTHEME = {
  bg: "#172B4D",
  card: "#213356",
  text: "#F6F9FC",
  textMuted: "#8898AA",
  primary: "#EA580C",
  border: "#2D3A56",
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile } = useStorage();
  const { colorScheme, isDark, toggleTheme } = useTheme();
  const THEME = colorScheme === "dark" ? DarkTHEME : LightTHEME;
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(userProfile?.username || "");
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleSaveUsername = async () => {
    if (username.trim().length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters long");
      return;
    }

    try {
      await updateUserProfile({ username: username.trim() });
      setIsEditing(false);
      Alert.alert("Success", "Username updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update username");
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
        "1. Data Collection: We collect minimal user data including username, progress, and achievements stored locally on your device.\n\n" +
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
            {/* User ID (Read-only) */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon
                  name="ShieldTick"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>User ID</Text>
                  <Text style={styles.settingDescription}>
                    Your unique identifier
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.settingValue, styles.userIdText]}
                numberOfLines={1}
              >
                {userProfile?.user_id || "Not set"}
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
                <Text style={styles.settingLabel}>Username</Text>
              </View>
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleSaveUsername}
                    style={styles.saveBtn}
                  >
                    <Icon
                      name="TickCircle"
                      size={20}
                      color="#2ECC71"
                      variant="Bold"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(false);
                      setUsername(userProfile?.username || "");
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
                    {userProfile?.username}
                  </Text>
                  <Icon name="Edit" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              )}
            </View>
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
                  name="Notification"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive updates and reminders
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#E5E5E5", true: THEME.primary }}
                thumbColor={notifications ? "#FFFFFF" : "#FFFFFF"}
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

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon
                  name="Clock"
                  size={20}
                  color={THEME.primary}
                  variant="Bold"
                />
                <View>
                  <Text style={styles.settingLabel}>Daily Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Remind me to learn daily
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                trackColor={{ false: "#E5E5E5", true: THEME.primary }}
                thumbColor={dailyReminder ? "#FFFFFF" : "#FFFFFF"}
              />
            </View>
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
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
        <Animated.View entering={FadeInDown.delay(400).springify()}>
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

const createStyles = (theme: typeof LightTHEME) =>
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
    userIdText: {
      fontFamily: "monospace",
      fontSize: 12,
      maxWidth: 180,
      color: theme.textMuted,
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
    saveBtn: {
      padding: 8,
      backgroundColor: theme.primary + "10",
      borderRadius: 8,
    },
    cancelBtn: {
      padding: 8,
    },
    destructiveLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#EF4444",
    },
  });
