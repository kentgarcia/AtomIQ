import { useEffect, useState } from "react";

import type { Photo } from "@/components/camera/photo-core";
import { listPhotos, subscribePhotos } from "@/services/photos";

/** The gallery, newest first; it follows new and deleted photos. */
export function usePhotos(): { photos: Photo[]; loaded: boolean } {
  const [state, setState] = useState<{ photos: Photo[]; loaded: boolean }>({
    photos: [],
    loaded: false,
  });
  useEffect(() => {
    let alive = true;
    const load = () =>
      void listPhotos().then((photos) => {
        if (alive) setState({ photos, loaded: true });
      });
    load();
    const stop = subscribePhotos(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return state;
}
