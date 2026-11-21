/**
 * The figure helpers moved into the app (components/lesson/visual/figures/): the authoring modules and the app draw from
 * the same code now. This file only re-exports it, so unit-N.mjs keeps working until it is retired.
 */
export * from "../../../components/lesson/visual/figures/index.ts";
