import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Icon } from '@/components/ui/icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Orange Theme matching the new design
const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#EA580C', // Orange
  primaryDark: '#C2410C',
  primaryLight: '#FB923C',
  border: '#E5E7EB',
};

export default function ChatLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Tab bar height: 70px + bottom padding (max 20px) + safe area bottom
  const TAB_BAR_HEIGHT = 70 + Math.max(insets.bottom, 20) + 20; // Extra 20px for spacing

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: TAB_BAR_HEIGHT }]}>
        
        {/* Scrollable Content */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Section with Enhanced Design */}
          <View style={styles.heroSection}>
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.mascotContainer}
          >
            <Image 
              source={require('@/assets/images/mascot/explain.png')} 
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.heroTitle}>Meet Schrödi</Text>
            <View style={styles.statusBadge}>
              <View style={styles.onlineIndicator} />
              <Text style={styles.statusText}>AI Assistant • Always Available</Text>
            </View>
          </Animated.View>
          
          <Animated.Text 
            entering={FadeInDown.delay(300).springify()}
            style={styles.heroSubtitle}
          >
            Your personal AI research assistant. Expert in nuclear physics, safety protocols, and debunking myths with science.
          </Animated.Text>
        </View>

        {/* Features with Enhanced Cards */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.featuresList}>
          <View style={styles.featureRow}>
            <LinearGradient
              colors={[THEME.primary + '20', THEME.primary + '10']}
              style={styles.iconBox}
            >
               <Icon name="Book1" size={20} color={THEME.primary} variant="Bold" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureText}>Explain Complex Topics</Text>
              <Text style={styles.featureSubtext}>Break down nuclear physics simply</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <LinearGradient
              colors={['#2ECC7120', '#2ECC7110']}
              style={styles.iconBox}
            >
               <Icon name="SearchNormal" size={20} color="#2ECC71" variant="Bold" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureText}>Fact-Check Myths</Text>
              <Text style={styles.featureSubtext}>Verify information instantly</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <LinearGradient
              colors={['#1CB0F620', '#1CB0F610']}
              style={styles.iconBox}
            >
               <Icon name="DocumentText" size={20} color="#1CB0F6" variant="Bold" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureText}>Cite Reliable Sources</Text>
              <Text style={styles.featureSubtext}>References from IAEA & UNSCEAR</Text>
            </View>
          </View>
        </Animated.View>

          {/* Example Questions */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Try asking...</Text>
            <View style={styles.exampleChips}>
              {['How do reactors work?', 'Is radiation dangerous?', 'What is half-life?'].map((q, i) => (
                <View key={i} style={styles.exampleChip}>
                  <Icon name="MessageQuestion" size={14} color={THEME.textMuted} />
                  <Text style={styles.exampleText}>{q}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Fixed Start Button - Always visible above tab bar */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.startButton}
            activeOpacity={0.8}
            onPress={() => router.push('/ai-chat')}
          >
            <LinearGradient
              colors={[THEME.primary, THEME.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButtonGradient}
            >
              <Icon name="Message" size={20} color="#FFF" variant="Bold" />
              <Text style={styles.startButtonText}>START CONVERSATION</Text>
              <Icon name="ArrowRight2" size={18} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View style={styles.startButtonShadow} />
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  mascotImage: {
    width: 120,
    height: 120,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC7120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2ECC7140',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2ECC71',
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  featuresList: {
    gap: 8,
    marginBottom: 16,
    flexShrink: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 2,
  },
  featureSubtext: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  examplesSection: {
    marginBottom: 16,
  },
  buttonContainer: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFF',
  },
  examplesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  exampleText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  startButton: {
    position: 'relative',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    flexShrink: 0,
  },
  startButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  startButtonShadow: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: THEME.primaryDark,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: -1,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
