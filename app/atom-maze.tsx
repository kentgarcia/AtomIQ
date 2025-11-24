import { Icon } from '@/components/ui/icon';
import { getAllMazes } from '@/content/explorer';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  border: '#E5E7EB',
};

export default function AtomMazeSelectionScreen() {
  const router = useRouter();
  const allMazes = getAllMazes();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AtomMaze</Text>
          <Text style={styles.headerSubtitle}>Navigate through quiz adventures</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Challenges</Text>
            <Text style={styles.sectionSubtitle}>Answer questions to progress through rooms</Text>
          </View>

          <View style={styles.mazesContainer}>
            {allMazes.map((maze) => (
              <TouchableOpacity
                key={maze.id}
                style={styles.mazeCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/explorer/atom-maze?id=${maze.id}`)}
              >
                <LinearGradient
                  colors={['#9B59B6', '#8E44AD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.mazeGradient}
                >
                  <View style={styles.mazeContent}>
                    <View style={styles.mazeIcon}>
                      <Icon name="Game" size={40} color="#FFF" variant="Bold" />
                    </View>
                    <View style={styles.mazeText}>
                      <Text style={styles.mazeTitle}>{maze.title}</Text>
                      <Text style={styles.mazeSubtitle}>{maze.description}</Text>
                      <View style={styles.mazeMeta}>
                        <View style={styles.metaItem}>
                          <Icon name="Game" size={14} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.metaText}>{maze.rooms.length} rooms</Text>
                        </View>
                        <Text style={styles.metaDot}>•</Text>
                        <View style={styles.metaItem}>
                          <Icon name="Flash" size={14} color="#FFD700" variant="Bold" />
                          <Text style={styles.metaText}>{maze.xpReward} XP</Text>
                        </View>
                        {maze.timeLimit && (
                          <>
                            <Text style={styles.metaDot}>•</Text>
                            <View style={styles.metaItem}>
                              <Icon name="Timer" size={14} color="rgba(255,255,255,0.8)" />
                              <Text style={styles.metaText}>{Math.floor(maze.timeLimit / 60)} min</Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                    <Icon name="ArrowRight2" size={24} color="rgba(255,255,255,0.6)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  mazesContainer: {
    gap: 16,
  },
  mazeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  mazeGradient: {
    padding: 20,
  },
  mazeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mazeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mazeText: {
    flex: 1,
  },
  mazeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  mazeSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  mazeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});

