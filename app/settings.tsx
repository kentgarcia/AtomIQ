import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#2D3436',
  textMuted: '#636E72',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#F97316',
  green: '#2ECC71',
  red: '#EF4444',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, updateUserProfile, clearStorage } = useStorage();
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
              await clearStorage();
              Alert.alert('Success', 'All progress has been cleared');
              router.replace('/onboarding');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear progress');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem('@atomiq_onboarding_completed', 'false');
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Icon name="Profile" size={20} color={THEME.primary} variant="Bold" />
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
                    <Icon name="TickCircle" size={20} color={THEME.green} variant="Bold" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setIsEditing(false);
                    setUsername(userProfile?.username || '');
                  }} style={styles.cancelBtn}>
                    <Icon name="CloseCircle" size={20} color={THEME.red} variant="Bold" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.valueRow}>
                  <Text style={styles.settingValue}>{userProfile?.username}</Text>
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
                <Icon name="Notification" size={20} color={THEME.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Receive updates and reminders</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: THEME.border, true: THEME.primaryLight }}
                thumbColor={notifications ? THEME.primary : THEME.textMuted}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="VolumeHigh" size={20} color={THEME.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Sound Effects</Text>
                  <Text style={styles.settingDescription}>Play sounds for actions</Text>
                </View>
              </View>
              <Switch
                value={soundEffects}
                onValueChange={setSoundEffects}
                trackColor={{ false: THEME.border, true: THEME.primaryLight }}
                thumbColor={soundEffects ? THEME.primary : THEME.textMuted}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="Clock" size={20} color={THEME.primary} variant="Bold" />
                <View>
                  <Text style={styles.settingLabel}>Daily Reminder</Text>
                  <Text style={styles.settingDescription}>Remind me to learn daily</Text>
                </View>
              </View>
              <Switch
                value={dailyReminder}
                onValueChange={setDailyReminder}
                trackColor={{ false: THEME.border, true: THEME.primaryLight }}
                thumbColor={dailyReminder ? THEME.primary : THEME.textMuted}
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
                <Icon name="InfoCircle" size={20} color={THEME.primary} variant="Bold" />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.settingValue}>1.0.0</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="DocumentText" size={20} color={THEME.primary} variant="Bold" />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]}>
              <View style={styles.settingInfo}>
                <Icon name="Shield" size={20} color={THEME.primary} variant="Bold" />
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
            <TouchableOpacity style={styles.settingRow} onPress={handleClearProgress}>
              <View style={styles.settingInfo}>
                <Icon name="Trash" size={20} color={THEME.red} variant="Bold" />
                <View>
                  <Text style={[styles.settingLabel, { color: THEME.red }]}>Clear All Progress</Text>
                  <Text style={styles.settingDescription}>Delete all your data</Text>
                </View>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.red} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowBorder]} onPress={handleLogout}>
              <View style={styles.settingInfo}>
                <Icon name="Logout" size={20} color={THEME.red} variant="Bold" />
                <Text style={[styles.settingLabel, { color: THEME.red }]}>Logout</Text>
              </View>
              <Icon name="ArrowRight2" size={18} color={THEME.red} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: THEME.card,
    borderBottomWidth: 2,
    borderBottomColor: THEME.border,
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
    color: THEME.text,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
    marginTop: 8,
  },
  settingsCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
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
    borderTopColor: THEME.border,
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
    color: THEME.text,
  },
  settingDescription: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
    marginRight: 8,
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
    backgroundColor: THEME.bg,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  saveBtn: {
    padding: 4,
  },
  cancelBtn: {
    padding: 4,
  },
});

