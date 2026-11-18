import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "@/components/ui/text";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LessonFinish } from "@/components/lesson/LessonFinish";
import { ResumeLessonDialog } from "@/components/lesson/LessonDialogs";
import { LessonPreview } from "@/components/lesson/LessonPreview";
import { TeacherIntro } from "@/components/lesson/TeacherIntro";
import { useNpcForUnit, useNpcLine } from "@/components/npc/use-npc";
import { LessonRun, type LessonRunResult } from "@/components/lesson/LessonRun";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { LessonContent, Objective, PathNode, Unit } from "@/content/curriculum/types";
import { completeNode, type CompleteResult } from "@/services/curriculum-complete";
import { contentRepository } from "@/services/content-db";
import { getLevelProgress, updateLevelProgress } from "@/services/database";
import { getMetTeachers, markTeacherMet } from "@/services/storage";
import { starsFor } from "@/services/lesson-core";
import { contentKeyOf, runProgress, type RunState } from "@/services/lesson-progress-core";
import { clearLessonRun, loadLessonRun, saveLessonRun } from "@/services/lesson-runs";
import { useStorage } from "@/services/StorageContext";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing["2xl"], backgroundColor: theme.colors.background },
  message: { ...fontFaces.bold, fontSize: fontSizes["3xl"], color: theme.colors.text, textAlign: "center" },
}));

interface Loaded {
  content: LessonContent;
  node: PathNode | null;
  unit: Unit | null;
  objectives: Objective[];
}

/** "boot" is the plain page while an autostarted lesson loads: the Home map already showed the preview. */
type Stage = "boot" | "preview" | "intro" | "run" | "finish";

interface Outcome {
  run: LessonRunResult;
  stars: 1 | 2 | 3;
  result: CompleteResult;
}

export default function LessonScreen() {
  const { id, autostart, resume: resumeChoice } = useLocalSearchParams<{ id: string; autostart?: string; resume?: string }>();
  const lessonId = typeof id === "string" ? id : "";
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { addXP, updateUserProfile } = useStorage();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  // Opened from the preview on the Home map (autostart): straight into the lesson, no second preview
  const autostarted = autostart === "1";
  const [stage, setStage] = useState<Stage>(autostarted ? "boot" : "preview");
  const [isReplay, setIsReplay] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [runKey, setRunKey] = useState(0);
  // A lesson left half way: the saved run, and the one the learner chose to carry on from
  const [saved, setSaved] = useState<RunState | null>(null);
  const [resume, setResume] = useState<RunState | null>(null);
  const sessionId = useRef(`lesson:${lessonId}`);
  // The unit teacher signs off on the finish screen (hooks stay above the early returns).
  const teacher = useNpcForUnit(loaded?.unit?.id);
  const signOff = useNpcLine(teacher?.id, "sign_off");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const content = await contentRepository.getLessonContent(lessonId);
        if (!content) {
          if (!cancelled) setLoaded(null);
          return;
        }
        const [nodes, unit, objectives] = await Promise.all([
          contentRepository.getPathNodes(content.lesson.unitId),
          contentRepository.getUnitById(content.lesson.unitId),
          contentRepository.getObjectives(content.lesson.unitId),
        ]);
        const node = nodes.find((n) => n.lessonId === lessonId) ?? null;
        if (node) {
          const progress = (await getLevelProgress(node.id)) as { status?: string } | null;
          if (!cancelled) setIsReplay(progress?.status === "completed");
        }
        const savedRun = node ? await loadLessonRun(node.id, contentKeyOf(content.cards.map((c) => c.id))) : null;
        if (!cancelled) {
          setSaved(savedRun);
          setLoaded({ content, node, unit, objectives });
        }
      } catch (error) {
        console.error("Error loading lesson:", error);
        if (!cancelled) setLoaded(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const taught = useMemo(
    () => (loaded ? loaded.objectives.filter((o) => loaded.content.lesson.teaches.includes(o.id)) : []),
    [loaded],
  );

  const begin = useCallback(async (from: RunState | null) => {
    setResume(from);
    setRunKey((k) => k + 1);
    if (loaded?.node && !isReplay) {
      try {
        await updateLevelProgress(loaded.node.id, { status: "in_progress", unit_id: loaded.node.unitId, type: "lesson" });
      } catch (error) {
        console.error("Error marking lesson started:", error);
      }
    }
    sessionId.current = `lesson:${lessonId}:${Date.now()}`;
    // The first lesson with a teacher opens with their introduction (not when carrying on: they have met).
    let met = true;
    if (teacher && !from) {
      try {
        met = (await getMetTeachers()).includes(teacher.id);
      } catch {
        met = true;
      }
    }
    setStage(teacher && !met ? "intro" : "run");
  }, [isReplay, lessonId, loaded, teacher]);

  // A lesson left half way asks (a modal) whether to carry on or start again; a new one just starts.
  const [asking, setAsking] = useState(false);
  const start = useCallback(() => {
    if (!saved || !loaded?.node) {
      void begin(null);
      return;
    }
    setAsking(true);
  }, [begin, loaded, saved]);
  const continueSaved = useCallback(() => {
    setAsking(false);
    void begin(saved);
  }, [begin, saved]);
  const startAgain = useCallback(() => {
    setAsking(false);
    if (loaded?.node) void clearLessonRun(loaded.node.id);
    setSaved(null);
    void begin(null);
  }, [begin, loaded]);
  // Cancel stays on the preview, or goes back to the map when the preview was already shown there
  const cancelAsk = useCallback(() => {
    setAsking(false);
    if (autostarted) router.back();
  }, [autostarted, router]);

  // Each card passed is saved, so leaving the lesson (or the app closing) keeps the place
  const nodeId = loaded?.node?.id;
  const contentKey = useMemo(() => (loaded ? contentKeyOf(loaded.content.cards.map((c) => c.id)) : ""), [loaded]);
  const onProgress = useCallback(
    (state: RunState) => {
      if (nodeId) void saveLessonRun(nodeId, lessonId, contentKey, state);
    },
    [contentKey, lessonId, nodeId],
  );

  const meetTeacher = useCallback(() => {
    if (teacher) void markTeacherMet(teacher.id).catch(() => undefined);
    setStage("run");
  }, [teacher]);

  const finish = useCallback(
    async (run: LessonRunResult) => {
      if (!loaded) return;
      const stars = starsFor(run.summary);
      // Finished: nothing left to resume
      if (loaded.node) void clearLessonRun(loaded.node.id);
      setSaved(null);
      let result: CompleteResult = { firstCompletion: false, xpAwarded: 0 };
      try {
        if (loaded.node) {
          result = await completeNode({
            node: loaded.node,
            lesson: loaded.content.lesson,
            stars,
            xp: loaded.content.lesson.xpReward,
            passed: true,
            sessionId: sessionId.current,
            answers: run.answers,
            addXP,
            updateUserProfile,
          });
        }
      } catch (error) {
        console.error("Error saving lesson progress:", error);
      }
      setOutcome({ run, stars, result });
      setStage("finish");
    },
    [addXP, loaded, updateUserProfile],
  );

  const exit = useCallback(() => router.back(), [router]);

  // Autostart: once the lesson has loaded, begin without showing the preview. The Home map already asked
  // about a saved run (`resume` = continue or again); without an answer the lesson screen asks itself.
  const autostartedRef = useRef(false);
  useEffect(() => {
    if (!autostarted || autostartedRef.current || loading || !loaded) return;
    autostartedRef.current = true;
    if (resumeChoice === "continue") void begin(saved);
    else if (resumeChoice === "again") startAgain();
    else start();
  }, [autostarted, loading, loaded, start, begin, saved, startAgain, resumeChoice]);

  // Never leave the learner on the blank page: if nothing has started a moment after the lesson loaded
  // (a dialog that did not show, a step that failed), fall back to the lesson's own preview
  useEffect(() => {
    if (stage !== "boot" || loading) return;
    const timer = setTimeout(() => setStage((s) => (s === "boot" ? "preview" : s)), 2500);
    return () => clearTimeout(timer);
  }, [stage, loading]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Icon name="Danger" size={64} color={theme.colors.error} />
        <Text style={styles.message}>Lesson not found</Text>
        <Button label="Go back" onPress={exit} fullWidth={false} />
      </View>
    );
  }

  const { content, unit } = loaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {stage === "boot" ? <View style={{ flex: 1, backgroundColor: theme.colors.background }} /> : null}
      <ResumeLessonDialog visible={asking} percent={saved ? Math.round(runProgress(saved.run) * 100) : 0} onContinue={continueSaved} onStartAgain={startAgain} onCancel={cancelAsk} />
      {stage === "preview" ? (
        <LessonPreview
          lesson={content.lesson}
          unit={unit}
          objectives={taught}
          referenceCount={content.references.length}
          cardCount={content.cards.filter((c) => c.tier === "core").length}
          isReplay={isReplay}
          onClose={exit}
          onProceed={start}
        />
      ) : null}
      {stage === "intro" && teacher ? <TeacherIntro npc={teacher} onClose={exit} onContinue={meetTeacher} /> : null}
      {stage === "run" ? <LessonRun key={runKey} cards={content.cards} surface="lesson" teacher={teacher ? { name: teacher.name, spec: teacher.spec } : null} onExit={exit} onFinish={finish} resume={resume} onProgress={nodeId ? onProgress : undefined} /> : null}
      {stage === "finish" && outcome ? (
        <LessonFinish
          title={isReplay ? "Practice complete!" : "Lesson complete!"}
          passed
          stars={outcome.stars}
          xp={outcome.result.xpAwarded}
          accuracy={outcome.run.summary.accuracy}
          durationMs={outcome.run.durationMs}
          objectives={taught}
          references={content.references}
          teacher={teacher && signOff ? { name: teacher.name, spec: teacher.spec, text: signOff.text } : null}
          onContinue={exit}
          onRetry={() => {
            setOutcome(null);
            setIsReplay(true);
            setResume(null);
            setRunKey((k) => k + 1);
            sessionId.current = `lesson:${lessonId}:${Date.now()}`;
            setStage("run");
          }}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}
