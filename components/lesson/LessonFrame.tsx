/** The lesson surface: the plain theme background (white in light, the dark surface in dark). */

import type { ReactNode } from "react";
import { View } from "react-native";

import { createStyles, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
}));

export function LessonFrame({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return <View style={styles.root}>{children}</View>;
}

/**
 * The content column for lesson screens: nearly edge to edge on a phone (12 px gutters), and a
 * wide readable column on tablets. Tighter than the app default so cards, figures and buttons
 * use the screen instead of leaving margins.
 */
export const LESSON_FRAME = { width: "100%", maxWidth: 840, alignSelf: "center", paddingHorizontal: spacing.md } as const;
