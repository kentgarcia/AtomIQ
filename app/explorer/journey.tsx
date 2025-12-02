import { Icon } from '@/components/ui/icon';
import { getJourneyById } from '@/content/explorer';
import { getMythById } from '@/content/myths';
import { getArticleById } from '@/content/articles';
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

export default function JourneyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const journey = useMemo(() => {
    if (!id) return null;
    return getJourneyById(id);
  }, [id]);

  if (!journey) {
    return (
      <View style={styles.container}>
        <Text>Journey not found</Text>
      </View>
    );
  }

  const getNodeContent = (node: typeof journey.nodes[0]) => {
    switch (node.type) {
      case 'myth':
        return getMythById(node.contentId);
      case 'article':
        return getArticleById(node.contentId);
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{journey.title}</Text>
          <Text style={styles.headerSubtitle}>{journey.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Journey Overview */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.overviewCard}>
          <LinearGradient
            colors={[THEME.primary, THEME.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewGradient}
          >
            <Text style={styles.overviewDescription}>{journey.description}</Text>
            <View style={styles.overviewMeta}>
              <View style={styles.metaItem}>
                <Icon name="Timer" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.metaText}>{journey.estimatedMinutes} minutes</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="Flash" size={16} color="#FFD700" variant="Bold" />
                <Text style={styles.metaText}>{journey.xpReward} XP</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="Book" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.metaText}>{journey.nodes.length} stops</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Journey Path */}
        <View style={styles.pathContainer}>
          <Text style={styles.pathTitle}>Journey Path</Text>
          {journey.nodes.map((node, index) => {
            const content = getNodeContent(node);
            const isLast = index === journey.nodes.length - 1;
            
            return (
              <Animated.View
                key={node.id}
                entering={FadeInDown.delay(200 + index * 100)}
                style={styles.pathItem}
              >
                {/* Connection Line */}
                {!isLast && <View style={styles.connectionLine} />}
                
                {/* Node Circle */}
                <View style={styles.nodeCircle}>
                  <Icon
                    name={
                      node.type === 'myth' ? 'Danger' :
                      node.type === 'article' ? 'Book' :
                      node.type === 'quiz' ? 'Game' :
                      'Document'
                    }
                    size={20}
                    color="#FFF"
                    variant="Bold"
                  />
                </View>
                
                {/* Node Card */}
                <TouchableOpacity
                  style={styles.nodeCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/explorer/journey-node?journeyId=${journey.id}&nodeId=${node.id}`)}
                >
                  <View style={styles.nodeCardContent}>
                    <View style={styles.nodeCardHeader}>
                      <Text style={styles.nodeNumber}>{index + 1}</Text>
                      <Text style={styles.nodeType}>{node.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.nodeTitle}>{node.title}</Text>
                    {node.description && (
                      <Text style={styles.nodeDescription}>{node.description}</Text>
                    )}
                    {content && (
                      <View style={styles.nodePreview}>
                        <Icon name="ArrowRight2" size={16} color={THEME.primary} />
                        <Text style={styles.nodePreviewText}>Explore</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Sources */}
        {journey.sources && journey.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesTitle}>Sources</Text>
            {journey.sources.map((source, index) => (
              <View key={index} style={styles.sourceItem}>
                <Icon name="Document" size={16} color={THEME.textMuted} />
                <View style={styles.sourceText}>
                  <Text style={styles.sourceTitle}>{source.title}</Text>
                  <Text style={styles.sourceOrg}>{source.organization}</Text>
                </View>
              </View>
            ))}
          </View>
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
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  overviewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  overviewGradient: {
    padding: 20,
  },
  overviewDescription: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  overviewMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  pathContainer: {
    marginBottom: 24,
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 16,
  },
  pathItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  connectionLine: {
    position: 'absolute',
    left: 20,
    top: 48,
    width: 2,
    height: 24,
    backgroundColor: THEME.border,
  },
  nodeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    zIndex: 1,
  },
  nodeCard: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    overflow: 'hidden',
  },
  nodeCardContent: {
    padding: 16,
  },
  nodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nodeNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
  },
  nodeType: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    backgroundColor: THEME.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  nodeDescription: {
    fontSize: 13,
    color: THEME.textMuted,
    marginBottom: 12,
  },
  nodePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodePreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  sourcesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  sourcesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sourceText: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 2,
  },
  sourceOrg: {
    fontSize: 11,
    color: THEME.textMuted,
  },
});

