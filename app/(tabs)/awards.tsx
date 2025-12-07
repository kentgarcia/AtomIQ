import { Icon } from '@/components/ui/icon';
import { useStorage } from '@/services/StorageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Orange theme to match the app
const THEME = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E5E5E5',
  text: '#2D3436',
  textMuted: '#636E72',
  primary: '#EA580C',
  primaryLight: '#F97316',
  accent: '#1CB0F6',
  warning: '#FFC800',
  secondary: '#FF4B4B',
  green: '#2ECC71',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

// Achievement thresholds
const ACHIEVEMENTS = [
  { id: 1, title: 'First Steps', requirement: 'Complete 1 lesson', threshold: 1, field: 'lessons_completed', icon: 'Award', color: '#FFC800' },
  { id: 2, title: 'Myth Buster', requirement: 'Bust 10 myths', threshold: 10, field: 'myths_busted', icon: 'TickCircle', color: THEME.green },
  { id: 3, title: 'On Fire', requirement: '7 day streak', threshold: 7, field: 'current_streak', icon: 'Flash', color: '#EA580C' },
  { id: 4, title: 'XP Master', requirement: 'Earn 1000 XP', threshold: 1000, field: 'total_xp', icon: 'Star', color: '#1CB0F6' },
  { id: 5, title: 'Dedicated', requirement: '30 day streak', threshold: 30, field: 'longest_streak', icon: 'Crown', color: '#FFD700' },
  { id: 6, title: 'Scholar', requirement: 'Complete 10 lessons', threshold: 10, field: 'lessons_completed', icon: 'Book', color: '#9B59B6' },
  { id: 7, title: 'Nuclear Expert', requirement: 'Earn 5000 XP', threshold: 5000, field: 'total_xp', icon: 'Medal', color: '#E91E63' },
  { id: 8, title: 'Truth Seeker', requirement: 'Bust 25 myths', threshold: 25, field: 'myths_busted', icon: 'SearchNormal1', color: '#00BCD4' },
];

// Certificates
const CERTIFICATES = [
  { id: 1, title: 'Nuclear Basics', description: 'Fundamentals of Nuclear Science', color: '#EA580C', unlockField: 'lessons_completed', threshold: 5 },
  { id: 2, title: 'Radiation Safety', description: 'Understanding Radiation & Protection', color: '#2ECC71', unlockField: 'lessons_completed', threshold: 10 },
  { id: 3, title: 'Myth Buster Pro', description: 'Debunking Nuclear Misconceptions', color: '#3498DB', unlockField: 'myths_busted', threshold: 15 },
  { id: 4, title: 'Nuclear Energy Expert', description: 'Advanced Nuclear Concepts', color: '#9B59B6', unlockField: 'lessons_completed', threshold: 20 },
];

export default function AwardsScreen() {
  const { userProfile } = useStorage();
  const router = useRouter();
  
  // State for certificate preview
  const [selectedCertificate, setSelectedCertificate] = useState<typeof CERTIFICATES[0] & { unlocked: boolean } | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

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
    Alert.alert(
      'Save Certificate',
      'Certificate saved to your gallery!',
      [{ text: 'OK' }]
    );
  };

  if (!userProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: THEME.textMuted }}>Loading awards...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerRow}>
          <Text style={styles.headerTitle}>Awards</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Icon name="Medal" size={16} color={THEME.gold} variant="Bold" />
              <Text style={styles.statBadgeText}>{unlockedAchievements}</Text>
            </View>
            <View style={styles.statBadge}>
              <Icon name="Document" size={16} color={THEME.accent} variant="Bold" />
              <Text style={styles.statBadgeText}>{unlockedCertificates}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Certificates Section */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.sectionHeader}>
            <Icon name="Document" size={24} color={THEME.accent} variant="Bold" />
            <Text style={styles.sectionTitle}>Certificates</Text>
            <Text style={styles.sectionCount}>{unlockedCertificates}/{CERTIFICATES.length}</Text>
          </View>
          <View style={styles.certificatesGrid}>
            {certificates.map((cert, index) => (
              <TouchableOpacity 
                key={cert.id}
                activeOpacity={cert.unlocked ? 0.7 : 1}
                onPress={() => openCertificatePreview(cert)}
                style={styles.certificateWrapper}
              >
                <Animated.View 
                  entering={FadeInDown.delay(250 + index * 50).springify()}
                  style={[styles.certificate, !cert.unlocked && styles.certificateLocked]}
                >
                  {cert.unlocked ? (
                    <LinearGradient
                      colors={[cert.color, cert.color + 'CC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.certificateGradient}
                    >
                      {/* Certificate Design */}
                      <View style={styles.certificateBorder}>
                        <View style={styles.certificateInner}>
                          <Icon name="Award" size={32} color="#FFF" variant="Bold" />
                          <Text style={styles.certificateLabel}>CERTIFICATE OF</Text>
                          <Text style={styles.certificateTitle}>{cert.title}</Text>
                          <Text style={styles.certificateDesc}>{cert.description}</Text>
                          <View style={styles.certificateTapHint}>
                            <Text style={styles.certificateTapText}>Tap to preview</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.certificateLockedContent}>
                      <Icon name="Lock1" size={32} color="#AAA" variant="Bold" />
                      <Text style={styles.certificateTitleLocked}>{cert.title}</Text>
                      <Text style={styles.certificateDescLocked}>{cert.description}</Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Achievements Section */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Icon name="Medal" size={24} color={THEME.gold} variant="Bold" />
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.sectionCount}>{unlockedAchievements}/{ACHIEVEMENTS.length}</Text>
          </View>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement, index) => (
              <TouchableOpacity
                key={achievement.id}
                onPress={() => router.push(`/achievement-detail?achievementId=${achievement.id}`)}
                activeOpacity={0.7}
              >
                <Animated.View 
                  entering={FadeInDown.delay(450 + index * 50).springify()}
                  style={[styles.achievementCard, achievement.locked && styles.achievementCardLocked]}
                >
                  <LinearGradient
                    colors={achievement.locked 
                      ? ['#F5F5F5', '#E8E8E8'] 
                      : [achievement.color + '20', achievement.color + '10']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.achievementCardGradient}
                  >
                    {/* Icon Section */}
                    <View style={styles.achievementIconSection}>
                      <View style={[
                        styles.achievementIconCircle,
                        achievement.locked && styles.achievementIconCircleLocked,
                        { borderColor: achievement.color }
                      ]}>
                        {achievement.locked ? (
                          <Icon 
                            name="Lock1" 
                            size={32} 
                            color="#999" 
                            variant="Bold" 
                          />
                        ) : (
                          <Icon 
                            name={achievement.icon as any} 
                            size={36} 
                            color={achievement.color} 
                            variant="Bold" 
                          />
                        )}
                      </View>
                      {!achievement.locked && (
                        <View style={styles.achievementBadge}>
                          <Icon name="TickCircle" size={18} color={THEME.green} variant="Bold" />
                        </View>
                      )}
                    </View>

                    {/* Content Section */}
                    <View style={styles.achievementContent}>
                      <Text style={[
                        styles.achievementCardTitle,
                        achievement.locked && styles.achievementCardTitleLocked
                      ]}>
                        {achievement.title}
                      </Text>
                      <Text style={styles.achievementCardDescription}>
                        {achievement.requirement}
                      </Text>
                      
                      {/* Progress Section */}
                      <View style={styles.achievementProgressSection}>
                        <View style={styles.achievementProgressBar}>
                          <LinearGradient
                            colors={achievement.locked 
                              ? ['#E0E0E0', '#D0D0D0'] 
                              : [achievement.color, achievement.color + 'CC']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                              styles.achievementProgressFill,
                              { width: `${achievement.progress}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.achievementProgressText}>
                          {achievement.currentValue} / {achievement.threshold}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
      
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
                  <View style={[styles.certificateOuterBorder, { borderColor: selectedCertificate.color }]}>
                    <View style={[styles.certificateInnerBorder, { borderColor: selectedCertificate.color + '50' }]}>
                      
                      {/* Certificate Content */}
                      <View style={styles.certificateContent}>
                        {/* Header */}
                        <View style={styles.certHeaderSection}>
                          <Text style={[styles.certHeaderText, { color: selectedCertificate.color }]}>CERTIFICATE</Text>
                          <Text style={styles.certOfText}>of</Text>
                          <Text style={[styles.certAchievementText, { color: selectedCertificate.color }]}>ACHIEVEMENT</Text>
                        </View>
                        
                        {/* Decorative Line */}
                        <View style={[styles.decorativeLine, { backgroundColor: selectedCertificate.color }]} />
                        
                        {/* Body */}
                        <View style={styles.certBodySection}>
                          <Text style={styles.certPresentedTo}>This is to certify that</Text>
                          
                          <Text style={styles.certRecipientName}>
                            {userProfile?.username || 'Learner'}
                          </Text>
                          
                          <Text style={styles.certCompletionText}>
                            has successfully completed the course
                          </Text>
                          
                          <Text style={[styles.courseTitle, { color: selectedCertificate.color }]}>
                            {selectedCertificate.title}
                          </Text>
                          
                          <Text style={styles.courseDescription}>
                            {selectedCertificate.description}
                          </Text>
                        </View>
                        
                        {/* Decorative Line */}
                        <View style={[styles.decorativeLine, { backgroundColor: selectedCertificate.color }]} />
                        
                        {/* Footer */}
                        <View style={styles.certFooterSection}>
                          <Text style={styles.issueDateText}>
                            Issued on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </Text>
                          <Text style={[styles.issuerName, { color: selectedCertificate.color }]}>AtomIQ</Text>
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
                  style={[styles.actionButton, styles.saveButton, { backgroundColor: selectedCertificate.color }]}
                  onPress={handleSaveCertificate}
                >
                  <Icon name="DocumentDownload" size={20} color="#FFF" variant="Bold" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.closeButtonNew]}
                  onPress={() => setShowCertificateModal(false)}
                >
                  <Icon name="CloseCircle" size={20} color={THEME.text} variant="Bold" />
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

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  // Certificate Styles
  certificatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  certificateWrapper: {
    width: (width - 60) / 2,
  },
  certificate: {
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
  },
  certificateLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
  },
  certificateGradient: {
    flex: 1,
    padding: 3,
  },
  certificateBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  certificateInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  certificateLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
    marginTop: 8,
  },
  certificateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 4,
  },
  certificateDesc: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  certificateTapHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  certificateTapText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  certificateLockedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  certificateTitleLocked: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  certificateDescLocked: {
    fontSize: 10,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 4,
  },
  // Achievement Styles
  achievementsGrid: {
    gap: 16,
  },
  achievementCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
  },
  achievementCardLocked: {
    borderColor: '#E0E0E0',
  },
  achievementCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconSection: {
    marginRight: 16,
    position: 'relative',
  },
  achievementIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIconCircleLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  achievementBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.green,
    padding: 2,
  },
  achievementContent: {
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  achievementCardTitleLocked: {
    color: THEME.textMuted,
  },
  achievementCardDescription: {
    fontSize: 13,
    color: THEME.textMuted,
    marginBottom: 12,
    fontWeight: '500',
  },
  achievementProgressSection: {
    marginTop: 4,
  },
  achievementProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  achievementProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  // Certificate Preview Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  certificateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  // Header Section
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
  // Body Section
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
  // Footer Section
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
  // Action Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 130,
  },
  saveButton: {
    backgroundColor: THEME.primary,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButtonNew: {
    backgroundColor: '#FFF',
  },
  closeButtonText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
