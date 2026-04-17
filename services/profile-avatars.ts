import { ImageSourcePropType } from "react-native";

const PROFILE_AVATAR_MAP = {
  "default.png": require("@/assets/images/profile/default.png"),
  "pic-1.png": require("@/assets/images/profile/pic-1.png"),
  "pic-2.png": require("@/assets/images/profile/pic-2.png"),
  "pic-3.png": require("@/assets/images/profile/pic-3.png"),
  "pic-4.png": require("@/assets/images/profile/pic-4.png"),
  "pic-5.png": require("@/assets/images/profile/pic-5.png"),
  "pic-6.png": require("@/assets/images/profile/pic-6.png"),
  "pic-7.png": require("@/assets/images/profile/pic-7.png"),
  "pic-8.png": require("@/assets/images/profile/pic-8.png"),
} as const;

export type ProfileAvatarKey = keyof typeof PROFILE_AVATAR_MAP;

export const DEFAULT_PROFILE_AVATAR_KEY: ProfileAvatarKey = "default.png";

const PROFILE_AVATAR_KEYS = Object.keys(
  PROFILE_AVATAR_MAP,
) as ProfileAvatarKey[];

const PROFILE_AVATAR_KEY_SET = new Set<string>(PROFILE_AVATAR_KEYS);

const LEGACY_AVATAR_ALIASES: Record<string, ProfileAvatarKey> = {
  profile: DEFAULT_PROFILE_AVATAR_KEY,
  "profile.png": DEFAULT_PROFILE_AVATAR_KEY,
  "mascot/profile.png": DEFAULT_PROFILE_AVATAR_KEY,
};

export const isProfileAvatarKey = (
  value?: string | null,
): value is ProfileAvatarKey => {
  if (!value) {
    return false;
  }

  return PROFILE_AVATAR_KEY_SET.has(value.trim().toLowerCase());
};

export const normalizeProfileAvatarKey = (
  value?: string | null,
): ProfileAvatarKey => {
  if (!value) {
    return DEFAULT_PROFILE_AVATAR_KEY;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_PROFILE_AVATAR_KEY;
  }

  const normalized = trimmed.toLowerCase();
  if (isProfileAvatarKey(normalized)) {
    return normalized;
  }

  if (normalized in LEGACY_AVATAR_ALIASES) {
    return LEGACY_AVATAR_ALIASES[normalized];
  }

  const fileName = normalized.split(/[\\/]/).pop();
  if (fileName && isProfileAvatarKey(fileName)) {
    return fileName;
  }

  if (fileName && fileName in LEGACY_AVATAR_ALIASES) {
    return LEGACY_AVATAR_ALIASES[fileName];
  }

  return DEFAULT_PROFILE_AVATAR_KEY;
};

export const getProfileAvatarSource = (
  value?: string | null,
): ImageSourcePropType => {
  const key = normalizeProfileAvatarKey(value);
  return PROFILE_AVATAR_MAP[key];
};

export const PROFILE_AVATAR_OPTIONS = PROFILE_AVATAR_KEYS.map((key) => ({
  key,
  source: PROFILE_AVATAR_MAP[key],
}));
