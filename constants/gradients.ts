// Shared avatar/rank gradient palettes used across tab screens.

export type GradientKey =
  | "purple"
  | "green"
  | "orange"
  | "yellow"
  | "blue"
  | "blueSolid"
  | "cyan";

export const GRADIENTS: Record<GradientKey, readonly [string, string]> = {
  purple: ["#B8A5FE", "#9E87F5"],
  green: ["#4FD1C5", "#2DCECC"],
  orange: ["#FF9F65", "#FF6B6B"],
  yellow: ["#FFD66E", "#FFA043"],
  blue: ["#6A82FB", "#FC5C7D"],
  blueSolid: ["#5E72E4", "#825EE4"],
  cyan: ["#11CDEF", "#1171EF"],
};