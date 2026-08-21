import { ImageSourcePropType } from "react-native";

const PROFILE_AVATAR_MAP = {
  "corgi.png": require("@/assets/images/profile/corgi.png"),
  "baby-axolotl.png": require("@/assets/images/profile/baby-axolotl.png"),
  "cloud.png": require("@/assets/images/profile/cloud.png"),
  "dandelion.png": require("@/assets/images/profile/dandelion.png"),
  "dog.png": require("@/assets/images/profile/dog.png"),
  "fox.png": require("@/assets/images/profile/fox.png"),
  "gray-seal.png": require("@/assets/images/profile/gray-seal.png"),
  "monkey.png": require("@/assets/images/profile/monkey.png"),
  "pig.png": require("@/assets/images/profile/pig.png"),
  "rabbit.png": require("@/assets/images/profile/rabbit.png"),
  "robot.png": require("@/assets/images/profile/robot.png"),
  "tiger.png": require("@/assets/images/profile/tiger.png"),
  "walrus.png": require("@/assets/images/profile/walrus.png"),
  "whale-shark.png": require("@/assets/images/profile/whale-shark.png"),
  "yeti.png": require("@/assets/images/profile/yeti.png"),
} as const;

export type ProfileAvatarKey = keyof typeof PROFILE_AVATAR_MAP;

export const DEFAULT_PROFILE_AVATAR_KEY: ProfileAvatarKey = "corgi.png";

const PROFILE_AVATAR_KEYS = Object.keys(
  PROFILE_AVATAR_MAP,
) as ProfileAvatarKey[];

const PROFILE_AVATAR_KEY_SET = new Set<string>(PROFILE_AVATAR_KEYS);

const LEGACY_AVATAR_ALIASES: Record<string, ProfileAvatarKey> = {
  profile: DEFAULT_PROFILE_AVATAR_KEY,
  "profile.png": DEFAULT_PROFILE_AVATAR_KEY,
  "mascot/profile.png": DEFAULT_PROFILE_AVATAR_KEY,
  "default.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-1.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-2.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-3.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-4.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-5.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-6.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-7.png": DEFAULT_PROFILE_AVATAR_KEY,
  "pic-8.png": DEFAULT_PROFILE_AVATAR_KEY,
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
