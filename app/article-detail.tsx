import { Icon } from '@/components/ui/icon';
import { MarkdownText } from '@/components/markdown-text';
import { getArticleById } from '@/content/articles';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { 
  Dimensions, 
  Image, 
  Linking, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  border: '#E5E7EB',
};

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const articleId = typeof id === 'string' ? id.replace('article-', '') : '';
  
  const article = getArticleById(articleId);
  
  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="Danger" size={64} color={THEME.primary} />
          <Text style={styles.errorText}>Article not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const handleOpenSource = async () => {
    if (article.sourceUrl) {
      try {
        await Linking.openURL(article.sourceUrl);
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="ArrowLeft" size={24} color={THEME.text} />
        </TouchableOpacity>
        {article.sourceUrl && (
          <TouchableOpacity 
            style={styles.externalLinkButton}
            onPress={handleOpenSource}
          >
            <Icon name="Link" size={20} color={THEME.primary} />
            <Text style={styles.externalLinkText}>Open Source</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {article.image && (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Image 
              source={{ uri: article.image }} 
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>
        )}
        
        {/* Article Header */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.articleHeader}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>
          
          {/* Subtitle */}
          {article.subtitle && (
            <Text style={styles.subtitle}>{article.subtitle}</Text>
          )}
          
          {/* Author Info */}
          <View style={styles.authorSection}>
            <View style={styles.authorAvatar}>
              {article.author.avatar ? (
                <Image 
                  source={{ uri: article.author.avatar }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Icon name="Profile" size={24} color={THEME.primary} />
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{article.author.name}</Text>
              {article.author.title && (
                <Text style={styles.authorTitle}>{article.author.title}</Text>
              )}
            </View>
            <View style={styles.metaInfo}>
              {article.readTime && (
                <View style={styles.metaItem}>
                  <Icon name="Clock" size={14} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{article.readTime} min read</Text>
                </View>
              )}
              {article.difficulty && (
                <View style={styles.metaItem}>
                  <Icon name="InfoCircle" size={14} color={THEME.textMuted} />
                  <Text style={styles.metaText}>{article.difficulty}</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Published Date */}
          <Text style={styles.publishedDate}>
            Published {new Date(article.publishedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </Animated.View>
        
        {/* Article Content */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.contentContainer}>
          <MarkdownText 
            text={article.content} 
            textColor={THEME.text}
          />
        </Animated.View>
        
        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.tagsSection}>
            <Text style={styles.tagsTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {article.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
        
        {/* Source */}
        {article.source && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.sourceSection}>
            <View style={styles.sourceHeader}>
              <Icon name="Link" size={16} color={THEME.primary} />
              <Text style={styles.sourceTitle}>Source</Text>
            </View>
            <Text style={styles.sourceText}>{article.source}</Text>
            {article.sourceUrl && (
              <TouchableOpacity 
                style={styles.sourceLinkButton}
                onPress={handleOpenSource}
              >
                <Text style={styles.sourceLinkText}>Visit Source Website</Text>
                <Icon name="ArrowRight" size={16} color={THEME.primary} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
        
        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: {
    padding: 8,
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.bg,
    borderRadius: 8,
  },
  externalLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroImage: {
    width: width,
    height: 250,
    backgroundColor: THEME.bg,
  },
  articleHeader: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.textMuted,
    lineHeight: 26,
    marginBottom: 20,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  authorTitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  metaInfo: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  publishedDate: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tagsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: THEME.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  sourceSection: {
    marginTop: 24,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: THEME.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.text,
  },
  sourceText: {
    fontSize: 14,
    color: THEME.text,
    marginBottom: 12,
  },
  sourceLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  sourceLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
  bottomSpacing: {
    height: 40,
  },
});

