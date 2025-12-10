import { Icon } from '@/components/ui/icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

const LightTHEME = {
  bg: '#F8F9FE',
  card: '#FFFFFF',
  text: '#32325D',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#E9ECEF',
};

const DarkTHEME = {
  bg: '#172B4D',
  card: '#213356',
  text: '#F6F9FC',
  textMuted: '#8898AA',
  primary: '#5E72E4',
  border: '#2D3A56',
};

const GRADIENTS = {
  Purple: ['#B8A5FE', '#9E87F5'] as const,
  Green: ['#4FD1C5', '#2DCECC'] as const,
  Orange: ['#FF9F65', '#FF6B6B'] as const,
  Yellow: ['#FFD66E', '#FFA043'] as const,
  Blue: ['#6A82FB', '#FC5C7D'] as const,
  BlueSolid: ['#5E72E4', '#825EE4'] as const,
};

// Achievement thresholds with mapped gradients
const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', requirement: 'Complete 1 lesson', threshold: 1, field: 'lessons_completed', icon: 'Award', gradient: GRADIENTS.Yellow },
  { id: 2, title: 'Myth Buster', requirement: 'Bust 10 myths', threshold: 10, field: 'myths_busted', icon: 'TickCircle', gradient: GRADIENTS.Green },
  { id: 3, title: 'On Fire', requirement: '7 day streak', threshold: 7, field: 'current_streak', icon: 'Flash', gradient: GRADIENTS.Orange },
  { id: 4, title: 'XP Master', requirement: 'Earn 1000 XP', threshold: 1000, field: 'total_xp', icon: 'Star', gradient: GRADIENTS.Blue },
  { id: 5, title: 'Dedicated', requirement: '30 day streak', threshold: 30, field: 'longest_streak', icon: 'Crown', gradient: GRADIENTS.Yellow },
  { id: 6, title: 'Scholar', requirement: 'Complete 10 lessons', threshold: 10, field: 'lessons_completed', icon: 'Book', gradient: GRADIENTS.Purple },
  { id: 7, title: 'Nuclear Expert', requirement: 'Earn 5000 XP', threshold: 5000, field: 'total_xp', icon: 'Medal', gradient: GRADIENTS.BlueSolid },
  { id: 8, title: 'Truth Seeker', requirement: 'Bust 25 myths', threshold: 25, field: 'myths_busted', icon: 'SearchNormal1', gradient: GRADIENTS.Green },
];

// Certificates with mapped gradients
const CERTIFICATES = [
  { id: 1, title: 'Nuclear Basics', description: 'Fundamentals of Nuclear Science', gradient: GRADIENTS.Orange, unlockField: 'lessons_completed', threshold: 5 },
  { id: 2, title: 'Radiation Safety', description: 'Understanding Radiation & Protection', gradient: GRADIENTS.Green, unlockField: 'lessons_completed', threshold: 10 },
  { id: 3, title: 'Myth Buster Pro', description: 'Debunking Nuclear Misconceptions', gradient: GRADIENTS.Blue, unlockField: 'myths_busted', threshold: 15 },
  { id: 4, title: 'Nuclear Energy Expert', description: 'Advanced Nuclear Concepts', gradient: GRADIENTS.Purple, unlockField: 'lessons_completed', threshold: 20 },
];

export default function AwardsScreen() {
  const { userProfile } = useStorage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const THEME = colorScheme === 'dark' ? DarkTHEME : LightTHEME;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  
  // State for certificate preview
  const [selectedCertificate, setSelectedCertificate] = useState<typeof CERTIFICATES[0] & { unlocked: boolean } | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  
  // State for achievement details
  const [selectedAchievement, setSelectedAchievement] = useState<typeof achievements[0] | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Calculate achievements
  const achievements = useMemo(() => {
    if (!userProfile) return ACHIEVEMENTS.map(a => ({ ...a, locked: true, progress: 0, currentValue: 0 }));
    
    return ACHIEVEMENTS.map((achievement) => {
      const currentValue = (userProfile as any)[achievement.field] || 0;
      const locked = currentValue < achievement.threshold;
      const progress = Math.min((currentValue / achievement.threshold) * 100, 100);
      
      return {
        ...achievement,
        locked,
        progress,
        currentValue
      };
    });
  }, [userProfile]);

  // Calculate certificates
  const certificates = useMemo(() => {
    if (!userProfile) return CERTIFICATES.map(c => ({ ...c, unlocked: false }));
    
    return CERTIFICATES.map((cert) => {
      const currentValue = (userProfile as any)[cert.unlockField] || 0;
      const unlocked = currentValue >= cert.threshold;
      return { ...cert, unlocked };
    });
  }, [userProfile]);

  // Stats
  const unlockedAchievements = achievements.filter(a => !a.locked).length;
  const unlockedCertificates = certificates.filter(c => c.unlocked).length;
  
  // Handle certificate preview
  const openCertificatePreview = (cert: typeof certificates[0]) => {
    if (cert.unlocked) {
      setSelectedCertificate(cert);
      setShowCertificateModal(true);
    }
  };
  
  // Handle save certificate
  const handleSaveCertificate = () => {
    // In a real app, this would save to camera roll
    setShowCertificateModal(false);
  };
  
  // Handle achievement click
  const openAchievementDetails = (achievement: typeof achievements[0]) => {
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
              <Icon name="Document" size={18} color={THEME.text} variant="Bold" />
              <Text style={styles.compactStatText}>{unlockedCertificates}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Leaderboard Teaser */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.sectionContainer}>
          <TouchableOpacity 
            style={styles.leaderboardCard}
            onPress={() => router.push('/(tabs)/leaderboard')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={GRADIENTS.BlueSolid}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.leaderboardGradient}
            >
              <View style={styles.leaderboardContent}>
                <View style={styles.leaderboardIconContainer}>
                  <Icon name="Cup" size={32} color="#FFFFFF" variant="Bold" />
                </View>
                <View style={styles.leaderboardTextContainer}>
                  <Text style={styles.leaderboardTitle}>Global Leaderboard</Text>
                  <Text style={styles.leaderboardDesc}>Compete with learners worldwide!</Text>
                </View>
                <View style={styles.leaderboardArrow}>
                  <Icon name="ArrowRight" size={24} color="#FFFFFF" variant="Bold" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Certificates Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="Document" size={24} color={THEME.text} variant="Bold" />
            <Text style={styles.sectionTitle}>Certificates</Text>
            <Text style={styles.sectionCount}>{unlockedCertificates}/{CERTIFICATES.length}</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.certificatesScrollContent}
            decelerationRate="fast"
            snapToInterval={320}
          >
            {certificates.map((cert, index) => (
              <TouchableOpacity 
                key={cert.id}
                activeOpacity={cert.unlocked ? 0.7 : 1}
                onPress={() => openCertificatePreview(cert)}
                style={styles.certificateWrapper}
              >
                <Animated.View 
                  entering={FadeInDown.delay(250 + index * 50).springify()}
                  style={[
                    styles.certificate,
                    !cert.unlocked && styles.certificateLocked
                  ]}
                >
                  {cert.unlocked ? (
                    <LinearGradient
                      colors={cert.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.certificateGradient}
                    >
                      <View style={styles.certDecoration1} />
                      <View style={styles.certDecoration2} />
                      
                      <View style={styles.certificateContent}>
                        <View style={styles.certificateLeft}>
                          <View style={styles.certificateIconBadge}>
                            <Icon name="Award" size={28} color={cert.gradient[1]} variant="Bold" />
                          </View>
                        </View>
                        <View style={styles.certificateRight}>
                          <Text style={styles.certificateLabel}>CERTIFICATE</Text>
                          <Text style={styles.certificateTitle} numberOfLines={2}>{cert.title}</Text>
                          <View style={styles.certificateButton}>
                            <Text style={[styles.certificateButtonText, { color: cert.gradient[1] }]}>VIEW</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.certificateLockedContent}>
                      <View style={styles.certificateIconBadgeLocked}>
                        <Icon name="Lock1" size={24} color="#999" variant="Bold" />
                      </View>
                      <View style={styles.certificateRight}>
                        <Text style={styles.certificateTitleLocked}>{cert.title}</Text>
                        <Text style={styles.certificateDescLocked}>Complete requirements to unlock</Text>
                      </View>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Achievements Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name="Medal" size={24} color={THEME.text} variant="Bold" />
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.sectionCount}>{unlockedAchievements}/{ACHIEVEMENTS.length}</Text>
          </View>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement, index) => (
              <TouchableOpacity
                key={achievement.id}
                activeOpacity={0.7}
                style={styles.achievementWrapper}
                onPress={() => openAchievementDetails(achievement)}
              >
                <Animated.View 
                  entering={FadeInDown.delay(450 + index * 50).springify()}
                  style={[
                    styles.achievementCard,
                    achievement.locked && styles.achievementCardLocked
                  ]}
                >
                  <View style={styles.circularProgressContainer}>
                    <Svg width={80} height={80}>
                      {/* Track */}
                      <Circle
                        cx={40}
                        cy={40}
                        r={36}
                        stroke={achievement.locked ? '#E0E0E0' : achievement.gradient[0] + '30'}
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
                          strokeDashoffset={2 * Math.PI * 36 * (1 - achievement.progress / 100)}
                          strokeLinecap="round"
                          fill="transparent"
                          rotation="-90"
                          origin="40, 40"
                        />
                      )}
                    </Svg>
                    <View style={styles.achievementIconContainer}>
                      {achievement.locked ? (
                        <Icon name="Lock1" size={24} color="#999" variant="Bold" />
                      ) : (
                        <Icon name={achievement.icon as any} size={28} color={achievement.gradient[0]} variant="Bold" />
                      )}
                    </View>
                  </View>

                  <View style={styles.achievementTextContent}>
                    <Text style={[
                      styles.achievementCardTitle,
                      achievement.locked && styles.achievementCardTitleLocked
                    ]} numberOfLines={1}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementCardDescription} numberOfLines={2}>
                      {achievement.requirement}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  {!achievement.locked && achievement.progress >= 100 && (
                    <View style={[styles.achievementStatusBadge, { backgroundColor: achievement.gradient[0] + '20' }]}>
                      <Text style={[styles.achievementStatusText, { color: achievement.gradient[0] }]}>Completed</Text>
                    </View>
                  )}
                  {!achievement.locked && achievement.progress < 100 && (
                    <View style={[styles.achievementStatusBadge, { backgroundColor: '#F0F0F0' }]}>
                      <Text style={[styles.achievementStatusText, { color: '#666' }]}>{Math.round(achievement.progress)}%</Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
      
      {/* Achievement Details Modal */}
      <Modal
        visible={showAchievementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedAchievement && (
            <Animated.View 
              entering={FadeInDown.springify()}
              style={styles.achievementModalContainer}
            >
              {/* Header with Icon */}
              <View style={styles.achievementModalHeader}>
                <LinearGradient
                  colors={selectedAchievement.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.achievementModalIconContainer}
                >
                  {selectedAchievement.locked ? (
                    <Icon name="Lock1" size={40} color="#FFF" variant="Bold" />
                  ) : (
                    <Icon name={selectedAchievement.icon as any} size={40} color="#FFF" variant="Bold" />
                  )}
                </LinearGradient>
                
                <TouchableOpacity 
                  style={styles.achievementModalClose}
                  onPress={() => setShowAchievementModal(false)}
                >
                  <Icon name="CloseCircle" size={28} color={THEME.text} />
                </TouchableOpacity>
              </View>
              
              {/* Title & Description */}
              <View style={styles.achievementModalContent}>
                <Text style={styles.achievementModalTitle}>
                  {selectedAchievement.title}
                </Text>
                <Text style={styles.achievementModalRequirement}>
                  {selectedAchievement.requirement}
                </Text>
                
                {/* Progress Section */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={[styles.progressValue, { color: selectedAchievement.gradient[0] }]}>
                      {selectedAchievement.currentValue} / {selectedAchievement.threshold}
                    </Text>
                  </View>
                  
                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarTrack}>
                      <LinearGradient
                        colors={selectedAchievement.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressBarFill, { width: `${selectedAchievement.progress}%` }]}
                      />
                    </View>
                    <Text style={[styles.progressPercentage, { color: selectedAchievement.gradient[0] }]}>
                      {Math.round(selectedAchievement.progress)}%
                    </Text>
                  </View>
                  
                  {/* Status */}
                  {selectedAchievement.locked ? (
                    <View style={styles.statusContainer}>
                      <Icon name="InfoCircle" size={18} color="#999" />
                      <Text style={styles.statusText}>
                        Keep going! You're {selectedAchievement.threshold - selectedAchievement.currentValue} away from unlocking this achievement.
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.statusContainer, styles.statusContainerUnlocked]}>
                      <Icon name="TickCircle" size={18} color={selectedAchievement.gradient[0]} variant="Bold" />
                      <Text style={[styles.statusTextUnlocked, { color: selectedAchievement.gradient[0] }]}>
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
      
      {/* Certificate Preview Modal */}
      <Modal
        visible={showCertificateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCertificateModal(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedCertificate && (
            <Animated.View 
              entering={FadeInDown.springify()}
              style={styles.modalContainer}
            >
              {/* Clean Professional Certificate */}
              <View style={styles.certificatePreview}>
                <View style={styles.certificatePaper}>
                  {/* Decorative Border */}
                  <View style={[styles.certificateOuterBorder, { borderColor: selectedCertificate.gradient[0] }]}>
                    <View style={[styles.certificateInnerBorder, { borderColor: selectedCertificate.gradient[0] + '50' }]}>
                      
                      {/* Certificate Content */}
                      <View style={styles.previewCertificateContent}>
                        {/* Header */}
                        <View style={styles.certHeaderSection}>
                          <Text style={[styles.certHeaderText, { color: selectedCertificate.gradient[0] }]}>CERTIFICATE</Text>
                          <Text style={styles.certOfText}>of</Text>
                          <Text style={[styles.certAchievementText, { color: selectedCertificate.gradient[1] }]}>ACHIEVEMENT</Text>
                        </View>
                        
                        {/* Decorative Line */}
                        <LinearGradient
                          colors={selectedCertificate.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.decorativeLine}
                        />
                        
                        {/* Body */}
                        <View style={styles.certBodySection}>
                          <Text style={styles.certPresentedTo}>This is to certify that</Text>
                          
                          <Text style={styles.certRecipientName}>
                            {userProfile?.username || 'Learner'}
                          </Text>
                          
                          <Text style={styles.certCompletionText}>
                            has successfully completed the course
                          </Text>
                          
                          <Text style={[styles.courseTitle, { color: selectedCertificate.gradient[0] }]}>
                            {selectedCertificate.title}
                          </Text>
                          
                          <Text style={styles.courseDescription}>
                            {selectedCertificate.description}
                          </Text>
                        </View>
                        
                        {/* Decorative Line */}
                        <LinearGradient
                          colors={selectedCertificate.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.decorativeLine}
                        />
                        
                        {/* Footer */}
                        <View style={styles.certFooterSection}>
                          <Text style={styles.issueDateText}>
                            Issued on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </Text>
                          <Text style={[styles.issuerName, { color: selectedCertificate.gradient[0] }]}>AtomIQ</Text>
                          <Text style={styles.issuerTagline}>Nuclear Science Education Platform</Text>
                        </View>
                      </View>
                      
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleSaveCertificate}
                >
                  <LinearGradient
                    colors={selectedCertificate.gradient}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="DocumentDownload" size={20} color="#FFF" variant="Bold" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.closeButtonNew]}
                  onPress={() => setShowCertificateModal(false)}
                >
                  <Icon name="CloseCircle" size={20} color="#333" variant="Bold" />
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: typeof LightTHEME) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.card,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.bg,
  },
  compactStatText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  
  // Section Container
  sectionContainer: {
    marginTop: 24,
  },

  // Leaderboard Card
  leaderboardCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: theme.card,
  },
  leaderboardGradient: {
    padding: 20,
  },
  leaderboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  leaderboardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  leaderboardTextContainer: {
    flex: 1,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  leaderboardDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  leaderboardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    color: theme.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textMuted,
  },

  // Certificates
  certificatesScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20, // Space for shadow
  },
  certificateWrapper: {
    width: 300,
  },
  certificate: {
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    backgroundColor: theme.card,
  },
  certificateGradient: {
    flex: 1,
    position: 'relative',
  },
  certificateLocked: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  certificateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    zIndex: 10,
  },
  certificateLeft: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificateRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  certificateIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  certificateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  certificateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 22,
  },
  certificateButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  certificateButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  certDecoration1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  certDecoration2: {
    position: 'absolute',
    bottom: -30,
    left: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  certificateLockedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  certificateIconBadgeLocked: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  certificateTitleLocked: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: theme.text,
  },
  certificateDescLocked: {
    fontSize: 13,
    color: theme.textMuted,
    fontWeight: '500',
  },

  // Achievements
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  achievementWrapper: {
    width: (width - 52) / 2,
  },
  achievementCard: {
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    height: 200,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    backgroundColor: theme.card,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  circularProgressContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementIconContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTextContent: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    color: theme.text,
  },
  achievementCardTitleLocked: {
    color: theme.textMuted,
  },
  achievementCardDescription: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: 'center',
    fontWeight: '500',
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
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
  },
  certificatePreview: {
    width: width - 40,
    height: (width - 40) * 1.414,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  certificatePaper: {
    flex: 1,
    backgroundColor: '#FFFEF8',
    padding: 12,
  },
  certificateOuterBorder: {
    flex: 1,
    borderWidth: 2,
    padding: 6,
  },
  certificateInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewCertificateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  certHeaderSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  certHeaderText: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 8,
  },
  certOfText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  certAchievementText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 6,
  },
  decorativeLine: {
    width: 100,
    height: 2,
    marginVertical: 20,
  },
  certBodySection: {
    alignItems: 'center',
    width: '100%',
  },
  certPresentedTo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  certRecipientName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  certCompletionText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  certFooterSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  issueDateText: {
    fontSize: 11,
    color: '#888',
    marginBottom: 12,
  },
  issuerName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
  issuerTagline: {
    fontSize: 10,
    color: '#888',
    letterSpacing: 1,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 130,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButtonNew: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Achievement Details Modal
  achievementModalContainer: {
    width: width - 40,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    backgroundColor: theme.card,
  },
  achievementModalHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    position: 'relative',
  },
  achievementModalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  achievementModalClose: {
    position: 'absolute',
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
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: theme.text,
  },
  achievementModalRequirement: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 32,
  },
  progressSection: {
    gap: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarContainer: {
    gap: 12,
  },
  progressBarTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: theme.bg,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginTop: 8,
  },
  statusContainerUnlocked: {
    backgroundColor: '#F0FDF4',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    lineHeight: 20,
  },
  statusTextUnlocked: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
