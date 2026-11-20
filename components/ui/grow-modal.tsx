/**
 * GrowModal / GrowCard — a modal card that grows out of the control that
 * opened it and shrinks back into it on close (docs/features/CONTINUITY_SPEC.md, C10).
 *
 *   const opener = useModalOrigin();
 *   <Pressable ref={opener.anchor} onPress={() => opener.capture(() => setOpen(true))} />
 *   <GrowModal visible={open} origin={opener.origin} onRequestClose={close}>
 *     <View style={overlay}><GrowCard style={card}>…</GrowCard></View>
 *   </GrowModal>
 *
 * Callers keep toggling `visible` exactly as before. The modal stays mounted
 * while the card shrinks, then the system scrim fade finishes the close. The
 * card is opaque from the first frames. Reduced motion: a short fade only.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, type HostInstance, type ModalProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { DURATION, EASE_DRAWER } from "@/theme/motion";

export type Origin = { x: number; y: number; width: number; height: number };

/** Measures a control in window coordinates right before it opens something. */
export function useModalOrigin() {
  const ref = useRef<HostInstance>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const capture = useCallback((then: () => void) => {
    const node = ref.current;
    if (!node) {
      setOrigin(null);
      then();
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setOrigin(width > 0 && height > 0 ? { x, y, width, height } : null);
      then();
    });
  }, []);
  return { anchor: ref, origin, capture };
}

const GrowContext = createContext<{ progress: SharedValue<number>; origin: Origin | null } | null>(
  null,
);

export function GrowModal({
  visible,
  origin,
  children,
  ...modalProps
}: Omit<ModalProps, "visible" | "animationType" | "transparent"> & {
  visible: boolean;
  origin: Origin | null;
}) {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  if (visible && !mounted) setMounted(true);

  const hide = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      progress.value = withTiming(1, {
        duration: reducedMotion ? 150 : DURATION.sheet - 50,
        easing: EASE_DRAWER,
      });
    } else {
      progress.value = withTiming(
        0,
        { duration: reducedMotion ? 100 : DURATION.medium, easing: EASE_DRAWER },
        (finished) => {
          if (finished) runOnJS(hide)();
        },
      );
    }
  }, [visible, mounted, reducedMotion, progress, hide]);

  return (
    <Modal {...modalProps} visible={mounted} transparent animationType="fade">
      <GrowContext.Provider value={{ progress, origin }}>{children}</GrowContext.Provider>
    </Modal>
  );
}

export function GrowCard({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const ctx = useContext(GrowContext);
  const reducedMotion = useReducedMotion();
  const [box, setBox] = useState<Origin | null>(null);

  const animated = useAnimatedStyle(() => {
    if (!ctx) return {};
    const p = ctx.progress.value;
    if (reducedMotion) return { opacity: p };
    // No control to grow from: a small scale up from the centre
    if (!ctx.origin || !box) {
      return { opacity: box ? p : 0, transform: [{ scale: 0.94 + 0.06 * p }] };
    }
    const o = ctx.origin;
    const startScale = Math.min(1, Math.max(0.12, Math.max(o.width / box.width, o.height / box.height)));
    const dx = o.x + o.width / 2 - (box.x + box.width / 2);
    const dy = o.y + o.height / 2 - (box.y + box.height / 2);
    return {
      opacity: interpolate(p, [0, 0.12], [0, 1], "clamp"),
      transform: [
        { translateX: dx * (1 - p) },
        { translateY: dy * (1 - p) },
        { scale: startScale + (1 - startScale) * p },
      ],
    };
  });

  return (
    <Animated.View
      style={[style, animated]}
      onLayout={(e) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        setBox((prev) =>
          prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height
            ? prev
            : { x, y, width, height },
        );
      }}
    >
      {children}
    </Animated.View>
  );
}
