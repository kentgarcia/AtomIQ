/**
 * "Who reacted": a small sheet listing everyone who reacted to a post or blog piece, grouped by
 * reaction. Read only. The learner's own row says "You".
 *
 * Reads the stored reactions through `getReactors` of `services/feed.ts` (a read; nothing is
 * written here). `services/feed.ts` gives a summary of a target but not the list of reactors.
 */

import { useEffect, useState } from "react";
import { View } from "react-native";

import { NpcHead } from "@/components/feed/NpcHead";
import { ReactionGlyph } from "@/components/feed/ReactionGlyph";
import { groupReactors, REACTION_NAMES } from "@/components/feed/feed-ui-core";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import type { Reaction } from "@/content/types";
import { getReactors } from "@/services/feed";
import type { StoredReaction } from "@/services/feed-store";
import type { ReactionTargetType } from "@/services/feed";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    list: { gap: 14 },
    groupHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    groupName: { fontSize: 14, letterSpacing: 0.4, textTransform: "uppercase", ...fontFaces.heavy, color: c.textMuted },
    row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
    name: { flex: 1, fontSize: 16, ...fontFaces.bold, color: c.text },
    youDot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: withAlpha(c.primary, 0.14) },
    youLetter: { fontSize: 15, ...fontFaces.heavy, color: c.primaryLight },
    empty: { fontSize: 15, ...fontFaces.medium, color: c.textMuted },
  };
});

export interface ReactorsSheetProps {
  visible: boolean;
  target: { type: ReactionTargetType; id: string };
  cast: ReadonlyMap<string, Npc>;
  onClose: () => void;
}

export function ReactorsSheet({ visible, target, cast, onClose }: ReactorsSheetProps) {
  const styles = useStyles(useTheme().theme);
  const [rows, setRows] = useState<StoredReaction[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void getReactors(target.type, target.id)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [visible, target.type, target.id]);

  const groups = groupReactors((rows ?? []) as (StoredReaction & { reaction: Reaction })[]);

  return (
    <ModalDialog visible={visible} onClose={onClose} title="Reactions" closeLabel="Close reactions" maxWidth={420} dismissOnScrim bodyStyle={styles.list}>
      {rows && groups.length === 0 ? <Text style={styles.empty}>No reactions yet.</Text> : null}
      {groups.map((g) => (
        <View key={g.reaction}>
          <View style={styles.groupHead} accessible accessibilityRole="header" accessibilityLabel={`${REACTION_NAMES[g.reaction]}, ${g.rows.length}`}>
            <ReactionGlyph reaction={g.reaction} size={18} />
            <Text style={styles.groupName}>
              {REACTION_NAMES[g.reaction]} · {g.rows.length}
            </Text>
          </View>
          {g.rows.map((r) => {
            const isYou = r.actorType === "user";
            const npc = isYou ? null : cast.get(r.actorId);
            const name = isYou ? "You" : (npc?.name ?? "Someone");
            return (
              <View key={`${r.actorType}:${r.actorId}`} style={styles.row} accessible accessibilityLabel={`${name}, ${REACTION_NAMES[g.reaction]}`}>
                {isYou ? (
                  <View style={styles.youDot} accessible={false}>
                    <Text style={styles.youLetter}>You</Text>
                  </View>
                ) : (
                  <NpcHead npc={npc} size={40} />
                )}
                <Text style={styles.name}>{name}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </ModalDialog>
  );
}
