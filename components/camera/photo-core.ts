/**
 * The phone's Camera (docs/PHONE_SPEC.md §9): a photo mode for the learner's own character. No device camera is used. A photo is
 * saved as its COMPOSITION (a scene, who stands beside the learner, the poses, a frame and the avatar's saved string), not as
 * pixels, so it stays tiny, private on the device and crisp at any size. Framework-free and tested (`test:photo`).
 */

export const PHOTO_SCENES = ["meadow", "night", "lab", "stage"] as const;
export type PhotoSceneId = (typeof PHOTO_SCENES)[number];

/** The poses the figures already have, the ones that read well in a picture. */
export const PHOTO_POSES = [
  "idle",
  "greet",
  "cheer",
  "proud",
  "think",
] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

export const PHOTO_FRAMES = ["none", "white", "sun", "ink"] as const;
export type PhotoFrame = (typeof PHOTO_FRAMES)[number];

/** Companion ids: `null` stands alone, `shrodi` the mascot, anything else a teacher's id. */
export const SHRODI_ID = "shrodi";

/** The gallery holds this many photos; at the cap the shutter says so and nothing is removed silently. */
export const PHOTO_CAP = 100;

export interface PhotoConfig {
  v: 1;
  scene: PhotoSceneId;
  companion: string | null;
  pose: PhotoPose;
  companionPose: PhotoPose;
  frame: PhotoFrame;
  /** The learner's `user_profile.avatar_url` at the time (`avatar:v1:...`), kept so the photo shows the avatar they had. */
  avatar: string;
}

export const DEFAULT_PHOTO: PhotoConfig = {
  v: 1,
  scene: "meadow",
  companion: null,
  pose: "greet",
  companionPose: "greet",
  frame: "none",
  avatar: "",
};

const pick = <T extends string>(
  list: readonly T[],
  v: unknown,
  fallback: T,
): T =>
  typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : fallback;

/** A stored photo's composition, read back safely: an unknown scene, pose or frame falls back, anything else that is not a photo is null. */
export function parsePhotoConfig(raw: unknown): PhotoConfig | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const r = value as Record<string, unknown>;
  if (r.v !== 1) return null;
  const companion =
    typeof r.companion === "string" &&
    r.companion.length > 0 &&
    r.companion.length <= 64
      ? r.companion
      : null;
  return {
    v: 1,
    scene: pick(PHOTO_SCENES, r.scene, DEFAULT_PHOTO.scene),
    companion,
    pose: pick(PHOTO_POSES, r.pose, DEFAULT_PHOTO.pose),
    companionPose: pick(
      PHOTO_POSES,
      r.companionPose,
      DEFAULT_PHOTO.companionPose,
    ),
    frame: pick(PHOTO_FRAMES, r.frame, DEFAULT_PHOTO.frame),
    avatar:
      typeof r.avatar === "string" && r.avatar.length <= 400 ? r.avatar : "",
  };
}

export const serializePhotoConfig = (c: PhotoConfig): string =>
  JSON.stringify(c);

export const canTakePhoto = (count: number): boolean => count < PHOTO_CAP;

/** What the shutter says when the gallery is full. */
export const FULL_MESSAGE = "Your gallery is full";

/** "3 photos", "1 photo". */
export const photoCountText = (n: number): string =>
  n === 1 ? "1 photo" : `${n} photos`;

export interface Photo {
  id: string;
  config: PhotoConfig;
  takenAt: number;
}

// ---------------------------------------------------------------------------
// the SQL over `photos`
// ---------------------------------------------------------------------------

export interface PhotosDb {
  runAsync(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<{ changes: number }>;
  getAllAsync<T>(
    sql: string,
    params?: (string | number | null)[],
  ): Promise<T[]>;
}

export function createPhotoStore(getDb: () => Promise<PhotosDb> | PhotosDb) {
  async function count(): Promise<number> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM photos WHERE deleted_at IS NULL",
    );
    return rows[0]?.n ?? 0;
  }

  /** Save a photo. At the cap it saves nothing and says `full`. */
  async function add(
    id: string,
    config: PhotoConfig,
    now: number,
  ): Promise<{ ok: true; photo: Photo } | { ok: false; reason: "full" }> {
    const db = await getDb();
    if (!canTakePhoto(await count())) return { ok: false, reason: "full" };
    await db.runAsync(
      "INSERT INTO photos (id, config, taken_at, created_at, updated_at, is_dirty) VALUES (?,?,?,?,?,1)",
      [id, serializePhotoConfig(config), now, now, now],
    );
    return { ok: true, photo: { id, config, takenAt: now } };
  }

  /** Newest first. A row whose composition cannot be read is skipped. */
  async function list(): Promise<Photo[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      config: string;
      taken_at: number;
    }>(
      "SELECT id, config, taken_at FROM photos WHERE deleted_at IS NULL ORDER BY taken_at DESC, id DESC",
    );
    const out: Photo[] = [];
    for (const r of rows) {
      const config = parsePhotoConfig(r.config);
      if (config) out.push({ id: r.id, config, takenAt: r.taken_at });
    }
    return out;
  }

  async function remove(id: string): Promise<boolean> {
    const db = await getDb();
    const done = await db.runAsync("DELETE FROM photos WHERE id = ?", [id]);
    return done.changes > 0;
  }

  return { add, list, remove, count };
}
