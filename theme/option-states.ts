/**
 * Semantic colours for selectable options (Schrodi/Guide pills, choice cards).
 *
 * Text, icon, fill and border are resolved TOGETHER from theme roles so a
 * light-only label can never land on a light fill, and a muted label can
 * never vanish when selected. Contrast for every state in both themes is
 * enforced by scripts/test-option-contrast.mjs.
 *
 * Framework-free: takes the resolved `theme.colors` roles it needs.
 */

export type OptionState = "idle" | "pressed" | "selected" | "disabled";

export interface OptionColorRoles {
  card: string;
  text: string;
  border: string;
  creamTint: string;
  amberSurface: string;
  amberSurfaceStrong: string;
  amberText: string;
  amberBorder: string;
  surfaceSoft: string;
  textSecondary: string;
}

export interface OptionColors {
  background: string;
  border: string;
  /** Label colour. */
  text: string;
  /** Icon colour (same role as text so icon and label always agree). */
  icon: string;
  /** Border width — selected is thicker so state never relies on colour alone. */
  borderWidth: number;
  /** Show a check glyph (non-colour selected indicator). */
  showCheck: boolean;
}

export const getOptionColors = (
  colors: OptionColorRoles,
  state: OptionState,
): OptionColors => {
  switch (state) {
    case "selected":
      return {
        background: colors.amberSurfaceStrong,
        border: colors.amberText,
        text: colors.amberText,
        icon: colors.amberText,
        borderWidth: 2,
        showCheck: true,
      };
    case "pressed":
      return {
        background: colors.creamTint,
        border: colors.amberBorder,
        text: colors.text,
        icon: colors.text,
        borderWidth: 1,
        showCheck: false,
      };
    case "disabled":
      return {
        // Disabled stays legible (>= 3:1): the soft surface + secondary text
        // read as "unavailable" without disappearing.
        background: colors.surfaceSoft,
        border: colors.border,
        text: colors.textSecondary,
        icon: colors.textSecondary,
        borderWidth: 1,
        showCheck: false,
      };
    default:
      return {
        background: colors.card,
        border: colors.border,
        text: colors.text,
        icon: colors.text,
        borderWidth: 1,
        showCheck: false,
      };
  }
};

/**
 * Primary "intent" pill (Guide landing phrases: "I want to learn…").
 * Uses the amber surface pair instead of white-on-orange (2.3:1).
 */
export const getIntentPillColors = (
  colors: OptionColorRoles,
  pressed: boolean,
): OptionColors => ({
  background: pressed ? colors.amberSurface : colors.amberSurfaceStrong,
  border: colors.amberText,
  text: colors.amberText,
  icon: colors.amberText,
  borderWidth: 1,
  showCheck: false,
});
