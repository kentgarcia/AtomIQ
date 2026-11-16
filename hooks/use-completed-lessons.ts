import { useCurriculumPath } from "@/hooks/use-curriculum";

/**
 * Number of lessons the learner has completed. Practice nodes and checkpoints are not
 * counted, and a lesson only counts while its unit is open, matching the Home map.
 *
 * Refreshes whenever the screen regains focus, so the number is current after
 * finishing a lesson on another tab.
 */
export function useCompletedLessonCount(): number {
  return useCurriculumPath().completedLessons;
}
