import { MarkdownText } from '@/components/markdown-text';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Icon } from '@/components/ui/icon';
import { getArticleById } from '@/content/articles';
import type { Article } from '@/content/articles/types';
import { getJourneyById } from '@/content/explorer';
import { getMythById } from '@/content/myths';
import type { Myth } from '@/content/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {useTheme, withAlpha, type Palette, fontFamilies} from "@/theme";

export default function JourneyNodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.explorer;
  const styles = useMemo(() => makeStyles(THEME), [THEME]);
  const { journeyId, nodeId } = useLocalSearchParams<{ journeyId: string; nodeId: string }>();
  
  const journey = useMemo(() => {
    if (!journeyId) return null;
    return getJourneyById(journeyId);
  }, [journeyId]);

  const node = useMemo(() => {
    if (!journey) return null;
    return journey.nodes.find(n => n.id === nodeId);
  }, [journey, nodeId]);

  // Myth and article content is DB-backed (async) — resolve it once per node.
  const [myth, setMyth] = useState<Myth | null>(null);
  const [mythRead, setMythRead] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [articleRead, setArticleRead] = useState(false);
  useEffect(() => {
    let alive = true;
    if (node && node.type === 'myth') {
      setMythRead(false);
      setMyth(null);
      getMythById(node.contentId).then((m) => {
        if (!alive) return;
        setMyth(m);
        setMythRead(true);
      });
    } else {
      setMythRead(true);
      setMyth(null);
    }
    if (node && node.type === 'article') {
      setArticleRead(false);
      setArticle(null);
      getArticleById(node.contentId).then((a) => {
        if (!alive) return;
        setArticle(a);
        setArticleRead(true);
      });
    } else {
      setArticleRead(true);
      setArticle(null);
    }
    return () => {
      alive = false;
    };
  }, [node]);

  const content = useMemo(() => {
    if (!node) return null;
    switch (node.type) {
      case 'myth':
        return myth;
      case 'article':
        return article;
      default:
        return null;
    }
  }, [node, myth, article]);

  if (!journey || !node) {
    return (
      <View style={styles.container}>
        <Text>Content not found</Text>
      </View>
    );
  }

  if (node.type === 'myth' && !mythRead) {
    return (
      <View style={styles.container}>
        <Text>Loading content…</Text>
      </View>
    );
  }

  if (node.type === 'article' && !articleRead) {
    return (
      <View style={styles.container}>
        <Text>Loading content…</Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.container}>
        <Text>Content not found</Text>
      </View>
    );
  }

  const isMyth = node.type === 'myth' && 'mythStatement' in content;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <PageHeader
        title={node.title}
        subtitle={journey.title}
        onBack={() => router.back()}
        palette={THEME}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
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
                <SectionHeader
                  icon="Danger"
                  iconColor={THEME.white}
                  titleColor={THEME.white}
                  title="What People Think"
                  palette={THEME}
                />
                <Text style={styles.mythStatement}>{content.mythStatement}</Text>
                <View style={styles.commonBeliefs}>
                  <Text style={styles.commonBeliefsTitle}>Common Beliefs:</Text>
                  <View style={styles.beliefsList}>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color={withAlpha(THEME.white, 0.9)} />
                      <Text style={styles.beliefText}>This misconception is widespread in popular media</Text>
                    </View>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color={withAlpha(THEME.white, 0.9)} />
                      <Text style={styles.beliefText}>Often reinforced by movies and TV shows</Text>
                    </View>
                    <View style={styles.beliefItem}>
                      <Icon name="CloseCircle" size={16} color={withAlpha(THEME.white, 0.9)} />
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
                <SectionHeader
                  icon="TickCircle"
                  iconColor={THEME.white}
                  titleColor={THEME.white}
                  title="What Science Says"
                  palette={THEME}
                />
                <Text style={styles.realityStatement}>{content.reality}</Text>
                <View style={styles.explanationBox}>
                  <MarkdownText text={content.explanation} style={styles.explanation} textColor={THEME.white} />
                </View>
                
                {/* Evidence from Sources */}
                {content.sources && content.sources.length > 0 && (
                  <View style={styles.evidenceSection}>
                    <Text style={styles.evidenceTitle}>Evidence from Scientific Sources:</Text>
                    {content.sources.map((source, index) => (
                      <View key={index} style={styles.evidenceItem}>
                        <Icon name="Document" size={16} color={withAlpha(THEME.white, 0.9)} />
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
            {'excerpt' in content && content.excerpt && (
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
              <Icon name="ArrowRight2" size={20} color={THEME.white} variant="Bold" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (THEME: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
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
  mythStatement: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: THEME.white,
    lineHeight: 26,
    marginBottom: 20,
  },
  realityStatement: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: THEME.white,
    lineHeight: 26,
    marginBottom: 16,
  },
  commonBeliefs: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: withAlpha(THEME.white, 0.2),
  },
  commonBeliefsTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: withAlpha(THEME.white, 0.9),
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
    fontFamily: fontFamilies.regular,
    color: withAlpha(THEME.white, 0.9),
    lineHeight: 20,
  },
  explanationBox: {
    backgroundColor: withAlpha(THEME.white, 0.1),
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  explanation: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.white,
    lineHeight: 22,
  },
  evidenceSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: withAlpha(THEME.white, 0.2),
  },
  evidenceTitle: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: withAlpha(THEME.white, 0.9),
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
    fontFamily: fontFamilies.semibold,
    color: THEME.white,
    marginBottom: 2,
  },
  evidenceAuthor: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: withAlpha(THEME.white, 0.8),
  },
  articleCard: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  articleTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 12,
  },
  articleExcerpt: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    lineHeight: 22,
    marginBottom: 16,
  },
  articleContent: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
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
    backgroundColor: THEME.white,
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
    fontFamily: fontFamilies.bold,
    color: THEME.primary,
  },
  navButtonTextPrimary: {
    color: THEME.white,
  },
});

