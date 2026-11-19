/** Pick-one interactions: choice, true-or-myth, and the choice flavour of predict. */

import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { seededShuffle } from "@/content/curriculum/evaluate";
import type {
  ChoiceItemData,
  PredictItemData,
  TrueOrMythItemData,
} from "@/content/curriculum/types";
import { isArtId } from "@/components/lesson/visual/object-art";
import { useTheme } from "@/theme";

import { playSfx } from "@/services/sfx";
import { FigureView, OptionRow, OptionsArea, PictureOption, PromptHeader, TermText, VerdictOption, useCardStyles, type InteractionProps, type OptionState } from "./shared";

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

  // The statement is said first (in the teacher's bubble beside them, or plain), then two tall verdicts
  // sit under it, stacked so each is easy to hit.
  return (
    <View style={styles.stack}>
      <PromptHeader ownerId={ownerId} text={data.statement} />
      <OptionsArea>
        <VerdictOption label="FACT" hint="This is true" icon="TickCircle" hue={theme.colors.success} state={stateOf("true")} disabled={locked} onPress={() => setPicked("true")} />
        <VerdictOption label="MYTH" hint="This is not true" icon="CloseCircle" hue={theme.colors.error} state={stateOf("myth")} disabled={locked} onPress={() => setPicked("myth")} />
      </OptionsArea>
    </View>
  );
}

/** Predict, choice flavour. Never marked right or wrong. */
export function PredictChoiceItem({ data, seed, locked, onChange, ownerId }: InteractionProps<PredictItemData, { type: "predict"; value: string }> & { ownerId: string }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const options = useMemo(() => seededShuffle(data.options ?? [], seed), [data.options, seed]);
  const [picked, setPicked] = useState<string | null>(null);
  // A guess is not graded, so no result cue follows: every press sounds, a changed mind included
  const pick = (id: string) => {
    void playSfx("ui.select");
    setPicked(id);
  };

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
            <PictureOption key={o.id} label={o.label} art={o.art as string} state={picked === o.id ? "selected" : "idle"} disabled={locked} onPress={() => pick(o.id)} />
          ))}
        </View>
      ) : (
        options.map((o, i) => (
          <OptionRow key={o.id} label={o.label} badge={String(i + 1)} art={o.art} state={picked === o.id ? "selected" : "idle"} disabled={locked} onPress={() => pick(o.id)} />
        ))
      )}
      {data.explanation && locked ? <TermText text={data.explanation} style={styles.hint} /> : null}
      </OptionsArea>
    </View>
  );
}
