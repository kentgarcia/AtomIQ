/**
 * Maps a `GuideDestination` to a concrete expo-router `push`. Centralised so
 * the engine never deals with routes and the UI never hardcodes them.
 */

import type { Router } from "expo-router";

import type { GuideDestination } from "./types";

export const navigateDestination = (
  router: Router,
  destination: GuideDestination,
): void => {
  switch (destination.screen) {
    case "lesson":
      router.push(`/lesson/${destination.id}`);
      break;
    case "quiz":
      router.push(`/quiz/${destination.id}`);
      break;
    case "encyclopedia-entry":
      router.push(`/explorer/encyclopedia-entry?id=${destination.id}`);
      break;
    case "article":
      router.push(`/article-detail?id=${destination.id}`);
      break;
    case "maze":
      router.push(`/explorer/atom-maze?id=${destination.id}`);
      break;
    case "journey":
      router.push(`/explorer/journey?id=${destination.id}`);
      break;
    case "mythbuster":
      router.push("/mythbuster");
      break;
    case "tab-discover":
      router.push("/(tabs)/community");
      break;
    case "tab-games":
      router.push("/(tabs)/awards");
      break;
    case "tab-profile":
      router.push("/(tabs)/profile");
      break;
    case "encyclopedia-list":
      router.push("/encyclopedia");
      break;
  }
};
