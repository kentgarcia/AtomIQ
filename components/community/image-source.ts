/**
 * Content image helper — resolves article/post image fields (local `@/assets`
 * requires or remote URLs) into a source the `<Image>` component can render.
 */

const localImages: Record<string, any> = {
  // Feed images (matching available files)
  "@/assets/nuclear/feed-1.webp": require("@/assets/nuclear/feed-1.webp"),
  "@/assets/nuclear/feed-2.webp": require("@/assets/nuclear/feed-2.webp"),
  "@/assets/nuclear/feed-3.webp": require("@/assets/nuclear/feed-3.webp"),
  "@/assets/nuclear/feed-4.webp": require("@/assets/nuclear/feed-4.webp"),
  "@/assets/nuclear/feed-5.webp": require("@/assets/nuclear/feed-5.webp"),
  "@/assets/nuclear/feed-6.webp": require("@/assets/nuclear/feed-6.webp"),
  "@/assets/nuclear/feed-9.webp": require("@/assets/nuclear/feed-9.webp"),
  "@/assets/nuclear/feed-10.webp": require("@/assets/nuclear/feed-10.webp"),
  // Author avatars
  "@/assets/nuclear/author/ANSTO.webp": require("@/assets/nuclear/author/ANSTO.webp"),
  "@/assets/nuclear/author/IAEA.webp": require("@/assets/nuclear/author/IAEA.webp"),
  "@/assets/nuclear/author/NEA.webp": require("@/assets/nuclear/author/NEA.webp"),
  "@/assets/nuclear/author/PNRI.webp": require("@/assets/nuclear/author/PNRI.webp"),
};

export const getContentImage = (path?: string | number): any => {
  if (path == null) return undefined;
  if (typeof path === "number") return path; // already a require() result
  if (typeof path === "string" && path.startsWith("@/assets/")) {
    return localImages[path] || { uri: path };
  }
  return { uri: path };
};
