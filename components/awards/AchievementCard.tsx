import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icon } from "@/components/ui/icon";
import {TabLight as LightTHEME, fontFamilies} from "@/theme";

const createAchievementStyles = (theme: typeof LightTHEME, width: number) =>
  StyleSheet.create({
    achievementWrapper: {
      width: (width - 52) / 2,
    },
    achievementCard: {
      borderRadius: 24,
      padding: 16,
      alignItems: "center",
      height: 200,
      justifyContent: "space-between",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      backgroundColor: theme.card,
    },
    achievementCardLocked: {
      opacity: 0.7,
    },
    circularProgressContainer: {
      position: "relative",
      width: 80,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    achievementIconContainer: {
      position: "absolute",
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    achievementTextContent: {
      alignItems: "center",
      width: "100%",
      flex: 1,
    },
    achievementCardTitle: {
      fontSize: 15,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      marginBottom: 4,
      textAlign: "center",
      color: theme.text,
    },
    achievementCardTitleLocked: {
      color: theme.textMuted,
    },
    achievementCardDescription: {
      fontSize: 12,
      color: theme.textMuted,
      textAlign: "center",
      fontWeight: "500",
      fontFamily: fontFamilies.medium,
      lineHeight: 16,
    },
    achievementStatusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 8,
    },
    achievementStatusText: {
      fontSize: 10,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
  });

export const AchievementCard = ({
  achievement,
  index,
  width,
  onPress,
  theme,
}: {
  achievement: any;
  index: number;
  width: number;
  onPress: () => void;
  theme: typeof LightTHEME;
}) => {
  const styles = createAchievementStyles(theme, width);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.achievementWrapper}
      onPress={onPress}
    >
      <Animated.View
        entering={FadeInDown.delay(450 + index * 50).springify()}
        style={[
          styles.achievementCard,
          achievement.locked && styles.achievementCardLocked,
        ]}
      >
        <View style={styles.circularProgressContainer}>
          <Svg width={80} height={80}>
            {/* Track */}
            <Circle
              cx={40}
              cy={40}
              r={36}
              stroke={
                achievement.locked
                  ? "#E0E0E0"
                  : achievement.gradient[0] + "30"
              }
              strokeWidth={6}
              fill="transparent"
            />
            {/* Progress */}
            {!achievement.locked && (
              <Circle
                cx={40}
                cy={40}
                r={36}
                stroke={achievement.gradient[0]}
                strokeWidth={6}
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={
                  2 *
                  Math.PI *
                  36 *
                  (1 - achievement.progress / 100)
                }
                strokeLinecap="round"
                fill="transparent"
                rotation="-90"
                origin="40, 40"
              />
            )}
          </Svg>
          <View style={styles.achievementIconContainer}>
            {achievement.locked ? (
              <Icon
                name="Lock1"
                size={24}
                color="#999"
                variant="Bold"
              />
            ) : (
              <Icon
                name={achievement.icon as any}
                size={28}
                color={achievement.gradient[0]}
                variant="Bold"
              />
            )}
          </View>
        </View>

        <View style={styles.achievementTextContent}>
          <Text
            style={[
              styles.achievementCardTitle,
              achievement.locked && styles.achievementCardTitleLocked,
            ]}
            numberOfLines={1}
          >
            {achievement.title}
          </Text>
          <Text
            style={styles.achievementCardDescription}
            numberOfLines={2}
          >
            {achievement.requirement}
          </Text>
        </View>

        {/* Status Badge */}
        {!achievement.locked && achievement.progress >= 100 && (
          <View
            style={[
              styles.achievementStatusBadge,
              { backgroundColor: achievement.gradient[0] + "20" },
            ]}
          >
            <Text
              style={[
                styles.achievementStatusText,
                { color: achievement.gradient[0] },
              ]}
            >
              Completed
            </Text>
          </View>
        )}
        {!achievement.locked && achievement.progress < 100 && (
          <View
            style={[
              styles.achievementStatusBadge,
              { backgroundColor: "#F0F0F0" },
            ]}
          >
            <Text
              style={[
                styles.achievementStatusText,
                { color: "#666" },
              ]}
            >
              {Math.round(achievement.progress)}%
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};