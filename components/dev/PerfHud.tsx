/**
 * A small readout on top of every screen while the probe's HUD is on (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4): UI frames
 * per second, JS frames per second, the share of slow UI frames, JS stalls and sound faults, and two buttons: Share (one tap: the
 * whole report goes to the share sheet, without leaving the screen being judged) and Probe (the probe screen). Holding the readout
 * shares too. Fixed colours on purpose (a measuring tool, not a screen): theme-allow.
 */
import { usePathname, useRouter } from "expo-router";
import { Pressable, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { verdict } from "./perf-core";
import { buildReport } from "./perf-report";
import { usePerfSnapshot } from "./perf-store";
import { cancelWalk } from "./perf-walk";
import { useWalk } from "./use-walk";
import { sfxDiag } from "@/services/sfx-diag";

// theme-allow: a developer measuring overlay, fixed colours so it reads on every screen and theme
const COLORS = { ok: "#7CE08A", close: "#FFD166", over: "#FF6B6B", bg: "rgba(0,0,0,0.72)", button: "rgba(255,255,255,0.18)", buttonText: "#FFFFFF" } as const;

const share = () => void Share.share({ message: buildReport() });

export function PerfHud() {
  const snap = usePerfSnapshot();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const startWalk = useWalk();
  if (!snap.hud) return null;
  const v = verdict(snap.ui);
  const faults = sfxDiag.faults();
  return (
    <View style={[BOX, { top: insets.top + 4 }]}>
      {/* Hold the readout to share too */}
      <Pressable onLongPress={share} delayLongPress={500} hitSlop={6}>
        <Text style={[TEXT, { color: COLORS[v] }]}>
          UI {snap.uiFps} · JS {snap.jsFps} · slow {(snap.ui.over12 * 100).toFixed(0)}% · stall {snap.jsStalls} · snd {faults}
        </Text>
      </Pressable>
      <View style={ROW}>
        <Pressable
          onPress={() => (snap.walk.running ? cancelWalk() : void startWalk())}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Walk through the app and share the report"
          style={BUTTON}
        >
          <Text style={BUTTON_TEXT}>{snap.walk.running ? `Stop ${snap.walk.done}/${snap.walk.total}` : "Auto-walk"}</Text>
        </Pressable>
        <Pressable onPress={share} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share the performance report" style={BUTTON}>
          <Text style={BUTTON_TEXT}>Share report</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (pathname !== "/dev-perf") router.push("/dev-perf");
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Open the performance probe"
          style={BUTTON}
        >
          <Text style={BUTTON_TEXT}>Probe</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Plain objects, not a StyleSheet: a measuring tool with fixed colours (EX-17), nothing to theme
const BOX = { position: "absolute", left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.bg, zIndex: 9999, gap: 4 } as const;
const TEXT = { fontSize: 11, fontFamily: "monospace", fontWeight: "700" } as const;
const ROW = { flexDirection: "row", gap: 6 } as const;
const BUTTON = { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: COLORS.button } as const;
const BUTTON_TEXT = { fontSize: 11, fontWeight: "800", color: COLORS.buttonText } as const;
