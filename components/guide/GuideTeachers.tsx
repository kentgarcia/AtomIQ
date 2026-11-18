/**
 * GuideTeachers — the "Teachers" section of the Guide landing: the cast, one flat row each (head,
 * name, what they teach, a chevron). A row opens the Meet sheet with the teacher's bio and the
 * lessons of their unit. A teacher whose unit is still locked is shown muted (cool pastels), as on
 * the path. Same frame as the rest of the landing: a heading over rows split by dashed lines.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { MeetSheet } from "@/components/npc/MeetSheet";
import { Npc as NpcView } from "@/components/npc/Npc";
import { NPC_ROSTER } from "@/components/npc/npc-roster";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getAllNpcs, type Npc } from "@/content/npcs";
import { useCurriculumPath } from "@/hooks/use-curriculum";
import { createStyles, fontFaces, useTheme } from "@/theme";

export function GuideTeachers() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const c = theme.colors;
  const { data, state } = useCurriculumPath();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getAllNpcs()
      .then((list) => alive && setNpcs(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  /** The unit a teacher owns: the content database first, the roster as the fallback. */
  const unitOf = (npc: Npc) =>
    data.units.find((u) => u.teacherNpcId === npc.id) ?? data.units.find((u) => u.id === NPC_ROSTER.find((r) => r.id === npc.id)?.unitId);

  const open = npcs.find((n) => n.id === openId) ?? null;
  const openUnit = open ? unitOf(open) : undefined;
  const openLocked = openUnit ? !(state.units[openUnit.id]?.unlocked ?? false) : false;
  /** The unit's lesson titles in path order */
  const openLessons = useMemo(() => {
    if (!openUnit) return [];
    const byId = new Map(data.lessons.map((l) => [l.id, l.title]));
    return data.nodes
      .filter((n) => n.unitId === openUnit.id && n.lessonId)
      .sort((a, b) => a.position - b.position)
      .map((n) => byId.get(n.lessonId as string))
      .filter((t): t is string => Boolean(t));
  }, [data.lessons, data.nodes, openUnit]);

  if (npcs.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Teachers
        </Text>
        <Text style={styles.sub}>Meet the people behind each unit and what they teach.</Text>
      </View>
      <View>
        {npcs.map((npc, i) => {
          const unit = unitOf(npc);
          const locked = unit ? !(state.units[unit.id]?.unlocked ?? false) : false;
          return (
            <Pressable
              key={npc.id}
              onPress={() => setOpenId(npc.id)}
              accessibilityRole="button"
              accessibilityLabel={`${npc.name}, ${npc.title}. ${unit ? `Teaches ${unit.title}. ` : ""}Opens their profile.`}
              style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.pressed]}
            >
              <View style={styles.face} accessible={false} importantForAccessibility="no-hide-descendants">
                <NpcView spec={npc.spec} form="head" size={56} muted={locked} live={false} />
              </View>
              <View style={styles.text}>
                <Text style={styles.name}>{npc.name}</Text>
                <Text style={styles.role} numberOfLines={1}>
                  {npc.title}
                </Text>
                {unit ? (
                  <Text style={styles.teaches} numberOfLines={1}>
                    {locked ? "Unlocks with " : "Teaches "}
                    {unit.title}
                  </Text>
                ) : null}
              </View>
              <Icon name={locked ? "Lock" : "ArrowRight2"} size={18} color={c.textMuted} variant="Bold" />
            </Pressable>
          );
        })}
      </View>
      <MeetSheet npc={open} visible={open !== null} lessons={openLessons} locked={openLocked} onClose={() => setOpenId(null)} />
    </View>
  );
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    /* Inset like the info card's inner padding, so the heading and rows line up with the card's content */
    section: { gap: 12, paddingHorizontal: 16 },
    head: { gap: 2 },
    title: { fontSize: 20, ...fontFaces.heavy, color: c.text },
    sub: { fontSize: 14, lineHeight: 20, ...fontFaces.medium, color: c.textSecondary },
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72 },
    divided: { borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border, paddingTop: 12, marginTop: 12 },
    pressed: { opacity: 0.6 },
    face: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSoft },
    text: { flex: 1, gap: 1 },
    name: { fontSize: 16, ...fontFaces.heavy, color: c.text },
    role: { fontSize: 13, lineHeight: 18, ...fontFaces.semibold, color: c.textSecondary },
    teaches: { fontSize: 13, lineHeight: 18, ...fontFaces.regular, color: c.textMuted },
  };
});
