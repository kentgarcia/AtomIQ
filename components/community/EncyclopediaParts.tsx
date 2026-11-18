/**
 * Encyclopedia pieces for the Discover screen: the Periodic Table banner
 * and a compact entry row. The full A–Z vault with filters stays on the
 * /encyclopedia screen.
 */

import { useRouter } from "expo-router";
import React, { memo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { BandCard, BandCircle, LipCard } from "@/components/community/BandCard";
import { makeHubStyles } from "@/components/community/hub-styles";
import { Icon } from "@/components/ui/icon";
import type { EncyclopediaEntry } from "@/content/explorer";
import { impactLight } from "@/services/haptics";
import { ELEMENTS, PERIODIC_TABLE_HREF } from "@/services/periodic-table";
import { useTheme } from "@/theme";

export function PeriodicTableBanner() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = makeHubStyles(theme);

  return (
    <BandCard
      title="Periodic Table"
      right={<BandCircle icon="ArrowRight2" />}
      style={styles.bannerWrap}
      accessibilityLabel={`Open the Periodic Table, all ${ELEMENTS.length} elements`}
      onPress={() => {
        impactLight();
        router.push(PERIODIC_TABLE_HREF);
      }}
      bodyStyle={styles.bannerBody}
    >
      <View style={styles.bannerIcon}>
        <Icon name="Element4" size={24} color={theme.colors.info} variant="Bold" />
      </View>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerText}>Tap any of the {ELEMENTS.length} elements to explore</Text>
      </View>
    </BandCard>
  );
}

function EncyclopediaRowBase({ entry }: { entry: EncyclopediaEntry }) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = makeHubStyles(theme);

  return (
    <LipCard
      style={styles.row}
      faceStyle={styles.rowFace}
      accessibilityLabel={`${entry.term}. ${entry.definition}`}
      onPress={() => {
        impactLight();
        router.push(`/explorer/encyclopedia-entry?id=${entry.id}`);
      }}
    >
      <View style={styles.rowMain}>
        <View style={styles.categoryPill}>
          <Text style={styles.galleryCategory}>{entry.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.rowTerm}>{entry.term}</Text>
        <Text style={styles.rowDefinition} numberOfLines={2}>
          {entry.definition}
        </Text>
      </View>
      <View style={styles.arrow}>
        <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
      </View>
    </LipCard>
  );
}

export const EncyclopediaRow = memo(EncyclopediaRowBase);
