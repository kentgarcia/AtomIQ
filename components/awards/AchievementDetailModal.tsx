import { LinearGradient } from "expo-linear-gradient";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { TabLight as LightTHEME } from "@/theme";

const createAchievementModalStyles = (
  theme: typeof LightTHEME,
  width: number,
) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    achievementModalContainer: {
      width: width - 40,
      borderRadius: 24,
      overflow: "hidden",
      elevation: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      backgroundColor: theme.card,
    },
    achievementModalHeader: {
      alignItems: "center",
      paddingTop: 40,
      paddingBottom: 20,
      position: "relative",
    },
    achievementModalIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    achievementModalClose: {
      position: "absolute",
      top: 16,
      right: 16,
      padding: 4,
    },
    achievementModalContent: {
      padding: 24,
      paddingTop: 12,
    },
    achievementModalTitle: {
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 8,
      color: theme.text,
    },
    achievementModalRequirement: {
      fontSize: 15,
      color: theme.textMuted,
      textAlign: "center",
      fontWeight: "500",
      marginBottom: 32,
    },
    progressSection: {
      gap: 16,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    progressValue: {
      fontSize: 18,
      fontWeight: "800",
    },
    progressBarContainer: {
      gap: 12,
    },
    progressBarTrack: {
      height: 12,
      borderRadius: 6,
      overflow: "hidden",
      backgroundColor: theme.bg,
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 6,
    },
    progressPercentage: {
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 16,
      backgroundColor: "#F5F5F5",
      borderRadius: 12,
      marginTop: 8,
    },
    statusContainerUnlocked: {
      backgroundColor: "#F0FDF4",
    },
    statusText: {
      flex: 1,
      fontSize: 14,
      color: "#666",
      fontWeight: "500",
      lineHeight: 20,
    },
    statusTextUnlocked: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
    },
  });

export const AchievementDetailModal = ({
  visible,
  achievement,
  onClose,
  theme,
  width,
}: {
  visible: boolean;
  achievement: any;
  onClose: () => void;
  theme: typeof LightTHEME;
  width: number;
}) => {
  const styles = createAchievementModalStyles(theme, width);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {achievement && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.achievementModalContainer}
          >
            {/* Header with Icon */}
            <View style={styles.achievementModalHeader}>
              <LinearGradient
                colors={achievement.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.achievementModalIconContainer}
              >
                {achievement.locked ? (
                  <Icon
                    name="Lock1"
                    size={40}
                    color="#FFF"
                    variant="Bold"
                  />
                ) : (
                  <Icon
                    name={achievement.icon as any}
                    size={40}
                    color="#FFF"
                    variant="Bold"
                  />
                )}
              </LinearGradient>

              <TouchableOpacity
                style={styles.achievementModalClose}
                onPress={onClose}
              >
                <Icon name="CloseCircle" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Title & Description */}
            <View style={styles.achievementModalContent}>
              <Text style={styles.achievementModalTitle}>
                {achievement.title}
              </Text>
              <Text style={styles.achievementModalRequirement}>
                {achievement.requirement}
              </Text>

              {/* Progress Section */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text
                    style={[
                      styles.progressValue,
                      { color: achievement.gradient[0] },
                    ]}
                  >
                    {achievement.currentValue} /{" "}
                    {achievement.threshold}
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarTrack}>
                    <LinearGradient
                      colors={achievement.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.progressBarFill,
                        { width: `${achievement.progress}%` },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressPercentage,
                      { color: achievement.gradient[0] },
                    ]}
                  >
                    {Math.round(achievement.progress)}%
                  </Text>
                </View>

                {/* Status */}
                {achievement.locked ? (
                  <View style={styles.statusContainer}>
                    <Icon name="InfoCircle" size={18} color="#999" />
                    <Text style={styles.statusText}>
                      Keep going! You&apos;re{" "}
                      {achievement.threshold - achievement.currentValue}{" "}
                      away from unlocking this achievement.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.statusContainer,
                      styles.statusContainerUnlocked,
                    ]}
                  >
                    <Icon
                      name="TickCircle"
                      size={18}
                      color={achievement.gradient[0]}
                      variant="Bold"
                    />
                    <Text
                      style={[
                        styles.statusTextUnlocked,
                        { color: achievement.gradient[0] },
                      ]}
                    >
                      Achievement Unlocked!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};