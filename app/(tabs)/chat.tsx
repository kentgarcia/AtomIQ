import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Icon } from '@/components/ui/icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Orange Theme matching the new design
const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00', // Orange
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  border: '#E5E7EB',
};

export default function ChatLandingScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section with Enhanced Design */}
        <View style={styles.heroSection}>
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.mascotContainer}
          >
            <LinearGradient
               colors={[THEME.primary, THEME.primaryLight]}
               style={styles.mascotCircle}
            >
              <Icon name="Message" size={64} color="#FFF" variant="Bold" />
            </LinearGradient>
            {/* Duolingo-style 3D effect */}
            <View style={styles.mascotShadow} />
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
               <Icon name="Book1" size={24} color={THEME.primary} variant="Bold" />
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
               <Icon name="SearchNormal" size={24} color="#2ECC71" variant="Bold" />
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
               <Icon name="DocumentText" size={24} color="#1CB0F6" variant="Bold" />
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

        {/* Enhanced Start Button */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
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
              <Icon name="Message" size={24} color="#FFF" variant="Bold" />
              <Text style={styles.startButtonText}>START CONVERSATION</Text>
              <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
            </LinearGradient>
            <View style={styles.startButtonShadow} />
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  mascotCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 6,
    borderColor: '#FFF',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  mascotShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: -8,
    bottom: -8,
    borderRadius: 70,
    backgroundColor: THEME.primaryDark,
    opacity: 0.2,
    zIndex: 0,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2ECC7120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
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
    fontSize: 15,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresList: {
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 2,
  },
  featureSubtext: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  examplesSection: {
    marginBottom: 32,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  startButton: {
    position: 'relative',
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
