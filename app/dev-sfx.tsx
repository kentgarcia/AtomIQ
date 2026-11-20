/**
 * Development-only route for the SFX lab (components/dev/SfxLab.tsx). In a release build the
 * `__DEV__` branch is folded away, so the lab and its audition sounds are not in the bundle and the
 * route just goes home.
 */
import { Redirect } from "expo-router";
import React from "react";

// dev-sfx: development-only screen; Metro drops this require in a release build.
const SfxLab: typeof import("@/components/dev/SfxLab").SfxLab | null = __DEV__ ? require("@/components/dev/SfxLab").SfxLab : null;

export default function DevSfxRoute() {
  return SfxLab ? <SfxLab /> : <Redirect href="/" />;
}
