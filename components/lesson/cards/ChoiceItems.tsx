/** Pick-one interactions: choice, true-or-myth, and the choice flavour of predict. */

import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { seededShuffle } from "@/content/curriculum/evaluate";
import type {
  ChoiceItemData,
  PredictItemData,
  TrueOrMythItemData,
} from "@/content/curriculum/types";
import { Card } from "@/components/ui/card";
import { isArtId } from "@/components/lesson/visual/object-art";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";
import { useLessonTeacher } from "@/components/lesson/Conversation";
import { TeacherStage } from "@/components/lesson/TeacherStage";

import { FigureView, OptionButton, OptionRow, OptionsArea, PictureOption, PromptHeader, TermText, useCardStyles, type InteractionProps, type OptionState } from "./shared";

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
      <OptionsArea>
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
          />
        ))
      )}
      </OptionsArea>
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
    <OptionsArea>
      <View style={mf.row}>
        <OptionButton label="MYTH" accessibilityLabel="Myth" icon="CloseCircle" state={stateOf("myth")} disabled={locked} onPress={() => setPicked("myth")} />
        <OptionButton label="FACT" accessibilityLabel="Fact" icon="TickCircle" state={stateOf("true")} disabled={locked} onPress={() => setPicked("true")} />
      </View>
    </OptionsArea>
  );

  // With a teacher the statement is in their bubble on top, and the two buttons sit in the middle of the room under it.
  if (teacher) {
    return (
      <View style={mf.call}>
        <TeacherStage teller={teacher} minHeight={320} fill={false}>
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
  // The statement on top; the buttons share what is left and sit in the middle of it.
  call: { flexGrow: 1, gap: spacing.lg },
}));

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
      <PromptHeader ownerId={ownerId} text={data.prompt} hint="Your guess, not scored" />
      <OptionsArea>
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
      </OptionsArea>
    </View>
  );
}
