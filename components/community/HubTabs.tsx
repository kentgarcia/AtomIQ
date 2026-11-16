/**
 * Discovery Hub tab controls. One segmented control (`SegmentedTabs`, chunky
 * lip styling like the other controls) drives both rows:
 *   HubTabs         Articles | Encyclopedia, under the daily-fact card
 *   ArticleSubTabs  All articles | Already read | Saved, plus a round search button
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { SlidingHighlight, useSlidingHighlight } from "@/components/ui/sliding-highlight";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { DURATION, EASE_DRAWER } from "@/theme/motion";
import { controls } from "@/theme/tokens";

const LIP = controls.lip;

type TabItem<T extends string> = { id: T; label: string; icon?: string };

/** Face + lip colors for the selected tab. */
type Tone = { face: string; lip: string };

/**
 * Segmented control. The selected tab is a rounded "lip" layer with the face
 * sitting on top of it (same construction as <Button>), and it slides from the
 * old tab to the new one via <SlidingHighlight>.
 */
function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  tone,
  style,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  tone: Tone;
  style?: object;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hl = useSlidingHighlight(value);

  const renderLabel = (tab: TabItem<T>, selected: boolean) => {
    const color = selected ? theme.colors.onPrimary : theme.colors.textMuted;
    return (
      <>
        {tab.icon ? <Icon name={tab.icon} size={18} color={color} variant="Bold" /> : null}
        <Text
          style={[styles.label, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {tab.label}
        </Text>
      </>
    );
  };

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {items.map((tab) => {
        const selected = hl.restId === tab.id;
        return (
          <Pressable
            key={tab.id}
            onLayout={hl.onItemLayout(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab.id === value }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (tab.id === value) return;
              impactLight();
              onChange(tab.id);
            }}
            style={[styles.tab, selected && { backgroundColor: tone.lip }]}
          >
            <View style={[styles.face, selected && { backgroundColor: tone.face }]}>
              {renderLabel(tab, selected)}
            </View>
          </Pressable>
        );
      })}
      <SlidingHighlight
        state={hl}
        style={[styles.pill, { backgroundColor: tone.lip }]}
        renderContent={(id) => {
          const tab = items.find((t) => t.id === id);
          return tab ? (
            <View style={[styles.face, styles.pillFace, { backgroundColor: tone.face }]}>
              {renderLabel(tab, true)}
            </View>
          ) : null;
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */

export type HubTab = "articles" | "encyclopedia";

const HUB_TABS: TabItem<HubTab>[] = [
  { id: "articles", label: "Articles", icon: "Note1" },
  { id: "encyclopedia", label: "Encyclopedia", icon: "Book1" },
];

/**
 * Line tabs: icon + label over a thin baseline. The active tab's icon, label
 * and underline switch to the brand color, and the underline slides to it.
 */
export function HubTabs({
  value,
  onChange,
}: {
  value: HubTab;
  onChange: (tab: HubTab) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeLineStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const [rects, setRects] = useState<Record<string, { x: number; width: number }>>({});
  const placed = useRef(false);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const shown = useSharedValue(0);

  const rect = rects[value];
  useEffect(() => {
    if (!rect) return;
    if (!placed.current || reducedMotion) {
      // First layout (or reduced motion): jump straight to the active tab
      x.value = rect.x;
      w.value = rect.width;
      shown.value = 1;
      placed.current = true;
      return;
    }
    const config = { duration: DURATION.sheet, easing: EASE_DRAWER };
    x.value = withTiming(rect.x, config);
    w.value = withTiming(rect.width, config);
  }, [rect, reducedMotion, x, w, shown]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: w.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {HUB_TABS.map((tab) => {
        const active = tab.id === value;
        const color = active ? theme.colors.primaryLight : theme.colors.textMuted;
        return (
          <Pressable
            key={tab.id}
            onLayout={(e) => {
              const { x: lx, width } = e.nativeEvent.layout;
              setRects((prev) =>
                prev[tab.id]?.x === lx && prev[tab.id]?.width === width
                  ? prev
                  : { ...prev, [tab.id]: { x: lx, width } },
              );
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (active) return;
              impactLight();
              onChange(tab.id);
            }}
            style={styles.tab}
          >
            {tab.icon ? <Icon name={tab.icon} size={20} color={color} variant="Bold" /> : null}
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View pointerEvents="none" style={[styles.line, lineStyle]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */

export type ArticleView = "all" | "read" | "saved";

const ARTICLE_VIEWS: TabItem<ArticleView>[] = [
  { id: "all", label: "All articles" },
  { id: "read", label: "Already read" },
  { id: "saved", label: "Saved" },
];

// Fixed near-black selected look for the article sub-tabs (requested design)
const SUB_TONE: Tone = {
  face: "#2c2c2c", // theme-allow: article sub-tab selected face (EX-09)
  lip: "#07070c", // theme-allow: article sub-tab selected lip (EX-09)
};

export function ArticleSubTabs({
  value,
  onChange,
  searchOpen,
  onToggleSearch,
}: {
  value: ArticleView;
  onChange: (view: ArticleView) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.subRow}>
      <SegmentedTabs
        items={ARTICLE_VIEWS}
        value={value}
        onChange={onChange}
        tone={SUB_TONE}
        style={styles.subTrack}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={searchOpen ? "Close search" : "Search articles"}
        accessibilityState={{ expanded: searchOpen }}
        hitSlop={6}
        onPress={() => {
          impactLight();
          onToggleSearch();
        }}
        style={[
          styles.searchLip,
          { backgroundColor: searchOpen ? SUB_TONE.lip : theme.colors.borderStrong },
        ]}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.searchFace,
              {
                backgroundColor: searchOpen ? SUB_TONE.face : theme.colors.card,
                borderColor: searchOpen ? SUB_TONE.face : theme.colors.border,
                transform: [{ translateY: pressed ? controls.pressTravel : 0 }],
              },
            ]}
          >
            <Icon
              name={searchOpen ? "CloseCircle" : "SearchNormal"}
              size={20}
              color={searchOpen ? theme.colors.onPrimary : theme.colors.textMuted}
              variant="Bold"
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const TAB_HEIGHT = 42;
const SEARCH_SIZE = 46;

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    track: {
      flexDirection: "row",
      gap: 6,
      padding: 4,
      borderRadius: 18,
      backgroundColor: c.surfaceSoft,
    },
    // Lip layer: rounded, face sits on top and leaves LIP px of it showing
    tab: {
      flex: 1,
      height: TAB_HEIGHT,
      borderRadius: 14,
    },
    face: {
      flex: 1,
      marginBottom: LIP,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 6,
    },
    pill: { borderRadius: 14 },
    pillFace: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flex: undefined },
    label: { fontSize: 14, ...fontFaces.heavy },
    subRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    subTrack: { flex: 1 },
    searchLip: {
      width: SEARCH_SIZE,
      height: SEARCH_SIZE + LIP,
      borderRadius: SEARCH_SIZE / 2,
      overflow: "hidden",
    },
    searchFace: {
      width: SEARCH_SIZE,
      height: SEARCH_SIZE,
      borderRadius: SEARCH_SIZE / 2,
      borderWidth: controls.border,
      alignItems: "center",
      justifyContent: "center",
    },
  };
});

const makeLineStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    bar: {
      flexDirection: "row",
      marginTop: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 46,
    },
    label: { fontSize: 15, ...fontFaces.heavy },
    // Sits over the baseline: bottom -2 covers the 2px border
    line: {
      position: "absolute",
      left: 0,
      bottom: -2,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
  };
});
