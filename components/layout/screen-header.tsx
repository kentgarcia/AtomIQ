/**
 * ScreenHeader — the one header of the app's top-level pages (Feed, Quests, Guide, Games,
 * Encyclopedia, Periodic table, Daily facts). It stays above the scrolling body and gets the tab bar's
 * border along its bottom edge once the body has scrolled.
 *
 *   Title variant (no left control):   a big left-aligned title, an optional `right` control.
 *       Feed                                            [ ? ]
 *
 *   Centered variant (`onBack` or `left`):  the title centred between a left and a right control; both
 *   slots are always reserved, so the title stays centred whatever is in them.
 *       [ < ]            Daily facts            [ ? ]
 *
 * An optional `subtitle` is one muted line under the title in either variant.
 *
 * Wire the border with `useHeaderBorder()` and pass `scrolled` here and `onScroll` to the list:
 *
 *   const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
 *   <ScreenHeader title="Quests" scrolled={scrolled} />
 *   <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} … />
 *
 * The bottom edge is always 2 dp tall (transparent until scrolled), so nothing moves when the border
 * appears. Colour is the tab bar's border colour. The header paints the page background and adds the
 * top safe-area inset plus 12 dp itself, so the screen adds no top padding above it.
 */

import { useCallback, useState, type ReactNode } from "react";
import { Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useResponsiveLayout, useTheme } from "@/theme";

const SIDE = 24;
const SLOT = 48;

/** Scroll state for the header's border: flips only when the body crosses the top edge. */
export function useHeaderBorder() {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 1;
    setScrolled((prev) => (prev === next ? prev : next));
  }, []);
  return { scrolled, onScroll, scrollEventThrottle: 32 } as const;
}

/** A 48 dp icon button for the header's slots (back, search, a shortcut). */
export function HeaderButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name={icon} size={24} color={theme.colors.text} variant="Bold" />
    </Pressable>
  );
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Adds a back button on the left and centres the title. */
  onBack?: () => void;
  backLabel?: string;
  /** A custom left control (centres the title too); wins over `onBack`. */
  left?: ReactNode;
  /** A control on the right (use `HeaderButton`). */
  right?: ReactNode;
  /** The body has scrolled: show the bottom border. */
  scrolled?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, backLabel = "Go back", left, right, scrolled = false }: ScreenHeaderProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { contentMaxWidth } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const leftNode = left ?? (onBack ? <HeaderButton icon="ArrowLeft2" label={backLabel} onPress={onBack} /> : null);
  const centered = leftNode !== null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }, scrolled && { borderBottomColor: theme.palettes.tabBar.border }]}>
      <View style={[styles.frame, { maxWidth: contentMaxWidth }]}>
        {centered ? (
          <View style={styles.centerRow}>
            <View style={styles.slot}>{leftNode}</View>
            <View style={styles.centerCopy}>
              <Text style={styles.centerTitle} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.centerSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={[styles.slot, styles.slotRight]}>{right}</View>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {right ? <View style={styles.slotRight}>{right}</View> : null}
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    wrap: { backgroundColor: c.mapBackground, borderBottomWidth: 2, borderBottomColor: "transparent" },
    frame: { width: "100%", alignSelf: "center", paddingHorizontal: SIDE, paddingBottom: 8 },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 50 },
    titleCopy: { flex: 1 },
    title: { fontSize: 34, lineHeight: 42, ...fontFaces.black, color: c.text },
    sub: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textMuted },
    centerRow: { flexDirection: "row", alignItems: "center", minHeight: 50 },
    centerCopy: { flex: 1, alignItems: "center" },
    centerTitle: { fontSize: 22, lineHeight: 28, textAlign: "center", ...fontFaces.heavy, color: c.text },
    centerSub: { fontSize: 13, lineHeight: 18, textAlign: "center", ...fontFaces.medium, color: c.textMuted },
    slot: { width: SLOT, height: SLOT, justifyContent: "center" },
    slotRight: { alignItems: "flex-end", justifyContent: "center" },
    button: { width: SLOT, height: SLOT, alignItems: "center", justifyContent: "center", borderRadius: SLOT / 2 },
    pressed: { opacity: 0.6 },
  };
});
