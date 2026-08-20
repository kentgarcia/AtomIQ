import { Icon } from "@/components/ui/icon";
import {useTheme, type Palette, fontFamilies} from "@/theme";
import { deleteAccountData } from "@/services/database";
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
  const { userProfile } = useStorage();
  const { theme, isDark, toggleTheme } = useTheme();
  const THEME = theme.palettes.settings;
  const [soundEffects, setSoundEffects] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const deleteConfirmationPhrase =
    userProfile?.display_name || userProfile?.username || "DELETE";
  const canConfirmDelete =
    confirmText.trim().toLowerCase() ===
    deleteConfirmationPhrase.trim().toLowerCase();

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
    setConfirmText("");
  }, [deleteModalVisible]);

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

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.deleteModalCard}
          >
            <TouchableOpacity
              onPress={() => setDeleteModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="CloseCircle" size={28} color={THEME.textMuted} variant="Bold" />
            </TouchableOpacity>

            <View style={styles.deleteModalIconWrap}>
              <Icon name="Trash" size={32} color="#EF4444" variant="Bold" />
            </View>

            <Text style={styles.deleteModalTitle}>Delete Account?</Text>

            <Text style={styles.deleteModalText}>
              This will permanently delete your account and all local data. This
              action cannot be undone.
            </Text>

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
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.deleteModalCancelBtn}
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
                disabled={!canConfirmDelete || isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete Forever</Text>
                )}
              </TouchableOpacity>
            </View>
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
    /* Delete Account Modal */
    deleteModalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: theme.card,
      borderRadius: 28,
      padding: 28,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    deleteModalIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: "#FEE2E2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    deleteModalTitle: {
      fontSize: 22,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: theme.text,
      marginBottom: 10,
    },
    deleteModalText: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: theme.textMuted,
      lineHeight: 21,
      marginBottom: 8,
    },
    deleteModalPhrase: {
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#EF4444",
    },
    deleteModalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
    },
    deleteModalCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg,
    },
    deleteModalCancelText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: theme.text,
    },
    deleteModalConfirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      backgroundColor: "#EF4444",
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    deleteModalConfirmBtnDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
    deleteModalConfirmText: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      color: "#FFFFFF",
    },
  });
