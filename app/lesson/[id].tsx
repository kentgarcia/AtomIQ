import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LessonFinish } from "@/components/lesson/LessonFinish";
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

type Stage = "preview" | "intro" | "run" | "finish";

interface Outcome {
  run: LessonRunResult;
  stars: 1 | 2 | 3;
  result: CompleteResult;
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = typeof id === "string" ? id : "";
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const { addXP, updateUserProfile } = useStorage();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>("preview");
  const [isReplay, setIsReplay] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [runKey, setRunKey] = useState(0);
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
        if (!cancelled) setLoaded({ content, node, unit, objectives });
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

  const start = useCallback(async () => {
    if (loaded?.node && !isReplay) {
      try {
        await updateLevelProgress(loaded.node.id, { status: "in_progress", unit_id: loaded.node.unitId, type: "lesson" });
      } catch (error) {
        console.error("Error marking lesson started:", error);
      }
    }
    sessionId.current = `lesson:${lessonId}:${Date.now()}`;
    // The first lesson with a teacher opens with their introduction.
    let met = true;
    if (teacher) {
      try {
        met = (await getMetTeachers()).includes(teacher.id);
      } catch {
        met = true;
      }
    }
    setStage(teacher && !met ? "intro" : "run");
  }, [isReplay, lessonId, loaded, teacher]);

  const meetTeacher = useCallback(() => {
    if (teacher) void markTeacherMet(teacher.id).catch(() => undefined);
    setStage("run");
  }, [teacher]);

  const finish = useCallback(
    async (run: LessonRunResult) => {
      if (!loaded) return;
      const stars = starsFor(run.summary);
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
      {stage === "run" ? <LessonRun key={runKey} cards={content.cards} surface="lesson" teacher={teacher ? { name: teacher.name, spec: teacher.spec } : null} onExit={exit} onFinish={finish} /> : null}
      {stage === "finish" && outcome ? (
        <LessonFinish
          title={isReplay ? "Practice complete!" : "Lesson complete!"}
          message={outcome.run.summary.replayed > 0 ? "You fixed the ones you missed. That is how it sticks." : "Clean run. Nicely done."}
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
            setRunKey((k) => k + 1);
            sessionId.current = `lesson:${lessonId}:${Date.now()}`;
            setStage("run");
          }}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}
