/**
 * One note (docs/PHONE_SPEC.md §10): a title, a body and, for a clipping, the quoted line with a way back to where
 * it was cut from. It saves itself: 800 ms after the learner stops typing, when the app goes to the background and
 * when they leave. A note left with nothing in it and no clipping is not kept. The note is private and on the device.
 */

import { PAD } from "@/components/phone/notepad-palette";
import { BAR, NotepadFrame, PadButton, PadTitle } from "@/components/phone/NotepadFrame";
import { phoneTile } from "@/components/phone/phone-palette";
import { Icon } from "@/components/ui/icon";
import { ModalButton, ModalSecondaryButton } from "@/components/ui/modal-card";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import {
  KIND_LOOK,
  NOTE_LIMITS,
  clampBody,
  clampTitle,
  counterOf,
  deleteNote,
  getNote,
  isEmptyNote,
  noteKind,
  saveNote,
  sourceHref,
  sourceLabel,
  type Note,
} from "@/services/field-notes";
import { playSfx } from "@/services/sfx";
import { fontFaces, useResponsiveLayout, useTheme } from "@/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from "react-native";

const AUTOSAVE_MS = 800;

export default function FieldNoteScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { contentMaxWidth } = useResponsiveLayout();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [note, setNote] = useState<Note | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // What the autosave and the leave-handler read: the latest text, whether it changed, and whether the note is gone
  const latest = useRef({ title: "", body: "", snippet: null as string | null });
  const dirty = useRef(false);
  const gone = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    if (!id) {
      setMissing(true);
      return;
    }
    void getNote(id).then((n) => {
      if (!alive) return;
      if (!n) {
        setMissing(true);
        return;
      }
      latest.current = { title: n.title, body: n.body, snippet: n.snippet };
      setNote(n);
      setTitle(n.title);
      setBody(n.body);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  /** Save now if the text changed since the last save. */
  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!id || !dirty.current || gone.current) return;
    dirty.current = false;
    await saveNote(id, { title: latest.current.title, body: latest.current.body });
  }, [id]);

  const changed = useCallback(
    (next: { title?: string; body?: string }) => {
      latest.current = { ...latest.current, ...next };
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  // Save when the app goes to the background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void flush();
    });
    return () => sub.remove();
  }, [flush]);

  // On leaving: save, and drop a note with nothing in it
  useEffect(() => {
    return () => {
      void (async () => {
        await flush();
        if (id && !gone.current && isEmptyNote(latest.current)) await deleteNote(id);
      })();
    };
  }, [id, flush]);

  const onDelete = async () => {
    gone.current = true;
    if (timer.current) clearTimeout(timer.current);
    setConfirmDelete(false);
    if (id) await deleteNote(id);
    void playSfx("ui.delete");
    router.back();
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/phone-apps/field-notes"));
  const counter = counterOf(body.length, NOTE_LIMITS.body);

  const left = <PadButton icon="ArrowLeft2" label="Back to Field Notes" onPress={back} />;
  const center = <PadTitle>Note</PadTitle>;

  if (missing) {
    return (
      <NotepadFrame left={left} center={center} right={<View style={{ width: BAR }} />}>
        <Text style={{ margin: 24, fontSize: 17, ...fontFaces.heavy, color: c.text }}>This note is not here any more.</Text>
      </NotepadFrame>
    );
  }

  const clip = note?.sourceType && note.sourceId && note.snippet ? { type: note.sourceType, id: note.sourceId, snippet: note.snippet } : null;
  const clipTile = clip ? phoneTile(c, KIND_LOOK[noteKind({ sourceType: clip.type })].role) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <NotepadFrame left={left} center={center} right={note ? <PadButton icon="Trash" label="Delete this note" onPress={() => setConfirmDelete(true)} /> : <View style={{ width: BAR }} />}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
          <View style={{ width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", gap: 12 }}>
            {clip && clipTile ? (
              // The clipped line: a yellow sticky note with the kind's face on it, opening where it was cut from
              <Pressable
                onPress={() => router.push(sourceHref(clip.type, clip.id) as never)}
                accessibilityRole="button"
                accessibilityLabel={`${sourceLabel(clip.type)}: ${clip.snippet}. Opens it.`}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: PAD.highlight,
                  borderBottomWidth: pressed ? 2 : 5,
                  borderBottomColor: PAD.bandLip,
                  transform: [{ translateY: pressed ? 3 : 0 }],
                })}
              >
                <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: clipTile.face, borderBottomWidth: 3, borderBottomColor: clipTile.lip }}>
                  <Icon name={KIND_LOOK[noteKind({ sourceType: clip.type })].icon} size={20} color={clipTile.ink} variant="Bold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, lineHeight: 16, ...fontFaces.heavy, color: PAD.ink, opacity: 0.7 }}>{sourceLabel(clip.type)}</Text>
                  <Text style={{ fontSize: 15, lineHeight: 21, ...fontFaces.semibold, color: PAD.ink }}>{clip.snippet}</Text>
                </View>
                <Icon name="ArrowRight2" size={18} color={PAD.ink} variant="Bold" />
              </Pressable>
            ) : null}

            <TextInput
              style={{ paddingVertical: 6, fontSize: 24, lineHeight: 30, ...fontFaces.heavy, color: c.text }}
              value={title}
              onChangeText={(t) => {
                const v = clampTitle(t);
                setTitle(v);
                changed({ title: v });
              }}
              placeholder="Title"
              placeholderTextColor={c.textFaint}
              maxLength={NOTE_LIMITS.title}
              returnKeyType="next"
              accessibilityLabel="Note title"
              editable={note !== null}
            />
            <TextInput
              style={{ minHeight: 280, paddingVertical: 6, fontSize: 17, lineHeight: 25, ...fontFaces.medium, color: c.text }}
              value={body}
              onChangeText={(t) => {
                const v = clampBody(t);
                setBody(v);
                changed({ body: v });
              }}
              placeholder="Write what you noticed or want to remember"
              placeholderTextColor={c.textFaint}
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              maxLength={NOTE_LIMITS.body}
              accessibilityLabel="Note text"
              editable={note !== null}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {counter.full ? <Text style={{ fontSize: 13, ...fontFaces.semibold, color: c.error }}>That is the most a note can hold.</Text> : <View />}
              <Text style={{ fontSize: 12, ...fontFaces.semibold, color: counter.warn ? c.error : c.textMuted }}>{counter.text}</Text>
            </View>
          </View>
        </ScrollView>
      </NotepadFrame>

      <ModalDialog
        visible={confirmDelete}
        warning
        onClose={() => setConfirmDelete(false)}
        title="Delete this note?"
        closeLabel="Keep the note"
        footer={
          <>
            <ModalButton variant="destructive" label="Delete" onPress={() => void onDelete()} />
            <ModalSecondaryButton label="Keep it" onPress={() => setConfirmDelete(false)} />
          </>
        }
      >
        <Text style={{ fontSize: 16, lineHeight: 23, ...fontFaces.medium, color: c.textSecondary }}>It will be gone for good. Notes are only kept on this device.</Text>
      </ModalDialog>
    </KeyboardAvoidingView>
  );
}
