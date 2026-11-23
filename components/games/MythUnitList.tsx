/**
 * The units a Myth Buster Quick Play can be played on, as rows: used by Myth Buster's start screen.
 * A unit with no statements yet is greyed out and says "Coming soon".
 */

import { unitPalette, teacherPalette } from "@/components/path/unit-theme";
import { useUnitBrands } from "@/components/npc/use-unit-brands";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Unit } from "@/content/curriculum/types";
import { getUnitStatements } from "@/content/myths/unit-statements";
import { contentRepository } from "@/services/content-db";
import { createStyles, fontFaces, useTheme } from "@/theme";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

/** The units in order, and how many statements each has. Loads when `enabled`. */
export function useMythUnits(enabled: boolean): { units: Unit[]; deckSizes: Record<string, number> } {
  const [units, setUnits] = useState<Unit[]>([]);
  const [deckSizes, setDeckSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void Promise.all([contentRepository.getUnits(), getUnitStatements()]).then(([all, statements]) => {
      if (cancelled) return;
      const sizes: Record<string, number> = {};
      for (const st of statements) sizes[st.unitId] = (sizes[st.unitId] ?? 0) + 1;
      setUnits([...all].sort((a, b) => a.position - b.position));
      setDeckSizes(sizes);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return { units, deckSizes };
}

export function MythUnitRows({ units, deckSizes, onPick }: { units: Unit[]; deckSizes: Record<string, number>; onPick: (unit: Unit) => void }) {
  const { theme, isDark } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const brands = useUnitBrands();
  return (
    <View>
      {units.map((unit, i) => {
        const count = deckSizes[unit.id] ?? 0;
        const ready = count > 0;
        const brand = brands.get(unit.position);
        const face = brand ? teacherPalette(brand, theme.colors.lessonHeaderText, isDark).face : unitPalette(theme.colors, unit.position, isDark).face;
        return (
          <Pressable
            key={unit.id}
            disabled={!ready}
            onPress={() => onPick(unit)}
            accessibilityRole="button"
            accessibilityLabel={`${unit.title}, ${ready ? `${count} statements` : "coming soon"}`}
            style={({ pressed }) => [s.row, i > 0 && s.divided, !ready && s.rowOff, pressed && s.rowPressed]}
          >
            <View style={[s.icon, { backgroundColor: face }]}>
              <Icon name={unit.icon || "Book"} size={20} color={theme.colors.onPrimary} variant="Bold" />
            </View>
            <View style={s.copy}>
              <Text style={s.title} numberOfLines={2}>
                Unit {unit.position}: {unit.title}
              </Text>
              <Text style={s.sub}>{ready ? `${count} statements` : "Coming soon"}</Text>
            </View>
            {ready ? (
              <View style={s.arrow}>
                <Icon name="ArrowRight2" size={16} color={theme.colors.onPrimary} variant="Bold" />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
    rowOff: { opacity: 0.5 },
    rowPressed: { opacity: 0.6 },
    icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    copy: { flex: 1, gap: 2 },
    title: { fontSize: 16, ...fontFaces.heavy, color: c.text },
    sub: { fontSize: 13, ...fontFaces.medium, color: c.textMuted },
    arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" },
    hint: { fontSize: 15, lineHeight: 22, ...fontFaces.semibold, color: c.textMuted },
  };
});
