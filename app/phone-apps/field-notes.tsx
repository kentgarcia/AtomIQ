/**
 * Field Notes (docs/PHONE_SPEC.md §10): the learner's private notebook. The header is the top of a yellow legal pad (a binding
 * strip with a perforated edge, `NotepadFrame.tsx`); under it is a plain page: a search, the tabs (all, written by me, clipped)
 * with a highlighter mark under the chosen one, and a list of notes, each with a small coloured face for what it is (written,
 * AtomDex, daily fact, scan, lesson), its title, a line of what is written and the date. A round pen button starts a new note.
 * Everything stays on the device; nothing here is shown to anyone. A note opens in `field-note.tsx`.
 */

import { NotepadFrame, PadButton, PadTitle } from "@/components/phone/NotepadFrame";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useFieldNotes } from "@/hooks/use-field-notes";
import { NOTE_FILTERS, NOTE_LIMITS, createNote, filterNotes, noteCountLabel, noteDateLabel, notePreview, noteTitle, sourceLabel, type Note, type NoteFilter } from "@/services/field-notes";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PEN = 60;
const LIP = 5;

/** One note: a filled card with the title, a line of what is written and the date. */
function NoteRow({ note, now, onPress }: { note: Note; now: number; onPress: (note: Note) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const title = noteTitle(note);
  const preview = notePreview(note);
  const date = noteDateLabel(note.updatedAt, now);
  return (
    <Pressable
      onPress={() => onPress(note)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${note.sourceType ? `${sourceLabel(note.sourceType)}. ` : ""}${date}. Opens the note.`}
      style={({ pressed }) => ({ gap: 4, padding: 16, borderRadius: 16, backgroundColor: c.field, opacity: pressed ? 0.7 : 1 })}
    >
      <Text numberOfLines={1} style={{ fontSize: 17, lineHeight: 22, ...fontFaces.heavy, color: c.text }}>
        {title}
      </Text>
      {preview ? (
        <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textSecondary }}>
          {preview}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, lineHeight: 16, ...fontFaces.semibold, color: c.textMuted }}>
        {note.sourceType ? `${sourceLabel(note.sourceType)} · ${date}` : date}
      </Text>
    </Pressable>
  );
}

export default function FieldNotesScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [query, setQuery] = useState("");
  const { notes, loaded } = useFieldNotes(query);
  const [notice, setNotice] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const shown = useMemo(() => filterNotes(notes, filter), [notes, filter]);
  const searching = query.trim() !== "";

  const open = (note: Note) => {
    impactLight();
    router.push(`/phone-apps/field-note?id=${encodeURIComponent(note.id)}`);
  };

  const newNote = async () => {
    const made = await createNote({});
    if (made.ok) {
      setNotice(null);
      void playSfx("notes.new");
      router.push(`/phone-apps/field-note?id=${encodeURIComponent(made.note.id)}`);
    } else {
      setNotice(made.reason === "full" ? `Your notebook holds ${NOTE_LIMITS.notes} notes. Delete one to add another.` : "That note could not be made. Try again.");
    }
  };

  const emptyTitle = searching ? "No notes match that." : filter === "written" ? "Nothing written yet." : filter === "clipped" ? "Nothing clipped yet." : "Your notebook is empty.";
  const emptyText = searching
    ? "Try another word, or clear the search."
    : filter === "clipped"
      ? "Use “Add to Field Notes” on an AtomDex entry, a daily fact or a scan result and it is kept here."
      : "Tap the pen to write your first note, or use “Add to Field Notes” on an AtomDex entry or a daily fact.";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <NotepadFrame
        left={<PadButton icon="ArrowLeft2" label="Back to the phone" onPress={() => { void playSfx("phone.app-close"); if (router.canGoBack()) router.back(); else router.replace("/(tabs)/phone"); }} />}
        center={<PadTitle subtitle={noteCountLabel(notes.length)}>Field Notes</PadTitle>}
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + PEN + 40 }}>
          <View style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", gap: 12 }}>
            {/* The app's search field, as in the AtomDex */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: c.field }}>
              <Icon name="SearchNormal" size={18} color={c.textFaint} variant="Bold" />
              <FieldInput
                style={{ flex: 1, paddingVertical: 0, fontSize: 15, ...fontFaces.semibold, color: c.fieldText }}
                value={query}
                onChangeText={setQuery}
                placeholder="Search your notes"
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search your notes"
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear the search">
                  <Icon name="CloseCircle" size={18} color={c.textFaint} />
                </Pressable>
              ) : null}
            </View>

            {/* The app's tab switch, as in the Reference Library */}
            <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 14, backgroundColor: c.surfaceSoft }}>
              {NOTE_FILTERS.map((f) => {
                const on = f.id === filter;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => {
                      if (on) return;
                      impactLight();
                      setFilter(f.id);
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={f.label}
                    accessibilityState={{ selected: on }}
                    style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 2, borderColor: on ? c.border : "transparent", backgroundColor: on ? c.card : "transparent" }}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 13, ...fontFaces.heavy, color: on ? c.text : c.textMuted }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {notice ? <Text style={{ fontSize: 14, lineHeight: 20, ...fontFaces.semibold, color: c.error }}>{notice}</Text> : null}

            {shown.map((note) => (
              <NoteRow key={note.id} note={note} now={now} onPress={open} />
            ))}

            {loaded && shown.length === 0 ? (
              <View style={{ alignItems: "center", gap: 8, paddingVertical: 40, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 18, textAlign: "center", ...fontFaces.heavy, color: c.text }}>{emptyTitle}</Text>
                <Text style={{ fontSize: 15, lineHeight: 22, textAlign: "center", ...fontFaces.medium, color: c.textMuted }}>{emptyText}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* The pen: a round face on a round lip (a second circle 5 dp lower), so the shadow follows the curve */}
        <Pressable
          onPress={() => void newNote()}
          accessibilityRole="button"
          accessibilityLabel="Write a new note"
          style={{ position: "absolute", right: 20, bottom: insets.bottom + 16, width: PEN, height: PEN + LIP }}
        >
          {({ pressed }) => (
            <>
              <View style={{ position: "absolute", left: 0, top: LIP, width: PEN, height: PEN, borderRadius: PEN / 2, backgroundColor: c.primaryDark }} />
              <View style={{ position: "absolute", left: 0, top: pressed ? LIP : 0, width: PEN, height: PEN, borderRadius: PEN / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.primary }}>
                <Icon name="Edit2" size={26} color={c.onPrimary} variant="Bold" />
              </View>
            </>
          )}
        </Pressable>
      </NotepadFrame>
    </KeyboardAvoidingView>
  );
}
