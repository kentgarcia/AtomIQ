import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PHONE_APPS } from "@/services/phone-core";
import { defaultLayout, sanitizeLayout, type PhoneLayout } from "@/services/phone-layout-core";
import { getPhoneLayout, setPhoneLayout, subscribePhoneLayout } from "@/services/storage";

export interface PhoneLayoutState {
  /** The home screen's arrangement: the saved one read back safely, the progression order until the learner arranges it. */
  layout: PhoneLayout;
  /** True once the saved arrangement has been read (the screen waits for it so icons do not jump). */
  loaded: boolean;
  /** Arrange: `change` gets the current layout and returns the new one. Saved at once. */
  update: (change: (layout: PhoneLayout) => PhoneLayout) => void;
  /** Back to the progression order. */
  reset: () => void;
}

/** The learner's arrangement of the phone's home screen. It follows a change made anywhere. */
export function usePhoneLayout(): PhoneLayoutState {
  const [raw, setRaw] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void getPhoneLayout()
      .then((value) => {
        if (!alive) return;
        setRaw(value);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    const stop = subscribePhoneLayout((value) => alive && setRaw(value));
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const layout = useMemo(() => sanitizeLayout(raw, PHONE_APPS), [raw]);
  // The newest layout, so two quick changes build on each other instead of the older one
  const latest = useRef(layout);
  useEffect(() => {
    latest.current = layout;
  }, [layout]);

  const update = useCallback((change: (l: PhoneLayout) => PhoneLayout) => {
    const next = change(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    void setPhoneLayout(next).catch(() => undefined);
  }, []);
  const reset = useCallback(() => {
    latest.current = defaultLayout(PHONE_APPS);
    void setPhoneLayout(null).catch(() => undefined);
  }, []);

  return { layout, loaded, update, reset };
}
