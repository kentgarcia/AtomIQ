/**
 * Reference Library (docs/PHONE_SPEC.md §5.10): every source the app cites, in one place, drawn as a library: a wood header
 * with books on a shelf, and each source a book on its unit's shelf. A switch picks "By unit" or
 * "All"; a book says who published it, whether a person has checked it ("Verified" or "Unchecked", never hidden) and
 * what cites it, and opens the source in the browser. No search yet: it appears once the list passes about forty
 * sources (`SEARCH_AFTER`), and a text box is only allowed in Field Notes (`check:phone`).
 */

import { LibButton, LibTitle, LibraryFrame, Plank } from "@/components/phone/LibraryFrame";
import { spineAt } from "@/components/phone/library-palette";
import { settle } from "@/components/motion/settle";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { contentRepository } from "@/services/content-db";
import {
  allSection,
  buildLibrary,
  citedByLine,
  groupByUnit,
  sourceLine,
  verifiedLabel,
  type LibraryRef,
  type LibrarySection,
  type LibraryUnit,
} from "@/services/library-core";
import { openExternalUrl } from "@/services/open-url";
import { createStyles, fontFaces, useResponsiveLayout, useTheme, withAlpha } from "@/theme";
import { useRouter } from "expo-router";
import { playSfx } from "@/services/sfx";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "unit" | "all";

export default function LibraryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const [mode, setMode] = useState<Mode>("unit");
  const [refs, setRefs] = useState<LibraryRef[]>([]);
  const [units, setUnits] = useState<LibraryUnit[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void contentRepository
      .getReferenceLibraryData()
      .then((data) => {
        if (!alive) return;
        setRefs(buildLibrary(data));
        setUnits(data.units);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);

  const sections: LibrarySection[] = useMemo(() => (mode === "unit" ? groupByUnit(refs, units) : allSection(refs)), [mode, refs, units]);

  const open = async (r: LibraryRef) => {
    if (!r.url.trim()) return;
    void playSfx("library.book");
    const ok = await openExternalUrl(r.url);
    setFailed(ok ? null : r.id);
  };

  return (
    <LibraryFrame
      left={<LibButton icon="ArrowLeft2" label="Back to the phone" onPress={() => { void playSfx("phone.app-close"); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/phone"); }} />}
      center={<LibTitle subtitle={refs.length === 1 ? "1 source" : `${refs.length} sources`}>Reference Library</LibTitle>}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.switch} accessibilityRole="tablist">
          {(["unit", "all"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              style={[styles.switchItem, mode === m && { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={[styles.switchText, { color: mode === m ? c.text : c.textMuted }]}>{m === "unit" ? "By unit" : "All"}</Text>
            </Pressable>
          ))}
        </View>

        {state === "loading" ? <Text style={styles.note}>Loading the sources…</Text> : null}
        {state === "error" ? <Text style={styles.note}>The sources could not be loaded. Try again in a moment.</Text> : null}
        {state === "ready" && sections.length === 0 ? <Text style={styles.note}>No sources are listed yet.</Text> : null}

        {sections.map((section, si) => (
          <Animated.View key={section.key} entering={settle(Math.min(si, 4) * 60)} style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {section.title}
            </Text>
            <View style={styles.books}>
              {section.refs.map((r, i) => {
                const spine = spineAt(i + si);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => void open(r)}
                    disabled={!r.url.trim()}
                    accessibilityRole="link"
                    accessibilityLabel={`${r.title}. ${sourceLine(r)}. ${verifiedLabel(r.verified)}. Opens the source in your browser.`}
                    style={({ pressed }) => [styles.book, pressed && styles.pressed]}
                  >
                    {/* The spine: cloth with a lighter band near each end */}
                    <View style={[styles.spine, { backgroundColor: spine.fill }]}>
                      <View style={[styles.band, { top: 12, backgroundColor: spine.band }]} />
                      <View style={[styles.band, { bottom: 12, backgroundColor: spine.band }]} />
                    </View>
                    <View style={styles.text}>
                      <Text style={styles.title}>{r.title}</Text>
                      <Text style={styles.line}>{sourceLine(r)}</Text>
                      {r.citedBy.length ? (
                        <Text style={styles.cited} numberOfLines={2}>
                          {citedByLine(r.citedBy)}
                        </Text>
                      ) : null}
                      {failed === r.id ? <Text style={[styles.cited, { color: c.error }]}>That link did not open.</Text> : null}
                    </View>
                    <View style={styles.side}>
                      <View style={[styles.mark, { backgroundColor: withAlpha(r.verified ? c.success : c.textMuted, 0.14) }]}>
                        <Icon name={r.verified ? "TickCircle" : "InfoCircle"} size={13} color={r.verified ? c.successDark : c.textMuted} variant="Bold" />
                        <Text style={[styles.markText, { color: r.verified ? c.successDark : c.textMuted }]}>{verifiedLabel(r.verified)}</Text>
                      </View>
                      <Icon name="ExportSquare" size={18} color={c.textMuted} variant="Bold" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Plank />
          </Animated.View>
        ))}
      </ScrollView>
    </LibraryFrame>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    switch: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: c.surfaceSoft, marginBottom: 16 },
    switchItem: { flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
    switchText: { fontSize: 14, ...fontFaces.heavy },
    note: { marginTop: 8, fontSize: 15, lineHeight: 22, ...fontFaces.medium, color: c.textMuted },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 20, marginBottom: 12, ...fontFaces.heavy, color: c.text },
    // The books stand on the plank under them, so the last one touches it
    books: { gap: 8, marginBottom: -2 },
    book: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingRight: 12, borderRadius: 8, overflow: "hidden", backgroundColor: c.field },
    spine: { alignSelf: "stretch", width: 18 },
    band: { position: "absolute", left: 0, right: 0, height: 4 },
    pressed: { opacity: 0.7 },
    text: { flex: 1, gap: 2, paddingVertical: 12 },
    title: { fontSize: 16, lineHeight: 22, ...fontFaces.heavy, color: c.text },
    line: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: c.textSecondary },
    cited: { fontSize: 12, lineHeight: 17, ...fontFaces.medium, color: c.textMuted },
    side: { alignItems: "flex-end", gap: 8 },
    mark: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    markText: { fontSize: 11, lineHeight: 15, ...fontFaces.heavy },
  };
});
