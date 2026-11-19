/**
 * Colours of the Radiation Shield Lab's picture (theme exception EX-15): what a shield is made of
 * and what each kind of radiation looks like. Lead is blue-grey and a beta particle blue in light
 * and dark, like the lesson figures (EX-11). One face and one darker lip per material, flat
 * colour only, no gradients. Pure data (no imports) so Node tests can read it.
 */

import type { Material, Radiation } from "./shield-core";

export interface ArtShade {
  face: string;
  lip: string;
  /** Texture marks drawn on the face (fibres, grains, a shine). */
  mark: string;
}

export const MATERIAL_ART: Record<Material, ArtShade> = {
  paper: { face: "#F6EDD3", lip: "#D9CBA3", mark: "#C2B188" },
  plastic: { face: "#3DC5B8", lip: "#2AA194", mark: "#A6EDE5" },
  aluminum: { face: "#D3DCE3", lip: "#AEBAC4", mark: "#F4F8FA" },
  concrete: { face: "#A9A39E", lip: "#8A847F", mark: "#7A746F" },
  lead: { face: "#5E6E7E", lip: "#425060", mark: "#8196AA" },
};

export const RADIATION_ART: Record<Radiation, { face: string; lip: string; light: string }> = {
  alpha: { face: "#FF4B4B", lip: "#D93B3B", light: "#FF9A9A" },
  beta: { face: "#1CB0F6", lip: "#1899D6", light: "#7AE1FE" },
  gamma: { face: "#FFC800", lip: "#D9A800", light: "#FFE070" },
};
