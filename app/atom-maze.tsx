import { Icon } from '@/components/ui/icon';
import { getAllMazes } from '@/content/explorer';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Mustard Theme - Bright
const THEME = {
  bg: '#FFFDE7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  primary: '#FFB300', // Bright Mustard Yellow
  primaryDark: '#FFA000',
  primaryLight: '#FFC107',
  success: '#2ECC71',
  error: '#E74C3C',
  gold: '#FFCA28',
  border: '#FFE082',
};

// Maze colors - Bright Mustard
const MAZE_COLORS: Record<string, { color: string; colorSecondary: string }> = {
  safety: { color: '#FFB300', colorSecondary: '#FFC107' },
  radiation: { color: '#FFA000', colorSecondary: '#FFB300' },
  history: { color: '#FF8F00', colorSecondary: '#FFA000' },
  reactor: { color: '#FFD54F', colorSecondary: '#FFEB3B' },
  default: { color: '#FFB300', colorSecondary: '#FFC107' },
};

const getMazeColors = (theme: string | undefined) => {
  if (!theme) return MAZE_COLORS.default;
  const lowerTheme = theme.toLowerCase();
  if (lowerTheme.includes('safety')) return MAZE_COLORS.safety;
  if (lowerTheme.includes('radiation')) return MAZE_COLORS.radiation;
  if (lowerTheme.includes('history')) return MAZE_COLORS.history;
  if (lowerTheme.includes('reactor')) return MAZE_COLORS.reactor;
  return MAZE_COLORS.default;
};

export default function AtomMazeSelectionScreen() {
  const router = useRouter();
  const allMazes = getAllMazes();

  return (
    <LinearGradient
      colors={['#FFFDE7', '#FFF9C4', '#FFEE58']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.modeHeader}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButtonCircle}
          >
            <Icon name="ArrowLeft2" size={20} color={THEME.text} />
          </TouchableOpacity>
          <View style={styles.headerBadge}>
            <Icon name="Game" size={18} color="#FFF" variant="Bold" />
            <Text style={styles.headerBadgeText}>AtomMaze</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.modeScrollView}
          contentContainerStyle={styles.modeContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Maze Cards */}
          <View style={styles.modesGridNew}>
            {allMazes.map((maze, index) => {
              const colors = getMazeColors(maze.theme);
              return (
                <Animated.View key={maze.id} entering={FadeInDown.delay(100 + index * 100)}>
                  <Pressable
                    onPress={() => router.push(`/explorer/atom-maze?id=${maze.id}`)}
                    style={({ pressed }) => [
                      styles.modeCardNew,
                      pressed && styles.modeCardPressed,
                    ]}
                  >
                    {/* 3D Card Bottom Layer (Shadow/Depth) */}
                    <View style={[styles.card3DBottom, { backgroundColor: colors.color + 'AA' }]} />
                    
                    {/* 3D Card Middle Layer */}
                    <View style={[styles.card3DMiddle, { backgroundColor: colors.color }]} />
                    
                    {/* Card Background Gradient - Top Layer */}
                    <LinearGradient
                      colors={[colors.colorSecondary, colors.color]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.3, y: 1 }}
                      style={styles.modeCardGradientNew}
                    >
                      {/* Shine Effect */}
                      <View style={styles.cardShine} />
                      
                      {/* Decorative Circles */}
                      <View style={[styles.cardCircle, styles.cardCircle1]} />
                      <View style={[styles.cardCircle, styles.cardCircle2]} />
                      
                      {/* Icon Badge */}
                      <View style={styles.modeIconBadge}>
                        <View style={styles.modeIconInner}>
                          <Text style={{ fontSize: 24 }}>👾</Text>
                        </View>
                        {/* Icon Badge Shine */}
                        <View style={styles.iconBadgeShine} />
                      </View>

                      {/* Content */}
                      <View style={styles.modeCardContent}>
                        <Text style={styles.modeCardTitleNew}>{maze.title}</Text>
                        <Text style={styles.modeCardDescNew} numberOfLines={2}>{maze.description}</Text>
                        
                        {/* Tagline Banner */}
                        <View style={styles.taglineBanner}>
                          <Text style={styles.taglineText}>Battle Arena!</Text>
                        </View>
                      </View>

                      {/* Stats Row */}
                      <View style={styles.modeStatsRow}>
                        {/* Monsters Count */}
                        <View style={styles.roundsBadge}>
                          <Text style={{ fontSize: 12 }}>👾</Text>
                          <Text style={styles.roundsBadgeText}>{maze.rooms.length}</Text>
                        </View>

                        {/* Boss */}
                        <View style={styles.roundsBadge}>
                          <Text style={{ fontSize: 12 }}>👹</Text>
                          <Text style={styles.roundsBadgeText}>1</Text>
                        </View>

                        {/* XP Reward */}
                        <View style={styles.xpBadge}>
                          <Icon name="Flash" size={12} color="#FFD700" variant="Bold" />
                          <Text style={styles.xpBadgeText}>{maze.xpReward} XP</Text>
                        </View>
                      </View>

                      {/* Play Arrow */}
                      <View style={[styles.playArrowCircle, { marginTop: -26 }]}>
                        <Icon name="Play" size={20} color={colors.color} variant="Bold" />
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Info Card */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Icon name="InfoCircle" size={20} color={THEME.primary} />
            </View>
            <Text style={styles.infoText}>
              Answer <Text style={{ color: THEME.primary, fontWeight: '800' }}>QUIZ</Text> questions and <Text style={{ color: THEME.primary, fontWeight: '800' }}>SCRAMBLE</Text> words to defeat monsters!
            </Text>
          </Animated.View>

          {/* How to Play Section */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.howToPlaySection}>
            <Text style={styles.howToPlayTitle}>📖 How to Play</Text>
            <View style={styles.howToPlayGrid}>
              <View style={styles.howToPlayItem}>
                <Text style={styles.howToPlayEmoji}>❓</Text>
                <Text style={styles.howToPlayText}>Answer quiz questions</Text>
              </View>
              <View style={styles.howToPlayItem}>
                <Text style={styles.howToPlayEmoji}>🔤</Text>
                <Text style={styles.howToPlayText}>Unscramble words</Text>
              </View>
              <View style={styles.howToPlayItem}>
                <Text style={styles.howToPlayEmoji}>⚔️</Text>
                <Text style={styles.howToPlayText}>Deal damage to monsters</Text>
              </View>
              <View style={styles.howToPlayItem}>
                <Text style={styles.howToPlayEmoji}>❤️</Text>
                <Text style={styles.howToPlayText}>Don't lose all HP!</Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 4,
    borderBottomColor: THEME.primaryDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  modeScrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modesGridNew: {
    gap: 22,
  },
  modeCardNew: {
    borderRadius: 24,
    position: 'relative',
    height: 180,
  },
  modeCardPressed: {
    transform: [{ scale: 0.97 }, { translateY: 2 }],
  },
  // 3D Layers
  card3DBottom: {
    position: 'absolute',
    top: 8,
    left: 4,
    right: -4,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
  },
  card3DMiddle: {
    position: 'absolute',
    top: 4,
    left: 2,
    right: -2,
    bottom: -4,
    borderRadius: 24,
    opacity: 0.6,
  },
  modeCardGradientNew: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    padding: 20,
    paddingRight: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderLeftColor: 'rgba(255,255,255,0.4)',
  },
  // Shine Effect
  cardShine: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 100,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '45deg' }],
  },
  cardCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardCircle1: {
    width: 140,
    height: 140,
    top: -40,
    right: -40,
  },
  cardCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  modeIconBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect for badge
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderTopColor: 'rgba(255,255,255,0.6)',
  },
  modeIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Inner shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBadgeShine: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    transform: [{ rotate: '-20deg' }],
  },
  modeCardContent: {
    marginLeft: 60,
    flex: 1,
  },
  modeCardTitleNew: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  modeCardDescNew: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  taglineBanner: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  modeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginLeft: 64,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roundsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roundsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  playArrowCircle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderRightColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  // How to Play Section
  howToPlaySection: {
    marginTop: 24,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderBottomWidth: 4,
  },
  howToPlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  howToPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  howToPlayItem: {
    width: '47%',
    backgroundColor: '#FFFDE7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: THEME.primary + '30',
  },
  howToPlayEmoji: {
    fontSize: 28,
  },
  howToPlayText: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
