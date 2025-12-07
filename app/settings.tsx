import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-color-scheme.tsx';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { clearAllData } from '@/services/database';
import { useStorage } from '@/services/StorageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, updateUserProfile, clearStorage } = useStorage();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(userProfile?.username || '');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);

  const handleSaveUsername = async () => {
    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }
    
    try {
      await updateUserProfile({ username: username.trim() });
      setIsEditing(false);
      Alert.alert('Success', 'Username updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update username');
    }
  };

  const handleClearProgress = () => {
    Alert.alert(
      'Clear All Progress',
      'Are you sure you want to delete all your progress? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear database
              await clearAllData();
              // Clear AsyncStorage
              await AsyncStorage.clear();
              Alert.alert('Success', 'All progress has been cleared', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/onboarding'),
                },
              ]);
            } catch (error) {
              console.error('Error clearing progress:', error);
              Alert.alert('Error', 'Failed to clear progress');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Return to Title Screen',
      'Are you sure you want to return to the title screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => {
            router.replace('/');
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'AtomIQ Privacy Policy\n\n' +
      '1. Data Collection: We collect minimal user data including username, progress, and achievements stored locally on your device.\n\n' +
      '2. Data Storage: All data is stored locally using SQLite. When Supabase sync is enabled, data may be synced to secure cloud storage.\n\n' +
      '3. Data Usage: Your data is used solely to provide and improve the learning experience.\n\n' +
      '4. Third-Party Services: We may use Google Gemini AI for chat assistance. Chat data is processed according to Google\'s privacy policy.\n\n' +
      '5. User Rights: You can delete all your data at any time from the settings.\n\n' +
      'For more information, visit our website.',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'AtomIQ Terms of Service\n\n' +
      '1. Acceptance: By using AtomIQ, you agree to these terms.\n\n' +
      '2. Educational Purpose: This app is for educational purposes only and provides information about nuclear science.\n\n' +
      '3. Content Accuracy: While we strive for accuracy, content is provided "as is" without warranties.\n\n' +
      '4. User Conduct: Users must use the app responsibly and not attempt to compromise its security.\n\n' +
      '5. Account: You are responsible for maintaining the security of your account.\n\n' +
      '6. Termination: We reserve the right to terminate access for violations of these terms.\n\n' +
      '7. Changes: Terms may be updated periodically. Continued use constitutes acceptance.\n\n' +
      'For complete terms, visit our website.',
      [{ text: 'OK' }]
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ArrowLeft2" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            {/* User ID (Read-only) */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon name="ShieldTick" size={20} color={colors.primary} variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>User ID</Text>
                  <Text style={styles.settingDescription}>Your unique identifier</Text>
                </View>
              </View>
              <Text style={[styles.settingValue, styles.userIdText]} numberOfLines={1}>
                {userProfile?.user_id || 'Not set'}
              </Text>
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="Profile" size={20} color={colors.primary} variant="Bold" />
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
                  <TouchableOpacity onPress={handleSaveUsername} style={styles.saveBtn}>
                    <Icon name="TickCircle" size={20} color="#2ECC71" variant="Bold" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setIsEditing(false);
                    setUsername(userProfile?.username || '');
                  }} style={styles.cancelBtn}>
                    <Icon name="CloseCircle" size={20} color="#EF4444" variant="Bold" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.valueRow}>
                  <Text style={styles.settingValue}>{userProfile?.username}</Text>
                  <Icon name="Edit" size={18} color={colors.textSecondary} />
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
                <Icon name="Moon" size={20} color={colors.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>Switch between light and dark theme</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E5E5', true: '#F97316' }}
                thumbColor={isDark ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="Notification" size={20} color={colors.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Receive updates and reminders</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E5E5E5', true: '#F97316' }}
                thumbColor={notifications ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="VolumeHigh" size={20} color={colors.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Sound Effects</Text>
                  <Text style={styles.settingDescription}>Play sounds for actions</Text>
                </View>
              </View>
              <Switch
                value={soundEffects}
                onValueChange={setSoundEffects}
                trackColor={{ false: '#E5E5E5', true: '#F97316' }}
                thumbColor={soundEffects ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="Clock" size={20} color={colors.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Daily Reminder</Text>
                  <Text style={styles.settingDescription}>Remind me to learn daily</Text>
                </View>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                trackColor={{ false: '#E5E5E5', true: '#F97316' }}
                thumbColor={dailyReminder ? colors.primary : colors.textSecondary}
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
                <Icon name="InfoCircle" size={20} color={colors.primary} variant="Bold" />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.settingValue}>1.0.0</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={handlePrivacyPolicy}>
              <View style={styles.settingInfo}>
                <Icon name="DocumentText" size={20} color={colors.primary} variant="Bold" />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={handleTermsOfService}>
              <View style={styles.settingInfo}>
                <Icon name="Shield" size={20} color={colors.primary} variant="Bold" />
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingRow} onPress={handleClearProgress}>
              <View style={styles.settingInfo}>
                <Icon name="Trash" size={20} color="#EF4444" variant="Bold" />
                <View>
                  <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Clear All Progress</Text>
                  <Text style={styles.settingDescription}>Delete all your data</Text>
                </View>
              </View>
              <Icon name="ArrowRight2" size={18} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={handleLogout}>
              <View style={styles.settingInfo}>
                <Icon name="Home" size={20} color={colors.primary} variant="Bold" />
                <Text style={styles.settingLabel}>Return to Title Screen</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.card === '#FFFFFF' ? '#E5E5E5' : '#2A2A2A',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.card === '#FFFFFF' ? '#E5E5E5' : '#2A2A2A',
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.card === '#FFFFFF' ? '#E5E5E5' : '#2A2A2A',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 8,
  },
  userIdText: {
    fontFamily: 'monospace',
    fontSize: 11,
    maxWidth: 180,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.card === '#FFFFFF' ? '#E5E5E5' : '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  saveBtn: {
    padding: 4,
  },
  cancelBtn: {
    padding: 4,
  },
});

