/**
 * The Camera's runtime (docs/PHONE_SPEC.md §9): binds `photos` to the user-state database and tells listeners when the gallery changed.
 * The rules are in `components/camera/photo-core.ts`. Nothing here uses the device camera or a permission, and nothing throws into a screen.
 */

import {
  createPhotoStore,
  type Photo,
  type PhotoConfig,
  type PhotosDb,
} from "@/components/camera/photo-core";
import { getDatabase } from "@/services/database";

const store = createPhotoStore(() => getDatabase() as unknown as PhotosDb);

type Listener = () => void;
const listeners = new Set<Listener>();

/** A photo was taken or deleted. */
export function subscribePhotos(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const changed = () =>
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never stops the others.
    }
  });

/** Every photo, newest first. Never rejects. */
export async function listPhotos(): Promise<Photo[]> {
  try {
    return await store.list();
  } catch (error) {
    console.warn("[camera] list", error);
    return [];
  }
}

/** Take a photo: save the composition. `full` when the gallery is at its cap; `error` when it could not be saved. Never rejects. */
export async function takePhoto(
  config: PhotoConfig,
): Promise<
  { ok: true; photo: Photo } | { ok: false; reason: "full" | "error" }
> {
  try {
    const now = Date.now();
    const id = `photo-${now}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const result = await store.add(id, config, now);
    if (result.ok) changed();
    return result;
  } catch (error) {
    console.warn("[camera] take", error);
    return { ok: false, reason: "error" };
  }
}

/** Delete one photo. Never rejects. */
export async function deletePhoto(id: string): Promise<boolean> {
  try {
    const done = await store.remove(id);
    if (done) changed();
    return done;
  } catch (error) {
    console.warn("[camera] delete", error);
    return false;
  }
}
