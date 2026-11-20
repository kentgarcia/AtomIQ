import { useEffect, useRef, type ComponentRef } from "react";
import type { View } from "react-native";

import { registerTarget } from "@/components/tutorial/target-registry";
import type { TargetId } from "@/services/tutorial-core";

/** What a ref to a `View` holds in this React Native version. */
export type ViewRef = ComponentRef<typeof View>;

/**
 * Declare a view the tour can light:
 *
 *   const lit = useTutorialTarget("tab.feed");
 *   <View ref={lit.ref} collapsable={false} .../>
 *
 * The overlay measures the view itself while its beat is up, so there is no `onLayout` to wire. `collapsable={false}`
 * keeps Android from flattening the view away, which would leave nothing to measure. Costs nothing while no beat points here.
 */
export function useTutorialTarget(id: TargetId, options: { radius?: number | "round"; scrollIntoView?: () => void } = {}) {
  const ref = useRef<ViewRef>(null);
  const { radius, scrollIntoView } = options;
  const scrollRef = useRef(scrollIntoView);
  useEffect(() => {
    scrollRef.current = scrollIntoView;
  }, [scrollIntoView]);
  useEffect(() => registerTarget(id, { get: () => ref.current, radius, scrollIntoView: () => scrollRef.current?.() }), [id, radius]);
  return { ref, collapsable: false as const };
}
