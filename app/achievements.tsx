import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { AchievementsGrid, useAwards } from "@/components/profile/AchievementsSection";
import { createStyles, useResponsiveLayout, useTheme } from "@/theme";

/** Side space around the list, the same 24 dp as the header's. */
const GUTTER = 24;

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.mapBackground },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
}));

/** The full list of achievements, opened from the arrow on the Profile page. */
export default function AchievementsScreen() {
  const router = useRouter();
  const styles = useStyles(useTheme().theme);
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const { totalLevels, possibleLevels } = useAwards();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Achievements"
        subtitle={`${totalLevels}/${possibleLevels} levels`}
        onBack={() => router.back()}
        scrolled={scrolled}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingBottom: insets.bottom + 32 }]}
      >
        <AchievementsGrid gutter={GUTTER} />
      </ScrollView>
    </View>
  );
}
