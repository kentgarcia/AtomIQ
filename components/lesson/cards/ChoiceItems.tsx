/** Pick-one interactions: choice, true-or-myth, and the choice flavour of predict. */

import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { seededShuffle } from "@/content/curriculum/evaluate";
import type {
  ChoiceItemData,
  PredictItemData,
  TrueOrMythItemData,
} from "@/content/curriculum/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isArtId } from "@/components/lesson/visual/object-art";
import { Icon } from "@/components/ui/icon";
import { select } from "@/services/haptics";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";
import { useLessonTeacher } from "@/components/lesson/Conversation";
import { TeacherStage } from "@/components/lesson/TeacherStage";

import { FigureView, OptionRow, PictureOption, PromptHeader, TermText, useCardStyles, type InteractionProps, type OptionState } from "./shared";

export function ChoiceItem({ data, seed, locked, result, onChange, ownerId }: InteractionProps<ChoiceItemData, { type: "choice"; optionId: string }> & { ownerId: string }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const options = useMemo(() => seededShuffle(data.options, seed), [data.options, seed]);
  const [picked, setPicked] = useState<string | null>(null);
  const pictured = options.length > 0 && options.every((o) => isArtId(o.art));

  useEffect(() => {
    onChange(picked ? { type: "choice", optionId: picked } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const stateOf = (id: string): OptionState => {
    if (!locked) return picked === id ? "selected" : "idle";
    if (id === data.answer) return "correct";
    if (id === picked) return "wrong";
    return "dim";
  };

  return (
    <View style={styles.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} />
      {data.figure ? <FigureView figure={data.figure} /> : null}
      {pictured ? (
        // Every option has a picture: two picture cards per row.
        <View style={styles.pictureGrid}>
          {options.map((o) => (
            <PictureOption
              key={o.id}
              label={o.label}
              art={o.art as string}
              state={stateOf(o.id)}
              disabled={locked}
              onPress={() => setPicked(o.id)}
              note={locked && o.id === picked && o.id !== data.answer ? (result?.note ?? o.note) : undefined}
            />
          ))}
        </View>
      ) : (
        options.map((o, i) => (
          <OptionRow
            key={o.id}
            label={o.label}
            badge={String(i + 1)}
            art={o.art}
            state={stateOf(o.id)}
            disabled={locked}
            onPress={() => setPicked(o.id)}
            note={locked && o.id === picked && o.id !== data.answer ? (result?.note ?? o.note) : undefined}
          />
        ))
      )}
    </View>
  );
}

export function TrueOrMythItem({ data, locked, onChange, ownerId }: InteractionProps<TrueOrMythItemData, { type: "true_or_myth"; answer: "true" | "myth" }> & { ownerId: string }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const mf = useMythFactStyles(theme);
  const teacher = useLessonTeacher();
  const [picked, setPicked] = useState<"true" | "myth" | null>(null);

  useEffect(() => {
    onChange(picked ? { type: "true_or_myth", answer: picked } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const stateOf = (id: "true" | "myth"): OptionState => {
    if (!locked) return picked === id ? "selected" : "idle";
    if (id === data.answer) return "correct";
    if (id === picked) return "wrong";
    return "dim";
  };

  const buttons = (
    <View style={mf.row}>
      <MythFactButton kind="myth" state={stateOf("myth")} locked={locked} onPress={() => setPicked("myth")} />
      <MythFactButton kind="true" state={stateOf("true")} locked={locked} onPress={() => setPicked("true")} />
    </View>
  );

  // With a teacher it is a video call: the statement in a bubble on top, the teacher big in the
  // middle, the two buttons at the bottom.
  if (teacher) {
    return (
      <View style={mf.call}>
        <TeacherStage teller={teacher}>
          <TermText text={data.statement} style={styles.ask} />
        </TeacherStage>
        {buttons}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {/* The statement, in a big quote card. */}
      <Card gap={spacing.xs} padding={spacing.md}>
        <Text style={mf.mark} accessible={false} importantForAccessibility="no">&ldquo;</Text>
        <PromptHeader ownerId={ownerId} text={data.statement} />
      </Card>
      {buttons}
    </View>
  );
}


const useMythFactStyles = createStyles((theme) => ({
  mark: { ...fontFaces.black, fontSize: fontSizes["10xl"], lineHeight: 40, color: theme.colors.primary },
  row: { flexDirection: "row", gap: spacing.md },
  // The call: everything above the buttons shares the room, the buttons sit at the bottom.
  call: { flexGrow: 1, gap: spacing.lg },
}));

/**
 * MYTH or FACT: two 3D buttons. Idle is the plain button; a pick is filled in its colour (red for
 * myth, green for fact); once checked the right one is green, a wrong pick red, and the other fades.
 */
function MythFactButton({ kind, state, onPress, locked }: { kind: "myth" | "true"; state: OptionState; onPress: () => void; locked: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const variant = state === "correct" ? "success" : state === "wrong" ? "destructive" : state === "selected" ? (kind === "myth" ? "destructive" : "success") : "secondary";
  const label = kind === "myth" ? "MYTH" : "FACT";
  const ink = variant === "secondary" ? (kind === "myth" ? c.error : c.successDark) : c.onPrimary;
  const icon = state === "correct" ? "TickCircle" : state === "wrong" ? "CloseCircle" : kind === "myth" ? "CloseCircle" : "TickCircle";
  return (
    <View style={{ flex: 1, opacity: state === "dim" ? 0.45 : 1 }}>
      <Button
        label={label}
        accessibilityLabel={kind === "myth" ? "Myth" : "Fact"}
        variant={variant}
        renderIcon={() => <Icon name={icon} size={24} color={ink} />}
        onPress={() => {
          if (locked) return;
          select();
          onPress();
        }}
      />
    </View>
  );
}

/** Predict, choice flavour. Never marked right or wrong. */
export function PredictChoiceItem({ data, seed, locked, onChange, ownerId }: InteractionProps<PredictItemData, { type: "predict"; value: string }> & { ownerId: string }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const options = useMemo(() => seededShuffle(data.options ?? [], seed), [data.options, seed]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    onChange(picked ? { type: "predict", value: picked } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const pictured = options.length > 0 && options.every((o) => isArtId(o.art));

  return (
    <View style={styles.stack}>
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="There is no wrong answer here. Your guess is not scored." />
      {pictured ? (
        <View style={styles.pictureGrid}>
          {options.map((o) => (
            <PictureOption key={o.id} label={o.label} art={o.art as string} state={picked === o.id ? "selected" : "idle"} disabled={locked} onPress={() => setPicked(o.id)} />
          ))}
        </View>
      ) : (
        options.map((o, i) => (
          <OptionRow key={o.id} label={o.label} badge={String(i + 1)} art={o.art} state={picked === o.id ? "selected" : "idle"} disabled={locked} onPress={() => setPicked(o.id)} />
        ))
      )}
      {data.explanation && locked ? <TermText text={data.explanation} style={styles.hint} /> : null}
    </View>
  );
}
