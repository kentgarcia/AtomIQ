import { useEffect, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import {
    getLevelProgress,
    getUserProfile,
    logDailyActivity,
    unlockNextLevel,
    updateLevelProgress,
} from "@/services/database";
import { toLocalIsoDate } from "@/services/utils";
import { useStorage } from "@/services/StorageContext";

import { type Palette } from "@/theme";
import { Icon } from "@/components/ui/icon";

import { createStyles } from "./styles";

export const DebriefView = ({
  data,
  levelId,
  isReplay = false,
  theme,
}: {
  data: any;
  levelId: string;
  isReplay?: boolean;
  theme: Palette;
}) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, width), [theme, width]);
  const { addXP, updateUserProfile } = useStorage();
  const [saved, setSaved] = useState(false);
  const [rewardsAwarded, setRewardsAwarded] = useState(false);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Celebration animation
    scale.value = withSpring(1, { damping: 8 });
    rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false);

    // Save progress when reaching this screen
    const saveProgress = async () => {
      if (saved) return;

      try {
        // Check if lesson is already completed
        const existingProgress = (await getLevelProgress(levelId)) as {
          status?: string;
          completed_at?: string;
        } | null;
        const isAlreadyCompleted = existingProgress?.status === "completed";

        const xpEarned = data.rewards?.xp || 50;
        const stars = data.rewards?.stars || 3;

        // Update level progress (always update to mark as completed)
        await updateLevelProgress(levelId, {
          status: "completed",
          xp_earned: xpEarned,
          stars: stars,
          completed_at:
            existingProgress?.completed_at || new Date().toISOString(),
        });

        // Unlock next lesson/unit when completing for the first time
        if (!isAlreadyCompleted) {
          await unlockNextLevel(levelId);
        }

        // Only award rewards if this is the first completion (not a replay)
        if (!isAlreadyCompleted && !isReplay) {
          // Add XP to user
          await addXP(xpEarned);

          // Increment lessons completed — read fresh from the DB so rapid
          // successive completions never undercount off stale state
          const freshProfile = (await getUserProfile()) as {
            lessons_completed?: number;
          } | null;
          if (freshProfile) {
            await updateUserProfile({
              lessons_completed: (freshProfile.lessons_completed || 0) + 1,
            });
          }

          // Log daily activity
          const today = toLocalIsoDate();
          await logDailyActivity(today, {
            xp_earned: xpEarned,
            lessons_completed: 1,
            time_spent_minutes: 5,
          });

          setRewardsAwarded(true);
          console.log("Lesson completed for the first time! Rewards awarded.");
        } else {
          console.log("Lesson replay. No rewards awarded.");
        }

        setSaved(true);
      } catch (error) {
        console.error("Error saving lesson progress:", error);
      }
    };

    saveProgress();
  }, [saved, levelId, addXP, updateUserProfile]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const xpReward = data.rewards?.xp || 50;
  const starsReward = data.rewards?.stars || 3;

  // Different titles/messages for replay vs first completion
  const title = isReplay
    ? "Practice Complete!"
    : data.title || "Mission Complete!";
  const message = isReplay
    ? "Great review! You've already mastered this lesson."
    : data.message || "Great job! You've completed this lesson.";

  return (
    <View style={styles.fullScreenCenter}>
      {/* Decorative rotating rings */}
      <Animated.View style={[styles.decorativeRing, rotationStyle]} />

      <Animated.View
        entering={FadeInDown.springify()}
        style={[styles.mascotLarge, animatedStyle]}
      >
        <Image
          source={require("@/assets/images/mascot/happy.png")}
          style={styles.mascotImageSuccess}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)}>
        <Text style={styles.successTitle}>{title}</Text>
        <Text style={styles.successText}>{message}</Text>
      </Animated.View>

      {/* Show rewards only if not a replay */}
      {rewardsAwarded ? (
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.rewardRow}
        >
          <View style={styles.rewardPill}>
            <LinearGradient
              colors={[theme.primary, theme.primaryLight]}
              style={styles.rewardIconWrapper}
            >
              <Icon name="Flash" size={20} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View>
              <Text style={styles.rewardLabel}>XP Earned</Text>
              <Text style={styles.rewardText}>+{xpReward}</Text>
            </View>
          </View>
          <View style={styles.rewardPill}>
            <LinearGradient
              colors={[theme.gold, "#FFA000"]}
              style={styles.rewardIconWrapper}
            >
              <Icon name="Star1" size={20} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View>
              <Text style={styles.rewardLabel}>Stars</Text>
              <Text style={styles.rewardText}>{starsReward}</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(400)}
          style={styles.rewardRow}
        >
          <View style={[styles.rewardPill, { opacity: 0.6 }]}>
            <View
              style={[
                styles.rewardIconWrapper,
                { backgroundColor: theme.textMuted },
              ]}
            >
              <Icon name="TickCircle" size={20} color="#FFF" variant="Bold" />
            </View>
            <View>
              <Text style={styles.rewardLabel}>Already Earned</Text>
              <Text style={[styles.rewardText, { color: theme.textMuted }]}>
                {xpReward} XP
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(600)} style={{ width: "100%" }}>
        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: theme.success, borderColor: "#25A25A" },
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.mainBtnText}>CONTINUE</Text>
          <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};