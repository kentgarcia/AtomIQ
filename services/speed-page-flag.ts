/**
 * The diagnostics switch for onboarding's animation page (`SpeedStep`, docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6b): while it
 * is on, the next onboarding shows the page whatever the phone (an iPhone or a fast Android never sees it otherwise). Set from the
 * perf probe; read once when onboarding opens. Reaching onboarding again means Delete Account.
 */
import { STORAGE_KEYS, getItem, setItem } from "@/services/storage";

export async function getForceSpeedPage(): Promise<boolean> {
  try {
    return (await getItem<boolean>(STORAGE_KEYS.FORCE_SPEED_PAGE)) === true;
  } catch {
    return false;
  }
}

export async function setForceSpeedPage(on: boolean): Promise<void> {
  try {
    await setItem(STORAGE_KEYS.FORCE_SPEED_PAGE, on);
  } catch {
    // A diagnostics switch: a failed write just leaves it as it was.
  }
}
