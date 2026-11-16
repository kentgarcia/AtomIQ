/**
 * Path state: which nodes are done, current, available or locked, and which units
 * are open. Pure and framework-free (spec §5, §7.4).
 *
 * Rules:
 *  - Inside an open unit the path is sequential: the first node not yet completed is
 *    the current one and everything after it is locked.
 *  - A unit is complete when its checkpoint is completed or the learner tested out of it.
 *  - A unit opens when the unit before it is complete, or when the learner tested out of
 *    it (test-out is offered on locked units too). The first unit is always open.
 *  - Once a unit is complete (even by testing out) its remaining nodes can be played
 *    freely: they are `available`.
 */

export type NodeStatus = "completed" | "current" | "available" | "locked";

export interface PathUnitInput {
  id: string;
  position: number;
}

export interface PathNodeInput {
  id: string;
  unitId: string;
  position: number;
  kind: "lesson" | "practice" | "checkpoint";
}

export interface UnitState {
  unlocked: boolean;
  completed: boolean;
  testedOut: boolean;
  completedNodes: number;
  totalNodes: number;
}

export interface PathState {
  nodes: Record<string, NodeStatus>;
  units: Record<string, UnitState>;
  /** The node the learner should play next, or null when everything is complete. */
  currentNodeId: string | null;
}

export function computePathState(
  units: PathUnitInput[],
  nodes: PathNodeInput[],
  completedNodeIds: ReadonlySet<string>,
  testedOutUnitIds: ReadonlySet<string> = new Set(),
): PathState {
  const orderedUnits = [...units].sort((a, b) => a.position - b.position);
  const nodeStatus: Record<string, NodeStatus> = {};
  const unitState: Record<string, UnitState> = {};
  let currentNodeId: string | null = null;
  let previousComplete: boolean = true;

  for (const unit of orderedUnits) {
    const unitNodes = nodes.filter((n) => n.unitId === unit.id).sort((a, b) => a.position - b.position);
    const checkpoints = unitNodes.filter((n) => n.kind === "checkpoint");
    const testedOut = testedOutUnitIds.has(unit.id);
    const completedNodes = unitNodes.filter((n) => completedNodeIds.has(n.id)).length;
    const completed: boolean =
      testedOut ||
      (checkpoints.length > 0
        ? checkpoints.every((n) => completedNodeIds.has(n.id))
        : unitNodes.length > 0 && completedNodes === unitNodes.length);
    const unlocked: boolean = previousComplete || testedOut;

    let foundCurrent = false;
    for (const node of unitNodes) {
      if (!unlocked) nodeStatus[node.id] = "locked";
      else if (completedNodeIds.has(node.id)) nodeStatus[node.id] = "completed";
      else if (completed) nodeStatus[node.id] = "available";
      else if (!foundCurrent) {
        nodeStatus[node.id] = "current";
        foundCurrent = true;
        if (currentNodeId === null) currentNodeId = node.id;
      } else nodeStatus[node.id] = "locked";
    }

    unitState[unit.id] = { unlocked, completed, testedOut, completedNodes, totalNodes: unitNodes.length };
    previousComplete = unlocked && completed;
  }

  return { nodes: nodeStatus, units: unitState, currentNodeId };
}

/** Number of lesson nodes the learner has completed in open units. */
export function countCompletedLessons(
  nodes: PathNodeInput[],
  state: PathState,
): number {
  return nodes.filter((n) => n.kind === "lesson" && state.nodes[n.id] === "completed").length;
}
