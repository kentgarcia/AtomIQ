/**
 * The performance probe screen (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4): UI and JS frame numbers against the budget
 * table, the sound engine in use, why each cue was or was not heard, two sound scripts to run on the real engine, and a
 * plain-text report to share out of the phone. Opened from the button beside Dev admin on Home (route `/dev-perf`).
 * Present in development builds only (see perf-flag.ts).
 *
 * How to use it on a device: docs/qa/PERF_AND_SOUND_PASS.md.
 */
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, View } from "react-native";

import { routeRows, verdict } from "@/components/dev/perf-core";
import { OUTCOME_ORDER as ORDER, buildReport, faultReasons } from "@/components/dev/perf-report";
import { resetPerf, setPerfSnapshot, usePerfSnapshot } from "@/components/dev/perf-store";
import { walkSeconds } from "@/components/dev/perf-walk-core";
import { cancelWalk } from "@/components/dev/perf-walk";
import { useWalk } from "@/components/dev/use-walk";
import { runSoundSelfTest, runSoundStress } from "@/components/dev/sfx-stress";
import { ScreenHeader, useHeaderBorder } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { simulateCrashOnNextStart } from "@/services/crash-guard";
import { getForceSpeedPage, setForceSpeedPage } from "@/services/speed-page-flag";
import { getSfxEngineInfo } from "@/services/sfx";
import { FAULT_OUTCOMES, sfxDiag } from "@/services/sfx-diag";
import { createStyles, fontFaces, useTheme } from "@/theme";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    container: { flex: 1, backgroundColor: c.background },
    body: { padding: 20, gap: 14 },
    title: { fontSize: 16, lineHeight: 21, ...fontFaces.heavy, color: c.text },
    line: { fontSize: 13, lineHeight: 19, ...fontFaces.medium, color: c.textSecondary },
    mono: { fontSize: 12, lineHeight: 17, fontFamily: "monospace", color: c.textSecondary },
    good: { color: c.success },
    warn: { color: c.warning },
    bad: { color: c.error },
    row: { flexDirection: "row", gap: 10 },
    cell: { flex: 1 },
  };
});

export function PerfProbe() {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const router = useRouter();
  const startWalk = useWalk();
  const { scrolled, onScroll, scrollEventThrottle } = useHeaderBorder();
  const snap = usePerfSnapshot();
  const [, setTick] = useState(0);
  const [running, setRunning] = useState<null | "stress" | "self-test">(null);
  const [forceSpeed, setForceSpeed] = useState(false);
  useEffect(() => {
    let alive = true;
    void getForceSpeedPage().then((on) => alive && setForceSpeed(on));
    return () => {
      alive = false;
    };
  }, []);

  // The sound log is not React state: look again every second
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const engine = getSfxEngineInfo();
  const counts = sfxDiag.counts();
  const faults = sfxDiag.faults();
  const v = verdict(snap.ui);
  const verdictStyle = v === "ok" ? styles.good : v === "close" ? styles.warn : styles.bad;
  const recent = sfxDiag.entries().slice(-20).reverse();
  const reasons = faultReasons();
  const rows = routeRows(snap.routes, snap.ui.budgetMs);

  const run = async (which: "stress" | "self-test") => {
    setRunning(which);
    try {
      await (which === "stress" ? runSoundStress() : runSoundSelfTest());
    } finally {
      setRunning(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Perf probe" subtitle="Frames and sound, measured" onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))} backLabel="Back" scrolled={scrolled} />
      <ScrollView onScroll={onScroll} scrollEventThrottle={scrollEventThrottle} contentContainerStyle={styles.body}>
        <Button
          label={snap.walk.running ? `Walking ${snap.walk.done}/${snap.walk.total}: press to stop` : `Auto-walk (about ${walkSeconds()} s, skips onboarding and the tour) and share`}
          onPress={() => (snap.walk.running ? cancelWalk() : void startWalk())}
        />
        <Button label="Share report" variant="secondary" onPress={() => void Share.share({ message: buildReport() })} />
        <Text style={styles.line}>One tap sends everything measured since the last Reset: the phone, the animation level, the screens you visited, the worst moments and the sound log. The HUD has the same button.</Text>
        <Card padding={14}>
          <Text style={styles.title}>Frames</Text>
          <Text style={[styles.line, verdictStyle]}>
            {v === "ok" ? "Within budget" : v === "close" ? "Close to the budget" : "Over the budget"} · {snap.ui.refreshHz} Hz display
          </Text>
          <Text style={styles.mono}>UI thread: {snap.uiFps} fps now, {snap.ui.frames} frames counted</Text>
          <Text style={styles.mono}>over 1.2x budget: {(snap.ui.over12 * 100).toFixed(1)}% (target under 5%)</Text>
          <Text style={styles.mono}>over 2x budget: {(snap.ui.over2 * 100).toFixed(2)}% (target under 0.5%)</Text>
          <Text style={styles.mono}>worst frame: {Math.round(snap.ui.worstMs)} ms</Text>
          <Text style={styles.mono}>JS thread: {snap.jsFps} fps now, {snap.jsStalls} stalls over 100 ms</Text>
          <Text style={styles.line}>Walk the screen you are judging, then come back. Reset before each screen of the scripted tour.</Text>
        </Card>

        <Card padding={14}>
          <Text style={styles.title}>By screen</Text>
          {rows.length === 0 ? <Text style={styles.line}>Nothing counted yet. Reset, then walk the screens.</Text> : null}
          {rows.map((row) => (
            <Text key={row.route} style={[styles.mono, row.hitches > 0 ? styles.bad : row.summary.over2 > 0.005 ? styles.warn : null]}>
              {row.route}: {(row.summary.over12 * 100).toFixed(0)}% slow, worst {Math.round(row.summary.worstMs)} ms, {row.hitches} over 100 ms
            </Text>
          ))}
          <Text style={styles.line}>Each half second of frames counts for the screen on show when it ends, so a hitch at a change can land on the new screen.</Text>
        </Card>

        <Card padding={14}>
          <Text style={styles.title}>Frames over 100 ms</Text>
          {snap.hitches.length === 0 ? <Text style={styles.line}>None.</Text> : null}
          {[...snap.hitches].reverse().slice(0, 12).map((h, i) => (
            <Text key={`${h.at}-${i}`} style={styles.mono}>
              {new Date(h.at).toISOString().slice(14, 23)} {h.route} · {Math.round(h.ms)} ms
            </Text>
          ))}
        </Card>

        <Card padding={14}>
          <Text style={styles.title}>Sound</Text>
          <Text style={styles.mono}>engine: {engine.backend}</Text>
          <Text style={styles.line}>{engine.reason}</Text>
          <Text style={styles.mono}>live: {engine.live} {engine.backend === "audio-api" ? "decoded files" : "native players"}</Text>
          <Text style={[styles.mono, faults > 0 ? styles.bad : styles.good]}>faults (lost or error): {faults}</Text>
          <Text style={styles.mono}>{ORDER.map((o) => `${o} ${counts[o]}`).join(" · ")}</Text>
          {reasons.map((r) => (
            <Text key={r} style={[styles.mono, styles.bad]}>
              {r}
            </Text>
          ))}
          <Text style={styles.line}>gate, skip-* and evicted are by design; lost and error are faults; late means a load or decode came first.</Text>
        </Card>

        <Card padding={14}>
          <Text style={styles.title}>Last 20 cues</Text>
          {recent.length === 0 ? <Text style={styles.line}>Nothing played yet.</Text> : null}
          {recent.map((e, i) => (
            <Text key={`${e.at}-${i}`} style={[styles.mono, FAULT_OUTCOMES.includes(e.outcome) ? styles.bad : e.outcome === "late" ? styles.warn : null]}>
              {e.cue} · {e.outcome}
              {e.ms ? ` ${e.ms} ms` : ""}
              {e.detail ? ` (${e.detail})` : ""}
            </Text>
          ))}
        </Card>

        <View style={styles.row}>
          <View style={styles.cell}>
            <Button label={snap.hud ? "Hide HUD" : "Show HUD"} variant="secondary" onPress={() => setPerfSnapshot({ hud: !snap.hud })} />
          </View>
          <View style={styles.cell}>
            <Button label="Reset" variant="secondary" onPress={() => { resetPerf(); sfxDiag.reset(); }} />
          </View>
        </View>
        <Button label={running === "stress" ? "Running…" : "Sound stress (3 s)"} variant="secondary" disabled={running !== null} onPress={() => void run("stress")} />
        <Button label={running === "self-test" ? "Running…" : "Sound self-test (9 s)"} variant="secondary" disabled={running !== null} onPress={() => void run("self-test")} />
        <Button label="Pretend the app crashed (prompt shows on next start)" variant="secondary" onPress={() => void simulateCrashOnNextStart()} />
        <Button
          label={forceSpeed ? "Onboarding animation page: ON (press to turn off)" : "Onboarding animation page: OFF (press to show it on this phone)"}
          variant="secondary"
          onPress={() => {
            const next = !forceSpeed;
            setForceSpeed(next);
            void setForceSpeedPage(next);
          }}
        />
        {forceSpeed ? <Text style={styles.line}>Onboarding shows the animation page right after Hello on this phone. To see it, reach onboarding again: Settings, Delete Account.</Text> : null}
      </ScrollView>
    </View>
  );
}
