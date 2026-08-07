import { useTheme, type Palette } from "@/theme";
import { useStorage } from "@/services/StorageContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AchievementCard } from "@/components/awards/AchievementCard";
import { AchievementDetailModal } from "@/components/awards/AchievementDetailModal";
import { CertificateCard } from "@/components/awards/CertificateCard";
import { CertificatePreviewModal } from "@/components/awards/CertificatePreviewModal";
import { createStyles } from "@/components/awards/styles";
import { SectionHeader } from "@/components/ui/section-header";
import { Icon } from "@/components/ui/icon";

import { GRADIENTS } from "@/constants/gradients";

// Achievement thresholds with mapped gradients
const ACHIEVEMENTS = [
  // Lesson Completion Milestones
  {
    id: 1,
    title: "First Steps",
    requirement: "Complete 1 lesson",
    threshold: 1,
    field: "lessons_completed",
    icon: "Award",
    gradient: GRADIENTS.yellow,
  },
  {
    id: 2,
    title: "Knowledge Seeker",
    requirement: "Complete 5 lessons",
    threshold: 5,
    field: "lessons_completed",
    icon: "Book",
    gradient: GRADIENTS.orange,
  },
  {
    id: 3,
    title: "Scholar",
    requirement: "Complete 10 lessons",
    threshold: 10,
    field: "lessons_completed",
    icon: "Book",
    gradient: GRADIENTS.purple,
  },
  {
    id: 4,
    title: "Diligent Student",
    requirement: "Complete 20 lessons",
    threshold: 20,
    field: "lessons_completed",
    icon: "Book1",
    gradient: GRADIENTS.blue,
  },
  {
    id: 5,
    title: "Nuclear Graduate",
    requirement: "Complete all 31 lessons",
    threshold: 31,
    field: "lessons_completed",
    icon: "Award",
    gradient: GRADIENTS.blueSolid,
  },

  // Myth Busting
  {
    id: 6,
    title: "Fact Checker",
    requirement: "Bust 3 myths",
    threshold: 3,
    field: "myths_busted",
    icon: "SearchNormal1",
    gradient: GRADIENTS.green,
  },
  {
    id: 7,
    title: "Myth Buster",
    requirement: "Bust 8 myths",
    threshold: 8,
    field: "myths_busted",
    icon: "TickCircle",
    gradient: GRADIENTS.green,
  },
  {
    id: 8,
    title: "Truth Seeker",
    requirement: "Bust all myths",
    threshold: 8,
    field: "myths_busted",
    icon: "ShieldTick",
    gradient: GRADIENTS.green,
  },

  // XP Milestones
  {
    id: 9,
    title: "Rising Star",
    requirement: "Earn 500 XP",
    threshold: 500,
    field: "total_xp",
    icon: "Star",
    gradient: GRADIENTS.yellow,
  },
  {
    id: 10,
    title: "XP Master",
    requirement: "Earn 1000 XP",
    threshold: 1000,
    field: "total_xp",
    icon: "Star1",
    gradient: GRADIENTS.blue,
  },
  {
    id: 11,
    title: "Experience Legend",
    requirement: "Earn 2000 XP",
    threshold: 2000,
    field: "total_xp",
    icon: "Crown",
    gradient: GRADIENTS.purple,
  },
  {
    id: 12,
    title: "Nuclear Expert",
    requirement: "Earn all XP (2000+)",
    threshold: 2000,
    field: "total_xp",
    icon: "Medal",
    gradient: GRADIENTS.blueSolid,
  },

  // Streak Achievements
  {
    id: 13,
    title: "Getting Started",
    requirement: "3 day streak",
    threshold: 3,
    field: "current_streak",
    icon: "Flash",
    gradient: GRADIENTS.orange,
  },
  {
    id: 14,
    title: "On Fire",
    requirement: "7 day streak",
    threshold: 7,
    field: "current_streak",
    icon: "Flash",
    gradient: GRADIENTS.orange,
  },
  {
    id: 15,
    title: "Committed",
    requirement: "14 day streak",
    threshold: 14,
    field: "current_streak",
    icon: "Flash1",
    gradient: GRADIENTS.orange,
  },
  {
    id: 16,
    title: "Dedicated",
    requirement: "30 day streak",
    threshold: 30,
    field: "longest_streak",
    icon: "Crown",
    gradient: GRADIENTS.yellow,
  },
  {
    id: 17,
    title: "Unstoppable",
    requirement: "60 day streak",
    threshold: 60,
    field: "longest_streak",
    icon: "Crown1",
    gradient: GRADIENTS.blueSolid,
  },

  // Special Achievements
  {
    id: 18,
    title: "Early Bird",
    requirement: "Complete lesson before 9 AM",
    threshold: 1,
    field: "early_lessons",
    icon: "Sun1",
    gradient: GRADIENTS.yellow,
  },
  {
    id: 19,
    title: "Night Owl",
    requirement: "Complete lesson after 9 PM",
    threshold: 1,
    field: "late_lessons",
    icon: "Moon",
    gradient: GRADIENTS.purple,
  },
  {
    id: 20,
    title: "Perfect Score",
    requirement: "Get 100% on any quiz",
    threshold: 1,
    field: "perfect_scores",
    icon: "Star",
    gradient: GRADIENTS.blue,
  },
  {
    id: 21,
    title: "Speed Learner",
    requirement: "Complete 5 lessons in one day",
    threshold: 5,
    field: "max_lessons_per_day",
    icon: "Flash",
    gradient: GRADIENTS.orange,
  },
  {
    id: 22,
    title: "Explorer",
    requirement: "Visit all encyclopedia entries",
    threshold: 50,
    field: "encyclopedia_views",
    icon: "SearchNormal",
    gradient: GRADIENTS.purple,
  },
];

// Certificates with mapped gradients
const CERTIFICATES = [
  {
    id: 1,
    title: "Nuclear Foundations",
    description: "Introduction to Nuclear Science",
    gradient: GRADIENTS.orange,
    unlockField: "lessons_completed",
    threshold: 5,
    unitCovered: "Unit 1",
  },
  {
    id: 2,
    title: "Radiation Expert",
    description: "Radiation Effects & Safety Mastery",
    gradient: GRADIENTS.green,
    unlockField: "lessons_completed",
    threshold: 11,
    unitCovered: "Units 1-3",
  },
  {
    id: 3,
    title: "Nuclear Applications Specialist",
    description: "Real-World Nuclear Technology",
    gradient: GRADIENTS.purple,
    unlockField: "lessons_completed",
    threshold: 14,
    unitCovered: "Units 1-4",
  },
  {
    id: 4,
    title: "Nuclear Science Scholar",
    description: "Comprehensive Nuclear Knowledge",
    gradient: GRADIENTS.blue,
    unlockField: "lessons_completed",
    threshold: 20,
    unitCovered: "Units 1-6",
  },
  {
    id: 5,
    title: "Myth Buster Champion",
    description: "Nuclear Misconceptions Debunked",
    gradient: GRADIENTS.yellow,
    unlockField: "myths_busted",
    threshold: 8,
    unitCovered: "All Units",
  },
  {
    id: 6,
    title: "Nuclear Energy Master",
    description: "Complete Nuclear Science Curriculum",
    gradient: GRADIENTS.blueSolid,
    unlockField: "lessons_completed",
    threshold: 31,
    unitCovered: "All 9 Units",
  },
];

export default function AwardsScreen() {
  const { userProfile } = useStorage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const { width } = useWindowDimensions();
  const CERT_CARD_WIDTH = Math.min(300, width - 60);
  const styles = useMemo(() => createStyles(THEME, width), [THEME, width]);

  // State for certificate preview
  const [selectedCertificate, setSelectedCertificate] = useState<
    ((typeof CERTIFICATES)[0] & { unlocked: boolean }) | null
  >(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // State for achievement details
  const [selectedAchievement, setSelectedAchievement] = useState<
    (typeof achievements)[0] | null
  >(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Calculate achievements
  const achievements = useMemo(() => {
    if (!userProfile)
      return ACHIEVEMENTS.map((a) => ({
        ...a,
        locked: true,
        progress: 0,
        currentValue: 0,
      }));

    return ACHIEVEMENTS.map((achievement) => {
      const currentValue = (userProfile as any)[achievement.field] || 0;
      const locked = currentValue < achievement.threshold;
      const progress = Math.min(
        (currentValue / achievement.threshold) * 100,
        100,
      );

      return {
        ...achievement,
        locked,
        progress,
        currentValue,
      };
    });
  }, [userProfile]);

  // Calculate certificates
  const certificates = useMemo(() => {
    if (!userProfile)
      return CERTIFICATES.map((c) => ({ ...c, unlocked: false }));

    return CERTIFICATES.map((cert) => {
      const currentValue = (userProfile as any)[cert.unlockField] || 0;
      const unlocked = currentValue >= cert.threshold;
      return { ...cert, unlocked };
    });
  }, [userProfile]);

  // Stats
  const unlockedAchievements = achievements.filter((a) => !a.locked).length;
  const unlockedCertificates = certificates.filter((c) => c.unlocked).length;

  // Handle certificate preview
  const openCertificatePreview = (cert: (typeof certificates)[0]) => {
    if (cert.unlocked) {
      setSelectedCertificate(cert);
      setShowCertificateModal(true);
    }
  };

  // Handle achievement click
  const openAchievementDetails = (achievement: (typeof achievements)[0]) => {
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Hall of Fame</Text>
            <Text style={styles.headerSubtitle}>Your achievements</Text>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.compactStat}>
              <Icon name="Medal" size={18} color={THEME.text} variant="Bold" />
              <Text style={styles.compactStatText}>{unlockedAchievements}</Text>
            </View>
            <View style={styles.compactStat}>
              <Icon
                name="Document"
                size={18}
                color={THEME.text}
                variant="Bold"
              />
              <Text style={styles.compactStatText}>{unlockedCertificates}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Leaderboard Teaser */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.sectionContainer}
        >
          <TouchableOpacity
            style={styles.leaderboardCard}
            onPress={() => router.push("/(tabs)/leaderboard")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={GRADIENTS.blueSolid}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.leaderboardGradient}
            >
              <View style={styles.leaderboardContent}>
                <View style={styles.leaderboardIconContainer}>
                  <Icon name="Cup" size={32} color="#FFFFFF" variant="Bold" />
                </View>
                <View style={styles.leaderboardTextContainer}>
                  <Text style={styles.leaderboardTitle}>
                    Global Leaderboard
                  </Text>
                  <Text style={styles.leaderboardDesc}>
                    Compete with learners worldwide!
                  </Text>
                </View>
                <View style={styles.leaderboardArrow}>
                  <Icon
                    name="ArrowRight"
                    size={24}
                    color="#FFFFFF"
                    variant="Bold"
                  />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Certificates Section */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.sectionContainer}
        >
          <SectionHeader
            icon="Document"
            title="Certificates"
            palette={THEME}
            right={
              <Text style={styles.sectionCount}>
                {unlockedCertificates}/{CERTIFICATES.length}
              </Text>
            }
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.certificatesScrollContent}
            decelerationRate="fast"
            snapToInterval={CERT_CARD_WIDTH + 20}
          >
            {certificates.map((cert, index) => (
              <CertificateCard
                key={cert.id}
                cert={cert}
                index={index}
                width={CERT_CARD_WIDTH}
                onPress={() => openCertificatePreview(cert)}
                theme={THEME}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Achievements Section */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.sectionContainer}
        >
          <SectionHeader
            icon="Medal"
            title="Achievements"
            palette={THEME}
            right={
              <Text style={styles.sectionCount}>
                {unlockedAchievements}/{ACHIEVEMENTS.length}
              </Text>
            }
          />
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement, index) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                index={index}
                width={width}
                onPress={() => openAchievementDetails(achievement)}
                theme={THEME}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <AchievementDetailModal
        visible={showAchievementModal}
        achievement={selectedAchievement}
        onClose={() => setShowAchievementModal(false)}
        theme={THEME}
        width={width}
      />

      <CertificatePreviewModal
        visible={showCertificateModal}
        certificate={selectedCertificate}
        onClose={() => setShowCertificateModal(false)}
        theme={THEME}
        width={width}
        username={userProfile?.username}
      />
    </View>
  );
}