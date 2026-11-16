/**
 * Item-bank sessions. The route id selects the session:
 *   <node id>          a practice node or checkpoint on the path
 *   testout:<unit id>  skip a unit by passing a checkpoint-style test
 *   review             the daily review of objectives that are due
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LessonFinish } from "@/components/lesson/LessonFinish";
import { LessonRun, type LessonRunResult } from "@/components/lesson/LessonRun";
import { useNpcForUnit } from "@/components/npc/use-npc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { Objective, PathNode, ResolvedCard, Item } from "@/content/curriculum/types";
import { completeNode, completeTestOut } from "@/services/curriculum-complete";
import { loadDueObjectives, recordAnswers } from "@/services/curriculum-progress";
import { contentRepository } from "@/services/content-db";
import { starsFor } from "@/services/lesson-core";
import { pickItems, pickReviewItems } from "@/services/session-core";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing["2xl"], backgroundColor: theme.colors.background },
  message: { ...fontFaces.bold, fontSize: fontSizes["3xl"], color: theme.colors.text, textAlign: "center" },
  sub: { ...fontFaces.book, fontSize: fontSizes["2xl"], color: theme.colors.textSecondary, textAlign: "center" },
}));

const XP = { practice: 20, checkpoint: 60 } as const;
const DEFAULTS = { practice: { count: 8, pass: 0 }, checkpoint: { count: 12, pass: 0.8 }, testout: { count: 15, pass: 0.85 }, review: { count: 8, pass: 0 } } as const;

type Kind = "practice" | "checkpoint" | "testout" | "review";

interface Session {
  kind: Kind;
  title: string;
  node?: PathNode;
  unitId?: string;
  items: Item[];
  objectives: Objective[];
  passMark: number;
}

const toCards = (items: Item[], key: string): ResolvedCard[] =>
  items.map((item, i) => ({ id: `q${i + 1}`, lessonId: key, position: i, kind: "item", type: "item", tier: "core", itemId: item.id, scored: true, data: {}, item }));

async function loadSession(id: string, seed: string): Promise<Session | null> {
  const repo = contentRepository;
  if (id === "review") {
    const due = await loadDueObjectives(6);
    if (due.length === 0) return { kind: "review", title: "Daily review", items: [], objectives: [], passMark: 0 };
    const pool = await repo.getItems({ objectiveIds: due, surface: "review" });
    const items = pickReviewItems(due, pool, { count: DEFAULTS.review.count, seed });
    const objectives = (await repo.getObjectives()).filter((o) => due.includes(o.id));
    return { kind: "review", title: "Daily review", items, objectives, passMark: 0 };
  }

  const [units, allNodes, allObjectives, lessons] = await Promise.all([repo.getUnits(), repo.getPathNodes(), repo.getObjectives(), repo.getLessons()]);

  if (id.startsWith("testout:")) {
    const unitId = id.slice("testout:".length);
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return null;
    const objectives = allObjectives.filter((o) => o.unitId === unitId);
    const pool = await repo.getItems({ objectiveIds: objectives.map((o) => o.id), surface: "checkpoint" });
    const items = pickItems(pool, { count: DEFAULTS.testout.count, seed, coverObjectives: objectives.map((o) => o.id) });
    return { kind: "testout", title: `Test out: ${unit.title}`, unitId, items, objectives, passMark: DEFAULTS.testout.pass };
  }

  const node = allNodes.find((n) => n.id === id);
  if (!node || node.kind === "lesson") return null;
  const unit = units.find((u) => u.id === node.unitId);
  const unitObjectives = allObjectives.filter((o) => o.unitId === node.unitId);
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const taughtSoFar = new Set(
    allNodes
      .filter((n) => n.unitId === node.unitId && n.kind === "lesson" && n.position < node.position)
      .flatMap((n) => (n.lessonId ? (lessonById.get(n.lessonId)?.teaches ?? []) : [])),
  );
  const objectives = node.kind === "checkpoint" || taughtSoFar.size === 0 ? unitObjectives : unitObjectives.filter((o) => taughtSoFar.has(o.id));
  const pool = await repo.getItems({ objectiveIds: objectives.map((o) => o.id), surface: node.kind });

  const unitPos = unit?.position ?? 1;
  const earlierObjectives = allObjectives.filter((o) => (units.find((u) => u.id === o.unitId)?.position ?? 0) < unitPos);
  const earlierPool = earlierObjectives.length ? await repo.getItems({ objectiveIds: earlierObjectives.map((o) => o.id), surface: "practice" }) : [];

  const defaults = node.kind === "checkpoint" ? DEFAULTS.checkpoint : DEFAULTS.practice;
  const items = pickItems(pool, {
    count: node.config.questionCount ?? defaults.count,
    seed,
    earlierPool,
    earlierShare: node.config.earlierShare ?? 0,
    ...(node.kind === "checkpoint" ? { coverObjectives: objectives.map((o) => o.id) } : {}),
  });
  return {
    kind: node.kind,
    title: node.kind === "checkpoint" ? `Checkpoint: ${unit?.title ?? ""}` : "Practice",
    node,
    unitId: node.unitId,
    items,
    objectives,
    passMark: node.config.passMark ?? defaults.pass,
  };
}

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionKey = typeof id === "string" ? id : "";
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { addXP, updateUserProfile } = useStorage();

  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<{ run: LessonRunResult; passed: boolean; xp: number } | null>(null);
  const sessionId = useRef("");
  // The unit's teacher asks the questions (a review across units has none, so cards stay plain).
  const teacher = useNpcForUnit(session?.unitId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDone(null);
    const seed = `${sessionKey}:${attempt}:${Date.now()}`;
    sessionId.current = `${sessionKey}:${seed}`;
    loadSession(sessionKey, seed)
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((error) => {
        console.error("Error building session:", error);
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionKey, attempt]);

  const cards = useMemo(() => (session ? toCards(session.items, sessionKey) : []), [session, sessionKey]);
  const exit = useCallback(() => router.back(), [router]);

  const finish = useCallback(
    async (run: LessonRunResult) => {
      if (!session) return;
      const passed = run.summary.accuracy >= session.passMark;
      let xp = 0;
      try {
        if (session.kind === "testout" && session.unitId) {
          await completeTestOut({ unitId: session.unitId, objectiveIds: session.objectives.map((o) => o.id), sessionId: sessionId.current, answers: run.answers, passed });
        } else if (session.node) {
          const result = await completeNode({
            node: session.node,
            stars: starsFor(run.summary),
            xp: XP[session.node.kind === "checkpoint" ? "checkpoint" : "practice"],
            passed,
            sessionId: sessionId.current,
            answers: run.answers,
            addXP,
            updateUserProfile,
          });
          xp = result.xpAwarded;
        } else {
          await recordAnswers(sessionId.current, run.answers);
        }
      } catch (error) {
        console.error("Error saving session:", error);
      }
      setDone({ run, passed, xp });
    },
    [addXP, session, updateUserProfile],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Icon name="Danger" size={64} color={theme.colors.error} />
        <Text style={styles.message}>Session not found</Text>
        <Button label="Go back" onPress={exit} fullWidth={false} />
      </View>
    );
  }

  if (session.items.length === 0) {
    return (
      <View style={styles.center}>
        <Icon name="TickCircle" size={64} color={theme.colors.success} />
        <Text style={styles.message}>{session.kind === "review" ? "Nothing to review yet" : "No questions available"}</Text>
        <Text style={styles.sub}>{session.kind === "review" ? "Finish a lesson and your review will build up here." : "This session has no questions yet."}</Text>
        <Button label="Go back" onPress={exit} fullWidth={false} />
      </View>
    );
  }

  if (done) {
    const passed = done.passed;
    const isTest = session.kind === "checkpoint" || session.kind === "testout";
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LessonFinish
          title={passed ? (session.kind === "testout" ? "Unit skipped!" : isTest ? "Checkpoint passed!" : "Practice complete!") : "Not yet"}
          message={passed ? "Your answers will come back in your daily review." : "You need a little more practice. Revisit the lessons, then try again."}
          passed={passed}
          stars={starsFor(done.run.summary)}
          xp={done.xp}
          accuracy={done.run.summary.accuracy}
          durationMs={done.run.durationMs}
          objectives={passed ? session.objectives : []}
          references={[]}
          onContinue={exit}
          onRetry={isTest || session.kind === "practice" ? () => setAttempt((a) => a + 1) : undefined}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LessonRun key={attempt} cards={cards} surface={session.kind === "review" ? "review" : session.kind === "practice" ? "practice" : "checkpoint"} label={session.title} kind={session.kind} teacher={teacher ? { name: teacher.name, spec: teacher.spec } : null} onExit={exit} onFinish={finish} />
    </GestureHandlerRootView>
  );
}
