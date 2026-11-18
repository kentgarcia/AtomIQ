/**
 * Decay chain: tap the unstable nucleus and it changes into the next one, until a stable
 * nucleus ends the chain (docs/UNIT_2_RADIOACTIVITY_SPEC.md §8). Generic labels only
 * (Parent, Daughter, Next generation), never real isotopes.
 */

import type { DecayChainData, DecayChainNode } from "./types.ts";

export interface DecayChainState {
  /** Index of the nucleus the learner is looking at. */
  index: number;
  /** Set to the message for the latest step. */
  message: string;
}

export const NOT_FINISHED = "It isn't finished yet.";
export const FINISHED = "Stable. The chain ends here.";

export const createChain = (): DecayChainState => ({ index: 0, message: "" });

export const currentNode = (nodes: DecayChainNode[], s: DecayChainState): DecayChainNode => nodes[Math.min(nodes.length - 1, s.index)];

/** The learner taps the current nucleus. An unstable one changes into the next; a stable one stays. */
export function step(nodes: DecayChainNode[], s: DecayChainState): DecayChainState {
  const here = currentNode(nodes, s);
  if (here.state === "stable" || s.index >= nodes.length - 1) return s;
  const index = s.index + 1;
  return { index, message: nodes[index].state === "stable" ? FINISHED : NOT_FINISHED };
}

export const goalMet = (nodes: DecayChainNode[], s: DecayChainState, goal: DecayChainData["goal"]): boolean => currentNode(nodes, s).id === goal.reach;

/** Problems with a card's data, as plain messages (used by the curriculum rules). */
export function checkDecayChainData(d: Partial<DecayChainData> | null | undefined): string[] {
  const errors: string[] = [];
  if (!d || typeof d !== "object") return ["data must be an object"];
  if (typeof d.task !== "string" || !d.task.trim()) errors.push("task is required");
  const nodes = d.nodes;
  if (!Array.isArray(nodes) || nodes.length < 3 || nodes.length > 6) {
    errors.push("nodes must be a list of 3 to 6 nuclei");
    return errors;
  }
  const ids = nodes.map((n) => n?.id);
  if (nodes.some((n) => typeof n?.id !== "string" || !n.id || typeof n?.label !== "string" || !n.label.trim())) errors.push("every node needs an id and a label");
  if (new Set(ids).size !== ids.length) errors.push("node ids must be unique");
  if (nodes.some((n) => n?.state !== "unstable" && n?.state !== "stable")) errors.push("a node's state must be unstable or stable");
  else {
    if (nodes[nodes.length - 1].state !== "stable") errors.push("the chain must end in a stable nucleus");
    if (nodes.slice(0, -1).some((n) => n.state !== "unstable")) errors.push("every nucleus before the end must be unstable, or the chain stops early");
  }
  if (d.goal?.reach !== ids[ids.length - 1]) errors.push("goal.reach must be the id of the last (stable) node");
  return errors;
}
