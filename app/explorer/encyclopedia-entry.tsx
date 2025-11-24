import { Icon } from '@/components/ui/icon';
import { getEncyclopediaEntryById } from '@/content/explorer';
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
  primary: '#FF6B00',
  primaryDark: '#E65100',
  success: '#2ECC71',
  border: '#E5E7EB',
};

export default function EncyclopediaEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const entry = useMemo(() => {
    if (!id) return null;
    return getEncyclopediaEntryById(id);
  }, [id]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text>Entry not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Encyclopedia</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Term Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.termHeader}>
          <View style={styles.termLetter}>
            <Text style={styles.termLetterText}>{entry.term.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.termInfo}>
            <Text style={styles.term}>{entry.term}</Text>
            <View style={styles.termMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{entry.category}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{entry.difficulty}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Definition */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Definition</Text>
          <Text style={styles.definition}>{entry.definition}</Text>
        </Animated.View>

        {/* Quick Facts */}
        {entry.quickFacts && entry.quickFacts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Quick Facts</Text>
            {entry.quickFacts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <Icon name="TickCircle" size={20} color={THEME.success} variant="Bold" />
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Debunking Snippet */}
        {entry.debunkingSnippet && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.debunkCard}>
            <LinearGradient
              colors={[THEME.primary, THEME.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.debunkGradient}
            >
              <View style={styles.debunkHeader}>
                <Icon name="Danger" size={24} color="#FFF" variant="Bold" />
                <Text style={styles.debunkTitle}>Myth Debunking</Text>
              </View>
              <Text style={styles.debunkText}>{entry.debunkingSnippet}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Related Terms */}
        {entry.relatedTerms && entry.relatedTerms.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Related Terms</Text>
            <View style={styles.relatedTerms}>
              {entry.relatedTerms.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.relatedTermPill}
                  onPress={() => {
                    const relatedEntry = getEncyclopediaEntryById(term);
                    if (relatedEntry) {
                      router.replace(`/explorer/encyclopedia-entry?id=${term}`);
                    }
                  }}
                >
                  <Text style={styles.relatedTermText}>{term.replace(/-/g, ' ')}</Text>
                  <Icon name="ArrowRight2" size={14} color={THEME.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Sources */}
        {entry.sources && entry.sources.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sources</Text>
            {entry.sources.map((source, index) => (
              <View key={index} style={styles.sourceItem}>
                <View style={styles.sourceOrg}>
                  <Text style={styles.sourceOrgText}>{source.organization}</Text>
                </View>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                <Text style={styles.sourceUrl}>{source.url}</Text>
              </View>
            ))}
          </Animated.View>
        )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  termLetter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termLetterText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  termInfo: {
    flex: 1,
  },
  term: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 8,
  },
  termMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: THEME.bg,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  definition: {
    fontSize: 16,
    color: THEME.text,
    lineHeight: 24,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  factText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    lineHeight: 22,
  },
  debunkCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  debunkGradient: {
    padding: 20,
  },
  debunkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  debunkTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  debunkText: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
  },
  relatedTerms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relatedTermPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.bg,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  relatedTermText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
    textTransform: 'capitalize',
  },
  sourceItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  sourceOrg: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: THEME.primary,
    marginBottom: 8,
  },
  sourceOrgText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  sourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 12,
    color: THEME.textMuted,
  },
});

