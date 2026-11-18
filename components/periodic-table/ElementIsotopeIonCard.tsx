/**
 * ElementIsotopeIonCard — short, accurate explainer of element vs isotope vs
 * ion, with carbon-12/carbon-14 and Na/Na+ as concrete examples. Optionally
 * personalised with the element currently being viewed.
 */

import React, { memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { ELEMENT_ISOTOPE_ION, type PeriodicElement } from "@/content/periodic-table/elements";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

export interface ElementIsotopeIonCardProps {
  /** When given, adds a one-line "for this element" summary. */
  element?: PeriodicElement;
  /** Extra content under the explainer (for example, related links). */
  footer?: React.ReactNode;
}

const makeStyles = createStyles((theme) => ({
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    ...fontFaces.book,
    color: theme.colors.textSecondary,
  },
  item: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: withAlpha(theme.colors.primary, 0.08),
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  term: {
    fontSize: 15,
    lineHeight: 21,
    ...fontFaces.heavy,
    color: theme.colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    ...fontFaces.book,
    color: theme.colors.text,
  },
  example: {
    fontSize: 14,
    lineHeight: 21,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
  personal: {
    fontSize: 14,
    lineHeight: 21,
    ...fontFaces.semibold,
    color: theme.colors.text,
  },
}));

function ElementIsotopeIonCardBase({ element, footer }: ElementIsotopeIonCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Element vs isotope vs ion
      </Text>
      <Text style={styles.intro}>
        Three words that are easy to mix up. Each one answers a different question about an atom.
      </Text>

      {ELEMENT_ISOTOPE_ION.map((item) => (
        <View key={item.term} style={styles.item}>
          <Text style={styles.term}>{item.term}</Text>
          <Text style={styles.body}>{item.summary}</Text>
          <Text style={styles.example}>Example: {item.example}</Text>
        </View>
      ))}

      {element ? (
        <Text style={styles.personal}>
          For {element.name}: every atom has {element.atomicNumber} proton
          {element.atomicNumber === 1 ? "" : "s"}. Atoms with a different number of neutrons are
          different isotopes of {element.name}, and atoms that gain or lose electrons are{" "}
          {element.name} ions.
        </Text>
      ) : null}

      {footer}
    </View>
  );
}

export const ElementIsotopeIonCard = memo(ElementIsotopeIonCardBase);
