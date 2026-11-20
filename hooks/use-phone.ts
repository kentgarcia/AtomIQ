import { useCallback, useEffect, useMemo, useState } from "react";

import { deliverPendingChat, subscribeChats } from "@/services/chats";
import { subscribeFactsRead } from "@/services/daily-facts";
import {
  badgeFor,
  badgeLabel,
  newApps as pickNewApps,
  NO_PROGRESS,
  tabDot,
  unlockedApps,
  type Badge,
  type PhoneApp,
  type PhoneProgress,
  type PhoneSignals,
  type SeenApp,
} from "@/services/phone-core";
import { loadPhoneProgress, loadPhoneSignals, loadSeenApps, markAppOpened, markAppSeen, subscribePhone } from "@/services/phone";
import { subscribeOwned } from "@/services/shop";
import { getPhoneBadgesEnabled, subscribePhoneBadgesEnabled } from "@/services/storage";

export interface PhoneState {
  /** False until the first read finishes (the phone shows the starting apps meanwhile). */
  loaded: boolean;
  /** The apps the learner has, in grid order. */
  apps: PhoneApp[];
  /** Unlocked apps whose install moment has not played yet. */
  newApps: PhoneApp[];
  /** The corner mark of an app (null with the Settings switch off). */
  badgeOf: (app: PhoneApp) => Badge;
  /** Whether the learner has opened the app since it installed. */
  openedOf: (app: PhoneApp) => boolean;
  /** Counts up each time a read finishes, so a screen can wait for a read that started after it gained focus. */
  version: number;
  /** The accessibility label of an app's icon, badge included. */
  labelOf: (app: PhoneApp) => string;
  /** Whether the Phone tab shows its dot. */
  tabDot: boolean;
  /** Play an install moment's end: the app is seen (`opened` for the starting apps, which get no "New" dot). */
  markSeen: (appId: string, opened?: boolean) => void;
  /** The learner opened an app. */
  markOpened: (appId: string) => void;
  refresh: () => void;
}

const NO_SIGNALS: PhoneSignals = { dailyFactUnread: false, unreadChats: 0 };

/**
 * What the phone shows: the unlocked apps, the ones still to install, the badges and the tab's dot. It reads
 * the existing stores without screen hooks, so the tab bar can use it too; `refreshKey` (the tab bar passes the
 * focused tab) re-reads it when the learner moves around, which is when progress made elsewhere shows up.
 */
export function usePhone(refreshKey?: unknown): PhoneState {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<PhoneProgress>(NO_PROGRESS);
  const [signals, setSignals] = useState<PhoneSignals>(NO_SIGNALS);
  const [seen, setSeen] = useState<SeenApp[]>([]);
  const [badgesOn, setBadgesOn] = useState(true);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const [p, seenApps, on] = await Promise.all([loadPhoneProgress(), loadSeenApps(), getPhoneBadgesEnabled().catch(() => true)]);
    // A teacher's message may be earned by what was just read; deliver it first so the unread count below includes it
    await deliverPendingChat({ progress: p, seen: seenApps });
    const s = await loadPhoneSignals();
    setProgress(p);
    setSignals(s);
    setSeen(seenApps);
    setBadgesOn(on);
    setLoaded(true);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const reload = () => void load();
    const stops = [subscribePhone(reload), subscribeOwned(reload), subscribeFactsRead(reload), subscribeChats(reload), subscribePhoneBadgesEnabled(reload)];
    return () => stops.forEach((stop) => stop());
  }, [load]);

  const refresh = useCallback(() => void load(), [load]);

  const apps = useMemo(() => unlockedApps(progress), [progress]);
  const seenIds = useMemo(() => new Set(seen.map((s) => s.appId)), [seen]);
  const openedIds = useMemo(() => new Set(seen.filter((s) => s.opened).map((s) => s.appId)), [seen]);
  const newApps = useMemo(() => pickNewApps(apps, seenIds), [apps, seenIds]);
  // "New": installed (its moment played) and not opened yet. Apps still waiting to install wear the dot only via the tab.
  const isNew = useCallback((app: PhoneApp) => seenIds.has(app.id) && !openedIds.has(app.id), [seenIds, openedIds]);

  const badgeOf = useCallback((app: PhoneApp) => badgeFor(app.id, signals, { isNew: isNew(app), enabled: badgesOn }), [signals, isNew, badgesOn]);
  const labelOf = useCallback((app: PhoneApp) => badgeLabel(app, badgeOf(app)), [badgeOf]);

  const dot = useMemo(() => tabDot(signals, newApps.length + apps.filter(isNew).length, badgesOn), [signals, newApps.length, apps, isNew, badgesOn]);

  return {
    loaded,
    apps,
    newApps,
    badgeOf,
    labelOf,
    openedOf: useCallback((app: PhoneApp) => openedIds.has(app.id), [openedIds]),
    version,
    tabDot: dot,
    markSeen: useCallback((appId: string, opened?: boolean) => void markAppSeen(appId, opened), []),
    markOpened: useCallback((appId: string) => void markAppOpened(appId), []),
    refresh,
  };
}
