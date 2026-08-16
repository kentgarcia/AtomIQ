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
  "@/assets/images/mascot/profile.png": require("@/assets/images/mascot/profile.png"),
  // ScienceDaily 2026 news images
  "@/assets/nuclear/sciencedaily/plasma-particles-flowing-inside-tokamak-fusion-system.webp": require("@/assets/nuclear/sciencedaily/plasma-particles-flowing-inside-tokamak-fusion-system.webp"),
  "@/assets/nuclear/sciencedaily/advanced-technology-photovoltaic-solar-panels.webp": require("@/assets/nuclear/sciencedaily/advanced-technology-photovoltaic-solar-panels.webp"),
  "@/assets/nuclear/sciencedaily/dark-matter-cosmology-measurement.webp": require("@/assets/nuclear/sciencedaily/dark-matter-cosmology-measurement.webp"),
  "@/assets/nuclear/sciencedaily/dark-matter-sapphire-detector.webp": require("@/assets/nuclear/sciencedaily/dark-matter-sapphire-detector.webp"),
  "@/assets/nuclear/sciencedaily/gravitational-waves-binary-system.webp": require("@/assets/nuclear/sciencedaily/gravitational-waves-binary-system.webp"),
  "@/assets/nuclear/sciencedaily/jewelers-trick-could-unlock-next-generation-nuclear-clocks.webp": require("@/assets/nuclear/sciencedaily/jewelers-trick-could-unlock-next-generation-nuclear-clocks.webp"),
  "@/assets/nuclear/sciencedaily/zap-energy-fuze-3-device.webp": require("@/assets/nuclear/sciencedaily/zap-energy-fuze-3-device.webp"),
  "@/assets/nuclear/sciencedaily/100-qubits-quantum-electrodynamics-simulation.webp": require("@/assets/nuclear/sciencedaily/100-qubits-quantum-electrodynamics-simulation.webp"),
  "@/assets/nuclear/sciencedaily/yellow-lightning-inside-water-drop.webp": require("@/assets/nuclear/sciencedaily/yellow-lightning-inside-water-drop.webp"),
};

export const getContentImage = (path?: string | number): any => {
  if (path == null) return undefined;
  if (typeof path === "number") return path; // already a require() result
  if (typeof path === "string" && path.startsWith("@/assets/")) {
    return localImages[path] || { uri: path };
  }
  return { uri: path };
};
