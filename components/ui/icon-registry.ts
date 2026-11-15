/**
 * Icon registry — the single source of truth for icon-name resolution.
 *
 * This module is intentionally free of React Native imports so it can be
 * loaded by Node-based checks and tests. The `Icon` component passes the
 * installed Iconsax export surface in at runtime.
 *
 * Rules:
 * - Aliases are applied before lookup.
 * - A name is valid only when it maps to an export on the installed surface.
 * - Invalid names resolve to `FALLBACK_ICON_NAME` (a known installed icon) so
 *   the UI never renders a blank slot.
 */

export type IconVariant =
  | "Linear"
  | "Outline"
  | "TwoTone"
  | "Bulk"
  | "Broken"
  | "Bold";

export const ICON_VARIANTS: readonly IconVariant[] = [
  "Linear",
  "Outline",
  "TwoTone",
  "Bulk",
  "Broken",
  "Bold",
];

/**
 * Stable fallback rendered when a requested name cannot be resolved.
 * Verified to exist in `iconsax-react-native`.
 */
export const FALLBACK_ICON_NAME = "InfoCircle";

/**
 * Product names that intentionally differ from the installed Iconsax export.
 * Keep this map small and reviewed; prefer fixing the source name.
 */
export const ICON_ALIASES: Readonly<Record<string, string>> = {
  Atom: "CpuSetting",
  Message: "MessageText",
  Ranking: "Medal",
  Close: "CloseCircle",
  Quote: "MessageText1",
  Percentage: "PercentageSquare",
  Infinite: "Unlimited",
  Fire: "Flashy",
  Book: "Book1",
  Trophy: "MedalStar",
  Target: "Radar",
  Info: "Information",
  TickSquare: "TickSquare",
  Sun: "Sun1",
  Sword: "Slash",
  Loader: "Refresh",
};

export type IconExportSurface = Record<string, unknown>;

export interface IconResolution {
  /** The name the caller asked for. */
  requested: string;
  /** The alias target, or the requested name when no alias applies. */
  resolved: string;
  /** True when `resolved` is an export on the installed surface. */
  valid: boolean;
  /** True when the caller will be shown `FALLBACK_ICON_NAME`. */
  usedFallback: boolean;
}

/** Apply the alias map without checking the export surface. */
export function applyIconAlias(name: string): string {
  return ICON_ALIASES[name] ?? name;
}

/** Resolve a requested name against an installed icon export surface. */
export function resolveIconName(
  name: string,
  surface: IconExportSurface,
): IconResolution {
  const requested = name ?? "";
  const resolved = applyIconAlias(requested);
  const valid =
    requested.length > 0 &&
    Object.prototype.hasOwnProperty.call(surface, resolved) &&
    Boolean(surface[resolved]);

  return {
    requested,
    resolved,
    valid,
    usedFallback: !valid,
  };
}

/** True when `name` is an installed Iconsax export (after aliasing). */
export function isValidIconName(
  name: string,
  surface: IconExportSurface,
): boolean {
  return resolveIconName(name, surface).valid;
}
