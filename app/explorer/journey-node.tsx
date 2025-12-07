import MarkdownText from '@/components/markdown-text';
import { Icon } from '@/components/ui/icon';
import { getArticleById } from '@/content/articles';
import { getJourneyById } from '@/content/explorer';
import { getMythById } from '@/content/myths';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  success: '#2ECC71',
  border: '#E5E7EB',
};

export default function JourneyNodeScreen() {
  const router = useRouter();
  const { journeyId, nodeId } = useLocalSearchParams<{ journeyId: string; nodeId: string }>();
  
  const journey = useMemo(() => {
    if (!journeyId) return null;
    return getJourneyById(journeyId);
  }, [journeyId]);

  const node = useMemo(() => {
    if (!journey) return null;
    return journey.nodes.find(n => n.id === nodeId);
  }, [journey, nodeId]);

  const content = useMemo(() => {
    if (!node) return null;
    switch (node.type) {
      case 'myth':
        return getMythById(node.contentId);
      case 'article':
        return getArticleById(node.contentId);
      default:
        return null;
    }
  }, [node]);

  if (!journey || !node || !content) {
    return (
      <View style={styles.container}>
        <Text>Content not found</Text>
      </View>
    );
  }

  const isMyth = node.type === 'myth' && 'mythStatement' in content;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{node.title}</Text>
          <Text style={styles.headerSubtitle}>{journey.title}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isMyth && 'mythStatement' in content ? (
          <>
            {/* Encarta-Style Myth Node */}
            
            {/* What People Think Section */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.sectionCard}>
              <LinearGradient
                colors={['#E74C3C', '#C0392B'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sectionGradient}
              >
                <View style={styles.sectionHeader}>
                  <Icon name="Danger" size={32} color="#FFF" variant="Bold" />
                  <Text style={styles.sectionTitle}>What People Think</Text>
                </View>
                <Text style={styles.mythStatement}>{content.mythStatement}</Text>
                <View style={styles.commonBeliefs}>
                  <Text style={styles.commonBeliefsTitle}>Common Beliefs:</Text>
                  <View style={styles.beliefsList}>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.beliefText}>This misconception is widespread in popular media</Text>
                    </View>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.beliefText}>Often reinforced by movies and TV shows</Text>
                    </View>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.beliefText}>Creates unnecessary fear and misunderstanding</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* What Science Says Section */}
            <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionCard}>
              <LinearGradient
                colors={[THEME.success, '#27AE60'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sectionGradient}
              >
                <View style={styles.sectionHeader}>
                  <Icon name="TickCircle" size={32} color="#FFF" variant="Bold" />
                  <Text style={styles.sectionTitle}>What Science Says</Text>
                </View>
                <Text style={styles.realityStatement}>{content.reality}</Text>
                <View style={styles.explanationBox}>
                  <MarkdownText text={content.explanation} style={styles.explanation} textColor="#FFF" />
                </View>
                
                {/* Evidence from Sources */}
                {content.sources && content.sources.length > 0 && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.evidenceTitle}>Evidence from Scientific Sources:</Text>
                    {content.sources.map((source, index) => (
                      <View key={index} style={styles.evidenceItem}>
                        <Icon name="Document" size={16} color="rgba(255,255,255,0.9)" />
                        <View style={styles.evidenceText}>
                          <Text style={styles.evidenceSource}>{source.title}</Text>
                          {source.author && (
                            <Text style={styles.evidenceAuthor}>{source.author}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          </>
        ) : (
          /* Article or Other Content */
          <Animated.View entering={FadeInDown.delay(100)} style={styles.articleCard}>
            <Text style={styles.articleTitle}>{content.title}</Text>
            {content.excerpt && (
              <Text style={styles.articleExcerpt}>{content.excerpt}</Text>
            )}
            {'content' in content && (
              <MarkdownText text={content.content} style={styles.articleContent} />
            )}
          </Animated.View>
        )}

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {node.position > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                const prevNode = journey.nodes[node.position - 1];
                router.replace(`/explorer/journey-node?journeyId=${journeyId}&nodeId=${prevNode.id}`);
              }}
            >
              <Icon name="ArrowLeft2" size={20} color={THEME.primary} variant="Bold" />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {node.position < journey.nodes.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={() => {
                const nextNode = journey.nodes[node.position + 1];
                router.replace(`/explorer/journey-node?journeyId=${journeyId}&nodeId=${nextNode.id}`);
              }}
            >
              <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>Next</Text>
              <Icon name="ArrowRight2" size={20} color="#FFF" variant="Bold" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
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
    fontSize: 20,
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
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  sectionGradient: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  mythStatement: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 26,
    marginBottom: 20,
  },
  realityStatement: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 26,
    marginBottom: 16,
  },
  commonBeliefs: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  commonBeliefsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  beliefsList: {
    gap: 10,
  },
  beliefItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  beliefText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  explanationBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  explanation: {
    fontSize: 14,
    color: '#FFF',
    lineHeight: 22,
  },
  evidenceSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  evidenceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  evidenceText: {
    flex: 1,
  },
  evidenceSource: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  evidenceAuthor: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  articleCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  articleExcerpt: {
    fontSize: 15,
    color: THEME.textMuted,
    lineHeight: 22,
    marginBottom: 16,
  },
  articleContent: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  navButtonPrimary: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.primary,
  },
  navButtonTextPrimary: {
    color: '#FFF',
  },
});

