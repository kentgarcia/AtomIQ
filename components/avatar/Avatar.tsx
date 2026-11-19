/**
 * The learner's avatar: their drawn head and shoulders in the teachers' style (see `avatar-core.ts`),
 * on a pale round or rounded-square frame. Pass the stored `avatar_url` as `value`; anything that is not
 * an avatar reads as the default design.
 *
 * Still by default (`live` is false): avatars sit in headers and lists, where a loop clock per figure
 * would cost more than it gives. Decorative, hidden from screen readers: the name is always real text
 * beside it.
 */

import { memo, useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Npc } from "@/components/npc/Npc";
import { popLayout, type PoseId } from "@/components/npc/npc-art";

import { avatarBackground, avatarSpec, normalizeAvatar } from "./avatar-core";
import { PatternLayer } from "./PatternLayer";

export interface AvatarProps {
  /** The stored `user_profile.avatar_url`. */
  value?: string | null;
  /** Width and height in dp. */
  size?: number;
  /** Corner radius in dp. Default: a circle whose figure pops out at the top; give a radius for a cropped rounded square. */
  radius?: number;
  pose?: PoseId;
  /** Idle life (breathing, blinking). Default off. */
  live?: boolean;
  /** No frame: transparent and unclipped, for a figure standing on a banner that has its own background. */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Avatar = memo(function Avatar({ value, size = 44, radius, pose = "idle", live = false, bare = false, style }: AvatarProps) {
  const config = useMemo(() => normalizeAvatar(value), [value]);
  const spec = useMemo(() => avatarSpec(config), [config]);
  // A circle (no radius given) lets the top of the head pop out past its edge; a rounded square or a bare figure stays cropped.
  const pops = !bare && radius === undefined;
  if (pops) {
    const pop = popLayout(size);
    return (
      <View style={[{ width: size, height: size }, style]} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: "hidden", backgroundColor: avatarBackground(config) }]}>
          <PatternLayer pattern={config.pattern} tile={Math.max(24, Math.round(size / 2.2))} />
        </View>
        <Npc spec={spec} form="pop" size={pop.height} pose={pose} live={live} style={{ position: "absolute", left: pop.left, top: pop.top }} />
      </View>
    );
  }
  return (
    <View
      style={[
        bare ? { width: size, height: size } : { width: size, height: size, borderRadius: radius ?? size / 2, overflow: "hidden", backgroundColor: avatarBackground(config) },
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {bare ? null : <PatternLayer pattern={config.pattern} tile={Math.max(24, Math.round(size / 2.2))} />}
      <Npc spec={spec} form="avatar" size={size} pose={pose} live={live} />
    </View>
  );
});
