/**
 * "Add to Field Notes": clips a line from an AtomDex entry or a daily fact into the learner's notebook and opens the
 * note to edit (docs/PHONE_SPEC.md §10). It only shows once the Field Notes app is installed on the phone, and a source
 * is clipped once: when it already is, the button says "In Field Notes" and opens that note instead.
 */

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useClippedNoteId } from "@/hooks/use-field-notes";
import { usePhone } from "@/hooks/use-phone";
import { clipToNotes, type NoteSource } from "@/services/field-notes";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export function AddToNotesButton({
  type,
  sourceId,
  title,
  snippet,
  style,
}: {
  type: NoteSource;
  sourceId: string;
  /** The new note's title (the entry's term, the fact's title). */
  title: string;
  /** The quoted line. */
  snippet: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const phone = usePhone();
  const clippedId = useClippedNoteId(type, sourceId);
  const [problem, setProblem] = useState<string | null>(null);

  const installed = phone.apps.some((a) => a.id === "field-notes");
  if (!phone.loaded || !installed) return null;

  const onPress = async () => {
    const result = await clipToNotes({ type, id: sourceId, title, snippet });
    if (result.ok) {
      setProblem(null);
      void playSfx("notes.clip");
      router.push(`/phone-apps/field-note?id=${encodeURIComponent(result.id)}`);
    } else {
      setProblem(result.reason === "full" ? "Your notebook is full. Delete a note to add another." : "That could not be added. Try again.");
    }
  };

  return (
    <View style={style}>
      <Button
        label={clippedId ? "In Field Notes" : "Add to Field Notes"}
        variant="secondary"
        size="compact"
        fullWidth={false}
        onPress={() => void onPress()}
        renderIcon={(color) => <Icon name={clippedId ? "TickCircle" : "Note"} size={16} color={color} variant="Bold" />}
        accessibilityLabel={clippedId ? "This is already in Field Notes. Opens the note." : "Add this to Field Notes"}
      />
      {problem ? <Text style={styles.problem}>{problem}</Text> : null}
    </View>
  );
}

const makeStyles = createStyles((theme) => ({
  problem: { marginTop: 6, fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: theme.colors.error },
}));
