/**
 * How an item type is checked, as one pure rule shared by the lesson runner and its tests.
 *
 *  - "instant": a single tap is the whole answer (choice, myth or fact, hotspot, a word-bank blank).
 *    It is graded the moment it is tapped; a wrong one shows the right answer and the card comes
 *    back in the mistakes replay.
 *  - "retry": the answer is built in several steps (match, order, sort). Order and sort are graded the
 *    moment the last piece is placed; a wrong attempt shakes and resets so the learner can try again in
 *    place. A match is checked pair by pair: a right pair locks green at once, a wrong one shakes red and
 *    both cards go back to normal (`onMiss` tells the run). Either way the card still comes back in the
 *    mistakes replay until it is done with no wrong attempt.
 *  - "manual": the learner has to say when they are done (a typed number, a slider), because the
 *    answer is not final until then; these keep the Check button. Predictions are never graded.
 */

export type CheckMode = "instant" | "retry" | "manual";

export function checkModeOf(type: string, data: Record<string, unknown>): CheckMode {
  switch (type) {
    case "choice":
    case "true_or_myth":
    case "hotspot":
      return "instant";
    case "fill":
      return data.mode === "bank" ? "instant" : "manual";
    case "order":
    case "match":
    case "sort":
      return "retry";
    default:
      return "manual";
  }
}
