import { useEffect, useState } from "react";

import { OWN_WALLPAPER, type WallpaperChoice } from "@/components/phone/wallpaper-core";
import { getPhoneWallpaper, subscribePhoneWallpaper } from "@/services/storage";

/** The phone's wallpaper choice. It starts as the learner's own and follows a change made anywhere. */
export function usePhoneWallpaper(): WallpaperChoice {
  const [choice, setChoice] = useState<WallpaperChoice>(OWN_WALLPAPER);
  useEffect(() => {
    let alive = true;
    void getPhoneWallpaper()
      .then((c) => alive && setChoice(c))
      .catch(() => undefined);
    const stop = subscribePhoneWallpaper((c) => alive && setChoice(c));
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return choice;
}
