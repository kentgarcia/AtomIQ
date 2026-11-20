/**
 * The header of Chats. By default the app's usual plain header (page colour, theme text and icons) with the shared band row on it
 * (`band-header.tsx`): a bare back icon and a centred title with its count as a subtitle (`ChatButton`, `ChatTitle`). A conversation
 * passes a `cover` (the teacher's outfit colour and the pictures of what they teach, the same cover as their profile): it fills the
 * header and fades down into the page, and the icon and title take the colour that reads on it (`chat-palette.ts`).
 */

import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NpcCover } from "@/components/npc/NpcCover";
import { useTheme, withAlpha } from "@/theme";

import { chatPalette } from "./chat-palette";
import { BandButton, BandRow, BandTitle } from "./band-header";

/** The room under the controls row that the cover keeps while it fades into the page. */
const FADE = 20;

/** The colour of the controls on the header: the theme's text, or what reads on a cover. */
const InkContext = createContext<string | null>(null);

/** The back button: a bare icon. */
export function ChatButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const ink = useContext(InkContext);
  return <BandButton icon={icon} label={label} onPress={onPress} color={ink ?? theme.colors.text} />;
}

/** The title, with an optional count under it. */
export function ChatTitle({ children, subtitle }: { children: string; subtitle?: string }) {
  const { theme } = useTheme();
  const ink = useContext(InkContext);
  return <BandTitle title={children} subtitle={subtitle} color={ink ?? theme.colors.text} />;
}

export interface ChatCover {
  /** The teacher (picks the pictures); null for Shrodi, who has the default set. */
  npcId: string | null;
  outfit: { color: string; shade: string };
}

export function ChatFrame({ left, center, right, cover, children }: { left: ReactNode; center?: ReactNode; right?: ReactNode; cover?: ChatCover; children: ReactNode }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const page = theme.colors.mapBackground;
  const palette = cover ? chatPalette(cover.outfit) : null;
  const height = insets.top + 12 + 48 + FADE;
  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <StatusBar style={palette ? (palette.onIsLight ? "light" : "dark") : isDark ? "light" : "dark"} />
      <InkContext.Provider value={palette?.on ?? null}>
        {cover ? (
          <View style={{ zIndex: 2 }}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <NpcCover npcId={cover.npcId} outfit={cover.outfit} height={height} radius={0} />
              <LinearGradient pointerEvents="none" colors={[withAlpha(page, 0), withAlpha(page, 0.55), page]} locations={[(insets.top + 40) / height, (insets.top + 40 + (height - insets.top - 40) * 0.5) / height, 1]} style={StyleSheet.absoluteFill} />
            </View>
            <View style={{ paddingTop: insets.top + 12, height }}>
              <BandRow left={left} center={center} right={right} />
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: page, paddingTop: insets.top + 12, paddingBottom: 8, zIndex: 2 }}>
            <BandRow left={left} center={center} right={right} />
          </View>
        )}
      </InkContext.Provider>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
